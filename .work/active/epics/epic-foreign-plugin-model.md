---
id: epic-foreign-plugin-model
kind: epic
stage: drafting
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

## Anticipated child features

- TypeScript 7 package and validation foundation
- normalized marketplace, source, identity, component, and provenance contracts
- secure Git, marketplace-relative, and npm source materialization
- Claude marketplace and manifest ingestion
- Codex marketplace and manifest ingestion
- dual-format reconciliation and Agent Skills validation
- compatibility inventory and diagnostic reporting

<!-- The design pass on each child feature will fill in real specifics. -->
