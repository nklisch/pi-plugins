---
id: red-reason-prose-and-verbosity-pass
kind: story
stage: done
tags: [tui, prose]
parent: null
depends_on: []
release_binding: 0.1.18
gate_origin: null
created: 2026-07-24
updated: 2026-07-24
---

# Red-state reason prose, verbosity pass, and journey click audit

User direction after the krometrail/Pi-0.81 incident: red states must say
*why* in human terms ("the red messages on compatibility are odd to me"),
human-facing surfaces are too verbose overall, and every user journey should
be audited for clicks from choice to finish.

## Evidence (krometrail@nklisch-skills detail pane)

- `! incompatible · trust not-applicable` + `2 requirements · 4 diagnostics` —
  counts instead of reasons; `trust not-applicable` is internal vocabulary.
- `! unavailable · exit unavailable (6)` — exit-classification jargon on a
  human surface; no plain cause (update candidate evidence unavailable).
- Remove/marketplace confirmations dump opaque snapshot/detail/registration
  ids no human can act on.

## Changes

- Detail pane: replace requirement/diagnostic counts with named reasons —
  unavailable capabilities as `! <capability name> — unavailable`, plus
  blocking diagnostic summaries (deduped, capped, overflow counted). Trust
  only shown when it needs attention. Diagnostics that merely restate the
  status/requirement lines are not repeated.
- Envelope/operation rendering: drop `exit <classification> (<code>)` from
  human surfaces; one plain status clause; control codes map through
  `presentControlFailure`; progress frames use plain phase names.
- Confirmations: uninstall/marketplace-remove/project-sync say plugin,
  scope, and consequence in words; opaque ids removed.
- Install flow: drop the `Exact consent: <id>` line (stays in disclosure),
  "Live application.control progress" → plain progress wording.
- Failure presenter: operation-neutral selection-failure text (was
  install-centric), COMPATIBILITY_INCOMPATIBLE covers capability gaps too.
- Manager heading: update count only shown when nonzero; host health shown
  only when not ready (supersedes the always-on indicator from
  retire-orphaned-manager-views per the new verbosity direction).
- Marketplaces view: `r` refreshes the selected marketplace directly (was:
  detail → actions → refresh, 3 decisions).

## Audit

The journey click audit is reported in conversation; durable summary lives in
this item's completion notes.

## Audit summary (decisions = deliberate action keys/confirmations, excluding
plain typing and arrow navigation)

| Journey | Optimal path | Decisions |
|---|---|---|
| Add plugin (no config, one scope) | `a` → Enter | 2 |
| Add plugin (multi-scope) | `a` → Enter scope → Enter | 3 |
| Add plugin (required config) | `a` → per field (Enter, type, Enter) → navigate → Enter; secrets prompt masked at apply | 3 + fields |
| Update plugin | `u` → `y` (either pane) | 2 |
| Update plugin via detail menu | Enter → Enter → `y` (Update now leads) | 3 |
| Update all | `ctrl+u` | 1 |
| Enable/disable | `d` | 1 |
| Remove plugin | `x` → `y` | 2 |
| Add marketplace | `m` → `a` → Enter type → location → Enter ref → esc result | 5 |
| Refresh marketplace | `m` → `r` (was 4: detail → actions → refresh → esc) | 2 |
| Remove marketplace | `m` → `x` → `y` | 3 |
| Auto-update setup | updates lens → `p` → mode → cadence → `y` consent | 4 |
| Doctor | `/plugin doctor` → esc | 2 |
| Search | `/` → type → Enter | 1 |

Residual friction observed (not changed here): install flow keeps focus on
the last edited field instead of auto-advancing to Add; remove-marketplace
has no direct key; non-activating results (marketplace add/refresh) require
esc to dismiss even on success; notice-acknowledge is unreachable from the
manager since notice rows were retired.

## Verification

- `vitest run` — 1715 pass, 0 fail, including a new regression test
  replicating the krometrail scenario (two unavailable MCP requirements +
  incompatible status render as named reasons; no trust/count/exit jargon)
  and a plain-language envelope failure test.
- `tsc --noEmit` clean; dependency boundaries clean (437 modules).
- `npm run test:package` — build, compiled imports, packed real-Pi 0.80.8
  RPC/JSON/PTY acceptance all green.
