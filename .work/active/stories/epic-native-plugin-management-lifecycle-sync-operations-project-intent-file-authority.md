---
id: epic-native-plugin-management-lifecycle-sync-operations-project-intent-file-authority
kind: story
stage: done
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

## Implementation notes

- Added the fixed-path project-intent port, opaque runtime-bound observations, dedicated cryptographic write IDs, and the strict portable codec wrapper. Canonical writes are deterministically sorted and end in one newline.
- Added a shared project path authority used by configuration and project-intent adapters for root revalidation, containment, canonical identity, and symlink rejection.
- The Node adapter performs bounded `O_NOFOLLOW` reads with descriptor/path identity checks and raw-byte plus declaration digests. Compare-and-replace uses exclusive sibling temporary files, file/directory fsync, a second pre-rename identity check, atomic same-directory rename, and exact reread reconciliation.
- Missing parent creation, stale observations, symlink parents/leaves, invalid UTF-8/schema, external replacement, temp cleanup, and ambiguous write evidence fail closed without publishing paths or native errors.
- Verification: strict typecheck; 6 focused codec/file/configuration tests passed.
