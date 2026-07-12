---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening-3
kind: story
stage: implementing
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-review-hardening-2]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Close Nested Policy and GitHub Grammar Gaps

## Scope

Close two residual blockers reproduced by the final adversarial marketplace review.

## Required fixes

- Validate recognized nested MCP OAuth/authentication fields and plugin installation/policy fields by their actual foreign value types. Values such as `clientId: {}` and `installation: {}` must invalidate the complete entry at the deepest useful pointer while valid host declarations remain raw and auditable.
- Correct the lexical GitHub repository grammar so valid leading-dot repository names such as `.github` are accepted while empty names, dot segments, forbidden suffixes, control/URL syntax, extra path segments, and `.git` suffixes in any case remain rejected.
- Replace the incorrect regression that classifies `owner/.repository` as universally host-invalid with verified grammar examples.

## Acceptance criteria

- [ ] Malformed nested OAuth and installation-policy value types drop only their entry with exact diagnostics.
- [ ] Valid `.github`-style repository names map correctly; invalid GitHub shorthand remains rejected.
- [ ] Both Claude and Codex declaration registries receive equivalent malformed-nested regression coverage where fields overlap.
- [ ] Full `npm test`, build, boundaries, and compiled package import pass.
