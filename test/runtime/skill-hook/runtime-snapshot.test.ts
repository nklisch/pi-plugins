import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSkillHookSnapshotLoader } from "../../../src/runtime/skill-hook/runtime-snapshot.js";
import { createActiveProjectionExpectation, createPluginRuntimeProjection } from "../../../src/application/ports/runtime-projection.js";
import { CompatibilityReportSchema } from "../../../src/domain/compatibility.js";
import { createContentManifest } from "../../../src/domain/content-manifest.js";
import { createPluginStoreIdentityFromEvidence } from "../../../src/domain/content-store.js";
import { NormalizedPluginSchema } from "../../../src/domain/plugin.js";
import { createResolvedPluginSource } from "../../../src/domain/source.js";
import { createInstalledRevisionRecord } from "../../../src/domain/state/installed-state.js";
import { CanonicalProjectRootSchema, ProjectIdentitySchema, deriveProjectKey } from "../../../src/domain/state/scope.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;

function fixture() {
  const source = createResolvedPluginSource({ kind: "marketplace-path", marketplaceRevision: "c".repeat(40), path: "./plugin" }, sha256);
  const plugin = NormalizedPluginSchema.parse({
    identity: { key: "fixture@community", marketplaceName: "community", marketplaceEntryName: "fixture" }, source,
    configuration: { options: [] }, components: { skills: [], hooks: [], mcpServers: [], foreign: [] }, metadata: [],
  });
  const compatibility = CompatibilityReportSchema.parse({ plugin: plugin.identity, activatable: true, components: [], requirements: [], diagnostics: [] });
  const content = createContentManifest([], sha256);
  const revision = createInstalledRevisionRecord({ plugin, compatibility, content, scope: { kind: "user" } }, sha256);
  const projection = createPluginRuntimeProjection({ scope: { kind: "user" }, plugin, compatibility, revision, sha256 });
  const expectation = createActiveProjectionExpectation(projection, sha256);
  return { revision, projection, expectation };
}

const identity = ProjectIdentitySchema.parse({
  kind: "path-only",
  canonicalRoot: CanonicalProjectRootSchema.parse("file:///workspace/project/"),
  limitation: "identity-changes-with-canonical-root",
});
const projectKey = deriveProjectKey(identity, sha256);

function loader(root = "/virtual/content") {
  const { revision, projection, expectation } = fixture();
  const content = createContentManifest([], sha256);
  const storeIdentity = createPluginStoreIdentityFromEvidence({ sourceHash: revision.evidence.source.sourceHash, binding: revision.revision }, sha256);
  return {
    selection: { prepared: { expectation, projection, payloadDigest: `sha256:${"d".repeat(64)}` }, revision },
    loader: createSkillHookSnapshotLoader({
      content: {
        async resolvePlugin() { return { kind: "plugin", root, identity: storeIdentity, manifest: content, contentRef: revision.contentRef }; },
        async ensureDataRoot(input) { return { root: `${root}/data`, scope: input.scope, plugin: input.plugin, dataRef: input.dataRef }; },
      },
      projectRoots: { async acquire() { return { kind: "trusted-project-root-v1", identity, projectKey, canonicalRoot: identity.canonicalRoot } as never; }, verify() { throw new Error("not used"); } },
      projectTrust: { async assess() { return { kind: "trusted" as const }; } },
      sha256,
    }),
  };
}

describe("skill/hook runtime snapshots", () => {
  it("resolves exact adapter roots and keeps contribution evidence physical-root independent", async () => {
    const first = loader("/virtual/one");
    const second = loader("/virtual/two");
    const firstResult = await first.loader.load(first.selection, signal);
    const secondResult = await second.loader.load(second.selection, signal);
    expect(firstResult.kind).toBe("ready");
    expect(secondResult.kind).toBe("ready");
    if (firstResult.kind === "ready" && secondResult.kind === "ready") {
      expect(firstResult.snapshot.content.root).toBe("/virtual/one");
      expect(firstResult.snapshot.contributionDigest).toBe(secondResult.snapshot.contributionDigest);
    }
  });

  it("fails revision mismatches before resolving content", async () => {
    const value = loader();
    let resolved = false;
    const original = value.loader;
    const bad = { ...value.selection, revision: { ...value.selection.revision, revision: `sha256:${"e".repeat(64)}` } } as typeof value.selection;
    const result = await createSkillHookSnapshotLoader({
      content: { async resolvePlugin() { resolved = true; throw new Error("should not resolve"); }, async ensureDataRoot() { throw new Error("should not resolve"); } },
      projectRoots: { async acquire() { return { kind: "trusted-project-root-v1", identity, projectKey, canonicalRoot: identity.canonicalRoot } as never; }, verify() { throw new Error("not used"); } },
      projectTrust: { async assess() { return { kind: "trusted" as const }; } }, sha256,
    }).load(bad, signal);
    void original;
    expect(result).toEqual({ kind: "failed", code: "REVISION_MISMATCH" });
    expect(resolved).toBe(false);
  });
});