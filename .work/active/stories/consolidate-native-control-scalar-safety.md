---
id: consolidate-native-control-scalar-safety
kind: story
stage: done
tags: [refactor, compatibility]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Consolidate Native Control Scalar Safety

## Brief

Replace the three private UTF-16/control-character walks in the native control lexer, direct-argv parser, and structural redaction projector with one application-owned predicate. Preserve each caller's current policy exactly: text lexing permits horizontal tab as a separator, while direct argv and projected output reject it; only lexer/parser token inputs retain the 8,192-code-unit bound.

## Discovery evidence

- **Dispatch**: direct-read only; nested agents and peer mechanisms were explicitly excluded.
- **Source lens**: missing abstraction / duplication / code economy.
- `src/application/native-control-lexer.ts:18-33` walks UTF-16 to reject C0/C1 controls, bidi overrides/isolates, and lone surrogates, with a horizontal-tab exception.
- `src/application/native-control-parser.ts:47-59` repeats the same walk for direct argv, without the tab exception and with the 8,192-code-unit bound.
- `src/application/native-control-redaction.ts:10-22` repeats the parser's scalar walk before replacing unsafe projected strings.
- This is the only accepted finding from the bounded cadence scan: one traversal can replace three implementations with net source deletion and one explicit policy parameter. The existing broader display sanitizer is intentionally not reused because its combining-mark, zero-width, and escaping behavior would change the control contract.

## Refactor step

### Centralize the scalar traversal

**Priority**: High  
**Risk**: Low  
**Source Lens**: missing abstraction / duplicated logic  
**Files**: `src/application/native-control-scalar.ts`, `src/application/native-control-lexer.ts`, `src/application/native-control-parser.ts`, `src/application/native-control-redaction.ts`

**Current State**:

```ts
// native-control-lexer.ts
function invalidScalar(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    // C0/C1, bidi, and surrogate-pair checks; horizontal tab is allowed.
  }
  return false;
}

// native-control-parser.ts
function scalarIsValid(value: string): boolean {
  if (value.length > 8192) return false;
  for (let index = 0; index < value.length; index += 1) {
    // The same checks, with horizontal tab rejected.
  }
  return true;
}

// native-control-redaction.ts
function hasUnsafeScalar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    // The parser's checks are repeated a third time.
  }
  return false;
}
```

**Target State**:

```ts
// native-control-scalar.ts — private application utility, not a root export
export function containsUnsafeNativeControlScalar(
  value: string,
  options: Readonly<{ allowHorizontalTab?: boolean }> = {},
): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const allowedTab = options.allowHorizontalTab === true && code === 0x09;
    if ((!allowedTab && code <= 0x1f) ||
        (code >= 0x7f && code <= 0x9f) ||
        (code >= 0x202a && code <= 0x202e) ||
        (code >= 0x2066 && code <= 0x2069)) return true;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

// lexer keeps its length and horizontal-tab policy.
return value.length <= 8192 &&
  !containsUnsafeNativeControlScalar(value, { allowHorizontalTab: true });

// parser keeps its direct-argv length and no-control policy.
return value.length <= 8192 && !containsUnsafeNativeControlScalar(value);

// redaction keeps its unbounded projection policy and replaces unsafe strings.
containsUnsafeNativeControlScalar(value)
```

**Implementation Notes**:

- Keep the helper internal to `src/application`; do not add it to `src/index.ts`, compiled export allowlists, registry metadata, or public grammar contracts.
- Preserve the lexer's horizontal-tab exception only for raw text tokenization. Parsed argv elements and projected JSON strings continue to reject tab.
- Preserve every current code-unit range and surrogate-pair rule exactly. Do not broaden to the inspection display sanitizer or change escaping/redaction behavior.
- Remove all three local traversal implementations. The result must contain one traversal implementation and fewer total source lines across the four files.
- Do not add, remove, or reorganize tests; existing focused contract tests are the proportionate verification.

**Acceptance Criteria**:

