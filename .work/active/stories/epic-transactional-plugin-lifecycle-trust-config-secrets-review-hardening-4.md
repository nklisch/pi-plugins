---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-4
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-3]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-18
---

# Make Secret Locator Creation Collision-Safe

## Scope

Close the reproduced concurrent duplicate-write-ID credential corruption and finish the interrupted adapter-error custody check.

## Finding

Two concurrent saves can receive the same schema-valid write ID and derive the same secret locator. The current `SecretStore.put` contract permits overwrite and stale cleanup assumes fresh-locator ownership. A stale writer can therefore overwrite or delete the winner's credential while the authoritative document still references that locator.

## Required fixes

- Change secret creation to explicit no-replace semantics. `SecretStore` must atomically create a locator or return a typed collision; it must never overwrite an existing credential. Derive the contract/schema/result from one registry and add adapter conformance tests.
- Treat write-ID/locator collision as fail-closed before configuration CAS. Never delete a locator this operation did not successfully create.
- On stale CAS and ambiguous outcomes, reconcile per-locator authority before cleanup even when IDs collide; deletion requires both proven inactivity and proven operation ownership.
- Track operation-owned locators through opaque runtime capability/evidence, not caller strings alone. Cleanup consumes only owned creation evidence.
- Add exact two-writer duplicate-ID barriers proving one credential creation wins, the loser neither overwrites nor deletes it, and the authoritative document resolves to the winning secret.
- Complete the interrupted project-root/native adapter error custody checks. Every acquire/verify/path/config/secret adapter throw must be wrapped into fixed safe errors with no native cause/message, path, or secret canary.

## Acceptance criteria

- [x] Concurrent duplicate write IDs cannot overwrite or delete an active credential.
- [x] Stale cleanup removes only locators proven created by that operation and currently unreferenced.
- [x] Secret-store conformance requires atomic create-only behavior and typed collision.
- [x] The authoritative document always resolves to the winning stored secret after collision.
- [x] All project-root and adjacent adapter errors are fixed-code/redacted at public boundaries.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes

- Execution capability: host-local inline implementation; the caller explicitly prohibited agents and isolated worktrees.
- Secret creation is now a schema-derived `created | collision` result. Successful creates return opaque adapter evidence; pre-CAS cleanup calls `removeOwned` only with evidence returned by that operation. Authoritative post-CAS/removal cleanup retains the existing locator-based path after the document has proved the locator unreferenced or retired.
- Stale CAS and ambiguous replace outcomes reconcile authoritative liveness before deleting any operation-owned fresh locator. Collisions fail before configuration CAS and return locator-only `secret-collision` evidence; a colliding locator is never treated as owned.
- Added a two-writer duplicate-ID barrier, create-only secret-store conformance coverage, and fixed redaction assertions for project-root, path, configuration, and secret adapter throws. Project-root acquire/verify now expose stable `ADAPTER_FAILED` errors without native causes.
- Files changed: `src/application/ports/secret-store.ts`, `src/application/configuration-service.ts`, `src/composition/create-project-root-authority.ts`, and the related contract/application/integration tests.

## Verification

- `npm test` — passed: real production/test typechecking, dependency boundaries, 90 Vitest files / 552 tests with no type errors, clean build, and compiled ESM package import allowlist.

## Review (2026-07-13)

**Verdict**: Approve

**Review notes**: Substrate mode; caller's explicit story fast-advance policy; independent integrated verification. Atomic create-only collision handling, owned cleanup evidence, winner resolution, and adapter-error redaction are covered. No realistic normal-use blockers or important findings remain.
