---
id: epic-mcp-runtime-integration-lifecycle-reconciliation-reconciliation-participant
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-lifecycle-reconciliation
depends_on: [epic-mcp-runtime-integration-lifecycle-reconciliation-portable-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Implement Exact MCP Source Reconciliation and Observation

## Checkpoint

Implement one stateless, target-scoped MCP lifecycle participant over the portable runtime port. Native composition supplies exact `from` and `to` states derived from existing lifecycle/projection authority; the participant validates scope/plugin/project/capability bindings, performs at most one exact source replace/remove, independently inspects local registration, and emits strict MCP contribution/status evidence.

The participant does not read or mutate authoritative state, transition records, journals, recovery status, Pi settings, or transport internals. Reconcile success remains non-evidence; `observe` repeats inspection.

## Planned files

- `src/runtime/mcp/lifecycle-participant.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/index.ts`
- `test/runtime/mcp/lifecycle-participant.test.ts`
- `test/application/runtime-contribution-observation.test.ts`

## Required behavior

- Represent each lifecycle side as active `source`, active `none`, or `inactive`, with complete projection expectations and exact MCP projection/capability evidence.
- Verify `from` and `to` share one exact scope/plugin owner; project scope requires matching current project and current trust.
- Cross-check owner-filtered `inspectSources` with `inspectSource`; duplicate, malformed, or disagreeing evidence is ambiguous.
- Treat exact target as idempotent. Replace only from exact/verified absence under required CAS. Never overwrite/remove a third identity.
- Reconcile all complete-source transitions: source/source, source/none, none/source, none/none, inactive/source, inactive/none, source/inactive, and no-op inactive cases.
- Accept source observation only for exact identity, registration digest, registered source state, and sorted server key/component/native-key/provenance inventory.
- Keep per-server connection/tool/launch health outside contribution identity.
- Add strict `McpContributionObservationSchema`; `composeActivationObservation` may no longer accept a generic MCP base observation.
- Return only safe static failed/ambiguous/stale/cancelled results and a redacted status surface.

## Acceptance evidence

- [ ] Exact active source, active no-MCP, and inactive observations bind scope/plugin/revision/complete projection digest/current project and contribution digest.
- [ ] No-MCP never creates an empty source; source-to-none removes the previous complete source.
- [ ] Applied return plus partial/wrong post-inspection cannot produce contribution evidence.
- [ ] Stale third revision, duplicate owner status, method disagreement, malformed capability/status, adapter disappearance, and project trust loss fail closed before false mutation/evidence.
- [ ] Every server health state and safe error code leaves an exact registered contribution valid; remote failure never causes a source mutation.
- [ ] Pre-effect abort is clean; after the mutation ownership point no code reports clean cancellation.
- [ ] The module imports no lifecycle state store, transition store, recovery service, Pi API, filesystem, concrete package, or transport implementation.

## Ordering constraint

Depends on the strengthened portable contract. Recovery conformance waits for this participant and the sibling runtime-lease checkpoint.
