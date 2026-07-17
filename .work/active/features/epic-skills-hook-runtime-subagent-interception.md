---
id: epic-skills-hook-runtime-subagent-interception
kind: feature
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-guarded-command-hooks]
release_binding: null
gate_origin: null
research_refs: [docs/research/pi-subagents-lifecycle-interception.md]
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Subagent Lifecycle Interception

## Brief

Establish the typed interception capability required to run `SubagentStart` before a child prompt begins and `SubagentStop` before final child completion. Feature design must first ground the current `@gotgenes/pi-subagents` integration surface and prefer an upstream contract; if upstream cannot expose faithful pre-start context injection, pre-stop continuation, cancellation, and identity evidence, a narrowly maintained adapter or fork implements the same host-owned port. The existing hook event adapter and guarded command executor supply all foreign hook semantics rather than a second subagent-specific runtime.

Probe the interception capability before compatibility and activation. When it is unavailable, plugins declaring subagent hooks remain supported components with an unavailable `pi.subagents.lifecycle-interception` requirement and therefore do not activate; plugins without those hooks continue normally. Observational process or completion events are never presented as interception, and Plugin Host does not implement its own subagent service, foreign agent definitions, model/provider behavior, or agent-team semantics.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: conditional adapter after ordinary command-hook execution is complete
- Degradation contract: capability absence is explicit and plugin-scoped, never a silent skip or approximate event

## Simplification opportunity

- Keep one narrow subagent lifecycle port and one hook executor; avoid cloning the subagent runtime, command process machinery, event/output aggregation, capability vocabulary, or compatibility policy inside the integration.

## Foundation references

- `docs/SPEC.md` — Supported events; Component compatibility verdicts
- `docs/ARCHITECTURE.md` — Subagent adapter; Runtime activation
- `docs/COMPATIBILITY.md` — Hook events; Hook input; Hook output

## Research finding and production blocker

Research: [`docs/research/pi-subagents-lifecycle-interception.md`](../../../docs/research/pi-subagents-lifecycle-interception.md)

`@gotgenes/pi-subagents@18.0.3` (tag `pi-subagents-v18.0.3`, commit `c76a294a777a990950da23fc06cb0caf51da7ac6`) has no supported pre-start or pre-completion interceptor. Its public `SubagentsService` exposes spawn/read/control plus one workspace provider; public and internal child events are observational `void` emissions. No event carries the exact first prompt or proposed final result with complete immutable child/parent identity and cancellation, and no event return can replace/deny the prompt or request same-session continuation before finalization. Foreground and resume completion coverage also differs from background initial runs.

**Blocked production surface:** the production adapter and an available `pi.subagents.lifecycle-interception` capability require either:

1. a published upstream release with ordered typed async interceptors for exact prompt replacement/abort and bounded pre-completion continuation; or
2. a narrowly maintained MIT fork exposing the identical port.

The package must pass the research document's objective conformance gate across tool/service, foreground/background/queued, initial/resume, cancellation, identity, event ordering, continuation bounds, and disposal. An issue, PR, commit-only patch, method-presence probe, event observer, deep import, monkeypatch, local package patch, settings mutation, or second subagent implementation does not qualify.

**Portable work that proceeds now:** define the Plugin Host port and qualification schema, add exact capability mapping, implement deterministic fakes and package-independent conformance, extend the existing planner/executor for subagent hook inputs and decisions, compose registration and activation evidence, and prove plugin-scoped degradation. The feature remains `stage: implementing` until the production-adapter child passes the external gate.

## UI alignment

Mockups skipped. This is a backend runtime boundary. Capability and compatibility evidence is presentation input for `epic-native-plugin-management`; no screen, flow, modal, or visual component is added here.

## Design decisions

