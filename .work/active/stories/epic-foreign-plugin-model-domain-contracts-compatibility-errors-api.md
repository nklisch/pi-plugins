---
id: epic-foreign-plugin-model-domain-contracts-compatibility-errors-api
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: [epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-18
---

# Compatibility Mechanism, Diagnostics, and Public API

## Scope

Implement Unit 4 from the parent feature: three-verdict and runtime-requirement registries, referentially valid assessments/reports, pure activatability derivation, stable recoverable diagnostics, typed fatal boundary errors, partial-success reader envelopes, and the explicit package export surface. This story defines compatibility mechanics only; concrete support-policy rules remain in the compatibility-reporting feature.

## Files

- `src/domain/compatibility.ts`
- `src/domain/errors.ts`
- `src/index.ts`
- `test/domain/compatibility.test.ts`
- `test/domain/errors.test.ts`
- `test/public-api.test.ts`

Use the exact schemas, registries, constructors, error/result signatures, and explicit exports in the parent design. A supported component may cite requirements; unavailable cited requirements block activation without becoming a fourth component verdict. Causes remain available on thrown errors but never serialize into diagnostics.

## Acceptance criteria

- [x] Only `supported`, `metadata-only`, and `incompatible` component verdicts parse; `conditional` fails.
- [x] Activatability is derived and rejects incompatible components, unavailable cited requirements, dangling ids, duplicate ids, and inconsistent caller-supplied values.
- [x] Partial-success collections preserve valid siblings and stable source-located diagnostics; fatal roots and adapter failures throw typed `BoundaryError` values.
- [x] Error codes and display/blocking metadata derive from their registries; unknown codes fail parsing.
- [x] The explicit `src/index.ts` API exports intended domain schemas/types/functions without leaking host, format, filesystem, Git, npm, Pi, process, or time contracts.
- [x] Compiled package import, `npm test`, and `npm run build` pass.

## Implementation notes

- Added registry-backed compatibility verdict and runtime-requirement schemas, referential report validation, and pure activation derivation in `src/domain/compatibility.ts`.
- Added stable diagnostic schemas, Zod-to-diagnostic conversion, partial read-result envelopes, typed boundary errors, and a re-export of the existing provenance-owned `ClaimConflictError` in `src/domain/errors.ts`.
- Added an explicit domain-only package barrel in `src/index.ts`; no host, format, filesystem, Git, npm, Pi, process, or time contracts are exported.
- Adjusted `tsconfig.json` output root from `.` to `src` so the package export target `dist/index.js` is an actually loadable compiled entry point.
- Added focused compatibility, error, partial-result, public API, and inferred-type tests in the three allowed test files.
- Dispatch rationale: direct-read implementation; the dependency story is done and the parent design supplied exact contracts, so no nested delegation was necessary.

## Verification

- `npm test` — 117 tests passed, typecheck and dependency boundaries passed.
- `npm run build` — passed.
- Compiled import probes for `./dist/index.js` and `@nklisch/pi-plugin-host` — passed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Independently confirmed `npm test` (117 tests, typecheck, and boundaries) and `npm run build` plus compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
