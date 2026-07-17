---
id: centralize-packaged-composition-cleanup
kind: feature
stage: review
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

# Centralize Packaged Composition Cleanup

## Brief

Replace four copies of the same sequential best-effort cleanup loop in packaged runtime composition with one private composition helper. Preserve cleanup order, attempt-all behavior, original error objects and ordering, aggregate messages, idempotent close promises, and every lifecycle/runtime outcome.

## Discovery Scope

Direct-read discovery covered the four packaged-composition stories remaining in this cadence — `8806693`, `d25d35b`, `6300419`, and `9352f57` — plus marketplace registration contracts/state through `f53cc37`. Later marketplace implementation through current `HEAD` was read only to reject stale or overlapping findings. Foundation documents, project rules, conventions, prior refactor history, active/backlog overlap, source references, and package-public exports were also checked. No nested agents or peer mechanisms were used.

The scan found one pure-refactor candidate and no behavior-changing candidate eligible under the requested constraints. Manual dependency review found no existing reference to this new feature or story; the one child points only to this feature and has no `depends_on`, so the graph is acyclic.

## Refactor Overview

Four cleanup owners independently implement the same contract:

1. invoke asynchronous disposers serially in ownership order;
2. continue after each rejection;
3. retain every rejection in encounter order; and
4. throw one caller-labelled `AggregateError` after every disposer has run.

The copies live in `create-mcp-runtime.ts`, `create-skill-hook-runtime.ts`, and twice in `create-packaged-plugin-host.ts`. A private `src/composition/sequential-cleanup.ts` helper gives that repeated contract one name and removes the local error arrays and `try`/`catch` loops. The helper remains deliberately narrow: it does not own resource registration, reversal, quiescing, abort signals, map/set mutation, close-promise coalescing, or startup-failure wrapping.

## Refactor Steps

### Step 1: Extract sequential aggregate cleanup

**Priority**: Medium
**Risk**: Low
**Source Lens**: missing abstraction / duplication / code economy
**Files**: `src/composition/sequential-cleanup.ts` (new), `src/composition/create-mcp-runtime.ts`, `src/composition/create-skill-hook-runtime.ts`, `src/composition/create-packaged-plugin-host.ts`
**Story**: `centralize-packaged-composition-cleanup-step-1`

**Current State**:

```ts
const errors: unknown[] = [];
for (const dispose of disposers) {
  try { await dispose(); } catch (error) { errors.push(error); }
}
if (errors.length > 0) throw new AggregateError(errors, message);
```

That shape occurs four times in the packaged composition path. The MCP and skill/hook copies spell the same contract as two explicit resource loops; the host runtime and host application copies use disposer arrays.

**Target State**:

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

Each owner continues to prepare its exact ordered disposer sequence and passes its existing message to `disposeSequentially`. Owners clear or detach internal arrays, sets, and lease references at the same ownership point needed to remain idempotent if cleanup rejects.

**Implementation Notes**:

- Keep serial execution. Do not replace the loops with `Promise.all`, `Promise.allSettled`, or concurrent cleanup.
- Keep the existing order exactly: MCP sources in reverse ownership order before lease-provider drains; subagent registration before coordinator before session lease; MCP before skill/hook before selections; application acquisitions in reverse order.
- Preserve each existing aggregate message verbatim and preserve rejection identity/order in `AggregateError.errors`.
- Keep `closePromise`, `closeRuntimeResources`, and `applicationClosePromise` at their current owners; the helper performs one attempt sequence and does not provide idempotence.
- Capture and detach owner-held collections/references without changing externally observable cleanup. In particular, all disposers must still run when an earlier one rejects.
- Leave packaged-host startup failure cleanup inline. It combines a primary startup error with cleanup errors under different wrapping semantics and is not the repeated cleanup-only contract.
- Leave `createNodeRecoveryAdapters.close()` local. Pulling an infrastructure adapter through a composition-owned utility would confuse layer ownership for one small copy.
- Do not export the helper from `src/index.ts` or `src/pi/index.ts`; it is private composition structure.

**Acceptance Criteria**:

