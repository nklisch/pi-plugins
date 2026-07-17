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
    const project = {
      scope: projectScope,
      current: () => ({ identity, projectKey, trust: { kind: "untrusted" as const } }),
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
});
