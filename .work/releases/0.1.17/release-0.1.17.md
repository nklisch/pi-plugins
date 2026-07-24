---
id: release-0.1.17
kind: release
stage: done
tags: []
parent: null
depends_on: []
release_binding: 0.1.17
gate_origin: null
created: 2026-07-23
updated: 2026-07-24
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

- Shipped: 2026-07-24
- Mapping: tag-based
- Source commit: `5888148`
- Tag: `v0.1.17`
- GitHub Actions publish run: `30092531762`
- npm integrity: `sha512-DvWPfTJYq1F9ayrqceb1MxniD4PbNqRNrFQc08w2D4LzFtoijsC/SPYE3U/+fG1O1Blm/Y7D83gCIRrjog0Vfw==`
- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v0.1.17
- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/0.1.17

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
