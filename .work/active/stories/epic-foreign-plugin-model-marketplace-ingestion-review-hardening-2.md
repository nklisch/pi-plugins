---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening-2
kind: story
stage: implementing
tags: [compatibility, security, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Close Remaining Marketplace Contract Gaps

## Scope

Resolve the three blockers and one important gap reproduced by the final adversarial convergence pass after initial hardening.

## Required fixes

- Replace permissive recursive object acceptance for known runtime/dependency fields with concrete host-aware declaration shapes. Reject empty objects, unknown-only objects, empty hook event declarations, and malformed server/dependency/plugin records atomically at the deepest useful pointer while preserving supported foreign declarations raw.
- Make `ProvenanceLocationSchema.pointer` enforce full RFC 6901 syntax: document root is `""`; non-root pointers are `/`-prefixed reference tokens whose `~` escapes are only `~0` or `~1`.
- Bind host-qualified retained metadata keys to the catalog label (`claude.*` only for Claude input, `codex.*` only for Codex input), in addition to provenance-host checks. Reject mixed/forged keys before reconciliation.
- Tighten GitHub shorthand case-insensitively against `.git` suffixes and use a documented owner/repository lexical grammar that rejects host-invalid owner forms without requiring network lookup.

## Acceptance criteria

- [ ] Empty, unknown-only, and malformed nested runtime/dependency objects drop only their entry; supported declaration shapes remain retained raw.
- [ ] Public provenance parsing rejects invalid or dangling RFC 6901 escapes while accepting root and escaped tokens.
- [ ] Host-mismatched metadata keys fail deterministically even when provenance claims the wrapper host.
- [ ] GitHub shorthand rejects `.git` in any case and invalid owner/repository lexical forms.
- [ ] Focused regressions plus full `npm test`, build, boundaries, and compiled package import pass.
