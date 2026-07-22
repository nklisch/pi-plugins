---
id: release-0.1.12
kind: release
stage: done
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

- Shipped: 2026-07-22
- Mapping: tag-based
- Source commit: `b973617`
- Tag: `v0.1.12`
- GitHub Actions publish run: `29882803683`
- npm integrity: `sha512-aTvL3JbTIKlh9AWoDIzUdvmpV/YHEtTiw+dt7qMGYXOzOj46xeBxn5eqQZBgnS7YXxi3JSMaYaiYfIYY9IUmsg==`
- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v0.1.12
- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/0.1.12

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
