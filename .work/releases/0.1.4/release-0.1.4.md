---
id: release-0.1.4
kind: release
stage: done
tags: [tui, compatibility, perf]
parent: null
depends_on: [flatten-plugin-manager-ui]
release_binding: 0.1.4
gate_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# 0.1.4

Patch release for the flattened, responsive plugin catalog.

## Included work

- `flatten-plugin-manager-ui` — opens `/plugin` immediately, combines installed and discoverable plugins, deduplicates equivalent native-host and scope candidates, and keeps actions on one mounted two-layer surface.

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, dependency boundaries, 336 files / 1,662 tests, build/import checks, and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance passed.
- Fresh GLM-5.2 review completed; accepted lifecycle, pagination, confirmation, and filtered-selection findings were fixed and covered.

## Publication

- Shipped: 2026-07-18
- Mapping: tag-based
- Source commit: `d77871b`
- Tag: `v0.1.4`
- GitHub Actions publish run: `29665594758`
- npm integrity: `sha512-+JNG781wP5k+zYKsUQjrDKVTCaF0xiBgB0bwC61S9MQkA9VADgQBMA0TdZpj100sUlJS5HdAQXTBT43OXzwiqw==`
- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v0.1.4
- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/0.1.4

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.

| id | title | kind | archived_atop | git ref |
|----|-------|------|---------------|---------|
| flatten-plugin-manager-ui | Flatten the plugin manager UI | feature | — | 4e8ffd0 |
