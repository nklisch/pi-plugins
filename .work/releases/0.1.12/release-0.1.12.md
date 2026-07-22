---
id: release-0.1.12
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: 0.1.12
gate_origin: null
created: 2026-07-22
updated: 2026-07-22
---

# 0.1.12

Hook failures record their exact cause, recovery screens name the failing phase, and result views drop the broken scroll.

## Included work

- hook-error-clarity-and-result-view-simplification
- fix: keep marketplaces hint in narrow manager footers (unshipped 0.1.11 follow-up)

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, boundaries, 1697 unit tests, build, compiled imports, packed Pi RPC/JSON/PTY acceptance — all green.
- CI on main green after the narrow-footer hint fix (see 0.1.11 notes).

## Publication

- Pending.

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
