---
id: epic-foreign-plugin-model-domain-contracts-package-schema-foundation
kind: story
stage: implementing
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

- [ ] `npm test` runs typecheck, dependency boundaries, and Vitest successfully under Node.js 24.
- [ ] `npm run build` emits importable ESM JavaScript and declarations under `dist/`.
- [ ] Public data contracts demonstrate schema-to-`z.infer` type ownership rather than mirrored interfaces.
- [ ] Dependency-cruiser catches domain imports from `node:*`, application, formats, infrastructure, runtime, and Pi modules, and catches cycles.
- [ ] Empty schema registries and invalid JSON values fail deterministically.
