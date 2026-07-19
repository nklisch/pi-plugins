---
id: release-0.1.5
kind: release
stage: done
tags: [tui, perf]
parent: null
depends_on: [keep-plugin-manager-actions-inline]
release_binding: 0.1.5
gate_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# 0.1.5

Patch release for the unified, inline plugin catalog.

## Included work

- `keep-plugin-manager-actions-inline` — unifies installed and available plugins, keeps trusted installation inline, caches exact detail, and adds direct add/update/marketplace shortcuts.

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, dependency boundaries, 336 files / 1,669 tests, build/import checks, and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance passed.
- Complementary and focused adversarial GLM-5.2 reviews completed; accepted detail-failure, key-protocol, scope-choice, cache-invalidation, and stale-selection findings were fixed and covered.

## Publication

- Shipped: 2026-07-18
- Mapping: tag-based
- Source commit: `8ded674`
- Tag: `v0.1.5`
- GitHub Actions publish run: `29667414489`
- npm integrity: `sha512-fmT6+1yKouSypnoeb8Xmvd7x5BxQV7gTfxbT4UobSe/s2sBnMZUQXuVWpCmAxtBxZ9uI5RgrIiKolzH7bArXZQ==`
- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v0.1.5
- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/0.1.5

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.

| id | title | kind | archived_atop | git ref |
|----|-------|------|---------------|---------|
| keep-plugin-manager-actions-inline | Keep plugin manager actions inline | feature | — | `9632db3` |
