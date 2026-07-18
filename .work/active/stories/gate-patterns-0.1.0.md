---
id: gate-patterns-0.1.0
kind: story
stage: done
tags: [patterns]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: patterns
created: 2026-07-18
updated: 2026-07-18
---

# Patterns extracted for 0.1.0

## New patterns codified

- `schema-owned-boundary-contracts` — strict runtime schemas own public types and bidirectional boundary parsing.
- `proof-before-reclaim-transactional-ownership` — uncertain ownership defers reclamation.
- `callback-scoped-sensitive-custody` — sensitive plaintext lives only inside revocable callbacks and leases.
- `complete-observation-before-publication` — all runtime participants must provide exact evidence before authority is published.
- `registry-derived-control-planes` — closed vocabularies derive parser, schema, projection, ordering, and docs.
- `verify-before-import-runtime-participants` — executable packages remain inert until byte and behavioral qualification.
- `owner-registered-aggregate-teardown` — cleanup registers at acquisition, runs in reverse, and aggregates failures.

## Inconsistencies flagged

None.

## Pattern files written

- `.agents/skills/patterns/*.md`
- `.agents/skills/patterns/SKILL.md`
- `.agents/rules/patterns.md`
