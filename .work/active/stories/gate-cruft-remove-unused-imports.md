---
id: gate-cruft-remove-unused-imports
kind: story
stage: done
tags: [cleanup]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-18
---

# Remove compiler-proven unused imports

## Confidence
High

`tsc --noUnusedLocals --noUnusedParameters` reports 109 unused import specifiers across 58 production files. Remove only compiler-proven unused imports; preserve validation calls and side effects. Rerun strict unused diagnostics and full verification.

## Implementation

Removed exactly the 109 import specifiers proven unused by the initial source diagnostic across 58 production files. Imports whose last value binding was removed remain as side-effect-only imports, preserving module execution under `verbatimModuleSyntax`; no validation call or public export changed.

Execution stayed inline because this release-bound cleanup shares one narrow compiler-evidence boundary with the other selected cruft stories. No nested, fresh-context, or cross-model agent was used.

## Verification

- Final source no-unused diagnostic: 0 import diagnostics. Its 23 remaining non-import findings belong to the five unbound decision proposals and were not changed.
- `npm run typecheck` and `npm run boundaries`: passed.
- Focused tests for the touched declaration surfaces: 67 passed.
- Full `npm test`: 332 files / 1,649 tests passed; build, compiled imports, and isolated packed consumer passed.
- Infrastructure E2E: 1 file / 3 tests passed.
- Production E2E: 5 files / 12 tests passed.

## Bounded inline review

Reviewed the import-only diff against the compiler diagnostics. Every removal corresponds to a reported unused binding; value-import module execution is retained where removing the final binding would otherwise change side effects. No material finding remained.
