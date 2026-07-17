---
id: centralize-application-abort-rejection-classification-step-1
kind: story
stage: done
tags: [refactor, infra]
parent: centralize-application-abort-rejection-classification
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Establish the Shared Application Abort-Rejection Helper

## Value and Source Lens

**High value, low risk — missing abstraction / code smell.** Establish one package-internal owner for an exact predicate repeated across compatibility, trust, MCP capability, and subagent capability services, deleting four local copies while retaining the same error mapping.

## Files

- `src/application/abort-rejection.ts`
- `src/application/compatibility-service.ts`
- `src/application/mcp-runtime-capability-probe.ts`
- `src/application/subagent-lifecycle-capability-probe.ts`
- `src/application/trust-service.ts`

## Current State

```ts
function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}
```

Each listed module owns this same private function.

## Target State

```ts
// src/application/abort-rejection.ts
export function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}
```

The four consumers import this helper. It is not re-exported from `src/index.ts`.

## Implementation Notes

- Move the exact decision logic; do not broaden it to messages, `ERR_ABORTED`, timeout codes, or `signal.aborted`.
- Preserve all caller-side signal checks, catch ordering, adapter wrapping, and safe-cause behavior.
- Keep the helper portable and dependency-free.
- Retain existing interface-level tests; do not add implementation-bound tests solely for the helper.

## Acceptance Criteria

- [ ] One shared helper replaces the four private definitions named above.
- [ ] Compatibility, trust, MCP capability, and subagent capability focused tests pass unchanged.
- [ ] `npm run typecheck` and `npm run boundaries` pass.
- [ ] `src/index.ts` and compiled package exports are unchanged.

## Risk and Rollback

**Risk: Low.** Import mistakes are compile-time failures; semantic risk is limited to accidentally changing the two recognized fields or catch ordering. Roll back by restoring the exact private bodies and deleting the helper. No state, schema, migration, package adapter, or runtime lifecycle effect exists.

## Implementation evidence

- Execution capability: inline GPT-5.6 owner; the bounded, behavior-preserving extraction benefits from one context across helper, consumers, and tests.
- Added the dependency-free `src/application/abort-rejection.ts` policy helper and migrated compatibility, trust, MCP capability, and subagent capability consumers without moving any catch branches.
- Updated the compatibility-service dependency boundary to permit only this shared application policy in addition to its existing probe port.
- Added one focused helper policy test and one trust call-site identity test for the previously uncovered `code === "ABORT_ERR"` shape; existing call-site matrices were retained rather than duplicated.
- Verification: 5 focused files, 26 tests passed; `npm run typecheck` passed; `npm run boundaries` passed (236 modules, 1421 dependencies, 0 violations); `git diff --check` passed.
- Review: not applicable — child story checkpoint.