- **Discovery posture**: Direct-read only, as explicitly required. Grounding covered the feature-design and principles skills; project rules/conventions; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; the parent epic; completed projection/reload, event-adaptation, and guarded-command feature contracts and source; current compatibility/capability code; the committed research; and `.agents/skills/pi-subagents-v18/SKILL.md`. No question, nested agent, peer mechanism, package patch, or production experiment was used.
- **Largest faithful portable increment**: Implement the public port, exact release qualification/capability probe, fake, reusable conformance suite, subagent hook planner/coordinator, and package-neutral composition now. Isolate the only real package import in one objectively blocked story. Internal consumers compile and test against the host port without changing truthful production availability.
- **Host-owned contract**: `src/application/ports/subagent-lifecycle.ts` is the sole public lifecycle vocabulary. Domain, compatibility, hook runtime, and composition never import `@gotgenes/pi-subagents` types. Upstream and a maintained fork must adapt to the same port; switching package selection cannot change Plugin Host contracts.
- **Exact immutable identity**: Every boundary carries immutable `agentId`, child `sessionId`, per-execution `runId`, `agentType`, and optional `parentSessionId`. `runId` is unique for every initial or resumed execution. Parent identity is optional only for genuinely parentless service execution; when an active parent exists, tool and service paths must populate it consistently.
- **Exact execution path**: Every request identifies `phase: initial | resume`, `origin: tool | service`, `mode: foreground | background`, and `admission: immediate | queued`. Coverage is behavioral, not inferred from a method name. Queued means the same interceptor runs after admission and before the first prompt, never at record creation.
- **Exact start boundary**: `beforeStart` receives the fully assembled prompt immediately before the corresponding `AgentSession.prompt()`. Plugin Host returns the only prompt the package may send, or a typed abort that prevents the call. Prompt replacement is sequential at the package level; Plugin Host registers one aggregate interceptor.
- **Exact completion boundary**: `beforeComplete` receives the proposed result before workspace addendum/disposal, record status/timestamps, child/public completion events, history, or notification. `complete.result` is the only value finalized; `continue.prompt` runs another turn in the same child session and re-enters completion; `abort` terminalizes without partial completion.
- **Continuation bound**: One registry constant, `HOOK_SUBAGENT_CONTINUATION_BUDGET = 3`, configures registration and coordinator mapping. The first proposed result has `continuationRound: 0`; each accepted continuation increments it. A continuation request at round 3 becomes typed `continuation-limit` abort evidence, never an ignored decision or fourth extra turn. Initial and resume executions each receive an independent budget.
- **Package-level interceptor semantics**: A stable snapshot of registered interceptors is taken per boundary, invoked sequentially in registration order, and awaited. Start prompt replacements and completion result replacements pipe to the next interceptor. Disposing a registration is idempotent and excludes it from future snapshots; an in-flight callback finishes unless its execution/runtime signal aborts. Service shutdown aborts in-flight work and disposes exactly once.
- **Plugin-level concurrency and ordering**: For one foreign hook boundary, Plugin Host snapshots the current verified catalog and selected handlers once. Matching command handlers use the existing bounded concurrent executor; completion order never becomes precedence. Existing `sourceOrder` controls context, reason, and diagnostic aggregation. A continuation is a new completion boundary and intentionally takes a new catalog snapshot while retaining the same execution identity.
- **No stale silent execution**: Each selected handler still passes `HookExecutionContextPort`'s active binding/current-project/root/configuration checks immediately before spawn. Update, disable, trust change, or session replacement racing a captured plan produces one fail-closed boundary result; it neither runs stale authority nor partially applies earlier handler decisions.
- **Foreign input shape**: Extend the strict existing `ForeignHookInput` union with `SubagentStart` and `SubagentStop`. Both use the parent Pi `session_id`, optional real `transcript_path`, exact cwd, `agent_id`, and `agent_type`. `SubagentStop` receives the actual proposed result as `last_assistant_message`. Child `sessionId`, `runId`, execution path, outcome, and continuation round live only under `pi.subagent`; no foreign field is fabricated. The exact assembled start prompt remains an internal port value because the documented foreign input does not name that field.
- **Matcher semantics**: The existing event/selector registry remains authoritative. A subagent matcher evaluates against the exact `agentType`; missing/empty/`*`, exact sets, and regex use the existing compiler. Agent id, session id, run id, prompt, and result are not matcher aliases.
- **Start decision mapping**: A block, `continue: false`, stop reason, execution ambiguity, invalid output, or cancellation aborts before the prompt. Otherwise accepted `additionalContext` values append to the exact prompt in declaration order as `prompt + "\n\n" + contexts.join("\n\n")`; zero contexts preserve the original bytes. No trimming, newline normalization, shell expansion, or implicit context is added.
- **Stop decision mapping**: No continuation decision returns `complete` with the proposed result byte-for-byte. A block/`continue: false`/stop reason/exit-2 requests same-session continuation. Its prompt is declaration-ordered `additionalContext`, followed by the selected safe reason; if both are empty, use one fixed registry-owned continuation instruction. Hook failure, authority ambiguity, cancellation, or budget exhaustion produces typed abort rather than committing a partial result.
- **Output compatibility**: Extend the existing output policy registry rather than add a subagent parser. `SubagentStart` accepts only context plus block/stop controls; `SubagentStop` accepts only context plus continuation controls. Fields without a faithful child boundary (permission, input/tool-output rewrite, title, terminal/watch/env/reload operations) remain explicit runtime hook errors. Configured-value redaction and strict JSON/UTF-8/output limits remain in the guarded executor.
- **Session association**: A private `SubagentHookSessionContextPort` resolves an existing parent session id to the same `HookSessionEvidence` used by ordinary hooks. A genuinely parentless service execution is unmanaged and passes through unchanged because no Plugin Host session owns it. A claimed parent id that cannot resolve, disagrees with current project/trust, or changes during authority validation fails closed when subagent hooks are active.
- **Capability is qualified behavior**: `SubagentLifecycleCapabilitiesSchemaV1` reports exact semantic and path coverage plus provider evidence. A test fake can report full semantics for conformance but has `provider.kind: test` and can never make production compatibility available. Only `provider.kind: published-package` with pinned package/version/integrity/tag commit/MIT/engine/peer evidence and a conformance receipt tied to every required vector can satisfy the decorator.
- **Not method-presence probing**: `createSubagentLifecycleCapabilityProbe` validates the complete qualification receipt, exact package bytes/version, every semantic/path vector, current Node 24/Pi compatibility, and a qualification digest. Missing runtime produces `unavailable` for only `pi.subagents.lifecycle-interception`; malformed or self-contradictory present evidence is `ADAPTER_FAILED`. A boolean such as `registerLifecycleInterceptor in service` is never sufficient.
- **Probe-before-activation**: Native composition calls the capability decorator before compatibility evaluation. Only supported components that cite the subagent requirement are blocked when it is unavailable; ordinary hooks, skills, and MCP facts remain unchanged. After compatibility selects active projections, registration must echo the same qualification digest in exact activation evidence or activation fails and existing lifecycle compensation applies.
- **Exact activation evidence**: `SubagentLifecycleRegistrationEvidenceSchemaV1` binds the registered aggregate interceptor to contract version, provider qualification digest, continuation budget, ordered-async mode, and active registration state. It contains no path, prompt, result, hook output, secret, timestamp, native cause, or package-internal object. Registration success alone cannot repair an unavailable qualification fact.
- **Secret and ephemeral-content contract**: Exact prompt and proposed result are callback-lifetime values. They may be sent only in documented foreign stdin fields (`last_assistant_message` for stop; start prompt is not serialized), transformed into the immediate returned decision, and then released. They never enter capability/activation evidence, diagnostics, status, state, snapshots, logs, test names, or native causes. Hooks are trusted executable code and receive the documented result/context fields; Plugin Host does not pretend those fields are secret from the hook itself. Existing callback-scoped configuration redaction applies before accepted hook output leaves execution context.
- **Cancellation**: A signal already aborted or aborted while a lifecycle/hook callback is pending propagates its original reason, starts no later prompt/continuation, commits no completion, and emits no completion evidence. Runtime shutdown combines with execution cancellation. Cancellation after a child turn but before accepted completion cannot finalize the proposed result.
- **No-interceptor and no-hook behavior**: With no registered interceptor, the package's existing execution bytes/order/status/events remain unchanged. With Plugin Host registered but no selected subagent hooks, the coordinator returns unchanged continue/complete decisions without spawning a command or resolving configuration. Plugins without subagent hooks remain activatable when the capability is absent because they never cite the requirement.
- **Public/private boundary**: Export the strict host port, serializable schemas/types, capability decorator, and package-neutral registration factory through `src/index.ts`. Keep fake, conformance harness, hook planner snapshots, session resolver, coordinator internals, package imports, package metadata readers, Pi service types, prompts/results, signals, and raw registration handles private.
- **Foundation timing**: Code-first. Existing foundation documents already state intended faithful interception and unavailable degradation. Implementation rolls them forward only if the exact ephemeral field, continuation-bound, or qualification wording makes a current assertion false or misleading.
- **Review posture**: This boundary is contract-sensitive and production integration would normally merit advisory design review. The caller explicitly prohibited nested agents; design-time advisory is skipped non-blockingly. Standard feature-level implementation review remains required when the externally blocked feature can reach review.

