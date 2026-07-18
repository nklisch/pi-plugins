---
id: release-0.1.1
kind: release
stage: done
tags: [compatibility, infra]
parent: null
depends_on: []
release_binding: 0.1.1
created: 2026-07-18
updated: 2026-07-18
---

# 0.1.1

Released `@nklisch/pi-plugins@0.1.1` from commit `d932b86` and tag `v0.1.1`.

## Included work

- `fix-global-marketplace-registration-defaults` — made marketplace registration host-global, defaulted GitHub shorthand, removed marketplace scope flags, and projected global catalogs into independently scoped plugin candidates.
- `fix-configuration-store-concurrent-initialization` — installed SQLite busy policies before locking initialization and for shared revision-lease writes exposed by release CI.

## Verification

- Local: typecheck, dependency boundaries, 333 unit/integration files (1,655 tests), package build/import/pack acceptance, 57 full E2E tests, and focused project/global marketplace journeys.
- GitHub Actions publish run `29654576298`: `npm ci`, complete `npm test`, and OIDC provenance publication succeeded.
- npm registry integrity: `sha512-1qvBjxSpN+Zo84dCt64g5/G6zssIyI9RVMG1TJyhDFW5UgZK++ZIAnQXq1uAmTqvK++zWNYFUkc9DfG4mFfj4w==`.

## Release links

- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v0.1.1
- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/0.1.1
