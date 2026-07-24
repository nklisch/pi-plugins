---
id: retire-orphaned-manager-views
kind: story
stage: done
tags: [tui, refactor]
parent: null
depends_on: []
release_binding: null
created: 2026-07-22
updated: 2026-07-22
---

# Retire the orphaned manager views

Maintainer direction: remove the `updates` and `health` manager views and
consolidate on the two reachable views, Plugins (installed) and Marketplaces.
Implements the "retire" direction of backlog
`idea-retire-or-wire-orphaned-manager-views`.

## Scope

- `PluginManagerView` narrows to `"installed" | "marketplaces"`.
- The updates **lens** (installed-view filter) remains the updates surface:
  update-all (`ctrl+u`), Auto updates… (`p`), and the policy heading stay.
- Remove the dead `homeLines`/`VIEWS` sections renderer and the updates/health
  branches in model actions, component keys, render footer/headings, and
  controller page loading.
- The health **indicator** in the Plugins heading (`host ready/degraded`)
  stays, sourced from `status` directly; host diagnostics remain available as
  the `/plugin doctor` command.
- Notice rows still feed `hasUpdate` flags in the catalog merge; they are no
  longer displayable rows (the updates view was their only surface).

## Verification

- `npm run typecheck`, `npm run boundaries` — clean.
- Unit: 1705 tests pass. The new health-indicator assertion exposed a stale
  `healthStatus()` fixture (`runtime: "ready"` was never schema-valid);
  fixed to `reconciled`.
- `npm run build` + compiled/packed Pi 0.80.8 RPC/JSON/PTY acceptance — pass.
- The committed manager mockup already documents the consolidated lens
  model; no mockup change needed.

## Implementation notes

- Also removed the dead no-op `open-section`/`return-sections`/
  `open-actions`/`return-detail` intents from the sections design.
- `diagnose-host` stays in the action runner for the `/plugin doctor`
  command path; it is no longer a manager menu entry.
- Backlog `idea-retire-or-wire-orphaned-manager-views` is satisfied by this
  item and was removed.