## Architectural choice

### Option A — adapt current public/child events

Observe `created`, `started`, `subagents:child:*`, public completion, or disposal and call the existing executor nearby. This is immediately available but cannot await async decisions, replace the exact prompt, prevent the first turn, inspect a proposed result before status/events, cover foreground/resume consistently, or continue the same session before finalization. Rejected as false compatibility.

### Option B — patch/deep-import/monkeypatch 18.0.3 or reimplement subagents

Reach blocked `src/lifecycle/*`, patch package lines, mutate settings, wrap serialized service methods, steer after completion, or own child sessions. This couples to fast-moving internals and duplicates model/session/concurrency/resume/disposal behavior while still missing a supported lifecycle contract. Rejected even as an interim path.

### Option C — host-owned port, behavioral qualification, portable coordinator, blocked package wrapper (chosen)

Define the exact adapter-neutral lifecycle and evidence contracts, prove them through a deterministic fake and shared suite, reuse the existing hook planner/executor/aggregator, and let one future wrapper translate a qualifying published upstream/fork API. Until then, compose no production port and report only the affected requirement unavailable.

**Choice**: Option C. It yields the largest testable increment without claiming production support, keeps package selection late-bound, and makes the eventual upstream/fork decision a narrow wrapper plus unchanged conformance evidence.

## Trickiest unit first

The hardest seam is pre-completion continuation without accidentally finalizing or leaking the candidate result. The runtime must pause after extracting a proposed result but before workspace addendum, status/timestamp mutation, completion events, history/notification, or disposal; await ordered hook commands; and either accept the exact result, replace it, abort, or issue another prompt to the same child session. Every continuation re-enters the same boundary with an incremented round and the same immutable execution identity. The public decision type, fake state machine, conformance trace, and coordinator mapping are designed first around this ordering; a future package that cannot expose it fails qualification rather than weakening the contract.

## Public lifecycle and qualification contract

### Serializable identity, requests, decisions, and capability evidence

**File**: `src/application/ports/subagent-lifecycle.ts`

**Story**: `epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe`

```typescript
export const SubagentExecutionIdentitySchemaV1 = z.object({
  schemaVersion: z.literal(1),
  agentId: z.string().min(1),
  sessionId: z.string().min(1),
  runId: z.string().min(1),
  agentType: z.string().min(1),
  parentSessionId: z.string().min(1).optional(),
}).strict().readonly();
export type SubagentExecutionIdentity = z.infer<
  typeof SubagentExecutionIdentitySchemaV1
>;

export const SubagentExecutionPathSchemaV1 = z.object({
  phase: z.enum(["initial", "resume"]),
  origin: z.enum(["tool", "service"]),
  mode: z.enum(["foreground", "background"]),
  admission: z.enum(["immediate", "queued"]),
}).strict().readonly();
export type SubagentExecutionPath = z.infer<typeof SubagentExecutionPathSchemaV1>;

export type SubagentStartRequest = Readonly<{
  identity: SubagentExecutionIdentity;
  execution: SubagentExecutionPath;
  prompt: string; // exact next AgentSession.prompt value
  signal: AbortSignal;
}>;

export const SubagentStartDecisionSchemaV1 = z.discriminatedUnion("action", [
  z.object({ action: z.literal("continue"), prompt: z.string() }).strict().readonly(),
  z.object({
    action: z.literal("abort"),
    code: z.enum(["hook-blocked", "hook-failed", "runtime-disposed"]),
    reason: z.string().min(1),
  }).strict().readonly(),
]);
export type SubagentStartDecision = z.infer<typeof SubagentStartDecisionSchemaV1>;

export type SubagentCompletionRequest = Readonly<{
  identity: SubagentExecutionIdentity;
  execution: SubagentExecutionPath;
  proposedResult: string;
  outcome: "completed" | "steered" | "aborted";
  continuationRound: number;
  maxContinuationRounds: number;
  signal: AbortSignal;
}>;

export const SubagentCompletionDecisionSchemaV1 = z.discriminatedUnion("action", [
  z.object({ action: z.literal("complete"), result: z.string() }).strict().readonly(),
  z.object({ action: z.literal("continue"), prompt: z.string().min(1) }).strict().readonly(),
  z.object({
    action: z.literal("abort"),
    code: z.enum([
      "hook-blocked",
      "hook-failed",
      "continuation-limit",
      "runtime-disposed",
    ]),
    reason: z.string().min(1),
  }).strict().readonly(),
]);
export type SubagentCompletionDecision = z.infer<
  typeof SubagentCompletionDecisionSchemaV1
>;
```

