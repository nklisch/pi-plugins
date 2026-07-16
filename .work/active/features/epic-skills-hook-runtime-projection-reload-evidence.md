---
id: epic-skills-hook-runtime-projection-reload-evidence
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Skill and Hook Projection with Reload Evidence

## Brief

Make the lifecycle's complete `PluginRuntimeProjection` consumable by the Pi runtime without creating a second authority. The capability prepares and verifies the full scope/plugin/revision-bound projection cache, resolves immutable plugin content and stable data roots through injected lifecycle ports, and derives one deterministic runtime snapshot for this epic's skill and hook components. MCP entries remain present and hash-bound for the sibling MCP adapter; this feature neither interprets nor activates them.

Expose exact skill/hook contribution evidence for activation, deactivation, and reload observation. Evidence remains keyed to the complete projection digest so native composition can combine it with the MCP contribution before satisfying `LifecycleReloadPort`; this feature never treats a successful reload request or its own component slice as proof that the whole bundle is active. User/project scope, current project identity, and Pi project trust remain explicit, while authoritative state reads, credential adapters, reload orchestration, and recovery stay with their existing owners.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: foundation capability — skill discovery and hook adaptation consume its verified runtime snapshot
- Complete-bundle boundary: preserves all skill, hook, and MCP inventory while owning only skill/hook runtime evidence

## Simplification opportunity

- Reuse the existing projection digest/reference, immutable generated-root support, content/data resolvers, and lifecycle observation vocabulary instead of creating per-component state, projection pointers, or reload protocols.

## Foundation references

- `docs/SPEC.md` — State contract; Install transaction; Enablement
- `docs/ARCHITECTURE.md` — Runtime projections; Runtime activation; Installation transaction
- `docs/COMPATIBILITY.md` — Whole-plugin behavior; Plugin path environment

## UI alignment

No presentation surface. `/plugin` management and reload feedback belong to `epic-native-plugin-management`; no mockups apply.

<!-- The feature design pass will fill in interfaces, signatures, and implementation units. -->
