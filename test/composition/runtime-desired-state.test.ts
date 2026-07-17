import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildRuntimeDesiredState } from "../../src/composition/runtime-desired-state.js";
import { deriveProjectKey } from "../../src/domain/state/scope.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const identity = { kind: "path-only" as const, canonicalRoot: "file:///workspace/project/" as never, limitation: "identity-changes-with-canonical-root" as const };
const projectKey = deriveProjectKey(identity, sha256);
const projectScope = { kind: "project" as const, identity, projectKey };

function pointers() {
  return {
    schemaVersion: 1 as const,
    scope: { kind: "user" as const },
    generation: 0 as never,
    documents: [],
  } as never;
}

describe("runtime desired state", () => {
  it("rereads authority and excludes untrusted current-project state", async () => {
    const read = vi.fn(async (scope: { kind: string }) => {
      if (scope.kind !== "user") throw new Error("project state must not be read");
      return {
        ok: true as const,
        snapshot: {
          scope: { kind: "user" as const }, generation: 0 as never, pointers: pointers(),
          config: { schemaVersion: 2 as const, generation: 0 as never, records: [] },
          installed: { schemaVersion: 2 as const, generation: 0 as never, marketplaces: [], plugins: [] },
          trust: { schemaVersion: 1 as const, generation: 0 as never, records: [] },
          corruptions: [],
        },
      };
    });
    const currentProject = { identity, projectKey, trust: { kind: "untrusted" as const } };
    const project = {
      scope: projectScope,
      current: () => currentProject,
      revalidate: async () => currentProject,
    } as never;
    const result = await buildRuntimeDesiredState({
      installed: { load: vi.fn() },
      compatibility: { assess: vi.fn() },
      projections: { prepare: vi.fn(), read: vi.fn() },
      project,
      state: { read, commit: vi.fn() },
      sha256,
    }, new AbortController().signal);
    expect(read).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ selections: [], mcp: [], blocked: [] });
    expect(result.skillHook.currentProject.trust.kind).toBe("untrusted");
  });

  it("excludes unresolved pending records from startup publication", async () => {
    const pending = {
      plugin: "bundle@community",
      activation: "enabled",
      selectedRevision: `sha256:${"a".repeat(64)}`,
      revisions: [],
      pendingTransition: `pending-transition-v1:sha256:${"b".repeat(64)}`,
    };
    const state = {
      async read() {
        return {
          ok: true as const,
          snapshot: {
            scope: { kind: "user" as const }, generation: 1 as never, pointers: pointers(),
            config: { schemaVersion: 2 as const, generation: 1 as never, records: [] },
            installed: { schemaVersion: 2 as const, generation: 1 as never, marketplaces: [], plugins: [pending] },
            trust: { schemaVersion: 1 as const, generation: 1 as never, records: [] },
            corruptions: [],
          },
        };
      },
    };
    const installed = { load: vi.fn() };
    const currentProject = { identity, projectKey, trust: { kind: "untrusted" as const } };
    const result = await buildRuntimeDesiredState({
      installed: installed as never,
      compatibility: { assess: vi.fn() } as never,
      projections: { prepare: vi.fn(), read: vi.fn() } as never,
      project: { scope: projectScope, current: () => currentProject, revalidate: async () => currentProject } as never,
      state: state as never,
      sha256,
    }, new AbortController().signal);
    expect(installed.load).not.toHaveBeenCalled();
    expect(result.selections).toEqual([]);
    expect(result.blocked).toEqual([{ plugin: "bundle@community", code: "RECOVERY_REQUIRED", explanation: "pending lifecycle state is excluded until recovery settles" }]);
  });
});
