---
id: centralize-packaged-composition-cleanup-step-1
kind: story
stage: implementing
tags: [refactor, infra]
parent: centralize-packaged-composition-cleanup
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Extract Sequential Aggregate Cleanup

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** missing abstraction / duplication / code economy

Four packaged composition cleanup paths independently perform the same serial, attempt-all, ordered-error aggregation. Give that behavior one private helper and delete the repeated local error arrays and `try`/`catch` loops without moving resource ownership.

## Files

- `src/composition/sequential-cleanup.ts` (new)
- `src/composition/create-mcp-runtime.ts`
- `src/composition/create-skill-hook-runtime.ts`
- `src/composition/create-packaged-plugin-host.ts`

## Current State

```ts
const errors: unknown[] = [];
for (const dispose of disposers) {
  try { await dispose(); } catch (error) { errors.push(error); }
}
if (errors.length > 0) throw new AggregateError(errors, message);
```

This cleanup-only contract appears four times across MCP close, skill/hook close, packaged runtime close, and packaged application close.

## Target State

```ts
export async function disposeSequentially(
  disposers: Iterable<() => void | Promise<void>>,
  message: string,
): Promise<void> {
  const errors: unknown[] = [];
  for (const dispose of disposers) {
    try { await dispose(); } catch (error) { errors.push(error); }
  }
  if (errors.length > 0) throw new AggregateError(errors, message);
}
```

Callers prepare their current ordered disposer sequence and retain responsibility for quiescing, collection/reference detachment, abort signals, close-promise coalescing, and resource-specific mutation.

## Implementation Notes

- Preserve strict serial order and attempt every disposer after rejection.
- Preserve exact error objects, encounter order, and all four existing aggregate messages.
- Preserve MCP reverse source cleanup before provider drains.
- Preserve subagent registration, coordinator, then session-lease cleanup.
- Preserve packaged runtime order and reverse application acquisition order.
- Keep helper private to composition and absent from package entry points.
- Do not route startup primary-error cleanup or infrastructure recovery cleanup through this helper; their ownership/error semantics differ.
- Do not change tests except where a focused assertion is genuinely required to protect unchanged cleanup behavior.

## Acceptance Criteria

- [ ] Four cleanup-only copies use one private `disposeSequentially` implementation.
- [ ] Caller code is net smaller and no new public concept is introduced.
- [ ] Cleanup order, attempted work, rejection identity/order, messages, and idempotence are unchanged.
- [ ] Startup/recovery error semantics and all public/persisted contracts are untouched.
- [ ] Focused composition/disposal tests, typecheck, and dependency boundaries pass.

## Risk and Rollback

Risk is low because the helper names an already-identical internal algorithm and callers retain all ownership. The main implementation risk is accidentally changing order or detaching a collection too early; focused disposal verification must compare those facts. Revert the implementation commit to restore the inline loops; no migration or compatibility path is needed.
