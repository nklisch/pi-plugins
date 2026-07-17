---
id: epic-native-plugin-management-inspection-diagnostics
kind: feature
stage: drafting
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Plugin Inspection and Actionable Diagnostics

## Brief

Provide one read-only management view for installed plugins and marketplace candidates. It combines exact source and revision identity, normalized component inventory, compatibility requirements, trust/configuration readiness, lifecycle state, update availability, runtime contribution health, and recovery status into deterministic, redacted inspection and diagnostic results.

The capability explains why an operation is available, blocked, stale, degraded, failed, or recovery-required and identifies the next safe action. It does not remediate, mutate state, expand secrets, contact remote MCP servers during startup, or render the Pi UI.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Consumes marketplace candidates from `epic-native-plugin-management-marketplace-discovery-adoption` and installed state/runtime evidence from packaged composition.
- Owns the management read model, stable diagnostic categories, safe detail expansion, operation eligibility facts, and cross-service aggregation.
- Reuses the completed plugin/marketplace inspection, compatibility, update-candidate, lifecycle observation, transition, and recovery contracts rather than creating another evaluator.

## Capability boundaries

- Candidate inspection and installed inspection share identity/provenance vocabulary while retaining their different authorities.
- Compatibility verdicts and runtime requirements come only from existing compatibility services and capability probes; presentation never turns an unavailable requirement into a warning-only path.
- Diagnostics distinguish acquisition, normalization, compatibility, trust/configuration, transition/recovery, local runtime registration, and live runtime health without exposing secret values, executable payloads by default, absolute custody paths, or native causes.
- Exact skill paths, hook commands, MCP processes/endpoints, and revision changes are available one disclosure level below a concise risk/health summary, matching the signed-off trust posture.
- Results sort deterministically and are suitable for both machine-readable subcommands and the interactive split inspector.
- Feature design should prefer a composed read model over new persisted status tables; live/derived status remains replaceable observation.

## Mockup inheritance

Use the detail hierarchy and persistent list/detail relationship from `.mockups/screens/epic-native-plugin-management-manager/option-1.html`. This feature supplies the data contract only. The Pi extension manager owns theme-aware rendering and interaction.
