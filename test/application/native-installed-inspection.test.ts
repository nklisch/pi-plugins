import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createNativeInstalledInspector } from "../../src/application/native-installed-inspection.js";
import { evaluateCompatibility } from "../../src/domain/compatibility-evaluator.js";
import { createContentManifest, createMaterializationBinding } from "../../src/domain/content-manifest.js";
import { createInstalledRevisionRecord } from "../../src/domain/state/installed-state.js";
import { createResolvedMarketplaceSource } from "../../src/domain/source.js";
import { deriveMcpRuntimeServerKey } from "../../src/application/ports/mcp-runtime.js";
import { capabilities, directPlugin, sha256 as fixtureSha } from "../fixtures/compatibility/common.js";
import { mcp } from "../fixtures/compatibility/mcp.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const marketplaceSource = createResolvedMarketplaceSource({ declared: { kind: "github", repository: "owner/market" }, revision: "a".repeat(40) }, fixtureSha);
const projectionDigest = `sha256:${"55".repeat(32)}` as never;

function setup(options: { enabled?: boolean; remote?: "failed" | "needs-auth" | "connected"; pending?: boolean } = {}) {
  const component = mcp({ transport: "stdio", command: "server" }, "a") as any;
  component.nativeKey = { ...component.nativeKey, value: "native\u001b[2J\u202Ekey" };
  const plugin = options.remote === undefined ? directPlugin() : directPlugin({ components: { mcpServers: [component] } });
  const report = evaluateCompatibility({ plugin, capabilities: capabilities() });
  const content = createContentManifest([], fixtureSha);
  const revision = createInstalledRevisionRecord({ plugin, compatibility: report, content, scope: { kind: "user" } }, fixtureSha);
  const record = {
    plugin: plugin.identity.key,
    activation: options.enabled ? "enabled" : "disabled",
    selectedRevision: revision.revision,
    revisions: [revision],
    ...(options.pending ? { pendingTransition: `pending-transition-v1:sha256:${"77".repeat(32)}` } : {}),
  } as never;
  const serverKey = options.remote === undefined ? undefined : deriveMcpRuntimeServerKey(component.id);
  const runtime = {
    scope: { kind: "user" },
    plugin: plugin.identity.key,
    selectedRevision: revision.revision,
    ...(options.enabled ? { projectionDigest } : {}),
    skillsHooks: { kind: "ready", observation: options.enabled ? {
      kind: "active", participant: "skills-hooks", scope: { kind: "user" }, plugin: plugin.identity.key,
      revision: revision.revision, projectionDigest, currentProject: { projectKey: `project-v1:sha256:${"11".repeat(32)}`, trust: { kind: "trusted" } },
      contributionDigest: `sha256:${"22".repeat(32)}`, skillComponentIds: [], hookComponentIds: [],
    } : {
      kind: "inactive", participant: "skills-hooks", scope: { kind: "user" }, plugin: plugin.identity.key,
      projectionDigest: `sha256:${"33".repeat(32)}`, currentProject: { projectKey: `project-v1:sha256:${"11".repeat(32)}`, trust: { kind: "trusted" } },
      contributionDigest: `sha256:${"22".repeat(32)}`, skillComponentIds: [], hookComponentIds: [],
    } },
    mcp: options.remote === undefined ? { expected: { kind: "inactive", servers: [] }, status: { kind: "ready", status: null } } : {
      expected: { kind: "source", registrationDigest: `sha256:${"44".repeat(32)}`, servers: [{ componentId: component.id, serverKey, transport: "stdio" }] },
      status: { kind: "ready", status: {
        identity: { schemaVersion: 1, scope: { kind: "user" }, plugin: plugin.identity.key, revision: revision.revision, projectionDigest },
        registrationDigest: `sha256:${"44".repeat(32)}`, state: "registered",
        servers: [{ key: serverKey, componentId: component.id, nativeKey: component.nativeKey.value, provenance: [{ host: "claude", documentKind: "mcp", path: "plugin.mcp.json" }], state: options.remote }],
      } },
    },
  } as never;
  const snapshot = {
    binding: { capturedAt: 1, scopes: [{ scope: { kind: "user" }, generation: 0, status: "ready", corruptionCodes: [] }], currentProject: { projectKey: `project-v1:sha256:${"11".repeat(32)}`, trust: { kind: "trusted" }, epoch: `sha256:${"66".repeat(32)}` }, catalogs: [], capability: { status: "ready", digest: `sha256:${"88".repeat(32)}`, capturedBy: "fixture" }, runtimeEpoch: `sha256:${"99".repeat(32)}`, recoveryDigest: `sha256:${"aa".repeat(32)}`, updateDigest: `sha256:${"bb".repeat(32)}` },
    states: [{ ok: true, snapshot: { scope: { kind: "user" }, generation: 0, corruptions: [], installed: { plugins: [record], marketplaces: [] }, config: { records: [] }, trust: { records: [] } } }],
    currentProject: { identity: { kind: "path-only", canonicalRoot: "file:///project/", limitation: "identity-changes-with-canonical-root" }, projectKey: `project-v1:sha256:${"11".repeat(32)}`, trust: { kind: "trusted" } },
    capabilities: capabilities(), runtime: [runtime], recovery: { results: [], deferred: false, processed: 0 },
    startup: { status: "ready", blocked: [], capabilities: { mcp: { status: "available", explanation: "ready" }, subagents: { status: "unavailable", explanation: "none" }, piReload: { status: "available", explanation: "ready" }, secrets: { status: "available", explanation: "ready" } } },
  } as never;
  const evidence = { validate: vi.fn(async () => "current" as const) };
  const inspector = createNativeInstalledInspector({
    installed: { load: vi.fn(async () => ({ plugin, compatibility: report, marketplaceSource, content, binding: createMaterializationBinding(plugin.source.hash, content.rootDigest, fixtureSha) })) },
    readiness: { trust: vi.fn(async () => "authorized" as const), configuration: vi.fn(async () => []), secretCustody: () => ({ status: "available", explanation: "ready" }) },
    evidence: evidence as never,
    sha256,
  });
  const subject = { version: 1 as const, subject: "installed" as const, scope: { kind: "user" as const }, plugin: plugin.identity.key, selectedRevision: revision.revision };
  return { inspector, snapshot, subject };
}

