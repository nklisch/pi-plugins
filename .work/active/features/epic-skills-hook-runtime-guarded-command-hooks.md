---
id: epic-skills-hook-runtime-guarded-command-hooks
kind: feature
stage: review
tags: [compatibility, security, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-hook-event-adaptation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Guarded Command-Hook Execution and Decisions

## Brief

Execute selected shell-form and exec-form command hooks with one compatible JSON input on standard input and the exact session working directory, immutable plugin root, stable writable data root, trusted project root, and callback-scoped resolved user configuration. Apply supported substitution consistently across executable forms and environment values while keeping secret plaintext inside the existing configuration-resolution lifetime. Process launch, environment inheritance, shell selection, executable identity, and diagnostics must remain explicit and auditable.

Enforce bounded handler timeout, caller cancellation, process-tree termination, standard-output and standard-error limits, and deterministic deduplication/concurrency. Parse exit status and supported structured/plain outputs into blocking, context injection, input/output rewriting, stop, title, and guarded continuation decisions; reject unsupported fields explicitly; and aggregate concurrent results in stable declaration order regardless of completion order. Errors, cancellation, truncation, and continuation exhaustion produce safe actionable diagnostics without leaking secrets, raw native causes, or unbounded plugin output.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: completes ordinary command-hook behavior after event adaptation; subagent hooks reuse the same executor
- Security boundary: executes already compatibility-checked and trusted normalized handlers only; it never reads raw manifests or grants trust

## Simplification opportunity

- Reuse or narrowly generalize the existing bounded process-tree runner and runtime configuration resolver instead of introducing a second subprocess/cancellation implementation or eagerly expanded secret-bearing environment cache.

## Foundation references

- `docs/VISION.md` — Honest compatibility; Explicit trust
- `docs/SPEC.md` — Hook execution; Trust and security; Performance and availability
- `docs/ARCHITECTURE.md` — Hook adapter; Trust; Concurrency; Error model
- `docs/COMPATIBILITY.md` — Hook handlers; Hook output; Plugin path environment

## UI alignment

Mockups skipped. This is backend-only runtime integration. `permissionDecision: "ask"` uses Pi's existing mode-aware dialog protocol; it does not add a screen, flow, component, or management surface.

## Design decisions

- **Discovery posture**: Direct-read only, as explicitly required. Grounding covered the feature-design, principles, and UI decision matrix; global/project rules and conventions; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; the parent epic; the completed projection/reload and hook-event-adaptation feature bodies, contracts, integration tests, and review hardening; normalized Claude/Codex hook readers and compatibility policy; the process runner/redaction tests; configuration, secret, project-root, path, trust, and error ports/tests; and the branch's current source. No nested agent, peer mechanism, or question was used.
- **Verified Pi baseline**: Decision application targets installed `@earendil-works/pi-coding-agent` `0.80.8`. Grounding read complete relevant `docs/extensions.md`, `docs/tui.md`, `docs/rpc.md`, `docs/sdk.md`, and `docs/session-format.md`; complete `dist/core/extensions/types.d.ts`; complete relevant `dist/core/extensions/runner.js`, `agent-session.js`, `agent-session-runtime.js`, and `exec` declarations/implementation; and the permission, input-transform, timed-confirm, send-message, session-name, and structured-output examples. Production Pi types remain imported from the exact package rather than copied.
- **Pi behavior used, not approximated**: `input` transforms chain and `handled` stops prompt processing; `tool_call` may mutate the current input in place and return only a block; `tool_result` returns chained partial patches; `session_before_compact` may cancel; `ctx.abort()` aborts the active run; `pi.sendMessage()` injects a custom context message with `nextTurn`, `steer`, or `followUp` delivery; `pi.setSessionName()` persists the display title; `ctx.ui.confirm()` works in TUI and RPC and fails to `false` on cancel/timeout; JSON/print have no dialog UI; and `agent_settled` occurs only after Pi's retry, compaction retry, and queued continuation work is exhausted.
- **Selected-plan-only ingress**: The executor accepts only a strict `HookEventPlan` emitted by `createHookEventPlanner`. It has no overload accepting `HookComponent[]`, raw manifest JSON, arbitrary commands, or caller-provided roots. Each selected handler retains scope/plugin/revision/projection/contribution/component/source-order evidence from the verified immutable runtime catalog.
- **Execution authority remains external**: A narrow callback-style `HookExecutionContextPort` re-verifies the selected binding against native composition's current active selection and current project before exposing paths. Its implementation delegates configuration/trust/path work to `withResolvedPluginConfiguration`, `ProjectRootAuthorityPort`, and existing stores. The executor never reads `LifecycleStateStore`, manifests, credential storage, or filesystem layout and cannot grant trust.
- **Exact roots**: Hook `cwd` is the current Pi callback `ctx.cwd` and must equal the planned foreign input `cwd`. `pluginRoot` and `pluginDataRoot` must exactly equal the adapter-issued roots carried by the selected snapshot. `projectRoot` comes only from the current `TrustedProjectRoot` capability and is used for `CLAUDE_PROJECT_DIR`; it is not inferred from cwd. Any mismatch fails before spawn and serializes no absolute path.
- **Callback-scoped configuration**: Command/argument/environment expansion, executable resolution, process execution, output parsing, and secret redaction all occur inside `withResolvedPluginConfiguration`'s callback. Only a parsed, bounded, secret-sanitized decision or fixed diagnostic code can cross the callback. No expanded environment, substituted command, output buffer, or `ResolvedConfiguration` is cached, logged, put in state, attached to Pi messages as details, or retained after the child exits.
- **One template resolver**: One pure resolver handles exact `${user_config.KEY}` plus `${CLAUDE_PLUGIN_ROOT}`, `${PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `${PLUGIN_DATA}`, and `${CLAUDE_PROJECT_DIR}` tokens in shell commands, exec commands, exec arguments, and explicit environment values. Missing configured keys fail closed. Unknown tokens and shell-native forms such as `${PLUGIN_ROOT:-...}` remain untouched for shell-form handlers; exec form never performs shell expansion, command substitution, globbing, or quote interpretation.
- **Normalized shell choice**: Shell handlers default canonically to Bash. A supported explicit `shell: "bash"` normalizes to the default representation; `shell: "powershell"` is retained structurally on the shell handler and carries the existing PowerShell capability requirement. A shell field on exec form, unknown shell, or unavailable resolved shell is incompatible/failure. This closes the current reader/evaluator gap where `shell` is expected by policy but retained as an unknown foreign field.
- **Explicit executable identity**: A private `HookExecutableResolverPort` resolves the Bash/PowerShell executable or exec-form command against the exact final cwd/environment, returning the absolute executable plus resolution kind (`absolute`, `cwd-relative`, or `path`) and an adapter-issued identity token. The Node process runner receives that exact executable with `shell: false`; it never asks Node to select a shell or re-resolve a bare command. Paths and identity tokens remain internal and absent from diagnostics.
- **Explicit environment inheritance**: Every launch declares `{ inherit: "host", overrides }`. The runner no longer silently decides inheritance from an optional `env`; source-acquisition callers are updated to request host inheritance explicitly. Hook overrides contain the five plugin/project path variables plus sorted `CLAUDE_PLUGIN_OPTION_*` values. Undefined values delete an inherited variable. `process.env` is never mutated, and the final environment is never serialized.
- **No second process primitive**: Narrowly generalize `CommandRequest`/`createNodeCommandRunner` with required environment policy, per-stream limits, per-handler timeout, and typed limit/timeout evidence. Preserve its detached POSIX process group, Windows `taskkill /T /F`, graceful-then-force escalation, stdin draining, caller abort propagation, and single close/drain lifecycle. Hook code does not use `pi.exec`, raw `spawn`, another timer/kill loop, or another cancellation abstraction.
- **Bounds**: One registry owns `HOOK_STDIN_MAX_BYTES = 256 KiB`, `HOOK_STDOUT_MAX_BYTES = 64 KiB`, `HOOK_STDERR_MAX_BYTES = 64 KiB`, `HOOK_DEFAULT_TIMEOUT_MS = 10_000`, `HOOK_MAX_TIMEOUT_MS = 600_000`, `HOOK_MAX_SELECTED_HANDLERS = 256`, `HOOK_MAX_CONCURRENCY = 8`, `HOOK_MAX_AGGREGATED_TEXT_BYTES = 256 KiB`, ask timeout `30_000 ms`, and Stop continuation budget `3`. Reader/compatibility/runtime/tests consume these values. Oversize timeout declarations are incompatible before activation; runtime corruption still fails closed.
- **One stdin value**: The executor strict-parses `ForeignHookInput`, emits canonical UTF-8 JSON followed by one newline as one bounded stdin stream, and closes stdin. Plugin roots, data roots, resolved configuration, executable identity, and environment are not added to the JSON input; they are process environment only.
- **Deterministic deduplication**: Within one plan, the first selected occurrence of `(scope, plugin, revision, component.id)` wins in ascending `sourceOrder`. User/project copies and different revisions never deduplicate, and identical commands from different plugins remain separate because their roots/data/configuration differ. Deduplication never crosses plans, so ordered `PostCompact` then compact `SessionStart` events both execute.
- **Bounded concurrency with ordered evidence**: Deduplicated handlers enter a fixed-width work queue in source order. Completion may vary, but every result is written to its preallocated declaration-order slot. Parsing and aggregation consume only that ordered array. Queue start order, result order, diagnostics, rewrite precedence, and context ordering never depend on wall-clock completion.
- **Output decoding**: stdout/stderr must be bounded valid UTF-8. Exit `0` accepts empty output, one strict JSON object, or plain stdout only for `SessionStart`/`UserPromptSubmit` context. Exit `2` maps to an event-specific block/feedback/Stop-continuation only where the Pi boundary can preserve it. Other exits are fixed-code non-blocking handler errors unless the event's fail-closed policy requires blocking. Invalid UTF-8, truncated streams, extra JSON values, scalar/array JSON, unsupported fields, and unsupported event/field combinations are explicit hook errors.
- **Strict structured output**: A single registry/schema accepts only the compatibility-contract fields `continue`, `stopReason`, `systemMessage`, `decision: "block"`, `reason`, `permissionDecision: "allow" | "deny" | "ask"`, `permissionDecisionReason`, `additionalContext`, `updatedInput`, `updatedToolOutput`, `title`, and the equivalent strict `hookSpecificOutput` envelope with matching `hookEventName`. `permissionDecision: "defer"`, terminal sequences, watch paths, env-file mutations, dynamic reloads, unknown root/nested keys, and fields valid only for another event are rejected, never ignored.
- **Decision aggregation**: Context and system-message values append in declaration order. Any block/deny wins, with the first declaration-order reason retained; ask outranks allow only when no deny/block exists. `updatedInput` patches are shallow-applied in declaration order to a cloned original object, so later declarations deterministically replace the same key. `updatedToolOutput` and title are declaration-order last-writer-wins. Any `continue: false` stops the current representable lifecycle; Stop block/feedback becomes guarded continuation instead. Aggregate text and resulting JSON are rechecked against total bounds.
- **Error policy is event-aware**: `UserPromptSubmit`, `PreToolUse`, `PreCompact`, and Stop continuation decisions fail closed on execution/parse/authority/cancellation ambiguity because they are interception boundaries. Post-tool, completed compaction, start/end observation, and title/context side effects cannot roll back completed host work; they preserve the base Pi result, emit a fixed safe diagnostic, and apply no partial hook mutations. One plugin error never causes completion-order partial aggregation.
- **Safe diagnostics**: `HookRuntimeDiagnostic` contains only a stable code, severity, event, plugin key, component id, source order, and registry-owned actionable message. It never includes command/args, environment names or values, cwd/root paths, stdout/stderr, JSON parse snippets, native errors/stacks/causes, executable paths, or configuration keys/values. Supported context/reason/title text is explicitly redacted for resolved configuration values before leaving the callback; malformed/raw output is discarded.
- **Pi application is a separate adapter**: Host-neutral execution returns a strict `AggregatedHookDecision`; only `src/pi/hooks/pi-hook-decision-adapter.ts` mutates Pi inputs, returns block/result/compaction/input values, calls UI, injects context, sets title, aborts, or queues continuation. Runtime parsing cannot reach `ExtensionAPI` or Pi types, and the Pi adapter cannot inspect commands, environments, secrets, or raw process output.
- **Context mapping**: Session-start and post-compaction context uses hidden custom messages delivered as `nextTurn`; prompt-submit context is queued as `nextTurn` from the same input callback; active tool context uses hidden `steer` delivery so it enters before the next model call after current tool execution. `systemMessage` is a mode-aware notification, not model context. No diagnostic or raw result is persisted as custom-message details.
- **Interactive ask**: Only `PreToolUse` may produce ask. TUI and RPC (`ctx.hasUI` with mode `tui | rpc`) call `ctx.ui.confirm()` once for the aggregate with a fixed safe description, a 30-second timeout, and available caller signal. Cancel, timeout, dialog error, stale context, JSON/print mode, or `hasUI: false` becomes deny. Ask never opens custom TUI and never displays the command, roots, output, or secrets.
- **Input/output application**: Pre-tool updated input is cloned, bounded, then replaces the existing mutable object in place by deleting old keys and assigning the final patch; Pi's documented lack of post-mutation validation is explicit. Post-tool `updatedToolOutput` replaces the exact JSON-compatible `details` projection because event adaptation defines foreign `tool_response` from that projection; content/isError remain unchanged. A rewrite on another event is rejected before application.
- **Stop continuation guard**: One process-local controller owns `{ active, used, generation }`; it is neither persisted nor authoritative state. The initial settled event plans `stop_hook_active: false`. A Stop block/feedback may send one hidden custom follow-up with `triggerTurn: true`, mark active, and increment the budget. Recursive settled events plan `stop_hook_active: true`. No continuation, exhaustion, session shutdown/reload/replacement, or a new non-extension user input resets the guard. Exhaustion emits one safe diagnostic and does not queue another turn.
- **Preserve event-plan ordering and lifecycle observation**: Plans from one Pi callback execute sequentially in planner order; handlers within one plan run concurrently. This preserves completed event adaptation's `PostCompact` before compact `SessionStart`, current extension mutation position, trust/scope checks, and source ordering. Command-hook capability becomes available only after the complete ordinary registration/execution/application composition is installed and independently observable through the existing complete projection contribution; a successful child process alone is not activation evidence.
- **Subagent boundary**: The executor and parser accept any future strict plan built from normalized subagent inputs, but this feature registers only ordinary Pi lifecycle handlers. It adds no subagent event approximation or interception. `epic-skills-hook-runtime-subagent-interception` reuses the private executor and decision vocabulary through its typed port after faithful interception exists.
- **Public/private boundary**: No command executor, process runner, executable resolver, selected root, signal, resolved configuration, raw decision parser, continuation controller, Pi action adapter, or diagnostics cause is added to `src/index.ts`. Public compatibility schemas remain declarative. Source/compiled allowlists and dependency-cruiser enforce domain/application/runtime/Pi/process direction.
- **UI**: No mocks. Permission ask reuses existing TUI/RPC confirm behavior; notifications and session naming reuse Pi-native APIs.
- **Foundation timing**: Code-first. Existing foundation prose already describes bounded execution, decisions, trust, path environment, concurrency, and errors. Implementation rolls docs forward only if the exact shell default, output field matrix, context-delivery limitation, or Stop budget makes a current assertion false or misleading.
- **Advisory review**: Security/process/Pi boundaries would normally justify design-time advisory review, but the caller explicitly prohibited nested agents. The skip is non-blocking; standard feature-level implementation review remains required.

## Architectural choice

### Option A — execute inside each Pi event callback with `pi.exec`

The native adapter could substitute strings, call `pi.exec`, parse output, and mutate that callback's event directly. This is short but `pi.exec` has unbounded capture for this threat model, does not expose the repository's process-tree/output policy, and couples secrets and foreign output semantics to Pi. Every event would duplicate failure, order, and redaction logic. Rejected.

### Option B — create a new hook-specific process pool and decision bus

A dedicated worker/pool could own timeouts, cancellation, output, concurrency, and decision application. It isolates hooks from source acquisition but duplicates the existing spawn/tree-kill primitive, adds another cancellation model, risks eager secret-bearing jobs, and makes completion order too easy to mistake for declaration order. Rejected.

### Option C — selected-plan executor over callback capabilities and the existing bounded runner (chosen)

A host-neutral executor consumes only strict event plans. A callback-style application port re-verifies current trust/roots and delegates to the existing configuration resolver; a narrowly generalized command runner and private executable resolver perform one explicit launch. Strict parsers aggregate decisions into a Pi-independent value, and a thin Pi adapter applies them at the original callback boundary.

**Choice**: Option C. It preserves ports/adapters, keeps plaintext lifetime and process ownership singular, enables later subagent reuse, and makes Pi mutation a separately testable compatibility seam.

## Verified Pi 0.80.8 decision surface

| Pi boundary/API | Exact usable behavior | Hook decision mapping |
|---|---|---|
| `input` | transforms chain; `handled` short-circuits prompt/agent | prompt context via hidden `nextTurn`; block/stop as `handled` |
| `tool_call` | current input is mutable; no revalidation; return only block/reason | apply `updatedInput` in place; deny/block/failed ask returns block |
| `tool_result` | partial `{ content, details, isError }` patches chain in extension order | `updatedToolOutput` replaces JSON `details`; preserve other fields |
| `session_before_compact` | may return `{ cancel: true }`; has dedicated signal | stop/block/fail-closed returns cancel |
| `session_start`, `session_shutdown`, `session_compact` | observer callbacks have no mutation return | context/title/message only; errors cannot roll host work back |
| `agent_settled` | fires after retry/compaction/queued work; idle unless extension starts work | execute Stop; guarded hidden custom-message continuation |
| `ctx.ui.confirm` | TUI and RPC dialogs; false on cancel/timeout; no UI in JSON/print | ask once; all unavailable/error cases deny |
| `ctx.abort()` | aborts active agent operation | representable `continue: false` outside pre-boundary return paths |
| `pi.sendMessage()` | hidden custom context with `nextTurn`/`steer`/`followUp`; optional trigger | additional context and Stop continuation without fake user input |
| `pi.setSessionName()` | persists display name and emits info change | validated session title update |

## Threat model and invariants

- A hook command, arguments, stdout, stderr, environment use, and timing are attacker-controlled plugin content, but execution occurs only after immutable revision trust and compatibility selection.
- A trusted hook may intentionally read its content/data/project/configuration capabilities. It must not gain another plugin's roots/configuration, a stale project scope, an untrusted project, raw credential-store access, or process-launch fields outside its normalized declaration.
- A child may fork, ignore `SIGTERM`, hold pipes open, emit infinite output, exit races, print invalid UTF-8/JSON, echo secrets, or complete out of order. One runner owns group termination/drain, and all retained data is bounded before parse/application.
- A malformed/compromised adapter may return wrong roots, executable identity, configuration evidence, or result shapes. Strict schemas and exact binding checks reject the value without partial launch/application.
- Same-user privileged filesystem replacement and deliberately contract-violating injected adapters remain outside the project review bar, but ordinary symlink/path/stale-root confusion must fail closed through existing immutable/root capabilities.

## Trickiest unit first

The hardest seam is executing while secret plaintext exists without letting either the command result or a useful decision smuggle that plaintext into durable state or diagnostics. `withResolvedPluginConfiguration` intentionally discards callback completion values, so the hook executor must perform template expansion, environment construction, executable resolution, spawn, byte decoding, strict parse, and exact-value redaction inside that callback. It can assign only a schema-validated sanitized decision or a stable failure code to an outer slot. The callback then disposes the facade; process buffers and expanded launch data become unreachable. This seam is implemented before Pi application so no host API can receive raw output accidentally.

## Implementation units

### Unit 1: Normalize launch semantics and establish callback-scoped execution authority

**Story**: `epic-skills-hook-runtime-guarded-command-hooks-execution-contracts`

**Files**:
- `src/domain/components.ts`
- `src/formats/hook-reader-support.ts`
- `src/domain/hook-runtime-contract.ts`
- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/application/resolved-configuration.ts`
- `src/application/ports/hook-execution-context.ts`
- `src/application/hook-execution-context.ts`
- `src/runtime/hooks/hook-launch-contract.ts`
- `test/formats/claude/hook-reader.test.ts`
- `test/formats/codex/hook-reader.test.ts`
- `test/domain/hook-runtime-contract.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/application/hook-execution-context.test.ts`

```typescript
export const HookShellSchema = z.enum(["bash", "powershell"]);
export type HookShell = z.infer<typeof HookShellSchema>;

export const HookHandlerSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("shell"),
    command: z.string().min(1),
    shell: HookShellSchema.optional(), // absent is canonical Bash
    timeoutMs: z.number().int().positive().max(HOOK_MAX_TIMEOUT_MS).optional(),
  }).strict().readonly(),
  z.object({
    kind: z.literal("exec"),
    command: z.string().min(1),
    args: z.array(z.string()).readonly(),
    timeoutMs: z.number().int().positive().max(HOOK_MAX_TIMEOUT_MS).optional(),
  }).strict().readonly(),
]);

export type HookExecutionBinding = Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  revision: ContentDigest;
  projectionDigest: ContentDigest;
  contributionDigest: ContentDigest;
  componentId: ComponentId;
  sourceOrder: Readonly<{ snapshotOrdinal: number; hookOrdinal: number }>;
}>;

export type HookExecutionContextRequest = Readonly<{
  binding: HookExecutionBinding;
  sessionCwd: string;
  plannedPluginRoot: string;
  plannedPluginDataRoot: string;
  currentProject: CurrentProjectRuntimeContext;
}>;

export type ResolvedHookExecutionContext = Readonly<{
  cwd: string;
  projectRoot: string;
  pluginRoot: string;
  pluginDataRoot: string;
  configuration: ResolvedConfiguration;
}>;

export interface HookExecutionContextPort {
  withContext(
    request: HookExecutionContextRequest,
    signal: AbortSignal,
    use: (context: ResolvedHookExecutionContext) => Promise<void>,
  ): Promise<void>;
}

export interface ResolvedConfiguration {
  has(key: string): boolean;
  substitute(template: string): string;
  environment(prefix?: "CLAUDE_PLUGIN_OPTION_"): Readonly<Record<string, string>>;
  redact(text: string): string;
  dispose(): void;
  toString(): "[REDACTED]";
  toJSON(): "[REDACTED]";
}
```

`createHookExecutionContextPort` receives a private current-activation lookup plus existing `withResolvedPluginConfiguration` dependencies. It verifies the complete binding, current project/trust capability, exact cwd and adapter-issued roots, then calls the existing resolver. The new `redact()` exposes replacement behavior, never plaintext or the backing map. Explicit Bash normalizes to absent/default to preserve existing default-handler component identities; PowerShell changes the executable surface as intended.

**Acceptance criteria**:
- [ ] Only normalized selected bindings can acquire a context; wrong scope/plugin/revision/digest/component/current-project/cwd/root fails before configuration fetch or process spawn.
- [ ] Shell default/explicit Bash/PowerShell and exec forms normalize deterministically; exec+shell, unknown shell, timeout overflow, and unknown launch fields are incompatible before projection.
- [ ] Existing default Bash handler ids/trust digests remain stable; PowerShell participates in component/trust/projection identity.
- [ ] Path variables and user configuration use one substitution function across shell command, exec command/args, and explicit environment values.
- [ ] Callback completion is discarded; disposed configuration, raw roots, trust records, adapter causes, and plaintext cannot cross the port result.
- [ ] Project execution requires the current opaque root capability and trusted matching project; user execution still records/checks current project without treating cwd as project authority.

### Unit 2: Narrow the existing runner into a bounded hook executor

**Story**: `epic-skills-hook-runtime-guarded-command-hooks-bounded-execution`
**Depends on**: `epic-skills-hook-runtime-guarded-command-hooks-execution-contracts`

**Files**:
- `src/application/ports/process-runner.ts`
- `src/infrastructure/process/command-runner.ts`
- `src/infrastructure/process/hook-executable-resolver.ts`
- `src/infrastructure/git/git-source-acquirer.ts`
- `src/runtime/hooks/guarded-command-executor.ts`
- `test/infrastructure/process/command-runner.test.ts`
- `test/infrastructure/process/hook-executable-resolver.test.ts`
- `test/runtime/hooks/guarded-command-executor.test.ts`
- `test/fixtures/process-hooks/echo-input.mjs`
- `test/fixtures/process-hooks/spawn-descendant.mjs`
- `test/fixtures/process-hooks/delayed-output.mjs`

```typescript
export type CommandEnvironment = Readonly<{
  inherit: "host" | "none";
  values: Readonly<Record<string, string | undefined>>;
}>;

export type CommandCapturePolicy = Readonly<{
  stdout: Readonly<{ mode: "capture" | "stream"; maxBytes: number; overflow: "error" }>;
  stderr: Readonly<{ maxBytes: number; overflow: "error" | "truncate" }>;
}>;

export type CommandRequest = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  environment: CommandEnvironment;
  stdin?: AsyncIterable<Uint8Array>;
  timeoutMs?: number;
  capture: CommandCapturePolicy;
}>;

export type CommandResult = Readonly<{
  exitCode: number;
  stdout: Uint8Array | AsyncIterable<Uint8Array>;
  stderr: Uint8Array;
  stderrTruncated: boolean;
  completion?: Promise<number>;
}>;

export type ResolvedHookExecutable = Readonly<{
  executable: string;
  resolution: "absolute" | "cwd-relative" | "path";
  identity: HookExecutableIdentity;
}>;

export interface HookExecutableResolverPort {
  resolve(
    request: Readonly<{ command: string; cwd: string; environment: CommandEnvironment }>,
    signal: AbortSignal,
  ): Promise<ResolvedHookExecutable>;
}

export type HookHandlerExecution = Readonly<{
  binding: HookExecutionBinding;
  exitCode: number;
  stdout: Uint8Array;
  stderr: Uint8Array;
}>;

export type HookPlanExecutionResult =
  | Readonly<{ kind: "completed"; handlers: readonly HookHandlerExecution[] }>
  | Readonly<{ kind: "failed"; diagnostics: readonly HookRuntimeDiagnostic[] }>
  | Readonly<{ kind: "cancelled"; diagnostics: readonly HookRuntimeDiagnostic[] }>;

export interface GuardedCommandHookExecutor {
  execute(
    plan: HookEventPlan,
    invocation: Readonly<{
      currentProject: CurrentProjectRuntimeContext;
      runtimeSignal: AbortSignal;
    }>,
  ): Promise<HookPlanExecutionResult>;
}
```

The executor validates/deduplicates the plan, resolves each context inside its callback, builds one canonical stdin buffer, resolves one executable, and delegates timeout/caller abort/output/tree lifecycle to the existing runner. Handler slots are allocated before a fixed-width queue starts. For hooks, both stream overflows are errors; Git/source callers explicitly retain their current stderr truncation policy.

**Acceptance criteria**:
- [ ] Shell form executes through only the normalized resolved Bash/PowerShell with `shell: false`; exec form passes arguments literally, including quotes, glob characters, `$()`, and whitespace.
- [ ] Exact cwd, five path environment variables, sorted configuration environment, host inheritance choice, and executable resolution are observable in process fixtures without appearing in diagnostics.
- [ ] Canonical JSON plus one newline is the sole stdin value; oversized input fails before spawn.
- [ ] Caller abort and timeout use the existing process-group/tree termination and graceful/force escalation; a descendant fixture proves no surviving child or held pipe.
- [ ] Stdout and stderr overflow, invalid request, spawn failure, null exit, and timeout are bounded typed outcomes; output continues draining during termination without unbounded retention.
- [ ] At most eight handlers run at once, at most 256 are selected, first exact duplicates win, user/project copies remain distinct, and returned slots are source-ordered despite inverse completion.
- [ ] Existing Git/npm/source acquisition behavior remains green after all callers make environment/capture policy explicit; no second spawn/kill/timeout implementation exists.

### Unit 3: Parse and aggregate exact hook decisions

**Story**: `epic-skills-hook-runtime-guarded-command-hooks-decision-aggregation`
**Depends on**: `epic-skills-hook-runtime-guarded-command-hooks-execution-contracts`

**Files**:
- `src/domain/hook-output-contract.ts`
- `src/runtime/hooks/hook-output-parser.ts`
- `src/runtime/hooks/hook-decision-aggregator.ts`
- `src/runtime/hooks/hook-runtime-diagnostic.ts`
- `test/domain/hook-output-contract.test.ts`
- `test/runtime/hooks/hook-output-parser.test.ts`
- `test/runtime/hooks/hook-decision-aggregator.test.ts`

```typescript
export const HookSpecificOutputSchema = z.object({
  hookEventName: z.string().min(1),
  additionalContext: z.string().optional(),
  permissionDecision: z.enum(["allow", "deny", "ask"]).optional(),
  permissionDecisionReason: z.string().optional(),
  updatedInput: z.record(z.string(), JsonValueSchema).optional(),
  updatedToolOutput: JsonValueSchema.optional(),
}).strict().readonly();

export const CommandHookJsonOutputSchema = z.object({
  continue: z.boolean().optional(),
  stopReason: z.string().optional(),
  systemMessage: z.string().optional(),
  decision: z.literal("block").optional(),
  reason: z.string().optional(),
  permissionDecision: z.enum(["allow", "deny", "ask"]).optional(),
  permissionDecisionReason: z.string().optional(),
  additionalContext: z.string().optional(),
  updatedInput: z.record(z.string(), JsonValueSchema).optional(),
  updatedToolOutput: JsonValueSchema.optional(),
  title: z.string().min(1).optional(),
  hookSpecificOutput: HookSpecificOutputSchema.optional(),
}).strict().readonly();

export type ParsedHookDecision = Readonly<{
  binding: HookExecutionBinding;
  contexts: readonly string[];
  systemMessages: readonly string[];
  block?: Readonly<{ reason?: string }>;
  permission?: Readonly<{ kind: "allow" | "deny" | "ask"; reason?: string }>;
  updatedInput?: Readonly<Record<string, JsonValue>>;
  updatedToolOutput?: JsonValue;
  stop?: Readonly<{ reason?: string }>;
  title?: string;
  continuation?: Readonly<{ reason?: string }>;
}>;

export type AggregatedHookDecision = Readonly<{
  event: OrdinaryHookEvent | SubagentHookEvent;
  contexts: readonly string[];
  systemMessages: readonly string[];
  block?: Readonly<{ reason?: string }>;
  permission?: Readonly<{ kind: "allow" | "deny" | "ask"; reason?: string }>;
  updatedInput?: Readonly<Record<string, JsonValue>>;
  updatedToolOutput?: JsonValue;
  stop?: Readonly<{ reason?: string }>;
  title?: string;
  continuation?: Readonly<{ reason?: string }>;
  diagnostics: readonly HookRuntimeDiagnostic[];
}>;

export function parseHookHandlerOutput(input: Readonly<{
  event: OrdinaryHookEvent | SubagentHookEvent;
  execution: HookHandlerExecution;
  redact(text: string): string;
}>): ParsedHookDecision | HookRuntimeDiagnostic;

export function aggregateHookDecisions(input: Readonly<{
  event: OrdinaryHookEvent | SubagentHookEvent;
  originalInput: ForeignHookInput;
  decisions: readonly (ParsedHookDecision | HookRuntimeDiagnostic)[];
}>): AggregatedHookDecision;
```

The domain registry derives event/field applicability, plain-output allowance, exit-2 semantics, fail-closed class, and Pi application kind. JSON decoding requires one object and recursively strict known nested shapes. Redaction occurs before accepted text enters `ParsedHookDecision`; raw bytes are then discarded.

**Acceptance criteria**:
- [ ] Every supported root/nested field has positive and wrong-event negative evidence; `defer`, terminal/env/watch/reload fields, unknown keys, scalar/array/multiple JSON values, invalid UTF-8, and oversized aggregate are explicit errors.
- [ ] Exit 0 empty/JSON/plain and exit 2 behavior match the event policy; other exits never inject raw stdout/stderr or native messages.
- [ ] Config-secret canaries in accepted text are redacted before callback exit; canaries in malformed stdout/stderr/native causes appear nowhere in decisions, diagnostics, JSON, or inspect output.
- [ ] Context/system messages preserve source order; block/permission safety precedence and first reason are deterministic; input patches and output/title replacements use declared fold order.
- [ ] Handler completion order cannot affect aggregate bytes, diagnostics, rewrites, title, Stop behavior, or chosen reason.
- [ ] Execution/parse/cancel errors fail closed only on defined interception boundaries and never partially apply earlier handler decisions.

### Unit 4: Register ordinary Pi callbacks and apply decisions safely

**Story**: `epic-skills-hook-runtime-guarded-command-hooks-pi-application`
**Depends on**: `epic-skills-hook-runtime-guarded-command-hooks-bounded-execution`, `epic-skills-hook-runtime-guarded-command-hooks-decision-aggregation`

**Files**:
- `src/pi/hooks/pi-hook-decision-adapter.ts`
- `src/pi/hooks/pi-command-hook-runtime.ts`
- `src/runtime/hooks/stop-continuation-guard.ts`
- `src/pi/hooks/pi-hook-event-adapter.ts` (narrow extension to pass explicit Stop state only)
- `test/pi/hooks/pi-hook-decision-adapter.test.ts`
- `test/pi/hooks/pi-command-hook-runtime.test.ts`
- `test/runtime/hooks/stop-continuation-guard.test.ts`
- `test/pi/hooks/fake-pi.ts`

```typescript
import type {
  ExtensionAPI,
  ExtensionContext,
  InputEvent,
  InputEventResult,
  SessionBeforeCompactResult,
  ToolCallEvent,
  ToolCallEventResult,
  ToolResultEvent,
  ToolResultEventResult,
} from "@earendil-works/pi-coding-agent";

export interface StopContinuationGuard {
  state(): Readonly<{ stopHookActive: boolean; used: number; remaining: number }>;
  request(): "allowed" | "exhausted";
  settleWithoutContinuation(): void;
  reset(reason: "user-input" | "shutdown" | "session-replacement" | "reload"): void;
}

export interface PiHookDecisionAdapter {
  applyInput(event: InputEvent, ctx: ExtensionContext, value: AggregatedHookDecision): Promise<InputEventResult | undefined>;
  applyToolCall(event: ToolCallEvent, ctx: ExtensionContext, value: AggregatedHookDecision): Promise<ToolCallEventResult | undefined>;
  applyToolResult(event: ToolResultEvent, ctx: ExtensionContext, value: AggregatedHookDecision): Promise<ToolResultEventResult | undefined>;
  applyBeforeCompact(ctx: ExtensionContext, value: AggregatedHookDecision): Promise<SessionBeforeCompactResult | undefined>;
  applyLifecycle(ctx: ExtensionContext, value: AggregatedHookDecision): Promise<void>;
  applyStop(ctx: ExtensionContext, value: AggregatedHookDecision): Promise<void>;
}

export function registerPiCommandHookRuntime(input: Readonly<{
  pi: ExtensionAPI;
  events: PiHookEventAdapter;
  executor: GuardedCommandHookExecutor;
  decisions: PiHookDecisionAdapter;
  continuation: StopContinuationGuard;
  runtimeSignal: AbortSignal;
}>): void;
```

`registerPiCommandHookRuntime` registers only the ordinary callbacks verified above. It plans, then executes plans sequentially, aggregates, and applies at that same callback boundary. Empty plans are no-ops. Compaction's two post plans remain sequential. The application adapter creates hidden custom messages with fixed custom types and no details; it does not append diagnostics to session state.

**Acceptance criteria**:
- [ ] Exact Pi return/mutation behavior is proven for prompt block/context, pre-tool allow/deny/ask/rewrite, post-tool details rewrite/context, compact cancel/context, title, stop, and no-op outcomes.
- [ ] Ask occurs only for PreToolUse, once per aggregate, in TUI/RPC with `hasUI`; timeout/cancel/error/JSON/print/no-UI denies with a fixed safe reason and exposes no command/output/root/configuration.
- [ ] Input replacement preserves object identity while replacing keys; post-tool replacement changes only `details`; unsupported rewrite/application combinations fail before mutation.
- [ ] Context delivery uses `nextTurn` for start/prompt/post-compact and `steer` for active tool boundaries; system messages notify only through available UI; session title uses `pi.setSessionName`.
- [ ] Stop begins inactive, recursively plans active, cannot exceed three continuations, resets on ordinary user input or runtime teardown, and emits no continuation after exhaustion or failure.
- [ ] `continue: false` uses the boundary's native block/handled/cancel or `ctx.abort`; it never calls process shutdown or invents a Pi permission event.
- [ ] Callback registration preserves Pi extension order, planner plan order, current trust/cwd/signal evidence, and completed lifecycle observation. No subagent callback is registered.

### Unit 5: Real-process, decision-matrix, lifecycle, and boundary hardening

**Story**: `epic-skills-hook-runtime-guarded-command-hooks-integration-hardening`
**Depends on**: `epic-skills-hook-runtime-guarded-command-hooks-pi-application`

**Files**:
- `test/fixtures/process-hooks/` (real Node/shell child and descendant fixtures)
- `test/fixtures/runtime/hooks/command-output-golden.ts`
- `test/integration/guarded-command-hooks.test.ts`
- `test/integration/hook-event-adaptation.test.ts`
- `test/integration/trust-config-secrets.test.ts`
- `test/infrastructure/process/command-runner.test.ts`
- `test/pi/hooks/pi-command-hook-runtime.test.ts`
- `test/public-api-hook-adaptation.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `.dependency-cruiser.cjs`
- `src/index.ts` (assert no new low-level exports; change only if a deliberate declarative schema is public)
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed behavior makes current assertions stale

The integration fixture uses the unchanged Agile Workflow shell hooks plus exec-form decision fixtures, real temporary plugin/data/project roots, the real Node command runner and configuration resolver, fake secret/path/trust stores with canaries, and the typed fake Pi host. It proves selection-to-application without bypassing a port. Process fixtures communicate readiness through files/pipes and are cleaned by the runner; tests do not use another kill implementation.

**Acceptance criteria**:
- [ ] Real shell and exec fixtures receive exact cwd/stdin/path/config environment and substitution; shell expansion occurs only in shell form and exec arguments remain literal.
- [ ] Caller cancellation, timeout, TERM-resistant parent, descendant process-tree kill, held-pipe cleanup, stdout/stderr bounds, invalid UTF-8/JSON, spawn resolution failure, and inverse completion order are non-flaky bounded tests.
- [ ] Secret canaries emitted in stdout, stderr, thrown adapter errors, executable paths, command arguments, and environment never appear in diagnostics, Pi notifications, custom-message details, state, snapshots, or package output.
- [ ] Decision matrices cover each ordinary event, exit 0/2/other, JSON/plain/empty, block/context/input/output/stop/title/continuation, unsupported fields, aggregate conflicts/precedence, and TUI/RPC/JSON/print ask behavior.
- [ ] Dedup/concurrency tests cover same declaration, same command across scopes/plugins, limit overflow, delayed completion, plan order, and `PostCompact` before compact `SessionStart`.
- [ ] Stop tests cover initial, recursive, no-continuation reset, exactly-at-budget, exhausted, send failure, new user input, reload/replacement/shutdown, and no accidental SubagentStart/Stop registration.
- [ ] Existing source acquisition, projection/event adaptation, trust/config/path/error, Pi fake, public API, and compiled export suites stay green; command hooks do not weaken completed boundaries.
- [ ] Full `npm test` passes typecheck, dependency boundaries, Vitest, build, and compiled import. Results record supplied main baseline `133/696/459`, branch starting baseline `141/744/459`, and exact additions.
- [ ] Rollback removes derived hook execution/application and reverts the runner's explicit request additions as one unit. No state schema, installed record, trust record, content/data layout, transition, projection cache format, or credential migration is required; command-hook capability returns unavailable and subagent interception remains blocked.

## Implementation order

1. `epic-skills-hook-runtime-guarded-command-hooks-execution-contracts`
2. In parallel after contracts:
   - `epic-skills-hook-runtime-guarded-command-hooks-bounded-execution`
   - `epic-skills-hook-runtime-guarded-command-hooks-decision-aggregation`
3. `epic-skills-hook-runtime-guarded-command-hooks-pi-application`
4. `epic-skills-hook-runtime-guarded-command-hooks-integration-hardening`

The graph is real: process and output work share the normalized authority/launch vocabulary but can proceed independently; Pi application requires both; integrated real-process and lifecycle evidence closes the feature. These are checkpoints for one cohesive feature owner, not one default worker per story.

## Simplification

- Reuse `HookEventPlan`, `PlannedCommandHook`, `SkillHookRuntimeCatalog`, current trust/scope/projection checks, `withResolvedPluginConfiguration`, `ResolvedConfiguration`, project-root authority, secret/path ports, `CommandRunner`, and structured redaction. Do not create another hook database, trust check, state reader, credential cache, path codec, subprocess wrapper, or cancellation tree.
- Make runner inheritance/limits/timeouts explicit once and update existing callers rather than wrapping it in a hook-only spawn API.
- Keep one strict output field registry and one aggregate decision type. Claude/Codex/Pi do not get parallel parser or decision switch tables.
- Keep raw bytes and expanded secrets inside the callback; do not attempt to make logging safe after leaking them into a broad result.
- Apply Pi decisions in one adapter. Do not let output parsing mutate event objects or let every callback reinvent context/title/ask/stop behavior.
- Keep Stop budget process-local and bounded. Do not persist continuation state, append tracking entries, or add a scheduler.
- No low-value compatibility shim for unsupported output fields. Rejection is simpler and more honest than accepting no-ops.

## Testing

- **Normalized contract**: shell default/explicit forms, timeout bound, unknown fields, stable handler identity, capability requirements. Protects compatibility/runtime agreement.
- **Execution authority**: exact complete binding, roots, cwd, current project/trust, config/path/secret failure, disposal, and callback result erasure. Protects the code-execution boundary.
- **Real process**: stdin/env/cwd/substitution, shell versus exec metacharacters, executable resolution, exit status, timeout, cancellation, process groups/descendants/held pipes, and both output limits. Protects availability and containment.
- **Decision parser**: strict field/event matrix, plain/JSON/exit matrix, UTF-8, size, redaction, and no raw snippets. Protects honest foreign compatibility and diagnostics.
- **Aggregation**: dedup, fixed concurrency, completion inversion, safety precedence, rewrite/title order, total bounds, and all-or-nothing fail-closed behavior. Protects determinism.
- **Pi adapter**: exact typed callback returns/mutations, hidden context delivery, UI modes/timeout, title, abort, compaction, and continuation guard. Protects current Pi 0.80.8 semantics.
- **Integration**: unchanged real plugin hook declarations through verified plan → context/config → child process → decision → fake Pi. Protects seams rather than callback counts.
- **Low-value tests avoided**: no snapshots of absolute temp roots, raw command strings, native errors, or secret-bearing environments; no test per trivial schema property; no duplicate immutable-store, trust-policy, reader, or event-input matrices.

## Risks and rollback

- **Riskiest assumption — hidden custom messages preserve every supported additional-context timing**: Pi has no return value for session-start/post-compaction context. Source confirms `nextTurn` custom messages join the next LLM context and `steer` messages join before the next model call, but other extensions can also queue messages. Mitigation: delivery is explicit per boundary and event-order integration asserts exact fake/AgentSession behavior. If timing proves unfaithful for a specific event, mark that output/event combination incompatible rather than inject at a nearby boundary.
- **Runner generalization can regress source acquisition**: environment and capture fields become explicit across existing Git callers. Mitigation: preserve runner defaults only through explicit caller values, keep streaming semantics unchanged, and run all source materialization/process tests. Rollback reverts runner and callers together.
- **Trust/configuration authority is composed later**: native management owns the active candidate/trust/configuration selection. A stale or incomplete composition must not fall back to plan roots alone. Mitigation: the context port requires exact complete binding and returns failure without spawn. Command capability remains unavailable until the real port is installed and observed.
- **Inherited host environment may contain secrets available to trusted code**: foreign hooks normally inherit host execution context, and trusted executable code can read it. Mitigation: inheritance is explicit in code/trust presentation, never serialized, and hook output/diagnostics are bounded and configured-secret-redacted. Changing to an allowlist would be a compatibility decision, not a silent hardening tweak.
- **PowerShell parity is platform-sensitive**: quoting/encoding and process-tree behavior differ on Windows. Mitigation: no Node shell selection; resolve a compatibility-probed executable and use fixed noninteractive arguments, with platform-conditional real fixtures. If unavailable, the existing runtime requirement prevents activation.
- **Pi does not revalidate mutated tool input**: a hook can produce a shape the tool rejects or misuses. This is Pi's documented mutation contract. Mitigation: accept only JSON objects, apply once in place, preserve extension order, and fail closed on invalid/oversized output; do not claim tool-specific schema validation.
- **Stop continuation is fire-and-forget at the public ExtensionAPI**: the action can fail after the guard marks active. Mitigation: bounded budget, fixed diagnostics, reset on next ordinary input/runtime teardown, and no retry-on-uncertain-send. A failure cannot loop indefinitely.
- **Aggregate context amplification**: each handler can emit bounded text but many handlers multiply it. Mitigation: selected-handler and aggregate byte caps are independent of per-stream limits; overflow yields no partial application.
- **Least certainty — foreign multi-handler rewrite precedence across all source hosts**: the compatibility docs require deterministic declaration-order behavior but host details can differ. This design uses the completed planner's explicit source order and documents last-writer behavior. If verified fixtures show another rule, only the pure aggregator changes; process/config/Pi boundaries remain stable.

Rollback is migration-free. Remove ordinary callback registration/decision adapter/executor/output contracts and revert the runner's explicit request shape plus caller updates. Existing projections, installed/trust/configuration state, immutable content/data, and lifecycle recovery remain valid; `pi.hooks.command` reports unavailable, affected plugins do not activate, and the subagent feature cannot intercept.

## Pre-mortem

This design fails if a raw hook array can bypass the planner, roots are trusted because they are strings, config plaintext outlives the resolver callback, Node silently picks a shell/PATH result, a child survives timeout, stderr grows without bound, malformed JSON is treated as plain context, concurrent completion chooses precedence, ask defaults to allow without UI, Pi receives a partial mutation after one handler error, or Stop can recursively trigger forever. Selected-plan-only ingress, callback capability verification, explicit executable/environment policy, one tree-killing runner, strict byte/schema bounds, source-order slots, event-aware fail-closed aggregation, mode-aware deny, separate all-or-nothing Pi application, and the three-step continuation guard address those failures.

The fallback is honest non-activation or a safe per-event diagnostic. No path responds to execution uncertainty by using an unbounded Pi helper, re-reading a raw manifest, dropping a handler silently, or accepting an unsupported decision as a no-op.

## Integrated implementation summary
- Execution capability: GPT-5.6 Luna xhigh, one cohesive owner over the full five-story DAG; direct-read only, no nested agents, questions, peer review, UI surface, MCP manager, native state authority, or subagent callback registration.
- Review weight: standard by project convention; caller explicitly requested no review, so the feature remains at `stage: review`.
- Child checkpoints: all five advanced directly to `stage: done` in DAG order: execution contracts, bounded execution, decision aggregation, Pi application, and integration hardening.
- Commits: `b4b4f60` + `f2a9ccc` execution contracts; `186f1ff` + `d7a3265` bounded execution; `b2bfa8a` + `2f75e1a` decision aggregation; `93f3971` + `456215d` Pi application; `38e6bbf` + `aa07d10` integration hardening; this feature transition is committed separately as `implement: epic-skills-hook-runtime-guarded-command-hooks`.
- Security behavior: only schema-validated `HookEventPlan` values enter execution; active scope/plugin/revision/projection/contribution/component/root/cwd/project-trust evidence is rechecked before callback-scoped configuration resolution. Exact Bash/PowerShell/exec launch identity, explicit host inheritance, five path variables, bounded stdin/output, process-tree timeout/abort, and fixed concurrency are enforced. Secrets and raw process data stay inside the resolver callback; accepted decisions are redacted and diagnostics are fixed-code only.
- Decision/application behavior: strict event-aware JSON/plain parsing rejects unsupported fields and malformed bytes; source-order aggregation is all-or-nothing and deterministic. Pi mutation is isolated to ordinary 0.80.8 callbacks with mode-aware fail-closed ask, hidden context delivery, exact tool-input/details mutation, compact cancellation, title, abort, and a non-persisted three-use Stop guard. No SubagentStart/Stop callback is registered.
- Verification: full `npm test` passed on the immediate rerun — typecheck, dependency boundaries (209 modules / 1,263 dependencies), 148 test files / 774 tests, build, and compiled public import (459 exports). The first final suite attempt hit the already-known unrelated recovery-review-hardening concurrency flake; no unrelated code changed and the immediate rerun passed. Supplied branch start was 141 / 744 / 459; final additions are 7 test files, 30 tests, and no public exports. Existing source acquisition and all completed event/projection/discovery contracts remain green.
- Foundation/docs: no assertion became false or misleading; no foundation document changed. Rollback remains migration-free and leaves state, projection cache, trust, configuration, credentials, content/data roots, lifecycle transitions, and subagent interception untouched.
- Deviations: the installed Pi 0.80.8 package root does not export `SessionBeforeCompactResult` or `ToolResultEventResult` aliases; their exact declaration shapes are kept local while all available event/context types remain type-imported from Pi. No blockers.

## Review hardening completion (2026-07-16)

- Story `epic-skills-hook-runtime-guarded-command-hooks-review-hardening` is complete at `stage: done`; all six feature checkpoints are now done and the feature returns to `stage: review`.
- Stop continuation now uses Pi 0.80.8's idle `steer` delivery with `triggerTurn: true`; the tests model `nextTurn`'s early-return behavior and verify recursive state, send-failure reset, three-use exhaustion, and ordinary reset paths through planning, execution, aggregation, application, and guard state.
- Resolver coverage is deterministic across absolute, cwd-relative, PATH, Windows `.exe`/`.cmd`/`.bat`, missing, and abort branches through injected platform/environment/access adapters. Stop exit-2 empty output continues safely; null exits classify as spawn failures; declaration-order ask reasons are retained; dead runtime plumbing and the parser sentinel cast are removed.
- Verification: focused Vitest passed (5 files / 21 tests), then full `npm test` passed with typecheck, dependency boundaries (209 modules / 1,263 dependencies), Vitest (149 files / 781 tests), build, and compiled package import (459 exports). No second review pass was run per the standard-review instruction.
- Commit: `1331a00 implement: epic-skills-hook-runtime-guarded-command-hooks-review-hardening`.

## Review findings (2026-07-16)

Effective weight: `standard`; one fresh-context Umans GLM 5.2 security pass. The reviewer verified authority revalidation, secret lifetime/redaction, process bounds/tree kill, strict decisions, deterministic aggregation, and package boundaries, but found Stop continuation non-functional because Pi 0.80.8 ignores `triggerTurn` when `deliverAs: "nextTurn"`. Receiver-confirmed hardening set:

- Deliver idle `agent_settled` continuation as `steer` or `followUp` with `triggerTurn: true`, and prove a real/fidelity fake Pi turn starts, guard state increments, send failures reset safely, and the three-use budget exhausts without a fourth turn.
- Add dedicated executable-resolver tests for absolute, cwd-relative, PATH, Windows extension candidates, missing executable, and abort.
- Add Stop exit-2/empty-stdout continuation coverage.
- Remove or consolidate newly dead `eventFailsClosed`, Stop generation/reason, and unused runtime context plumbing; use one fail-closed registry.
- Replace the output parser's `as never` sentinel with a typed result; map `NULL_EXIT` to spawn failure; retain the first declaration-order `ask` reason.

Tracked by `epic-skills-hook-runtime-guarded-command-hooks-review-hardening`. Context-before-ask-denial, idle context delivery naming, and generic canonicalizer deduplication are ambiguous or low-risk and remain out of scope. Standard review closes administratively after this exact set; no second independent pass.
