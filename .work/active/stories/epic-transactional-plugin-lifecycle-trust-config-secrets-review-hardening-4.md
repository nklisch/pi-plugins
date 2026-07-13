---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-4
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-3]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
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

- [ ] Concurrent duplicate write IDs cannot overwrite or delete an active credential.
- [ ] Stale cleanup removes only locators proven created by that operation and currently unreferenced.
- [ ] Secret-store conformance requires atomic create-only behavior and typed collision.
- [ ] The authoritative document always resolves to the winning stored secret after collision.
- [ ] All project-root and adjacent adapter errors are fixed-code/redacted at public boundaries.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
