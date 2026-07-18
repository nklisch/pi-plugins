---
id: epic-native-plugin-management-inspection-diagnostics-safe-display-redaction
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-contracts-identifiers]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implementation notes

- Added the sole public display sanitizer with scalar and serialized-output bounds. It visibly escapes terminal controls, bidi/invisible formatting, combining marks, and malformed UTF-16 without normalizing identity.
- Added structural source, provenance, hook, MCP, and component projections. Existing MCP compatibility/template analysis remains the authority; incompatible declarations never fall back to raw JSON.
- URLs expose only scheme/host/port/path plus query/fragment-presence flags. Header/environment names remain visible while all values, URL userinfo/query/fragment values, raw declarations, and absolute custody/provenance paths are unrepresentable.
- Verified the parked hostile-native-key case and archived `idea-escape-mcp-status-native-keys` without changing runtime key identity.
- Verification: `npm run typecheck`; focused Vitest display/disclosure suites (14 tests).
