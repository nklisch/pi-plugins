---
id: hook-error-clarity-and-result-view-simplification
kind: story
stage: done
tags: [tui, compatibility]
parent: null
depends_on: []
release_binding: 0.1.12
gate_origin: null
created: 2026-07-21
updated: 2026-07-21
---

# Hook error clarity and result view simplification

Follow-up to fail-open-hook-boundaries-and-inline-manager-outcomes. The new
warning surfaced `HOOK_AUTHORITY_REJECTED` for agile-workflow's SessionStart
hook (one record in the fresh failure log), an agentic-research install
landed on a long opaque recovery-required screen, and the operation result
view's bottom-anchored scroll read as broken (arrows pushed lines off screen,
nothing selectable, Escape the only exit).

## Root causes

1. The guarded executor collapsed every `HookExecutionContextError` into
   `HOOK_AUTHORITY_REJECTED`, discarding the exact rejection code
   (`ACTIVE_BINDING_UNAVAILABLE`, `BINDING_MISMATCH`,
   `CURRENT_PROJECT_MISMATCH`, `INVALID_REQUEST`) — startup races and stale
   bindings were indistinguishable.
2. The activation-result screen (which only recovery-required reaches since
   0.1.11) re-dumped the full activation progress evidence the live frames
   had already shown, and never named the failing phase.
3. `PluginOperationView` anchored its window to the bottom with a manual
   scroll offset; arrow keys moved the window with no position indicator or
   selection model.

## Changes

- `createHookRuntimeDiagnostic` accepts an optional detail; the executor
  preserves the exact context rejection code in the diagnostic message, so
  `hooks.jsonl` records the real cause (e.g.
  `HOOK_AUTHORITY_REJECTED ... (ACTIVE_BINDING_UNAVAILABLE)`).
- Recovery-required result screen: states what happened, names the failing
  phase/code from owner progress evidence, and gives the exact next step
  (`run-recovery` press enter, or review the renewed session). The full
  progress re-dump is removed.
- `PluginOperationView`: scroll keys removed; the view always shows the live
  tail with a `… N earlier lines omitted` indicator; Escape cancels/closes.

## Verification

- Typecheck, boundaries clean; 1697 unit tests green; packed real-Pi
  RPC/JSON/PTY acceptance green.
