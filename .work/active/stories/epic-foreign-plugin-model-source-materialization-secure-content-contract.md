---
id: epic-foreign-plugin-model-source-materialization-secure-content-contract
kind: story
stage: implementing
tags: [security, infra]
parent: epic-foreign-plugin-model-source-materialization
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Build the secure content and materialization contract

## Scope

Implement Unit 1 from the parent feature: the schema-derived deterministic content manifest, application materializer/context/result/error contracts, source coordinator, hardened filesystem sink, streaming tar policy, marketplace-relative copy, and inward dependency rules. This story owns the common security boundary through which every Git/npm/archive byte must pass.

The lifecycle caller supplies an empty private staging slot. Write only `<slot>/content` and `<slot>/.work`; return no result until resolved-source verification and manifest finalization complete; remove all owned writes on abort/error. Do not choose cache/marketplace/install paths or implement promotion, state, locks, journals, rollback, recovery, or garbage collection.

## Files

- `src/domain/content-manifest.ts`
- `src/application/source-materialization.ts`
- `src/application/ports/source-acquisition.ts`
- `src/infrastructure/filesystem/secure-content-writer.ts`
- `src/infrastructure/archive/tar-reader.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- matching tests and adversarial fixtures listed in parent Unit 1

## Required behavior

- Implement the exact `ContentManifest`, `SourceContext`, materializer, sink, limits, and `SourceMaterializationError` signatures and binary `content-v1` grammar from the parent.
- Enforce lexical path, NFC/case collision, reserved-name, ancestor/link, exclusive-write, realpath-containment, tar type/mode/link, count/size/ratio, and cleanup policies while writing—not as a post-extract sweep alone.
- Create validated symlinks only after ordinary entries; materialize hardlinks as regular copies. Normalize modes and omit timestamps/uid/gid from content identity.
- Require marketplace context only for `marketplace-path`, validate its manifest digest, and contain the real source under the immutable marketplace root.
- Keep application/domain free of Node and outer-layer imports; add executable dependency-cruiser regressions.

## Acceptance criteria

- [ ] Manifest golden vectors change on path/mode/byte/link changes and remain stable across order/platform/archive metadata.
- [ ] Every path/link/type/collision/limit attack enumerated in the parent fails before an escaping write and uses the specified code/classification.
- [ ] Pre-abort and cancellation during copy, extraction, finalization, and cleanup return no partial result and remove owned paths; cleanup failure is explicit.
- [ ] Marketplace-relative source and context mismatch/escape fixtures fail closed; safe internal content succeeds.
- [ ] Boundary regressions prove domain/application/format constraints, and the intended public contracts are source-importable.
- [ ] Focused tests, `npm run typecheck`, and `npm run boundaries` pass.
