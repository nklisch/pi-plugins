---
id: epic-transactional-plugin-lifecycle-operations-integration-hardening
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-operations
depends_on: [epic-transactional-plugin-lifecycle-operations-guarded-transitions]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Verify lifecycle integration and public boundaries

## Scope

Implement Unit 3 of the parent design. Integrate the lifecycle facade against schema-valid fakes and the real completed foreign-model, trust/configuration, state, generation-coordinator, and promotion contracts. Prove whole-plugin behavior with one skill/hook/MCP fixture, harden dependency/public boundaries, and roll foundation assertions forward only where landed contract names or behavior require it. Do not implement real Pi reload, runtime component adapters, startup recovery/GC, automatic-update policy, commands/UI, or foreign-state readers.

## Depends on

- `epic-transactional-plugin-lifecycle-operations-guarded-transitions`

## Required files

- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/plugin-lifecycle.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- foundation documents only if current assertions become false or misleading

## Design constraints

- Use one complete fixture and one fake projection/reload seam; do not create separate lifecycle implementations or test frameworks for skills, hooks, and MCP.
- Exercise real schema constructors and coordinator/promotion contracts where useful, but leave detailed source-security, secret-custody, SQLite, and filesystem atomicity matrices in their owning suites.
- Public exports include the lifecycle facade, schema-derived requests/results/evidence constructors, and narrow loader/projection/reload/transition ports. Exclude workflow internals, physical paths, Pi objects, timers/retry controls, secret values, component-specific activation, and test fakes.
- Dependency rules keep application lifecycle code inward-facing and portable.
- Treat foundation future intent as valid; edit only stale or contradictory assertions, not omissions.

## Acceptance criteria

- [ ] One integration flow proves install → disable → enable → update → uninstall for a complete skill/hook/MCP bundle.
- [ ] Same plugin key in user and project scope remains independent.
- [ ] Focused failures prove pre-commit incompatibility/trust/config/projection/promotion/stale outcomes preserve prior state, reload mismatch produces verified rollback, and rollback/finalization ambiguity produces `recovery-required`.
- [ ] Uninstall `keep` and `delete-confirmed` produce the correct deferred cleanup evidence without deleting before deactivation.
- [ ] Source and compiled public allowlists expose one lifecycle facade and no partial-component or raw-mutation bypass.
- [ ] Dependency-cruiser canaries reject application imports from Node, filesystem, Pi, runtime, formats, and infrastructure.
- [ ] `npm test` passes typecheck, boundaries, useful integration tests, build, and exact package import.
- [ ] Foundation docs remain rolling-current and do not claim concrete runtime/reload/recovery/update/UI behavior outside this feature.
