---
id: epic-foreign-plugin-model-source-materialization-git-acquisition
kind: story
stage: implementing
tags: [security, infra]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-secure-content-contract]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
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

- [ ] Hermetic remotes cover HEAD, branches, lightweight/annotated tags, ambiguity, missing/non-commit refs, moving refs, SHA, and SHA/ref precedence.
- [ ] GitHub, HTTPS, SCP, `ssh://`, local Git, Git plugin, and Git-subdirectory fixtures return exact verified resolved contracts and expected manifests.
- [ ] Output has no `.git`, rejects submodules, strips exactly one requested subdirectory, and rejects missing/empty subdirectories.
- [ ] Cancellation kills Git and the parent coordinator removes scratch/content.
- [ ] Injected credentials are absent from commands-as-logged, errors, and result values.
- [ ] Focused tests, `npm run typecheck`, and `npm run boundaries` pass.
