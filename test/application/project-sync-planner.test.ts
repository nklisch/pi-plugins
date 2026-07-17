import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createProjectSyncPlanningContext, resolveProjectSyncConflicts } from "../../src/application/project-sync-planner.js";
import { deriveMarketplaceSourceIdentity, derivePluginSourceIdentity } from "../../src/domain/update-policy.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const digest = (value: string) => `sha256:${value.repeat(64)}` as never;
const projectKey = `project-v1:sha256:${"1".repeat(64)}` as never;
const observationId = `project-intent-observation-v1:sha256:${"2".repeat(64)}` as never;
const source = { kind: "github" as const, repository: "owner/market" };
const pluginSource = { kind: "marketplace-path" as const, path: "./plugin" };

function record(plugin: string, enabled: boolean, declaredVersion = "1.0.0") {
  const revision = digest(plugin.startsWith("a") ? "3" : "4");
  return {
    plugin,
    activation: enabled ? "enabled" : "disabled",
    selectedRevision: revision,
    revisions: [{ revision, evidence: { source: { kind: "marketplace-path", sourceRevision: "a".repeat(40), marketplaceSourceIdentity: deriveMarketplaceSourceIdentity(source, sha256), pluginSourceIdentity: derivePluginSourceIdentity(pluginSource, sha256), declaredVersion }, plugin: { key: plugin } } }],
  } as any;
}
function snapshot(plugins = [record("a@market", true), record("b@market", false)]) {
  return {
    scope: { kind: "project", projectKey, identity: { kind: "path-only", canonicalRoot: "file:///project/", limitation: "identity-changes-with-canonical-root" } },
    generation: 4,
    project: {
      declarationDigest: digest("0"),
      marketplaceUpdates: [{ marketplace: "market", source, origin: { kind: "native" } }],
      plugins,
    },
    corruptions: [],
  } as any;
}
function file(declaration: any) { return { status: "present" as const, observationId, declaration, digest: digest("5") }; }

describe("project sync planner", () => {
  it("is deterministic across machine and file ordering", () => {
    const declaration = { schemaVersion: 1 as const, marketplaces: [{ marketplace: "market", source }], plugins: [{ plugin: "b@market", enabled: false }, { plugin: "a@market", enabled: true, constraint: { kind: "declared-version", value: "1.0.0" } }] };
    const left = createProjectSyncPlanningContext({ mode: "publish-intent", projectEpoch: digest("6"), snapshot: snapshot(), file: file(declaration), sha256 });
    const right = createProjectSyncPlanningContext({ mode: "publish-intent", projectEpoch: digest("6"), snapshot: snapshot([...snapshot().project.plugins].reverse()), file: file({ ...declaration, plugins: [...declaration.plugins].reverse() }), sha256 });
    expect(right.plan).toEqual(left.plan);
    expect(right.machine.declaration).toEqual(left.machine.declaration);
  });

  it("returns complete offline prerequisites and admits no executable actions", () => {
    const declaration = { schemaVersion: 1 as const, marketplaces: [{ marketplace: "market", source }], plugins: [
      { plugin: "missing@market", enabled: true },
      { plugin: "a@market", enabled: true, constraint: { kind: "declared-version" as const, value: "2.0.0" } },
    ] };
    const context = createProjectSyncPlanningContext({
      mode: "apply-intent", projectEpoch: digest("6"), snapshot: snapshot(), file: file(declaration),
      readiness: [{ plugin: "a@market" as never, trust: "missing", configuration: "missing" }], sha256,
    });
    expect(context.plan.actions).toEqual([]);
    expect(context.plan.requiredActions.map((action) => action.kind).sort()).toEqual(["provide-configuration", "install-plugin", "review-trust", "update-plugin"].sort());
    expect(JSON.stringify(context.plan)).not.toContain("file://");
  });

  it("merges by deterministic union and requires complete explicit resolutions", () => {
    const declaration = { schemaVersion: 1 as const, marketplaces: [{ marketplace: "market", source: { kind: "github" as const, repository: "other/market" } }], plugins: [{ plugin: "a@market", enabled: false, constraint: { kind: "declared-version" as const, value: "2.0.0" } }] };
    const context = createProjectSyncPlanningContext({ mode: "merge", projectEpoch: digest("6"), snapshot: snapshot([record("a@market", true)]), file: file(declaration), sha256 });
    expect(context.plan.conflicts.map((conflict) => conflict.kind).sort()).toEqual(["marketplace-source", "plugin-constraint", "plugin-enabled"]);
    expect(() => resolveProjectSyncConflicts(context, [], sha256)).toThrow("INVALID_RESOLUTION");
    const resolved = resolveProjectSyncConflicts(context, context.plan.conflicts.map((conflict) => ({ conflictId: conflict.id, choose: conflict.kind === "marketplace-source" ? "machine" as const : "file" as const })), sha256);
    expect(resolved.plan.conflicts).toEqual([]);
    expect(resolved.desired?.plugins[0]).toMatchObject({ enabled: false, constraint: { value: "2.0.0" } });
    expect(resolved.plan.requiredActions.map((action) => action.kind)).toContain("update-plugin");
    expect(resolved.plan.actions).toEqual([]);
  });

  it("plans directional local convergence without installation or refresh actions", () => {
    const declaration = { schemaVersion: 1 as const, marketplaces: [{ marketplace: "market", source }], plugins: [{ plugin: "a@market", enabled: false }] };
    const context = createProjectSyncPlanningContext({ mode: "apply-intent", projectEpoch: digest("6"), snapshot: snapshot(), file: file(declaration), sha256 });
    expect(context.plan.requiredActions).toEqual([]);
    expect(context.plan.actions.map((action) => action.kind)).toEqual(["disable-plugin", "uninstall-plugin", "record-intent-digest"]);
    expect(context.plan.requiredActions.some((action) => ["install-plugin", "update-plugin"].includes(action.kind))).toBe(false);
  });
});
