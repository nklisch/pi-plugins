import { describe, expect, it } from "vitest";
import { createResolvedConfiguration } from "../../../src/application/resolved-configuration.js";
import {
  McpConfigSourceSchemaV1,
  type McpConfigSource,
  type McpLaunchValues,
} from "../../../src/application/ports/mcp-runtime.js";
import {
  McpLaunchErrorCodes,
  type McpLaunchContextPort,
} from "../../../src/application/ports/mcp-launch-context.js";
import {
  McpLaunchTemplateSchemaV1,
  type McpLaunchTemplate,
} from "../../../src/domain/mcp-launch-template.js";
import { ComponentIdSchema } from "../../../src/domain/components.js";
import { ContentDigestSchema } from "../../../src/domain/content-manifest.js";
import { PluginKeySchema } from "../../../src/domain/identity.js";
import { SourceLocationSchema } from "../../../src/domain/provenance-location.js";
import { createTrustedMcpLaunchValueProvider } from "../../../src/runtime/mcp/launch-value-provider.js";
import { classifyMcpLaunchFailure } from "../../../src/runtime/mcp/launch-error.js";
import { FakeMcpLaunchEnvironment } from "../../support/fakes/mcp-launch-context.js";

const location = SourceLocationSchema.parse({
  host: "claude",
  documentKind: "mcp",
  path: "plugin.mcp.json",
  pointer: "/mcpServers/search",
});
const componentId = ComponentIdSchema.parse(`component-v1:mcp-server:${"a".repeat(64)}`);
const digest = (hex: string) => ContentDigestSchema.parse(`sha256:${hex.repeat(64).slice(0, 64)}`);
const identity = {
  schemaVersion: 1 as const,
  scope: { kind: "user" as const },
  plugin: PluginKeySchema.parse("demo@community"),
  revision: digest("1"),
  projectionDigest: digest("2"),
};

function stdioTemplate(overrides: Record<string, unknown> = {}): McpLaunchTemplate {
  return McpLaunchTemplateSchemaV1.parse({
    schemaVersion: 1,
    transport: "stdio",
    command: "${PLUGIN_ROOT}/bin/server",
    args: ["--token", "${user_config.TOKEN}", "$HOME", "$(literal)"],
    cwd: "${CLAUDE_PROJECT_DIR}",
    env: [{ name: "DECLARED", value: "${AMBIENT}" }],
    ...overrides,
  });
}

function httpTemplate(overrides: Record<string, unknown> = {}): McpLaunchTemplate {
  return McpLaunchTemplateSchemaV1.parse({
    schemaVersion: 1,
    transport: "streamable-http",
    url: "https://example.invalid/${PLUGIN_ROOT}?name=${user_config.NAME}",
    headers: [
      { name: "X-Ambient", value: { kind: "environment", name: "HEADER_VALUE" } },
      { name: "X-Static", value: { kind: "template", template: "safe" } },
    ],
    bearerToken: { kind: "environment", name: "CLAUDE_PLUGIN_OPTION_TOKEN" },
    ...overrides,
  });
}

function setup(options: Readonly<{
  template?: McpLaunchTemplate;
  configured?: readonly Readonly<{ key: string; value: { kind: "string"; value: string } }>[];
  ambient?: Readonly<Record<string, string>>;
  platform?: "posix" | "windows";
  afterContext?: (signal: AbortSignal) => void;
}> = {}) {
  const template = options.template ?? stdioTemplate();
  const parsedSource = McpConfigSourceSchemaV1.parse({
    schemaVersion: 1,
    identity,
    servers: {
      search: {
        componentId,
        transport: template.transport,
        options: {},
        launchTemplate: template,
        provenance: [location],
      },
    },
  });
  const source = JSON.parse(JSON.stringify(parsedSource)) as McpConfigSource;
  let callbacks = 0;
  const context: McpLaunchContextPort = {
    async withContext(binding, signal, use) {
      signal.throwIfAborted();
      callbacks += 1;
      const configuration = createResolvedConfiguration(options.configured ?? [
        { key: "NAME", value: { kind: "string", value: "demo" } },
        { key: "TOKEN", value: { kind: "string", value: "CANARY_${NOT_REPARSED}" } },
      ]);
      try {
        await use({
          binding,
          pluginRoot: "/plugin",
          pluginDataRoot: "/data",
          projectRoot: "file:///project/",
          template,
          configuration,
        });
        options.afterContext?.(signal);
      } finally {
        configuration.dispose();
      }
    },
  };
  const environment = new FakeMcpLaunchEnvironment(options.ambient ?? {
    AMBIENT: "ambient-value",
    HEADER_VALUE: "header-value",
  });
  const provider = createTrustedMcpLaunchValueProvider({
    source,
    context,
    environment,
    platform: options.platform ?? "posix",
  });
  const request = { source: identity, serverKey: "search", transport: template.transport } as const;
  return { provider, request, source, context, environment, get callbacks() { return callbacks; } };
}

function code(error: unknown): unknown {
  return error !== null && typeof error === "object" && "code" in error
    ? (error as { code: unknown }).code
    : undefined;
}

