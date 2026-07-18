---
id: release-0.1.3
kind: release
stage: review
tags: [tui, compatibility]
parent: null
depends_on: [simplify-plugin-manager-ui-footprint]
release_binding: 0.1.3
created: 2026-07-19
updated: 2026-07-19
---

# 0.1.3

Patch release for the simplified, settings-style plugin manager UI.

## Included work

- `simplify-plugin-manager-ui-footprint` — replaces width-dependent tabs and split panes with progressive section, item, detail, and action lists; makes Escape return one level; and fixes visible page navigation.

## Verification

- Local `npm test`: typecheck, dependency boundaries, 336 files / 1,670 tests, build/import checks, and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance passed.
- Golden manager and install E2E: 3/3 passed.
- Fresh cross-model review completed; its PageDown finding and smaller navigation findings were fixed and covered.
- Dry-run package integrity: `sha512-lKy2JGiPAvCbwpAjItqCcg/2wxVRHJVdfjDcbc8M+tYKp9VZBh935qtds09yw69pFFamzjCiYZL+VPlZnBq50w==`.
- Publication pending.
