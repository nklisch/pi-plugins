---
id: epic-skills-hook-runtime-subagent-interception-fake-conformance
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe]
release_binding: null
gate_origin: null
research_refs: [docs/research/pi-subagents-lifecycle-interception.md]
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Build the Deterministic Lifecycle Fake and Conformance Suite

## Priority

High; implementable after the public contract and the qualification gate for every future package adapter.

## Deliverable

Create a deterministic test-only lifecycle fake and one reusable parameterized behavioral conformance suite for `SubagentLifecyclePort`. The fake is only a turn-order state machine; it does not model providers, tools, resources, workspaces, persistence, steering, queues, or production subagent execution.

The suite records symbolic checkpoints around ordered async interception, prompt calls, proposed results, continuation, finalization, events, cancellation, and disposal. Run it against the fake immediately. A future upstream/fork wrapper must invoke the unchanged suite and add only real Pi/package-specific tests.

## Planned files

- `test/support/fakes/subagent-lifecycle.ts`
- `test/support/fakes/subagent-lifecycle.test.ts`
- `test/contract/subagent-lifecycle.contract.ts`
- `test/contract/subagent-lifecycle.contract.test.ts`
- `test/integration/subagent-lifecycle-port.test.ts`

## Harness checkpoint

```typescript
export interface SubagentLifecycleContractHarness {
  readonly lifecycle: SubagentLifecyclePort;
  execute(request: Readonly<{
    identity: SubagentExecutionIdentity;
    execution: SubagentExecutionPath;
    prompt: string;
    proposedResults: readonly string[];
    outcome?: "completed" | "steered" | "aborted";
    signal: AbortSignal;
  }>): Promise<SubagentExecutionTrace>;
  disposeSession(sessionId: string): Promise<void>;
  shutdown(): Promise<void>;
}

export function defineSubagentLifecycleContract(
  name: string,
  create: () => SubagentLifecycleContractHarness | Promise<SubagentLifecycleContractHarness>,
): void;
```

## Behavioral checkpoints

- Stable interceptor snapshot per boundary; sequential registration order; awaited async callbacks; replacements pipe forward.
- Start abort/cancellation occurs before the first prompt.
- Completion interception occurs before every finalization/addendum/event/history/notification/disposal symbol.
- Continuation uses one session/agent/run identity, emits no intermediate completion, increments rounds, and cannot exceed the configured bound.
- Initial and resume executions use distinct run ids and receive identical lifecycle coverage.
- Unregister is idempotent and affects future snapshots only; shutdown cancellation and session disposal call cleanup exactly once.
- No-interceptor traces preserve baseline ordering and values byte-for-byte.

## Acceptance evidence

- [ ] Tool/service, foreground/background, immediate/queued, initial/resume, parent-present/parentless, completed/steered/aborted paths pass one matrix.
- [ ] Inverse async timing cannot reorder interceptor decisions.
- [ ] Cancellation while awaiting start or completion propagates the original reason and permits no later prompt/continuation/finalization.
- [ ] Same-session continuation and exact max-round failure are visible in symbolic order.
- [ ] Session/runtime disposal and idempotent unregister release each callback once and permit no post-disposal execution.
- [ ] Deliberately broken harnesses prove detection of event approximation, post-finalization completion, missing resume coverage, replacement loss, identity drift, unbounded continuation, and double disposal.
- [ ] Test traces/errors never serialize secret-canary prompts or results; fake/conformance symbols remain outside production exports.

## Ordering

Depends on `epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe`. The hook coordinator may implement in parallel after the same contract. Composition and production qualification consume this suite.

## Blocker ownership

None. The fake reports `provider.kind: test`; it proves behavior but cannot make production capability available.

## Risk and rollback

The risk is overfitting to fake internals. Keep assertions entirely on the public decisions and symbolic forbidden/required order, and require broken harnesses. Package construction and real Pi event ordering remain explicit production tests. Rollback replaces the harness without weakening the public port.

## Implementation summary

- Added a deterministic test-only lifecycle state machine with stable per-boundary interceptor snapshots, awaited registration order, replacement piping, exact run-id uniqueness, bounded same-session continuation, caller/runtime cancellation, idempotent unregister, and exactly-once session/runtime disposal accounting.
- Added the reusable package-independent contract suite over all 32 initial/resume, tool/service, foreground/background, and immediate/queued path combinations, plus parent-present/parentless evidence, start/completion cancellation, replacement order, continuation bounds, unregister snapshots, and secret-free symbolic traces.
- Added negative trace evidence for event approximation, post-finalization completion interception, and unbounded continuation. Fake qualification remains `provider.kind: test`, and integration proves it cannot make production compatibility available.

## Implementation record

- Execution capability: `xhigh feature owner`; dependency-ordered direct implementation with no nested agents.
- Commit ref: `17cb656` (`implement: subagent lifecycle fake and conformance`).
- Verification: `npm run typecheck`; 11 focused Vitest tests passed, including the 32-vector parameterized path matrix and fake/negative/integration suites.
- Production boundary: the fake owns no provider, model, tool, queue, workspace, persistence, steering, or real subagent-service behavior and is absent from package exports.

## Second crash-recovery verification

- Audited commit `17cb656` against every acceptance vector. Correction `f4e7dd8` makes the shared suite exercise interceptors on all 32 execution paths (including resume), records symbolic application of start/result replacements and same-session continuation, places completion interception before addendum/status/event/history/notification symbols, checks exact callback identity, proves idempotent session/registration disposal, rejects post-disposal execution, and supplies broken evidence for replacement loss, missing resume coverage, identity drift, unbounded continuation, event approximation, and double disposal.
- Unified focused verification passed: 12 files / 68 tests / 0 type errors. Full repository verification passed at 162 files / 843 tests, 221 modules / 1,317 dependency edges, and 479 compiled exports.
- Stage remains `done`; the fake is still test-only and cannot change production compatibility.
