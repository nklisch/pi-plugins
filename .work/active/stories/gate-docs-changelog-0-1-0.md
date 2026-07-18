---
id: gate-docs-changelog-0-1-0
kind: story
stage: done
tags: [documentation]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: docs
created: 2026-07-18
updated: 2026-07-18
---

# Create the 0.1.0 changelog entry

Create `CHANGELOG.md` with a concise initial-release entry for `@nklisch/pi-plugins`: foreign marketplace support; whole-plugin skill/hook/MCP lifecycle; Pi manager and plugin-control/v1; maintained MCP/subagent integrations; transactional recovery and updates; egress/MCP/YAML hardening; and from-empty packed-registry acceptance. The release flow will present it for operator confirmation before shipping.

## Implementation notes
- Execution capability: inline prose; the release brief supplied a complete changelog structure without coordination needs.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `CHANGELOG.md`.
- Tests added/removed: none; changelog structure and requested-topic checks are sufficient.
- Simplification: grouped release work into logical features, fixes, security, and documentation instead of commit-level entries.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked each release claim against the current foundation docs, production package receipts, control registry, security boundaries, and final production E2E corpus.
- Verified exact `## v0.1.0` and `Features`, `Fixes`, `Security`, and `Documentation` sections; the entry contains eleven logical bullets rather than commit-by-commit prose.
- `git diff --check` passed.
- Bounded inline review found all commissioned topics represented once at release-note altitude and no version, publish, release-summary, or gate-control edits.
