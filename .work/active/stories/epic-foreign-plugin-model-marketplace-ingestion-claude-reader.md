---
id: epic-foreign-plugin-model-marketplace-ingestion-claude-reader
kind: story
stage: review
tags: [compatibility]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-domain-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Read Claude Marketplace Catalogs

## Scope

Implement the pure Claude catalog reader and shared marketplace-reader support described in the parent. Parse unknown objects and raw JSON at the `.claude-plugin/marketplace.json` boundary, normalize every supported source form into shared declared-source claims, carry explicit/default strict authority, preserve raw runtime/dependency declarations and host-qualified metadata, and isolate malformed entries while keeping valid siblings.

The reader validates relative path syntax only. It must not access the filesystem, resolve symlinks, materialize content, create `NormalizedPlugin`, merge manifests, or assign compatibility verdicts.

## Acceptance criteria

- [x] String path, GitHub, URL Git, Git-subdirectory, and npm declarations map exactly to domain `PluginSource` forms with raw provenance.
- [x] Root-fatal and entry-recoverable outcomes match the parent matrix; raw JSON syntax maps to typed `MARKETPLACE_ROOT_INVALID` with native cause retained only on the thrown error.
- [x] Claude strict default/true and false produce the designed authority metadata with auditable provenance.
- [x] Malformed nested runtime/dependency fields drop the whole entry; siblings survive and no partial entry is emitted.
- [x] JSON Pointers are RFC 6901 escaped and every claim preserves its raw declaration.
- [x] The real-shaped `nklisch-skills` fixture and adversarial fixture suite pass without Node or outer-layer imports.

## Implementation notes

- Files changed: `src/formats/marketplace-reader-support.ts`, `src/formats/claude/marketplace-reader.ts`, `test/formats/claude/marketplace-reader.test.ts`, `test/fixtures/marketplaces/claude-valid.json`, `test/fixtures/marketplaces/claude-partial.json`.
- Tests added: Claude source-form mapping, strict authority/default provenance, RFC 6901 pointers, policy/runtime retention, root boundary errors, and atomic malformed-entry recovery.
- Discrepancies from design: Git subdirectory paths accept both documented `plugin` and `./plugin` forms; the verified `nklisch-skills` catalog uses the former.
- Adjacent issues parked: none.

## Verification

- `npm test` — 13 test files, 127 tests passed; typecheck, dependency boundaries, build, and compiled export allowlist passed.

## Design source

Implement Parent Feature Unit 2. The shared `marketplace-reader-support.ts` surface is owned by this story so the Codex reader can consume it after this dependency completes.
