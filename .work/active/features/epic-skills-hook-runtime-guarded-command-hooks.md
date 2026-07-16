---
id: epic-skills-hook-runtime-guarded-command-hooks
kind: feature
stage: drafting
tags: [compatibility, security, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-hook-event-adaptation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Guarded Command-Hook Execution and Decisions

## Brief

Execute selected shell-form and exec-form command hooks with one compatible JSON input on standard input and the exact session working directory, immutable plugin root, stable writable data root, trusted project root, and callback-scoped resolved user configuration. Apply supported substitution consistently across executable forms and environment values while keeping secret plaintext inside the existing configuration-resolution lifetime. Process launch, environment inheritance, shell selection, executable identity, and diagnostics must remain explicit and auditable.

Enforce bounded handler timeout, caller cancellation, process-tree termination, standard-output and standard-error limits, and deterministic deduplication/concurrency. Parse exit status and supported structured/plain outputs into blocking, context injection, input/output rewriting, stop, title, and guarded continuation decisions; reject unsupported fields explicitly; and aggregate concurrent results in stable declaration order regardless of completion order. Errors, cancellation, truncation, and continuation exhaustion produce safe actionable diagnostics without leaking secrets, raw native causes, or unbounded plugin output.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: completes ordinary command-hook behavior after event adaptation; subagent hooks reuse the same executor
- Security boundary: executes already compatibility-checked and trusted normalized handlers only; it never reads raw manifests or grants trust

## Simplification opportunity

- Reuse or narrowly generalize the existing bounded process-tree runner and runtime configuration resolver instead of introducing a second subprocess/cancellation implementation or eagerly expanded secret-bearing environment cache.

## Foundation references

- `docs/VISION.md` — Honest compatibility; Explicit trust
- `docs/SPEC.md` — Hook execution; Trust and security; Performance and availability
- `docs/ARCHITECTURE.md` — Hook adapter; Trust; Concurrency; Error model
- `docs/COMPATIBILITY.md` — Hook handlers; Hook output; Plugin path environment

## UI alignment

No presentation surface. Interactive `permissionDecision: "ask"` uses Pi's existing mode-aware host interaction when available; `/plugin` remains the native management owner.

<!-- The feature design pass will fill in interfaces, signatures, and implementation units. -->
