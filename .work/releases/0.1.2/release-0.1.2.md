---
id: release-0.1.2
kind: release
stage: releasing
tags: [tui, compatibility, infra]
parent: null
depends_on: [simplify-plugin-manager-experience, fix-bundled-subagent-peer-resolution]
release_binding: 0.1.2
created: 2026-07-18
updated: 2026-07-18
---

# 0.1.2

Release `@nklisch/pi-plugins@0.1.2` as the plugin-manager usability and bundled-subagent activation patch.

## Included work

- `simplify-plugin-manager-experience` — replaces the protocol-shaped manager with My Plugins, Discover, Sources, Updates, and Health; adds source onboarding, state-sensitive actions, concise commands, useful command output, and stable framed confirmations.
- `fix-bundled-subagent-peer-resolution` — supplies Pi's existing coding-agent, AI, and TUI module identities to the receipt-verified bundled extension loader so one top-level installation activates qualified subagent interception.

## Verification

- Local `npm test`: typecheck, dependency boundaries, 336 files / 1,667 tests, build/import checks, and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance.
- Full local release E2E: 17 files / 57 tests passed, including golden manager, production presentation/security, concurrency, recovery, and from-empty registry journeys.
- Publication workflow evidence pending.