describe("native installed inspection", () => {
  it("treats disabled plus exact inactive evidence as ready", async () => {
    const value = setup();
    const result = await value.inspector.inspect(value.subject, value.snapshot, new AbortController().signal);
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.detail.summary.condition).toBe("ready");
    expect(result.detail.activation?.state).toBe("inactive");
  });

  it.each(["failed", "needs-auth"] as const)("separates exact MCP activation from %s remote health", async (remote) => {
    const value = setup({ enabled: true, remote });
    const result = await value.inspector.inspect(value.subject, value.snapshot, new AbortController().signal);
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.detail.activation?.state).toBe("active");
    expect(result.detail.mcpHealth?.localRegistration).toBe("matching");
    expect(result.detail.summary.condition).toBe("degraded");
    expect(result.detail.diagnostics.map((item) => item.code)).toContain(remote === "failed" ? "MCP_REMOTE_HEALTH_FAILED" : "MCP_REMOTE_AUTH_REQUIRED");
    expect(result.detail.mcpHealth?.servers[0]?.nativeKey.escaped).toBe(true);
  });

  it("gives pending recovery precedence over otherwise usable runtime evidence", async () => {
    const value = setup({ enabled: true, remote: "connected", pending: true });
    const result = await value.inspector.inspect(value.subject, value.snapshot, new AbortController().signal);
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.detail.lifecycle.transition).toBe("pending");
    expect(result.detail.activation?.state).toBe("pending");
    expect(result.detail.summary.condition).toBe("blocked");
    expect(result.detail.diagnostics[0]?.code).toBe("TRANSITION_PENDING");
  });
});
