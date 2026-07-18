---
id: simplify-plugin-manager-ui-footprint
kind: story
stage: done
tags: [tui, compatibility]
parent: simplify-plugin-manager-experience
depends_on: []
release_binding: 0.1.3
created: 2026-07-19
updated: 2026-07-19
---

# Simplify the plugin manager UI footprint

Replace the full-screen, pane-heavy marketplace manager with the same progressive list footprint used by Pi settings and stable plugin selectors.

## User contract

- `/plugin` opens a short section list: My Plugins, Discover, Sources, Updates, and Health.
- Enter drills into one section, then into one item, then its available actions.
- Escape always returns exactly one level before closing.
- Search, refresh, and direct add shortcuts remain available where relevant.
- The layout is a single responsive column at every terminal width; no tab focus, split-pane focus, disclosure focus, or independent pane scrolling is exposed.
- Authoritative facade reads, exact detail evidence, confirmations, install flow, and mutation handoff behavior remain unchanged.

## Design decision

Reuse the interaction footprint of Pi's `/settings` and `SelectList`: one selected row, one description area, concise key hints, and progressive submenus. Keep the existing facade-backed controller but collapse presentation navigation to four levels (sections, items, detail, actions). This avoids coupling terminal width to interaction topology and removes most focus-state combinations.

## Implementation

- Replaced width-dependent tabs and split panes with a single vertical section menu and progressive item, detail, and action screens.
- Removed tab traversal, disclosure focus, and manager disclosure state; exact trust disclosure remains in the dedicated install and confirmation surfaces.
- Kept facade reads, latest-intent-wins cancellation, exact detail parsing, action confirmation, install handoff, and operation ownership unchanged.
- Updated packed and production PTY journeys to use the new keyboard path.

## Verification

- `npm test` passed typecheck, boundaries, 336 unit files / 1,667 tests, and build/import checks; its first packed PTY run exposed an expected stale title token, which was updated.
- `npm run test:package` passed, including isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance.
- Relevant manager tests: 68 passed, including page navigation, the complete Escape ladder, action filtering, and very short terminals.
- Golden manager/install E2E passed. The broader production file's unrelated multiprocess update-contention case remained red because neither contender reported the expected success; the presentation tests in that file passed.
- Fresh cross-model review found one PageDown regression; list and action paging now moves selection by a page, dead scroll state was removed, short-terminal coverage was added, and the remaining navigation findings were addressed.

## Mockups

- `.mockups/screens/simplify-plugin-manager-ui-footprint/manager.html`
