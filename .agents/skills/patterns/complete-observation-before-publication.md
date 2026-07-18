# Complete observation before publication

Multi-part runtime state becomes authoritative only after every participant independently observes the exact expected projection.

## Rationale

“Reload accepted” is not activation proof. Composed evidence prevents one successful participant, stale local state, or a missing observation from becoming complete runtime truth.

## Examples

- `src/runtime/skill-hook/lifecycle-participant.ts:150-185` requires exact scope, plugin, revision, projection, project context, trust, and component evidence.
- `src/runtime/mcp/lifecycle-participant.ts:326-338,567-614` checks complete source identity, registration digest, server/component/native keys, and provenance.
- `src/application/ports/lifecycle-reload.ts:227-252` rejects projection mismatch, participant disagreement, unusable project evidence, and incomplete active evidence.
- `src/composition/complete-plugin-reload.ts:66-80,121-128` gathers skill/hook and MCP observations before publishing a candidate selection.
- `src/application/lifecycle-transition-reconciler.ts:162-204,244-276` requires exact composed observation before settlement and marks mismatches for recovery.

## When to use

Use when activation, reload, inspection, or recovery spans independently managed runtime participants.

## When not to use

Do not add a multi-part composer for a simple single-owner value with an atomic authoritative read.

## Common violations

- Treating accepted commands as proof.
- Publishing partial participant evidence.
- Guessing missing observations.
- Settling durable state before exact observation.
