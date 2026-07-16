---
id: epic-transactional-plugin-lifecycle-read-only-adoption-contracts-readers
kind: story
stage: implementing
tags: [security, compatibility]
parent: epic-transactional-plugin-lifecycle-read-only-adoption
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Define adoption contracts and pure foreign-state readers

## Checkpoint

Establish the complete declaration-only boundary before any filesystem or state integration. Add schema-derived adoption declaration/candidate IDs, `foreign-state` provenance, pure current-shaped Claude JSON and Codex TOML readers, and deterministic reconciliation over validated `MarketplaceSource` claims.

The readers accept only source fields Pi can preserve exactly. They must never emit enabled plugins, trust, credentials, update policy, timestamps/revisions, install/cache paths, or activation state. Unsupported source semantics such as Claude `skipLfs`/inline settings/host patterns and Codex sparse paths are source-located failures rather than silently weakened declarations.

## Scope

- `src/domain/adoption.ts`
- `src/domain/provenance-location.ts`
- `src/domain/error-contract.ts`
- `src/formats/adoption-reader-support.ts`
- `src/formats/claude/state-reader.ts`
- `src/formats/codex/state-reader.ts`
- `src/formats/adoption-reconciler.ts`
- focused domain/format tests and `test/fixtures/adoption/`

## Acceptance evidence

- Current Claude known-marketplace/user-setting and Codex git/local fixtures produce exact normalized source claims with host/file/pointer/raw-source provenance.
- Root failures are document-local and entry failures preserve valid siblings.
- Equivalent declarations merge by canonical source into one stable candidate ID regardless of input order.
- Same-location contradictory sources report `CLAIM_CONFLICT` and cannot survive as authority.
- Forbidden operational fields cannot be represented by a candidate.
- Format/domain dependency boundaries remain free of Node, filesystem, application, lifecycle, state-store, runtime, and Pi imports.

## Ordering constraint

This checkpoint defines the only values later application and filesystem units may consume. Complete it before implementing selection/import orchestration.
