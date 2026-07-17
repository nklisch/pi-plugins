---
id: epic-native-plugin-management-pi-extension-manager-actions-progress-reload
kind: story
stage: implementing
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-install-trust-flow]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Wire actions, progress, cancellation, and reload succession

## Design checkpoint

Implement Unit 5 from the parent feature. Route every manager mutation through canonical control commands; display accepted/progress/result frames exactly; serialize foreground mutations; preserve owner result precedence on cancel; refresh stale evidence without replay; and transfer final safe envelopes across Pi reload through an exact process-local session/cwd handoff.

The predecessor must never touch stale `pi`, command context, session manager, component, or overlay after reload. The successor creates fresh UI state and refreshes authority before rendering the transferred result.

## Acceptance evidence

- Facade spies prove manager and subcommands produce equivalent commands, frames, diagnostics, and envelopes with no lower-service import.
- External races, stale IDs/tokens, no-change, offline, blocked, rollback, partial, recovery, long output, and broken terminal paths remain truthful and bounded.
- Escape sends one abort, shows cancelling, and waits for stronger owner evidence.
- Reload success/failure/no-successor/wrong-session/double-claim/new-resume-fork-quit tests leave no stale context use, unresolved handoff, overlay, or controller.
