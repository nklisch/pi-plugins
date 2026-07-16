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

- `/plugin` command grammar and application-service composition, including concrete `LifecycleStateStore`, credential/secret, configuration-path/write-id, inventory, recovery-artifact, and project-root adapters required for packaged operation
- marketplace registration, listing, refresh, browsing, and inspection
- compatibility, capability, source, and revision detail views
- trust and plugin `userConfig` collection flows
- install, enable, disable, update, uninstall, and project-sync interactions
- foreign marketplace adoption experience
- universal update notifications and automatic-update settings
- diagnostics, non-interactive behavior, packaging, and clean-environment end-to-end acceptance

<!-- The design pass on each child feature will fill in real specifics. -->

## Design decisions

- **Default manager entry**: `/plugin` opens on the installed-plugin overview. Marketplace browsing remains an adjacent manager view rather than the default landing surface.
- **Manager composition**: Use the split-inspector direction: a persistent plugin list beside detailed health, revision, component, and lifecycle information. This preserves context while supporting fast keyboard navigation.
- **Installation journey**: Use a three-step sequence — choose and inspect, combined configuration and trust, then activation result. This favors a shorter committed path over a five-step wizard.
- **Trust disclosure**: Lead with a concise risk summary and keep exact skill paths, hook commands, MCP processes, endpoints, and revision changes expandable one level beneath it.
- **Update visibility**: Emit one calm Pi notification for each newly discovered revision and retain an update-count badge in the manager until the update is resolved.
- **Visual integration**: The production manager owns no palette or font. It consumes Pi's active semantic theme and terminal typography. The static mocks use the operator's current Catppuccin Mocha setup, with Latte as the light reference, solely to approximate Pi outside the TUI.
- **Discovery posture**: Direct-read only — this is a greenfield presentation surface with behavior already constrained by the foundation documents; interactive mockups provide the needed alignment signal.

## Mockups

- Design system: `.mockups/design-system/`
  - Palette: active Pi semantic theme; Catppuccin Latte/Mocha static reference
  - Typography: inherited Pi terminal monospace
  - Tokens locked: 2026-07-11
- Manager screens: `.mockups/screens/epic-native-plugin-management-manager/index.html`
  - Selected: option 1, Split inspector — 2026-07-11
- Install flow: `.mockups/flows/plugin-install/index.html`
  - Steps: `01-choose-inspect` → `02-configure-trust` → `03-activation-result`
  - Topology: sequential
  - Signed off: 2026-07-11
