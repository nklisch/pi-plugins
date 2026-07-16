---
id: epic-skills-hook-runtime-hook-event-adaptation
kind: feature
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-projection-reload-evidence]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Faithful Hook Event Adaptation

## Brief

Translate Pi's current extension lifecycle into the supported Claude and Codex command-hook event contract. The capability selects normalized hooks from the verified runtime snapshot; maps session start/end, prompt, tool success/failure, compaction, and settled-agent boundaries; derives documented session sources and compaction triggers; and builds event-specific compatible inputs without fabricating unavailable fields. Pi-only evidence may appear only under a namespaced field.

Preserve foreign matcher intent through one deterministic tool-name alias registry, exact/regular-expression matching, and the supported tool-event `if` grammar. Normalize and validate event, matcher, input, transcript/session, and cancellation evidence before execution, while leaving command spawning and output decisions to the dependent guarded-command feature. Unsupported events or conditions remain compatibility failures established before activation, not runtime approximations.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: hook semantic foundation — guarded command execution consumes its selected event plans and input payloads
- Pi lifecycle seam: uses public extension events and preserves their ordering, mutation, and cancellation limits

## Simplification opportunity

- Derive event routing, aliases, input builders, and condition handling from one registry rather than duplicating Claude/Codex/Pi switch tables across handlers.

## Foundation references

- `docs/SPEC.md` — Hooks; Supported events; Hook execution
- `docs/ARCHITECTURE.md` — Hook adapter; Pi integration
- `docs/COMPATIBILITY.md` — Hook events; Hook matcher mapping; Hook input; Session-source mapping

## UI alignment

No presentation surface. Hook status text may use Pi-native notifications later through management/runtime composition, but this feature creates no screen or mockup.

## Design decisions