describe("trusted MCP launch value provider", () => {
  it("renders literal stdio values, roots, configuration, and requested ambient names once", async () => {
    const fixture = setup();
    const values = await fixture.provider.resolve(fixture.request, new AbortController().signal);
    expect(values.transport).toBe("stdio");
    if (values.transport !== "stdio") throw new Error("expected stdio values");
    expect(values.command).toBe("/plugin/bin/server");
    expect(values.args).toEqual(["--token", "CANARY_${NOT_REPARSED}", "$HOME", "$(literal)"]);
    expect(values.cwd).toBe("file:///project/");
    expect(values.env).toMatchObject({
      CLAUDE_PLUGIN_ROOT: "/plugin",
      PLUGIN_ROOT: "/plugin",
      CLAUDE_PLUGIN_DATA: "/data",
      PLUGIN_DATA: "/data",
      CLAUDE_PROJECT_DIR: "file:///project/",
      CLAUDE_PLUGIN_OPTION_NAME: "demo",
      CLAUDE_PLUGIN_OPTION_TOKEN: "CANARY_${NOT_REPARSED}",
      DECLARED: "ambient-value",
    });
    expect(Object.getPrototypeOf(values.env)).toBeNull();
    expect(fixture.environment.requests).toEqual([["AMBIENT"]]);
    expect(JSON.stringify(values)).toBe('"[REDACTED]"');
    expect(String(values)).toBe("[REDACTED]");
    expect(Object.isFrozen(values.args)).toBe(true);
    fixture.provider.dispose(values);
    expect(() => values.transport).toThrow("disposed");
    fixture.provider.dispose(values);
  });

  it("treats prototype-like configuration and environment names as owned data only", async () => {
    const fixture = setup({
      template: stdioTemplate({
        command: "${user_config.__proto__}",
        args: [],
        cwd: undefined,
        env: [{ name: "__proto__", value: "${user_config.constructor}" }],
      }),
      configured: [
        { key: "__proto__", value: { kind: "string", value: "/safe/command" } },
        { key: "constructor", value: { kind: "string", value: "safe-value" } },
      ],
    });
    const values = await fixture.provider.resolve(fixture.request, new AbortController().signal);
    expect(values.transport).toBe("stdio");
    if (values.transport !== "stdio") throw new Error("expected stdio values");
    expect(values.command).toBe("/safe/command");
    expect(Object.getPrototypeOf(values.env)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(values.env, "__proto__")).toBe(true);
    expect(values.env.__proto__).toBe("safe-value");
    expect(values.env.CLAUDE_PLUGIN_OPTION___proto__).toBe("/safe/command");
    fixture.provider.dispose(values);
  });

  it("maps Streamable HTTP URL, headers, and configured bearer without ambient over-read", async () => {
    const fixture = setup({ template: httpTemplate() });
    const values = await fixture.provider.resolve(fixture.request, new AbortController().signal);
    expect(values.transport).toBe("streamable-http");
    if (values.transport !== "streamable-http") throw new Error("expected HTTP values");
    expect(values.url).toBe("https://example.invalid//plugin?name=demo");
    expect(values.headers).toEqual({ "X-Ambient": "header-value", "X-Static": "safe" });
    expect(Object.getPrototypeOf(values.headers)).toBeNull();
    expect(values.bearerToken).toBe("CANARY_${NOT_REPARSED}");
    expect(fixture.environment.requests).toEqual([["HEADER_VALUE"]]);
    fixture.provider.dispose(values);
  });

  it.each([
    ["unknown namespace", stdioTemplate({ command: "${unknown.name}" }), "posix"],
    ["unclosed token", stdioTemplate({ command: "${PLUGIN_ROOT" }), "posix"],
    ["nested token", stdioTemplate({ command: "${PLUGIN_${ROOT}}" }), "posix"],
    ["missing configured variable", stdioTemplate({ command: "${CLAUDE_PLUGIN_OPTION_MISSING}" }), "posix"],
    ["prototype-like ambient variable", stdioTemplate({ command: "${__proto__}" }), "posix"],
    ["empty token", stdioTemplate({ command: "${}" }), "posix"],
    ["NUL command", stdioTemplate({ command: "before\0after" }), "posix"],
    ["Windows collision", stdioTemplate({ env: [{ name: "PATH", value: "one" }, { name: "Path", value: "two" }] }), "windows"],
    ["reserved collision", stdioTemplate({ env: [{ name: "PLUGIN_ROOT", value: "other" }] }), "posix"],
  ] as const)("rejects %s without partial output", async (_name, template, platform) => {
    const fixture = setup({ template, platform });
    const error = await fixture.provider.resolve(fixture.request, new AbortController().signal)
      .catch((value: unknown) => value);
    expect(code(error)).toBe(McpLaunchErrorCodes.valueInvalid);
    expect(JSON.stringify(error)).not.toContain("CANARY_");
  });

  it.each([
    httpTemplate({ url: "file:///tmp/server", headers: [] }),
    httpTemplate({ url: "https://user:password@example.invalid/mcp", headers: [] }),
    httpTemplate({ url: "https://example.invalid/mcp\n", headers: [] }),
    httpTemplate({ headers: [{ name: "X-Test", value: { kind: "template", template: "one\r\ntwo" } }] }),
    httpTemplate({ headers: [{ name: "Authorization", value: { kind: "template", template: "Bearer ${HEADER_VALUE}" } }], bearerToken: { kind: "environment", name: "HEADER_VALUE" } }),
    httpTemplate({ bearerToken: { kind: "template", template: "white space" } }),
  ])("rejects unsafe HTTP outputs with a stable redacted code", async (template) => {
    const fixture = setup({ template });
    const error = await fixture.provider.resolve(fixture.request, new AbortController().signal)
      .catch((value: unknown) => value);
    expect(code(error)).toBe(McpLaunchErrorCodes.valueInvalid);
    expect(JSON.stringify(error)).not.toMatch(/password|white space|header-value/i);
  });

  it("uses POSIX exact and Windows case-insensitive environment collision rules", async () => {
    const template = stdioTemplate({ env: [{ name: "PATH", value: "one" }, { name: "Path", value: "two" }] });
    const posix = setup({ template, platform: "posix" });
    const values = await posix.provider.resolve(posix.request, new AbortController().signal);
    expect(values.transport === "stdio" && values.env).toMatchObject({ PATH: "one", Path: "two" });
    posix.provider.dispose(values);
    const windows = setup({ template, platform: "windows" });
    await expect(windows.provider.resolve(windows.request, new AbortController().signal))
      .rejects.toMatchObject({ code: McpLaunchErrorCodes.valueInvalid });
  });

  it("owns exact independent lease identity and rejects foreign-provider cleanup", async () => {
    const first = setup();
    const second = setup();
    const [left, right] = await Promise.all([
      first.provider.resolve(first.request, new AbortController().signal),
      first.provider.resolve(first.request, new AbortController().signal),
    ]);
    expect(left).not.toBe(right);
    if (left.transport === "stdio" && right.transport === "stdio") {
      expect(left.args).not.toBe(right.args);
      expect(left.env).not.toBe(right.env);
    }
    expect(() => second.provider.dispose(left)).toThrow();
    expect(left.transport).toBe("stdio");
    first.provider.dispose(left);
    first.provider.dispose(right);
  });

  it("copies registered source/template state before caller mutation", async () => {
    const fixture = setup();
    (fixture.source.servers.search.launchTemplate as { command?: string }).command = "MUTATED";
    const values = await fixture.provider.resolve(fixture.request, new AbortController().signal);
    expect(values.transport === "stdio" && values.command).toBe("/plugin/bin/server");
    fixture.provider.dispose(values);
  });

  it("does no work on pre-abort and disposes locally when abort wins before return", async () => {
    const pre = setup();
    const before = new AbortController();
    const preReason = new Error("pre-abort");
    before.abort(preReason);
    await expect(pre.provider.resolve(pre.request, before.signal)).rejects.toBe(preReason);
    expect(pre.callbacks).toBe(0);

    const controller = new AbortController();
    const reason = new Error("post-issue-abort");
    const raced = setup({ afterContext: () => controller.abort(reason) });
    await expect(raced.provider.resolve(raced.request, controller.signal)).rejects.toBe(reason);
    expect(raced.environment.disposed).toBe(1);
  });

  it("classifies cancellation and timeout by reason kind/code without reading messages", () => {
    const cancelled = new AbortController();
    cancelled.abort(Object.assign(new Error("CANARY_CANCEL_MESSAGE"), { name: "AbortError" }));
    expect(classifyMcpLaunchFailure(cancelled.signal.reason, cancelled.signal))
      .toBe(McpLaunchErrorCodes.cancelled);
    const timedOut = new AbortController();
    timedOut.abort({ name: "TimeoutError", message: "CANARY_TIMEOUT_MESSAGE" });
    expect(classifyMcpLaunchFailure(timedOut.signal.reason, timedOut.signal))
      .toBe(McpLaunchErrorCodes.timeout);
  });

  it("propagates exact cancellation during ambient resolution without issuing values", async () => {
    const fixture = setup();
    const controller = new AbortController();
    const reason = Object.assign(new Error("CANARY_AMBIENT_ABORT"), { name: "AbortError" });
    fixture.environment.withResolved = async () => {
      controller.abort(reason);
      throw reason;
    };
    await expect(fixture.provider.resolve(fixture.request, controller.signal)).rejects.toBe(reason);
  });

  it("maps ambient adapter failures without retaining native messages", async () => {
    const fixture = setup();
    fixture.environment.withResolved = async () => { throw new Error("CANARY_ENVIRONMENT_FAILURE"); };
    const error = await fixture.provider.resolve(fixture.request, new AbortController().signal)
      .catch((value: unknown) => value);
    expect(code(error)).toBe(McpLaunchErrorCodes.environmentFailed);
    expect(JSON.stringify(error)).not.toContain("CANARY_ENVIRONMENT_FAILURE");
  });
});
