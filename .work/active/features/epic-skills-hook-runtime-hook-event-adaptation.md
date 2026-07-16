---
id: epic-skills-hook-runtime-hook-event-adaptation
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-projection-reload-evidence]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Faithful Hook Event Adaptation

## Brief

Translate Pi's current extension lifecycle into the supported Claude and Codex command-hook event contract. The capability selects normalized hooks from the verified runtime snapshot; maps session start/end, prompt, tool success/failure, compaction, and settled-agent boundaries; derives documented session sources and compaction triggers; and builds event-specific compatible inputs without fabricating unavailable fields. Pi-only evidence may appear only under a namespaced field.

Preserve foreign matcher intent through one deterministic tool-name alias registry, exact/regular-expression matching, and the supported tool-event `if` grammar. Normalize and validate event, matcher, input, transcript/session, and cancellation evidence before execution, while leaving command spawning and output decisions to the dependent guarded-command feature. Unsupported events or conditions remain compatibility failures established before activation, not runtime approximations.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: hook semantic foundation — guarded command execution consumes its selected event plans and input payloads
- Pi lifecycle seam: uses public extension events and preserves their ordering, mutation, and cancellation limits

## Simplification opportunity

- Derive event routing, aliases, input builders, and condition handling from one registry rather than duplicating Claude/Codex/Pi switch tables across handlers.

## Foundation references

- `docs/SPEC.md` — Hooks; Supported events; Hook execution
- `docs/ARCHITECTURE.md` — Hook adapter; Pi integration
- `docs/COMPATIBILITY.md` — Hook events; Hook matcher mapping; Hook input; Session-source mapping

## UI alignment

No presentation surface. Hook status text may use Pi-native notifications later through management/runtime composition, but this feature creates no screen or mockup.

<!-- The feature design pass will fill in interfaces, signatures, and implementation units. -->