- **Discovery posture**: Direct-read only, as explicitly required. Grounding covered global/project rules and conventions; the principles and UI decision matrix; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; the parent epic; the completed projection/reload feature, source, integration tests, and strict review hardening; normalized hook readers/components; the compatibility registry/evaluator/fixtures; and the installed Pi package documentation, declarations, implementation, and representative extension examples. No nested agent, peer mechanism, or question was used.
- **UI**: Mockups are skipped under the backend-only rule. This feature creates no screen, flow, component, or presentation behavior.
- **Verified Pi baseline**: Design targets the installed `@earendil-works/pi-coding-agent` `0.80.8` contract, verified from its complete `README.md`, complete `docs/extensions.md`, `docs/compaction.md`, `docs/session-format.md`, `docs/sdk.md`, `docs/tui.md`, and `docs/keybindings.md`; `dist/core/extensions/types.d.ts`, `runner.js`, `agent-session.js`, `agent-session-runtime.js`; `@earendil-works/pi-agent-core/dist/agent-loop.js` and declarations; and representative input, tool-gate, compaction, shutdown, reload, and event-bus examples. Production Pi adapter types are imported from that package rather than hand-copied.
- **Pi lifecycle facts**: `session_start` reasons are `startup | reload | new | resume | fork`; `session_shutdown` reasons are `quit | reload | new | resume | fork` and precede replacement-session start. `input` fires before skill/template expansion and chains transformations in extension order. `tool_call` runs after argument validation, sees earlier in-place mutations, may mutate the same input without revalidation, and may only return a block result. `tool_result` runs after actual execution, before `tool_execution_end` and final tool-result messages, and chains field patches. Parallel tool calls preflight in assistant source order but complete in completion order. `session_before_compact` can cancel/customize and carries `manual | threshold | overflow`, `willRetry`, and an `AbortSignal`; `session_compact` follows the saved compaction and rebuilt context. `agent_settled` occurs only after retry, compaction/retry, and queued continuations are exhausted.
- **One event-definition registry**: A single domain registry owns each foreign event's support owner (`ordinary`, `subagent`, or `incompatible`), Pi boundary, matcher subject, allowed condition fields, input-builder key, and deterministic emission rank. Existing compatibility event arrays derive from it. This feature handles only ordinary events; `SubagentStart` and `SubagentStop` remain requirement-gated for their sibling feature, and incompatible/unknown events remain pre-activation failures.
- **Event mapping and order**: `session_start` maps to `SessionStart`; `session_shutdown` to `SessionEnd`; `input` to `UserPromptSubmit`; `tool_call` to `PreToolUse`; successful/failed `tool_result` to `PostToolUse`/`PostToolUseFailure`; `session_before_compact` to `PreCompact`; `session_compact` to ordered `PostCompact` then synthetic `SessionStart(source=compact)`; and `agent_settled` to `Stop`. No `agent_end`, message, turn, `tool_execution_*`, tree, notification, or permission event is approximated.
- **Session sources**: `startup → startup`, `new → clear`, `resume → resume`, `fork → startup`, and `reload → startup`. `compact` is emitted only from a completed `session_compact`, never from a pre-compaction attempt. A reload therefore emits old-instance `SessionEnd`, then new-instance `SessionStart(source=startup)`.
- **Compaction triggers**: Pi `manual → manual`; `threshold | overflow → auto`. Both `PreCompact` and `PostCompact` use that trigger. A cancelled or failed pre-compaction produces neither `PostCompact` nor `SessionStart(source=compact)`. On success, `PostCompact` is dispatched first so the synthetic compact-session start observes an already-completed compaction boundary.
- **Typed session/transcript evidence**: Every input uses Pi's exact `SessionManager.getSessionId()`, `ctx.cwd`, and persisted session file when one exists. `transcript_path` is omitted for an in-memory/`--no-session` session rather than inventing a path; `pi.session.persistence` records `persisted` or `ephemeral`. The common input schema is strict and allows no native causes, roots, secrets, or implicit defaults.
- **No fabricated foreign fields**: Event-specific foreign fields are allowlisted by strict discriminated schemas. `permission_mode` is omitted because Pi 0.80.8 exposes project trust but no equivalent foreign approval mode. Session-shutdown reason, Pi input source/streaming mode, compaction reason/will-retry/from-extension, raw Pi tool result content/details, and cancellation availability live only under the `pi` namespace. `SessionEnd` receives no invented foreign reason.
- **Tool response projection**: `tool_input` is the exact JSON-compatible input snapshot seen at Plugin Host's `tool_call` position. `tool_response` is present only when Pi provides JSON-compatible structured `details`; otherwise it is omitted, while exact text/image content remains under `pi.tool_result`. Failure `error` is derived only from actual text result content, and `is_interrupt` is present only when an available Pi signal proves its value. This favors sparse honest input over host-shaped invention.
- **Tool aliases**: The authoritative alias registry covers verified Pi built-ins (`bash`, `read`, `write`, `edit`, `find`, `grep`, `ls`) and documented foreign identities (`Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `apply_patch`). Raw Pi names are always candidates; unknown custom tools receive identity-only matching. Subagent and plugin-scoped MCP aliases enter through validated additional registry rows owned by their integrations. Matching is case-aware; there is no blanket lowercase fallback.
- **Preferred tool name**: Foreign `tool_name` uses the registry's deterministic preferred foreign identity (`Write` for Pi `write`, `Glob` for Pi `find`, and so on), falling back to the exact Pi name when no foreign identity is registered. Matcher and `tool_name` condition equality operate over the complete alias set, so an exact Pi or foreign spelling denotes the same tool identity without making payload naming matcher-dependent.
- **Matcher grammar**: Missing, empty, or `*` matches all. Plain comma-separated or `|`-separated identifier lists compile to exact sets. Every other string compiles as a case-aware ECMAScript regular expression and is tested against the bounded alias candidates. Invalid expressions, excessive matcher length, or a nontrivial matcher on an event with no matcher subject fail compatibility before projection. Runtime recompilation uses the same pure compiler and treats disagreement as internal contract corruption, never a compatibility fallback.
- **Supported `if` grammar**: The current strict grammar remains one predicate `{ field, operator, value }`, an `{ if: ... }` wrapper, or a non-empty array interpreted as AND. Fields are `tool_name`, `tool_input`, `tool_response`, and `hook_event_name`; operators are `equals`, `contains`, `matches`, `regex`, and `in` with registry-defined value kinds. The event definition narrows applicable fields: only tool events accept conditions, `PreToolUse` has no response, and post-tool events may use all four. String operations over object/array input use bounded canonical JSON; alias-aware tool-name comparisons use the resolved identity. Unknown keys/operators, invalid regex, empty arrays, unsupported event/field combinations, non-JSON evidence, or multiple contradictory condition declarations fail compatibility before activation.
- **Catalog, trust, scope, and order**: The planner accepts only `SkillHookRuntimeCatalog`; it cannot be built from arbitrary hook arrays or raw manifests. Before selecting, it validates one current-project context across snapshots, project scope/key/trust agreement, Pi's current project-trust signal, complete projection bindings, and normalized hook contracts. It preserves `catalog.list()` order and each snapshot's canonical hook order as an explicit `(snapshotOrdinal, hookOrdinal)` source order. Matching handlers may later run concurrently, but result aggregation can always use this stable order.
- **One event plan, no execution**: This feature produces immutable, schema-validated `HookEventPlan` values containing one compatible stdin object, explicit cancellation evidence, exact snapshot/root bindings, and selected normalized command hooks. It never spawns a process, expands configuration/secrets, interprets stdout, applies hook output, blocks/mutates Pi, or marks `pi.hooks.command` available. The guarded-command feature consumes these plans and owns execution, concurrent result ordering, and Pi decisions.
- **Pi adapter boundary**: A thin `src/pi/hooks/pi-hook-event-adapter.ts` imports installed Pi event/context types with `import type`, extracts current evidence, and calls the host-neutral planner. It returns planning results only; final `pi.on(...)` registration and decision application stay with guarded runtime composition so this feature cannot accidentally activate hooks without the security boundary.
- **Cancellation**: Plans carry a discriminated capability: exact Pi `AbortSignal` plus `abortedAtPlanning`, or an explicit unavailable reason for idle/session boundaries. `session_before_compact` uses its event signal; active input/tool events use `ctx.signal` when present; settled/session events do not receive a fabricated never-aborting signal. The later executor must combine available caller cancellation with handler timeout and must treat already-aborted plans as cancelled, while retaining failure input evidence such as `is_interrupt`.
- **Stop evidence**: `Stop` is planned only from `agent_settled`. `last_assistant_message` is an actual text projection from the current branch and is omitted when unavailable. `stop_hook_active` comes from an explicit continuation-state input owned by the guarded-command feature; the initial settled boundary supplies verified inactive state, and recursive continuation supplies active state. Event adaptation does not own a continuation counter or start another agent run.
- **Generated Pi contract**: Add the verified Pi package as an exact development type dependency for this integration. Production adapter inputs use Pi's exported event types; compile/fake-Pi contract tests fail when event names or payloads drift. There is no runtime import of Pi implementation code from domain/runtime modules.
- **Public/private boundary**: Event plans, selector compilers, root-bearing selected hooks, cancellation signals, Pi adapter methods, mutable alias indexes, compiled `RegExp` values, canonical JSON helpers, and fake Pi utilities remain package-internal. `src/index.ts` gains no process-capable or raw-root API. Existing public `CompatibilityPolicyRegistry`/`HookEventSchema` continue to expose compatibility vocabulary; package tests assert that internal planners and adapter internals are absent from source and compiled export allowlists.
- **Foundation timing**: Code-first. Existing documents already state the intended event set, source/trigger mapping, namespaced Pi evidence, and pre-activation incompatibility. Implementation updates `COMPATIBILITY.md` only if the landed optional ephemeral `transcript_path`, sparse `tool_response`, or exact Pi 0.80.8 ordering makes a current assertion misleading; omission alone does not require documentation expansion.
- **Advisory review**: This integration is contract-sensitive and would normally merit an advisory design pass, but the caller explicitly prohibited nested agents. Design-time advisory is skipped non-blockingly; implementation still receives the parent feature's standard review boundary.

## Architectural choice

### Option A — register Pi handlers that directly switch on foreign events

Each Pi callback could filter hooks, build an object, and eventually execute handlers inline. This is initially short, but duplicates source/trigger aliases, matcher semantics, trust checks, and field allowlists across callbacks. It also makes command execution inseparable from lifecycle adaptation and invites unsupported fields to leak into generic objects. Rejected.

### Option B — convert every Pi event into one loose generic event bag

A generic `{ event, data }` envelope would reduce callback count and make a single dispatcher easy. It sacrifices event-specific required/forbidden fields, lets unavailable values be defaulted, weakens condition validation, and pushes Pi event interpretation into the security-critical executor. Rejected.

### Option C — registry-driven typed planning with a thin Pi ingress (chosen)

One domain registry defines supported event semantics and selector grammar. A host-neutral planner consumes the verified runtime catalog and strict boundary requests to produce immutable event-specific plans. A type-only Pi adapter converts current exported Pi events into those requests, without dispatching commands or applying decisions.

**Choice**: Option C. It keeps foreign semantics testable without Pi or processes, makes unsupported syntax fail before activation, preserves exact trust/scope/order evidence, and gives the guarded-command feature one narrow validated input instead of raw Pi events or manifest data.

## Verified Pi 0.80.8 boundary

| Pi boundary | Verified payload/semantics | Foreign plan |
|---|---|---|
| `session_start` | `reason: startup | reload | new | resume | fork`; optional previous file for replacement flows | `SessionStart` with mapped `source` |
| `session_shutdown` | old runtime teardown; occurs before reload/new/resume/fork replacement start | `SessionEnd`; shutdown reason only under `pi` |
| `input` | raw text before skill/template expansion; transforms chain in extension order | `UserPromptSubmit(prompt)` |
| `tool_call` | after validation; mutable input; no post-mutation revalidation; sequential preflight | `PreToolUse` |
| `tool_result` | only after actual execution; sees current content/details/isError; patches chain before `tool_execution_end` | `PostToolUse` or `PostToolUseFailure` |
| `session_before_compact` | reason/willRetry/dedicated signal; cancel/custom summary supported | `PreCompact(trigger)` |
| `session_compact` | compaction entry persisted and context rebuilt | `PostCompact(trigger)`, then `SessionStart(source=compact)` |
| `agent_settled` | after retries, auto-compaction retry, and queued continuations; idle unless another extension starts work | `Stop` |

`PermissionRequest` remains incompatible even though `tool_call` can block: Pi exposes neither an equivalent permission-dialog boundary nor the complete foreign permission state/taxonomy.

## Trickiest unit first

The hardest seam is turning one Pi tool/compaction callback into the exact foreign events and selected handlers without moving compatibility checks to runtime. Tool inputs are mutable and alias-rich, tool completions can arrive out of order, compaction produces two post-boundary events, and cancellation availability differs by callback. The design therefore compiles matcher/condition declarations through the same registry during compatibility evaluation, snapshots only the evidence visible at this extension's callback position, resolves one tool identity/alias set, selects from the verified catalog in stable source order, and emits strict plans. `session_compact` is the only one-to-many mapping and has a registry-fixed `[PostCompact, SessionStart(compact)]` order. Any selector that cannot be recompiled identically is a contract failure with no partial plan.

## Implementation units

### Unit 1: Hook event, alias, matcher, and condition contract registry

**Story**: `epic-skills-hook-runtime-hook-event-adaptation-contract-registry`

**Files**:
- `src/domain/hook-runtime-contract.ts`
- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `test/domain/hook-runtime-contract.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/domain/compatibility-policy.test.ts`
- `test/domain/compatibility-table-contract.test.ts`
- `test/fixtures/compatibility/hooks.ts`

```typescript
export const HookRuntimeEventDefinitionRegistry = {
  SessionStart: { owner: "ordinary", piBoundaries: ["session_start", "session_compact"], matcher: "session-source", rank: 10 },
  SessionEnd: { owner: "ordinary", piBoundaries: ["session_shutdown"], matcher: "none", rank: 20 },
  UserPromptSubmit: { owner: "ordinary", piBoundaries: ["input"], matcher: "none", rank: 30 },
  PreToolUse: { owner: "ordinary", piBoundaries: ["tool_call"], matcher: "tool", rank: 40 },
  PostToolUse: { owner: "ordinary", piBoundaries: ["tool_result"], matcher: "tool", rank: 50 },
  PostToolUseFailure: { owner: "ordinary", piBoundaries: ["tool_result"], matcher: "tool", rank: 60 },
  PreCompact: { owner: "ordinary", piBoundaries: ["session_before_compact"], matcher: "compact-trigger", rank: 70 },
  PostCompact: { owner: "ordinary", piBoundaries: ["session_compact"], matcher: "compact-trigger", rank: 80 },
  Stop: { owner: "ordinary", piBoundaries: ["agent_settled"], matcher: "none", rank: 90 },
  SubagentStart: { owner: "subagent", piBoundaries: [], matcher: "subagent", rank: 100 },
  SubagentStop: { owner: "subagent", piBoundaries: [], matcher: "subagent", rank: 110 },
  // Existing incompatible events remain registry entries with owner: "incompatible".
} as const;

export const HookToolAliasDefinitionRegistry = {
  Bash: { preferred: "Bash", piNames: ["bash"], aliases: ["Bash", "bash"], rank: 10 },
  Read: { preferred: "Read", piNames: ["read"], aliases: ["Read", "read"], rank: 20 },
  Write: { preferred: "Write", piNames: ["write"], aliases: ["Write", "write", "apply_patch"], rank: 30 },
  Edit: { preferred: "Edit", piNames: ["edit"], aliases: ["Edit", "edit", "apply_patch"], rank: 40 },
  Glob: { preferred: "Glob", piNames: ["find"], aliases: ["Glob", "find"], rank: 50 },
  Grep: { preferred: "Grep", piNames: ["grep"], aliases: ["Grep", "grep"], rank: 60 },
  Ls: { preferred: "ls", piNames: ["ls"], aliases: ["ls"], rank: 70 },
} as const;

export const HookConditionPredicateSchema = z.object({
  field: z.enum(["tool_name", "tool_input", "tool_response", "hook_event_name"]),
  operator: z.enum(["equals", "contains", "matches", "regex", "in"]),
  value: JsonValueSchema,
}).strict().readonly();

export type HookSelectorContractResult =
  | Readonly<{ kind: "valid"; selector: CompiledHookSelector }>
  | Readonly<{ kind: "incompatible"; code: HookSelectorFailureCode; field: string }>;

export function compileHookSelector(component: HookComponent): HookSelectorContractResult;
export function matchesHookSelector(
  selector: CompiledHookSelector,
  subject: HookSelectorSubject,
): boolean;
```

The registry derives `CompatibilityPolicyRegistry.hookEvents.supported`, `.subagent`, `.incompatible`, condition fields/operators, and matcher applicability. Extract the evaluator's private `conditionIsKnown` into this contract compiler. Compatibility calls the compiler for every hook and emits source-located safe diagnostics on invalid matcher/condition syntax; runtime imports the same compiler. Compiled regex/closures remain internal and are never persisted or serialized.

**Acceptance criteria**:
- [ ] Every existing supported/subagent/incompatible event derives from one event registry, preserving the compatibility table's exact event count and verdicts.
- [ ] Missing/empty/`*`, exact pipe/comma sets, anchored/unanchored regex, case-sensitive aliases, invalid regex, size bounds, and no-subject matcher misuse have table-driven outcomes.
- [ ] The `if` wrapper/AND-array/predicate grammar validates operator value kinds and event-specific field applicability; unsupported syntax is incompatible before projection.
- [ ] `PermissionRequest` and unknown events remain incompatible even though Pi can block a tool call.
- [ ] Static alias rows are collision-checked and deterministic; dynamic rows must pass the same schema and cannot replace a preferred static identity silently.
- [ ] Diagnostics expose rule id, component id, field, and provenance only; matcher text, condition values, native causes, and plugin secrets are not copied into reports.

### Unit 2: Strict session, transcript, lifecycle input, and event-plan contracts

**Story**: `epic-skills-hook-runtime-hook-event-adaptation-session-input-contracts`
**Depends on**: `epic-skills-hook-runtime-hook-event-adaptation-contract-registry`

**Files**:
- `src/runtime/hooks/event-contract.ts`
- `src/runtime/hooks/event-input.ts`
- `src/runtime/hooks/hook-event-planner.ts`
- `test/runtime/hooks/event-contract.test.ts`
- `test/runtime/hooks/event-input.test.ts`
- `test/runtime/hooks/hook-event-planner.test.ts`

```typescript
export const HookSessionEvidenceSchema = z.object({
  sessionId: z.string().min(1),
  transcriptPath: z.string().min(1).optional(),
  cwd: z.string().min(1),
  currentProject: CurrentProjectRuntimeContextSchema,
  piProjectTrusted: z.boolean(),
}).strict().readonly();
export type HookSessionEvidence = z.infer<typeof HookSessionEvidenceSchema>;

export const HookCancellationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("available"),
    signal: z.custom<AbortSignal>(isAbortSignal),
    abortedAtPlanning: z.boolean(),
  }).strict().readonly(),
  z.object({
    kind: z.literal("unavailable"),
    reason: z.enum(["idle-boundary", "session-boundary", "pi-signal-unavailable"]),
  }).strict().readonly(),
]);
export type HookCancellation = z.infer<typeof HookCancellationSchema>;