The capability schema has one explicit `semantics` object (`orderedAsync`, `exactStartPrompt`, `startReplacement`, `startAbortBeforePrompt`, `executionCancellation`, `proposedResultBeforeFinalization`, `resultReplacement`, `sameSessionContinuation`, `boundedContinuation`, `typedFailureOrdering`, `idempotentUnregister`, `disposeExactlyOnce`, `unchangedWithoutInterceptors`) and one explicit `coverage` object (`tool`, `service`, `foreground`, `background`, `queued`, `initial`, `resume`, `parentIdentityWhenPresent`). A `published-package` provider additionally carries package name, exact semver, canonical `sha512-` integrity, 40-character commit, release tag, `MIT`, Node engine, Pi peer range, contract version, conformance-suite version/digest, and every required vector as literal `true`. A `test` provider is accepted by the port/conformance schema but never by the production capability decorator.

### Registration and probe

**Files**:
- `src/application/ports/subagent-lifecycle.ts`
- `src/application/subagent-lifecycle-capability-probe.ts`

```typescript
export interface SubagentLifecycleInterceptor {
  beforeStart(request: SubagentStartRequest): Promise<SubagentStartDecision>;
  beforeComplete(
    request: SubagentCompletionRequest,
  ): Promise<SubagentCompletionDecision>;
}

export type SubagentLifecycleRegistrationRequest = Readonly<{
  interceptor: SubagentLifecycleInterceptor;
  expectedQualificationDigest: ContentDigest;
  maxContinuationRounds: number;
}>;

export interface SubagentLifecycleRegistration {
  readonly evidence: SubagentLifecycleRegistrationEvidence;
  dispose(): Promise<void>; // idempotent
}

export interface SubagentLifecyclePort {
  capabilities(signal: AbortSignal): Promise<SubagentLifecycleCapabilities>;
  register(
    request: SubagentLifecycleRegistrationRequest,
    signal: AbortSignal,
  ): Promise<SubagentLifecycleRegistration>;
}

export function createSubagentLifecycleCapabilityProbe(input: Readonly<{
  base: RuntimeCapabilityProbe;
  lifecycle?: Pick<SubagentLifecyclePort, "capabilities">;
  capturedBy: string;
  runtime: Readonly<{ nodeVersion: string; piVersion: string }>;
}>): RuntimeCapabilityProbe;
```

`SubagentLifecycleRegistrationEvidenceSchemaV1` contains only `schemaVersion`, contract version, literal capability id, qualification digest, `orderedAsync: true`, `maxContinuationRounds`, and `state: "registered"`. The decorator overwrites only `pi.subagents.lifecycle-interception`, preserves every base fact, treats missing lifecycle as a valid unavailable result, and turns malformed/self-contradictory present evidence into the existing redacted `BoundaryError(ADAPTER_FAILED)`.

## Implementation units

### Unit 1: Public lifecycle port, qualification receipt, and exact capability mapping

**Story**: `epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe`

