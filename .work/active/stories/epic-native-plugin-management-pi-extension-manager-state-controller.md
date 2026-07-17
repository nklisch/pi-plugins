---
id: epic-native-plugin-management-pi-extension-manager-state-controller
kind: story
stage: implementing
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-command-bridge]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Build the ephemeral manager model and facade-only controller

## Design checkpoint

Implement Unit 2 from the parent feature. Add the pure reducer/model for installed, updates, browse, and marketplaces; one controller for canonical control commands; exact hidden row IDs; safe cached dynamic completions; search; bounded forward pagination; detail loading; latest-intent-wins read cancellation; and deterministic focus restoration.

No manager data is persisted. No row text/index becomes mutation authority. Every read/action is expressed through the finalized control grammar/results and any stale/conflict result requires explicit refresh and renewed intent.

## Acceptance evidence

- Reducer tests have no Pi/Node/control-service effects and cover all state transitions.
- Facade spies prove each view/search/page/detail request uses canonical control commands only.
- Late async completion, aborted reads, same plugin across scopes, disappeared selection, stale cursor/snapshot, and external changes cannot overwrite current state or select by label.
- Offline/degraded/blocked/empty states remain visible and exact; closing clears temporary state and controllers.
