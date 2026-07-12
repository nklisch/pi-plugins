---
id: epic-foreign-plugin-model-domain-contracts-identity-source-contracts
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: [epic-foreign-plugin-model-domain-contracts-package-schema-foundation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Identity and Source Contracts

## Scope

Implement Unit 2 from the parent feature: branded marketplace/plugin identities, canonical plugin-key parse/format, separate declared and resolved marketplace/plugin source schemas, the variant registry, versioned canonical source serialization, and injected SHA-256 hashing. Keep the domain independent of filesystem, Git, npm, process, time, and Node built-ins.

## Files

- `src/domain/identity.ts`
- `src/domain/source.ts`
- `test/domain/identity.test.ts`
- `test/domain/source.test.ts`

Use the exact schemas, brands, function signatures, `source-v1` length-prefixed grammar, URL normalization boundaries, and resolved revision forms in the parent design. Environment-dependent path, ref, semver, symlink, redirect, and realpath resolution is explicitly outside this story.

## Acceptance criteria

- [ ] Valid plugin keys parse/format round-trip and malformed or inconsistent identities fail at construction.
- [ ] Every source variant is represented once in its registry/schema and narrows exhaustively.
- [ ] Declared selectors cannot typecheck as immutable resolved revisions.
- [ ] Golden vectors prove canonical serialization is injective across delimiters, UTF-8, field ordering, optionals, URL normalization, and all source kinds.
- [ ] Source hashes are branded `sha256:<hex>`, use injected hashing, and reject non-32-byte hash output.
- [ ] `npm test` and `npm run build` pass.
