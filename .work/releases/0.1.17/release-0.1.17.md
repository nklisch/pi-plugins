---
id: release-0.1.17
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: 0.1.17
gate_origin: null
created: 2026-07-23
updated: 2026-07-23
---

# 0.1.17

Update UX in the plugin manager: confirmations you can actually accept with one
key, a global auto-update setup, Update all in the updates lens, and a manager
consolidated down to the two views that were ever reachable — Plugins and
Marketplaces.

## Included work

- simplify-update-confirmation-and-auto-updates
- retire-orphaned-manager-views

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, boundaries, 338 unit files / 1705 tests, build, compiled imports, packed Pi 0.80.8 RPC/JSON/PTY acceptance — all green.

## Publication

- Pending.

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
