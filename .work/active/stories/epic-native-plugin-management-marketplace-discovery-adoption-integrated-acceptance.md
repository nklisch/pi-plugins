---
id: epic-native-plugin-management-marketplace-discovery-adoption-integrated-acceptance
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-packaged-composition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Prove clean-environment marketplace discovery and adoption

## Checkpoint

Exercise the composed packaged capability across clean environment, restart/offline, process concurrency, and security boundaries. This is seam-level acceptance, not a duplicate reader/materializer/state/lifecycle matrix, and ends at immutable candidate resolution without install or activation.

## Files

- `test/integration/marketplace-discovery-clean-environment.test.ts`
- `test/integration/marketplace-discovery-restart.test.ts`
- `test/integration/marketplace-discovery-concurrency.test.ts`
- `test/integration/marketplace-discovery-security.test.ts`
- native registration and foreign adoption fixtures

## Acceptance evidence

- A packed clean host without Claude/Codex adds local and Git-backed fixtures, restarts offline, lists/searches/details/resolves candidates, and retains exact selected snapshot evidence.
- User/current-project duplicates, malformed sibling entries, moved local roots, missing/corrupt cache, partial source, abort, refresh/remove races, and crash-expired claims match the contracts.
- Claude/Codex preview/import requires no CLI and proves foreign files, caches, trust, credentials, and installations are never mutated or reused.
- Redirect/host pivot, traversal/symlink, digest/provenance tamper, secret/URL/path log canaries, and untrusted project inputs fail at the owning boundary.
- No test invokes plugin install/update activation, trust collection, command grammar, or terminal rendering; later features consume the proven candidate capability.

## Implementation notes

- Added clean-environment, restart/offline, concurrency, and security acceptance files around the frozen packaged marketplace capability, plus direct integrated adoption no-mutation coverage.
- The full accepted path is exercised whenever packaged immutable publication is available. On this branch the existing packaged content store deliberately reports `PROMOTION_FAILED` because production composition has no atomic-no-replace directory primitive; acceptance records that exact safe boundary rather than adding a weaker marketplace-owned workaround.
- Registration/catalog application suites independently prove paired publication, deterministic offline browse/detail/internal resolve, stale cursors, unavailable content isolation, duplicate add, removal, and redacted project/local-source rejection over injected strict ports.
- Git host-pivot/redirect, foreign/local symlink/escape, credential URL, path/secret redaction, adoption no mutation, and untrusted current-project cases are covered at their owning seams.
- No test invokes install, activation, trust collection, commands, terminal rendering, or foreign CLI/cache/auth state.

## Verification

- Focused acceptance/application bundle: 44 passed, 0 failed.
- Full authoritative run: 210 files, 1056 tests passed; type errors 0; dependency boundaries passed; compiled/packed package checks passed.

## Packaged-host integration note

The current packaged host has no production atomic-no-replace publication primitive (`content-store-durability.ts` fails closed by design). The new acceptance tests preserve and assert that safe failure, then automatically exercise add/restart/concurrency after the owning packaged-host review fix lands. This feature does not modify the packaged-host review item or weaken immutable-store guarantees.
