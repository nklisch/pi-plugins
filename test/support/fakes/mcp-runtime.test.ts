import { describe, expect, it } from "vitest";
import {
  McpConfigSourceSchemaV1,
  McpSourceIdentitySchemaV1,
  McpSourceStatusSchema,
  type McpLaunchValueProvider,
  type McpLaunchValues,
  type McpSourceIdentity,
} from "../../../src/application/ports/mcp-runtime.js";
import { ContentDigestSchema } from "../../../src/domain/content-manifest.js";
import { ComponentIdSchema } from "../../../src/domain/components.js";
import { PluginKeySchema } from "../../../src/domain/identity.js";
import { SourceLocationSchema } from "../../../src/domain/provenance-location.js";
import { FakeMcpRuntime } from "./mcp-runtime.js";

const location = SourceLocationSchema.parse({
  host: "claude",
  documentKind: "mcp",
  path: "plugin.mcp.json",
  pointer: "/mcpServers/shared",
});
const digest = (hex: string) => ContentDigestSchema.parse(`sha256:${hex.repeat(64).slice(0, 64)}`);
const runtimeKey = (hex: string) => `mcp-server-v1:${hex.repeat(64).slice(0, 64)}`;
const sharedKey = runtimeKey("a");

function identity(overrides: Record<string, unknown> = {}): McpSourceIdentity {
  return McpSourceIdentitySchemaV1.parse({
    schemaVersion: 1,
    scope: { kind: "user" },
    plugin: PluginKeySchema.parse("demo@community"),
    revision: digest("1"),
    projectionDigest: digest("2"),
    ...overrides,
  });
}

function source(sourceIdentity: McpSourceIdentity, keys: readonly string[] = [sharedKey]) {
  return McpConfigSourceSchemaV1.parse({
    schemaVersion: 1,
    identity: sourceIdentity,
    servers: Object.fromEntries(keys.map((key, index) => [key, {
      componentId: ComponentIdSchema.parse(`component-v1:mcp-server:${key.slice("mcp-server-v1:".length)}`),
      nativeKey: `native-${index}`,
      transport: "stdio",
      options: { schemaVersion: 1, auth: { kind: "none" } },
      projection: {
        schemaVersion: 1,
        componentId: ComponentIdSchema.parse(`component-v1:mcp-server:${key.slice("mcp-server-v1:".length)}`),
        contentRef: `plugin-content-v1:sha256:${"c".repeat(64)}`,
        dataRef: `plugin-data-v1:sha256:${"d".repeat(64)}`,
      },
      launchTemplate: {
        schemaVersion: 1,
        transport: "stdio",
        command: "safe-template",
        args: [],
        env: [],
      },
      toolAliases: [],
      provenance: [location],
    }])),
  });
}

function provider(
  counters: { resolved: number; disposed: number },
  values: McpLaunchValues = { transport: "stdio", command: "CANARY_COMMAND", args: [] },
  resolve?: McpLaunchValueProvider["resolve"],
): McpLaunchValueProvider {
  return {
    async resolve(request, signal) {
      counters.resolved += 1;
      return resolve === undefined ? values : resolve(request, signal);
    },
    async dispose() {
      counters.disposed += 1;
    },
  };
}