- [x] Exactly one native-control UTF-16/control traversal remains across lexer, parser, and redaction code, with net source-line deletion.
- [x] Text lexing still accepts ASCII space/tab separators and rejects the same C0/C1, bidi, and lone-surrogate inputs.
- [x] Direct argv still rejects tab, controls, bidi markers, lone surrogates, and values longer than 8,192 code units.
- [x] Structural projection still replaces the same unsafe strings while retaining its current JSON-safety and redaction behavior.
- [x] No command ID, path, alias, option, request/response schema, exit, public export, or packaged allowlist changes.
- [x] `npx vitest run test/application/native-control-lexer.test.ts test/application/native-control-parser.test.ts test/application/native-control-redaction.test.ts` passes unchanged.
- [x] `npm run typecheck` passes.

**Rollback**: Revert the implementation commit; the three local predicates are independent and can be restored without data, schema, migration, or public API consequences.

## Implementation notes

- Execution capability: direct-read inline implementation; the four-file change was cohesive and the caller excluded nested agents.
- Review weight: standard from `.work/CONVENTIONS.md`; as a standalone story, review uses the bounded inline lane without an independent reviewer.
- Files changed: `src/application/native-control-scalar.ts`, `src/application/native-control-lexer.ts`, `src/application/native-control-parser.ts`, `src/application/native-control-redaction.ts`.
- Tests added/removed: none; the unchanged focused contract tests already cover the stable lexer, parser, and redaction interfaces.
- Simplification: replaced three duplicate UTF-16/control traversals with one application-private helper; the four-file total fell from 526 to 509 source lines (17 net lines deleted).
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence

- Focused contracts: `npx vitest run test/application/native-control-lexer.test.ts test/application/native-control-parser.test.ts test/application/native-control-redaction.test.ts` — 17 passed, 0 failed.
- Typecheck: `npm run typecheck` — passed.
- Full suite: `npm test` — 305 test files and 1,458 tests passed; dependency boundaries, compiled package imports (846 exports), compiled Pi package imports (3 exports), and isolated packed Pi extension startup passed.
- The first full-suite attempt timed out in the unrelated generation-locking contention test; that test passed in isolation (4 tests), and the unchanged full suite passed on retry.
- Acceptance walk: one traversal remains; lexer and exported scalar validation preserve tab allowance and length/error ordering; direct argv preserves its no-tab 8,192-code-unit policy; projection remains unbounded and preserves replacement/error/redaction behavior; no grammar, public export, compiled allowlist, manager, or Pi contract changed.

## Excluded findings

- Public-but-currently-unused `validateNativeControlScalar`, `inputRequiredIssues`, and assertion helpers were not proposed for deletion because removing root exports would change the observable package contract.
- Update-count callback repetition and repeated optional composition spreads were rejected as too small to justify a new abstraction.
- Update authority/revalidation and automatic-lifecycle branches were excluded because changing them belongs to correctness/security review, not a conservative refactor.
- Parser splitting, test cleanup, control grammar changes, manager/Pi integration, and broader Unicode policy consolidation are out of scope.

## Review (2026-07-17)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none
**Rejected**: none

**Notes**: Bounded inline standalone-story review at standard project weight; no independent, fresh-context, or cross-model reviewer ran, per standalone-story policy and the caller's no-nested-agents constraint. The review inspected implementation commit `3152df0` and confirmed that the helper preserves the exact C0/C1, bidi, and surrogate-pair traversal; only lexer text and the existing exported scalar validator pass the horizontal-tab exception; direct argv and structural projection retain strict tab rejection; length checks and their diagnostic ordering remain at their original callers; projection remains unbounded; and the helper is absent from `src/index.ts` and package exports. One traversal remains and the four production files total 509 lines versus 526 before the refactor. Focused contracts, typecheck, dependency boundaries, all 1,458 tests, package builds/imports, and packed Pi startup passed. Additional compiled policy probes covered tab handling at all three call sites, valid and lone surrogate cases, direct-argv length diagnostics, and unbounded projection. No behavior, security, contract, grammar, redaction, manager, or Pi integration issue was found.
