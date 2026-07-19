---
id: release-0.1.6
kind: release
stage: done
tags: [compatibility, reliability, ux]
parent: null
depends_on: [fix-metadata-claim-conflict-blocks-install, fix-runtime-projection-digest-mismatch-blocks-activation, fix-silent-install-failure-diagnostics]
release_binding: 0.1.6
gate_origin: null
created: 2026-07-19
updated: 2026-07-19
---

# 0.1.6

Patch release for maximum plugin compatibility with gentle degradation,
silent dual-host conflict resolution, clean cut-over state, and
human-readable install failures.

## Included work

- `fix-metadata-claim-conflict-blocks-install` — dual-host declaration
  conflicts resolve by precedence instead of blocking installs.
- `fix-runtime-projection-digest-mismatch-blocks-activation` — runtime
  desired-state reuses the stored install-time compatibility report, so
  policy-bearing plugins activate instead of landing in recovery-required.
- `fix-silent-install-failure-diagnostics` — failures surface in plain
  marketplace/plugin language with the host document and reason.
- Compatibility rules degrade to metadata-only except genuine security
  blocks; `hostPrecedence` config and `/plugin config host-precedence`;
  schema migration machinery removed in favor of clean cut-overs.

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, dependency boundaries, 338 files / 1,689 tests, build/import checks, and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance passed.
- End-to-end install verified against a live dual-root GitHub marketplace (agile-workflow and krometrail from nklisch/skills both install and list as ready).