describe("FakeMcpRuntime", () => {
  it("exposes complete capabilities and validates locally without invoking launch values", async () => {
    const counters = { resolved: 0, disposed: 0 };
    const launchValues = provider(counters);
    const runtime = new FakeMcpRuntime();
    const current = identity();
    const valid = await runtime.validateSource(source(current), new AbortController().signal);
    expect(valid.ok).toBe(true);
    expect(await runtime.capabilities(new AbortController().signal)).toMatchObject({
      sourceLifecycle: expect.objectContaining({ atomicReplace: true, lateLaunchValues: true }),
    });
    const replaced = await runtime.replaceSource({ source: source(current), launchValues }, new AbortController().signal);
    expect(replaced.kind).toBe("applied");
    expect(counters).toEqual({ resolved: 0, disposed: 0 });
  });

  it("rejects secret-bearing public sources before storage without reflecting plaintext", async () => {
    const runtime = new FakeMcpRuntime();
    const counters = { resolved: 0, disposed: 0 };
    const current = identity();
    const unsafe = JSON.parse(JSON.stringify(source(current))) as {
      servers: Record<string, {
        options: Record<string, unknown>;
        launchTemplate: unknown;
      }>;
    };
    const server = unsafe.servers[sharedKey]!;
    server.options = { ...server.options, secret: "CANARY_DURABLE_OPTION" };
    server.launchTemplate = {
      schemaVersion: 1,
      transport: "stdio",
      command: "safe-command",
      args: [],
      env: [{ name: "SESSION_ID", value: "CANARY_DURABLE_TEMPLATE" }],
    };

    const validation = await runtime.validateSource(
      unsafe as never,
      new AbortController().signal,
    );
    expect(validation.ok).toBe(false);
    const replacement = await runtime.replaceSource({
      source: unsafe as never,
      launchValues: provider(counters),
    }, new AbortController().signal);
    expect(replacement.kind).toBe("rejected");
    const statuses = await runtime.inspectSources(new AbortController().signal);
    const output = JSON.stringify({ validation, replacement, statuses });
    expect(output).not.toMatch(/CANARY_DURABLE_/u);
    expect(statuses).toEqual([]);
    expect(counters).toEqual({ resolved: 0, disposed: 0 });
  });

  it("isolates colliding server keys by exact scope and plugin ownership", async () => {
    const runtime = new FakeMcpRuntime();
    const first = identity();
    const project = identity({
      scope: { kind: "project", projectKey: `project-v1:sha256:${"f".repeat(64)}` },
    });
    const otherPlugin = identity({ plugin: PluginKeySchema.parse("other@community") });
    const signal = new AbortController().signal;
    await runtime.replaceSource({ source: source(first), launchValues: provider({ resolved: 0, disposed: 0 }) }, signal);
    await runtime.replaceSource({ source: source(project), launchValues: provider({ resolved: 0, disposed: 0 }) }, signal);
    await runtime.replaceSource({ source: source(otherPlugin), launchValues: provider({ resolved: 0, disposed: 0 }) }, signal);

    expect((await runtime.inspectSources(signal)).map((status) => status.identity)).toEqual([
      project,
      first,
      otherPlugin,
    ]);
    expect((await runtime.inspectSource(first, signal))?.servers[0]?.key).toBe(sharedKey);
    expect(await runtime.removeSource(first, signal)).toEqual({ kind: "removed" });
    expect(await runtime.inspectSource(project, signal)).toBeDefined();
    expect(await runtime.inspectSource(otherPlugin, signal)).toBeDefined();
  });

  it("publishes replacement atomically and preserves prior evidence on stale, injected, and cancelled writes", async () => {
    const runtime = new FakeMcpRuntime();
    const original = identity();
    const replacement = identity({ revision: digest("3"), projectionDigest: digest("4") });
    const signal = new AbortController().signal;
    const originalProvider = provider({ resolved: 0, disposed: 0 });
    await runtime.replaceSource({ source: source(original), launchValues: originalProvider }, signal);

    runtime.failNextReplacement("ADAPTER_FAILED");
    expect((await runtime.replaceSource({
      source: source(replacement),
      launchValues: provider({ resolved: 0, disposed: 0 }),
      expectedProjectionDigest: original.projectionDigest,
    }, signal)).kind).toBe("rejected");
    expect((await runtime.inspectSource(original, signal))?.identity).toEqual(original);

    const stale = await runtime.replaceSource({
      source: source(replacement),
      launchValues: provider({ resolved: 0, disposed: 0 }),
      expectedProjectionDigest: digest("9"),
    }, signal);
    expect(stale).toMatchObject({ kind: "stale", currentIdentity: original });
    expect((await runtime.inspectSource(original, signal))?.identity).toEqual(original);

    const controller = new AbortController();
    controller.abort(new Error("cancelled replacement"));
    await expect(runtime.replaceSource({
      source: source(replacement),
      launchValues: provider({ resolved: 0, disposed: 0 }),
    }, controller.signal)).rejects.toThrow("cancelled replacement");
    expect((await runtime.inspectSource(original, signal))?.identity).toEqual(original);
  });

  it("removes only the exact current identity and makes repeated removal idempotent", async () => {
    const runtime = new FakeMcpRuntime();
    const first = identity();
    const newer = identity({ revision: digest("3"), projectionDigest: digest("4") });
    const signal = new AbortController().signal;
    await runtime.replaceSource({ source: source(first), launchValues: provider({ resolved: 0, disposed: 0 }) }, signal);
    await runtime.replaceSource({
      source: source(newer),
      expectedProjectionDigest: first.projectionDigest,
      launchValues: provider({ resolved: 0, disposed: 0 }),
    }, signal);

    expect(await runtime.removeSource(first, signal)).toMatchObject({
      kind: "ownership-mismatch",
      currentIdentity: newer,
    });
    expect(await runtime.inspectSource(newer, signal)).toBeDefined();
    expect(await runtime.removeSource(newer, signal)).toEqual({ kind: "removed" });
    expect(await runtime.removeSource(newer, signal)).toEqual({ kind: "absent" });
  });

  it("resolves launch values only at launch and disposes them after success, failure, and cancellation", async () => {
    const runtime = new FakeMcpRuntime();
    const current = identity();
    const counters = { resolved: 0, disposed: 0 };
    const launchValues = provider(counters);
    const signal = new AbortController().signal;
    await runtime.replaceSource({ source: source(current), launchValues }, signal);
    expect(counters).toEqual({ resolved: 0, disposed: 0 });

    await runtime.launch(current, sharedKey, signal);
    expect(counters).toEqual({ resolved: 1, disposed: 1 });

    const mismatchCounters = { resolved: 0, disposed: 0 };
    const mismatchProvider = provider(mismatchCounters, {
      transport: "streamable-http",
      url: "https://CANARY_URL",
    });
    const mismatchIdentity = identity({ revision: digest("5"), projectionDigest: digest("6") });
    await runtime.replaceSource({
      source: source(mismatchIdentity),
      launchValues: mismatchProvider,
    }, signal);
    await expect(runtime.launch(mismatchIdentity, sharedKey, signal)).rejects.toMatchObject({
      code: "MCP_LAUNCH_VALUE_INVALID",
    });
    expect(mismatchCounters).toEqual({ resolved: 1, disposed: 1 });

    const failedCounters = { resolved: 0, disposed: 0 };
    const failedIdentity = identity({ revision: digest("6"), projectionDigest: digest("7") });
    const failedProvider = provider(failedCounters, undefined, async () => {
      throw new Error("CANARY_CALLBACK_FAILURE");
    });
    await runtime.replaceSource({ source: source(failedIdentity), launchValues: failedProvider }, signal);
    const failure = await runtime.launch(failedIdentity, sharedKey, signal).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).not.toContain("CANARY_CALLBACK_FAILURE");
    expect(JSON.stringify(failure)).not.toContain("CANARY_CALLBACK_FAILURE");
    expect(failedCounters).toEqual({ resolved: 1, disposed: 0 });

    const cancelCounters = { resolved: 0, disposed: 0 };
    const controller = new AbortController();
    const cancelProvider = provider(cancelCounters, undefined, async (_request, _signal) => {
      controller.abort(new Error("cancelled launch"));
      return { transport: "stdio", command: "CANARY_COMMAND", args: [] };
    });
    const cancelIdentity = identity({ revision: digest("7"), projectionDigest: digest("8") });
    await runtime.replaceSource({ source: source(cancelIdentity), launchValues: cancelProvider }, signal);
    await expect(runtime.launch(cancelIdentity, sharedKey, controller.signal)).rejects.toThrow("cancelled launch");
    expect(cancelCounters).toEqual({ resolved: 1, disposed: 1 });
  });

  it("disposes before rejecting and keeps signal classification when cleanup also fails", async () => {
    const runtime = new FakeMcpRuntime();
    const current = identity({ revision: digest("e"), projectionDigest: digest("f") });
    const controller = new AbortController();
    const reason = { name: "TimeoutError", code: "TIMEOUT", message: "CANARY_TIMEOUT_SIGNAL" };
    const events: string[] = [];
    const launchValues: McpLaunchValueProvider = {
      async resolve() {
        events.push("resolved");
        controller.abort(reason);
        return { transport: "stdio", command: "safe-command", args: [] };
      },
      async dispose() {
        events.push("disposed");
        throw new Error("CANARY_CLEANUP_FAILURE");
      },
    };
    await runtime.replaceSource({ source: source(current), launchValues }, new AbortController().signal);
    const failure = await runtime.launch(current, sharedKey, controller.signal)
      .catch((error: unknown) => {
        events.push("rejected");
        return error;
      });
    expect(failure).toBe(reason);
    expect(events).toEqual(["resolved", "disposed", "rejected"]);
    const status = await runtime.inspectSource(current, new AbortController().signal);
    expect(status?.servers[0]?.errorCode).toBe("MCP_LAUNCH_TIMEOUT");
    expect(JSON.stringify(status)).not.toMatch(/CANARY_(?:TIMEOUT_SIGNAL|CLEANUP_FAILURE)/u);
  });

  it("keeps inspection and errors redacted, copied, and deterministically ordered", async () => {
    const runtime = new FakeMcpRuntime();
    const first = identity();
    const mutable = source(first, [runtimeKey("f"), runtimeKey("1")]);
    await runtime.replaceSource({ source: mutable, launchValues: provider({ resolved: 0, disposed: 0 }) }, new AbortController().signal);
    const inspected = await runtime.inspectSources(new AbortController().signal);
    expect(inspected[0]?.servers.map((server) => server.key)).toEqual([runtimeKey("1"), runtimeKey("f")]);
    expect(JSON.stringify(inspected)).not.toContain("CANARY_SOURCE_DEFINITION");
    expect(JSON.stringify(inspected)).not.toContain("CANARY_TEMPLATE");
    expect(JSON.stringify(inspected)).not.toContain("CANARY_COMMAND");
    expect(JSON.stringify(McpSourceStatusSchema.parse(inspected[0]))).not.toContain("secret");

    const replacement = identity({ revision: digest("9"), projectionDigest: digest("a") });
    runtime.failNextReplacement("CANARY_ERROR");
    const result = await runtime.replaceSource({
      source: source(replacement),
      launchValues: provider({ resolved: 0, disposed: 0 }),
    }, new AbortController().signal);
    expect(JSON.stringify(result)).not.toContain("CANARY_ERROR");
    expect(JSON.stringify(result)).not.toContain("CANARY_SOURCE_DEFINITION");
  });
});
