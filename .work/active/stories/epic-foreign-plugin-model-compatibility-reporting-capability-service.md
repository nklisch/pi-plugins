---
id: epic-foreign-plugin-model-compatibility-reporting-capability-service
kind: story
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model-compatibility-reporting
depends_on: [epic-foreign-plugin-model-compatibility-reporting-policy-evaluator]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Add the Capability Probe Boundary and Reporting Service

## Scope

Implement the narrow application port and service from the parent design. `RuntimeCapabilityProbe` returns one complete immutable registry-shaped snapshot. `CompatibilityService` validates the request, observes abort before and after the one probe call, and delegates to the pure compatibility evaluator.

This story defines no concrete Pi, MCP, subagent, shell, OS, or process adapter. Abort is rethrown unchanged. Non-abort probe failures and invalid adapter snapshots throw `BoundaryError(ADAPTER_FAILED)` with the native cause retained only on the error. Domain incompatibility remains a successful report.

## Owned files

- `src/application/ports/runtime-capability-probe.ts`
- `src/application/compatibility-service.ts`
- `src/index.ts`
- `test/application/compatibility-service.test.ts`
- `.dependency-cruiser.cjs`
- relevant public/compiled export assertions

## Acceptance criteria

- [ ] The port exposes only `snapshot(signal)` and returns the domain snapshot contract.
- [ ] The service calls the probe exactly once and has no direct runtime, Pi, filesystem, process, network, trust, activation, or lifecycle dependency.
- [ ] Pre-abort and probe abort propagate unchanged with no report.
- [ ] Probe rejection and invalid/incomplete/unknown capability snapshots throw `BoundaryError(ADAPTER_FAILED)` and return no partial report.
- [ ] A valid snapshot delegates unchanged to the pure evaluator, including successful non-activatable reports.
- [ ] Domain/application dependency rules, public types, and compiled exports remain exact.

## Verification

Use a fake probe to cover one-call success, all-available and mixed snapshots, pre-abort, abort during the probe, invalid snapshot, native failure with cause, and successful incompatible evaluation. Run focused application tests, dependency boundaries, typecheck, and public package checks.
