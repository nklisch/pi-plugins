---
id: gate-docs-mcp-adapter-current
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

# Update architecture for the active MCP adapter

Replace future-tense production-adapter claims in `docs/ARCHITECTURE.md` with current truth: exact published `@nklisch/pi-mcp-adapter@2.11.0-nklisch.0`, receipt/tree/API/range/conformance qualification, and fail-closed pre-execution drift behavior.

## Implementation notes
- Execution capability: inline prose; one current architecture assertion and its repository receipts formed a cohesive write set.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `docs/ARCHITECTURE.md`.
- Tests added/removed: none; the story changes standing documentation only.
- Simplification: replaced the superseded future qualification paragraph in place.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked package/version/integrity against `package.json` and `package-lock.json`, and the full immutable receipt against `src/runtime/mcp/pi-mcp-adapter-package.ts`.
- Cross-checked pre-execution rejection against `createVerifiedPiMcpRuntimeCandidate` and the production package-drift E2E.
- `git diff --check` and exact package/fail-closed documentation greps passed.
- Bounded inline review found no stale future-tense production claim or missing receipt qualifier in the replaced architecture section.
