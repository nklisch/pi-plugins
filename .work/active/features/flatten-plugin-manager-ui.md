---
id: flatten-plugin-manager-ui
kind: feature
stage: done
tags: [tui, compatibility, perf]
parent: null
depends_on: []
release_binding: null
created: 2026-07-18
updated: 2026-07-18
---

# Flatten the plugin manager UI

Replace the section/action ladder with a responsive two-layer plugin catalog.

## User contract

- `/plugin` mounts immediately and refreshes in the background.
- The primary list combines installed and discoverable plugins; installed entries sort first.
- The only navigation layers are the catalog and a selected plugin's detail/actions.
- Actions execute without closing and reconstructing the manager surface.
- Sources remain accessible as a secondary list; host health is summarized rather than being a navigation destination.
- `/plugin` starts at the catalog root instead of restoring a nested pane.
- Confirmations are reserved for newly trusted executable surfaces and destructive deletion/removal.
- Skill names contributed through equivalent Claude and Codex declarations appear once, with merged provenance retained by the normalized bundle.

## Design decisions

Keep the facade, exact-evidence mutation contracts, reload handoff, and transactional lifecycle unchanged. Flatten only presentation and confirmation policy. Render stale cached state immediately when available, then publish authoritative reads as they complete.

## Implementation

- `/plugin` mounts before its five independent catalog/status reads settle and renders a loading indicator immediately.
- Installed, discoverable, and update-notice pages are exhausted independently (bounded to five pages each) and merged into one catalog.
- Equivalent candidate rows deduplicate by schema-validated immutable source identity while retaining all available install scopes; installation asks for scope only when needed.
- The navigation model is catalog → detail/actions. Actions run in place, and finished operations return to the catalog without reconstructing the manager component.
- Sources remain one shortcut away; health and update counts are summarized in the catalog heading.
- Routine explicit actions skip a redundant second prompt. Persistent-data deletion, marketplace removal, project-intent synchronization, and executable trust retain confirmation.

## Verification

- `npm run typecheck` passed.
- `npm run boundaries` passed (431 modules / 3,024 dependencies).
- `npm run test:unit` passed (336 files / 1,659 tests before final review fixes; focused final tests: 45 passed).
- `npm run test:package` passed, including compiled imports and packed Pi 0.80.8 RPC/JSON/PTY acceptance.
- Fresh GLM-5.2 review findings were addressed: finished-operation escape, project-sync confirmation, independent merged-catalog pagination, close-time publication guard, filtered action indexing, and schema-owned source identity.

## Mockups

- `.mockups/screens/flatten-plugin-manager-ui/catalog.html`
