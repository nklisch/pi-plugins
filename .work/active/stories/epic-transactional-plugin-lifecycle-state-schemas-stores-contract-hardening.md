---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-contract-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-config-portable, epic-transactional-plugin-lifecycle-state-schemas-stores-installed-project, epic-transactional-plugin-lifecycle-state-schemas-stores-trust-pointers-ports]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# State Contract Integration and Adversarial Hardening

## Scope

Implement Unit 5 of the parent design: converge all six independently versioned schema families through public exports, dependency boundaries, committed fixtures, fake-store integration, corruption and portable-security adversarial tests, and foundation alignment.

No production storage/lock/trust/secret/promotion/operation/recovery adapter is part of this story.

## Files

- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/state-contracts.test.ts`
- `test/fixtures/state/v1/valid/`
- `test/fixtures/state/v1/corrupt/`
- `test/fixtures/state/portable/`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- foundation documents only if implementation changes current assertions

## Implementation requirements

- Export exact current schemas/inferred types, registry, pure constructors/codecs, snapshot/mutation/results, and store port.
- Keep physical adapters, lock contracts, trust policy, secret storage, pending payloads, projections, operations, and recovery private/unimplemented.
- Add executable state-domain and state-port dependency rules plus violation regressions.
- Commit independently authored valid/corrupt/future-version/portable fixtures.
- Test a full user and independent project generation through an in-memory fake implementing only the public port.
- Assert serialized state and corruption JSON never leak canary secrets, raw configured/header values, projections, expanded environment, absolute physical paths, timestamps in portable intent, or native causes.

## Acceptance criteria

- [ ] Public source and compiled ESM export allowlists match exactly.
- [ ] Full schema, migration, identity, reference, canonical-evidence, corruption, mutation, portable-prohibition, boundary, and integration suites pass under `npm test`.
- [ ] Mixed record corruption preserves unrelated plugin/scope records; fatal pointer/envelope errors return no partial snapshot.
- [ ] Deterministic encodings are independent of input collection/property order and duplicates never use input precedence.
- [ ] Dependency checks prove state domain/ports do not import Node, formats, infrastructure, runtime, Pi, clock, randomness, trust/secret adapters, or composition.
- [ ] Foundation docs remain accurate without precommitting a storage/lock/trust/promotion/operation/recovery implementation.
