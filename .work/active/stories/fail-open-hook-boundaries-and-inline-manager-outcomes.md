---
id: fail-open-hook-boundaries-and-inline-manager-outcomes
kind: story
stage: done
tags: [tui, compatibility]
parent: null
depends_on: []
release_binding: 0.1.11
gate_origin: null
created: 2026-07-21
updated: 2026-07-21
---

# Fail-open hook boundaries, hook failure log, and inline manager outcomes

User-reported: enabling agile-workflow made terminal messages register in
history but never reach the model; adding a plugin ended in a broken
scroll/read-out screen; removal dumped raw JSON and offered a confusing
keep-data variant; operation results parked on a read-out screen.

## Root causes

1. **UserPromptSubmit failed closed, silently.** Any planning failure or
   hook execution diagnostic made the input handler return
   `{ action: "handled" }`, which Pi interprets as "do not deliver to the
   model" — with zero user feedback. The same class existed at every other
   boundary: a broken hook could block all tool calls (PreToolUse), cancel
   compaction (PreCompact), or abort every subagent start/completion.
2. **One broken hook silenced healthy hooks.** The decision aggregator
   discarded every folded decision when any single handler produced a
   diagnostic.
3. **Install ended in a read-out result step** (in-flow activation-result
   screen, then a "Step 2/2" successor screen after reload) with broken
   scroll rendering.
4. **Uninstall offered keep-data** (which is just Disable) and the human
   projection fell back to `JSON.stringify(envelope.data)` for lifecycle
   commands — the raw JSON dump after removal.
5. **Every routine mutation parked on an operation-result view** until Escape.

## Changes

- Uniform best-effort hook policy: infrastructure failures (planning errors,
  timeouts, spawn failures, invalid output) never block prompts, tool calls,
  compaction, or subagent lifecycles. They warn once via notification and
  record to the failure log. `failClosed` removed from
  `HookOutputEventPolicyRegistry`. Explicit hook decisions (exit 2,
  `decision: block`, permission deny, stop) remain fully enforced; permission
  `ask` without UI still denies; aggregate-limit collapse remains total.
- Aggregator now folds healthy hooks' decisions alongside diagnostics
  instead of collapsing to diagnostics-only.
- Subagent coordinator runs children unhooked on hook failure (logged)
  instead of aborting; malformed requests and runtime disposal still abort.
- New `~/.pi/agent/plugin-host/logs/hooks.jsonl` failure log: bounded JSONL
  (512 KB, single rotation), control characters stripped, fire-and-forget so
  logging can never break a boundary. Records planning and execution failures
  with event, phase, code, plugin, component.
- Install flow: activation-result read-out deleted. Add applies and closes;
  the manager refresh flips the row available → installed; outcome lands as
  a one-line notification. Result screen survives only for recovery-required.
  Post-reload successor presentation is a notification on success; failures
  keep the inspectable view.
- Remove always deletes persistent data (`uninstall-keep` removed from the
  manager surface; CLI `--keep-data` facade option unchanged). New
  shortcuts: `d` enable/disable toggle, `x` remove, from list and detail.
- `nativeControlHumanLines` renders lifecycle results as concise lines and
  never dumps raw JSON for any command.
- Successful routine mutations return straight to the refreshed rows; only
  failures keep the operation-result view.

## Verification

- `npm run typecheck`, `npm run boundaries`: clean.
- Unit: 1697 passed. New coverage: fail-open adapter/runtime/coordinator
  behavior, aggregator fold-with-diagnostics, hook failure log (append,
  sanitize, rotate, never throws), `d`/`x` shortcuts, lifecycle human lines.
- Packed real-Pi RPC/JSON/PTY acceptance: passed (asserts the new
  `✓ Added demo@… · session reloaded` notification).
- Golden E2E 13/13 (one environmental git-seed timeout, green on retry).
