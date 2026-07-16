---
id: epic-skills-hook-runtime-skill-discovery
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-projection-reload-evidence]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Deterministic Skill Resource Discovery

## Brief

Activate every supported skill from the verified runtime snapshot through Pi's `resources_discover` lifecycle. Resolve each normalized relative skill root beneath the immutable installed revision, retain its bundled scripts, references, and assets in place, and return a stable, deduplicated path order across enabled user and trusted current-project projections. Pi's native skill validation and collision behavior remain authoritative; a plugin skill never silently replaces an earlier resource.

Discovery must recompute on startup and reload, remove disabled, updated, uninstalled, or scope-inapplicable roots, and report missing, escaping, mutated, or unreadable roots as activation evidence failures rather than dropping them. Project resources are contributed only for the matching trusted Pi project context. This feature does not copy skills into Pi settings, reinterpret foreign manifests, manage plugin state, or implement `/plugin` interaction.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: parallel consumer of the verified projection/reload capability
- Runtime boundary: contributes skill paths only; lifecycle state and Pi's skill loader remain separate authorities

## Simplification opportunity

- Delete the need for generated Pi skill settings or copied skill trees: immutable installed content plus `resources_discover` is the only discovery path.

## Foundation references

- `docs/VISION.md` — Product promise; Native Pi experience
- `docs/SPEC.md` — Skills; Enablement
- `docs/ARCHITECTURE.md` — Skills adapter; Pi integration
- `docs/COMPATIBILITY.md` — Skills; Names and collisions

## UI alignment

No presentation surface. Skill invocation and collision behavior use Pi's native resource UX; `/plugin` ownership remains outside this epic.

<!-- The feature design pass will fill in interfaces, signatures, and implementation units. -->
