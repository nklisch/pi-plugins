---
id: epic-skills-hook-runtime-subagent-interception-composition-integration
kind: story
stage: implementing
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
