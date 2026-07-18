---
id: epic-native-plugin-management-pi-extension-manager-command-bridge
kind: story
stage: done
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Register `/plugin` and bridge Pi modes to the control facade

## Design checkpoint

Implement Unit 1 from the parent feature: package peer metadata, default extension composition, exactly one `pi.registerCommand("plugin", ...)`, facade-derived completions, byte-preserving argument-text dispatch, command-collision disclosure, and mode-safe TUI/RPC/JSON/print result channels.

The adapter must invoke only `host.runWithPiOperationContext(... application.control ...)`. Empty arguments open the manager only in TUI; non-TUI returns the facade presentation/help envelope without prompting. Pi 0.80.8 command handlers cannot set process exit status, so preserve the stable facade exit in the envelope and do not invent a second exit contract.

## Acceptance evidence

- Package discovery still points to compiled `dist/pi/extension.js`; Pi/TUI 0.80.8 are exact development and `*` peer contracts.
- Raw command text reaches `control.runText` unchanged; no Pi lexer/shell/argv builder exists.
- Collision tests retain Pi suffix behavior and report the extension's actual invocation.
- RPC/JSON framing has no raw stdout; print output is bounded, terminal-safe, and facade-derived.
- Static completion has no startup/service effect; dynamic completion uses safe cached rows only.

## Implementation notes

Implemented the raw-text `/plugin` adapter and mode-safe control channel. The adapter delegates parsing, completion, execution, input, progress, diagnostics, and envelopes to `application.control`; it never tokenizes or rebuilds Pi's argument string. Empty TUI input opens the manager while RPC/JSON/print remain on the facade fallback. Structured modes emit Pi custom entries, print emits bounded non-ANSI facade fields, collisions report Pi's assigned suffix, and reload-causing subcommands publish only their safe final envelope to the process-local successor handoff.

Pi and Pi TUI are pinned to exact 0.80.8 development contracts with `*` runtime peers. Focused command tests cover byte preservation, all mode branches, completion, collisions, bounded print, structured framing, and predecessor-safe reload succession. Full repository verification passed before this checkpoint advanced directly to done.
