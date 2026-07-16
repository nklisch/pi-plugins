---
id: epic-skills-hook-runtime-hook-event-adaptation-review-hardening
kind: story
stage: done
tags: [compatibility, infra, tests]
parent: epic-skills-hook-runtime-hook-event-adaptation
depends_on: [epic-skills-hook-runtime-hook-event-adaptation-integration-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Snapshot namespaced Pi tool-result content

## Standard-review fix

The one independent pass approved the feature but found that `pi.toolResult.content` retained Pi's mutable callback array and nested objects. Close the gap:

- At the Pi ingress/planning boundary, construct a fresh deeply immutable content snapshot for each supported text/image item before plan parsing.
- Retain the contract fields (`type`, text or image data/mime type) and intentionally omit opaque Pi fields such as optional `textSignature`; namespaced evidence must not fail strict parsing because Pi adds an irrelevant field.
- Never mutate Pi's source event/content.
- Add regression evidence that mutating/replacing the source array and nested item after planning cannot change the plan, and that content carrying `textSignature` plans successfully without exposing it.

## Constraints

No event mapping, matcher/condition, foreign field, process execution, Pi decision, ordering, cancellation, trust/scope/projection, public API, or compatibility behavior changes. Loose type casts elsewhere are outside this fix. Standard review already ran; no second independent pass.

## Acceptance evidence

- [x] `pi.toolResult.content` shares no mutable array/object identity with Pi event evidence.
- [x] Post-plan source mutation leaves the plan byte-for-byte unchanged.
- [x] Optional `textSignature` is safely omitted and does not reject a normal tool result.
- [x] Existing tool success/failure/interrupt and exact input goldens remain unchanged.
- [x] Focused and full `npm test`, boundaries, build/package import pass.

## Implementation notes
- Execution capability: GPT-5.6 Luna inline; the fix is a bounded change at the tool-result planning boundary with no nested agents or review pass.
- Review weight: standard, with the caller-specified no-second-pass boundary after the already-completed feature review.
- Files changed: `src/runtime/hooks/tool-event-input.ts`; `test/pi/hooks/pi-hook-event-adapter.test.ts`.
- Tests added: post-plan mutation and replacement regression coverage; text/image normalization and opaque `textSignature` omission coverage, including frozen planned content and untouched source evidence. Focused: 2 files, 11 tests. Full: 141 files, 744 tests.
- Simplification: no unrelated behavior, API, event mapping, or compatibility paths changed.
- Discrepancies from design: none.
- Adjacent issues parked: none.
