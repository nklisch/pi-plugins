---
id: gate-cruft-remove-false-typecheck-sentinel
kind: story
stage: done
tags: [cleanup, testing]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-18
---

# Remove the false test-typecheck participation sentinel

## Confidence
High

Delete `test/typecheck-participation.test.ts`, which checks only tsconfig JSON while `tsconfig.test.json` is not executed and currently fails independently. Stop claiming test TypeScript participation; retain the config only as non-authoritative groundwork unless a future real command repairs and owns it.

## Implementation

Deleted only `test/typecheck-participation.test.ts`. Left `tsconfig.test.json`, package scripts, and every meaningful runtime test unchanged. This removes the misleading runtime assertion about configuration text without repairing or claiming test-program participation.

## Verification

- Full Vitest run: 332 files / 1,649 meaningful tests passed after deleting the single sentinel test.
- Typecheck, boundaries, build, compiled imports, isolated packed consumer, infrastructure E2E, and production E2E all passed.
- `tsconfig.test.json` was not invoked and no claim is made that it currently succeeds or participates in `npm test`.

## Bounded inline review

Reviewed the deleted file and confirmed its only runtime assertion inspected JSON configuration text; its compile-only `@ts-expect-error` was not enforced by the executed TypeScript command. No other test or test configuration changed. No material finding remained.
