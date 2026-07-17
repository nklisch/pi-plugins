import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createTrustedInstallCandidateService } from "../../src/application/trusted-install-candidate.js";
import { createContentManifest, createMaterializationBinding } from "../../src/domain/content-manifest.js";
import { createResolvedMarketplaceSource } from "../../src/domain/source.js";
import { capabilities, directPlugin, fixtureProvenance, sha256 as fixtureSha } from "../fixtures/compatibility/common.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const registrationId = `marketplace-registration-v1:sha256:${"11".repeat(32)}` as never;
const candidateId = `marketplace-candidate-v1:sha256:${"22".repeat(32)}` as never;
const catalogSnapshot = `marketplace-snapshot-v1:sha256:${"33".repeat(32)}` as never;
const subject = { version: 1 as const, subject: "marketplace-candidate" as const, scope: { kind: "user" as const }, plugin: "fixture@compatibility" as never, registrationId, candidateId, catalogSnapshot };

function setup() {
  const plugin = directPlugin();
  const content = createContentManifest([], fixtureSha);
  const materialized = { root: "/private/candidate/content", source: plugin.source, content, binding: createMaterializationBinding(plugin.source.hash, content.rootDigest, fixtureSha) };
  const marketplaceSource = createResolvedMarketplaceSource({ declared: { kind: "github", repository: "owner/market" }, revision: "a".repeat(40) }, fixtureSha);
  const candidate = {
    id: candidateId, scope: { kind: "user" as const }, registrationId, snapshot: catalogSnapshot,
    marketplace: { root: "/private/market", source: marketplaceSource, content, binding: createMaterializationBinding(marketplaceSource.hash, content.rootDigest, fixtureSha) },
    entry: { identity: { value: plugin.identity, provenance: [fixtureProvenance()] }, source: { value: { kind: "git", url: "https://example.invalid/plugin.git" }, provenance: [fixtureProvenance()] } },
  } as never;
  const release = vi.fn(async () => undefined);
  const lease = { candidate, materialized, claim: vi.fn(), release } as never;
  const service = createTrustedInstallCandidateService({
    catalog: { resolve: vi.fn(async () => ({ kind: "resolved" as const, candidate })) },
    content: { acquire: vi.fn(async () => lease), withMaterialized: vi.fn() },
    inspector: { inspect: vi.fn(async () => ({ ok: true as const, value: plugin, diagnostics: [] })) },
    readiness: { trust: vi.fn(async () => "required" as const), configuration: vi.fn(async () => []), secretCustody: () => ({ status: "available" as const, explanation: "ready" }) },
    sha256,
  });
  const snapshot = {
    binding: {
      capturedAt: 1,
      scopes: [{ scope: { kind: "user" }, generation: 0, status: "ready", corruptionCodes: [] }],
      currentProject: { projectKey: `project-v1:sha256:${"44".repeat(32)}`, trust: { kind: "trusted" }, epoch: `sha256:${"55".repeat(32)}` },
      catalogs: [{ registrationId, snapshot: catalogSnapshot, cache: { kind: "ready", validator: { kind: "git-commit", revision: "a".repeat(40) }, etag: { kind: "not-applicable" } } }],
      capability: { status: "ready", digest: `sha256:${"66".repeat(32)}`, capturedBy: "fixture" },
      runtimeEpoch: `sha256:${"77".repeat(32)}`, recoveryDigest: `sha256:${"88".repeat(32)}`, updateDigest: `sha256:${"99".repeat(32)}`,
    },
    states: [],
    currentProject: { identity: { kind: "path-only", canonicalRoot: "file:///project/", limitation: "identity-changes-with-canonical-root" }, projectKey: `project-v1:sha256:${"44".repeat(32)}`, trust: { kind: "trusted" } },
    capabilities: capabilities(), runtime: [], recovery: { results: [], deferred: false, processed: 0 },
    startup: { status: "ready", blocked: [], capabilities: { mcp: { status: "available", explanation: "yes" }, subagents: { status: "available", explanation: "yes" }, piReload: { status: "available", explanation: "yes" }, secrets: { status: "available", explanation: "yes" } } },
  } as never;
  return { service, snapshot, release };
}

describe("trusted-install candidate", () => {
  it("binds one retained materialization to inspection, compatibility, trust, and consent", async () => {
    const { service, snapshot, release } = setup();
    const result = await service.acquire({ subject, snapshot }, new AbortController().signal);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.candidate.binding).toMatchObject({ candidateId, registrationId, catalogSnapshot, plugin: subject.plugin, capabilityDigest: snapshot.binding.capability.digest });
    expect(result.candidate.consent.consentId).toMatch(/^trusted-install-consent-v1:sha256:/);
    expect(result.candidate.consent.remoteMcpDiscovery).toBe("not-performed");
    const publicEvidence = JSON.stringify({ binding: result.candidate.binding, detail: result.candidate.detail, fields: result.candidate.fields, consent: result.candidate.consent });
    expect(publicEvidence).not.toContain("/private/candidate");
    expect(publicEvidence).not.toContain("/private/market");
    expect(release).not.toHaveBeenCalled();
  });

  it("releases bytes when capability evidence is unavailable", async () => {
    const { service, snapshot, release } = setup();
    snapshot.binding.capability.digest = undefined;
    const result = await service.acquire({ subject, snapshot }, new AbortController().signal);
    expect(result.kind).toBe("rejected");
    expect(release).toHaveBeenCalledTimes(1);
  });
});
