import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createNativeInspectionEvidence } from "../../src/composition/native-inspection-evidence.js";
import { createRuntimeSelectionCatalog } from "../../src/composition/runtime-selection-catalog.js";
import { capabilities } from "../fixtures/compatibility/common.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const digest = `sha256:${"11".repeat(32)}` as never;
const projectKey = `project-v1:sha256:${"22".repeat(32)}` as never;
const projectIdentity = { kind: "path-only" as const, canonicalRoot: "file:///workspace/private/" as never, limitation: "identity-changes-with-canonical-root" as const };

function fixture() {
  let generation = 0;
  let trust: "trusted" | "untrusted" = "trusted";
  let now = 100;
  const currentProject = () => ({ identity: projectIdentity, projectKey, trust: { kind: trust } as const });
  const state = {
    read: vi.fn(async (scope: { kind: "user" | "project" }) => scope.kind === "user"
      ? { ok: true as const, snapshot: { scope: { kind: "user" as const }, generation, corruptions: [], installed: { plugins: [{ plugin: "demo@market", activation: "disabled", selectedRevision: digest, revisions: [] }], marketplaces: [] }, config: { records: [] }, trust: { records: [] } } }
      : { ok: true as const, snapshot: { scope: { kind: "project" as const, identity: projectIdentity, projectKey }, generation, corruptions: [], project: { plugins: [], marketplaces: [], marketplaceUpdates: [] } } }),
    commit: vi.fn(() => { throw new Error("must not mutate"); }),
  };
  const selections = createRuntimeSelectionCatalog(currentProject() as never);
  const skillHook = { observe: vi.fn(async (expectation: any) => ({ kind: "ready" as const, observation: {
    kind: "inactive" as const,
    participant: "skills-hooks" as const,
    scope: expectation.scope,
    plugin: expectation.plugin,
    projectionDigest: expectation.digest,
    currentProject: currentProject(),
    contributionDigest: digest,
    skillComponentIds: [],
    hookComponentIds: [],
  } })) };
  const mcp = { status: vi.fn(async (owner: any) => ({ kind: "ready" as const, owner, status: null })) };
  const port = createNativeInspectionEvidence({
    state: state as never,
    scopes: [{ kind: "user" }, { kind: "project", identity: projectIdentity, projectKey }] as never,
    revalidateProject: async () => currentProject() as never,
    selections,
    desired: () => undefined,
    skillHook,
    mcp,
    capabilities: capabilities(),
    recovery: { results: [], deferred: false, processed: 0 },
    startup: { status: "ready", blocked: [], capabilities: {
      mcp: { status: "unavailable", explanation: "not composed" },
      subagents: { status: "unavailable", explanation: "not composed" },
      piReload: { status: "available", explanation: "ready" },
      secrets: { status: "available", explanation: "ready" },
    } },
    clock: { nowEpochMilliseconds: () => now } as never,
    sha256,
  });
  return {
    port,
    state,
    selections,
    skillHook,
    mcp,
    currentProject,
    setGeneration: (value: number) => { generation = value; },
    setTrust: (value: "trusted" | "untrusted") => { trust = value; },
    setNow: (value: number) => { now = value; },
  };
}

describe("native inspection evidence", () => {
  it("captures deterministic path-free bindings without mutation or probing", async () => {
    const value = fixture();
    const snapshot = await value.port.capture(new AbortController().signal);
    const binding = JSON.stringify(snapshot.binding);
    expect(binding).not.toContain("workspace");
    expect(binding).not.toContain("private");
    expect(snapshot.runtime).toHaveLength(1);
    expect(snapshot.runtime[0]?.skillsHooks.kind).toBe("ready");
    expect(snapshot.runtime[0]?.mcp.status).toEqual({ kind: "ready", status: null });
    expect(value.state.commit).not.toHaveBeenCalled();
    expect(value.skillHook.observe).toHaveBeenCalledOnce();
    expect(value.mcp.status).toHaveBeenCalledOnce();
  });

  it("invalidates state, project-trust, and runtime epochs", async () => {
    const stateChange = fixture();
    const first = await stateChange.port.capture(new AbortController().signal);
    stateChange.setGeneration(1);
    expect(await stateChange.port.validate(first.binding, new AbortController().signal)).toBe("stale");

    const trustChange = fixture();
    const second = await trustChange.port.capture(new AbortController().signal);
    trustChange.setTrust("untrusted");
    expect(await trustChange.port.validate(second.binding, new AbortController().signal)).toBe("stale");

    const runtimeChange = fixture();
    const third = await runtimeChange.port.capture(new AbortController().signal);
    await runtimeChange.selections.replace([], runtimeChange.currentProject() as never);
    expect(await runtimeChange.port.validate(third.binding, new AbortController().signal)).toBe("stale");
  });

  it("does not make elapsed capture time stale by itself", async () => {
    const value = fixture();
    const snapshot = await value.port.capture(new AbortController().signal);
    value.setNow(200);
    expect(await value.port.validate(snapshot.binding, new AbortController().signal)).toBe("current");
  });
});
