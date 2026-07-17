---
id: epic-skills-hook-runtime-subagent-interception-production-adapter
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-fake-conformance, epic-skills-hook-runtime-subagent-interception-composition-integration, epic-skills-hook-runtime-subagent-interception-maintained-fork]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-subagents-lifecycle-interception.md
  - .agents/skills/pi-subagents-v18/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Integrate a Qualifying Production Subagent Lifecycle Package

## Priority

Critical for production `SubagentStart`/`SubagentStop` activation and feature/epic closure. The operator authorized the maintained-fork path on 2026-07-16; this story is now sequenced behind the fork-publication story instead of waiting indefinitely for upstream.

## Selected package path

`@gotgenes/pi-subagents@18.0.3`, tag `pi-subagents-v18.0.3`, commit `c76a294a777a990950da23fc06cb0caf51da7ac6`, lacks the required interceptor. Implement and qualify the planned `@nklisch/pi-subagents` fork in `epic-skills-hook-runtime-subagent-interception-maintained-fork`, then integrate only its published, pinned, conformance-passing API here. After real integration passes, `epic-skills-hook-runtime-subagent-interception-upstream-contribution` opens a generic current-main upstream PR and tracks return to upstream.

Do not add a deep import, monkeypatch, package patch, settings mutation, observational event bridge, post-completion steer/resume workaround, unpublished fork dependency, private manager/session access, or second subagent runtime.

## Objective unblock criteria

One path must satisfy every criterion before implementation begins.

### Published upstream release

1. A published npm release—not an issue, PR, branch, or commit-only dependency—documents a typed root/exported-subpath registration API for ordered async lifecycle interceptors.
2. It provides exact assembled prompt replacement and abort before `AgentSession.prompt()`; immutable agent/session/run/type/parent identity; execution cancellation; proposed result before addendum/status/events/history/notification/disposal; result replacement; bounded same-session continuation; typed failures; idempotent unregister; and exact disposal.
3. The unchanged Plugin Host conformance suite passes tool/service, foreground/background/queued, initial/resume, parent identity, cancellation, continuation, event ordering, no-interceptor parity, and disposal. Real Pi tests prove completion events occur only after acceptance.
4. Exact npm version and lock integrity are pinned to immutable tag/full commit provenance; MIT notice ships; Node 24 and active Pi peer ranges pass package/API tests.
5. Capability qualification is tied to the exact package bytes and unchanged suite digest/vectors. Method presence or adapter-authored booleans are insufficient.

### Published maintained MIT fork fallback

1. Plugin Host maintainers explicitly select/publish a clearly named fork from a current verified upstream release, preserve history/copyright/license, and name owners for namespace/credentials, security, and rebases.
2. The fork changes only the narrow identical public lifecycle seam and tests. It does not fork model/config/session/concurrency/turn/steer/resume/persistence/workspace/disposal policy beyond that seam.
3. Exact package/version/integrity/repository commit/upstream base/license provenance are pinned.
4. The unchanged conformance and all real Pi ordering/session, cancellation, secret, Node 24, peer-range, and package-export tests pass.
5. Returning to upstream changes only package selection/wrapper, not the host port, coordinator, capability policy, or application code.

## Blocker ownership

- `gotgenes/pi-packages` maintainers own upstream merge/release timing.
- Plugin Host maintainers own a current contract-focused contribution, release qualification, and explicit fork go/no-go.
- If forked, Plugin Host maintainers own package publication, MIT notices, security/rebase maintenance, provenance pins, unchanged conformance evidence, and upstream return path.
- No agent may claim an unmerged PR, unpublished fork, local patch, event observer, or package-internal workaround satisfies this gate.

## Deliverable after unblock

Implement the only concrete package wrapper and package-selection composition. Translate the supported API into `SubagentLifecyclePort`, validate every request/decision/capability/registration handoff, map unexpected failures to redacted `BoundaryError`, and keep package identity out of domain/application/hook contracts.

## Planned files after unblock

- `src/runtime/subagents/pi-subagents-lifecycle.ts`
- `src/composition/create-subagent-lifecycle.ts`
- `test/contract/pi-subagents-lifecycle.contract.test.ts`
- `test/integration/pi-subagents-lifecycle.test.ts`
- `package.json`
- `package-lock.json`

## Factory checkpoint

```typescript
// Package-internal. Callers receive only Plugin Host contracts.
export function createPiSubagentsLifecyclePort(input: Readonly<{
  service: QualifyingSubagentsLifecycleService;
  qualification: SubagentLifecycleCapabilities;
}>): SubagentLifecyclePort;
```

The wrapper does not expose manager/session/record internals, choose models/tools, manage queues/workspaces, own turns, reimplement resume/steer/persistence, or branch on upstream versus fork outside package selection.

## Acceptance evidence

- [ ] The exact pinned package passes the unchanged portable conformance suite and real Pi event/session order tests.
- [ ] Exact first prompt replacement/abort and pre-finalization result/continuation work on every required execution path.
- [ ] Identity, cancellation, continuation bound, no-interceptor parity, unregister, shutdown, and disposal pass without adapter-specific weakening.
- [ ] Qualification receipt matches runtime package version/integrity/tag/commit/license/engine/peer and suite digest.
- [ ] No prompt/result/config secret/path/native cause enters capabilities, activation evidence, diagnostics, status, logs, or package snapshots.
- [ ] Only this passing package changes truthful production `pi.subagents.lifecycle-interception` availability.

## Ordering

Depends on fake/conformance, portable composition/integration, and the published maintained-fork story. This story remains required for feature and parent-epic closure; the upstream-contribution story follows it.

## Risk and rollback

The highest risk is a type-compatible package whose actual resume/queue/finalization/disposal order violates semantics. Shared and real Pi tests are the gate. Rollback removes the package/wrapper and selects no lifecycle port, making only affected subagent-hook plugins unavailable while preserving ordinary plugins and all authoritative state.