**Files**:
- `src/application/ports/subagent-lifecycle.ts`
- `src/application/subagent-lifecycle-capability-probe.ts`
- `src/domain/hook-runtime-limits.ts`
- `src/index.ts`
- `test/application/subagent-lifecycle-contract.test.ts`
- `test/application/subagent-lifecycle-capability-probe.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

**Implementation notes**:
- Infer every serializable public value from strict Zod schemas; requests add only callback-lifetime `AbortSignal` and exact strings.
- Reuse `RuntimeCapabilityRegistry`, `RuntimeCapabilityProbe`, `ContentDigestSchema`, semver validation, `BoundaryError`, and the explicit package barrel. Do not add a second verdict or capability id.
- Canonically hash the qualification receipt excluding no semantic field. Registration must echo that digest.
- A test provider proves the portable contract but always maps production capability unavailable; only a complete published-package receipt can map available.

**Acceptance criteria**:
- [ ] Strict schemas reject missing/extra identity, execution, semantic, coverage, package, conformance, and registration fields.
- [ ] Distinct initial/resume attempts cannot reuse `runId`; immutable request fixtures resist caller mutation.
- [ ] Missing lifecycle marks only `pi.subagents.lifecycle-interception` unavailable and preserves ordinary hook/skill/MCP/platform facts.
- [ ] Test providers, partial semantics/coverage, method-only fixtures, bad integrity/commit/license/engine/peer/version, and qualification-digest disagreement remain unavailable or fail as malformed present evidence according to the boundary contract.
- [ ] A complete published-package fixture maps available; abort propagates unchanged; malformed adapter evidence is `ADAPTER_FAILED` with no package path, prompt, result, native message, or cause serialization.
- [ ] Compatibility reports keep subagent hook components supported with an unavailable requirement while an ordinary-only sibling plugin remains activatable.
- [ ] Public source/compiled allowlists expose only portable schemas/types/port/probe and no package, fake, signal instance, prompt/result value, or conformance implementation.

### Unit 2: Deterministic lifecycle fake and reusable behavioral conformance

**Story**: `epic-skills-hook-runtime-subagent-interception-fake-conformance`

**Depends on**: `epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe`

**Files**:
- `test/support/fakes/subagent-lifecycle.ts`
- `test/support/fakes/subagent-lifecycle.test.ts`
- `test/contract/subagent-lifecycle.contract.ts`
- `test/contract/subagent-lifecycle.contract.test.ts`
- `test/integration/subagent-lifecycle-port.test.ts`

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

The fake owns only a deterministic test turn state machine; it is not production subagent behavior. Its trace records symbolic ordered checkpoints (`start-interceptor`, `prompt`, `proposed-result`, `completion-interceptor`, `continuation-prompt`, `finalize`, `completion-event`, `dispose`) and immutable identities/decision kinds, never unrestricted prompt/result text in snapshots or errors.

**Acceptance criteria**:
- [ ] Ordered async interceptors pipe start prompt and completion result replacements sequentially; inverse promise timing cannot reorder them.
- [ ] Start abort and cancellation while awaiting start prevent the first prompt and every completion/finalization checkpoint.
- [ ] Completion interception precedes addendum/status/event/history/notification/disposal symbols; abort/cancellation cannot leave partial completion.
- [ ] Continuation uses the same session/agent/run identity, emits no intermediate finalization/event/disposal, increments rounds deterministically, and terminates at the exact configured bound.
- [ ] Tool/service, foreground/background, immediate/queued, initial/resume, steered/aborted outcomes, parent-present/parentless identity, and no-interceptor behavior all pass one parameterized matrix.
- [ ] Initial and resume runs use distinct run ids; cancellation and session/runtime disposal release callbacks exactly once; unregister is idempotent and excludes only future snapshots.
- [ ] Deliberately broken harnesses prove the same suite detects event approximation, post-finalization completion callbacks, missing resume coverage, prompt replacement loss, unbounded continuation, imprecise identity, and double disposal.
- [ ] Fake/test traces and thrown errors never serialize secret canary prompt/result values; the fake and contract are not production exports.

### Unit 3: Subagent hook event planning and aggregate coordinator

**Story**: `epic-skills-hook-runtime-subagent-interception-hook-coordinator`

**Depends on**: `epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe`

**Files**:
- `src/domain/hook-runtime-contract.ts`
- `src/domain/hook-output-contract.ts`
- `src/runtime/hooks/event-contract.ts`
- `src/runtime/hooks/event-input.ts`
- `src/runtime/hooks/hook-event-planner.ts`
- `src/runtime/hooks/hook-output-parser.ts`
- `src/runtime/hooks/hook-decision-aggregator.ts`
- `src/runtime/subagents/subagent-hook-session-context.ts`
- `src/runtime/subagents/subagent-hook-coordinator.ts`
- `test/domain/hook-runtime-contract.test.ts`
- `test/domain/hook-output-contract.test.ts`
- `test/runtime/hooks/event-contract.test.ts`
- `test/runtime/hooks/hook-event-planner.test.ts`
- `test/runtime/hooks/hook-output-parser.test.ts`
- `test/runtime/hooks/hook-decision-aggregator.test.ts`
- `test/runtime/subagents/subagent-hook-coordinator.test.ts`

```typescript
export const SubagentStartHookInputSchema = z.object({
  ...commonHookInput,
  hook_event_name: z.literal("SubagentStart"),
  agent_id: z.string().min(1),
  agent_type: z.string().min(1),
  pi: PiEvidenceSchema.extend({
    subagent: SubagentBoundaryEvidenceSchemaV1.extend({
      boundary: z.literal("start"),
    }).strict().readonly(),
  }).strict().readonly(),
}).strict().readonly();

export const SubagentStopHookInputSchema = z.object({
  ...commonHookInput,
  hook_event_name: z.literal("SubagentStop"),
  agent_id: z.string().min(1),
  agent_type: z.string().min(1),
  last_assistant_message: z.string(),
  pi: PiEvidenceSchema.extend({
    subagent: SubagentBoundaryEvidenceSchemaV1.extend({
      boundary: z.literal("completion"),
      outcome: z.enum(["completed", "steered", "aborted"]),
      continuationRound: z.number().int().nonnegative(),
    }).strict().readonly(),
  }).strict().readonly(),
}).strict().readonly();

export interface SubagentHookCoordinator extends SubagentLifecycleInterceptor {
  dispose(): Promise<void>;
}

