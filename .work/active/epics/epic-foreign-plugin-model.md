---
id: epic-foreign-plugin-model
kind: epic
stage: implementing
tags: [compatibility, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Foreign Plugin Model

## Brief

This epic delivers the standalone understanding layer for Claude Code and OpenAI Codex marketplaces. It establishes the TypeScript package foundation, canonical identities, normalized plugin contracts, and readers that turn untrusted foreign catalogs and manifests into one provenance-rich domain model.

It also covers secure source resolution and materialization for marketplace-relative, Git, Git-subdirectory, and npm sources, plus complete compatibility evaluation before activation. The result is an inspectable plugin bundle that downstream lifecycle code can trust without depending on either foreign CLI.

This epic does not install or activate plugins. Transactional state, Pi runtime integration, and the interactive management experience belong to dependent epics.

## Foundation references

- `docs/VISION.md` — Purpose, Product promise, Compatibility boundary
- `docs/SPEC.md` — Marketplace sources, Marketplace entries, Manifests, Component compatibility verdicts
- `docs/ARCHITECTURE.md` — Domain model, Format ingestion, Source acquisition
- `docs/COMPATIBILITY.md` — Marketplace discovery, Plugin source forms, Plugin manifests

## Decomposition

Split by end-to-end capability rather than implementation layer or foreign host. A shared canonical model anchors two parallel producers—secure source materialization and dual-format marketplace ingestion—which converge in complete plugin-bundle ingestion; compatibility reporting then evaluates the resulting normalized inventory. Claude and Codex readers stay together in each ingestion capability because their conflict detection and provenance rules are one user-visible contract, while package/build setup is folded into the canonical-model foundation rather than becoming an infrastructure-only feature.

### Child features

- `epic-foreign-plugin-model-domain-contracts` — establish the validated canonical identities, source declarations, normalized component/provenance model, and TypeScript package foundation — depends on: `[]`
- `epic-foreign-plugin-model-source-materialization` — securely resolve and materialize marketplace-relative, Git, Git-subdirectory, and npm content at immutable revisions — depends on: `[epic-foreign-plugin-model-domain-contracts]`
- `epic-foreign-plugin-model-marketplace-ingestion` — read Claude and Codex marketplace catalogs into consistent normalized entries with source-located diagnostics — depends on: `[epic-foreign-plugin-model-domain-contracts]`
- `epic-foreign-plugin-model-plugin-bundle-ingestion` — inspect materialized Claude, Codex, and dual-format bundles, reconcile manifests and conventional discovery, and validate Agent Skills — depends on: `[epic-foreign-plugin-model-source-materialization, epic-foreign-plugin-model-marketplace-ingestion]`
- `epic-foreign-plugin-model-compatibility-reporting` — derive complete component verdicts, runtime requirements, activatability, and provenance-rich diagnostics — depends on: `[epic-foreign-plugin-model-plugin-bundle-ingestion]`

### Decomposition risks

- Source materialization is the highest-risk capability because path containment, symlink handling, immutable revision resolution, and no-script npm extraction must remain correct across platforms; its feature design should preserve narrow filesystem, Git, and npm ports and adversarial fixtures.
- Plugin-bundle ingestion is the convergence point for both parallel branches. Keep it focused on reading, discovery, reconciliation, and normalized claims so source acquisition and compatibility policy do not leak into the readers.
- Foreign schemas can drift independently. Claude and Codex parsing remain isolated behind one normalized contract, with unknown runtime declarations retained as explicit incompatibilities rather than silently discarded.
- The dependency graph deliberately keeps source materialization and marketplace ingestion parallel after the domain foundation; combining them would create an unnecessary serial critical path, while splitting by host would duplicate reconciliation concerns.

## Design decisions

- **Alignment status**: No unresolved high-level choices surfaced. The foundation documents already fix the standalone foreign-format boundary, dual-format conflict behavior, canonical identity, supported source forms, provenance, complete-bundle compatibility, and fail-closed treatment of unknown runtime declarations. Reader schemas, registries, and materializer interfaces remain feature-design decisions.
- **Discovery posture**: Direct-read only — the repository is greenfield and the foundation documents fully describe this epic's boundaries, so exploratory agent fanout would not add evidence.
