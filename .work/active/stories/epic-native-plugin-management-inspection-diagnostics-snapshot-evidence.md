---
id: epic-native-plugin-management-inspection-diagnostics-snapshot-evidence
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-contracts-identifiers]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
