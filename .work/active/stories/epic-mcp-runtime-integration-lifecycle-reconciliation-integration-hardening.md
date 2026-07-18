---
id: epic-mcp-runtime-integration-lifecycle-reconciliation-integration-hardening
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-lifecycle-reconciliation
depends_on: [epic-mcp-runtime-integration-lifecycle-reconciliation-recovery-conformance]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Harden the Public and Native-Composition Handoff

## Checkpoint

Finish package-neutral integration evidence and the narrow public boundary without implementing native management or selecting unpublished runtime bytes. Prove local/offline startup registration, source-before-tool observation shape, strict two-participant composition, runtime-unavailable/no-MCP degradation, project trust, concurrent owners, update old/new identity, status redaction, and dependency/export boundaries.

Record the exact handoff to `epic-native-plugin-management`: it owns transition/state loading, previous/candidate projection construction, current project and active-selection authority, concrete adapters, real package factory/initial sources, Pi reload, and final `LifecycleReloadPort` composition.

## Planned files

- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/mcp-lifecycle-participant.test.ts`
- `test/integration/skill-hook-runtime-projection.test.ts`
- `test/tooling/boundaries.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/COMPATIBILITY.md` only if landed assertions become false or contradictory

## Required behavior

- Active local sources can be prepared from committed local projection/revision evidence and observed without resolving launch values, acquiring runtime execution leases, starting processes, connecting remotely, or discovering tools.
- Strict `composeActivationObservation` requires both exact skill/hook and exact MCP contributions for source, no-MCP, and inactive cases.
- Runtime absence blocks MCP-bearing activation but not active no-MCP or already-inactive structural absence; a source that may need cleanup cannot be waved away by package disappearance.
- Public exports include stable registration/precondition/binding/lease/observation/participant/provider contracts and factories only.
- Fakes, mutable maps, test fault controls, transition/state readers, raw lease capabilities, package names/wrappers, Pi APIs, process/transport internals, and secret-bearing helpers stay private.
- Dependency rules keep application ports package/Node/Pi-free and keep runtime participant/provider code out of state, journal, filesystem, and concrete package layers.
- The authorized maintained-fork and production-adapter stories must pass the extended unchanged conformance plus package-specific initial-source-before-tools, file-isolation, process/cache/tool cleanup, Node/Pi, and published provenance tests before availability changes.

## Acceptance evidence

- [ ] Offline startup proves exact registered inventory and per-server later health without network dependency.
- [ ] Source and no-source contributions both participate in complete observation; one participant alone, generic MCP evidence, mismatched revision/digest/project, or stale source fails.
- [ ] Adapter disappearance/capability downgrade, project trust revocation, concurrent absent CAS, stale update, same native key across owners, and idempotent disable/uninstall have explicit safe outcomes.
- [ ] Canary serialization across status/results/observations/errors/log spies/public and compiled exports reveals no definitions, plaintext, roots, configuration/environment names or values, lease/session/process identity, native causes/messages, or package identity.
- [ ] Full `npm test` passes typecheck, dependency boundaries, all focused/integration suites, build, and exact compiled import.
- [ ] No `pi-mcp-adapter` dependency, production wrapper, settings/config file, deep import, global environment mutation, MCP SDK runtime, Pi reload implementation, state/journal schema, or production capability claim is added.
- [ ] Native-management and maintained-fork handoff is documented in the parent feature body rather than duplicated as another transaction/composition implementation.

## Ordering constraint

Final checkpoint after lifecycle/recovery conformance. It does not depend on fork publication, so portable completion remains unblocked and production availability remains honest.

## Implementation notes

- Added package-neutral integration coverage for local/offline registration and exact observation, later remote-health separation, concurrent same-native-key owners across plugin/scope, project-trust revocation, redacted status, and runtime-unavailable no-MCP degradation without hiding source cleanup obligations.
- Added a dependency boundary that prevents the MCP participant/provider from importing lifecycle transaction/recovery authority, state/transition stores, infrastructure adapters, native composition, or Pi. A committed regression fixture proves the rule fires.
- Rolled the stale MCP architecture assertion forward to the exact registration/CAS/inspection/runtime-lease participant contract and recorded that native composition remains responsible for transition/state loading, concrete adapters, current project and active selection, initial sources, the real package factory, Pi reload, and complete observation composition.
- Public and compiled allowlists expose only portable schemas, types, registration/participant/provider factories. No `pi-mcp-adapter` dependency, wrapper, settings writer, package deep import, Pi reload implementation, state/journal schema, global environment mutation, or production availability claim was added.

## Verification

- Focused integration/recovery/composition/boundary/public suites: **27 passed, 0 failed**.
- Full `npm test` pipeline: passed.
  - Typecheck: **0 errors**.
  - Dependency boundaries: **237 modules, 1,444 dependencies**, no violations.
  - Vitest: **177 files, 967 tests passed, 0 failed; 0 type errors**.
  - Build and compiled package import: passed, **522 exports**.
