---
id: epic-native-plugin-management-deterministic-control-facade-lexer-parser-metadata
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-contracts-registry]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Implement Deterministic Lexer, Parser, Help, and Completion

## Checkpoint

Implement direct argv parsing and the small Pi argument-string lexer over the canonical registry. Generate help and pure completion metadata from the same definitions, including aliases and future deprecation metadata.

## Files

- `src/application/native-control-lexer.ts`
- `src/application/native-control-parser.ts`
- `src/application/native-control-help.ts`
- focused lexer, parser, help, and completion tests

## Acceptance evidence

- Equivalent argv and quoted text produce byte-equivalent commands with no shell/environment/glob/tilde/response-file expansion.
- Unknown/duplicate/conflicting options, misplaced values, extra/missing positionals, partial quotes, controls, bidi, lone surrogates, lookalikes, NUL, and oversize inputs fail before any side effect.
- Unknown syntax never fuzzy-executes; bounded suggestions are help only. Deprecated syntax canonicalizes only when registry metadata authorizes it and emits a stable warning.
- Help and completion are offline, deterministic, registry-derived, and exclude paths, sources, consent/session tokens, input-channel data, and secrets.

## Implementation notes

- Added a non-shell lexer with exact ASCII separators, deliberately bounded quoting/escaping, completion-safe partial tokens, and hostile scalar rejection.
- Added exact argv/global/local option parsing, canonical alias resolution, strict arity/conflict/confirmation checks, and schema validation before any side-effect boundary.
- Derived help and static completion metadata from the command registry; only caller-supplied safe identity candidates can extend completion.
- Policy and current-project selectors remain facade-level values so the dispatcher—not the parser—binds the packaged project authority.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/native-control-lexer.test.ts test/application/native-control-parser.test.ts test/application/native-control-help.test.ts`
