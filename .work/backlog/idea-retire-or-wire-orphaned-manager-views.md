---
id: idea-retire-or-wire-orphaned-manager-views
kind: story
stage: drafting
tags: [tui, refactor]
parent: null
depends_on: []
release_binding: null
created: 2026-07-22
updated: 2026-07-22
---

# Retire or wire the orphaned manager views

Found during `simplify-update-confirmation-and-auto-updates`: the `updates`
and `health` PluginManagerView values are unreachable from the keyboard — the
only view switch is `m` (installed ↔ marketplaces), and update work happens in
the installed view's updates **lens** (filter). `homeLines` in
`src/pi/manager/plugin-manager-render.ts` and the `open-section` /
`return-sections` intents are dead code from the earlier sections design.

Two coherent directions:

- **Retire**: remove the `updates`/`health` views, `homeLines`, and the dead
  section intents; keep the lens model as the single updates surface. The
  `updates`-view branches added in
  `simplify-update-confirmation-and-auto-updates` (footer, heading, actions)
  would go with them.
- **Wire**: add real view navigation (e.g. tab or number keys) so the views
  earn their place, and keep the lens as a filter within Plugins.

Decide with maintainer input; the lens currently covers the user need, so
retiring is the smaller, more honest surface.
