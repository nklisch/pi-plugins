---
id: epic-native-plugin-management-pi-extension-manager-split-inspector-tui
kind: story
stage: implementing
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-state-controller]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Render the responsive split inspector

## Design checkpoint

Implement Unit 3 from the parent feature. Translate the selected split-inspector mock into one Pi `Component & Focusable` using callback theme tokens, injected `KeybindingsManager`, semantic focus keys, independent list/detail scrolling, IME-correct query focus, help, adjacent views, details/actions, and responsive wide/medium/narrow layouts.

All meaning must survive reduced color. All actions must be reachable through Tab/Shift+Tab and Enter; raw mnemonic keys are accelerators only. Every line must remain within `render(width)`, and untrusted fields must pass the terminal-text projector before theme styling.

## Acceptance evidence

- Golden renders cover wide split, medium/narrow single pane, reduced color, resize, theme invalidation, long/wide Unicode, and all signed-off manager information groups.
- Configured select/cancel/page keys and focus restoration work; query propagates `Focusable` for IME.
- Adversarial ANSI/OSC/C0/C1/bidi input cannot alter terminal output; only Pi theme escapes survive.
- Fresh component lifecycle and idempotent disposal leave no stale focus/callback/cache.
