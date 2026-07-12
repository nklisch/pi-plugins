---
id: epic-foreign-plugin-model-domain-contracts-package-schema-foundation
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Package and Schema Foundation

## Scope

Implement Unit 1 from the parent feature: the Node.js 24, TypeScript 7, ESM package; Zod 4 schema helpers; Vitest configuration; and executable domain dependency boundaries. This story establishes the build and validation substrate used by every later contract story. Do not implement foreign readers or adapters.

## Files

- `package.json`
- lockfile selected by the repository's package manager
- `tsconfig.json`
- `vitest.config.ts`
- `.dependency-cruiser.cjs`
- `src/domain/schema.ts`
- `test/domain/schema.test.ts`

Follow the exact scripts, compiler constraints, `JsonValueSchema`, `schemaValues`, and `nonEmptyReadonly` signatures in the parent design. Domain modules may depend on Zod and other domain modules only; imports from `node:*` and outer layers must fail `npm run boundaries`.

## Acceptance criteria

- [x] `npm test` runs typecheck, dependency boundaries, and Vitest successfully under Node.js 24.
- [x] `npm run build` emits importable ESM JavaScript and declarations under `dist/`.
- [x] Public data contracts demonstrate schema-to-`z.infer` type ownership rather than mirrored interfaces.
- [x] Dependency-cruiser catches domain imports from `node:*`, application, formats, infrastructure, runtime, and Pi modules, and catches cycles.
- [x] Empty schema registries and invalid JSON values fail deterministically.

## Implementation notes

- Added the Node.js 24 / ESM package foundation with the prescribed TypeScript 7 strict compiler settings, declaration/source-map output, Zod 4 runtime dependency, and Vitest typechecking through the no-emit `tsconfig.test.json` project.
- Implemented the recursive `JsonValueSchema` with finite-number validation, plus `schemaValues` and `nonEmptyReadonly` tuple helpers that fail immediately on empty input. Tests cover nested valid JSON, invalid JSON-shaped values, inferred type agreement, registry order, and both empty-input failures.
- Dependency-cruiser 17.4.3 currently advertises TypeScript support only below 7.0. The package therefore includes `@swc/core` and selects its parser so the mandated TypeScript 7 sources are actually cruised rather than silently skipped. The boundary policy rejects domain imports of core Node modules, all outer layers, undeclared/unknown packages, and cycles. Temporary fixture probes verified Node/infrastructure, undeclared-package, and cycle violations fail the boundary command.
- `.gitignore` now excludes package-manager/build output; `tsconfig.test.json` is the narrowly scoped no-emit test configuration needed to keep emitted production output under `dist/`.
- The public root barrel remains intentionally deferred to Unit 4, as prescribed by the parent feature; this unit exposes and verifies the domain schema foundation only.

## Verification

- `node --version` — `v24.17.0`.
- `npm test` — passed: TypeScript typecheck, dependency boundaries, 11 Vitest tests, and Vitest typecheck.
- `npm run build` — passed: emitted `dist/src/domain/schema.js`, source map, and declaration.
- Compiled ESM import probe — passed through `dist/src/domain/schema.js`.

## Review (2026-07-11)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Implementation verification was recorded and independently confirmed with `npm test` (11 tests, typecheck, and dependency boundaries) and `npm run build`. Verdict: Approve - story verified by implement; fast-lane advance.
