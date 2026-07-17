---
id: epic-native-plugin-management-inspection-diagnostics-diagnostic-compiler
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-candidate-inspection, epic-native-plugin-management-inspection-diagnostics-installed-runtime-inspection]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Compile stable actionable native diagnostics

## Checkpoint

Create the single diagnostic registry and compiler for integrity, recovery, compatibility, capability, trust, configuration, activation, runtime, update, freshness, adoption, and unavailable-evidence findings. Registry metadata owns safe summaries, condition impact, ordering, deduplication, and semantic action codes.

## Files

- `src/application/native-diagnostic-registry.ts`
- `src/application/native-diagnostic-compiler.ts`
- `test/application/native-diagnostic-registry.test.ts`
- `test/application/native-diagnostic-compiler.test.ts`

## Acceptance evidence

- Every code has one category/severity/rank/blocking/action definition and table coverage.
- Evidence permutations produce byte-identical ordering, deduplication, and diagnostic IDs.
- Distinct component/provenance facts survive while duplicate upstream copies collapse.
- Native/unknown failures map to safe subsystem-level unavailable evidence without message/cause/detail leakage.
- Condition derivation consistently distinguishes ready, degraded, blocked, and unavailable.
