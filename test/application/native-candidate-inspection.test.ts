import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createNativeCandidateInspector } from "../../src/application/native-candidate-inspection.js";
import { createContentManifest, createMaterializationBinding } from "../../src/domain/content-manifest.js";
import { createResolvedMarketplaceSource } from "../../src/domain/source.js";
import { capabilities, directPlugin, fixtureProvenance, sha256 as fixtureSha } from "../fixtures/compatibility/common.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const registrationId = `marketplace-registration-v1:sha256:${"11".repeat(32)}` as never;
const candidateId = `marketplace-candidate-v1:sha256:${"22".repeat(32)}` as never;
const catalogSnapshot = `marketplace-snapshot-v1:sha256:${"33".repeat(32)}` as never;
const subject = { version: 1 as const, subject: "marketplace-candidate" as const, scope: { kind: "user" as const }, plugin: "fixture@compatibility" as never, registrationId, candidateId, catalogSnapshot };

function setup(validate: "current" | "stale" = "current") {
  const plugin = directPlugin();
  const content = createContentManifest([], fixtureSha);
  const materialized = { root: "/scratch/secret", source: plugin.source, content, binding: createMaterializationBinding(plugin.source.hash, content.rootDigest, fixtureSha) };
  const marketplaceSource = createResolvedMarketplaceSource({ declared: { kind: "github", repository: "owner/market" }, revision: "a".repeat(40) }, fixtureSha);
  const candidate = {
    id: candidateId,
    scope: { kind: "user" as const },
    registrationId,
    snapshot: catalogSnapshot,
    marketplace: { root: "/market/private", source: marketplaceSource, content, binding: createMaterializationBinding(marketplaceSource.hash, content.rootDigest, fixtureSha) },
    entry: {
      identity: { value: plugin.identity, provenance: [fixtureProvenance()] },
      source: { value: { kind: "git", url: "https://example.invalid/plugin.git" }, provenance: [fixtureProvenance()] },
    },
  } as never;
  const evidence = { validate: vi.fn(async () => validate) };
  const inspector = createNativeCandidateInspector({
    catalog: { resolve: vi.fn(async () => ({ kind: "resolved" as const, candidate })) },
    content: { withMaterialized: vi.fn(async (_candidate, _signal, use) => use(materialized)) },
    inspector: { inspect: vi.fn(async () => ({ ok: true as const, value: plugin, diagnostics: [] })) },
    evidence: evidence as never,
    readiness: { trust: vi.fn(async () => "authorized" as const), configuration: vi.fn(async () => []), secretCustody: () => ({ status: "available", explanation: "ready" }) },
    sha256,
  });
  const snapshot = {
    binding: {
      capturedAt: 1,
      scopes: [{ scope: { kind: "user" }, generation: 0, status: "ready", corruptionCodes: [] }],
      currentProject: { projectKey: `project-v1:sha256:${"44".repeat(32)}`, trust: { kind: "trusted" }, epoch: `sha256:${"55".repeat(32)}` },
      catalogs: [{ registrationId, snapshot: catalogSnapshot, cache: { kind: "ready", validator: { kind: "git-commit", revision: "a".repeat(40) }, etag: { kind: "not-applicable" } } }],
      capability: { status: "ready", digest: `sha256:${"66".repeat(32)}`, capturedBy: "fixture" },
      runtimeEpoch: `sha256:${"77".repeat(32)}`,
      recoveryDigest: `sha256:${"88".repeat(32)}`,
      updateDigest: `sha256:${"99".repeat(32)}`,
    },
    states: [],
    currentProject: { identity: { kind: "path-only", canonicalRoot: "file:///project/", limitation: "identity-changes-with-canonical-root" }, projectKey: `project-v1:sha256:${"44".repeat(32)}`, trust: { kind: "trusted" } },
    capabilities: capabilities(),
    runtime: [],
    recovery: { results: [], deferred: false, processed: 0 },
    startup: { status: "ready", blocked: [], capabilities: { mcp: { status: "unavailable", explanation: "none" }, subagents: { status: "unavailable", explanation: "none" }, piReload: { status: "available", explanation: "yes" }, secrets: { status: "available", explanation: "yes" } } },
  } as never;
  return { inspector, snapshot, evidence };
}

describe("native candidate inspection", () => {
  it("inspects one exact candidate with existing policy and no physical roots", async () => {
    const value = setup();
    const result = await value.inspector.inspect(subject, value.snapshot, new AbortController().signal);
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.detail.compatibility.status).toBe("activatable");
    expect(result.detail.trust).toBe("authorized");
    expect(result.detail.lifecycle.installed).toBe(false);
    expect(JSON.stringify(result)).not.toContain("/scratch/secret");
    expect(JSON.stringify(result)).not.toContain("/market/private");
    expect(value.evidence.validate).toHaveBeenCalledOnce();
  });

  it("rejects a mid-acquisition authority change as stale", async () => {
    const value = setup("stale");
    await expect(value.inspector.inspect(subject, value.snapshot, new AbortController().signal)).resolves.toEqual({ kind: "stale", action: "retry-read" });
  });

  it("maps acquisition failures to stable diagnostics without native leakage", async () => {
    const value = setup();
    const failing = createNativeCandidateInspector({
      catalog: { resolve: async () => { throw new Error("NATIVE_CAUSE_SECRET"); } },
      content: { withMaterialized: async () => { throw new Error("unused"); } },
      inspector: { inspect: async () => { throw new Error("unused"); } },
      evidence: value.evidence as never,
      readiness: { trust: async () => "authorized", configuration: async () => [], secretCustody: () => ({ status: "available", explanation: "ready" }) },
      sha256,
    } as never);
    const result = await failing.inspect(subject, value.snapshot, new AbortController().signal);
    expect(result.kind).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("NATIVE_CAUSE_SECRET");
    expect(JSON.stringify(result)).toContain("CATALOG_UNAVAILABLE");
  });
});
