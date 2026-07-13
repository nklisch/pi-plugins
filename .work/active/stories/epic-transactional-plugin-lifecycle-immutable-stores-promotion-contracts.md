---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-contracts
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-immutable-stores-promotion
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Define immutable-store identities and promotion contracts

## Scope

Implement Unit 1 of the parent design. Add schema-derived marketplace/plugin physical store identities, stable data and projection logical references, opaque verified promotion plans, and the adapter-neutral `ContentStorePort`. Correct the pre-release `PluginDataRef` identity so it is scope/plugin-bound rather than revision-bound. Do not implement filesystem layout, staging, promotion, activation, state commits, trust, projection contents, or deletion.

## Required files

- `src/domain/content-store.ts`
- `src/domain/state/references.ts`
- `src/domain/state/installed-state.ts`
- `src/application/content-promotion.ts`
- `src/application/ports/content-store.ts`
- matching domain/application tests

## Design constraints

- Derive kinds, schemas, types, and routing from one `ContentStoreKindRegistry` / existing `StateReferenceKindRegistry`.
- Verify resolved source, manifest, binding, store key, and state logical references through existing canonical constructors; never hand-copy source/materialization schemas.
- Keep `VerifiedPromotionPlan` frozen and runtime-opaque, following the verified state-mutation pattern.
- A `StagingAllocation` is a capability consumed by the port, never serialized or logged.
- Physical locators derive from safe state evidence but absolute paths never enter state.
- Data identity is exactly stable scope + plugin + purpose; projection identity is scope + plugin + projection digest.
- Add stable error codes through `ErrorCodeRegistry`; diagnostics contain no paths, source URLs, allocation tokens, or native messages.

## Acceptance criteria

- [ ] Marketplace/plugin store keys deterministically change with their verified immutable identity and cannot contain caller text or paths.
- [ ] Forged source, manifest, binding, key, reference, allocation, or promotion-plan inputs fail before port mutation.
- [ ] Two revisions of one scope/plugin produce the same `PluginDataRef`; different scopes or plugin keys do not.
- [ ] `PluginContentRef` remains revision-bound and existing installed-record verification still rejects mismatched refs.
- [ ] `ProjectionRootRef` is registry-derived and cannot alias any existing reference family.
- [ ] Application/domain files import no Node or infrastructure modules.
- [x] Unit/type/public-contract tests cover all variants and `npm run typecheck && npm run boundaries` pass.

## Implementation notes
- Execution capability: direct host implementation; the contract surface is cohesive and has no independent write owner.
- Review weight: standard, with review intentionally left to the caller because agents were prohibited.
- Files changed: `src/domain/content-store.ts`, `src/domain/state/references.ts`, `src/domain/state/installed-state.ts`, `src/domain/error-contract.ts`, `src/application/content-promotion.ts`, `src/application/ports/content-store.ts`, `src/index.ts`, and contract tests.
- Tests added: `test/domain/content-store.test.ts`, `test/application/content-promotion.test.ts`; existing state/reference suites remain green.
- Discrepancies from design: identity schemas use a small local key-schema registry helper rather than adding schema objects to `ContentStoreKindRegistry`; this keeps the registry's public tag vocabulary unchanged while retaining one source of truth for routing.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`, `npm run boundaries`, and the focused domain/application/state Vitest suites pass.

## Review (2026-07-13)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 503 tests, real production/test typechecking, clean dependency boundaries, build, and exact 319-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
