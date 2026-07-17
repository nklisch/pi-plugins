---
id: epic-skills-hook-runtime-subagent-interception-composition-integration
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-fake-conformance, epic-skills-hook-runtime-subagent-interception-hook-coordinator]
release_binding: null
gate_origin: null
research_refs: [docs/research/pi-subagents-lifecycle-interception.md]
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Compose and Integrate the Portable Subagent Hook Runtime

## Priority

High; final package-independent checkpoint after conformance and coordinator behavior exist.

## Deliverable

Add package-neutral registration that verifies the same qualification digest used before compatibility, registers exactly one aggregate interceptor, validates exact activation evidence, and exposes idempotent disposal. Export only the stable host port/schemas/probe/registration surface. Prove end-to-end plugin-scoped hook selection and degradation with the test fake without allowing fake evidence to claim production availability.

## Planned files

- `src/application/subagent-hook-runtime.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/application/subagent-hook-runtime.test.ts`
- `test/integration/subagent-hook-runtime.test.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/integration/skill-hook-runtime-projection.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- foundation docs only if landed details make current assertions false or misleading

## Composition checkpoint

```typescript
export type RegisteredSubagentHookRuntime = Readonly<{
  evidence: SubagentLifecycleRegistrationEvidence;
  dispose(): Promise<void>;
}>;

export async function registerSubagentHookRuntime(input: Readonly<{
  lifecycle: SubagentLifecyclePort;
  qualification: SubagentLifecycleCapabilities;
  coordinator: SubagentLifecycleInterceptor;
  runtimeSignal: AbortSignal;
  continuationBudget?: number;
}>): Promise<RegisteredSubagentHookRuntime>;
```

Registration compares the exact provider qualification digest, binds the single registry continuation budget, and rejects malformed/mismatched adapter evidence. It reads no lifecycle state, manifests, settings, files, package internals, or raw event channels. Native composition supplies the already-qualified port, verified runtime catalog, existing guarded executor, current session resolver, and runtime signal.

## Acceptance evidence

- [ ] Probe qualification and registration evidence match exactly before runtime use; mismatch/failure/disposal race yields no activation evidence.
- [ ] Fake-backed integration proves normalized hook projection → parent session → strict plan → guarded executor → source-ordered aggregate → exact start/stop lifecycle decision.
- [ ] Two plugins/scopes aggregate without collision; next-boundary update/disable sees the new catalog and in-flight races remain all-or-nothing.
- [ ] Plugins declaring subagent hooks remain supported but do not activate under production package absence; ordinary-only plugins remain activatable and execute normally.
- [ ] Initial, resume, queued, continuation, block, cancellation, parent replacement, and runtime shutdown dispose callbacks and prevent post-disposal work.
- [ ] Capability/registration/compatibility/state/diagnostic/public values contain no prompt, result, command output, config secret, absolute path, test canary, or native cause.
- [ ] Dependency boundaries prove no application/domain import of Pi or `@gotgenes/pi-subagents`, and no settings/deep-import/patch/event approximation exists.
- [ ] Full `npm test` passes and implementation records exact count changes while parent feature/production story remain implementing.

## Ordering

Depends on fake/conformance and hook coordinator. The production adapter depends on this integration and the shared conformance suite.

## Blocker ownership

None for portable composition. A real production port remains externally blocked; tests must keep fake qualification distinct from truthful production capability.

## Risk and rollback

The risk is treating successful registration as capability qualification or allowing test evidence into production compatibility. Digest matching and provider-kind gating keep those proofs separate. Rollback unregisters/removes portable composition and leaves the single capability unavailable; no state, projection, trust, data, or settings migration exists.

## Implementation summary

- Added package-neutral registration that validates the supplied qualification, registers exactly one aggregate interceptor, requires exact digest/contract/budget activation evidence, compensates every mismatch or registration race, and exposes only idempotent disposal.
- Added fake-backed end-to-end integration through verified hook projection, parent-session resolution, strict planning, the real guarded executor/parser/redaction path, source-ordered multi-plugin aggregation, exact start injection, one same-session stop continuation, catalog update at the next boundary, and runtime shutdown.
- Added source/compiled public allowlists and dependency rules that keep the application boundary independent of Pi, Node, runtime implementations, and any concrete subagent package. Compatibility integration proves interception absence blocks only plugins that cite it; an ordinary-only sibling remains activatable.

## Implementation record

- Execution capability: `xhigh feature owner`; one sequential feature bundle with no nested agents.
- Commit ref: `52b41c9` (`implement: compose portable subagent hook runtime`).
- Verification: `npm run typecheck`; `npm run boundaries` (221 modules, 1,317 dependencies, zero violations); 31 focused application/integration/public Vitest tests; `npm run test:package`; compiled import passed with 479 exports.
- Capability truth: fake-backed registration is usable only in injected tests. The production capability probe still returns unavailable for `provider.kind: test`; registration evidence cannot upgrade that fact.

## Second crash-recovery verification

- Audited commit `52b41c9` and the integrated portable boundary. Correction `f4e7dd8` removes the raw lifecycle registration handle from the package barrel while retaining the stable host port and safe `RegisteredSubagentHookRuntime`; no runtime package object or handle is a named public export.
- Full baseline at design commit `425704e`: 154 test files / 798 tests, 215 modules / 1,293 dependency edges, 463 compiled exports. Final verified total: 162 test files / 843 tests, 221 modules / 1,317 dependency edges, 479 compiled exports. Exact portable additions: 8 test files, 45 tests, 5 source modules, 24 dependency edges, and 16 compiled exports.
- Unified focused verification passed: 12 files / 68 tests / 0 type errors. Full `npm test` passed typecheck, boundaries, all Vitest tests, build, and compiled package import. The first attempt hit the pre-existing concurrent recovery-journal flake; the complete immediate rerun passed without unrelated changes.
- Stage remains `done`; the parent feature and production-adapter child remain `implementing`, and fake registration still cannot make production capability available.