export const ForeignHookInputSchema = z.discriminatedUnion("hook_event_name", [
  SessionStartHookInputSchema,
  SessionEndHookInputSchema,
  UserPromptSubmitHookInputSchema,
  PreToolUseHookInputSchema,
  PostToolUseHookInputSchema,
  PostToolUseFailureHookInputSchema,
  PreCompactHookInputSchema,
  PostCompactHookInputSchema,
  StopHookInputSchema,
]);
export type ForeignHookInput = z.infer<typeof ForeignHookInputSchema>;

export const PlannedCommandHookSchema = z.object({
  sourceOrder: z.object({ snapshotOrdinal: z.number().int().nonnegative(), hookOrdinal: z.number().int().nonnegative() }).strict(),
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  revision: ContentDigestSchema,
  projectionDigest: ContentDigestSchema,
  contributionDigest: ContentDigestSchema,
  component: HookComponentSchema,
  pluginRoot: z.string().min(1),
  pluginDataRoot: z.string().min(1),
}).strict().readonly();

export const HookEventPlanSchema = z.object({
  schemaVersion: z.literal(1),
  event: OrdinaryHookEventSchema,
  input: ForeignHookInputSchema,
  cancellation: HookCancellationSchema,
  hooks: z.array(PlannedCommandHookSchema).readonly(),
}).strict().readonly();
export type HookEventPlan = z.infer<typeof HookEventPlanSchema>;

