---
id: epic-transactional-plugin-lifecycle-operations-project-scope-wiring
kind: story
stage: done
tags: [correctness, tests]
parent: epic-transactional-plugin-lifecycle-operations
depends_on: [epic-transactional-plugin-lifecycle-operations-integration-hardening]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-18
---

# Wire Project Root Authority Through Lifecycle Operations

## Scope

Fix normal-use project-scope install, enable, and update, and close the integration coverage gap that hid the omission.

## Finding

`withResolvedPluginConfiguration` requires `ProjectRootAuthorityPort` for project scope, but lifecycle and candidate-preparation dependency types do not carry that port. Every project install/enable/update therefore maps the missing dependency to `UNCONFIGURED`; disable happens to bypass resolution and works.

## Required fixes

- Make `projectRoots: ProjectRootAuthorityPort` a required lifecycle composition dependency and thread it through candidate readiness/configuration resolution. User scope must not invoke it; project scope must verify the exact trusted root capability.
- Add one real service-level fake-port lifecycle integration covering install → disable → enable → update → uninstall in project scope with project trust granted and a representative skill/hook/MCP bundle.
- Assert user/project state and projections remain isolated and project trust/root verification occurs only for project operations.
- Use accurate pre-commit rejection codes for projection or store adapter failures when the small local correction is clear; do not broaden the public error model beyond the existing safe registry.
- Record in the parent feature that corrupt previous-revision teardown routes to recovery because verified rollback is unavailable; do not implement recovery here.

## Acceptance criteria

- [x] Project install, enable, and update succeed with valid project trust/root authority and cooperating ports.
- [x] Missing/untrusted project authority fails closed with the existing safe rejection semantics.
- [x] User scope does not call project-root authority.
- [x] End-to-end service coverage includes skill, hook, and MCP projection content plus user/project isolation.
- [x] Existing transaction, rollback, and recovery-required tests remain green.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes
- Execution capability: direct host implementation; the caller explicitly prohibited agents and the change is one cohesive lifecycle/candidate composition seam.
- Review weight: standard, caller requested the implementation boundary at `stage: review`.
- Files changed: `src/application/plugin-candidate-preparation.ts`, `src/application/plugin-lifecycle-service.ts`, `test/application/plugin-lifecycle-service.test.ts`, `test/integration/plugin-lifecycle.test.ts`, and the parent feature item.
- Tests added/removed: service-level project-scope install → disable → enable → update → uninstall coverage with one skill, hook, and MCP bundle; exact user/project projection and state isolation; root-authority call isolation and fail-closed rejection.
- Simplification: no new public rejection variant or lifecycle path; projection adapter failures now use the existing `PROJECTION_FAILED` registry entry instead of being misclassified as trust failures, and the unused hardcoded-install load-failure helper was removed.
- Discrepancies from design: the fake materializer uses an external-source handoff while retaining the real schema/coordinator/service contracts; this keeps the test focused on lifecycle wiring rather than duplicating source acquisition.
- Adjacent issues parked: corrupt previous-revision evidence after a possible commit routes to `recovery-required`; verified rollback/recovery implementation remains owned by the recovery feature.

## Review (2026-07-13)

**Verdict**: Approve

**Review notes**: Substrate mode; caller's explicit story fast-advance policy; independent integrated verification. Project install/enable/update, root-authority isolation, representative skill/hook/MCP lifecycle, and user/project separation are covered. Full suite passes 562 tests with strict typechecking, clean boundaries, build, and exact 360-export import. No realistic normal-use blocker remains.
