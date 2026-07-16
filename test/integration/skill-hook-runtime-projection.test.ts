import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRuntimeProjectionCache } from "../../src/infrastructure/filesystem/runtime-projection-cache.js";
import { createNodeContentStoreWithPlatform } from "../../src/infrastructure/filesystem/create-content-store.js";
import { createNodeContentStorePlatform, renameNoReplaceByProbe } from "../../src/infrastructure/filesystem/content-store-durability.js";
import { createProjectRootAuthorityPort } from "../../src/composition/create-project-root-authority.js";
import { createSkillHookRuntimeParticipant } from "../../src/runtime/skill-hook/lifecycle-participant.js";
import { createSkillHookSnapshotLoader } from "../../src/runtime/skill-hook/runtime-snapshot.js";
import { composeActivationObservation } from "../../src/application/ports/lifecycle-reload.js";
import { createActiveProjectionExpectation, createInactiveProjectionExpectation, createPluginRuntimeProjection } from "../../src/application/ports/runtime-projection.js";
import { createPromotionPlan } from "../../src/application/content-promotion.js";
import { CompatibilityReportSchema } from "../../src/domain/compatibility.js";
import { createContentManifest, createMaterializationBinding, hashContent } from "../../src/domain/content-manifest.js";
import { NormalizedPluginSchema } from "../../src/domain/plugin.js";
import { claim } from "../../src/domain/provenance.js";
import { createResolvedPluginSource } from "../../src/domain/source.js";
import { createInstalledRevisionRecord } from "../../src/domain/state/installed-state.js";
import { CanonicalProjectRootSchema, ProjectIdentitySchema, createScopeContext, deriveProjectKey } from "../../src/domain/state/scope.js";
import { createPluginStoreIdentityFromEvidence } from "../../src/domain/content-store.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;
const provenance = { location: { host: "claude" as const, documentKind: "manifest" as const, path: "plugin.json", pointer: "/components" } };
const componentId = (kind: string, token: string) => `component-v1:${kind}:${token.repeat(64).slice(0, 64)}`;

async function makeWritable(path: string): Promise<void> {
  const stat = await lstat(path).catch(() => undefined);
  if (stat === undefined) return;
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    for (const child of await readdir(path)) await makeWritable(join(path, child));
    await chmod(path, 0o755).catch(() => undefined);
  } else if (!stat.isSymbolicLink()) await chmod(path, 0o644).catch(() => undefined);
}

