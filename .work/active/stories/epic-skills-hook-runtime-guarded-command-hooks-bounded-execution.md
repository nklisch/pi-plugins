---
id: epic-skills-hook-runtime-guarded-command-hooks-bounded-execution
kind: story
stage: implementing
tags: [compatibility, security, infra]
parent: epic-skills-hook-runtime-guarded-command-hooks
depends_on: [epic-skills-hook-runtime-guarded-command-hooks-execution-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Execute selected handlers through one bounded process runner

## Checkpoint

Narrowly generalize the existing process-tree runner and build the selected-plan executor with explicit environment inheritance, executable identity, stdin, timeout, per-stream output bounds, deduplication, and fixed-width concurrency.

## Design element

- Move the adapter-neutral `CommandRunner` request/result contract to an application port while retaining `createNodeCommandRunner` as the sole Node spawn/tree-kill implementation.
- Require every launch to state environment inheritance/overrides, timeout, stdout policy, and stderr policy; update source-acquisition callers explicitly rather than preserving hidden defaults.
- Add a package-private executable resolver that returns the exact absolute Bash/PowerShell/exec executable and adapter-issued identity for the final cwd/environment. The runner still launches with `shell: false`.
- Implement `GuardedCommandHookExecutor.execute(plan, invocation)` over strict `HookEventPlan` only. Canonically encode one bounded stdin JSON value and perform expansion/resolution/spawn inside the execution-context callback.
- Deduplicate exact selected identities after source-order sorting, preserve scope/revision boundaries, start work through an eight-wide queue, and store completion in preallocated source-order slots.
- Preserve the existing detached POSIX group, Windows tree kill, TERM/KILL escalation, pipe draining, caller abort, and close lifecycle. Do not add `pi.exec`, another `spawn`, or another process cancellation path.

## Acceptance evidence

- Real exec fixtures prove literal arguments and no shell expansion; real Bash/PowerShell-where-supported fixtures prove only explicit shell semantics.
- Real process inputs observe exact cwd, one JSON newline, five root variables, configuration environment, host inheritance policy, and resolved executable without leaking those values to diagnostics.
- Pre-abort, mid-flight caller abort, timeout, TERM resistance, descendant process, and descendant-held pipe fixtures terminate the complete tree and settle within bounded test deadlines.
- Separate stdout/stderr overflow and invalid request/spawn/null-exit cases return stable typed outcomes after drain; retained memory never exceeds configured bounds.
- Delayed fixtures prove at most eight concurrent starts and source-order results despite inverse completion. Duplicate declarations run once, while same commands in different scope/plugin/revision contexts run separately.
- Existing Git/source materializer tests remain green with explicit host environment and capture semantics, demonstrating reuse rather than a second process implementation.

## Ordering constraint

Depends on execution contracts. It can proceed in parallel with decision aggregation. Pi application depends on both completed checkpoints.
