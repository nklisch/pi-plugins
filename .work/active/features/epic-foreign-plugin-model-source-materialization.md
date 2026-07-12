---
id: epic-foreign-plugin-model-source-materialization
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-domain-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Secure Source Materialization

## Brief

Resolve and materialize every supported marketplace and plugin source form into inspectable local content with a canonical source identity and immutable revision. The capability covers GitHub shorthand, HTTPS and SSH Git, local Git checkouts, marketplace-relative paths, Git subdirectories, ref and SHA selection, and npm packages or selectors from HTTPS registries. Acquisition remains cancellable and isolated behind filesystem, Git, and npm ports.

Materialization fails closed on path traversal, escaping symlinks, ambiguous revisions, unknown source kinds, and unsafe npm behavior; npm lifecycle scripts never run. This feature produces secure immutable content and source metadata, but does not interpret marketplace or plugin manifests, derive compatibility, or manage installed lifecycle state and caches owned by the transactional-lifecycle epic.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: parallel producer after the canonical contracts; plugin-bundle ingestion consumes its materialized roots
- Design alignment: use canonical source forms, secure containment, immutable revisions, and standalone adapters as fixed by the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Marketplace sources; Marketplace entries; Trust and security; Performance and availability
- `docs/ARCHITECTURE.md` — Source acquisition; Source ports; Concurrency
- `docs/COMPATIBILITY.md` — Marketplace discovery; Plugin source forms

<!-- The feature-design pass will fill in interfaces, signatures, and implementation units. -->
