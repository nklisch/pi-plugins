---
id: derive-native-lifecycle-session-state-from-result
kind: story
stage: implementing
tags: [refactor]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Derive Native Lifecycle Session State from Its Result

## Value

**Priority:** Medium  
**Risk:** Low  
**Source lens:** elimination / dead seam / confused ownership

Remove the redundant terminal-state argument from the private native lifecycle session registry. Every one of the five callers computes that argument with an identity helper (`stateFor(result)`) even though `finish` already receives the same result and terminal session state is exactly its `kind`. Letting the registry derive the state removes an unnecessary helper and makes it impossible for an internal caller to store a result under a mismatched terminal state.

## Files

- `src/application/native-lifecycle-operation-session.ts`
- `src/application/native-lifecycle-operation-service.ts`

## Current State

`src/application/native-lifecycle-operation-service.ts` owns an identity conversion:

```ts
function stateFor(result: NativeLifecycleOperationResult): NativeLifecycleOperationSessionState {
  return result.kind;
}
```

All five terminal settlements pass both forms of the same fact:

```ts
sessions.finish(entry, stateFor(result), result);
```

`src/application/native-lifecycle-operation-session.ts` then trusts the independently supplied state:

```ts
finish(
  entry: NativeLifecycleOperationSessionEntry,
  state: NativeLifecycleOperationSessionState,
  result: NativeLifecycleOperationResult,
): void {
  entry.state = state;
  entry.result = result;
  // ...
}
```

## Target State

Make the private registry own the invariant and accept only the result:

```ts
finish(
  entry: NativeLifecycleOperationSessionEntry,
  result: NativeLifecycleOperationResult,
): void {
  entry.state = result.kind;
  entry.result = result;
  // ...
}
```

Callers become direct settlements:

```ts
sessions.finish(entry, result);
```

Delete `stateFor` and its now-unused `NativeLifecycleOperationSessionState` type import from the service.

## Implementation Notes

- Keep the change private to the session registry and operation service; do not alter lifecycle result schemas, public exports, session-state vocabulary, or terminal behavior.
- Update all five `sessions.finish` call sites in one pass.
- Do not add a generic state-transition abstraction or touch the separate trusted-install session machinery.
- Do not modify tests: existing native lifecycle operation-service coverage plus typecheck protects settlement behavior and the private signature.
- Discovery used a direct-read pass over the bounded lifecycle/update integration scope; no sub-agent or advisory review was used.

## Acceptance Criteria

- [ ] `finish` derives terminal session state only from `result.kind`.
- [ ] The redundant state parameter and `stateFor` helper are removed.
- [ ] All five terminal settlement call sites pass only the entry and result.
- [ ] Native lifecycle public schemas, result semantics, tests, and update-policy/state-v4 behavior are unchanged.
- [ ] `npm run typecheck` passes.
- [ ] `npm test -- --run test/application/native-lifecycle-operation-service.test.ts` passes unchanged.
- [ ] The source diff is a net deletion.

## Risk and Rollback

Risk is low because the removed argument is currently always `result.kind`, and the registry remains the sole owner of mutable session state. A type error will expose any result kind that is not a valid terminal session state. Revert the implementation commit to restore the explicit parameter and identity helper.
