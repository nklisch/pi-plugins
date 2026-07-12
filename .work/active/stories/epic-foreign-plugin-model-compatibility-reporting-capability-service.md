---
id: epic-foreign-plugin-model-compatibility-reporting-capability-service
kind: story
stage: review
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

- [x] The port exposes only `snapshot(signal)` and returns the domain snapshot contract.
- [x] The service calls the probe exactly once and has no direct runtime, Pi, filesystem, process, network, trust, activation, or lifecycle dependency.
- [x] Pre-abort and probe abort propagate unchanged with no report.
- [x] Probe rejection and invalid/incomplete/unknown capability snapshots throw `BoundaryError(ADAPTER_FAILED)` and return no partial report.
- [x] A valid snapshot delegates unchanged to the pure evaluator, including successful non-activatable reports.
- [x] Domain/application dependency rules, public types, and compiled exports remain exact.

## Verification

Use a fake probe to cover one-call success, all-available and mixed snapshots, pre-abort, abort during the probe, invalid snapshot, native failure with cause, and successful incompatible evaluation. Run focused application tests, dependency boundaries, typecheck, and public package checks.

## Implementation notes
- Execution capability: direct-read only; this cohesive application-boundary change was implemented in the host context without nested agents or peeragent.
- Review weight: standard, with the caller-requested lifecycle boundary left at `stage: review`.
- Files changed: `src/application/ports/runtime-capability-probe.ts`, `src/application/compatibility-service.ts`, `src/index.ts`, `.dependency-cruiser.cjs`, `test/application/compatibility-service.test.ts`, `test/public-api.test.ts`, `test/compiled-package-import.mjs`.
- Tests added: one-call delegation, complete snapshot validation, available/unavailable requirements, pre- and mid-probe cancellation, abort-shaped rejection, adapter failure causes, invalid requests, and public/compiled export assertions.
- Discrepancies from design: none.
- Adjacent issues parked: none.
