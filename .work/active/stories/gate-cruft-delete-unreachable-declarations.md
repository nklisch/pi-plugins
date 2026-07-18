---
id: gate-cruft-delete-unreachable-declarations
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

# Delete unreachable private declarations

## Confidence
High

Delete the compiler-proven unreachable private declarations in configuration-service, discovery-plan, inspection-service, compatibility-evaluator, configured-values, installed-state, and command-runner, plus imports made unused. Preserve every reachable validation and public contract.

## Implementation

Deleted exactly nine compiler-proven unreachable declarations: `assertNever`, `ClaimLike`, `pointerField`, `authorityFor`, `authorityManifestPath`, `componentClaim`, `equalJson`, `asJsonValue`, and `chunkStream`. Removed the one import (`PluginManifestPathRegistry`) made unused by that deletion. No reachable validation, exported declaration, or call site changed.

## Verification

- Final source no-unused diagnostic contains none of the nine declarations and no import diagnostics; 23 unrelated non-import findings remain assigned to the five unbound decision proposals.
- `npm run typecheck` and `npm run boundaries`: passed.
- Focused tests for all seven touched modules: 67 passed.
- Full `npm test`: 332 files / 1,649 tests passed, including build and packed-consumer checks.
- Infrastructure E2E: 3 passed; production E2E: 12 passed.

## Bounded inline review

Confirmed each deleted declaration had a compiler unused diagnostic and zero references, and reviewed adjacent control flow for side-effecting validation or recovery work. The diff removes only unreachable private code and its newly unused import. No material finding remained.
