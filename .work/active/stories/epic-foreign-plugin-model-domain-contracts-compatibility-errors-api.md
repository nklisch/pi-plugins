---
id: epic-foreign-plugin-model-domain-contracts-compatibility-errors-api
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: [epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
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

- [ ] Only `supported`, `metadata-only`, and `incompatible` component verdicts parse; `conditional` fails.
- [ ] Activatability is derived and rejects incompatible components, unavailable cited requirements, dangling ids, duplicate ids, and inconsistent caller-supplied values.
- [ ] Partial-success collections preserve valid siblings and stable source-located diagnostics; fatal roots and adapter failures throw typed `BoundaryError` values.
- [ ] Error codes and display/blocking metadata derive from their registries; unknown codes fail parsing.
- [ ] The explicit `src/index.ts` API exports intended domain schemas/types/functions without leaking host, format, filesystem, Git, npm, Pi, process, or time contracts.
- [ ] Compiled package import, `npm test`, and `npm run build` pass.
