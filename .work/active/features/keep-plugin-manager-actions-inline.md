---
id: keep-plugin-manager-actions-inline
kind: feature
stage: done
tags: [tui, perf]
parent: null
depends_on: []
release_binding: 0.1.5
created: 2026-07-18
updated: 2026-07-18
---

# Keep plugin manager actions inline

Make the plugin catalog one stable surface containing both installed and available plugins: navigation changes selection, actions update the selected row in place, and exact detail is fetched at most once per unchanged authority during a manager session. “Marketplaces” is the only user-facing name for catalog sources.

## Problem evidence

- `PluginManagerComponent` sends `action: install` directly from the candidate detail.
- When exact detail is absent, `PluginManagerController` replaces that intent with `open-detail`, loads detail, and returns. The original Add intent is discarded, so the first Add appears to do nothing.
- Every subsequent `open-detail` calls `inspection.show` again. The controller retains only the currently displayed detail and has no row-keyed detail cache, so returning to and reopening unchanged candidates repeats remote catalog/materialization work.
- `runInstallFlow` mounts a second custom component. This breaks the catalog's stated inline-operation model and makes Add feel like navigation rather than a state transition.
- The installed catalog filter is a three-state control but is exposed as the mnemonic `F`; left/right is a more visible and spatially natural binding while up/down remains row navigation.

## Proposed interaction contract

- Plugins is the only catalog surface. It contains installed, updateable, and available rows; there is no separate Discover view.
- Status is derived after reconciling installed and marketplace evidence. Match exact plugin/scope first, then immutable revision evidence, and use cached detail source identity when host-specific plugin keys differ. An installed plugin must not also appear as a separate `available` row.
- Up/down changes the selected plugin.
- Left/right changes the catalog lens: All, Installed, Available, Updates.
- Enter opens or closes the selected row's optional details without refetching unchanged exact detail.
- A from the top-level Plugins list directly adds the selected available plugin without first opening details. If trust or configuration requires attention, only that inline prompt expands beneath the row.
- U updates the selected installed plugin when an update is available; Ctrl+U updates all eligible plugins from the top-level list.
- The Add or Update intent is preserved while missing exact detail is loaded, then continues automatically.
- Install review, configuration, progress, and result occupy an inline state region under the selected plugin. The catalog does not unmount.
- Successful installation updates the selected row to `installed · enabled` and updates counts locally from the mutation result, then schedules one authoritative background reconciliation.
- Exact detail is cached by authority-bearing row identity. Navigation and focus changes reuse it. Explicit refresh, stale/conflict responses, marketplace refresh, or successful mutation invalidate affected entries.
- Failed detail and install states show the facade diagnostic and one clear retry action instead of the generic unavailable copy.
- Use `Marketplaces` consistently in headings, actions, shortcuts, commands, and help; do not expose `Sources` as a parallel product concept.

## Mockups

- `.mockups/screens/keep-plugin-manager-actions-inline/catalog.html`

## Implementation notes

- The Plugins view now owns the combined installed and marketplace catalog; the separate Discover navigation path was removed.
- Installed rows render as installed, while marketplace candidates remain available and update notices decorate installed rows.
- A bounded controller-owned FIFO detail cache keys entries by authority-bearing row identity. Explicit refresh, stale/conflict envelopes, mutations, and close invalidate applicable entries.
- Direct Add preserves its intent while detail loads, surfaces exact read failures, and continues into an inline multi-scope/trust flow without replacing the manager component.
- Left/Right cycles All, Installed, Available, and Updates. `A`, `U`, `Ctrl+U`, and `M` provide direct add, selected update, explicit update-all, and Marketplaces actions.
- Explicit Update All bypasses automatic-policy gating only; project trust, source stability, configuration, capability, recovery, and activation-context checks remain mandatory.

## Verification

- `npm test` — typecheck, dependency boundaries, 336 unit files / 1,669 tests, build/import checks, and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance passed.
- Complementary GLM-5.2 review findings were fixed: visible Add failure, portable Ctrl+U matching, inline multi-scope choice, unified cache invalidation, and dead Discover model state.
- Focused adversarial GLM-5.2 review found no release blocker; its stale/conflict cache finding and stale-focus update hardening were fixed.
- `git diff --check --no-ext-diff` passed.

## Release instruction

Release gates are skipped by explicit maintainer instruction. Standard package verification remains required.
