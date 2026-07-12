---
id: epic-foreign-plugin-model-source-materialization-integration-hardening
kind: story
stage: implementing
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

- [ ] Every supported source returns resolved source + `<slot>/content` + verified deterministic manifest from hermetic fixtures.
- [ ] Failure injection before/mid/after acquisition and finalization returns no partial object and leaves no materializer-owned path; cleanup failure remains explicit.
- [ ] Lifecycle can verify the returned root digest without source-specific knowledge, and materialization contains no cache/state/promotion/locking/recovery logic.
- [ ] Public source/compiled exports match the exact allowlist and expose no credential/process/filesystem internals.
- [ ] Foundation docs accurately state staging ownership, malicious-content policy, Git ambiguity/submodule behavior, and direct verified script-free npm acquisition.
- [ ] Full `npm test` and independent `npm run build` pass.