export type HookPlanningResult =
  | Readonly<{ kind: "ready"; plans: readonly HookEventPlan[] }>
  | Readonly<{ kind: "failed"; code: HookPlanningFailureCode; plugin?: PluginKey; componentId?: ComponentId }>;

export function createHookEventPlanner(input: Readonly<{
  catalog: SkillHookRuntimeCatalog;
  additionalToolAliases?: readonly HookToolAliasDefinition[];
}>): Readonly<{ plan(request: HookBoundaryRequest): HookPlanningResult }>;
```

The common foreign schema includes exactly `session_id`, optional `transcript_path`, `cwd`, `hook_event_name`, and `pi`. Event-specific schemas add only the fields chosen above. Builders deep-clone/freeze JSON evidence. The planner validates all snapshot/current-project bindings before selecting hooks, recompiles normalized selectors, preserves source order, and returns no partial plan on contract failure. Empty matches are `ready` with no plan dispatch required.

**Acceptance criteria**:
- [ ] Strict per-event schemas reject missing required fields, extra foreign fields, `permission_mode`, native reason fields, non-JSON evidence, and raw adapter errors.
- [ ] Persisted sessions receive the exact Pi transcript path; ephemeral sessions omit `transcript_path` and record only namespaced persistence evidence.
- [ ] Every Pi session-start reason maps to the documented source, and no pre-compaction request can produce `source=compact`.
- [ ] `manual`, `threshold`, and `overflow` produce exact foreign triggers and namespaced Pi reasons; completed compaction yields `[PostCompact, SessionStart(compact)]` in that order.
- [ ] `Stop` includes only actual assistant text and explicit continuation state; unavailable text is omitted rather than replaced with an empty/generated message.
- [ ] Catalog selection rejects stale current-project context, project-key mismatch, project-untrusted evidence, Pi trust disagreement, projection binding mismatch, and selector recompilation disagreement without exposing roots in diagnostics.
- [ ] User and project copies of one plugin remain distinct, and selected hooks preserve exact catalog/snapshot order rather than path, plugin-name, or completion-order precedence.

### Unit 3: Tool identity, matcher/condition evaluation, and success/failure inputs

**Story**: `epic-skills-hook-runtime-hook-event-adaptation-tool-event-planning`
**Depends on**: `epic-skills-hook-runtime-hook-event-adaptation-contract-registry`

**Files**:
- `src/runtime/hooks/tool-identity.ts`
- `src/runtime/hooks/tool-event-input.ts`
- `src/runtime/hooks/hook-event-planner.ts`
- `test/runtime/hooks/tool-identity.test.ts`
- `test/runtime/hooks/tool-event-input.test.ts`
- `test/runtime/hooks/hook-event-planner.test.ts`

```typescript
export const HookToolIdentitySchema = z.object({
  piName: z.string().min(1).max(256),
  foreignName: z.string().min(1).max(256),
  aliases: z.array(z.string().min(1).max(256)).min(1).readonly(),
}).strict().readonly();
export type HookToolIdentity = z.infer<typeof HookToolIdentitySchema>;

