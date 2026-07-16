import {
  ComponentIdSchema,
  type ComponentId,
} from "../../domain/components.js";
import {
  ProjectionExpectationSchema,
  type ProjectionExpectation,
} from "../../application/ports/runtime-projection.js";
import {
  RuntimeContributionObservationSchema,
  SkillHookContributionObservationSchema,
  type RuntimeContributionObservation,
  type SkillHookContributionObservation,
} from "../../application/ports/lifecycle-reload.js";
import type { Sha256 } from "../../domain/source.js";
import {
  createSkillHookRuntimeCatalog,
  hasSameCurrentProject,
  runtimeTargetKey,
  type SkillHookRuntimeCatalog,
  type SkillHookRuntimeSetRequest,
  type SkillHookReconcileResult,
} from "./runtime-catalog.js";
import {
  CurrentProjectRuntimeContextSchema,
  digestSkillHookContribution,
  type CurrentProjectRuntimeContext,
  type RuntimeProjectionSelection,
  type SkillHookRuntimeSnapshot,
  type SkillHookSnapshotResult,
} from "./runtime-snapshot.js";

export type SkillHookContributionObservationResult =
  | Readonly<{ kind: "ready"; observation: SkillHookContributionObservation }>
  | Readonly<{ kind: "failed"; code: "CATALOG_UNINITIALIZED" | "OBSERVATION_MISMATCH" | "PROJECT_UNTRUSTED" | "ADAPTER_FAILED" }>
  | Readonly<{ kind: "cancelled" }>;

export interface SkillHookLifecycleParticipant {
  reconcile(request: SkillHookRuntimeSetRequest, signal: AbortSignal): Promise<SkillHookReconcileResult>;
  observe(expectation: ProjectionExpectation, signal: AbortSignal): Promise<SkillHookContributionObservationResult>;
}

function abortRequested(signal: AbortSignal): boolean {
  return signal.aborted;
}

function scopeOrder(snapshot: SkillHookRuntimeSnapshot): string {
  return runtimeTargetKey(snapshot.scope, snapshot.plugin);
}

function componentIds(values: readonly { id: ComponentId }[]): readonly ComponentId[] {
  return Object.freeze(values.map((value) => ComponentIdSchema.parse(value.id)));
}

function snapshotCurrentProject(snapshot: SkillHookRuntimeSnapshot): CurrentProjectRuntimeContext {
  return CurrentProjectRuntimeContextSchema.parse(snapshot.currentProject);
}

function failed(code: "CATALOG_UNINITIALIZED" | "OBSERVATION_MISMATCH" | "PROJECT_UNTRUSTED" | "ADAPTER_FAILED"): SkillHookContributionObservationResult {
  return { kind: "failed", code };
}

function isProjectEvidenceUsable(snapshot: SkillHookRuntimeSnapshot): boolean {
  return snapshot.scope.kind !== "project" ||
    (snapshot.currentProject.projectKey === snapshot.scope.projectKey && snapshot.currentProject.trust.kind === "trusted");
}

