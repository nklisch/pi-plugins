---
id: epic-native-plugin-management-inspection-diagnostics-safe-display-redaction
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-contracts-identifiers]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Make inspection disclosure terminal-safe and redacted

## Checkpoint

Implement the one public display projection for plugin-authored text, paths, commands, URLs, component details, and provenance. Preserve machine identity separately while escaping terminal controls and omitting values/custody paths/native causes. Consume the parked native MCP-key finding after its regression passes.

## Files

- `src/application/native-inspection-display.ts`
- `src/application/native-inspection-disclosure.ts`
- `test/application/native-inspection-display.test.ts`
- `test/application/native-inspection-disclosure.test.ts`
- `.work/backlog/idea-escape-mcp-status-native-keys.md` (archive only after verified closure)

## Acceptance evidence

- ANSI/OSC/CSI, C0/C1/DEL, CR/LF/tab, bidi controls, BOM, line separators, surrogates, and overlong fields are visibly escaped/bounded.
- Hook argv remains structured and unexpanded; MCP URL query/header/bearer/environment values are absent.
- Secret/configuration values and locators, project/custody paths, native messages/causes, stdout/stderr, and raw declarations fail canary searches.
- Hostile MCP native keys cannot alter terminal layout and retain exact upstream identity semantics.
