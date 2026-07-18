---
id: epic-native-plugin-management-pi-extension-manager-actions-progress-reload
kind: story
stage: done
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-install-trust-flow]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implementation notes

Implemented one serialized foreground action runner over canonical registry-derived facade argv. Installed lifecycle, complete install, marketplace, notice, project-sync, and operation-control intents retain exact hidden scope/snapshot/detail/token IDs. The frame sink preserves facade sequence and backpressure; the operation view bounds, wraps, scrolls, and terminal-projects accepted/progress/result output. Cancel sends one abort, enters cancelling state, and waits for the facade owner's final envelope. Stale/conflict invokes refresh without replay.

Potentially activating manager and raw `/plugin` subcommands open an exact process-local session/cwd handoff before execution. A claimed successor receives only a schema-validated JSON-safe envelope and destination; predecessor presentation stops immediately. Wrong sessions, duplicate slots, double claim/publish, non-reload shutdown, no successor, failures, and repeated cleanup are deterministic. Tests cover exact argv parity, ordered progress, one-shot cancellation, busy admission, stale no-replay, long output, width, and reload ownership/error paths. Full repository verification passed before this checkpoint advanced directly to done.
