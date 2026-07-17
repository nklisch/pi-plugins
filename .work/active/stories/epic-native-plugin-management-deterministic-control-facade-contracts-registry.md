---
id: epic-native-plugin-management-deterministic-control-facade-contracts-registry
kind: story
stage: implementing
tags: [compatibility, api]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Define Native Control Contracts and Registry

## Checkpoint

Create the schema-derived grammar/result source of truth for every `/plugin` command. Define grammar/envelope versions, command IDs and typed requests, response schemas, operation handles, diagnostics, status and exit classifications, safety/input metadata, aliases, and deprecation metadata.

## Files

- `src/application/native-control-registry.ts`
- `src/application/native-control-contract.ts`
- `src/index.ts`
- focused contract, registry, public API, and compiled import tests

## Acceptance evidence

- Every feature grammar row exists exactly once with a unique path/alias, request/response schema, safety class, input class, and exit mapping.
- Types, command IDs, handler exhaustiveness, help/completion inputs, and response validation derive from the registry rather than copied unions.
- Strict JSON-safe envelopes reject impossible status/exit/operation/page combinations, arbitrary messages, native causes, class instances, and unknown fields.
- Existing trusted-install/lifecycle token schemas remain operation authority; no control session store or token is introduced.
- Numeric exits and semantic classifications are unique, bounded, versioned, and exported through an intentional allowlist.
