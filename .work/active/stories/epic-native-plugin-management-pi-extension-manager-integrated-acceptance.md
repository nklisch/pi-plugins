---
id: epic-native-plugin-management-pi-extension-manager-integrated-acceptance
kind: story
stage: implementing
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-state-controller, epic-native-plugin-management-pi-extension-manager-split-inspector-tui, epic-native-plugin-management-pi-extension-manager-actions-progress-reload, epic-native-plugin-management-pi-extension-manager-notifications-session-lifecycle]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Prove the compiled native manager against Pi 0.80.8

## Design checkpoint

Implement Unit 7 from the parent feature. Build typed Pi/TUI 0.80.8 fakes plus compiled packed-process acceptance for command registration, signed manager/install flow, keyboard/focus/responsive rendering, trust/secrets, progress/cancel, external state races, reload successor, notifications, headless modes, disposal, and terminal security.

Reuse schema-valid signed mock fixtures and existing facade/application seams. Do not duplicate compatibility, parser property, lifecycle transaction/recovery, update scheduler, or state-lock suites.

## Acceptance evidence

- Clean packed Pi 0.80.8 discovery runs offline without Claude/Codex or unpublished adapters and reaches the control facade only.
- TUI event traces cover all signed interactions, layouts, bindings, modal/focus paths, progress, and result variants.
- RPC/JSON/print/no-TTY behavior never opens custom UI or hidden input and preserves deterministic envelopes without corrupting protocols.
- Collision, sessions/processes, stale/concurrent state, terminal failure, reload/shutdown, secrets, ANSI/OSC/control/bidi/wide text, long output, and repeated disposal pass adversarial tests.
- Full `npm test`, boundary checks, build, export allowlists, and isolated packed consumer pass.
