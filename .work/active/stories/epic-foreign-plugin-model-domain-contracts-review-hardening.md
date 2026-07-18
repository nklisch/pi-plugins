---
id: epic-foreign-plugin-model-domain-contracts-review-hardening
kind: story
stage: done
tags: [compatibility, security, tests]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: [epic-foreign-plugin-model-domain-contracts-package-schema-foundation, epic-foreign-plugin-model-domain-contracts-identity-source-contracts, epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts, epic-foreign-plugin-model-domain-contracts-compatibility-errors-api]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Harden Canonical Source and Diagnostic Contracts

## Scope

Resolve the accepted findings from the feature's two-phase deep review. Strengthen source canonicalization and resolved-source construction so trust/cache identities cannot alias, leak credentials, or claim inconsistent immutable state. Reconcile error and partial-result contracts, convert manual verification into committed regression protection, and roll foundation documentation forward to the implemented contract.

This is a cohesive contract-hardening pass, not a new acquisition feature. It must not perform Git/npm/filesystem resolution or implement foreign readers.

## Required fixes

- Reject malformed percent escapes rather than canonicalizing them into the same bytes as a literal percent sequence; add collision regressions including `%zz` vs `%25zz` and encoded slash cases.
- Make declared source schemas strict and enforce source-kind protocols: supported Git URL forms only, HTTPS-only npm registries, and no embedded HTTP(S) credentials. Support common SCP-style SSH Git syntax by normalizing it unambiguously or explicitly narrow and roll the contract forward; prefer support because the compatibility contract promises SSH Git URLs.
- Validate full Git SHA pins and real SHA-512 integrity digest length/encoding.
- Add validated constructors or verification functions that bind resolved source kind, canonical source, immutable revision fields, and injected source hash together rather than accepting unrelated branded strings.
- Integrate `ClaimConflictError` into the common domain error/diagnostic contract without introducing dependency cycles; preserve both conflicting claims for diagnostics.
- Require successful `ReadResult` values to carry warning-only diagnostics and failed values to contain at least one error diagnostic.
- Add committed regression checks for dependency-boundary violations and compiled package import. Add an exact public-export allowlist if it remains low-cost.
- Update stale feature design prose (`rootDir`) and roll `docs/ARCHITECTURE.md`, `docs/SPEC.md`, and `docs/COMPATIBILITY.md` forward where source restrictions or the error taxonomy currently disagree with the corrected implementation.

## Acceptance criteria

- [x] Canonical serialization has regression tests proving malformed escapes and encoded delimiters do not collide.
- [x] Source schemas reject unsupported protocols, insecure npm registries, inline HTTPS credentials, unknown fields, malformed SHA pins, and malformed integrity values; documented HTTPS and SSH Git forms remain supported.
- [x] Resolved-source construction cannot pair a kind with another kind's canonical form or an unrelated hash/revision claim.
- [x] Claim conflicts participate in the common typed diagnostic path without a circular domain dependency.
- [x] Read-result success/failure severity invariants are enforced at runtime.
- [x] Boundary-violation and compiled-package-import checks are committed and run through project verification.
- [x] Foundation docs and feature design describe the corrected current contract.
- [x] `npm test`, `npm run build`, and compiled package import pass.

## Implementation notes

- Files changed: `src/domain/source.ts`, `src/domain/provenance.ts`, `src/domain/provenance-location.ts`, `src/domain/error-contract.ts`, `src/domain/domain-error.ts`, `src/domain/errors.ts`, `src/index.ts`, source/domain regression tests, `test/tooling/boundaries.test.ts`, `test/compiled-package-import.mjs`, `package.json`, `docs/ARCHITECTURE.md`, `docs/SPEC.md`, `docs/COMPATIBILITY.md`, and this item plus the parent feature design.
- Tests added: malformed percent and encoded-delimiter collision vectors; strict source protocol/credential/unknown-field checks; full Git SHA and canonical SHA-512 integrity checks; resolved-source constructor/verifier mismatch checks; conflict diagnostics; read-result severity invariants; boundary-rule regression; exact compiled export allowlist.
- Discrepancies from design: resolved plugin sources now retain explicit immutable `url` fields for Git variants so canonical and hash verification can bind every identity input; `ClaimConflictError` lives in `provenance.ts` but extends the shared `DomainContractError` from `domain-error.ts` to avoid a dependency cycle.
- Adjacent issues parked: none.

## Findings fixed/rejected

All accepted findings were fixed. No required finding was rejected. The style-only review observations about redundant parsing, hex formatting, and readonly ergonomics remain intentionally out of scope.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Independently confirmed `npm test` (116 tests, typecheck, boundaries, build, and compiled 72-export allowlist) and `npm run build`. Verdict: Approve - story verified by implement; fast-lane advance.
