---
id: epic-native-plugin-management-inspection-diagnostics-snapshot-evidence
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-contracts-identifiers]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Capture coherent state and runtime inspection evidence

## Checkpoint

Add the read-only evidence port and packaged adapter that bind state generations, project trust, catalog tokens, the already-captured capability snapshot, runtime epoch, recovery, update, skill/hook, and MCP local-status evidence into one immutable snapshot. Validation must detect any authority change without probing or reconciling runtimes.

## Files

- `src/application/ports/native-inspection-evidence.ts`
- `src/application/ports/inspection-readiness.ts`
- `src/composition/native-inspection-evidence.ts`
- `src/composition/native-inspection-readiness.ts`
- `src/composition/runtime-selection-catalog.ts`
- `src/composition/create-skill-hook-runtime.ts`
- `src/composition/create-mcp-runtime.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `test/composition/native-inspection-evidence.test.ts`
- `test/composition/runtime-selection-catalog.test.ts`

## Acceptance evidence

- Snapshot bytes are deterministic across map/insertion/completion order and contain no path, handle, native error, or plaintext launch/config value.
- State/catalog/trust/capability/runtime/recovery/update changes invalidate the binding.
- Corrupt/unavailable one scope or participant remains explicit while readable siblings survive.
- Capture/validate causes no capability probe, MCP connection, hook/skill execution, reload, recovery settlement, refresh, or state write.

## Implementation notes

- Added narrow evidence/readiness ports and a composition adapter over authoritative state reads, marketplace registration/snapshot state, the packaged capability capture, project trust, runtime selections, resource observations, local MCP status, recovery, startup, and update memory.
- Bindings contain only safe identifiers/digests/status and compare every authority except capture time. Scope failures remain isolated rather than aborting readable siblings.
- Runtime selections now expose a monotonic content-bound epoch. Inspection derives a second epoch over exact participant observations and MCP local/live status, so either selection or observation drift invalidates a read.
- Added a value-free readiness adapter for exact trust and configuration-document presence. It returns no configured value, locator, provider detail, or path.
- Verification: `npm run typecheck`; focused evidence/runtime-catalog suites (6 tests), including state/trust/runtime invalidation and no state writes.