export function createSubagentHookCoordinator(input: Readonly<{
  planner: SubagentHookEventPlanner;
  executor: GuardedCommandHookExecutor;
  sessions: SubagentHookSessionContextPort;
  runtimeSignal: AbortSignal;
  continuationBudget: number;
}>): SubagentHookCoordinator;
```

**Implementation notes**:
- Generalize the existing executable plan/input schemas from ordinary-only to `OrdinaryHookEvent | SubagentHookEvent`; do not create a second planner, executor, output parser, diagnostic type, or aggregator.
- Planner selection snapshots one catalog array and one source order per boundary. It uses `agentType` as the matcher subject and verifies parent session/current project/trust/projection bindings through existing contracts.
- The coordinator returns no-op exact decisions when no subagent hooks are selected. If hooks are selected, all executor/parse/authority diagnostics fail the boundary closed with fixed safe codes.
- Start context append and Stop continuation prompt construction are pure bounded helpers with golden byte vectors. Continuation at the configured bound returns typed abort.

**Acceptance criteria**:
- [ ] Strict subagent inputs include exact documented foreign fields and namespaced identity/path/outcome evidence; no start prompt, native service record, package object, workspace path, or cause is serialized.
- [ ] Matcher all/set/regex behavior uses exact agent type and the existing compiler; compatibility and runtime selection cannot disagree.
- [ ] Multiple plugins/scopes and handlers aggregate in existing source order despite inverse completion, while exact duplicate handling follows the guarded executor's binding identity.
- [ ] Start no-op preserves prompt bytes; contexts append with the exact delimiter/order; any block/error/cancellation prevents a prompt.
- [ ] Stop no-op preserves result bytes; continuation uses the same-session decision with exact prompt order/fallback; result is not committed before acceptance.
- [ ] Round 0 through 2 may request continuation, round 3 cannot; initial and resume budgets are independent because the package supplies distinct run ids.
- [ ] Parentless unmanaged service runs pass through without pretending a Plugin Host session; stale/unknown claimed parent identity fails closed when active hooks require session context.
- [ ] Update/disable/trust races after planning produce no partial decision and do not switch to a newly activated plugin within the current boundary.
- [ ] Configured secret canaries are redacted from accepted hook output and every diagnostic/evidence value; exact proposed result appears only in the documented stop stdin and immediate port decision.

### Unit 4: Package-neutral registration, public composition, and integrated degradation evidence

**Story**: `epic-skills-hook-runtime-subagent-interception-composition-integration`

**Depends on**: `epic-skills-hook-runtime-subagent-interception-fake-conformance`, `epic-skills-hook-runtime-subagent-interception-hook-coordinator`

**Files**:
- `src/application/subagent-hook-runtime.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/application/subagent-hook-runtime.test.ts`
- `test/integration/subagent-hook-runtime.test.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/integration/skill-hook-runtime-projection.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed behavior makes a current assertion stale

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

**Implementation notes**:
- Verify the same qualification digest used by the pre-activation probe, register exactly one aggregate interceptor, strict-parse returned activation evidence, and expose only idempotent disposal.
- Registration does not read state, manifests, settings, package internals, or files. Native composition supplies the already-qualified port, verified catalog, hook executor, session context, and runtime signal.
- Use the fake port for integration only. Fake qualification never changes production capability availability; tests inject it directly after asserting that distinction.
- Dependency rules keep the application port/probe free of Node/Pi/runtime imports and keep the package-neutral registration factory free of `@gotgenes/pi-subagents`.

**Acceptance criteria**:
- [ ] Probe qualification digest and registration evidence must match exactly before the runtime is usable; mismatch/disposal race/registration failure yields no activation evidence.
- [ ] One fake-backed path proves normalized subagent hook projection → parent session context → strict plan → guarded executor → ordered aggregate → exact start/stop lifecycle decisions.
- [ ] Two active plugins aggregate without scope collision; disabling/updating one causes the next boundary to use the new verified catalog while an in-flight boundary remains all-or-nothing.
- [ ] A plugin with `SubagentStart`/`SubagentStop` is supported-but-not-activatable under production package absence; ordinary-only plugins in the same catalog remain activatable and execute normally.
- [ ] Registration/disposal/cancellation tests cover initial, resume, queued, continued, blocked, cancelled, session replacement, and runtime shutdown without leaked callbacks or continuation after disposal.
- [ ] Activation/capability/compatibility/state/diagnostic/public-package values contain no prompt, result, command output, configuration secret, absolute path, package native cause, or test canary.
- [ ] No settings mutation, deep import, monkeypatch, package patch, child event observation, post-completion steer/resume, or second subagent implementation exists in source or dependency graph.
- [ ] Full `npm test` passes typecheck, boundaries, Vitest, build, and compiled allowlist; implementation records exact baseline/additions and leaves the feature implementing because production remains blocked.

### Unit 5: Production `@gotgenes/pi-subagents` upstream/fork adapter

**Story**: `epic-skills-hook-runtime-subagent-interception-production-adapter`

**Depends on**: `epic-skills-hook-runtime-subagent-interception-fake-conformance`, `epic-skills-hook-runtime-subagent-interception-composition-integration`

**Planned files after unblock**:
- `src/runtime/subagents/pi-subagents-lifecycle.ts`
- `src/composition/create-subagent-lifecycle.ts`
- `test/contract/pi-subagents-lifecycle.contract.test.ts`
- `test/integration/pi-subagents-lifecycle.test.ts`
- `package.json`
- `package-lock.json`

```typescript
// Package-internal. Application/domain/runtime callers receive only the host port.
export function createPiSubagentsLifecyclePort(input: Readonly<{
  service: QualifyingSubagentsLifecycleService;
  qualification: SubagentLifecycleCapabilities;
}>): SubagentLifecyclePort;
```

**Implementation notes**:
- Objectively blocked. Do not add the dependency or source wrapper until the story's published-release/fork gate is satisfied.
- This is the only module allowed to import the qualifying package export. It maps package requests/decisions/evidence/errors into the host port and validates every handoff.
- It does not expose manager/session/record internals, select models/tools, manage queues/workspaces, own turns, reimplement resume/steer/persistence, or branch application behavior by upstream versus fork.

**Acceptance criteria**:
- [ ] A pinned qualifying published package passes the unchanged reusable conformance suite and real Pi session/event-order tests.
- [ ] Exact first prompt replacement/abort and pre-finalization result/continuation are proven on tool/service, foreground/background/queued, initial/resume paths.
- [ ] Package/runtime metadata matches the qualification receipt, Node 24/Pi ranges, lock integrity, immutable tag/commit, and MIT notice.
- [ ] No-interceptor behavior remains byte/order compatible; unregister/shutdown/cancellation/disposal semantics pass unchanged.
- [ ] Only the passing real package changes truthful production capability availability; fake or method-presence evidence cannot.

## Implementation order and dependency DAG

