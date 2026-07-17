---
id: centralize-application-abort-rejection-classification
kind: feature
stage: implementing
tags: [refactor, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Centralize Application Abort-Rejection Classification

## Brief

Replace eight byte-equivalent private `isAbortRejection` implementations with one package-internal application helper. The duplicates now span compatibility, configuration, trust, MCP capability/launch, subagent capability, and MCP launch-value boundaries. They all recognize exactly the same two adapter rejection shapes: `name === "AbortError"` or `code === "ABORT_ERR"`.

This is behavior-preserving. It must not broaden cancellation recognition, inspect error messages, convert adapter failures into cancellation, alter signal-precedence checks, change which native reason is rethrown, or modify any public package export.

## Refactor Overview

Recent MCP launch-context and subagent lifecycle work copied an already repeated application-boundary predicate into three more modules. There are now seven identical definitions under `src/application/` and an eighth identical definition in `src/runtime/mcp/launch-value-provider.ts`. The repetition has crossed the concrete threshold for one source of truth and makes future cancellation fixes likely to drift by boundary.

The shared helper belongs in `src/application/abort-rejection.ts`: it is portable application error-mapping policy, has no Node or adapter dependency, and can be consumed inward by application services and outward by the MCP runtime adapter. It remains package-internal. The broader MCP failure classifier in `src/runtime/mcp/launch-error.ts` is intentionally excluded because it also recognizes `ERR_ABORTED`, maps timeouts, and returns domain error codes rather than answering this narrower predicate.

**Discovery posture**: direct-read only. The cadence covered project rules/conventions and foundation documents, the code and tests added from `c72787a` through `409748d`, the current MCP/subagent reference skills, and exact repository-wide identifier scans. The caller prohibited nested agents, and this bounded duplication needed no exploratory fanout or design advisory.

## Refactor Steps

### Step 1: Establish the application helper and migrate adapter-facing services

**Priority**: High
**Risk**: Low
**Source Lens**: missing abstraction / code smell
**Files**: `src/application/abort-rejection.ts`, `src/application/compatibility-service.ts`, `src/application/mcp-runtime-capability-probe.ts`, `src/application/subagent-lifecycle-capability-probe.ts`, `src/application/trust-service.ts`
**Story**: `centralize-application-abort-rejection-classification-step-1`

**Current State**:
```ts
// Repeated privately in each listed service/probe.
function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}
```

**Target State**:
```ts
// src/application/abort-rejection.ts
export function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}

// Each consumer imports that helper and retains its existing catch ordering.
```

**Implementation Notes**:
- Move the exact predicate without changing its accepted shapes or adding `signal.aborted` to it.
- Delete only the four local copies named in this step and add direct relative imports.
- Keep every surrounding `if (signal.aborted) throw signal.reason`, parse failure, adapter wrapping, and cause-redaction branch in the same order.
- Do not export the helper from `src/index.ts`; this is shared implementation policy, not a new public contract.

**Acceptance Criteria**:
- [ ] The helper body is byte-equivalent in decision logic to the removed predicates.
- [ ] Compatibility, trust, MCP capability, and subagent capability behavior and error wrapping are unchanged.
- [ ] Focused compatibility/trust/capability tests, typecheck, and dependency boundaries pass.
- [ ] The package public export allowlist is unchanged.

**Rollback**: Re-inline the exact helper body into these four consumers and remove `src/application/abort-rejection.ts`; there is no state, schema, runtime registration, or migration impact.

---

### Step 2: Migrate callback-scoped configuration and launch consumers

**Priority**: High
**Risk**: Low
**Source Lens**: missing abstraction / code smell
**Files**: `src/application/configuration-resolver.ts`, `src/application/configuration-service.ts`, `src/application/mcp-launch-context.ts`, `src/runtime/mcp/launch-value-provider.ts`
**Story**: `centralize-application-abort-rejection-classification-step-2`

**Current State**:
```ts
// The same predicate is repeated at configuration/credential and MCP launch
// callback boundaries before each module applies its own error mapping.
function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}
```

**Target State**:
```ts
import { isAbortRejection } from "./abort-rejection.js";
// Runtime MCP uses ../../application/abort-rejection.js.
// Existing catch blocks and cleanup/error-mapping branches remain otherwise unchanged.
```

**Implementation Notes**:
- Migrate all four remaining exact copies to the helper created in step 1.
- Preserve each caller's existing precedence between `signal.aborted`, recognized abort-shaped rejections, cleanup failures, `McpLaunchContextError`, and adapter/configuration failure wrapping.
- Do not merge with `classifyMcpLaunchFailure` or alter its broader timeout/`ERR_ABORTED` contract.
- Do not touch MCP template rendering, sensitive-field policy, lease disposal, launch authority comparisons, or projection review hardening.

**Acceptance Criteria**:
- [ ] Repository-wide exact search finds one `isAbortRejection` definition and the intended imports; no exact private copy remains in application or MCP launch-value code.
- [ ] Configuration cleanup/credential ownership behavior and MCP launch cancellation/disposal behavior are byte-for-byte equivalent at their public boundaries.
- [ ] Focused configuration, MCP launch-context, and MCP launch-value-provider tests pass, including abort-shaped rejection and cleanup paths.
- [ ] `npm run typecheck`, `npm run boundaries`, and the full test suite pass.
- [ ] No package export, error code, diagnostic payload, schema, or observable callback order changes.

**Rollback**: Re-inline the helper body in these four modules. Step 1 remains independently valid, so rollback does not require removing the shared helper or its first consumers.

## Implementation Order

1. `centralize-application-abort-rejection-classification-step-1`
2. `centralize-application-abort-rejection-classification-step-2` (depends on step 1)

## Scope Exclusions

- `src/runtime/mcp/launch-error.ts`: broader cancellation/timeout classification is intentional behavior, not duplicate policy.
- `src/runtime/subagents/subagent-hook-coordinator.ts`: signal reasons and disposed-runtime abort decisions are lifecycle behavior, not adapter-rejection classification.
- Canonical JSON equality variants: key-order and schema-boundary semantics differ; consolidating them could change authority checks.
- MCP compatibility-plan/launch-template record traversal: only two copies and separating acceptance policy from projection remains clearer than a new shared internal API.
- `isSensitiveQueryName`: its semantic query-boundary name is intentional review hardening even though it delegates to the shared sensitive-field classifier.

## Dependency and Cycle Check

Both proposed child IDs were absent. Before writing dependencies, `.work/bin/work-view --scope all --blocking <child-id>` returned no dependents for either ID. Step 1 has no outgoing dependency; step 2 depends only on step 1, so the chain is acyclic.

## Foundation Impact

None. This consolidates an internal predicate without changing the ports-and-adapters boundary, runtime capability semantics, MCP/subagent contracts, trust behavior, or any assertion in `docs/VISION.md`, `docs/SPEC.md`, or `docs/ARCHITECTURE.md`.
