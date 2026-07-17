---
id: epic-native-plugin-management-packaged-host-composition-mcp-composition
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-runtime-selection-capabilities]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Compose Optional MCP Lifecycle and Launch Custody

## Checkpoint

Wire the hardened MCP projection, lifecycle, launch-context/value, environment, active-selection, and revision-lease seams behind one optional package-neutral runtime participant. Preserve exact no-MCP behavior and source cleanup honesty.

## Planned files

- `src/composition/create-mcp-runtime.ts`
- `src/composition/mcp-runtime-state.ts`
- `src/runtime/mcp/revision-lease-provider.ts`
- `test/composition/create-mcp-runtime.test.ts`
- `test/integration/packaged-mcp-runtime.test.ts`

## Required behavior

- `createPluginMcpProjection` derives exact source/none states from current complete-plugin projections and fresh runtime capabilities.
- `createMcpLifecycleParticipant` is the only source mutation/observation path.
- Launch values use the existing trusted launch context and requested-only ambient environment; each execution gets a revision lease.
- Construction/capability observation does not connect, authenticate, discover tools, spawn servers, or resolve secrets.
- Absent runtime is exact success only for no-source/inactive structural states. MCP-bearing source states remain unavailable.
- Close removes exact owned sources and verifies cleanup; uncertain/disappeared runtime remains ambiguous/recoverable.

## Acceptance evidence

- [ ] Source, none, and inactive transitions compose exact contribution evidence with project/scope/revision/digest identity.
- [ ] Runtime absence, disappearance, capability downgrade, stale source, replace/remove lost response, and cleanup ambiguity never produce partial active/inactive claims.
- [ ] Launch values, configuration facades, ambient environment, and leases dispose on success/failure/abort.
- [ ] Multiple scopes/plugins with the same native server key remain isolated.
- [ ] No production package import/name/provenance claim is introduced.

## Ordering constraint

Consumes runtime selection/capabilities. It may proceed beside hook/subagent composition; canonical reload requires both participants.

## Implementation notes

- Added exact MCP state projection from complete runtime selections and the existing compatibility/projection authorities.
- Composed the existing MCP lifecycle participant, trusted launch context/value provider, requested-only environment, active-selection pin, and per-execution revision lease provider. Construction performs no probe, connection, process launch, tool discovery, secret resolution, or registration.
- Added deterministic multi-plugin reconciliation/observation and owned-source shutdown. No-runtime structural none/inactive evidence succeeds exactly; MCP-bearing sources remain unavailable, while cleanup ambiguity fails rather than claiming inactivity.
- Verification: new composed-runtime/catalog suites and existing MCP lifecycle/launch/lease/recovery suites passed (62 tests); `npm run typecheck` and `npm run boundaries` passed.
