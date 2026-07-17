---
id: trim-unused-packaged-host-composition-seams
kind: feature
stage: review
tags: [refactor, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Trim Unused Packaged Host Composition Seams

## Brief

Remove production composition surfaces introduced by the packaged-host bundle that have no production role: a test-only alternate MCP projection/observation path, unused path-plan outputs, an unread runtime-state input, and a discarded startup result binding. Keep the canonical lifecycle participant, all state/custody boundaries, runtime semantics, public package exports, and verification behavior unchanged.

## Discovery Scope

Direct-read discovery covered packaged host composition commits `a79721f` through `9352f57`: host/path/session, durable lifecycle state and configuration, project identity and Secret Service custody, installed revision reconstruction, runtime selection/capabilities, skill/hook/subagent composition, MCP composition, reload/recovery/application assembly, and package hardening. It also covered project rules, conventions, foundation documents, the active packaged-host review item, marketplace and production-runtime follow-ons, existing refactor history, and executable source/test references. No nested agent, peer mechanism, or `.work/bin/work-view` invocation was used.

Manual dependency check: both new stories are descendants only of this feature; step 2 depends on step 1; neither story or the feature appears in an ancestor dependency list. The chain is acyclic by construction.

## Refactor Overview

The packaged host currently carries two kinds of dead composition surface:

1. `ComposedMcpRuntime.project()` and `.observe()` form a second MCP projection/observation API used only by its composition test. Production reload uses the existing `McpLifecycleParticipant` directly. The helper module that backs the alternate path therefore has no production role.
2. Several composition values are declared or computed but never consumed by production: nine path-plan fields, the ignored `buildRuntimeDesiredState.scopes` input, and a startup `observations` local immediately discarded with `void`.

Removing these seams deletes concepts and code without changing a package export, persisted schema/path, state/custody semantic, lifecycle participant, or runtime outcome. This is intentionally narrower than splitting the large host factory or consolidating SQLite, secret, recovery, and selection ownership.

## Refactor Steps

### Step 1: Make the MCP lifecycle participant the sole observation surface

**Priority**: High
**Risk**: Low
**Source Lens**: elimination / dead weight / confused ownership
**Files**: `src/composition/create-mcp-runtime.ts`, `src/composition/mcp-runtime-state.ts` (delete), `test/composition/create-mcp-runtime.test.ts`
**Story**: `trim-unused-packaged-host-composition-seams-step-1`

**Current State**:

```ts
export type ComposedMcpRuntime = Readonly<{
  participant: McpLifecycleParticipant;
  project(selection: RuntimeSelection, capabilities: McpRuntimeCapabilities): McpLifecycleState;
  reconcileAll(/* ... */): Promise<readonly McpLifecycleReconcileResult[]>;
  observe(selection: RuntimeSelection, signal: AbortSignal): Promise<McpLifecycleObservationResult>;
  close(): Promise<void>;
}>;

function project(selection: RuntimeSelection, capabilities: McpRuntimeCapabilities): McpLifecycleState {
  return projectRuntimeSelectionToMcpState(selection, McpRuntimeCapabilitiesSchemaV1.parse(capabilities), input.sha256);
}

async function observe(selection: RuntimeSelection, signal: AbortSignal) {
  // Alternate capability probe and observation path used only by the test.
}

return Object.freeze({ participant, project, reconcileAll, observe, close });
```

`projectRuntimeSelectionToMcpState` is the sole executable content of `mcp-runtime-state.ts`. Source reference search finds its only importer in `create-mcp-runtime.ts`; `.project()` and `.observe()` have no production caller. `complete-plugin-reload.ts` already uses `mcp.participant.observe(...)`, which is the lifecycle authority.

**Target State**:

```ts
export type ComposedMcpRuntime = Readonly<{
  participant: McpLifecycleParticipant;
  reconcileAll(/* ... */): Promise<readonly McpLifecycleReconcileResult[]>;
  close(): Promise<void>;
}>;

return Object.freeze({ participant, reconcileAll, close });
```

Delete `mcp-runtime-state.ts` and the alternate capability/projection/observation implementation. Keep the existing no-runtime test, but drive its same `none` state through `reconcileAll()` and `participant.observe()` using the existing projection contract rather than a production-only test convenience method.

**Implementation Notes**:
- Remove only the methods, imports, and helper module proven to have no production caller.
- Keep `owned`, `stateKey`, `reconcileAll`, source cleanup, launch providers, leases, and `participant` unchanged.
- Do not alter MCP capability evaluation, projection semantics, source mutation, observation result mapping, or cleanup ambiguity.
- Retain the behavioral test; change only its route to the canonical participant surface.

**Acceptance Criteria**:
- [ ] Production source has one MCP lifecycle observation authority: `McpLifecycleParticipant`; `ComposedMcpRuntime` no longer exposes `project` or `observe`.
- [ ] `src/composition/mcp-runtime-state.ts` is deleted and has no executable reference.
- [ ] The no-runtime/no-MCP test still proves exact `none`/inactive reconciliation and ready observation without a launch effect.
- [ ] MCP composition, lifecycle, launch, lease, and complete-reload tests pass unchanged in behavior.
- [ ] Typecheck and dependency boundaries pass.

**Rollback**: Revert this story's commit to restore the internal convenience methods and helper module. No public package contract or persisted evidence changes.

---

### Step 2: Remove unconsumed composition values

**Priority**: Medium
**Risk**: Low
**Source Lens**: elimination / dead weight
**Files**: `src/composition/plugin-host-paths.ts`, `src/composition/runtime-desired-state.ts`, `src/composition/create-packaged-plugin-host.ts`, `test/composition/packaged-plugin-host-contract.test.ts`
**Story**: `trim-unused-packaged-host-composition-seams-step-2`

**Current State**:

```ts
export type PluginHostPathPlan = Readonly<{
  hostRoot: string;
  stateRoot: string;
  lockRoot: string;
  configurationRoot: string;
  configurationDatabase: string;
  stagingRoot: string;
  storesRoot: string;
  dataRoot: string;
  generatedRoot: string;
  recoveryRoot: string;
  journalRoot: string;
  leaseRoot: string;
  retentionRoot: string;
  stateDatabase(scope: ScopeReference): string;
}>;

export async function buildRuntimeDesiredState(input: Readonly<{
  scopes?: readonly GenerationSnapshot[];
  // live dependencies
}>, signal: AbortSignal) {
  // authority is always reread from state
  void input.scopes;
}

const observations = successor === undefined
  ? await reload.reconcileCurrent(signal)
  : await reload.acceptSuccessor(successor, signal);
void observations;
```

Reference search finds the nine extra path outputs only in the plan itself, except for one test assertion of `journalRoot`; actual content/recovery adapters derive their existing paths from `hostRoot`. `scopes` is explicitly ignored. The startup result is awaited only for completion and then discarded. `RuntimeSelectionCatalog.snapshot()` is not part of this step because complete-reload tests use it to verify rollback.

**Target State**:

```ts
export type PluginHostPathPlan = Readonly<{
  hostRoot: string;
  stateRoot: string;
  lockRoot: string;
  configurationRoot: string;
  stateDatabase(scope: ScopeReference): string;
}>;

export async function buildRuntimeDesiredState(input: Readonly<{
  // live dependencies only; no ignored scopes override
}>, signal: AbortSignal) { /* unchanged authoritative reads */ }

if (successor === undefined) await reload.reconcileCurrent(signal);
else await reload.acceptSuccessor(successor, signal);
```

**Implementation Notes**:
- Remove only path-plan outputs with zero production readers; retain `hostRoot`, `stateRoot`, `lockRoot`, `configurationRoot`, and `stateDatabase` exactly.
- Do not change any path spelling or the adapters' existing `hostRoot`-derived content/recovery layout.
- Remove the path-contract assertion that reaches only the deleted unused field; retain host/state/lock/project-digest and collision-free assertions.
- Remove `GenerationSnapshot` import fallout with the ignored `scopes` property.
- Retain `RuntimeSelectionCatalog.snapshot()`: although it has no production caller, complete-reload tests use it to verify candidate rollback, so deleting it would weaken useful verification rather than simplify production ownership.
- Await startup reconciliation directly so ordering and rejection propagation remain identical.

**Acceptance Criteria**:
- [ ] `PluginHostPathPlan` exposes only fields read by production composition; no filesystem path spelling changes.
- [ ] `buildRuntimeDesiredState` has no ignored `scopes` override and still rereads user/current-trusted-project authority exactly as before.
- [ ] Startup awaits the same reconcile/accept operation and propagates the same failure without an unused local.
- [ ] Packaged host path/session, desired-state, selection, startup/recovery, typecheck, and boundary tests pass.

**Rollback**: Revert this story's commit to restore the unused fields/accessors/input/local. No persisted path, state, runtime, or package API changes.

## Implementation Order

1. `trim-unused-packaged-host-composition-seams-step-1`
2. `trim-unused-packaged-host-composition-seams-step-2`

## Exclusions

- No source implementation in this design pass.
- No splitting of `createPackagedPluginHost`; its large factory is cohesive lifetime composition and the caller explicitly excluded that rewrite.
- No unification of lifecycle state, configuration, locks, journals, recovery, or secret custody; their distinct semantics are intentional.
- No Secret Service, project-identity, path-containment, state-corruption, reload, concurrency, or capability behavior changes; correctness belongs to the active packaged-host review.
- No test-only cleanup: the MCP behavioral check remains and uses the production authority; `RuntimeSelectionCatalog.snapshot()` remains because reload tests use it to verify rollback; only an assertion for a deleted unused path-plan surface is removed.
- No marketplace, production runtime adapter/fork, native manager, public package export, release, or push work.

## Verification Plan

1. Repeat executable-reference searches for every removed method, module, field, input, and local before implementation.
2. Run focused composition tests for MCP runtime, packaged host contract, runtime desired state, complete reload, and packaged startup/recovery.
3. Run `npm run typecheck` and `npm run boundaries`.
4. Run the full suite only after focused verification is green; any correctness failure is not folded into this refactor.

## Implementation Notes

- Execution capability: direct inline implementation; both ordered child checkpoints were small, cohesive elimination changes with fully mapped call sites.
- Review weight: standard (project default); independent feature review is the next stage boundary.
- Files changed: `src/composition/create-mcp-runtime.ts`, deleted `src/composition/mcp-runtime-state.ts`, `src/composition/plugin-host-paths.ts`, `src/composition/runtime-desired-state.ts`, `src/composition/create-packaged-plugin-host.ts`, `test/composition/create-mcp-runtime.test.ts`, and `test/composition/packaged-plugin-host-contract.test.ts`.
- Tests updated: retained the no-runtime MCP behavior check through the lifecycle participant and removed only the assertion for an eliminated unused path-plan field; no new test machinery was needed.
- Simplification payoff: removed the alternate MCP projection/observation authority, its helper module, nine unused path outputs, one ignored desired-state input and type import, and one discarded startup binding. Production/test code changed by 17 insertions and 95 deletions, net 78 lines deleted.
- Verification: step-1 focused MCP coverage passed 60 tests; step-2 focused packaged-host coverage passed 15 tests; full `npm test` passed 201 files / 1,037 tests with no type errors or dependency violations. Package verification passed with 522 root exports, 3 `./pi` exports, and packed-consumer discovery.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Implementation Completion

Both child stories are `stage: done`. Focused and full verification are green, so the integrated feature is ready for feature-level review.
