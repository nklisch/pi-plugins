---
id: epic-skills-hook-runtime-hook-event-adaptation-pi-lifecycle-bridge
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-hook-event-adaptation
depends_on: [epic-skills-hook-runtime-hook-event-adaptation-session-input-contracts, epic-skills-hook-runtime-hook-event-adaptation-tool-event-planning]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Adapt the current typed Pi lifecycle into plans

## Checkpoint

Create the thin Pi-specific ingress that imports current Pi event/context types, extracts exact session/current-project/cancellation/tool/compaction/settled evidence, and calls the host-neutral planner. It returns planning results only and does not activate or execute hooks.

## Design element

- Add `src/pi/hooks/pi-hook-event-adapter.ts` and `pi-session-evidence.ts` with type-only imports from exact verified `@earendil-works/pi-coding-agent` `0.80.8` declarations.
- Add the package as a development type dependency and dependency-cruiser rules that keep Pi imports out of domain/runtime modules.
- Provide typed methods for `session_start`, `session_shutdown`, `input`, `tool_call`, `tool_result`, `session_before_compact`, `session_compact`, and `agent_settled`.
- Read current callback objects at Plugin Host's extension-order position and pass exact current project/trust context. Use the event's compaction signal or `ctx.signal` only when Pi provides one.
- Leave final `pi.on` registration, command dispatch, return-value/mutation application, and runtime capability reporting to guarded-command/native composition.

## Acceptance evidence

- A typed fake Pi harness uses the installed event shapes and fails compilation when names/payloads drift.
- Sequence tests prove shutdown-before-replacement start; startup/reload/new/resume/fork mapping; raw pre-expansion input; validated mutable tool input; current tool result patches; compaction pre/post order; and settled-only Stop.
- Cancellation tests preserve exact event/context signals and explicit idle/session absence.
- Trust tests prove Pi trust can tighten but never widen snapshot trust, and current-project mismatch yields no selected plan.
- The adapter does not mutate tool input, patch result, cancel compaction, continue the agent, execute a process, resolve configuration, or claim `pi.hooks.command` availability.
- Production runtime imports of Pi remain type-only; no duplicate hand-written Pi event union is introduced.

## Ordering constraint

Depends on both session/input and tool-event planning checkpoints. The integrated golden/public-boundary checkpoint follows this one.
