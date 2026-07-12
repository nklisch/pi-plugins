---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Immutable Stores and Atomic Promotion

## Brief

Own caller-private staging allocation plus immutable marketplace and plugin revision stores keyed by canonical source and resolved revision. Before promotion, rewalk and verify the completed foreign-model materialization handoff, then promote only complete content into a read-only revision location without allowing materializers to choose installed/cache/marketplace paths.

The feature also establishes stable roots for persistent plugin data and generated projections while keeping both outside immutable content. It does not mutate active state, collect trust, orchestrate install/update, delete retained revisions, or generate/activate skill, hook, or MCP runtime behavior.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 2 storage capability — lifecycle operations consume promoted immutable identities
- Depends on state schemas for canonical store references but remains independent of trust and locking design
- Required guarantees: crash, data, scope, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — State layout; Install transaction; Trust and security
- `docs/ARCHITECTURE.md` — Marketplace store; Plugin store; Source acquisition; Runtime projections
- `docs/COMPATIBILITY.md` — Plugin source forms; Plugin path environment

## Existing contract references

- `src/application/source-materialization.ts` — `MaterializedMarketplace` / `MaterializedPlugin` handoffs and caller-owned staging slots
- `src/domain/content-manifest.ts` — deterministic manifest and source/content binding
- `src/infrastructure/filesystem/secure-content-writer.ts` — lifecycle-facing materialized-content verification seam

## Late-bound feature decisions

Store-path encoding, staging ownership/permissions, promotion primitive, deduplication behavior, read-only enforcement, collision handling, marketplace active-pointer representation, projection/data directory placement, fsync support matrix, and promotion idempotency remain for feature design. Promotion must not imply activation and must never accept content that differs from the inspected manifest.

## UI alignment

No UI surface.
