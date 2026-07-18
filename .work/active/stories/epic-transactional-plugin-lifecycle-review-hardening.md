---
id: epic-transactional-plugin-lifecycle-review-hardening
kind: story
stage: done
tags: [security, infra, documentation]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-refresh-update-policy]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Complete lifecycle recovery exports and adapter handoff

## Standard aggregate-review fix set

The one permitted epic review found no runtime correctness or security defect. Close its public-assembly and ownership-clarity findings:

1. Export from `src/index.ts` the already-implemented lifecycle transition reconciler factory, interface, and dependency type required by the public recovery-service dependency contract.
2. Export `LifecycleStateInventoryPort` and `RecoveryArtifactsPort`, which are required/optional named host boundaries of public refresh, collection, and recovery services.
3. Update source and compiled allowlists/type assertions for these intentional exports; keep private journal/state/claim/evidence internals private.
4. Preserve the lifecycle epic's explicit adapter-neutral/contracts-and-fakes boundary. Name `epic-native-plugin-management` as owner of concrete `LifecycleStateStore`, credential/secret, configuration path/write-id, inventory, recovery-artifact, and project-root adapters in the rolling architecture/native epic; describe lifecycle output as application contracts/services rather than a packaged concrete state store.

## Receiver adjudication

The review proposal to implement a durable state store in this epic is rejected as scope expansion. The state feature explicitly chose a schema-first, adapter-neutral port and the parent boundary says this epic defines lifecycle-facing contracts and fakes only. `docs/ARCHITECTURE.md` already says the port does not prescribe storage/fsync/rename and leaves those seams late-bound. The legitimate packaged-operation requirement is now assigned by name to the native management composition epic instead of remaining ambiguous.

Production secret/configuration adapters are treated the same way. Their values and ports are lifecycle policy; OS/filesystem/Pi adapters belong to packaged composition.

## Acceptance evidence

- [x] A package consumer can import and construct `LifecycleTransitionReconciler`, then supply it to `createLifecycleRecoveryService`, using public exports only.
- [x] Inventory and recovery-artifact port names are publicly importable.
- [x] Source/public/compiled export allowlists and type tests include only the intentional additions.
- [x] No private journal adapter internals, authorization capabilities, claim helpers, native errors, path builders, timer internals, or state mutation brands are exported.
- [x] Architecture and native-epic prose assign concrete packaged adapters without claiming they are implemented by lifecycle.
- [x] No runtime behavior, schema, persistence format, recovery authority, lifecycle transaction, or startup behavior changes.
- [x] Full `npm test`, boundaries, build/package import pass with the intentional export-count increase.

Standard review already ran. After this exact fix set, close by host administrative verification; do not commission a second independent pass.

## Implementation notes

- Execution capability: direct-read inline implementation; the accepted fix is a narrow package-barrel and API-test change with no runtime implementation.
- Review weight: standard, already completed at epic scope; this implementation performs host verification only and does not commission another review.
- Files changed: `src/index.ts`, `test/public-api.test.ts`, `test/compiled-package-import.mjs`.
- Tests added/removed: expanded public API runtime/type assertions for the reconciler factory/interface/dependencies and the inventory/recovery-artifact ports; no tests removed.
- Simplification: none; private lifecycle internals and adapter boundaries remain unchanged.
- Discrepancies from design: none. The staged architecture/native-epic handoff remains consistent: lifecycle exports contracts and services, while concrete packaged adapters belong to `epic-native-plugin-management`.
- Adjacent issues parked: none.

## Completion evidence

All acceptance criteria are satisfied. The source barrel now exports `createLifecycleTransitionReconciler`, `LifecycleTransitionReconciler`, `LifecycleTransitionReconcilerDependencies`, `LifecycleStateInventoryPort`, and `RecoveryArtifactsPort`; the compiled runtime allowlist includes only the factory among these additions because the remaining additions are type-only. Focused API/type/package verification passed before the implementation commit; full `npm test` is the final required verification.
