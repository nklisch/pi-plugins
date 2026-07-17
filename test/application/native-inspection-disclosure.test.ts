import { describe, expect, it } from "vitest";
import { evaluateCompatibility } from "../../src/domain/compatibility-evaluator.js";
import { projectRedactedUrl, projectSafeComponents, projectSafeProvenance, projectSafeSource } from "../../src/application/native-inspection-disclosure.js";
import { capabilities, claimFixture, componentId, directPlugin, fixtureProvenance } from "../fixtures/compatibility/common.js";

const canaries = {
  query: "QUERY_VALUE_CANARY",
  header: "HEADER_VALUE_CANARY",
  environment: "ENV_VALUE_CANARY",
  declaration: "RAW_DECLARATION_CANARY",
  absolute: "/home/alice/.pi/plugin-host/content/private",
};

describe("native inspection disclosure", () => {
  it("redacts URL userinfo, query values, and fragments", () => {
    const projected = projectRedactedUrl(`https://user:password@example.invalid:8443/mcp?mode=${canaries.query}#secret`);
    const json = JSON.stringify(projected);
    expect(projected).toMatchObject({ scheme: "https", queryPresent: true, fragmentPresent: true });
    expect(json).not.toContain("user");
    expect(json).not.toContain("password");
    expect(json).not.toContain(canaries.query);
    expect(json).not.toContain("secret");
  });

  it("retains source identity without canonical source strings", () => {
    const source = projectSafeSource({ kind: "git", url: "ssh://git@example.invalid/private/repo.git", ref: "main" });
    const json = JSON.stringify(source);
    expect(source.endpoint?.host.text).toBe("example.invalid");
    expect(json).not.toContain("git@example");
    expect(json).not.toContain("canonical");
  });

  it("projects structured hooks and MCP declarations without late-bound values", () => {
    const provenance = fixtureProvenance(canaries.absolute, "/mcpServers/hostile", "claude", "mcp");
    const mcp = {
      kind: "mcp-server" as const,
      id: componentId("mcp-server", "a"),
      nativeKey: claimFixture("native\u001b[2J\u202Ekey", provenance),
      declaration: claimFixture({
        transport: "streamable-http",
        url: `https://example.invalid/mcp?mode=${canaries.query}#fragment`,
        headers: { "X-Inspection": canaries.header },
      }, provenance),
      metadata: [],
    };
    const mcpRaw = {
      kind: "mcp-server" as const,
      id: componentId("mcp-server", "c"),
      nativeKey: claimFixture("raw", provenance),
      declaration: claimFixture({
        transport: "stdio",
        command: "server",
        env: { INSPECTION_NAME: canaries.environment },
        unsupported: canaries.declaration,
      }, provenance),
      metadata: [],
    };
    const hook = {
      kind: "hook" as const,
      id: componentId("hook", "b"),
      event: claimFixture("PreToolUse", fixtureProvenance("hooks.json", "/hooks/0/event", "claude", "hooks")),
      handler: claimFixture({ kind: "exec" as const, command: "node\u001b[31m", args: ["--flag", "${PLUGIN_ROOT}"] }, fixtureProvenance("hooks.json", "/hooks/0/handler", "claude", "hooks")),
      metadata: [],
    };
    const plugin = directPlugin({ components: { hooks: [hook], mcpServers: [mcp, mcpRaw] } });
    const compatibility = evaluateCompatibility({ plugin, capabilities: capabilities() });
    const view = projectSafeComponents({ plugin, compatibility });
    const json = JSON.stringify(view);

    expect(view.hooks[0]?.handler.kind).toBe("exec");
    expect(view.mcpServers[0]?.nativeKey.escaped).toBe(true);
    expect(view.mcpServers[0]?.url?.queryPresent).toBe(true);
    expect(json).not.toContain(canaries.query);
    expect(json).not.toContain(canaries.header);
    expect(json).not.toContain(canaries.environment);
    expect(json).not.toContain(canaries.declaration);
    expect(json).not.toContain(canaries.absolute);
    expect(json).not.toMatch(/\u001b/u);
  });

  it("omits declarations and absolute provenance paths even for incompatible components", () => {
    const provenance = { location: { host: "claude" as const, documentKind: "mcp" as const, path: canaries.absolute, pointer: "/servers/x" }, declaration: { secret: canaries.declaration } };
    const projected = projectSafeProvenance([provenance]);
    const json = JSON.stringify(projected);
    expect(json).toContain("redacted-absolute-path");
    expect(json).not.toContain(canaries.absolute);
    expect(json).not.toContain(canaries.declaration);
  });
});
