---
name: pi-subagents-v18
description: >
  Current @gotgenes/pi-subagents v18 integration facts. Load when work mentions
  @gotgenes/pi-subagents, pi-subagents@18.0.3, SubagentsService,
  getSubagentsService, SUBAGENT_EVENTS, subagents:child:spawning,
  subagents:child:session-created, subagents:child:completed,
  subagents:child:disposed, SubagentStart, SubagentStop, child lifecycle
  interception, prompt injection, pre-completion continuation, or an
  upstream/fork subagent adapter decision.
user-invocable: false
---

# `@gotgenes/pi-subagents` v18 reference

## Verified baseline

- Evidence date: **2026-07-16**.
- npm latest: **18.0.3**, Node `>=22`, MIT, published 2026-07-15.
- Tag: `pi-subagents-v18.0.3`; commit:
  `c76a294a777a990950da23fc06cb0caf51da7ac6`.
- The npm lifecycle/public-service source matches the tag byte-for-byte.
- Detailed evidence:
  [`docs/research/pi-subagents-lifecycle-interception.md`](../../../docs/research/pi-subagents-lifecycle-interception.md).

## Package exports

Supported subpaths are only:

```json
{
  ".": { "types": "./dist/public.d.ts", "default": "./src/service/service.ts" },
  "./settings": { "types": "./dist/settings.d.ts", "default": "./src/layered-settings.ts" }
}
```

The package also registers `./src/index.ts` as its Pi extension. Internal
`src/lifecycle/*` files ship but are blocked by `exports`; never deep-import
or patch them as a production contract.

## Public service

```ts
interface SubagentsService {
  spawn(type: string, prompt: string, options?: SpawnOptions): string;
  getRecord(id: string): SubagentRecord | undefined;
  listAgents(): SubagentRecord[];
  abort(id: string): boolean;
  steer(id: string, message: string): Promise<boolean>;
  waitForAll(): Promise<void>;
  hasRunning(): boolean;
  registerWorkspaceProvider(provider: WorkspaceProvider): () => void;
}
```

Root runtime exports are `SUBAGENT_EVENTS`, `getSubagentsService`,
`publishSubagentsService`, and `unpublishSubagentsService`.

`SubagentRecord` is serialized: no live session, prompt, abort signal, child
session id, parent identity, or execution collaborators. Public service spawn
also does not pass parent session identity into the manager.

`registerWorkspaceProvider` is the only generative seam. It controls cwd and a
result addendum; it cannot inspect/mutate prompts or request continuation.
Only one workspace provider may be registered.

## Observational events

Public constants:

```ts
SUBAGENT_EVENTS = {
  STARTED: "subagents:started",
  COMPLETED: "subagents:completed",
  FAILED: "subagents:failed",
  COMPACTED: "subagents:compacted",
  CREATED: "subagents:created",
  STEERED: "subagents:steered",
}
```

Pitfalls:

- `created` is background-only, before queue admission.
- `started` fires after status becomes running, before workspace/session setup.
- Public `completed`/`failed` are background initial-run events emitted after
  final status/result; foreground and resume paths omit them.
- Payload types are not exported in `dist/public.d.ts`.

Internal child channels (observe by string only, not supported API):

| Channel | Timing | Payload |
|---|---|---|
| `subagents:child:spawning` | Before environment/session creation | `{ agentName, parentSessionId? }` |
| `subagents:child:session-created` | After session creation, synchronously before `bindExtensions()` | `{ sessionId, parentSessionId? }` |
| `subagents:child:completed` | After initial `session.prompt()` resolves, before result/status finalization | `{ sessionDir, agentName, aborted, steered }` |
| `subagents:child:disposed` | On explicit session disposal, often much later | `{ sessionId }` |

Pi event dispatch is synchronous EventEmitter dispatch, but the emit seam returns
`void`. Async listeners are not awaited as decisions and listener return values
are ignored. Synchronous observation is not interception.

The source comment claiming `disposed` always fires in run `finally` is stale.
Sessions are retained for resume; disposal occurs on bind failure, cleanup,
session switch, or shutdown. Prompt failure does not immediately dispose.

## Exact prompt/finalization path

Initial run:

1. manager creates agent id; emits background `created`; starts/schedules;
2. run marks running and emits `started`; optional workspace prepare;
3. child `spawning`; config/resources/session creation;
4. child `session-created`; `bindExtensions`; recursion guard;
5. turn loop computes `effectivePrompt = parentContext + prompt` when inherited,
   otherwise `prompt`;
