---
id: epic-native-plugin-management-packaged-host-composition-installed-revision-loader
kind: story
stage: done
tags: [security, compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-durable-state-configuration]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Make Installed Revisions Exactly Reconstructable

## Checkpoint

Close the currently unimplementable `InstalledPluginLoader` seam by sealing a strict reconstruction descriptor into immutable plugin metadata at promotion. Keep lifecycle state lossy and projection caches replaceable; never guess old source/catalog evidence.

## Planned files

- `src/application/installed-revision-descriptor.ts`
- `src/application/content-promotion.ts`
- `src/application/plugin-candidate-preparation.ts`
- `src/infrastructure/filesystem/immutable-content-store.ts`
- `src/infrastructure/filesystem/content-root-resolver.ts`
- `src/infrastructure/filesystem/installed-plugin-loader.ts`
- `src/infrastructure/filesystem/create-content-store.ts`
- `test/application/installed-revision-descriptor.test.ts`
- `test/infrastructure/filesystem/installed-plugin-loader.test.ts`
- `test/integration/installed-revision-restart.test.ts`

## Required behavior

- Plugin promotion plans carry a verified descriptor containing exact `LoadedInstalledPlugin` evidence; marketplace plans cannot.
- Published metadata v2 binds content identity/manifest/binding and descriptor digest under existing seal/sync/no-replace publication.
- Loader resolves the exact state-selected revision, rewalks content, validates descriptor/source/report/plugin/content/reference evidence, and returns a deep-frozen value.
- Missing/corrupt runtime projection caches rebuild from the descriptor and fresh capability assessment.
- Existing metadata v1 remains resolvable as content but yields explicit reconstruction unavailable; current catalogs, aliases, paths, and display versions are never used as substitutes.

## Acceptance evidence

- [ ] Real install metadata survives restart and reproduces the exact installed revision constructor evidence.
- [ ] Descriptor/report/source/content/reference/scope/revision tamper and cross-root swaps fail before runtime or secret access.
- [ ] Projection deletion/corruption rebuilds deterministically; descriptor disappearance blocks only that plugin without state mutation.
- [ ] Descriptor bytes and low-level metadata readers remain absent from state, diagnostics, logs, projection caches, and public exports.

## Ordering constraint

Follows durable state/content contracts. Runtime desired-state construction depends on this exact loader.

## Implementation notes

- Added a strict digest-bound reconstruction descriptor containing the exact normalized plugin, compatibility report, marketplace source, content manifest, and binding used for installation.
- Candidate preparation now attaches verified descriptors only to plugin promotion plans. Immutable plugin metadata v2 seals that evidence; marketplace and legacy descriptor-free promotions remain metadata v1.
- Added the installed-revision loader and combined Node content infrastructure. Loading first revalidates scope-bound immutable content, then the sealed descriptor, then reconstructs and compares the complete installed revision before returning a deep-frozen value. V1 roots return `INSTALLED_DESCRIPTOR_UNAVAILABLE` and never consult catalogs or paths.
- Verification: descriptor, immutable metadata, restart loader, lifecycle, and runtime projection focused suites passed (24 tests); `npm run typecheck` and `npm run boundaries` passed.
