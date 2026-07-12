---
id: epic-foreign-plugin-model-domain-contracts-identity-source-contracts
kind: story
stage: review
tags: [compatibility, infra]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: [epic-foreign-plugin-model-domain-contracts-package-schema-foundation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-12
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

- [x] Valid plugin keys parse/format round-trip and malformed or inconsistent identities fail at construction.
- [x] Every source variant is represented once in its registry/schema and narrows exhaustively.
- [x] Declared selectors cannot typecheck as immutable resolved revisions.
- [x] Golden vectors prove canonical serialization is injective across delimiters, UTF-8, field ordering, optionals, URL normalization, and all source kinds.
- [x] Source hashes are branded `sha256:<hex>`, use injected hashing, and reject non-32-byte hash output.
- [x] `npm test` and `npm run build` pass.

## Implementation notes

- Added branded marketplace/plugin names and keys with strict ASCII grammar, final-delimiter parsing, and identity consistency validation.
- Added registry-owned declared marketplace/plugin variants plus resolved plugin variants. Resolved contracts retain immutable Git revisions, npm integrity, canonical source, and branded source hashes without accepting declaration selectors in their place.
- Implemented `source-v1` length-prefixed canonical serialization with explicit registry field order, omitted optionals, UTF-8 byte lengths, RFC 3986 path-segment encoding, and URL scheme/host/HTTPS-port normalization. No filesystem, Git, npm, process, clock, or Node built-in APIs are used.
- Implemented injected synchronous SHA-256 hashing with strict 32-byte output validation and lowercase branded hash formatting.
- Added runtime schema, exhaustive narrowing, compile-time separation, golden serialization, and hashing tests. The canonical field encoder uses `|` only as a structural separator; value byte lengths preserve delimiter-containing values without ambiguity.

## Verification

- `npm test` — passed: typecheck, dependency boundaries, and 51 Vitest tests.
- `npm run build` — passed: clean TypeScript 7 ESM build with declarations and source maps.

## Stage readiness

Implementation is complete and ready for review. No design flaw or blocker was discovered.
