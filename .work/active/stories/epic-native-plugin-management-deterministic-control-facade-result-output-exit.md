---
id: epic-native-plugin-management-deterministic-control-facade-result-output-exit
kind: story
stage: implementing
tags: [compatibility, reliability]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-contracts-registry, epic-native-plugin-management-deterministic-control-facade-operation-progress-admission, epic-native-plugin-management-deterministic-control-facade-mutation-workflow-dispatch]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Project Stable Results, Human Fields, and Exits

## Checkpoint

Map every owner result/error to strict machine envelopes, safe human fields, and stable semantic/numeric exits. Add the canonical JSON-lines sink and delivery-failure behavior without allowing output errors to mask operation truth.

## Files

- `src/application/native-control-result.ts`
- `src/application/native-control-human.ts`
- `src/application/native-control-error.ts`
- `src/infrastructure/control/node-json-lines-sink.ts`
- focused exhaustive mapping, canonical JSON, human safety, and stream failure tests

## Acceptance evidence

- Every known owner variant/error class has one exhaustive mapping; upstream union growth fails typecheck/runtime contract tests until classified.
- Human and JSON outputs differ only in projection—not dispatch, status, pagination, ordering, cancellation, or exit.
- Machine output is canonical strict JSON with no causes/stacks/messages/class instances/undefined/bigint/non-finite values; human fields are escaped/truncated safe values only.
- Partial writes, drain backpressure, EPIPE at every phase, and closed stdout retain the direct semantic report, classify delivery separately, and leak no listener/resource.
- Hostile ANSI/OSC/control/bidi/source/path/secret/native-cause canaries cross neither human nor unauthorized machine projections.
