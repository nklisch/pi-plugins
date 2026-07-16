---
id: epic-skills-hook-runtime-guarded-command-hooks-pi-application
kind: story
stage: implementing
tags: [compatibility, security, infra]
parent: epic-skills-hook-runtime-guarded-command-hooks
depends_on: [epic-skills-hook-runtime-guarded-command-hooks-bounded-execution, epic-skills-hook-runtime-guarded-command-hooks-decision-aggregation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Apply aggregated decisions at exact Pi boundaries

## Checkpoint

Register ordinary Pi callbacks around the completed planner/executor and apply validated decisions through Pi 0.80.8's exact return, mutation, UI, context-message, title, abort, and settled-agent continuation APIs.

## Design element

- Add a package-private Pi decision adapter with typed input/tool-call/tool-result/pre-compact/lifecycle/Stop methods. Runtime parsers remain Pi-free, and this adapter never sees commands, environment, secrets, roots, or raw process bytes.
- Register `session_start`, `session_shutdown`, `input`, `tool_call`, `tool_result`, `session_before_compact`, `session_compact`, and `agent_settled`; reuse the existing event adapter to plan and execute plans sequentially at the same callback position.
- Map prompt blocks to `handled`, tool blocks/denies to `{ block, reason }`, input rewrite to in-place replacement, tool output rewrite to `details`, compact stop to cancel, and active lifecycle stop to `ctx.abort()`.
- Deliver hidden additional context with `nextTurn` for start/prompt/post-compact and `steer` for active tool boundaries. Notify system messages only through available UI and apply title through `pi.setSessionName()`.
- Resolve ask once per aggregate only on PreToolUse. Use TUI/RPC confirm with fixed safe text, 30-second timeout, and available signal; every unavailable/cancel/timeout/error path denies.
- Add a three-use process-local Stop continuation guard. Plan initial/recursive `stop_hook_active` exactly, trigger a hidden custom-message turn, and reset on no continuation, ordinary user input, reload/replacement/shutdown, or exhaustion.

## Acceptance evidence

- Exact Pi type tests fail on return/payload drift and prove input transform/handled, mutable tool input identity, tool-result patching, compaction cancellation, title persistence, abort, and no-op behavior.
- Input replacement deletes stale keys and assigns a cloned bounded object without replacing the event object; output rewrite changes only JSON `details` and preserves content/isError.
- Ask tests cover TUI approval/denial, RPC approval/denial, cancellation, timeout, dialog throw, stale signal/context, `hasUI: false`, JSON, and print; unsafe data never appears in the prompt.
- Context tests assert exact hidden custom type, empty details, delivery mode, callback order, and next model-call position. Diagnostics are not appended to session state.
- Stop tests cover inactive initial plan, active recursion, exactly three continuations, exhaustion, no-continuation reset, send failure, user-input reset, session teardown, and no infinite turn.
- Completed `PostCompact` executes before compact `SessionStart`, handler completion never changes plan order, and source mutation reflects this extension's installed position.
- No subagent callback/interception is registered and command capability is not reported available before complete native composition/observation.

## Ordering constraint

Depends on both bounded execution and decision aggregation. Integration hardening is the sole downstream checkpoint.
