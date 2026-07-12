---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Project Scope, References, and Versioning Foundation

## Scope

Implement Unit 1 of the parent design: pure versioned-schema mechanics, secure `ProjectIdentity` → `ProjectKey` derivation, user/project `ScopeContext`, persisted scope references, and versioned logical state/content/data/config/trust/pending references.

This story defines no filesystem identity discovery, physical path layout, lock, transaction adapter, trust policy, secret storage, operation, projection, or recovery behavior. Infrastructure will later supply canonical project roots and repository fingerprints.

## Files

- `src/domain/state/versioning.ts`
- `src/domain/state/scope.ts`
- `src/domain/state/references.ts`
- `test/domain/state/versioning.test.ts`
- `test/domain/state/scope.test.ts`
- `test/domain/state/references.test.ts`

## Implementation requirements

- Derive all public types from strict Zod schemas.
- Hash versioned, tagged, length-prefixed canonical preimages through injected `Sha256`; import no Node API.
- Bind repository project keys to canonical root plus repository fingerprint; make path-only identity explicit and root-bound.
- Recompute and verify project keys in `createScopeContext`.
- Keep persisted `ScopeReference` free of canonical roots.
- Make every logical reference a distinct versioned tagged SHA-256 brand; no reference may encode a path.
- Implement an adjacent-only pure migration-family helper that rejects gaps/future versions and validates every hop without mutating input.
- Add migration and key golden vectors before downstream schemas depend on these identities.

## Acceptance criteria

- [ ] Same project identity is deterministic; root, fingerprint, or identity-kind changes produce a different key.
- [ ] A mismatched project identity/key cannot create `ScopeContext`.
- [ ] Canonical project roots reject credentials, query, fragment, unsafe segments, and lone surrogates.
- [ ] State/content/data/config/trust/pending references are non-interchangeable and cannot contain paths.
- [ ] Migration families reject invalid graphs, unknown future versions, impure mutation of frozen input, and invalid intermediate output.
- [ ] Tests prove deterministic repeat output and no Node/filesystem/time/randomness import.
