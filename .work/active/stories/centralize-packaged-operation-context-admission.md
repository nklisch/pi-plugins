---
id: centralize-packaged-operation-context-admission
kind: story
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

# Centralize Packaged Operation-Context Admission

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** missing abstraction / confused ownership

Make one private wrapper own the packaged operation-context admission check. The packaged composition currently repeats the exact same guard and error construction across all five operation methods, making a boundary guarantee easy to omit when the service grows.

## Files

- `src/composition/create-packaged-plugin-host.ts`

## Current State

At `src/composition/create-packaged-plugin-host.ts:467-488`, `preview`, `apply`, `run`, `status`, and `cancel` each repeat this boundary:

```ts
if (operationContexts.getStore() === undefined) {
  throw new PackagedPluginHostError(
    PackagedPluginHostErrorCode.reloadContextUnavailable,
    "native operation requires a Pi operation context",
  );
}
return operations.application.<method>(...args);
```

The five copies enforce one composition-level policy but distribute its ownership across every method declaration.

## Target State

Define one local, generic `requireOperationContext` wrapper beside the packaged application construction, then apply it explicitly to each operation method:

```ts
const requireOperationContext = <Args extends unknown[], Result>(
  operation: (...args: Args) => Result,
) => (...args: Args): Result => {
  if (operationContexts.getStore() === undefined) {
    throw new PackagedPluginHostError(
      PackagedPluginHostErrorCode.reloadContextUnavailable,
      "native operation requires a Pi operation context",
    );
  }
  return operation(...args);
};

const operationApplication = Object.freeze({
  preview: requireOperationContext(operations.application.preview),
  apply: requireOperationContext(operations.application.apply),
  run: requireOperationContext(operations.application.run),
  status: requireOperationContext(operations.application.status),
  cancel: requireOperationContext(operations.application.cancel),
});
```

## Implementation Notes

- Keep the wrapper private to packaged composition; do not add a public contract, proxy, decorator module, or generic admission framework.
- Preserve synchronous rejection before any operation method is entered and preserve the exact error code and message.
- Keep the five methods explicit so the public operation surface remains visible and TypeScript checks every member.
- Do not alter `runWithPiOperationContext`, async-local storage ownership, reload behavior, operation service semantics, or trusted-install admission.
- Do not modify tests; the existing packaged startup/recovery integration assertion already protects this boundary, while typecheck protects all wrapped signatures.

## Acceptance Criteria

- [ ] One private function owns the operation-context lookup and `PI_RELOAD_CONTEXT_UNAVAILABLE` construction.
- [ ] `preview`, `apply`, `run`, `status`, and `cancel` all remain synchronously guarded before delegation.
- [ ] The five duplicated guard blocks are removed with a net reduction in `create-packaged-plugin-host.ts`.
- [ ] The packaged host startup/recovery integration test passes unchanged.
- [ ] Typecheck and dependency boundaries pass.

## Risk and Rollback

Risk is low: this is a one-file, private composition refactor with no schema, state, lifecycle, project-sync, update-policy, or public API change. Generic inference must preserve each method's exact parameter and return types; typecheck is the primary proof. Revert the implementation commit to restore the five inline guards.

## Implementation notes

- Execution capability: GPT-5.6 Sol, direct inline implementation; one private composition boundary and one explicit work item made delegation unnecessary, and the caller prohibited nested agents.
- Review weight: standard (project default); standalone-story policy uses one bounded inline pass regardless of weight.
- Files changed: `src/composition/create-packaged-plugin-host.ts` (11 insertions, 20 deletions; net 9 lines deleted).
- Tests added/removed: none; the unchanged packaged startup/recovery integration assertion covers synchronous rejection, while typecheck verifies all five inferred signatures.
- Simplification: consolidated five duplicated AsyncLocalStorage admission checks and identical error construction into one private generic wrapper while keeping the five operation members explicit.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification

- `npm run typecheck` — passed.
- `npx vitest run test/integration/packaged-host-startup-recovery.test.ts` — passed (1 test).
- `npx vitest run test/integration/generation-locking.test.ts` — passed (4 tests) after one unrelated full-suite run timed out in that test under concurrent load.
- `npm test` — passed on the full rerun: typecheck, dependency boundaries, 260 test files / 1,287 tests, package build, compiled package imports, and isolated packed Pi extension startup.