export function createSkillHookRuntimeParticipant(dependencies: Readonly<{
  loader: Readonly<{ load(selection: RuntimeProjectionSelection, signal: AbortSignal): Promise<SkillHookSnapshotResult> }>;
  sha256: Sha256;
}>): Readonly<{
  participant: SkillHookLifecycleParticipant;
  catalog: SkillHookRuntimeCatalog;
}> {
  if (dependencies === null || typeof dependencies !== "object") throw new TypeError("skill/hook participant dependencies are required");
  const owned = createSkillHookRuntimeCatalog();

  async function reconcile(request: SkillHookRuntimeSetRequest, signal: AbortSignal): Promise<SkillHookReconcileResult> {
    if (abortRequested(signal)) return { kind: "cancelled" };
    const seen = new Set<string>();
    for (const selection of request.active) {
      const snapshot = selection.prepared.projection;
      const key = runtimeTargetKey(snapshot.scope, snapshot.plugin);
      if (seen.has(key)) return { kind: "failed", code: "TARGET_COLLISION" };
      seen.add(key);
    }
    const loaded: SkillHookRuntimeSnapshot[] = [];
    try {
      for (const selection of request.active) {
        if (abortRequested(signal)) return { kind: "cancelled" };
        const result = await dependencies.loader.load(selection, signal);
        if (result.kind === "cancelled") return { kind: "cancelled" };
        if (result.kind !== "ready") return { kind: "failed", code: "SNAPSHOT_FAILED" };
        const expected = selection.prepared.projection;
        if (result.snapshot.scope.kind !== expected.scope.kind ||
            (result.snapshot.scope.kind === "project" && expected.scope.kind === "project" && result.snapshot.scope.projectKey !== expected.scope.projectKey) ||
            result.snapshot.plugin !== expected.plugin ||
            result.snapshot.revision !== expected.revision ||
            result.snapshot.projectionDigest !== expected.digest ||
            result.snapshot.projectionRef !== selection.prepared.expectation.projectionRef) {
          return { kind: "failed", code: "SNAPSHOT_FAILED" };
        }
        loaded.push(result.snapshot);
      }
      if (abortRequested(signal)) return { kind: "cancelled" };
      let currentProject = loaded[0]?.currentProject;
      for (const snapshot of loaded) {
        if (!isProjectEvidenceUsable(snapshot)) return { kind: "failed", code: "SNAPSHOT_FAILED" };
        if (currentProject !== undefined && !hasSameCurrentProject(currentProject, snapshot.currentProject)) {
          return { kind: "failed", code: "SNAPSHOT_FAILED" };
        }
        currentProject ??= snapshot.currentProject;
      }
      loaded.sort((left, right) => scopeOrder(left).localeCompare(scopeOrder(right)));
      // The final abort check is immediately before the synchronous swap. No
      // await occurs after this point, so a successful result identifies the
      // exact in-memory set that was installed.
      if (abortRequested(signal)) return { kind: "cancelled" };
      owned.publish(loaded, currentProject);
      return { kind: "applied", count: loaded.length };
    } catch (error) {
      if (abortRequested(signal) || (error !== null && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "AbortError")) return { kind: "cancelled" };
      return { kind: "failed", code: "ADAPTER_FAILED" };
    }
  }

  async function observe(expectationInput: ProjectionExpectation, signal: AbortSignal): Promise<SkillHookContributionObservationResult> {
    try {
      if (abortRequested(signal)) return { kind: "cancelled" };
      const expectation = ProjectionExpectationSchema.parse(expectationInput);
      const state = owned.state();
      if (!state.initialized || state.currentProject === undefined) return failed("CATALOG_UNINITIALIZED");
      const currentProject = state.currentProject;
      if (expectation.kind === "active") {
        const snapshot = owned.lookup(expectation.projection.scope, expectation.projection.plugin);
        if (snapshot === undefined || !isProjectEvidenceUsable(snapshot) || !hasSameCurrentProject(snapshotCurrentProject(snapshot), currentProject) ||
            snapshot.revision !== expectation.projection.revision ||
            snapshot.projectionDigest !== expectation.projection.digest ||
            snapshot.projectionRef !== expectation.projectionRef) {
          return failed(snapshot?.scope.kind === "project" && snapshot.currentProject.trust.kind !== "trusted" ? "PROJECT_UNTRUSTED" : "OBSERVATION_MISMATCH");
        }
        const observation = SkillHookContributionObservationSchema.parse({
          kind: "active",
          participant: "skills-hooks",
          scope: snapshot.scope,
          plugin: snapshot.plugin,
          revision: snapshot.revision,
          projectionDigest: snapshot.projectionDigest,
          currentProject,
          contributionDigest: snapshot.contributionDigest,
          skillComponentIds: componentIds(snapshot.skills),
          hookComponentIds: componentIds(snapshot.hooks),
        });
        return { kind: "ready", observation };
      }
      if (expectation.scope.kind === "project" &&
          (currentProject.projectKey !== expectation.scope.projectKey || currentProject.trust.kind !== "trusted")) {
        return failed(currentProject.trust.kind === "trusted" ? "OBSERVATION_MISMATCH" : "PROJECT_UNTRUSTED");
      }
      const target = owned.lookup(expectation.scope, expectation.plugin);
      if (target !== undefined) return failed("OBSERVATION_MISMATCH");
      const contributionDigest = digestSkillHookContribution({
        scope: expectation.scope,
        plugin: expectation.plugin,
        projectionDigest: expectation.digest,
        skills: [],
        hooks: [],
      }, dependencies.sha256);
      const observation = SkillHookContributionObservationSchema.parse({
        kind: "inactive",
        participant: "skills-hooks",
        scope: expectation.scope,
        plugin: expectation.plugin,
        projectionDigest: expectation.digest,
        currentProject,
        contributionDigest,
        skillComponentIds: [],
        hookComponentIds: [],
      });
      return { kind: "ready", observation };
    } catch (error) {
      if (abortRequested(signal) || (error !== null && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "AbortError")) return { kind: "cancelled" };
      if (error instanceof Error && error.name === "ZodError") return failed("OBSERVATION_MISMATCH");
      return failed("ADAPTER_FAILED");
    }
  }

  const participant: SkillHookLifecycleParticipant = Object.freeze({ reconcile, observe });
  return Object.freeze({ participant, catalog: owned.catalog });
}

export type {
  RuntimeContributionObservation,
  SkillHookContributionObservation,
  SkillHookRuntimeCatalog,
  SkillHookRuntimeSetRequest,
  SkillHookReconcileResult,
};