---
id: release-0.1.4
kind: release
stage: quality-gate
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

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.

| id | title | kind | archived_atop | git ref |
|----|-------|------|---------------|---------|
| flatten-plugin-manager-ui | Flatten the plugin manager UI | feature | — | 4e8ffd0 |