describe("skill/hook projection and reload evidence integration", () => {
  it("proves prepare, promote, post-commit roots, atomic reconcile, and whole-bundle observation", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-skill-hook-integration-"));
    try {
      const contentStore = await createNodeContentStoreWithPlatform({ hostRoot: join(root, "host"), platform: createNodeContentStorePlatform({ renameNoReplace: renameNoReplaceByProbe }) });
      const source = createResolvedPluginSource({ kind: "git", url: "https://example.invalid/complete.git", revision: "f".repeat(40) }, sha256);
      const skill = { kind: "skill" as const, id: componentId("skill", "1"), name: claim("complete-skill", provenance), root: claim("skills/complete", provenance), metadata: [] };
      const hook = { kind: "hook" as const, id: componentId("hook", "2"), event: claim("SessionStart", provenance), handler: claim({ kind: "shell" as const, command: "echo ready" }, provenance), metadata: [] };
      const mcp = { kind: "mcp-server" as const, id: componentId("mcp-server", "3"), nativeKey: claim("complete", provenance), declaration: claim({ transport: "stdio", command: "complete-mcp" }, provenance), metadata: [] };
      const plugin = NormalizedPluginSchema.parse({ identity: { key: "complete@community", marketplaceName: "community", marketplaceEntryName: "complete" }, source, configuration: { options: [] }, components: { skills: [skill], hooks: [hook], mcpServers: [mcp], foreign: [] }, metadata: [] });
      const compatibility = CompatibilityReportSchema.parse({ plugin: plugin.identity, activatable: true, components: [skill, hook, mcp].map((component) => ({ componentId: component.id, verdict: { kind: "supported" }, requirementIds: [], diagnostics: [] })), requirements: [], diagnostics: [] });
      const bytes = new TextEncoder().encode("skill contents");
      const content = createContentManifest([{ kind: "directory", path: "skills", mode: 0o755 }, { kind: "directory", path: "skills/complete", mode: 0o755 }, { kind: "file", path: "skills/complete/SKILL.md", mode: 0o644, size: bytes.byteLength, digest: hashContent(bytes, sha256) }], sha256);
      const allocation = await contentStore.allocateStaging(signal);
      await mkdir(join(allocation.slot.root, "content", "skills", "complete"), { recursive: true });
      await writeFile(join(allocation.slot.root, "content", "skills", "complete", "SKILL.md"), bytes);
      const binding = createMaterializationBinding(source.hash, content.rootDigest, sha256);
      const promotion = createPromotionPlan({ kind: "plugin", allocation, materialized: { root: join(allocation.slot.root, "content"), source, content, binding } }, sha256);
      await contentStore.promote(promotion, signal);
      const revision = createInstalledRevisionRecord({ plugin, compatibility, content, scope: { kind: "user" } }, sha256);
      const projection = createPluginRuntimeProjection({ scope: { kind: "user" }, plugin, compatibility, revision, sha256 });
      const expectation = createActiveProjectionExpectation(projection, sha256);
      const cache = createRuntimeProjectionCache({ content: contentStore, sha256 });
      await cache.prepare(expectation, signal);
      const cached = await cache.read(expectation, signal);
      expect(cached.kind).toBe("ready");
      if (cached.kind !== "ready") throw new Error("complete projection cache did not read back");

      const projectIdentity = ProjectIdentitySchema.parse({ kind: "path-only", canonicalRoot: CanonicalProjectRootSchema.parse("file:///workspace/"), limitation: "identity-changes-with-canonical-root" });
      const project = createScopeContext({ kind: "project", identity: projectIdentity, projectKey: deriveProjectKey(projectIdentity, sha256) }, sha256);
      const projectRoots = createProjectRootAuthorityPort({ resolve: async () => project }, sha256);
      const loader = createSkillHookSnapshotLoader({ content: contentStore, projectRoots, projectTrust: { async assess() { return { kind: "trusted" as const }; } }, sha256 });
      const runtime = createSkillHookRuntimeParticipant({ loader, sha256 });
      expect(await runtime.participant.reconcile({ active: [{ prepared: cached.value, revision }] }, signal)).toEqual({ kind: "applied", count: 1 });
      const skillsHooks = await runtime.participant.observe(expectation, signal);
      expect(skillsHooks.kind).toBe("ready");
      if (skillsHooks.kind !== "ready") throw new Error("skill/hook observation missing");
      const mcpObservation = { kind: "active" as const, participant: "mcp" as const, scope: expectation.projection.scope, plugin: expectation.projection.plugin, revision: expectation.projection.revision, projectionDigest: expectation.projection.digest, currentProject: skillsHooks.observation.currentProject, contributionDigest: `sha256:${"a".repeat(64)}` };
      const active = composeActivationObservation({ expectation, skillsHooks: skillsHooks.observation, mcp: mcpObservation });
      expect(active).toMatchObject({ kind: "active", revision: revision.revision, projectionDigest: projection.digest });

      expect(await runtime.participant.reconcile({ active: [] }, signal)).toEqual({ kind: "applied", count: 0 });
      const inactiveExpectation = createInactiveProjectionExpectation({ scope: { kind: "user" }, plugin: plugin.identity.key, sha256 });
      const inactiveSkillsHooks = await runtime.participant.observe(inactiveExpectation, signal);
      expect(inactiveSkillsHooks.kind).toBe("ready");
      if (inactiveSkillsHooks.kind !== "ready") throw new Error("inactive skill/hook observation missing");
      const inactiveMcp = { kind: "inactive" as const, participant: "mcp" as const, scope: inactiveExpectation.scope, plugin: inactiveExpectation.plugin, projectionDigest: inactiveExpectation.digest, currentProject: inactiveSkillsHooks.observation.currentProject, contributionDigest: `sha256:${"b".repeat(64)}` };
      expect(composeActivationObservation({ expectation: inactiveExpectation, skillsHooks: inactiveSkillsHooks.observation, mcp: inactiveMcp })).toMatchObject({ kind: "inactive", projectionDigest: inactiveExpectation.digest });
    } finally {
      await makeWritable(root);
      await rm(root, { recursive: true, force: true });
    }
  });
});