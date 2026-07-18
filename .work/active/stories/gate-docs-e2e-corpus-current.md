---
id: gate-docs-e2e-corpus-current
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

# Update foundation E2E acceptance claims

Replace superseded `nklisch/skills` and independent-third-party corpus claims with the actual final acceptance: from-empty packed installation, exact maintained-package receipts, complete revision-bound production bundle, lifecycle/runtime observation, contention/recovery/security, offline restart, and uninstall absence.

## Implementation notes
- Execution capability: inline prose; the final production E2E corpus replaces two stale foundation assertions as one acceptance narrative.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `docs/ARCHITECTURE.md`, `docs/SPEC.md`.
- Tests added/removed: none; this story documents the already-landed final production corpus.
- Simplification: removed superseded repository/fixture claims rather than appending an acceptance history.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked the lifecycle, runtime observation, drift, recovery, contention, presentation/security, offline, and uninstall assertions against the four production E2E files and `test/e2e/production/final-packed-registry.e2e.test.ts`.
- Cross-checked maintained package names, versions, and receipt assertions against the final packed registry test and lockfile.
- Exact stale-corpus rejection/current-corpus greps and `git diff --check` passed.
- Bounded inline review found no claim broader than the final production tests and no retained `nklisch/skills` or independent-third-party acceptance assertion.
