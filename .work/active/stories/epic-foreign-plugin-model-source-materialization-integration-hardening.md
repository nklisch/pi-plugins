---
id: epic-foreign-plugin-model-source-materialization-integration-hardening
kind: story
stage: done
tags: [security, infra]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-git-acquisition, epic-foreign-plugin-model-source-materialization-npm-acquisition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Compose and harden source materialization

## Scope

Implement Unit 4 from the parent feature after the secure sink, Git, and npm stories: wire Node adapters behind the application contracts, exercise every source form and failure phase end to end, finalize dependency/public export checks, and roll foundation docs forward to the stable lifecycle handoff.

This story integrates but does not absorb lifecycle work. The caller still allocates staging and owns cache/marketplace/install paths, promotion, state, locks, fsync/journal, rollback, recovery, and garbage collection.

## Files

- `src/infrastructure/source/create-source-materializers.ts`
- `src/application/source-materialization.ts` (marketplace-path resolved-source construction exposed by integration)
- `src/infrastructure/npm/npm-registry-client.ts` (composition limit forwarding)
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/source-materialization.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPATIBILITY.md`

## Required behavior

- Wire Node crypto/filesystem/process, Git, tar/gzip, bounded HTTPS, npm credentials, and redaction through `createNodeSourceMaterializers` without exposing raw adapters publicly.
- Export exactly the parent-documented manifest/materializer/context/result/error/default/factory surface and update exact compiled allowlists.
- Run offline integration fixtures for all marketplace/plugin source variants, marketplace context handoff, deterministic manifest verification, failure classification, and cancellation/cleanup phases.
- Enforce domain/application/format/infrastructure dependency directions with committed generated violations.
- Keep foundation prose at the ownership/security handoff; do not predesign transactional state/cache mechanics.

## Acceptance criteria

- [x] Every supported source returns resolved source + `<slot>/content` + verified deterministic manifest from hermetic fixtures.
- [x] Failure injection before/mid/after acquisition and finalization returns no partial object and leaves no materializer-owned path; cleanup failure remains explicit.
- [x] Lifecycle can verify the returned root digest without source-specific knowledge, and materialization contains no cache/state/promotion/locking/recovery/GC logic.
- [x] Public source/compiled exports match the exact allowlist and expose no credential/process/filesystem internals.
- [x] Foundation docs accurately state staging ownership, malicious-content policy, Git ambiguity/submodule behavior, and direct verified script-free npm acquisition.
- [x] Full `npm test` and independent `npm run build` pass.

## Implementation notes

- Added the Node composition root with one SHA-256 port, the secure content writer, tar/gzip reader, Git command/acquirer, bounded HTTPS and npm credential/registry/acquirer graph, and marketplace-relative filesystem copier. Raw adapter modules remain unexported.
- Added hermetic integration coverage for local-Git, Git URL, GitHub shorthand, Git plugin, Git subdirectory, marketplace-relative, and npm sources. Fixtures assert common manifests, resolved revisions, `.work` cleanup, lifecycle digest verification, cancellation preservation, transient classification, and script-free npm extraction.
- Fixed marketplace-relative result construction to create its canonical/hash-bearing resolved source before application verification. Forwarded configured materialization limits to packument resolution so composition applies one limit policy end to end.
- Updated the public source and compiled-package allowlists and rolled the foundation docs forward to the staging/security handoff without introducing lifecycle state or promotion mechanics.

## Verification

- `npm test`
- `npm run build`
- `node test/compiled-package-import.mjs`
- `npx vitest run test/integration/source-materialization.test.ts`
- `npm run boundaries`

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Independently confirmed `npm test`: 176 tests, typecheck, 152 dependency edges with no violations, build, and exact 91-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
