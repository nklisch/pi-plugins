---
id: gate-docs-subagent-skill-current
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

# Update the subagent lifecycle reference skill

Keep upstream 18.0.3 analysis as baseline, but replace planned/unavailable project text with exact published `@nklisch/pi-subagents@18.0.4-nklisch.0`, bundled receipt-gated loading, production availability, upstream PR, and fail-closed drift behavior.

## Implementation notes
- Execution capability: inline prose; the reference skill and immutable runtime receipt were a cohesive bounded surface.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `.agents/skills/pi-subagents-v18/SKILL.md`.
- Tests added/removed: none; exact current-fact checks cover the reference update.
- Simplification: replaced the obsolete fallback plan in place while retaining the dated upstream 18.0.3 baseline.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked package, bundled resource, root export, SRI, tree digest, release/tag/base commits, license/ranges, and fail-closed loading against `package.json`, `package-lock.json`, `src/runtime/subagents/pi-subagents-package.ts`, and lifecycle qualification.
- Cross-checked upstream PR #614 URL, base, and head against completed upstream-contribution evidence.
- Exact current-fact greps and `git diff --check` passed.
- Bounded inline review confirmed the upstream baseline and dated research link remain intact and the project section no longer describes planned or unavailable maintained bytes.
