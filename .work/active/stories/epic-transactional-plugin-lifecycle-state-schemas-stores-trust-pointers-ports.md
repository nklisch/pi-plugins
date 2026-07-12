---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-trust-pointers-ports
kind: story
stage: review
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Trust Envelope, Generation Codec, and Store Port

## Scope

Implement Unit 4 of the parent design: the independently versioned trust evidence envelope, generation pointer document, document registry, migration/isolation codecs, generation snapshot/mutation/result contracts, and adapter-neutral `LifecycleStateStore` port.

Trust collection/revocation policy, executable-surface canonicalization, configured/secret values, physical blobs, locking, fsync/rename, promotion, operations, journal payloads, recovery, retention, and garbage collection remain outside this story.

## Files

- `src/domain/state/trust-state.ts`
- `src/domain/state/pointers.ts`
- `src/domain/state/registry.ts`
- `src/domain/state/codec.ts`
- `src/application/state-contract.ts`
- `src/application/ports/lifecycle-state-store.ts`
- matching tests under `test/domain/state/` and `test/application/`

## Implementation requirements

- Trust records bind safe canonical source/revision/executable-surface evidence to plugin and scope; derive and verify the subject reference.
- Pointer documents select the exact document set for one user/project scope generation using logical blob refs/digests only.
- Make `StateDocumentRegistry` the single source for family/version/migration/decoder routing.
- Validate/migrate envelopes before isolated record decoding; redact corruption details and quarantine all duplicate keys.
- Encode only complete current-valid documents and deterministic keyed-record order.
- Model commit as expected-generation replacements with internally derived next generation; expose stale generation as data.
- Keep abort and adapter failure distinct from persisted corruption.

## Acceptance criteria

- [ ] Trust schemas cannot represent secrets/configured values and do not decide grant sufficiency or update authority.
- [ ] User pointers require config/installed/trust; project pointers require project-local only; scope/generation mismatches are fatal.
- [ ] Record corruption preserves safe siblings, while pointer/version/scope/generation/digest corruption yields no snapshot.
- [ ] Writes never persist known-invalid partial records.
- [ ] Mutation schemas reject empty user writes, caller-supplied next generations, and wrong-scope documents.
- [ ] Store port has no transaction callback, filesystem path, lock, trust policy, promotion, projection, operation, journal, or recovery API.

## Implementation notes

- Execution capability: inline single-owner implementation; the state schemas, registry/codecs, application contracts, and adapter-neutral port form one cohesive boundary, and the caller explicitly prohibited agents.
- Review weight: standard (default); implementation stops at the requested `stage: review` boundary.
- Files changed: `src/domain/state/trust-state.ts`, `src/domain/state/pointers.ts`, `src/domain/state/registry.ts`, `src/domain/state/codec.ts`, `src/application/state-contract.ts`, `src/application/ports/lifecycle-state-store.ts`, and matching domain/application tests.
- Tests added: trust subject derivation and policy/secrets exclusion; exact user/project pointer sets; corruption isolation, duplicate quarantine, redacted fatal failures, digest verification, and deterministic encoding; mutation boundary and empty/wrong-generation/forbidden-field validation.
- Discrepancies from design: none.
- Adjacent issues parked: none.