export function createHookToolIdentityResolver(input?: Readonly<{
  additional: readonly HookToolAliasDefinition[];
}>): Readonly<{ resolve(piName: string): HookToolIdentity }>;

export type HookToolResultEvidence = Readonly<{
  toolName: string;
  toolCallId: string;
  input: JsonValue;
  content: readonly (TextContent | ImageContent)[];
  details?: JsonValue;
  isError: boolean;
  signal?: AbortSignal;
}>;

export function buildPreToolUseInput(
  session: HookSessionEvidence,
  evidence: HookToolCallEvidence,
): PreToolUseHookInput;
export function buildPostToolInput(
  session: HookSessionEvidence,
  evidence: HookToolResultEvidence,
): PostToolUseHookInput | PostToolUseFailureHookInput;
export function evaluateHookConditions(
  selector: CompiledHookSelector,
  subject: HookSelectorSubject,
): boolean;
```

The resolver produces one ordered deduplicated alias set and one preferred payload name. `apply_patch` compatibility is an alias for Pi file mutation tools where registered, not a new Pi tool claim. Unknown Pi/custom tools match their exact raw name only. Tool input is cloned at the adapter's `tool_call`/`tool_result` position. Structured response details become foreign `tool_response` only after `JsonValueSchema` validation; raw Pi result content/details remain inside namespaced evidence. Condition evaluation uses the same compiled selector as compatibility.

**Acceptance criteria**:
- [ ] `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `apply_patch`, raw Pi names, unknown custom names, and validated dynamic subagent/MCP aliases resolve deterministically without case folding.
- [ ] Empty/all, `Write|Edit`, comma sets, anchored expressions, and regex alternatives select the expected hook for `write`, `edit`, `find`, and custom tool identities.
- [ ] Tool-name `equals`/`in` are alias-aware; `contains`/regex use bounded exact candidate strings; object input/response string operations use deterministic canonical JSON.
- [ ] `PreToolUse` receives exact `tool_name`, JSON `tool_input`, and `tool_use_id`; no result field is possible.
- [ ] Successful results select only `PostToolUse`; failed results select only `PostToolUseFailure`; the latter derives `error`/`is_interrupt` solely from available actual evidence.
- [ ] Undefined/non-JSON details do not create `tool_response`; no content/details/native cause escapes the `pi.tool_result` namespace.
- [ ] Mutation races are avoided by cloning the current callback evidence before planning; the adapter neither mutates Pi input nor applies output in this feature.
- [ ] Selection order remains catalog order even when fake parallel Pi results arrive in a different completion order.

### Unit 4: Pi-typed lifecycle ingress and ordered boundary adaptation

**Story**: `epic-skills-hook-runtime-hook-event-adaptation-pi-lifecycle-bridge`
**Depends on**: `epic-skills-hook-runtime-hook-event-adaptation-session-input-contracts`, `epic-skills-hook-runtime-hook-event-adaptation-tool-event-planning`

**Files**:
- `src/pi/hooks/pi-hook-event-adapter.ts`
- `src/pi/hooks/pi-session-evidence.ts`
- `package.json`
- `package-lock.json`
- `.dependency-cruiser.cjs`
- `test/pi/hooks/fake-pi.ts`
- `test/pi/hooks/pi-hook-event-adapter.test.ts`

