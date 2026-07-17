---
id: epic-native-plugin-management-packaged-host-composition-durable-state-configuration
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-host-contract-session-layout]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Implement Durable State and Configuration Adapters

## Checkpoint

Implement real per-scope authoritative state/inventory, non-secret configuration CAS, canonical configuration paths, cryptographic operation/write/claim IDs, and one Node lifecycle clock. Reuse existing schemas/codecs/migrations, generation coordinator, and SQLite local-filesystem conventions; do not create another state vocabulary or lock authority.

## Planned files

- `src/infrastructure/state/sqlite-lifecycle-state-store.ts`
- `src/infrastructure/state/sqlite-lifecycle-state-inventory.ts`
- `src/infrastructure/state/lifecycle-state-defaults.ts`
- `src/infrastructure/configuration/sqlite-plugin-configuration-store.ts`
- `src/infrastructure/configuration/node-configuration-path.ts`
- `src/infrastructure/node/node-identifiers.ts`
- `src/infrastructure/node/node-lifecycle-clock.ts`
- `test/infrastructure/state/sqlite-lifecycle-state-store.test.ts`
- `test/infrastructure/configuration/sqlite-plugin-configuration-store.test.ts`
- `test/integration/packaged-state-concurrency.test.ts`

## Required behavior

- One strict rollback-journal SQLite state database per user/project scope stores canonical document blobs and one pointer/generation.
- Fresh user and project generation-zero snapshots use current schemas; project default is exact-identity-bound and explicitly unsynchronized, not inferred from `.pi/plugins.json`.
- Reads validate pointer/blob/scope/generation/digest and run supported registry migrations in memory. Commits accept only verified mutations and perform exact CAS.
- Inventory lists only strict scope database names and reports incomplete evidence rather than omitting a corrupt candidate.
- Configuration storage accepts only `PluginConfigurationDocument`, uses exact ref/revision CAS, and reconciles lost responses through read.
- Project path inputs require trusted-root containment; user paths use the exact session-bound base. Both store canonical file URLs.
- IDs satisfy existing schemas and use cryptographic Node sources; all handles close idempotently without deleting durable files.

## Acceptance evidence

- [ ] Clean initialization, restart, supported migration, unknown future version, blob/pointer tamper, and scope alias vectors are covered.
- [ ] Real child processes produce one state CAS winner and one stale result; existing scope-lock coverage remains authoritative for the adjacent promotion window.
- [ ] Configuration stale writers cannot remove active secret locators or overwrite newer documents.
- [ ] Abort, busy, lost response, root/database replacement, unsupported filesystem, and partial initialization fail closed with redacted results.

## Ordering constraint

Follows host/path contracts. Installed reconstruction and the converged application container depend on this checkpoint.

## Implementation notes

- Added one rollback-journal SQLite lifecycle database per scope with strict protocol/scope evidence, canonical state blobs, current/previous generation pointers, exact final CAS, in-memory codec migration, corruption results, strict inventory, database identity checks, and idempotent close. Fresh project state carries an explicit unsynchronized-intent digest and never reads foreign state.
- Added the private SQLite non-secret configuration store with exact ref/revision CAS and confirmed-removal semantics, plus the session/root-authorized configuration path adapter.
- Added cryptographic operation/configuration/refresh identifiers and one inert process clock.
- Verification: focused state/configuration/identifier suites plus the two-real-process CAS suite passed (8 tests); `npm run typecheck` and `npm run boundaries` passed.