- [x] Exactly one private composition helper implements serial attempt-all aggregation for the four cleanup-only paths.
- [x] The four callers contain no local `const errors: unknown[] = []` cleanup loop.
- [x] Cleanup order, attempted disposer count, error identity/order, and aggregate messages remain unchanged.
- [x] Repeated close/dispose remains coalesced and idempotent at each current owner.
- [x] Startup primary-error wrapping and recovery-adapter cleanup remain unchanged.
- [x] No public export, package contract, state/schema, path, runtime selection, marketplace behavior, or lifecycle guarantee changes.
- [x] Focused MCP composition, skill/hook composition, packaged-host startup/recovery/disposal, typecheck, and dependency-boundary verification pass.

**Rollback**: Revert the implementation commit to inline the four loops again. No public or persisted contract changes.

## Implementation Order

1. `centralize-packaged-composition-cleanup-step-1`

## Candidate Disposition

- **Accepted** — Four identical sequential attempt-all aggregation loops in packaged composition. This meets the duplication-3+ threshold, gives an existing behavior a narrow name, and should delete more caller code than it adds.
- **Rejected** — The marketplace cache-label registry is currently unused, but it is now package-public and later marketplace services consume the cache contract. Removing or repurposing it would enter public-contract/marketplace-review territory.
- **Rejected** — Marketplace identifier schema/derivation repetition is explicit domain vocabulary; generic branded-ID factories would add type machinery for little or no net deletion.
- **Rejected** — State registration shapes and v2/v3 aliases are migration/schema territory explicitly outside this cadence.
- **Rejected** — Startup primary-plus-cleanup wrapping, recovery cleanup, atomic publication, security/correctness policy, and test cleanup have distinct semantics or excluded ownership.
- **Rejected** — Splitting `createPackagedPluginHost` would be a broad factory rewrite rather than a concrete deletion.
- **Rejected** — Later registration, catalog, refresh, adoption, and packaged marketplace composition work is native-feature/marketplace review territory and was read only to avoid overlap.

## Exclusions

- No source implementation in this design pass.
- No test deletion or test-only cleanup.
- No state/schema migration, public-contract change, atomic-publication change, lifecycle-policy change, correctness/security fix, or marketplace review finding.
- No broad composition-factory split, unrelated item change, release, push, or `.work/bin/work-view` change.

## Verification Plan

1. Reconfirm the four exact cleanup-only copies and the intentionally excluded startup/recovery variants.
2. Verify the helper is not package-exported and introduces no forbidden dependency edge.
3. Run focused MCP composition, skill/hook composition, complete reload, packaged startup/recovery, and packaged disposal tests.
4. Run typecheck and dependency boundaries; run the full suite after focused checks are green.

## Integrated implementation notes

- Execution capability: inline, direct-read only; the child story was implemented as one cohesive low-risk refactor without nested agents.
- Review weight: standard from `.work/CONVENTIONS.md`; the feature is intentionally left at `stage: review` for the feature-level review boundary.
- Implementation commit: `1a791f7` (`implement: centralize-packaged-composition-cleanup-step-1`). The feature transition is committed separately as `implement: centralize-packaged-composition-cleanup`.
- Files changed: one new private helper, three composition callers, one focused helper test, this feature record, and the child story record. No package entry point or marketplace file changed.
- Totals: production source changed by 45 insertions and 48 deletions (net 3-line deletion); caller files alone changed by 38 insertions and 48 deletions (net 10-line deletion); focused helper coverage added 43 test lines.
- Semantics retained: cleanup remains strictly serial and attempt-all; exact error objects, encounter order, and all four messages are preserved; owner-held collections/references detach at their prior points; all existing close promises continue to coalesce repeated calls.
- Exclusions retained: packaged startup primary-plus-cleanup wrapping and recovery-adapter cleanup remain inline and unchanged; no public exports, marketplace behavior, state/schema, recovery, reload, or lifecycle policy changed.
- Verification: focused composition/reload/startup/recovery/disposal coverage passed (7 files, 14 tests); typecheck passed; dependency boundaries passed over 285 modules and 1,855 dependencies; full `npm test` passed 214 test files and 1,068 tests with no type errors, followed by build, 562-export root import, 3-export Pi import, and isolated packed-consumer startup.
- Discrepancies from design: none.
- Adjacent issues parked: none.
