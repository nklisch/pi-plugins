---
id: epic-skills-hook-runtime-hook-event-adaptation-tool-event-planning
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-hook-event-adaptation
depends_on: [epic-skills-hook-runtime-hook-event-adaptation-contract-registry]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Plan aliased tool success and failure events

## Checkpoint

Resolve one deterministic Pi/foreign tool identity, evaluate compiled matcher and supported `if` conditions, and build strict `PreToolUse`, `PostToolUse`, and `PostToolUseFailure` plans from the exact current Pi callback evidence.

## Design element

- Add `src/runtime/hooks/tool-identity.ts`, `tool-event-input.ts`, and the tool portions of `hook-event-planner.ts`.
- Resolve verified Pi built-ins and foreign aliases through the immutable registry; accept validated dynamic subagent/MCP rows and use identity-only matching for unknown custom tools.
- Use one preferred foreign payload name while matching exact Pi and foreign aliases case-sensitively.
- Clone/validate tool input at the adapter position. Include structured `tool_response` only for actual JSON-compatible Pi details; keep raw content/details/isError namespaced.
- Select success versus failure solely from current `isError`; derive failure `error` and `is_interrupt` only from actual content/signal evidence.
- Preserve stable selected-hook source order independently of Pi parallel completion order. Do not mutate Pi input/result or apply execution output.

## Acceptance evidence

- Alias tests cover `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `apply_patch`, raw lower-case Pi names, `ls`, unknown tools, and validated dynamic aliases without fuzzy/case-folded fallback.
- Matcher tests cover all/exact-set/regex forms over each alias candidate and prove payload naming does not depend on the matching declaration.
- Condition tests cover all fields/operators, alias-aware equality/inclusion, bounded canonical JSON, missing response behavior, invalid event fields, and compatibility/runtime compiler agreement.
- Input goldens prove exact `tool_name`, `tool_input`, `tool_use_id`, optional `tool_response`, failure `error`, optional `is_interrupt`, and namespaced Pi content.
- Fake parallel completions prove each callback is classified from its own `isError` and handler precedence remains catalog order rather than completion order.
- Canary command strings are selected but never executed.

## Ordering constraint

Depends on `epic-skills-hook-runtime-hook-event-adaptation-contract-registry`. It may proceed in parallel with the session/input checkpoint; the Pi bridge waits for both.
