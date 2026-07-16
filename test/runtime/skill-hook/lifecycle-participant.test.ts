import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createInactiveProjectionExpectation, createActiveProjectionExpectation, createPluginRuntimeProjection } from "../../../src/application/ports/runtime-projection.js";
import { createSkillHookRuntimeParticipant } from "../../../src/runtime/skill-hook/lifecycle-participant.js";
import { createSkillHookSnapshotLoader } from "../../../src/runtime/skill-hook/runtime-snapshot.js";
import { CompatibilityReportSchema } from "../../../src/domain/compatibility.js";
import { createContentManifest } from "../../../src/domain/content-manifest.js";
import { createPluginStoreIdentityFromEvidence } from "../../../src/domain/content-store.js";
import { NormalizedPluginSchema } from "../../../src/domain/plugin.js";
import { createResolvedPluginSource } from "../../../src/domain/source.js";
import { createInstalledRevisionRecord } from "../../../src/domain/state/installed-state.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;

function setup() {
  const source = createResolvedPluginSource({ kind: "marketplace-path", marketplaceRevision: "d".repeat(40), path: "./plugin" }, sha256);
  const plugin = NormalizedPluginSchema.parse({ identity: { key: "fixture@community", marketplaceName: "community", marketplaceEntryName: "fixture" }, source, configuration: { options: [] }, components: { skills: [], hooks: [], mcpServers: [], foreign: [] }, metadata: [] });
  const compatibility = CompatibilityReportSchema.parse({ plugin: plugin.identity, activatable: true, components: [], requirements: [], diagnostics: [] });
  const content = createContentManifest([], sha256);
  const revision = createInstalledRevisionRecord({ plugin, compatibility, content, scope: { kind: "user" } }, sha256);
  const projection = createPluginRuntimeProjection({ scope: { kind: "user" }, plugin, compatibility, revision, sha256 });
  const expectation = createActiveProjectionExpectation(projection, sha256);
  const storeIdentity = createPluginStoreIdentityFromEvidence({ sourceHash: revision.evidence.source.sourceHash, binding: revision.revision }, sha256);
  const loader = createSkillHookSnapshotLoader({
    content: {
      async resolvePlugin() { return { kind: "plugin", root: "/content", identity: storeIdentity, manifest: content, contentRef: revision.contentRef }; },
      async ensureDataRoot(input) { return { root: "/data", scope: input.scope, plugin: input.plugin, dataRef: input.dataRef }; },
    },
    projectRoots: { async acquire() { throw new Error("current project unavailable"); }, verify() { throw new Error("not used"); } },
    projectTrust: { async assess() { return { kind: "trusted" as const }; } }, sha256,
  });
  // The participant test uses a prebuilt snapshot to isolate atomic catalog
  // behavior from the loader's adapter tests.
  const project = { identity: { kind: "path-only", canonicalRoot: "file:///workspace/", limitation: "identity-changes-with-canonical-root" }, projectKey: `project-v1:sha256:${"1".repeat(64)}`, trust: { kind: "trusted" as const } } as never;
  const snapshot = { schemaVersion: 1 as const, scope: { kind: "user" as const }, plugin: projection.plugin, revision: projection.revision, projectionDigest: projection.digest, projectionRef: expectation.projectionRef, currentProject: project, content: { kind: "plugin" as const, root: "/content", identity: storeIdentity, manifest: content, contentRef: revision.contentRef }, data: { root: "/data", scope: { kind: "user" as const }, plugin: projection.plugin, dataRef: revision.dataRef }, skills: [], hooks: [], contributionDigest: `sha256:${"2".repeat(64)}` };
  const participant = createSkillHookRuntimeParticipant({ loader: { async load() { return { kind: "ready" as const, snapshot }; } }, sha256 });
  return { participant, expectation, plugin: projection.plugin, loader, revision };
}

describe("skill/hook lifecycle participant", () => {
  it("atomically publishes, observes exact active ids, then proves inactive absence", async () => {
    const { participant, expectation, plugin, revision } = setup();
    expect(await participant.participant.observe(expectation, signal)).toMatchObject({ kind: "failed", code: "CATALOG_UNINITIALIZED" });
    expect(await participant.participant.reconcile({ active: [{ prepared: { expectation, projection: expectation.projection, payloadDigest: `sha256:${"3".repeat(64)}` }, revision }] }, signal)).toMatchObject({ kind: "applied", count: 1 });
    const active = await participant.participant.observe(expectation, signal);
    expect(active).toMatchObject({ kind: "ready", observation: { kind: "active", participant: "skills-hooks", skillComponentIds: [], hookComponentIds: [] } });
    expect(await participant.participant.reconcile({ active: [] }, signal)).toEqual({ kind: "applied", count: 0 });
    const inactive = await participant.participant.observe(createInactiveProjectionExpectation({ scope: { kind: "user" }, plugin, sha256 }), signal);
    expect(inactive).toMatchObject({ kind: "ready", observation: { kind: "inactive", projectionDigest: expect.any(String) } });
  });
});