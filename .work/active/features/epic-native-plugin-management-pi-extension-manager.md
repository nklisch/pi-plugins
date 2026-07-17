---
id: epic-native-plugin-management-pi-extension-manager
kind: feature
stage: drafting
tags: [compatibility, tui]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-deterministic-control-facade]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Pi Extension Composition and Native Plugin Manager

## Brief

Package the host as a Pi extension and register one `/plugin` command. Arguments dispatch directly to the deterministic control facade; no arguments open the native terminal manager in TUI mode. The manager implements the selected split-inspector installed overview, adjacent marketplace browsing, expandable compatibility/health details, update state/settings, lifecycle actions, and the signed-off three-step install journey.

The presentation layer is thin: it holds navigation, focus, temporary form state, confirmation, and rendering only. It invokes the same facade requests as subcommands and displays their exact progress and results without reproducing lifecycle, compatibility, trust, or update policy.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Depends on the complete deterministic facade and packaged host factory.
- Owns the Pi extension entry, `package.json` extension discovery metadata, `pi.registerCommand("plugin", ...)`, argument completions, host session lifetime, native components, keyboard behavior, and Pi-mode adaptation.
- Does not own application decisions, a private UI state database, a custom palette/font, or production MCP/subagent package implementations.

## Pi integration boundaries

- `ctx.mode === "tui"` gates `ctx.ui.custom()` and terminal component creation. RPC may use supported dialogs/notifications only; JSON/print/non-UI invocation never prompts and returns deterministic guidance/results.
- All colors and emphasis use Pi's active semantic `theme`; key hints use injected keybindings. Layout degrades safely for narrow terminals and cancellation always returns control to Pi.
- The manager opens on installed plugins, keeps list context while details change, exposes marketplace as an adjacent view, and does not hide unsupported/incompatible components.
- Installation follows choose/inspect → configure/trust → activation result. Exact executable details remain expandable one level beneath the concise trust summary.
- Newly discovered update revisions use one calm `ctx.ui.notify`; unresolved count remains visible in the manager until resolved.
- Extension reload/shutdown closes owned resources, cancels background work, and does not leave partial prompts, overlays, process handles, or database connections.

## Mockups

- Manager authority: `.mockups/screens/epic-native-plugin-management-manager/option-1.html` (selected split inspector).
- Install-flow authority: `.mockups/flows/plugin-install/index.html` and its three signed-off step pages.
- Design-system reference: `.mockups/design-system/`; production uses Pi semantic theme and terminal typography rather than copying static colors or fonts.

Feature design may translate browser-only controls to the closest Pi TUI components, but must preserve information hierarchy, topology, focus continuity, and the signed-off interaction decisions.
