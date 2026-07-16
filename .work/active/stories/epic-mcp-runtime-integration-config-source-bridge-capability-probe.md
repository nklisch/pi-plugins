---
id: epic-mcp-runtime-integration-config-source-bridge-capability-probe
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: [epic-mcp-runtime-integration-config-source-bridge-portable-contract]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Feed Exact MCP Facts into the Runtime Capability Probe

## Priority

High; implementable after the portable contract and required for honest compatibility reports.

## Deliverable

Add `createMcpRuntimeCapabilityProbe` as a decorator over the existing complete `RuntimeCapabilityProbe`. Extend the single `RuntimeCapabilityRegistry` and MCP policy rules with exact standard-I/O transport, Streamable HTTP transport, and resources facts. Map the portable runtime capability schema into those existing facts without creating adapter verdicts or a second compatibility vocabulary.

## Planned files

- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/application/mcp-runtime-capability-probe.ts`
- `src/index.ts`
- `test/domain/compatibility-policy.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/domain/compatibility-table-contract.test.ts`
- `test/application/mcp-runtime-capability-probe.test.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Contract checkpoint

```typescript
export function createMcpRuntimeCapabilityProbe(input: Readonly<{
  base: RuntimeCapabilityProbe;
  runtime?: Pick<McpRuntimePort, "capabilities">;
  capturedBy: string;
}>): RuntimeCapabilityProbe;
```

- `pi.mcp.runtime` is available only when the runtime reports every required source-lifecycle semantic: initial source timing, isolated file discovery, local validation, atomic replace, exact remove, inspection, cancellation, and late values.
- Transport/resource/OAuth/feature facts are available only when the complete runtime seam qualifies and the corresponding exact flag is true.
- An absent runtime is a valid fail-closed composition: every MCP-owned fact is unavailable with a safe explanation; unrelated base facts are preserved.
- A present runtime that throws or returns malformed facts is `ADAPTER_FAILED`; cancellation remains cancellation.
- Legacy SSE and WebSocket booleans are recorded in the portable capability object but never create a supported compatibility route. Their existing policy remains incompatible.

## Acceptance evidence

- [ ] Standard-I/O and Streamable HTTP requirements can differ in one complete compatibility snapshot.
- [ ] Resource-bearing declarations require the new resources fact while existing OAuth, approval, sampling, and elicitation requirements remain registry-driven.
- [ ] Package absence makes only MCP facts unavailable and never fabricates component incompatibility.
- [ ] Legacy SSE and WebSocket declarations remain incompatible even when a runtime fixture reports those booleans true.
- [ ] Complete-snapshot, malformed-adapter, and abort tests preserve the existing compatibility-service contract.

## Ordering

Depends on `epic-mcp-runtime-integration-config-source-bridge-portable-contract`. The fake can proceed in parallel after that contract; neither path waits on the production package.

## Risk and rollback

The primary risk is overclaiming a broad MCP runtime when one required source semantic or transport is absent. Fail the aggregate runtime fact closed and gate every specific fact on it. If no package qualifies, select the no-runtime path; rollback requires no policy or state migration.

## Blocker ownership

No external blocker. Plugin Host maintainers own the registry/policy mapping. The later composition owner supplies a qualifying runtime or deliberately omits it.

## Implementation notes

- Execution capability: Luna xhigh; this changes the single compatibility registry and must fail closed without disturbing unrelated capability facts.
- Review weight: standard (caller explicitly requested no feature review; the story was verified through focused policy, mapper, integration, boundary, and public-surface checks).
- Files changed: `src/domain/compatibility-policy.ts`, `src/domain/compatibility-evaluator.ts`, `src/application/mcp-runtime-capability-probe.ts`, `src/index.ts`, capability/policy/evaluator/integration/public tests, and compatibility fixtures.
- Tests added/updated: complete absent-runtime, exact fact mapping, lifecycle qualification, malformed adapter, and abort coverage; transport/resource requirements and capability-table expectations now cite the transport/resource facts.
- Simplification: the decorator maps one complete runtime snapshot into the existing registry; no adapter-specific verdict or parallel capability vocabulary was introduced.
- Discrepancies from design: resources use a dedicated `mcp.feature.resources` policy rule because resource requirements are conditional on a declaration actually carrying resources; transport rules cite aggregate runtime plus their exact transport fact.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`, `npm run boundaries`, and 41 focused Vitest tests passed with no type errors. Absent runtime preserves non-MCP facts; malformed present evidence raises `ADAPTER_FAILED`; cancellation remains caller-owned.
