import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createProjectSyncService } from "../../src/application/project-sync-service.js";
import { createScopeContext, deriveProjectKey } from "../../src/domain/state/scope.js";
import { createProjectLocalStateDocumentV3 } from "../../src/domain/state/project-state.js";
import { encodeProjectIntentDeclaration } from "../../src/application/project-intent-codec.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;
const previewId = `native-operation-preview-v1:sha256:${"1".repeat(64)}` as never;

function fixture() {
  const identity = { kind: "path-only" as const, canonicalRoot: "file:///project/" as never, limitation: "identity-changes-with-canonical-root" as const };
  const scope = createScopeContext({ kind: "project", identity, projectKey: deriveProjectKey(identity, sha256) }, sha256);
  if (scope.kind !== "project") throw new Error("project fixture failed");
  let snapshot: any = {
    scope,
    generation: 0,
    pointers: {},
    project: createProjectLocalStateDocumentV3({ schemaVersion: 3, generation: 0, projectKey: scope.projectKey, identity: scope.identity, declarationDigest: `sha256:${"0".repeat(64)}`, marketplaces: [], plugins: [], marketplaceUpdates: [] }, scope, sha256),
    corruptions: [],
  };
  let declaration: any;
  let observation: any = Object.freeze({ publicId: `project-intent-observation-v1:sha256:${"2".repeat(64)}` });
  const replace = vi.fn(async (request: any) => {
    if (request.expected !== observation) return { kind: "stale" as const };
    declaration = request.declaration;
    observation = Object.freeze({ publicId: `project-intent-observation-v1:sha256:${"3".repeat(64)}` });
    return { kind: "written" as const, observation, digest: encodeProjectIntentDeclaration(declaration, sha256).digest };
  });
  const files = {
    async read() { return declaration === undefined ? { kind: "missing" as const, observation } : { kind: "found" as const, observation, declaration, digest: encodeProjectIntentDeclaration(declaration, sha256).digest }; },
    replace,
    async cleanup() {},
  };
  const state = { async read() { return { ok: true as const, snapshot }; }, async commit() { throw new Error("coordinator owns commit"); } };
  const mutations = {
    async runPreparedMutation(request: any, callback: any) {
      if (request.expectedGeneration !== snapshot.generation) return { kind: "stale-generation" as const, expected: request.expectedGeneration, actual: snapshot.generation };
      const prepared = await callback({ snapshot, assertOwned: async () => undefined });
      const generation = snapshot.generation + 1;
      snapshot = { ...snapshot, generation, project: { ...prepared.mutation.replace.project, generation } };
      return { kind: "committed" as const, value: prepared.value, snapshot };
    },
  };
  const root: any = Object.freeze({ kind: "trusted-project-root-v1", identity: scope.identity, projectKey: scope.projectKey, canonicalRoot: scope.identity.canonicalRoot });
  const lifecycle = { enable: vi.fn(), disable: vi.fn(), update: vi.fn(), uninstall: vi.fn(), install: vi.fn() };
  const registrations = { remove: vi.fn() };
  const service = createProjectSyncService({
    state: state as any,
    mutations: mutations as any,
    projectRoots: { async acquire() { return root; }, verify() { return scope; }, async revalidate() { return scope; } },
    projectTrust: { async assess() { return { kind: "trusted" as const }; } },
    files,
    writeIds: { async create() { return `project-intent-write-v1:${"A".repeat(32)}` as never; } },
    lifecycle: lifecycle as any,
    registrations: registrations as any,
    configurationPathContext() { return { scope, trustedProjectRoot: root }; },
    async readiness() { return []; },
    sha256,
  });
  return { scope, service, replace, lifecycle, registrations, get snapshot() { return snapshot; }, advance() { snapshot = { ...snapshot, generation: snapshot.generation + 1, project: { ...snapshot.project, generation: snapshot.generation + 1 } }; } };
}

describe("project sync service", () => {
  it("publishes local intent then records its digest without prerequisite mutation", async () => {
    const value = fixture();
    const preview = await value.service.preview({ mode: "publish-intent", projectKey: value.scope.projectKey, previewId }, signal);
    expect(preview.kind).toBe("ready");
    if (preview.kind !== "ready") return;
    const result = await value.service.apply({ context: preview.context, resolutions: [] }, undefined, signal);
    expect(result).toMatchObject({ kind: "succeeded", operation: "project-sync", effects: { projectFile: "written" } });
    expect(value.replace).toHaveBeenCalledOnce();
    expect(value.snapshot.project.declarationDigest).toBe(result.kind === "succeeded" ? result.syncDigest : undefined);
    expect(value.lifecycle.enable).not.toHaveBeenCalled();
    expect(value.lifecycle.update).not.toHaveBeenCalled();
    expect(value.registrations.remove).not.toHaveBeenCalled();
  });

  it("rejects apply-intent with a missing file and performs no writes", async () => {
    const value = fixture();
    expect(await value.service.preview({ mode: "apply-intent", projectKey: value.scope.projectKey, previewId }, signal)).toEqual({ kind: "rejected", code: "PROJECT_INTENT_MISSING" });
    expect(value.replace).not.toHaveBeenCalled();
  });

  it("detects project generation replacement before the first file or state effect", async () => {
    const value = fixture();
    const preview = await value.service.preview({ mode: "publish-intent", projectKey: value.scope.projectKey, previewId }, signal);
    expect(preview.kind).toBe("ready");
    if (preview.kind !== "ready") return;
    value.advance();
    const result = await value.service.apply({ context: preview.context, resolutions: [] }, undefined, signal);
    expect(result).toMatchObject({ kind: "conflict", reason: "state-generation-changed", effects: { state: "unchanged" } });
    expect(value.replace).not.toHaveBeenCalled();
  });

  it("rejects replay of an already-consumed execution context", async () => {
    const value = fixture();
    const preview = await value.service.preview({ mode: "publish-intent", projectKey: value.scope.projectKey, previewId }, signal);
    if (preview.kind !== "ready") throw new Error("preview fixture failed");
    await value.service.apply({ context: preview.context, resolutions: [] }, undefined, signal);
    expect(await value.service.apply({ context: preview.context, resolutions: [] }, undefined, signal)).toMatchObject({ kind: "stale", reason: "session" });
  });
});
