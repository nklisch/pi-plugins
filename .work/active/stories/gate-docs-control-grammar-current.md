---
id: gate-docs-control-grammar-current
kind: story
stage: done
tags: [documentation]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: docs
created: 2026-07-18
updated: 2026-07-18
---

# Align SPEC with plugin-control/v1 grammar

Replace the stale hand-maintained canonical forms with exact registry-derived global invocation and command metadata: positionals, required/optional/repeatable options, enums, aliases, conflicts, input channels, output mode, timeout, non-interactive mode, grammar version, pagination/detail targeting, confirmation, notices, and automatic-run controls.

## Implementation notes
- Execution capability: inline prose plus one documentation contract test; the registry, parser, and SPEC form one cohesive control boundary.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `docs/SPEC.md`, `test/documentation/native-control-spec.test.ts`.
- Tests added/removed: added a registry-to-SPEC drift check for all 32 commands and seven aliases, plus parser execution of documented valid/invalid examples.
- Simplification: replaced the stale partial canonical-form list in place; no generated grammar file or duplicate source of truth was introduced.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked global controls against `native-control-parser.ts`, invocation limits against `NativeControlInvocationSchema`, and every command path, positional, option kind/requiredness/repeatability, enum, alias, safety, and input class against `NativeControlCommandRegistry`.
- Cross-checked exact-pair, retention conflict, confirmation, policy target, pagination, notice, and automatic-run constraints against request schemas and parser normalization.
- The documentation contract test mechanically renders the registry table and alias table, then parses every documented example and checks exact invalid diagnostics.
- Targeted registry/parser/documentation tests, 32-command/seven-alias exact checks, and `git diff --check` passed.
- Bounded inline review confirmed every registry command appears once, every alias is represented, globals precede commands, and no generated source-of-truth was added.
