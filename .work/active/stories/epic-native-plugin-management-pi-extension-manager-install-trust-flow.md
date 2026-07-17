---
id: epic-native-plugin-management-pi-extension-manager-install-trust-flow
kind: story
stage: done
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-state-controller, epic-native-plugin-management-pi-extension-manager-split-inspector-tui]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Implement the signed install, configuration, and trust flow

## Design checkpoint

Implement Unit 4 from the parent feature: choose/inspect → configure/trust → activation result, exact one-level executable disclosure, facade-requested configuration/decision input, exact consent, fresh confirmation overlays, and a TUI-only masked secret component.

The Pi input adapter is not policy authority. Sensitive values never use the core editor, `ctx.ui.input`, Pi messages/entries, completion, clipboard helpers, command text, progress, diagnostics, or logs. RPC sensitive input and every JSON/print/no-TTY secret request fail closed.

## Acceptance evidence

- The three signed-off steps and their information hierarchy are preserved for success, cancellation, stale consent, failure, partial, and recovery-required outcomes.
- Input-port spies show exact facade requests/results and no presentation defaults or trust/config validation.
- Secret/paste/history/clipboard canaries never appear in any render/session/message/error/output path; disposal clears references.
- Back/cancel/focus restoration has zero hidden mutation, and stale evidence clears consent before refresh.

## Implementation notes

Implemented the signed choose/inspect → configure/trust → activation-result presentation and exact input custody adapter. Candidate/source/revision and complete component counts lead into required fields plus concise executable risk; exact skill roots, hook commands, MCP processes/tools, requirements, and limitations remain one disclosure deeper. Activation renders the facade owner's succeeded/current/cancelled/stale/conflict/rollback/recovery/failed truth and never promotes progress or cancellation over a stronger committed result.

Sensitive values use a fresh grapheme-aware masked `Component & Focusable`; plaintext has no getter and never reaches Pi input/editor/history/message/entry/completion/clipboard/render/error paths. RPC secrets fail closed, JSON/print never prompt, explicit file/stdin/environment channels are not reinterpreted, and non-sensitive/consent results retain exact facade keys and consent IDs. Tests cover all three signed steps, stale consent, result variants, masked editing/paste/cancel/disposal, secret canaries, exact input values, mode fallbacks, and forbidden Pi editor routes. Full repository verification passed before this checkpoint advanced directly to done.
