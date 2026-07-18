---
id: gate-docs-secret-custody-current
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

# Correct sensitive configuration custody claims

Replace SPEC and COMPATIBILITY assertions that production sensitive values use an OS credential store. Current production custody is unavailable because atomic no-replace ownership cannot be proven; required sensitive activation fails closed and plaintext remains absent from durable/output surfaces.

## Implementation notes
- Execution capability: inline prose; the same production custody assertion appeared in two foundation documents.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `docs/SPEC.md`, `docs/COMPATIBILITY.md`.
- Tests added/removed: none; existing production secret non-retention E2E is the behavioral evidence.
- Simplification: replaced both stale OS-store assertions in place without adding history prose.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked unavailability and its atomic no-replace rationale against `src/infrastructure/secrets/create-platform-secret-store.ts` and `src/infrastructure/secrets/unavailable-secret-store.ts`.
- Cross-checked `SECRET_CUSTODY_UNAVAILABLE` and plaintext non-retention against trusted-install configuration tests and `test/e2e/production/concurrency-presentation-security.e2e.test.ts`.
- Exact stale-phrase rejection, fail-closed/plaintext-free greps, and `git diff --check` passed.
- Bounded inline review confirmed both standing documents now state current custody behavior without historical qualification or a false available backend.
