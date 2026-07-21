---
id: release-0.1.11
kind: release
stage: done
tags: []
parent: null
depends_on: []
release_binding: 0.1.11
gate_origin: null
created: 2026-07-21
updated: 2026-07-21
---

# 0.1.11

Hook boundaries fail open with a persistent failure log, and the plugin manager drops result read-outs for inline outcomes.

## Included work

- fail-open-hook-boundaries-and-inline-manager-outcomes

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, boundaries, 1697 unit tests, build, compiled imports, packed Pi RPC/JSON/PTY acceptance — all green.
- Golden E2E 13/13 (one environmental git-seed timeout, green on retry).

## Publication

- Shipped: 2026-07-21
- Mapping: tag-based
- Source commit: `1e189fe`
- Tag: `v0.1.11`
- GitHub Actions publish run: `29864534959`
- npm integrity: `sha512-BrEeEJPBjldi/9dEIN58Z12gDwvMH6GNKckuC44a2NJwwJCIbXzgyiKCkb1n9ILsChOD0aap7KIPHIa3MzHCnQ==`
- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v0.1.11
- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/0.1.11

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