1. `epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe` — no sibling dependencies.
2. In parallel after the contract:
   - `epic-skills-hook-runtime-subagent-interception-fake-conformance`
   - `epic-skills-hook-runtime-subagent-interception-hook-coordinator`
3. `epic-skills-hook-runtime-subagent-interception-composition-integration` — depends on fake/conformance and coordinator.
4. `epic-skills-hook-runtime-subagent-interception-production-adapter` — depends on conformance and composition, and remains externally blocked.

These stories are durable design/verification checkpoints for one cohesive feature owner, not default parallel agent assignments. Portable ownership remains one feature bundle. Production package work begins only after objective external evidence changes.

## External blocker and exact unblock gate

**Current evidence**: npm `@gotgenes/pi-subagents@18.0.3`, release tag `pi-subagents-v18.0.3`, commit `c76a294a777a990950da23fc06cb0caf51da7ac6`, and the researched current main expose no supported lifecycle interceptor. Root exports are `SUBAGENT_EVENTS`, `getSubagentsService`, `publishSubagentsService`, and `unpublishSubagentsService`; the service has spawn/read/control plus one workspace provider. Child channels are blocked internals with `void` observer semantics. No maintained qualifying fork is declared.

The production adapter story unblocks only when one path satisfies every criterion below.

### Qualifying upstream release

1. A published npm release, not an issue/PR/branch/commit-only dependency, documents a root or explicit exported subpath with typed ordered async lifecycle registration.
2. The API supplies exact assembled prompt replacement/abort; immutable agent/session/run/type/parent identity; cancellation; proposed-result interception before every finalization side effect; result replacement; bounded same-session continuation; typed errors; idempotent unregister; and exact disposal.
3. The unchanged package-independent conformance suite passes for tool/service, foreground/background/queued, initial/resume, cancellation, continuation, identity, event order, no-interceptor behavior, and disposal; real Pi integration proves child/public completion occurs only after acceptance.
4. Exact npm version and lock integrity are pinned to an immutable release tag/full commit; MIT license notice ships; Node 24 and the active Pi peer version satisfy declared ranges and tests.
5. Capability evidence is tied to those exact package bytes and suite digest. Method presence, event observation, or an adapter-authored boolean does not qualify.

### Qualifying maintained MIT fork fallback

1. Plugin Host maintainers explicitly select and publish a clearly named MIT fork from a current verified upstream release, preserve history/copyright/license, and name owners for package publication, security updates, and upstream rebases.
2. The fork changes only the narrow public lifecycle seam and tests needed for the identical API. It does not diverge on config, models, sessions, concurrency, turns, steering, resume, persistence, workspaces, or disposal policy beyond that seam.
3. Exact package/version/integrity/repository commit/upstream base/license provenance are pinned and reviewable.
4. The unchanged conformance, real Pi event-order/session, Node 24, peer-range, cancellation, secret, and package-export tests pass.
5. Returning to upstream changes only package selection/wrapper, never the host port, hook coordinator, compatibility policy, or application code.

**Blocker ownership**:
- Upstream path: `gotgenes/pi-packages` maintainers own merge/release timing; Plugin Host maintainers own a current contract-focused contribution and qualification.
- Fork fallback: Plugin Host maintainers own explicit go/no-go, namespace/credentials, MIT notices, security/rebase maintenance, provenance pins, unchanged conformance evidence, and the upstream-return path.
- No agent may claim an unsubmitted/unmerged PR, unpublished fork, local patch, deep import, monkeypatch, settings mutation, observational event bridge, or post-completion resume satisfies this gate.

## Testing

- **Public contract**: strict identity/path/decision/capability/registration schema and public allowlist tests protect the adapter-neutral ABI.
- **Behavioral conformance**: one reusable trace-based suite protects async order, exact prompt/result boundaries, every execution path, cancellation, continuation bounds, no-interceptor parity, unregister, and disposal.
- **Hook semantics**: registry/input/output/parser/aggregate goldens protect exact foreign fields, agent-type matching, context/continuation mapping, source-order determinism, and unsupported-output rejection.
- **Plugin scope**: mixed-plugin compatibility and runtime integration protect requirement-only degradation, user/project isolation, catalog snapshots, trust/reload races, and ordinary-hook independence.
- **Secrets**: canaries in prompts, proposed results, configuration, stdout/stderr, adapter failures, and package metadata protect callback lifetime and all serialized evidence boundaries.
- **Production qualification**: unchanged conformance plus real Pi package/session/event-order tests are mandatory after unblock; fake success cannot substitute.
- **Low-value tests avoided**: no assertion for every trivial Zod primitive, no snapshots of raw prompts/results/absolute paths, no duplicate process runner/configuration redaction matrix, and no tests that merely assert callback counts without ordering/decision evidence.

## Simplification

- Reuse the single hook event/selector/output policy registries, verified runtime catalog, guarded executor, active execution-context authority, redaction, diagnostics, aggregation, capability registry, and compatibility evaluator.
- Generalize `HookEventPlan` and output policy once to executable ordinary/subagent events instead of creating a second hook runtime.
- Keep one aggregate interceptor registered with the package. Package-level ordering composes Plugin Host with other extensions; Plugin Host's own plugin hooks aggregate internally.
- Keep continuation state in the owning subagent runtime, with one configured bound. Do not persist counters, add state schemas, create a scheduler, or steer/resume after completion.
- Keep package qualification and activation evidence secret-free and logical. Do not persist prompts/results, package objects, paths, event payloads, or native errors.
- No existing guarantee is removed; the no-package fallback is explicit unavailability.

## Risks and rollback

