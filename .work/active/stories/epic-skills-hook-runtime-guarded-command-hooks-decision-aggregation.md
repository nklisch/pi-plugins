---
id: epic-skills-hook-runtime-guarded-command-hooks-decision-aggregation
kind: story
stage: done
tags: [compatibility, security, infra]
parent: epic-skills-hook-runtime-guarded-command-hooks
depends_on: [epic-skills-hook-runtime-guarded-command-hooks-execution-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Parse and aggregate exact hook decisions

## Checkpoint

Create one strict event-aware JSON/plain output contract and fold source-ordered handler outcomes into a bounded Pi-independent decision without raw-output, secret, native-cause, or completion-order leakage.

## Design element

- Add one registry/schema for supported root and `hookSpecificOutput` fields: block/reason, allow/deny/ask, context/system message, input/output rewrite, stop, title, and continuation.
- Derive event/field applicability, plain-output support, exit-2 meaning, and fail-closed class from that registry. Reject unknown and known-but-wrong-event fields rather than ignoring them.
- Decode bounded valid UTF-8 only. Exit zero accepts empty/one strict JSON object/event-allowed plain context; exit two becomes event-specific block/feedback/Stop continuation; other exits produce fixed safe handler errors.
- Redact accepted text through the callback-scoped configuration facade before constructing `ParsedHookDecision`; discard malformed/raw bytes entirely.
- Aggregate only preordered slots: append context/messages, use deny/block safety precedence and first reason, shallow-fold updated input, last-write output/title, and convert Stop block/feedback to continuation.
- Enforce selected-handler, per-output, aggregate-text, and aggregate-JSON limits. A fail-closed handler error suppresses the complete aggregate instead of partially applying earlier decisions.

## Acceptance evidence

- Exhaustive field/event tables include positive and negative vectors for every supported field and reject `defer`, terminal/env/watch/reload fields, unknown nested keys, scalars/arrays, multiple JSON values, invalid UTF-8, and oversize data.
- Exit 0/2/other with empty/JSON/plain output is covered for every ordinary event class and the reusable subagent event contract.
- Canary secrets in accepted context/reason/title are redacted before callback exit; malformed stdout, stderr, executable failures, and native causes never appear in decisions, diagnostics, JSON, inspection, or messages.
- Completion-inverted inputs yield byte-identical aggregate decisions and diagnostic order.
- Aggregation tests prove block/deny/ask/allow precedence, first chosen reason, declaration-order context, input patch overwrite order, output/title last-writer behavior, continue-false stop, and Stop continuation.
- Fail-closed pre-boundaries return no partial rewrite/context/title; post/completed boundaries preserve the base host result and apply no partial side effect on aggregate failure.

## Ordering constraint

Depends on execution contracts and can proceed in parallel with the bounded executor. The Pi adapter cannot start until both checkpoints expose their strict result contracts.

## Implementation notes
- Execution capability: GPT-5.6 Luna xhigh, one owner following the feature DAG; no nested agents, questions, or review.
- Review weight: standard by project convention; child checkpoint advances directly to done after focused verification.
- Files changed: one strict output field/event registry, bounded UTF-8/JSON/plain parser with callback-scoped redaction, safe runtime diagnostics, and declaration-order all-or-nothing aggregation.
- Tests added: strict unknown/wrong-event/nested/scalar/multiple/UTF-8/exit matrix, plaintext redaction, exit-two Stop/block behavior, deterministic context/permission/rewrite/title precedence, and fail-closed suppression.
- Simplification: the parser and aggregator consume the same registry and ordered binding evidence; raw process bytes and native causes never become an outcome value.
- Discrepancies from design: fail-closed aggregation returns an empty host-neutral decision plus fixed diagnostics; the Pi adapter owns the event-specific cancellation/block response.
- Adjacent issues parked: none.
