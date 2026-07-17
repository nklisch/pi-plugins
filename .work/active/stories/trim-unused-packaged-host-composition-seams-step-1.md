---
id: trim-unused-packaged-host-composition-seams-step-1
kind: story
stage: implementing
tags: [refactor, infra]
parent: trim-unused-packaged-host-composition-seams
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Make the MCP Lifecycle Participant the Sole Observation Surface

## Value

**Priority:** High
**Risk:** Low
**Source lens:** elimination / dead weight / confused ownership

Delete the internal alternate MCP projection/observation API and its one-function helper module. Production reload already observes through `McpLifecycleParticipant`; the duplicate path exists only to support a composition test convenience call.

## Files

- `src/composition/create-mcp-runtime.ts`
- `src/composition/mcp-runtime-state.ts` (delete)
- `test/composition/create-mcp-runtime.test.ts`

## Current State

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
  // Re-probes capabilities and observes through a second composition route.
}
```

`projectRuntimeSelectionToMcpState` has one source importer. `.project()` and `.observe()` have no production caller; the complete reload path calls `mcp.participant.observe(...)` directly.

## Target State

```ts
export type ComposedMcpRuntime = Readonly<{
  participant: McpLifecycleParticipant;
  reconcileAll(/* ... */): Promise<readonly McpLifecycleReconcileResult[]>;
  close(): Promise<void>;
}>;

return Object.freeze({ participant, reconcileAll, close });
```

Delete `mcp-runtime-state.ts`. Retain the no-runtime composition test and route its same `none` state through `reconcileAll()` and `participant.observe()` using the existing projection contract.

## Implementation Notes

- Remove only the no-caller methods, their imports, and the helper module.
- Keep `owned`, source mutation tracking, cleanup, launch values, revision leases, and participant construction unchanged.
- Do not change capability evaluation, MCP state semantics, observation mapping, or ambiguity handling.
- Do not delete the behavior test; make it exercise the canonical participant API.

## Acceptance Criteria

- [ ] `McpLifecycleParticipant` is the sole production observation authority.
- [ ] No executable reference to `projectRuntimeSelectionToMcpState`, `mcp-runtime-state.ts`, `ComposedMcpRuntime.project`, or `ComposedMcpRuntime.observe` remains.
- [ ] The no-runtime/no-MCP composition test still proves exact `none`/inactive reconciliation and ready observation without launch effects.
- [ ] MCP composition/lifecycle/launch/lease and complete-reload focused tests pass.
- [ ] Typecheck and dependency boundaries pass.

## Risk and Rollback

Risk is low because the removed surface is internal, unexported from package entry points, and has no production caller. Revert this story's commit to restore it; no public contract or persisted evidence changes.
