---
id: release-0.1.8
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: 0.1.8
gate_origin: null
created: 2026-07-21
updated: 2026-07-21
---

# 0.1.8

Plugin manager latency overhaul (multi-second steps down to ~200 ms), a flattened two-step add flow, and repaired inline input custody.

## Included work

- fix-plugin-manager-latency-and-add-flow

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: green — typecheck, boundaries, 339 files / 1689 unit tests, build, compiled imports, packed Pi 0.80.8 RPC/JSON/PTY acceptance.
- Golden E2E 13/13 and production E2E 12/12 locally, including the new PTY step-latency gate (manager open 76 ms, detail 201 ms, install session 153 ms, apply 406 ms; previously 3.4–8.4 s).

## Publication

- Pending.

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
