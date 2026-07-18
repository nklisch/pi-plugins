---
id: epic-native-plugin-management-pi-extension-manager-integrated-acceptance
kind: story
stage: done
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-state-controller, epic-native-plugin-management-pi-extension-manager-split-inspector-tui, epic-native-plugin-management-pi-extension-manager-actions-progress-reload, epic-native-plugin-management-pi-extension-manager-notifications-session-lifecycle]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implementation notes

Extended packed-process acceptance to install the compiled package into an isolated offline consumer with exact Pi/Pi TUI peers, load the real default extension, register exactly `/plugin`, start the full local packaged host, execute empty `/plugin` through a typed TUI/custom-component harness, render the manager, discover resources, and shut down cleanly. Source construction tests also assert one command and no tool/shortcut surface. Existing clean-host control, persistence, signal, timeout, EPIPE, startup, resource, and package-boundary acceptance remains intact.

Across focused suites, 68 new manager/command/input/reload/notification/lifecycle tests cover raw argv, all Pi modes, reducer races, exact IDs/cursors, focus/keyboard/resize/theme, width/control/Unicode safety, signed install/trust hierarchy, secret non-retention, ordered progress/cancel, stale refresh, reload succession, collision, disposal, and packed discovery. Final `npm test` passed typecheck, dependency boundaries, 322 Vitest files / 1,547 tests with zero type errors, build, source and Pi export allowlists, and the isolated packed consumer. This checkpoint advanced directly to done.
