---
id: epic-transactional-plugin-lifecycle-operations-contracts-preparation
kind: story
stage: review
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-operations
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Define lifecycle contracts and candidate preparation

## Scope

Implement Unit 1 of the parent design. Add schema-derived whole-plugin operation, runtime projection, transition, reload-observation, operation-id, and installed-revision-loader contracts. Implement install/update/enable candidate preparation by composing the completed materialization, inspection, compatibility, trust/configuration, installed-state, and projection contracts. Do not mutate authoritative state, promote content, call reload, implement Pi/runtime adapters, prompt for trust/configuration, or implement recovery.

## Required files

- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-candidate-preparation.ts`
- `src/application/ports/installed-plugin-loader.ts`
- `src/application/ports/runtime-projection.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/application/ports/lifecycle-transition-store.ts`
- `src/application/ports/lifecycle-operation-id.ts`
- matching application tests

## Design constraints

- Derive operation/origin/projection/observation/outcome variants from one registry/schema source.
- Active projections contain only scope, plugin, revision, logical content/data/config refs, normalized skill/hook/MCP declarations, and a verified digest/ref—never paths, expanded values, secrets, Pi objects, or reload observations.
- Deactivation is one canonical scope/plugin tombstone, not three component-removal requests.
- Install/update compose existing materializer, inspector, compatibility, trust/configuration, installed-record, content-store, and projection contracts; enable uses `InstalledPluginLoader` then the same readiness/projection logic.
- Exact trust and configuration are prerequisites. Return typed rejection and discard staging rather than prompting or carrying a process-local approval workflow.
- Parse and compare all adapter handoffs, but follow the practical review bar: no machinery for deliberately contract-violating same-user adapters beyond ordinary schema/evidence checks.
- Application/port files import no Node, filesystem, Pi, runtime, formats, infrastructure, clock, or random APIs.

## Acceptance criteria

- [ ] Projection digest/ref deterministically changes with scope, revision/ref, runtime component behavior, or configuration reference and rejects forged evidence.
- [ ] Inactive expectation is deterministic, scope-qualified, and cannot alias active evidence.
- [ ] Transition records bind operation id/kind/origin, before/candidate/final state, generation, projection expectation, pending ref, and uninstall retention intent without paths or secrets.
- [ ] Install/update preparation completes materialization, inspection, compatibility, exact trust, configuration readiness, installed-record derivation, and projection preparation before returning.
- [ ] Enable verifies a loader handoff against the exact selected installed revision and reuses the same trust/configuration/projection checks.
- [ ] Every pre-commit rejection, failure, or cancellation leaves state untouched and explicitly discards owned staging.
- [ ] Focused contract/preparation tests protect these boundaries without duplicating source, trust, secret, compatibility, or promotion test matrices.

## Implementation notes
- Execution capability: direct host implementation; the contracts and preparation path share one portable application boundary and the caller prohibited agents.
- Review weight: standard, caller did not override the project default.
- Files changed: `src/application/plugin-lifecycle-contract.ts`, `src/application/plugin-candidate-preparation.ts`, `src/application/ports/installed-plugin-loader.ts`, `src/application/ports/runtime-projection.ts`, `src/application/ports/lifecycle-reload.ts`, `src/application/ports/lifecycle-transition-store.ts`, `src/application/ports/lifecycle-operation-id.ts`, `test/application/plugin-lifecycle-contract.test.ts`.
- Tests added/removed: projection digest/reference, inactive tombstone, and transition-reference contract tests.
- Simplification: one registry-backed contract surface and one preparation path; no component-specific activation or retry machinery.
- Discrepancies from design: preparation returns typed rejection evidence and keeps successful staging ownership for the later guarded promotion window; concrete adapters remain unimplemented as designed.
- Adjacent issues parked: none.
