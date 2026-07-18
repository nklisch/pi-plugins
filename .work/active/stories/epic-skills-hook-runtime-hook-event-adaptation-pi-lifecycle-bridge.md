---
id: epic-skills-hook-runtime-hook-event-adaptation-pi-lifecycle-bridge
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-hook-event-adaptation
depends_on: [epic-skills-hook-runtime-hook-event-adaptation-session-input-contracts, epic-skills-hook-runtime-hook-event-adaptation-tool-event-planning]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
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

## Implementation notes
- Execution capability: GPT-5.6 Luna inline; the Pi boundary is a thin type-only ingress over the completed host-neutral planner.
- Review weight: standard (caller explicitly prohibited review for this delegated run).
- Files changed: `src/pi/hooks/pi-session-evidence.ts`, `src/pi/hooks/pi-hook-event-adapter.ts`, `src/runtime/hooks/event-contract.ts`, `package.json`, `package-lock.json`, `.dependency-cruiser.cjs`, `test/pi/hooks/fake-pi.ts`, `test/pi/hooks/pi-hook-event-adapter.test.ts`.
- Tests added/removed: typed Pi 0.80.8 fake lifecycle events, replacement mapping, raw input/mutation preservation, dedicated compaction signal, ordered post-compaction plans, settled Stop, and type-only boundary checks.
- Simplification: Pi types are imported only at the adapter ingress; no runtime Pi manager, registration, process, output, or decision path was introduced.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`, `npm run boundaries`, focused Pi adapter suite green.
