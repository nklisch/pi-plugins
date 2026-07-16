---
id: epic-skills-hook-runtime-subagent-interception
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-guarded-command-hooks]
release_binding: null
gate_origin: null
research_refs: []
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

- Keep one narrow subagent lifecycle port and one hook executor; avoid cloning the subagent runtime, command process machinery, or event/output aggregation inside the integration.

## Foundation references

- `docs/SPEC.md` — Supported events; Component compatibility verdicts
- `docs/ARCHITECTURE.md` — Subagent adapter; Runtime activation
- `docs/COMPATIBILITY.md` — Hook events; Hook input; Hook output

## UI alignment

No presentation surface. Subagent capability diagnostics are consumed by native compatibility/management presentation in `epic-native-plugin-management`.

<!-- The feature design pass will fill in interfaces, signatures, and implementation units. -->
