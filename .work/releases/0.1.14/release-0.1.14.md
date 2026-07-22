---
id: release-0.1.14
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: 0.1.14
gate_origin: null
created: 2026-07-22
updated: 2026-07-22
---

# 0.1.14

Plugins shipping Pi extensions are flagged plainly at review and after add, instead of silently installing without their tools.

## Included work

- flag-pi-extension-plugins

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, boundaries, 1699 unit tests, build, compiled imports, packed Pi RPC/JSON/PTY acceptance — all green.

## Publication

- Pending.

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
