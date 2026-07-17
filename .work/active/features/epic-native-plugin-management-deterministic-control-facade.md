---
id: epic-native-plugin-management-deterministic-control-facade
kind: feature
stage: drafting
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-trusted-installation, epic-native-plugin-management-lifecycle-sync-operations, epic-native-plugin-management-update-policy-offline-startup]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Deterministic Plugin Control Facade

## Brief

Expose every native management capability through one typed, deterministic application facade and one canonical `/plugin` argument grammar. The facade covers installed and marketplace listing, registration and refresh, browse and inspect, diagnostics, install, enable, disable, update, uninstall, project-sync, and automatic-update settings. It is the only application surface consumed by both scripted slash subcommands and the interactive manager.

Requests are scope-explicit, results and progress are schema-derived and stable, and no operation discovers missing input by opening a hidden prompt. Interactive decision providers are explicit dependencies supplied by the Pi manager; non-interactive invocation returns complete usage, missing-input, or unavailable-UI results.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Joins the marketplace, inspection, trusted-install, lifecycle/sync, and update-policy capability APIs after each behavior exists.
- Owns command parsing, canonical operation dispatch, request normalization, output/result serialization, cancellation handoff, and deterministic help/completion metadata.
- Does not own persistence, lifecycle policy, Pi command registration, terminal components, or alternate behavior for the TUI.

## Required grammar surface

- Manager default: `/plugin` (presentation adapter decides whether TUI is available).
- Installed/catalog reads: `list`, `browse`, `inspect`, `diagnose`.
- Marketplace control: `marketplace add|remove|list|refresh` and explicit foreign registration adoption.
- Lifecycle: `install`, `enable`, `disable`, `update`, `uninstall`, `project-sync`.
- Policy: automatic-update settings and status through deterministic subcommands.

Feature design may refine spelling and option placement once existing CLI conventions are inventoried, but it must preserve these capabilities, unambiguous scope/revision targeting, and one parser shared with argument completion.

## Capability boundaries

- Equivalent requests produce equivalent ordering, progress phase names, result categories, and exit semantics independent of TUI presence or object/map insertion order.
- Parse and validation failures have no side effects. Cancellation propagates one signal and preserves the underlying operation's honest committed/ambiguous result.
- Machine-readable details retain safe identities and diagnostic codes; human summaries are derived and never become authority.
- Secret/configuration values may enter only explicit input channels and are redacted from history, progress, help, completion, result serialization, and errors.
- The facade cannot bypass inspection, trust/configuration, compatibility, transaction, observation, or recovery services.

## Mockup inheritance

No rendering is owned here. Facade states and operations must be sufficient to reproduce the selected split inspector and signed-off install flow without UI-only business logic. The production mapping remains in `epic-native-plugin-management-pi-extension-manager`.
