---
id: flag-pi-extension-plugins
kind: story
stage: done
tags: [tui, compatibility]
parent: null
depends_on: []
release_binding: 0.1.14
gate_origin: null
created: 2026-07-22
updated: 2026-07-21
---

# Flag plugins that ship Pi extensions instead of silently dropping them

User-reported: zai-research installed "successfully" and reloaded, but its
five tools never registered — the plugin's entire value is a `pi.extensions`
TypeScript module, and the host's component vocabulary (skill / hook /
mcp-server / foreign) has no extension kind, so the extension silently
vanished. Deliberately so: the host never imports plugin code in-process
(verify-before-import-runtime-participants). The failure was silence, not
the boundary.

## Changes

- Inspection reads the plugin-root `package.json` and projects a non-empty
  `pi.extensions` block as a foreign metadata-only component
  (`pi-extension`), visible in review disclosure. Malformed or extensionless
  package.json is not a failure.
- New compatibility rule `foreign.pi-extension` (metadata-only, never
  executed, non-blocking) with a plain message: "This plugin ships a Pi
  extension (tools/commands). This host doesn't run plugin extensions, so
  those won't register — install the plugin pi-natively to use them."
- Successful add of such a plugin ends with an explicit heads-up
  notification naming the plugin and the pi-native install path.

Companion skills-repo change (nklisch/skills): zai-research removed from the
Claude/Codex marketplace (pi-native installs only), and the agile-workflow
Pi extension was deleted outright — hooks.json is the single hook surface
for every host.

## Verification

- Typecheck, boundaries clean; 1699 unit tests green (new inspection
  projection tests + `foreign.pi-extension` registry fixture); packed
  real-Pi acceptance green.
