---
id: epic-transactional-plugin-lifecycle-read-only-adoption
kind: feature
stage: drafting
tags: [security, compatibility, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-operations]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Read-Only Foreign-State Adoption

## Brief

Read supported Claude Code and Codex user-state locations to discover marketplace source declarations and return provenance-rich adoption candidates without requiring either CLI. Readers treat foreign files as untrusted, tolerate absent hosts, and never modify foreign state or read foreign installed-plugin caches for activation.

Accepted candidates copy source declarations only into Pi-owned state; foreign trust, credentials, caches, absolute materialized paths, plugin enablement, and activation decisions are never imported. Any selected installation or synchronization proceeds through the normal lifecycle operation, compatibility, trust, project-scope, and recovery boundaries. This feature does not implement adoption UI or bidirectional synchronization.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 4 import boundary — can proceed alongside recovery once normal lifecycle operations are stable
- Depends on lifecycle operations so accepted candidates cannot create an alternate install path
- Required guarantees: scope, data, network, security-boundary, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — Foreign-state adoption; Marketplace sources; Project scope
- `docs/ARCHITECTURE.md` — Standalone context; Trust; Pi integration
- `docs/COMPATIBILITY.md` — Foreign-state adoption; Explicit non-goals

## Existing contract references

- `src/domain/source.ts` — validated marketplace source declarations
- `src/domain/provenance.ts` — source-located claims
- `src/domain/errors.ts` — partial-success diagnostics and fatal boundary errors

## Late-bound feature decisions

Supported file discovery paths by platform/version, reader-specific schemas, missing/malformed-file fatality, duplicate/equivalent candidate merge rules, provenance shape, candidate-selection request contract, project-versus-user destination defaults, and deterministic import result remain for feature design. Readers must be read-only adapters and produce declarations, never operational state.

## UI alignment

No UI surface. Candidate selection and confirmation belong to `epic-native-plugin-management`.
