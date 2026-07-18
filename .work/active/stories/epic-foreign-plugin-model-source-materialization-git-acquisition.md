---
id: epic-foreign-plugin-model-source-materialization-git-acquisition
kind: story
stage: done
tags: [security, infra]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-secure-content-contract]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Materialize Git sources at deterministic commits

## Scope

Implement Unit 2 from the parent feature: abort-aware argument-array command execution, structured redaction, deterministic Git ref/SHA resolution, clean `git archive` streaming through the secure sink, subdirectory handling, and resolved-source construction for every marketplace Git and plugin Git variant.

## Files

- `src/infrastructure/process/command-runner.ts`
- `src/infrastructure/git/git-source-acquirer.ts`
- `src/infrastructure/logging/redaction.ts`
- matching tests and hermetic Git fixtures listed in parent Unit 2

## Required behavior

- Use `spawn(executable, args, { shell: false })`; cancellation terminates and drains processes. Never interpolate a shell command.
- Follow the parent's selector table exactly: `sha` wins without querying `ref`; full SHA verifies exact commit; qualified branch/tag resolves exactly; unqualified branch+tag is ambiguous; tag peels to commit; default is HEAD.
- Use private bare scratch and Git object/archive operations. Local Git is archived from objects, not copied from its worktree. Reject `.gitmodules`; never emit `.git`.
- Preserve configured noninteractive credential helpers/SSH agent, disable prompts, and rebuild safe diagnostics rather than serializing stderr/environment/credential-bearing URLs.
- Construct results only through existing resolved-source constructors; the selected lowercase 40-character commit SHA is trust identity.

## Acceptance criteria

- [x] Hermetic remotes cover HEAD, branches, lightweight/annotated tags, ambiguity, missing/non-commit refs, moving refs, SHA, and SHA/ref precedence.
- [x] GitHub, HTTPS, SCP, `ssh://`, local Git, Git plugin, and Git-subdirectory fixtures return exact verified resolved contracts and expected manifests.
- [x] Output has no `.git`, rejects submodules, strips exactly one requested subdirectory, and rejects missing/empty subdirectories.
- [x] Cancellation kills Git and the parent coordinator removes scratch/content.
- [x] Injected credentials are absent from commands-as-logged, errors, and result values.
- [x] Focused tests, `npm run typecheck`, and `npm run boundaries` pass.

## Implementation notes

- Files changed: `src/infrastructure/process/command-runner.ts`, `src/infrastructure/git/git-source-acquirer.ts`, `src/infrastructure/logging/redaction.ts`, and the narrowly required Git archive compatibility changes in `src/infrastructure/archive/tar-reader.ts`.
- Tests added: `test/infrastructure/process/command-runner.test.ts` and `test/infrastructure/git/git-source-acquirer.test.ts`; tests use temporary local Git repositories and a command adapter that maps SSH-shaped plugin declarations to those hermetic repositories.
- Git semantics: every invocation uses argument arrays and `shell: false`; resolution uses private bare scratch objects, exact ref/SHA verification, branch/tag ambiguity rejection, tag peeling, `.gitmodules`/submodule rejection, and archive output through the secure sink. Git's benign `pax_global_header` and selected-directory ancestor framing are consumed without permitting path indirection or retaining framing entries.
- Security: cancellation terminates and drains processes, scratch is removed on every outcome, Git is noninteractive while inheriting configured credential helpers/SSH agent/config, and raw stderr/environment values never enter materializer errors or resolved source values. Central redaction covers command, URL, bearer/basic, query, and sensitive environment forms.
- Discrepancies from design: the existing tar reader rejected the harmless global PAX comment emitted by `git archive` and ancestor directory entries emitted for a subdirectory pathspec. The minimal parser adjustment accepts only safe global metadata and ignores only exact prefix ancestors; path/link indirection and all other extended records remain rejected.
- Adjacent issues parked: none.

## Verification

- Focused process, Git, and archive tests pass.
- `npm run typecheck` passes.
- `npm run boundaries` passes.
- `npm test` passes: 161 tests, build, and compiled-package import allowlist.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Independently confirmed `npm test`: 161 tests, typecheck, 112 dependency edges with no violations, build, and exact 90-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
