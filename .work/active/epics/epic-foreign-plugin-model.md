---
id: epic-foreign-plugin-model
kind: epic
stage: done
tags: [compatibility, infra]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-18
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

## Children complete

All five child features are done:

- `epic-foreign-plugin-model-domain-contracts`
- `epic-foreign-plugin-model-source-materialization`
- `epic-foreign-plugin-model-marketplace-ingestion`
- `epic-foreign-plugin-model-plugin-bundle-ingestion`
- `epic-foreign-plugin-model-compatibility-reporting`

The delivered package now reads dual foreign marketplaces, securely materializes every supported source, inspects complete plugin bundles without execution, preserves unsupported runtime inventory, and emits fail-closed compatibility reports with deterministic provenance and capability requirements. It remains independent of Claude Code and Codex runtimes and does not install or activate plugins.

Integrated verification: `npm test` passes 352 tests plus clean typecheck and dependency boundaries, build, and exact 131-export package import. Each child feature reached two-model review convergence before this epic review.

## Other agent review

- Phase 1 completeness: Z.AI GLM 5.2 xhigh approved the complete five-feature architecture and foundation alignment.
- Phase 2 contract quality: GPT-5.6 Sol high reproduced a cross-feature source-binding bypass in which inspection accepted a resolved Git revision different from the catalog's authoritative SHA or SHA-shaped ref.
- Accepted: blocker; it violates immutable selector and source/content handoff guarantees. Tracked by `epic-foreign-plugin-model-review-hardening`.

## Review findings

The epic review-hardening story is done. Inspection now applies materialization's exact selector precedence for Git and Git-subdirectory sources: explicit SHA, otherwise SHA-shaped ref, otherwise immutable named-ref resolution. End-to-end regressions cover both bypass forms and valid cases. Independent integrated verification passes 354 tests plus clean typecheck and dependency boundaries, build, and exact 131-export package import.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Full epic two-model convergence. GLM 5.2 completeness and GPT-5.6 Sol contract-quality certifications independently reproduced the pinned-revision bypasses and approved current HEAD. Both Git source kinds reject wrong explicit-SHA and SHA-ref revisions, accept valid exact/named-ref resolutions, and preserve the aggregate catalog→materialization→inspection→compatibility contracts. Full suite: 354 tests, clean typecheck and dependency boundaries, build, exact 131-export package import.
