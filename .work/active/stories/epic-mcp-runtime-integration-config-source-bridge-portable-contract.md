---
id: epic-mcp-runtime-integration-config-source-bridge-portable-contract
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: []
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Define the Portable MCP Runtime Contract

## Priority

High; implementable now and the first internal handoff checkpoint.

## Deliverable

Create the strict, schema-derived Plugin Host MCP source lifecycle contract in `src/application/ports/mcp-runtime.ts`. It defines exact source identity (`scope + plugin + revision + projectionDigest`), secret-free source/server projections, source-qualified redacted status, complete runtime capability facts, typed validate/replace/remove outcomes, the late launch-value provider, and `McpRuntimePort`.

Update the explicit public barrel and compiled-package allowlist for portable schemas/types/port only. Keep fake, conformance, concrete adapter, Pi extension, and package-selection symbols internal.

## Planned files

- `src/application/ports/mcp-runtime.ts`
- `src/index.ts`
- `test/application/mcp-runtime-contract.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Contract checkpoints

- Source transports are exactly `stdio | streamable-http`; explicit SSE and WebSocket cannot parse as bridge sources.
- Sources are strict, non-empty, JSON-safe, and carry only source locations as provenance. Raw declaration payloads, expanded configuration, credentials, callback values, and native causes are absent.
- Replacement carries an expected prior projection digest and produces `applied | stale | rejected` evidence. Removal produces `removed | absent | ownership-mismatch` evidence from exact identities.
- `validateSource`, every lifecycle/inspection operation, capability reporting, and provider resolution receive `AbortSignal`.
- `McpLaunchValues` is the only type-only public data shape because it is immediate plaintext custody; every serializable public value remains inferred from strict Zod schemas.
- Expected validation failures use the existing diagnostic contract. Unexpected adapter failures use `BoundaryError`/`ADAPTER_FAILED`; cancellation propagates unchanged.

## Acceptance evidence

- [ ] Strict schema tests reject unknown fields, empty sources, duplicate component ids, unsupported transports, functions, and non-JSON templates.
- [ ] Exact identity tests isolate user/project scopes, plugin keys, revisions, and projection digests despite colliding native server names.
- [ ] Status/result round trips prove source qualification, deterministic server ordering, and redaction.
- [ ] Public API type tests prove schema inference and the explicit barrel/compiled export allowlist changes from the 438-export baseline.
- [ ] No source code imports `pi-mcp-adapter`, Pi APIs, Node built-ins, or runtime/composition modules from this application port.

## Ordering

No sibling dependencies. Capability mapping, the fake, and downstream internal MCP features may build on this checkpoint. Production adapter availability is not required.

## Risk and rollback

The main risk is overfitting the application port to a future package API. Keep names and results in Plugin Host vocabulary and absorb package naming in one future wrapper. If a later package cannot preserve these semantics, leave MCP unavailable rather than weakening the port. Rollback is removal of this unconsumed portable surface before downstream adoption; it does not touch state or runtime behavior.

## Blocker ownership

None. Plugin Host maintainers own implementation and verification. Current `pi-mcp-adapter` absence does not block this story.

## Implementation notes

- Execution capability: Luna xhigh; the public contract crosses scope, ownership, cancellation, and secret-custody boundaries.
- Review weight: standard (caller explicitly requested no feature review; this child checkpoint was verified directly).
- Files changed: `src/application/ports/mcp-runtime.ts`, `src/index.ts`, `test/application/mcp-runtime-contract.test.ts`, `test/public-api.test.ts`, `test/compiled-package-import.mjs`.
- Tests added/updated: strict schema, identity, redaction, typed-result, cancellation/provider-shape, type-inference, and compiled export-allowlist coverage.
- Simplification: one source-lifecycle port keeps adapter/package choice, process ownership, and transport internals outside application callers.
- Discrepancies from design: result schemas use explicit `status`, `currentIdentity`, and identity-bearing ownership mismatch fields; the semantics remain the designed applied/stale/rejected and removed/absent/mismatch contract.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`; `npm run test:unit -- --run test/application/mcp-runtime-contract.test.ts test/public-api.test.ts`; both passed with 12 tests and no type errors. Dependency boundaries were checked before the checkpoint commit.