- **Riskiest assumption — future package can expose the boundary without destabilizing its lifecycle**: queue, foreground/background, resume, workspace, event, history, and disposal paths currently diverge. Mitigation: exact path matrix and unchanged package-level conformance gate. If it cannot, production remains unavailable; portable work does not force a fork.
- **Continuation finalizes too early**: any status/event/history/addendum/disposal before hook acceptance breaks semantics. Mitigation: symbolic and real event-order tests assert a complete forbidden window; result/continuation decisions are unavailable after finalization.
- **Capability receipt becomes ceremonial**: a wrapper could report booleans without behavior. Mitigation: only exact published package metadata plus unchanged suite digest/vectors and real adapter tests qualify; fake/test provider cannot map available.
- **Catalog changes during a boundary**: update/disable/trust changes can otherwise mix revisions. Mitigation: one selected-plan snapshot plus per-handler active authority; any disagreement fails the whole boundary without partial aggregation.
- **Continuation loops forever**: package and coordinator bounds could disagree. Mitigation: registration evidence binds one budget; every request carries round/max; mismatch is adapter failure and round-at-limit aborts explicitly.
- **Parentless/stale service identity**: forcing hooks onto an unrelated or vanished session would leak scope. Mitigation: genuinely parentless executions are unmanaged pass-through; claimed parents must resolve exactly when hooks are active.
- **Prompt/result leakage**: broad logs, errors, snapshots, traces, or capability facts could retain model content. Mitigation: schemas cannot represent it outside callback requests/decisions; test traces use symbolic events and secret canaries.
- **Production package churn**: fast upstream releases make internal coupling brittle. Mitigation: one supported package export wrapper, exact pin/integrity/tag, no deep imports, and unchanged conformance.
- **Rollback**: remove the concrete package wrapper/dependency and select no lifecycle port. Production capability becomes unavailable; affected plugins stop activating, ordinary plugins continue, and portable contracts/tests remain. No state, trust, projection, data, settings, or migration rollback is needed.

## Priority and completion policy

- Lifecycle contract/probe, fake/conformance, coordinator, and package-neutral composition: **high priority and implementable now**.
- Maintained fork and production adapter: **critical for feature/epic closure and operator-authorized on 2026-07-16**.
- The feature remains `stage: implementing` until the maintained fork is published and qualified, the production wrapper is integrated, and the generic upstream PR is opened. Published-byte qualification remains mandatory.

## Pre-mortem

This design fails if a current event observer is mislabeled interception, a fake can turn production capability available, exact identity differs across tool/service/resume paths, prompt replacement happens before inherited-context assembly, completion hooks run after any finalization side effect, continuation opens a new session or exceeds its bound, cancellation permits a later prompt/finalization, plugin updates mix handler revisions mid-boundary, an unresolved parent inherits another project scope, or prompt/result content leaks into durable evidence. The public contract, qualification receipt, trace-based shared suite, strict session resolver, existing active binding authority, source-ordered aggregation, fixed continuation budget, and secret-free schemas address those cases. The fallback for every production-package failure is honest capability unavailability, never approximation.

## Portable implementation verification — second crash recovery

- Commit audit: all eight surviving portable implementation/tracking commits were present and reviewed: `70a699f`, `0dbe832`, `17cb656`, `2936dab`, `017b6a1`, `0e3e95c`, `52b41c9`, and `128996c`.
- Audit corrections: `f4e7dd8` hardens exact published-package semver validation, parent-session authority revalidation immediately before hook execution, typed fail-closed handling for adapter-shaped abort errors, conformance evidence for every execution path/replacement/finalization/disposal invariant, post-disposal exclusion, and the package barrel's raw-registration-handle boundary.
- Focused verification: 12 portable lifecycle/application/runtime/integration test files passed, 68 tests, 0 type errors.
- Full baseline at design commit `425704e`: 154 test files / 798 tests, dependency boundaries over 215 modules / 1,293 dependencies, and 463 compiled exports.
- Full verified total after corrections: 162 test files / 843 tests, dependency boundaries over 221 modules / 1,317 dependencies with zero violations, build/package import green, and 479 compiled exports. Exact portable additions are 8 test files, 45 tests, 5 source modules, 24 dependency edges, and 16 compiled exports.
- The first full-suite attempt hit the already-recorded unrelated concurrent recovery-journal identity-marker flake (161 files and 842 tests passed; 1 file/test failed). No unrelated code changed; the immediate complete rerun passed at the exact totals above.
- Stage verification: the lifecycle contract/probe, fake/conformance, hook coordinator, and composition/integration children are `stage: done`. The production-adapter child and this feature remain `stage: implementing`; neither moved to review, done, available, release-bound, or terminal storage.
- Production blocker at verification time remained exact: `@gotgenes/pi-subagents@18.0.3` exposed no supported ordered async pre-start/pre-completion lifecycle interceptor, and no qualifying published maintained MIT fork existed. No dependency, package adapter, deep import, event approximation, patch, monkeypatch, settings mutation, or second subagent runtime was added.

## Plan amendment — maintained fork and upstream return

The operator selected the maintained-fork fallback on 2026-07-16. The planned delivery chain is now:

1. `epic-skills-hook-runtime-subagent-interception-maintained-fork` — publish and qualify `@nklisch/pi-subagents` from verified upstream history.
2. `epic-skills-hook-runtime-subagent-interception-production-adapter` — integrate the published fork through the sole package wrapper and prove every real execution path.
3. `epic-skills-hook-runtime-subagent-interception-upstream-contribution` — rebase the proven generic provider seam onto current `gotgenes/pi-packages`, open a focused PR, and track return to a qualifying upstream release.

This amendment supersedes earlier wait-only/external-blocker wording. It does not permit observational events, unpublished fork bytes, internal imports, or method-presence checks to claim production capability.
