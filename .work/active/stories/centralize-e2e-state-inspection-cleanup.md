---
id: centralize-e2e-state-inspection-cleanup
kind: story
stage: implementing
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

# Centralize E2E State Inspection During Cleanup

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** elimination / missing abstraction / dead weight

The packed-process E2E harness currently owns two recursive filesystem inventories and two SQLite integrity-check implementations. Sandbox cleanup uses the private copies in `environment.ts`, while tests and artifact inspection use the richer generic implementations in `state-inspector.ts`. Consolidating cleanup on the existing state-inspection seam removes duplicated traversal/database code and an unused residue checker without changing cleanup guarantees, process behavior, platform semantics, or test assertions.

## Files

- `test/e2e/harness/environment.ts`
- `test/e2e/harness/state-inspector.ts`

## Current State

```ts
// environment.ts
async function inventory(root: string): Promise<readonly string[]> {
  // Private recursive lstat/readlink walk.
}

export async function assertSandboxDatabasesHealthy(sandbox: CleanE2ESandbox): Promise<void> {
  const files = await inventory(sandbox.agentDir);
  // Private DatabaseSync + PRAGMA integrity_check loop.
}

export async function cleanupSandbox(sandbox: CleanE2ESandbox): Promise<void> {
  // ...
  try { await assertSandboxDatabasesHealthy(sandbox); } catch (error) { failures.push(error); }
  // ...
}

export async function assertNoForeignResidue(sandbox: CleanE2ESandbox): Promise<void> {
  // Unreferenced second forbidden-value scan over inventory().
}
```

```ts
// state-inspector.ts
export async function fileInventory(root: string): Promise<readonly FileInventoryEntry[]> {
  // Canonical recursive filesystem inventory used throughout E2E tests.
}

export async function assertAllSqliteIntegrity(root: string): Promise<void> {
  // Canonical SQLite discovery and PRAGMA integrity_check implementation.
}

export async function scanForbiddenValues(root: string, additional: readonly string[] = []): Promise<void> {
  // Live forbidden-value scanner used by golden journeys.
}
```

Symbol search at discovery time found `assertSandboxDatabasesHealthy` used only by `cleanupSandbox` and `assertNoForeignResidue` with no caller. `fileInventory`, `assertAllSqliteIntegrity`, and `scanForbiddenValues` are the live reusable state-inspection API.

## Target State

```ts
// environment.ts
import { assertAllSqliteIntegrity } from "./state-inspector.js";

export async function cleanupSandbox(sandbox: CleanE2ESandbox): Promise<void> {
  const failures: unknown[] = [];
  // Existing cleanup callbacks remain unchanged.
  try { await assertAllSqliteIntegrity(sandbox.agentDir); } catch (error) { failures.push(error); }
  // Existing retention/removal and AggregateError behavior remain unchanged.
}
```

`environment.ts` no longer defines its private `inventory`, `assertSandboxDatabasesHealthy`, or unreferenced `assertNoForeignResidue` helpers, and drops their now-unused filesystem/SQLite imports. `state-inspector.ts` remains the single owner of generic filesystem inventory, SQLite integrity inspection, and live forbidden-value scanning.

## Implementation Notes

- Preserve cleanup ordering: registered cleanups run in reverse, then database integrity is checked, then the sandbox is retained or removed, then accumulated failures are thrown.
- Keep `assertAllSqliteIntegrity` behavior and its existing direct infrastructure-test callers unchanged; do not introduce a third wrapper or a new utility module.
- Delete `assertNoForeignResidue` rather than redirecting it: it has no callsite, and `scanForbiddenValues` is the live, broader scanner used by golden journeys.
- The import from `environment.ts` to `state-inspector.ts` is runtime-safe because `state-inspector.ts` imports `CleanE2ESandbox` with `import type`, which is erased. Do not add runtime sandbox construction dependencies to the inspector.
- Do not touch E2E expected failures, golden assertions, PTY/RPC/process behavior, fixed-port/TLS/platform handling, production source, or public package exports.

## Acceptance Criteria

- [ ] `cleanupSandbox` still verifies every `.sqlite` file under `sandbox.agentDir` and aggregates integrity failures with cleanup failures before returning.
- [ ] Exactly one recursive E2E filesystem inventory implementation and one SQLite integrity-check implementation remain.
- [ ] The unreferenced `assertNoForeignResidue` export and obsolete imports are removed; `scanForbiddenValues` remains unchanged and live.
- [ ] `npm run test:e2e:infrastructure` passes without changing its assertions.
- [ ] E2E TypeScript compilation and `npm run typecheck` pass.
- [ ] The implementation is a net deletion and changes no production source or observable product behavior.

## Risk and Rollback

Risk is low: the only live callsite changes from a sandbox-shaped wrapper to the existing generic root-based integrity assertion. The main failure mode is an accidental runtime import cycle or changed cleanup ordering; type compilation and the infrastructure E2E teardown exercise both. Revert the implementation commit to restore the duplicate helpers; no product state or persisted contract is affected.

## Discovery Notes

- Scope: direct-read scan of relevant Pi manager source/review fixes and packed E2E infrastructure/golden journeys changed in `4b044f4..6483375`, verified against the current branch.
- Dispatch: direct-read only, per caller instruction; no nested agents or advisory pass.
- Rejected: repeated manager selected-row/input/render shapes because they are TUI-sensitive; four identical golden-test teardown blocks because extracting them would be test-only helper churn; active xfail/review correctness; reload, security, public API, and platform-semantic paths.
