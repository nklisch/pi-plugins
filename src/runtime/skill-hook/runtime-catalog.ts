import {
  PluginKeySchema,
  type PluginKey,
} from "../../domain/identity.js";
import {
  ScopeReferenceSchema,
  type ScopeReference,
} from "../../domain/state/scope.js";
import type { CurrentProjectRuntimeContext } from "../../application/ports/project-trust.js";
import type { SkillHookRuntimeSnapshot } from "./runtime-snapshot.js";

export type SkillHookRuntimeSetRequest = Readonly<{
  active: readonly import("./runtime-snapshot.js").RuntimeProjectionSelection[];
}>;

export type SkillHookReconcileResult =
  | Readonly<{ kind: "applied"; count: number }>
  | Readonly<{ kind: "failed"; code: "TARGET_COLLISION" | "SNAPSHOT_FAILED" | "ADAPTER_FAILED" }>
  | Readonly<{ kind: "cancelled" }>;

export interface SkillHookRuntimeCatalog {
  list(): readonly SkillHookRuntimeSnapshot[];
  get(scope: ScopeReference, plugin: PluginKey): SkillHookRuntimeSnapshot | undefined;
}

export type RuntimeCatalogState = Readonly<{
  initialized: boolean;
  currentProject?: CurrentProjectRuntimeContext;
}>;

function scopeKey(scopeInput: ScopeReference): string {
  const scope = ScopeReferenceSchema.parse(scopeInput);
  return scope.kind === "user" ? "user" : `project:${scope.projectKey}`;
}

function targetKey(scope: ScopeReference, plugin: PluginKey): string {
  return `${scopeKey(scope)}\0${PluginKeySchema.parse(plugin)}`;
}

function sameProject(left: CurrentProjectRuntimeContext, right: CurrentProjectRuntimeContext): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export type MutableSkillHookRuntimeCatalog = Readonly<{
  catalog: SkillHookRuntimeCatalog;
  state(): RuntimeCatalogState;
  lookup(scope: ScopeReference, plugin: PluginKey): SkillHookRuntimeSnapshot | undefined;
  publish(snapshots: readonly SkillHookRuntimeSnapshot[], currentProject?: CurrentProjectRuntimeContext): void;
}>;

export function createSkillHookRuntimeCatalog(): MutableSkillHookRuntimeCatalog {
  let snapshots: readonly SkillHookRuntimeSnapshot[] = Object.freeze([]);
  let initialized = false;
  let currentProject: CurrentProjectRuntimeContext | undefined;
  const values = new Map<string, SkillHookRuntimeSnapshot>();

  function lookup(scope: ScopeReference, plugin: PluginKey): SkillHookRuntimeSnapshot | undefined {
    return values.get(targetKey(scope, plugin));
  }

  function publish(next: readonly SkillHookRuntimeSnapshot[], nextProject?: CurrentProjectRuntimeContext): void {
    const map = new Map<string, SkillHookRuntimeSnapshot>();
    for (const snapshot of next) map.set(targetKey(snapshot.scope, snapshot.plugin), snapshot);
    values.clear();
    for (const [key, snapshot] of map) values.set(key, snapshot);
    snapshots = Object.freeze([...next]);
    if (nextProject !== undefined) currentProject = nextProject;
    initialized = true;
  }

  const catalog: SkillHookRuntimeCatalog = Object.freeze({
    list: () => snapshots,
    get: (scope: ScopeReference, plugin: PluginKey) => lookup(scope, plugin),
  });

  return Object.freeze({
    catalog,
    state: () => Object.freeze({
      initialized,
      ...(currentProject === undefined ? {} : { currentProject }),
    }),
    lookup,
    publish,
  });
}

export function hasSameCurrentProject(left: CurrentProjectRuntimeContext, right: CurrentProjectRuntimeContext): boolean {
  return sameProject(left, right);
}

export function runtimeTargetKey(scope: ScopeReference, plugin: PluginKey): string {
  return targetKey(scope, plugin);
}