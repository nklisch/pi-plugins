---
id: epic-native-plugin-management-lifecycle-sync-operations-project-intent-file-authority
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Add Verified Project-Intent File Authority

## Checkpoint

Implement a fixed `.pi/plugins.json` `ProjectIntentFilePort`, strict codec wrapper, injected project-intent write IDs, and Node no-follow compare-and-replace adapter. Extract shared project-root revalidation/no-symlink containment from configuration paths rather than copying it.

The port accepts only `TrustedProjectRoot`, opaque verified observations, typed portable declarations, and write IDs. It never accepts a path, root string, raw bytes, user scope, or foreign-host location.

## Acceptance evidence

- Reads use bounds, `O_NOFOLLOW`, regular-file and pre/post descriptor identity, UTF-8/JSON/portable codec validation, and canonical digest.
- Writes use an exclusive sibling temp, canonical newline bytes, fsync file/directory, same-directory rename, post-read reconciliation, and cleanup.
- Symlink/escape/root replacement/growth/oversize/invalid input/temp collision/stale identity/lost response fail closed without path/native leakage.
- Existing configuration path semantics remain green through the shared authority extraction.
