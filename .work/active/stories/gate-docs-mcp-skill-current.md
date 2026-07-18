---
id: gate-docs-mcp-skill-current
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

# Update the MCP adapter reference skill

Keep the upstream 2.11.0 analysis as historical baseline, but replace the planned/unpublished project-decision section with exact maintained package, programmatic export, immutable receipt, production availability, upstream PR, and fail-closed qualification truth.

## Implementation notes
- Execution capability: inline prose; the existing reference skill and immutable source receipt supplied the complete bounded surface.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `.agents/skills/pi-mcp-adapter-v2/SKILL.md`.
- Tests added/removed: none; exact current-fact checks cover the reference update.
- Simplification: replaced the obsolete authorization/plan section in place while retaining the dated upstream 2.11.0 baseline.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked package, export, SRI, tree digest, release/tag/base commits, license/ranges, and fail-closed loader behavior against `src/runtime/mcp/pi-mcp-adapter-package.ts`, the lockfile, and production qualification tests.
- Cross-checked upstream PR #191 URL, base, and head against the completed upstream-contribution evidence.
- Exact current-fact greps and `git diff --check` passed.
- Bounded inline review confirmed the upstream baseline and dated research link remain intact and the project section no longer describes unpublished or merely planned bytes.
