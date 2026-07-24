---
id: release-0.1.18
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: 0.1.18
gate_origin: null
created: 2026-07-24
updated: 2026-07-24
---

# 0.1.18

Pi minor releases no longer break the installed host, and red states explain themselves.

## Included work

- `widen-packaged-host-pi-range` (story, compatibility) — `PACKAGED_HOST_PI_RANGE`
  widened from a single-minor pin (`>=0.80.0 <0.81.0`) to major-only admission
  (`>=0.80.0 <1.0.0-0`). On Pi 0.81.x the 0.1.17 host failed qualification and
  collapsed every MCP capability to unavailable: MCP plugins (krometrail)
  showed a red "incompatible" badge and updates exited `unavailable (6)`.
  The structural ExtensionAPI shape check remains the fail-closed guard;
  adapters keep enforcing their own peer ranges.
- `red-reason-prose-and-verbosity-pass` (story, tui/prose) — red states name
  their reasons (unavailable capabilities by name + blocking summaries)
  instead of counts and exit-code jargon; confirmations dropped opaque ids;
  heading, install flow, and footers got quieter. Journey friction: `u`
  updates from the detail pane, Update leads the action menu, `r`/`x` refresh
  and remove marketplaces directly, the updates lens offers "Mark update
  read", and the install flow lands focus on Add after the last required
  value.

## Gate runs

- Pre-release review: complementary GLM-5.2 pass + focused adversarial
  GPT-5.6 pass, both ship-with-fixes. All findings fixed before tagging
  (1.0.0-prerelease cap, detail-pane stale-row substitution, optional-field
  focus over-fire, marketplace `r` parity, overflow dedupe).

## Candidate verification

- Local `npm test`: typecheck, boundaries (437 modules), 1718 unit tests,
  build, compiled package/Pi imports, isolated packed real-Pi 0.80.8
  RPC/JSON/PTY acceptance — all green.

## Publication

- Pending: `git push origin main v0.1.18` triggers the publish workflow.

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
