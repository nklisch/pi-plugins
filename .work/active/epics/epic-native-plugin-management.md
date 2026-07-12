---
id: epic-native-plugin-management
kind: epic
stage: drafting
tags: [compatibility]
parent: null
depends_on: [epic-skills-hook-runtime, epic-mcp-runtime-integration]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Native Plugin Management

## Brief

This epic delivers the complete Pi-facing plugin experience. Users add marketplaces, browse and inspect plugins, understand compatibility, provide configuration and trust, and manage installation, synchronization, enablement, updates, and removal through one native `/plugin` surface.

The same application services power deterministic subcommands and the interactive manager. The experience covers user and project scopes, read-only foreign-state adoption, actionable diagnostics, universal update notifications, configurable automatic updates, offline-safe startup, and end-to-end packaged operation with no Claude or Codex installation.

This epic does not add new foreign component types or weaken compatibility validation. It presents and orchestrates the whole-plugin behavior delivered by the preceding runtime epics.

## Foundation references

- `docs/VISION.md` — Users, Product promise, Native Pi experience, Success
- `docs/SPEC.md` — Lifecycle operations, Foreign-state adoption, Performance and availability, Acceptance criteria
- `docs/ARCHITECTURE.md` — Pi integration, Presentation, Error model, Testing strategy
- `docs/COMPATIBILITY.md` — Marketplace behavior, Supporting plugin configuration, Update behavior

## Anticipated child features

- `/plugin` command grammar and application-service composition
- marketplace registration, listing, refresh, browsing, and inspection
- compatibility, capability, source, and revision detail views
- trust and plugin `userConfig` collection flows
- install, enable, disable, update, uninstall, and project-sync interactions
- foreign marketplace adoption experience
- universal update notifications and automatic-update settings
- diagnostics, non-interactive behavior, packaging, and clean-environment end-to-end acceptance

<!-- The design pass on each child feature will fill in real specifics. -->