```typescript
import type {
  AgentSettledEvent,
  ExtensionContext,
  InputEvent,
  SessionBeforeCompactEvent,
  SessionCompactEvent,
  SessionShutdownEvent,
  SessionStartEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "@earendil-works/pi-coding-agent";

export interface PiHookEventAdapter {
  sessionStart(event: SessionStartEvent, ctx: ExtensionContext): HookPlanningResult;
  sessionShutdown(event: SessionShutdownEvent, ctx: ExtensionContext): HookPlanningResult;
  input(event: InputEvent, ctx: ExtensionContext): HookPlanningResult;
  toolCall(event: ToolCallEvent, ctx: ExtensionContext): HookPlanningResult;
  toolResult(event: ToolResultEvent, ctx: ExtensionContext): HookPlanningResult;
  beforeCompact(event: SessionBeforeCompactEvent, ctx: ExtensionContext): HookPlanningResult;
  compact(event: SessionCompactEvent, ctx: ExtensionContext): HookPlanningResult;
  agentSettled(
    event: AgentSettledEvent,
    ctx: ExtensionContext,
    stop: Readonly<{ stopHookActive: boolean }>,
  ): HookPlanningResult;
}

export function createPiHookEventAdapter(input: Readonly<{
  planner: Readonly<{ plan(request: HookBoundaryRequest): HookPlanningResult }>;
  currentProject(): CurrentProjectRuntimeContext;
}>): PiHookEventAdapter;
```

Use an exact type-only Pi `0.80.8` development dependency. The adapter extracts session id/file/branch, cwd, project-trust agreement, event signal, current tool evidence, and last assistant text, then submits strict boundary requests. It does not register final handlers or return Pi decisions; the guarded-command/native-composition feature will call these methods inside the appropriate `pi.on` callbacks and apply validated execution results at the same callback boundary.

**Acceptance criteria**:
- [ ] Typechecking fails on Pi event-name/payload drift; domain/runtime hook modules have no Pi import and no runtime Node/Pi dependency.
- [ ] Fake Pi proves shutdown precedes replacement start, reload/new/resume/fork source mapping, input pre-expansion evidence, tool call/result classification, and settled-agent-only Stop.
- [ ] Fake compaction proves pre → persisted/rebuilt post → `PostCompact` → compact `SessionStart`, with no post events after cancellation/failure.
- [ ] The adapter preserves Pi callback mutation semantics by reading the current object at its extension-order position and never mutating or revalidating Pi input itself.
- [ ] Dedicated compaction and active tool/input signals are retained exactly; idle/session signal absence is explicit, not replaced with a fresh signal.
- [ ] Current project context from native composition must equal every selected snapshot context; `ctx.isProjectTrusted()` can only tighten project execution.
- [ ] No method executes a process, expands secrets/configuration, parses hook output, blocks a Pi event, changes tool input/result, starts continuation, or reports runtime capability availability.

### Unit 5: Golden contracts, event-order integration, package boundary, and rollback evidence

**Story**: `epic-skills-hook-runtime-hook-event-adaptation-integration-hardening`
**Depends on**: `epic-skills-hook-runtime-hook-event-adaptation-pi-lifecycle-bridge`

