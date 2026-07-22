---
id: release-0.1.13
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: 0.1.13
gate_origin: null
created: 2026-07-22
updated: 2026-07-22
---

# 0.1.13

Failure text speaks plain language in the user's frame of reference; internal codes stay in the hook failure log.

## Included work

- plain-language-failure-text
- fix: scale vitest e2e test/hook timeouts with PI_PLUGIN_HOST_E2E_TIMEOUT_SCALE

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, boundaries, 1697 unit tests, build, compiled imports, packed Pi RPC/JSON/PTY acceptance — all green.

## Publication

- Pending.

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
