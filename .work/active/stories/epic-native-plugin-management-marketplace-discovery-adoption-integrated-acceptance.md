---
id: epic-native-plugin-management-marketplace-discovery-adoption-integrated-acceptance
kind: story
stage: implementing
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
