---
id: epic-skills-hook-runtime-subagent-interception
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-guarded-command-hooks]
release_binding: null
gate_origin: null
research_refs: [docs/research/pi-subagents-lifecycle-interception.md]
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

## Research finding and production blocker

Research: [`docs/research/pi-subagents-lifecycle-interception.md`](../../../docs/research/pi-subagents-lifecycle-interception.md)

`@gotgenes/pi-subagents@18.0.3` (tag `pi-subagents-v18.0.3`, commit `c76a294a777a990950da23fc06cb0caf51da7ac6`) has no supported pre-start or pre-completion interceptor. Its public `SubagentsService` exposes spawn/read/control plus one workspace provider; public and internal child events are observational `void` emissions. No event carries the exact first prompt or proposed final result with complete immutable child/parent identity and cancellation, and no event return can replace/deny the prompt or request same-session continuation before finalization. Foreground and resume completion coverage also differs from background initial runs.

**Blocked production surface:** the production adapter and an available `pi.subagents.lifecycle-interception` capability require either:

1. a published upstream release with ordered typed async interceptors for exact prompt replacement/abort and bounded pre-completion continuation; or
2. a narrowly maintained MIT fork exposing the identical port.

The package must pass the research document's objective conformance gate across tool/service, foreground/background/queued, initial/resume, cancellation, identity, event ordering, continuation bounds, and disposal. An issue, PR, commit-only patch, method-presence probe, event observer, deep import, monkeypatch, or local package patch does not qualify.

**Portable work that may proceed while blocked:** define the Plugin Host port and capability schema, map normalized hook decisions, implement deterministic local hook aggregation, add package-independent fakes/probes/conformance fixtures, and fail closed only for plugins declaring subagent hooks. Do not claim production `SubagentStart`/`SubagentStop` support until a real package passes conformance.

## UI alignment

No presentation surface. Subagent capability diagnostics are consumed by native compatibility/management presentation in `epic-native-plugin-management`.

<!-- The feature design pass will fill in interfaces, signatures, and implementation units. -->
