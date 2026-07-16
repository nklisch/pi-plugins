---
id: epic-skills-hook-runtime-skill-discovery-path-verification
kind: story
stage: done
tags: [compatibility, infra, security]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Verify exact immutable skill documents

## Checkpoint

Provide one manifest-backed filesystem port that turns an exact manifest file reference into a readable canonical `SKILL.md` path for Pi. Reuse the existing content reader's containment, no-symlink, no-follow, bounded-read, size, and digest guarantees by extracting private shared mechanics rather than creating a weaker second resolver.

## Files

- `src/application/ports/skill-resource-path.ts`
- `src/infrastructure/filesystem/manifest-backed-file.ts`
- `src/infrastructure/filesystem/manifest-content-reader.ts`
- `src/infrastructure/filesystem/manifest-skill-path-verifier.ts`
- `test/infrastructure/filesystem/manifest-content-reader.test.ts`
- `test/infrastructure/filesystem/manifest-skill-path-verifier.test.ts`

## Constraints

- The caller has already selected the exact regular-file manifest entry; the port has no list, glob, arbitrary read, state, or trust capability.
- A ready result contains only the ephemeral absolute path and process-local canonical dedupe key. Failure results carry stable codes and no path/native cause.
- Distinguish missing, escape/symlink, mutation/type/digest, unreadable, adapter, and cancellation outcomes.
- Do not parse frontmatter or inspect skill names. Pi remains the native validation authority.
- Do not copy support files; returning the exact `SKILL.md` keeps its immutable directory as Pi's skill base.

## Acceptance evidence

- [ ] Root and nested skill documents verify against their exact manifest entries and return contained canonical file paths.
- [ ] Missing manifest/physical files, directory or special-file substitution, ancestor/final symlink, lexical/realpath escape, size/digest mutation, and unreadable open/read fail with the designed stable result.
- [ ] Cancellation before open, during read, after read, and before ready return produces no successful path.
- [ ] Failure serialization contains no absolute root or native cause.
- [ ] Existing `ContentReadPort` behavior and dependency boundaries remain intact after shared-helper extraction.

## Ordering

No sibling dependency. This physical boundary can be implemented in parallel with observation contracts. Resource-set assembly depends on both.

## Implementation notes
- Execution capability: GPT-5.6 Luna, high; security-sensitive filesystem boundary with a shared helper and focused mutation tests.
- Review weight: standard, source: project convention; child checkpoints do not enter review.
- Files changed: `src/application/ports/skill-resource-path.ts`, `src/infrastructure/filesystem/manifest-backed-file.ts`, `src/infrastructure/filesystem/manifest-content-reader.ts`, `src/infrastructure/filesystem/manifest-skill-path-verifier.ts`, and `test/infrastructure/filesystem/manifest-skill-path-verifier.test.ts`.
- Tests added/updated: exact root/nested paths, missing/type/symlink/digest failures, adapter readability, and cancellation; existing content-reader symlink/cancellation coverage remains green.
- Simplification: extracted one no-follow, realpath, bounded-read, and digest helper rather than adding a second filesystem resolver.
- Discrepancies from design: the application port remains contract-only; the factory lives in infrastructure as required by the dependency rules.
- Adjacent issues parked: none.
- Verification: focused manifest reader/verifier suites pass with runtime typechecking disabled because the design branch's pre-existing test typecheck baseline is already non-green under TypeScript 7.
- Stage transition: implementing -> done; implementation commit `implement: epic-skills-hook-runtime-skill-discovery-path-verification`.
