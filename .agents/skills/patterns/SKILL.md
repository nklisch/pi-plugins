---
name: patterns
description: "Project code patterns and conventions. Auto-loads when implementing, designing, verifying, or reviewing code. Provides detailed pattern definitions with code examples."
user-invocable: false
allowed-tools: Read, Glob, Grep
---

# Project Patterns Reference

This skill contains detailed pattern documentation for this project. See individual pattern files for full details with code examples.

Available patterns:
- [schema-owned-boundary-contracts.md](schema-owned-boundary-contracts.md) — Derive public types from strict runtime schemas and parse every external boundary in both directions.
- [proof-before-reclaim-transactional-ownership.md](proof-before-reclaim-transactional-ownership.md) — Reclaim transactional resources only from exact ownership evidence; unknown ownership means defer or retain.
- [callback-scoped-sensitive-custody.md](callback-scoped-sensitive-custody.md) — Resolve secrets only inside revocable callbacks and explicitly dispose any lease that must outlive them.
- [complete-observation-before-publication.md](complete-observation-before-publication.md) — Publish runtime authority only after all participants provide exact, mutually consistent projection evidence.
- [registry-derived-control-planes.md](registry-derived-control-planes.md) — Define closed control vocabularies once and derive every parser, schema, projection, ordering, and documentation consumer.
- [verify-before-import-runtime-participants.md](verify-before-import-runtime-participants.md) — Keep executable packages inert until exact-tree receipts and complete runtime capabilities both pass.
- [owner-registered-aggregate-teardown.md](owner-registered-aggregate-teardown.md) — Register cleanup at acquisition, tear down in reverse ownership order, and aggregate rather than short-circuit failures.
