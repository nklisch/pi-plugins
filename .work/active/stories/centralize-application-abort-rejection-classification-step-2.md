---
id: centralize-application-abort-rejection-classification-step-2
kind: story
stage: done
tags: [refactor, infra]
parent: centralize-application-abort-rejection-classification
depends_on: [centralize-application-abort-rejection-classification-step-1]
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Migrate Configuration and MCP Launch Abort Classification

## Value and Source Lens

**High value, low risk — missing abstraction / code smell.** Complete consolidation at the denser configuration, credential-cleanup, MCP launch-authority, and launch-value callback boundaries, deleting the remaining four exact copies without changing their boundary-specific failure policy.

## Files

- `src/application/configuration-resolver.ts`
- `src/application/configuration-service.ts`
- `src/application/mcp-launch-context.ts`
- `src/runtime/mcp/launch-value-provider.ts`

## Current State

Each module repeats:

```ts
function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}
```

The surrounding catch blocks separately own credential cleanup, authority/configuration errors, environment failures, lease disposal, and signal-reason precedence.

## Target State

```ts
// Application consumers
import { isAbortRejection } from "./abort-rejection.js";

// Runtime MCP consumer
import { isAbortRejection } from "../../application/abort-rejection.js";
```

Only the predicate definition disappears locally. Every surrounding branch remains in place and in the same order.

## Implementation Notes

- Depend on step 1's helper and migrate all four remaining exact definitions.
- Preserve `signal.aborted` checks and exact `signal.reason` rethrows.
- Preserve configuration cleanup evidence, secret ownership, MCP authority/configuration error mapping, environment error mapping, and plaintext lease disposal.
- Do not merge this helper with `classifyMcpLaunchFailure`; that runtime classifier intentionally recognizes additional timeout and cancellation codes.
- Do not modify launch/projection review hardening, template/sensitive-field logic, or public exports.

## Acceptance Criteria

- [ ] Exact repository search finds only the shared `isAbortRejection` definition and imports.
- [ ] Configuration resolver/service focused tests pass, including abort and cleanup paths.
- [ ] MCP launch-context and launch-value-provider focused tests pass, including abort-shaped errors and disposal.
- [ ] `npm run typecheck`, `npm run boundaries`, and `npm test` pass.
- [ ] Public exports, error codes, serialized diagnostics, callback ordering, and recognized rejection shapes are unchanged.

## Risk and Rollback

**Risk: Low.** The main risk is moving a check across a cleanup or signal-precedence branch; implementation must change imports and delete local bodies only. Roll back this story by restoring its four exact private functions. Step 1 and its consumers remain independently valid.

## Implementation evidence

- Execution capability: inline GPT-5.6 owner, continuing the cohesive step-1 context so import-only migrations could be checked against every existing catch order.
- Migrated configuration resolver/service, MCP launch context, and MCP launch-value provider to the shared helper; only imports and the four local predicate bodies changed.
- Added one MCP launch-value call-site test proving a code-only abort-shaped rejection is rethrown by exact identity while the signal remains active.
- Focused verification: 4 files, 58 tests passed; `npm run typecheck` passed; `npm run boundaries` passed (236 modules, 1425 dependencies, 0 violations); `git diff --check` passed.
- Full verification: `npm test` passed with 174 test files and 956 tests, no type errors, 0 dependency violations, and the compiled-package smoke test passing with 508 public exports.
- Scope discrepancy: repository reality also contains a private predicate in `src/composition/create-project-root-authority.ts`; the caller limited this feature to the designed eight application/MCP launch-value copies, so that unrelated composition/MCP lifecycle path remains untouched. The designed application and launch-value scope now has only the shared definition and intended imports.
- Review: not applicable — child story checkpoint.