6. `AgentSession.prompt(effectivePrompt)`;
7. child `completed` (success only), then response extraction;
8. workspace addendum, status/result mutation, then background public completion;
9. session remains available for resume until explicit disposal.

`resumeTurnLoop(prompt)` calls `prompt` directly and emits neither child nor
public completion. Upstream issue `gotgenes/pi-packages#466` tracks this gap.

## Interception verdict

**18.0.3 has no supported lifecycle interceptor.** It cannot provide faithful:

- exact first-prompt inspection/replacement;
- pre-prompt denial;
- complete immutable agent/session/run/parent identity;
- interceptor cancellation;
- proposed-result inspection before status/events;
- same-session continuation before completion;
- bounded continuation loops;
- interceptor unregister/disposal.

Never claim `SubagentStart`/`SubagentStop` compatibility from `created`,
`started`, child events, public completion, `disposed`, or post-completion
steering/resume. Their timing, payload, coverage, and void event semantics differ.

## Integration decision

1. **Preferred:** contribute ordered typed async lifecycle interception upstream
   and consume the first qualifying npm release.
2. **Fallback:** if release timing fails, use a narrowly maintained MIT fork
   exposing the identical public port and passing the same conformance suite.
3. **Reject:** event approximation, deep imports, monkeypatching, package patches,
   private manager/session access, or post-completion resume as Stop continuation.
4. **Reject:** reimplementing subagent execution; config, models, sessions,
   concurrency, turns, steering, resume, persistence, and disposal stay upstream.

Production capability `pi.subagents.lifecycle-interception` remains unavailable
until a real package passes behavioral conformance. Portable Plugin Host ports,
schemas, probes, fakes, hook aggregation, and conformance tests may proceed.

## Minimum qualifying semantics

A qualifying package must export registration for ordered async interceptors and:

- provide immutable `agentId`, `sessionId`, per-execution `runId`, agent type,
  and parent session identity on tool/service, initial/resume paths;
- run start interceptors on the exact assembled prompt immediately before
  `AgentSession.prompt`, piping returned prompt replacements;
- honor typed abort and `AbortSignal` before a turn starts;
- expose proposed result before workspace addendum, status/timestamp, child/public
  completion, history/notification, or disposal;
- allow bounded same-session continuation and deterministic final-result flow;
- apply to foreground/background/queued/service/tool/initial/resume executions;
- define typed error ordering and idempotent unregister/disposal;
- preserve current behavior when no interceptor is registered;
- pass a package-independent real-session/event-order conformance suite.

Method presence alone does not qualify a version. Require released npm metadata,
pinned integrity/tag commit, compatible engines/peers, and behavioral probe success.

## Primary sources

- npm: <https://registry.npmjs.org/%40gotgenes%2Fpi-subagents>
- release: <https://github.com/gotgenes/pi-packages/releases/tag/pi-subagents-v18.0.3>
- package: <https://github.com/gotgenes/pi-packages/blob/c76a294a777a990950da23fc06cb0caf51da7ac6/packages/pi-subagents/package.json>
- public service: <https://github.com/gotgenes/pi-packages/blob/c76a294a777a990950da23fc06cb0caf51da7ac6/packages/pi-subagents/src/service/service.ts>
- manager/run: <https://github.com/gotgenes/pi-packages/blob/c76a294a777a990950da23fc06cb0caf51da7ac6/packages/pi-subagents/src/lifecycle/subagent.ts>
- session factory: <https://github.com/gotgenes/pi-packages/blob/c76a294a777a990950da23fc06cb0caf51da7ac6/packages/pi-subagents/src/lifecycle/create-subagent-session.ts>
- turn loop: <https://github.com/gotgenes/pi-packages/blob/c76a294a777a990950da23fc06cb0caf51da7ac6/packages/pi-subagents/src/lifecycle/subagent-session.ts>
- child events: <https://github.com/gotgenes/pi-packages/blob/c76a294a777a990950da23fc06cb0caf51da7ac6/packages/pi-subagents/src/lifecycle/child-lifecycle.ts>
- architecture decision: <https://github.com/gotgenes/pi-packages/blob/c76a294a777a990950da23fc06cb0caf51da7ac6/packages/pi-subagents/docs/decisions/0002-extensions-on-a-minimal-core.md>
- resume gap: <https://github.com/gotgenes/pi-packages/issues/466>