**Files**:
- `test/fixtures/runtime/hooks/event-adaptation-golden.ts`
- `test/integration/hook-event-adaptation.test.ts`
- `test/domain/compatibility-table-contract.test.ts`
- `test/pi/hooks/pi-hook-event-adapter.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `src/index.ts` (assert no new low-level export; change only if a deliberately public compatibility registry type is required)
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed behavior makes a current assertion stale

Golden fixtures combine the repository's real `agile-workflow-hooks.json` declarations with a complete verified skill/hook/MCP runtime snapshot. The integration path creates user/project snapshots, resolves current project/trust, feeds fake Pi events through the adapter, and records exact plans without a command runner. Contract tests enumerate all registry entries so a new event, alias, operator, or Pi callback cannot appear without compatibility and runtime evidence.

**Acceptance criteria**:
- [ ] The real Agile Workflow fixture selects startup/resume/clear/compact session hooks, manual/auto compact hooks, and `Write|Edit|apply_patch` post-tool hooks with exact golden stdin objects.
- [ ] Every ordinary event has strict common/event field goldens; every Pi session reason and compaction reason has a source/trigger golden; absent fields are asserted as strongly as present fields.
- [ ] Event-order goldens cover startup, prompt, successful and failed tools, manual compaction, threshold compaction, overflow compaction/retry, settled Stop, reload, new, resume, fork, and quit.
- [ ] Matcher/condition goldens cover every accepted grammar form and every rejection class, including invalid regex, wrong event field, non-JSON input, unknown event, and permission approximation.
- [ ] Fake parallel tools prove preflight source order, completion-order event arrival, and stable selected-handler source order independently.
- [ ] User/project same-key plugins remain scope-isolated; trust revocation/current-project mismatch/corrupt selector yields no partial plan, while unrelated no-match events remain empty successes.
- [ ] No fake invokes a shell or process API. A canary command, secret, native cause, plugin root, and data root never enter foreign stdin or serialized failure diagnostics.
- [ ] Source and compiled public API allowlists expose no planner, raw selected hook, root, signal, regex, Pi event type, mutable alias map, fake, or execution-capability claim.
- [ ] Full `npm test` passes typecheck, dependency boundaries, exhaustive Vitest suites, build, and exact compiled import; the implementation records baseline/addition counts in the feature body.
- [ ] Rollback is deletion/reversion of derived planner/adapter code and the Pi type dependency only: no state schema, projection cache format, installed revision, trust grant, transition, or persistent data migration exists. With this feature absent, `pi.hooks.command` remains unavailable and affected plugins remain pre-activation failures.

## Implementation order

1. `epic-skills-hook-runtime-hook-event-adaptation-contract-registry`
2. In parallel after the registry:
   - `epic-skills-hook-runtime-hook-event-adaptation-session-input-contracts`
   - `epic-skills-hook-runtime-hook-event-adaptation-tool-event-planning`
3. `epic-skills-hook-runtime-hook-event-adaptation-pi-lifecycle-bridge`
4. `epic-skills-hook-runtime-hook-event-adaptation-integration-hardening`

The registry is the semantic source of truth. Lifecycle and tool planning can then proceed independently. The Pi ingress requires both strict input families, and integrated golden/order/public-boundary evidence follows only after the full plan path exists. These are durable checkpoints for one cohesive feature owner, not default one-story-per-agent assignments.

## Simplification

- Replace the evaluator-private condition parser and separate hook event lists with one domain contract registry consumed by compatibility and runtime.
- Keep `HookComponent` and the complete `SkillHookRuntimeCatalog` as authoritative inputs; do not create another hook database, projection format, active pointer, state family, or manifest reader.
- Keep one strict event-plan vocabulary. Do not create Claude, Codex, and Pi payload switch tables or plugin-specific stdin builders.
- Import Pi's event types instead of maintaining handwritten copies. Keep that dependency type-only outside the Pi adapter.
- Resolve tool aliases once per event from one immutable index. Unknown tools use identity matching; no heuristic case folding, fuzzy matching, or silent alias precedence.
- Recompile normalized selectors with the same pure compiler instead of persisting regex objects or interpreted conditions in state/projections.
- Omit unavailable foreign fields. Do not invent a transcript path, permission mode, session-end reason, tool response, assistant text, or cancellation signal to satisfy a broad shape.
- Leave process execution, timeout/output limits, configuration/secret expansion, output validation, decision aggregation, mutation/blocking, title/context handling, and continuation guards entirely to `epic-skills-hook-runtime-guarded-command-hooks`.
- Do not duplicate projection/cache/trust/path/root tests. This feature tests catalog consumption and exact binding, then focuses on event semantics.

## Testing

- **Registry contract**: exhaustive event owner/boundary/matcher/condition rows and compatibility fixture parity. Protects pre-activation honesty and single-source-of-truth drift.
- **Matcher and alias contract**: all/empty, exact pipe/comma, anchored/unanchored regex, case, raw/custom names, file-mutation aliases, dynamic aliases, invalid syntax, and length bounds. Protects foreign intent without fuzzy behavior.
- **Condition contract**: wrappers, AND arrays, each field/operator/value kind, canonical JSON, alias-aware tool identity, missing response, event-field restrictions, and invalid combinations. Protects runtime/compatibility agreement.
- **Input field goldens**: exact key sets and values for every event, persisted/ephemeral transcript, foreign versus `pi` namespace, success/failure, interrupts, structured/no response, and Stop text/state. Protects the no-fabrication promise.
- **Pi event-order tests**: replacement session shutdown/start, input ordering, tool preflight/completion, manual/automatic/overflow compaction, retry, and settled boundary. Protects the verified Pi 0.80.8 mapping.
- **Catalog/trust/order tests**: user/project isolation, current-project equality, trust disagreement, complete projection/root bindings, no-match events, stable ordinals, and corruption fail-closed. Protects lifecycle ownership and deterministic later aggregation.
- **Real fixture integration**: unchanged Agile Workflow hooks plus a complete projection, with canary command strings proving planning never executes. Protects the project-defining compatibility path.
- **Boundary/rollback tests**: dependency-cruiser and source/compiled export assertions. Protects process separation, no second authority, and a migration-free rollback.
- **Low-value tests avoided**: no assertions that merely count builder calls, mirror every trivial Zod field in isolation, snapshot absolute temporary roots, or re-run reader/projection/cache matrices already owned by completed features.

## Risks and rollback

- **Riskiest assumption — Pi event hooks remain the exact interception points needed by foreign semantics**: Pi 0.80.8 provides mutable/blocking `tool_call`, patchable `tool_result`, cancellable compaction, and settled-agent boundaries, but those are version-sensitive. Mitigation: exact type dependency, fake-Pi contract tests, installed-source-grounded ordering tests, and runtime capability remaining unavailable until the guarded adapter is fully composed. If Pi drifts, compatibility fails before activation rather than using nearby message/turn events.
- **Sparse `tool_response` may reject plugins that assume host-native response objects**: inventing a Claude/Codex result object from Pi content would be worse. Mitigation: structured JSON details are passed when actual, raw Pi evidence is namespaced, and response-dependent conditions on absent evidence evaluate false. If representative plugins require a richer field, add an explicit per-tool verified mapper to the alias registry and compatibility table; do not add a generic approximation.
- **Regex can consume in-process time**: matcher subjects are bounded tool/source/trigger aliases, but condition regex may inspect canonical input. Mitigation: compile before activation, enforce pattern and subject limits, and reject invalid/oversized declarations. Do not introduce an unreviewed regex dialect that changes foreign matching.
- **Compaction can double-inject context if order is wrong**: both `PostCompact` and `SessionStart(compact)` may target the same script. Mitigation: registry-fixed order and exact golden tests make the two documented events intentional and visible; deduplication remains by normalized hook identity, not command text across different events.
- **Catalog context can stale across session replacement/reload**: old extension contexts become invalid in Pi, but a miswired native composition could retain an old catalog. Mitigation: every plan compares current-project context and Pi trust with snapshot evidence, and replacement order is tested. A mismatch produces no plan, not silent project-hook omission or user/project aliasing.
- **Stop recursion state belongs to the next feature**: planning a false default on recursive continuation would loop. Mitigation: `stop_hook_active` is a required explicit input to the settled adapter; no continuation API exists here. The guarded feature must own the state and budget before activating Stop hooks.
- **Cancellation is unavailable on idle/session boundaries**: manufacturing a fresh signal would falsely claim user cancellation propagation. Mitigation: the plan states unavailability and later execution still has a handler timeout; session teardown waits for extension handlers under Pi's documented order.
- **Least certainty — foreign tool result detail equivalence across all custom tools**: Pi deliberately leaves custom `details` opaque. Mitigation: only JSON-compatible actual details cross as `tool_response`, and custom-tool aliases default to exact identity. Unsupported result-shape dependencies remain compatibility findings until a verified mapper is added.

Rollback is straightforward because the capability is entirely derived and process-free: remove the registry extensions, event planner, Pi type-only adapter, tests, and development dependency; restore the prior compatibility registry; leave projections, installed state, trust, content/data roots, and lifecycle/recovery untouched. The guarded-command feature cannot activate without valid event plans, so rollback naturally returns command hooks to an unavailable runtime requirement rather than a partial behavior.

## Pre-mortem

This design fails if one event invents a field, a runtime selector accepts syntax compatibility rejected (or vice versa), a project hook runs under stale/untrusted context, a tool result is classified from completion timing instead of `isError`, compaction emits compact start before post-compact, parallel completion order becomes handler precedence, Stop fires at `agent_end`, or the planner begins executing commands to make tests pass. Strict schemas, one compiler/registry, catalog/current-project validation, exact Pi boundary imports, explicit source ordinals, ordered compact plans, settled-only Stop, process canaries, and public-boundary assertions address those failure modes.

The fallback for every planning error is non-activation or an explicit runtime contract failure consumed by existing lifecycle observation/compensation. There is no partial plugin mode and no nearby Pi event is substituted.

## Implementation summary
- Execution capability: GPT-5.6 Luna inline, one cohesive feature owner; no nested agents, questions, peer review, UI/process execution, subagent interception, MCP/native manager, or unrelated work.
- Review weight: standard by project convention; caller explicitly requested no review, so the feature is left at `stage: review`.
- Child checkpoints completed directly to `done` in dependency order: contract registry, session/input contracts, tool-event planning, Pi lifecycle bridge, and integration hardening.
- Commits: `2ed0e92` (`implement: epic-skills-hook-runtime-hook-event-adaptation-contract-registry`), `77c1298` (`implement: epic-skills-hook-runtime-hook-event-adaptation-session-input-contracts`), `054cf53` (`implement: epic-skills-hook-runtime-hook-event-adaptation-tool-event-planning`), `02538c9` (`implement: epic-skills-hook-runtime-hook-event-adaptation-pi-lifecycle-bridge`), `deb8006` (`implement: epic-skills-hook-runtime-hook-event-adaptation-integration-hardening`).
- Integrated behavior: one registry/compiler now drives compatibility and runtime; strict immutable event plans preserve exact Pi lifecycle order, foreign field allowlists, preferred tool aliases, source ordinals, trust/scope/projection evidence, cancellation availability, and namespaced Pi-only evidence. Command handlers are selected but never spawned or interpreted.
- Full verification: `npm test` passed — 141 test files, 742 tests, 0 type errors, 459 compiled public exports. Boundaries passed (194 modules, 1,187 dependencies); compiled package import passed.
- Count record: supplied branch baseline was 128/674/447 and combined-main reference 133/696/459; this implementation's actual final count is 141/742/459.
- First full-suite attempt exposed one concurrent recovery hardening flake (1 failure among 141/742); the isolated test passed and the final full suite passed without touching that unrelated area.
- Documentation: `docs/COMPATIBILITY.md` now states that ephemeral sessions omit `transcript_path` and keep Pi-only evidence under `pi`.
- Rollback: remove the derived registry/planner/adapter and exact Pi type dependency; no state, projection, trust, revision, transition, or persistent-data migration was introduced.
- Deviations: none. Blockers: none.

## Review findings (2026-07-16)

Effective weight: `standard`; one fresh-context Umans GLM 5.2 pass. The reviewer approved the event registry, Pi boundary mapping, trust/catalog checks, pure-planning separation, compatibility alignment, ordering, cancellation, and package boundaries. The receiver confirmed one bounded mutation-safety fix before closure:

- Snapshot and normalize Pi `tool_result.content` before placing it under `pi.toolResult.content`; no live Pi array/object reference may survive into an immutable plan.
- Preserve only the namespaced content fields the hook contract understands (text/image payload fields), intentionally dropping opaque Pi-only `textSignature` so strict plan parsing cannot fail on a normal optional Pi field.
- Add a test that mutates the original array and nested content after planning and proves the plan remains unchanged and frozen/validated.

Tracked by `epic-skills-hook-runtime-hook-event-adaptation-review-hardening`. Under standard review, closure after this exact fix is administrative verification only; no second pass. Loose ingress/test casts are bounded adapter/test implementation details and remain non-blocking.

## Review hardening completion
- Snapshot and normalize Pi `tool_result.content` at the tool-result planning boundary into fresh deeply frozen text/image items.
- Retain only `type` plus text or image payload fields; omit opaque `textSignature` and other Pi-only item fields from namespaced plan evidence.
- Preserve the source event/content untouched; post-plan array replacement, item mutation, and append regressions prove byte-for-byte plan stability and frozen content identity.
- Focused verification: 2 files, 11 tests passed.
- Full `npm test`: typecheck, boundaries (194 modules / 1,187 dependencies), 141 test files / 744 tests, build, and compiled package import (459 exports) passed. The first full-suite attempt hit the already-known unrelated concurrent recovery test flake; the immediate rerun passed without unrelated changes.
- Review handling: standard review had already completed; this exact bounded blocker is fixed and no second independent pass was run.

## Review closure

**Verdict**: Approve after fixes

The sole reviewer approved the feature except for the namespaced content snapshot gap. That gap is fixed with deep mutation/signature evidence, and administrative verification passes at 141 files / 744 tests, clean typecheck/boundaries/build, and 459 exports. No material blocker remains; no second review was commissioned.
