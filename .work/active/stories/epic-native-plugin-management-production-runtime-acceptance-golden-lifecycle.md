---
id: epic-native-plugin-management-production-runtime-acceptance-golden-lifecycle
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-production-runtime-acceptance
depends_on: [epic-native-plugin-management-production-runtime-acceptance-full-bundle-harness]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Prove the golden production bundle lifecycle

## Checkpoint

Implement Unit 3 from the parent feature in `test/e2e/production/golden-full-bundle.e2e.test.ts`. Drive the real packed candidate and complete V1/V2 fixture through install, observe, disable, enable, update, and uninstall. Every state must be one whole bundle, not independent component success.

## Journeys

1. Add the real Git marketplace, browse/show V1, run signed open → configure/trust → activation-result installation, and require a succeeded fresh complete-bundle observation.
2. In a new Pi process, prove V1 skill discovery, ordinary hook marker, exact subagent pre-start context, one pre-stop same-session continuation, MCP source list/call with late values, source/provenance, and explicit alias omission.
3. Disable and prove skill, ordinary/subagent hook catalog, exact MCP source/process, and runtime behavior all disappear. Enable and prove all return at V1.
4. Commit/push/refresh V2 and update once. Prove skill text, ordinary hook marker, subagent injection/continuation result, MCP identity/late values, and installed detail are all V2 with no active V1 mixture.
5. Uninstall with delete-data, restart, and prove installed state, skill, hook/data, subagent behavior, MCP source/tool/process/provider/lease, and active projection are absent while marketplace authority remains.

## Acceptance evidence

- [ ] Progress, callback acceptance, reload return, journal state, or fixture calls never substitute for a fresh public complete-bundle observation.
- [ ] The first child model call sees the injected revision marker and the first proposed result never finalizes; the second result completes in the same child session/run after Stop feedback.
- [ ] MCP process starts only at explicit call, receives exact late selected root/data/configuration values, and disposes/releases them on close.
- [ ] Canonical source-qualified access works while unsupported Claude aliases are explicitly omitted, not fabricated.
- [ ] Disable/update/uninstall transition all skill/hook/subagent/MCP contributions together.
- [ ] No Claude/Codex state, maintained-package identity, native cause, or secret appears in user-visible evidence.

## Ordering and risk

Depends only on the production harness. It may implement in the same feature-owner stride as failure coverage, but shared fixture/harness edits must stay serialized. The main risk is a mixed V1/V2 observation passing through separate assertions; use one revision-bound observation helper and fail on any component disagreement.

## Implementation notes

- Added a real V1 lifecycle journey through signed install input/consent, fresh-process skill and ordinary-hook observation, source-qualified MCP status/list/call with late root/data/channel values, and exact real subagent start injection plus same-session Stop continuation.
- Disable and enable now prove the whole bundle absent/restored through user-visible tools and plugin-owned evidence. V2 publication changes skill, hooks, subagent markers, MCP identity, and immutable revision, and the shared observation rejects mixed markers.
- Uninstall with delete-data is followed by a fresh process proving installed state and all four contribution surfaces absent while marketplace registration remains.
- Canonical MCP access remains usable while status exposes `RUNTIME_ALIAS_UNAVAILABLE`; no foreign alias is fabricated.
- Verified `golden-full-bundle.e2e.test.ts` green against packed/public Pi 0.80.8 and both receipt-qualified production adapters.
