---
id: plain-language-failure-text
kind: story
stage: done
tags: [tui, prose]
parent: null
depends_on: []
release_binding: 0.1.13
gate_origin: null
created: 2026-07-21
updated: 2026-07-21
---

# Plain-language failure text

User direction: errors must be human-understandable within the frame of
reference the user controls, and simple. UI text was leaking internal
vocabulary (`HOOK_AUTHORITY_REJECTED`, `CURRENT_PROJECT_MISMATCH`,
`run-recovery`, `activation-observation`, `rolled-back … restored`).

## Changes

- New `src/pi/plain-language.ts`: the single mapping from internal codes to
  plain phrases, plus moment names ("at session start", "on your message")
  and lifecycle phase names ("the post-install check"). Codes stay in
  `hooks.jsonl`; they no longer appear in UI text.
- Hook warnings read e.g. "agile-workflow@nklisch-skills's hook didn't run
  at session start — the plugin runtime wasn't ready yet. Continuing without
  it. Details: <log path>."
- Recovery result screen: "The plugin was installed, but Pi couldn't
  confirm it's working yet. It stopped during the post-install check. Press
  enter to finish setting it up — this is safe to retry."
- Install notifications, lifecycle human lines, and the operation result
  view use the same plain phrasing ("The change was undone", "things
  changed — refresh and try again", "setup didn't finish — run recovery").

## Verification

- Typecheck, boundaries clean; 1697 unit tests green (assertions now check
  plain text and the absence of codes); packed real-Pi acceptance green.
