---
id: epic-foreign-plugin-model-compatibility-reporting
kind: feature
stage: drafting
tags: [compatibility]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Complete-Bundle Compatibility Reporting

## Brief

Evaluate every normalized declaration in a plugin bundle and produce an inspectable compatibility report containing component-level verdicts, runtime requirements, warnings, source claims, and an activatable decision. The evaluator distinguishes supported behavior, harmless metadata-only declarations, conditional requirements, and incompatible runtime semantics across Agent Skills, command hooks, MCP servers, plugin configuration, paths, and unsupported host-native components.

Activatability is derived from the complete inventory: any incompatible runtime component or unavailable required capability prevents activation, with no partial-install mode. The report supplies precise diagnostic evidence for downstream inspection, trust, and lifecycle services, but it does not collect trust, activate resources, or own runtime adapter behavior.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: terminal capability consuming the fully normalized bundle and exposing the trusted understanding layer to downstream epics
- Design alignment: enforce honest complete-bundle compatibility and fail closed on unknown runtime behavior as fixed by the parent epic's `## Design decisions`

## Foundation references

- `docs/VISION.md` — Honest compatibility; Whole-plugin lifecycle; Compatibility boundary
- `docs/SPEC.md` — Component compatibility verdicts; Trust and security
- `docs/ARCHITECTURE.md` — Complete-bundle validation; Compatibility; Error model
- `docs/COMPATIBILITY.md` — Verdict terminology; Plugin manifests; Skills; Hook handlers and events; MCP server compatibility

<!-- The feature-design pass will fill in interfaces, signatures, and implementation units. -->
