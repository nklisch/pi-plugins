---
id: epic-skills-hook-runtime-guarded-command-hooks-execution-contracts
kind: story
stage: done
tags: [compatibility, security, infra]
parent: epic-skills-hook-runtime-guarded-command-hooks
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Establish guarded hook execution contracts

## Checkpoint

Normalize the exact shell/exec launch contract and create the callback-scoped authority seam that re-verifies a planned handler's complete active binding, roots, project trust, and configuration immediately before execution.

## Design element

- Evolve `HookHandlerSchema` so shell choice is structural: absent or explicit Bash has one canonical default identity, PowerShell is explicit, and exec cannot carry a shell.
- Centralize handler timeout/input/output/concurrency/aggregate/ask/continuation limits in the hook runtime contract and make compatibility reject declarations outside them.
- Add package-private `HookExecutionBinding`, `HookExecutionContextRequest`, `ResolvedHookExecutionContext`, and `HookExecutionContextPort` contracts.
- Implement the context port over native composition's current active selection plus existing project-root authority and `withResolvedPluginConfiguration`; it must not read state or manifests itself.
- Add a non-revealing `ResolvedConfiguration.redact(text)` operation so only sanitized accepted decision text can leave the callback; do not expose backing values or a generic getter.
- Apply one exact template vocabulary to shell command, exec command/args, and environment values while leaving unsupported/shell-native tokens untouched according to handler form.

## Acceptance evidence

- Reader/evaluator matrices prove default Bash, explicit Bash canonicalization, PowerShell capability, exec form, timeout maximum, and rejection of shell-on-exec/unknown launch fields.
- Existing default handler component ids and trust evidence remain stable; PowerShell and material executable changes alter trusted identity.
- Context tests reject every scope/plugin/revision/projection/contribution/component/current-project/cwd/root mismatch before secrets are fetched or a callback starts.
- User/project trust and opaque root capability tests prove project root is authority-issued rather than inferred from cwd.
- Secret/path/config adapter failures expose fixed codes only; callback completion values are discarded, the facade disposes, and canary plaintext cannot cross via coercion, JSON, errors, or inspection.
- Substitution tests cover all five path tokens, required/optional user configuration, missing keys, shell-native fallback syntax, and identical behavior across command/args/environment surfaces.

## Ordering constraint

This is the graph root. Both bounded process execution and output/decision aggregation depend on its normalized authority and launch vocabulary. No child process or Pi mutation should be implemented before this boundary is green.

## Implementation notes
- Execution capability: GPT-5.6 Luna xhigh, one cohesive feature owner; direct-read implementation with no nested agents, questions, or review.
- Review weight: standard by project convention; child checkpoint advances directly to done after focused verification.
- Files changed: normalized shell/exec component contracts and identity, hook reader/evaluator shell requirements, shared hook runtime bounds, callback-scoped configuration redaction, hook execution binding/context ports and adapter, and one pure launch-template contract. The planner now imports the authoritative alias definition directly and no longer depends on cleanup-target aliases.
- Tests added/updated: shell default/explicit Bash/PowerShell, shell-on-exec rejection, timeout bound, and callback redaction/disposal evidence.
- Simplification: explicit Bash is canonicalized to the existing absent-shell identity; launch vocabulary and bounds have one source rather than metadata/runtime copies.
- Discrepancies from design: context authority is represented by an injected active-selection port carrying the existing trust/configuration candidate; it does not read lifecycle state or manifests.
- Adjacent issues parked: none.
