---
id: epic-skills-hook-runtime-guarded-command-hooks-review-hardening
kind: story
stage: done
tags: [compatibility, security, infra, tests]
parent: epic-skills-hook-runtime-guarded-command-hooks
depends_on: [epic-skills-hook-runtime-guarded-command-hooks-integration-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Make Stop continuation functional and harden execution evidence

## Standard-review fix set

1. At idle `agent_settled`, send a continuation message with a Pi 0.80.8 delivery mode for which `triggerTurn: true` actually starts a turn (`steer` or `followUp`, per verified runtime semantics). Do not use `nextTurn`, which returns before trigger handling.
2. Add integrated runtime evidence from Stop plan through execute/aggregate/apply/send/guard: first continuation starts, recursive state is active, send failure resets safely, exactly three turns are permitted, exhaustion emits no fourth continuation, no-continuation/session/user-input resets as designed.
3. Add resolver tests for absolute and cwd-relative executables, PATH lookup, Windows `.exe`/`.cmd`/`.bat` candidate rules via injected platform/path environment, missing executable, and abort propagation. Keep production resolution free of shell interpretation.
4. Add Stop exit-2 with empty stdout continuation coverage.
5. Consolidate Pi fail-closed decisions onto `eventFailsClosed` or remove the dead export; one policy table only. Remove the unused Stop generation/reset reason and unused Pi runtime `ctx` plumbing.
6. Give `mergeOutput` a real discriminated result rather than `as never`; preserve accepted output semantics.
7. Map `NULL_EXIT` to `HOOK_SPAWN_FAILED` (or a dedicated accurate code if already designed), never executable-unavailable.
8. Preserve the first declaration-order reason when multiple `ask` decisions aggregate.

## Constraints

- Preserve all trust/scope/root/config/secret revalidation and disposal, process-tree cancellation/bounds, strict output fields, declaration-order aggregation, Pi mutation behavior, and three-use Stop limit.
- No change to context-before-ask behavior, idle context-only delivery, canonicalization ownership, public exports, subagent callbacks, state/UI/MCP/native manager.
- Tests must model Pi `sendCustomMessage` semantics accurately enough to fail for `nextTurn + triggerTurn`.
- Standard review already ran; host administrative verification only after fixes.

## Acceptance evidence

- [x] A Stop continuation starts an actual turn under Pi 0.80.8 semantics.
- [x] No fourth continuation starts and send failure does not consume/strand active state.
- [x] Real resolver branches and abort are directly covered.
- [x] Stop empty-output exit 2 continues with safe fallback.
- [x] No new dead policy/guard/context code or unsafe parser cast remains.
- [x] Full `npm test`, boundaries, build/package import pass with no secret/process leaks.

## Implementation notes

- Execution capability: direct inline implementation; this is a bounded compatibility/process hardening story with one cohesive owner and no nested agents.
- Review weight: standard, already satisfied by the feature review; this story receives no second independent pass.
- Files changed: `src/pi/hooks/pi-command-hook-runtime.ts`, `src/runtime/hooks/stop-continuation-guard.ts`, `src/runtime/hooks/hook-output-parser.ts`, `src/runtime/hooks/hook-decision-aggregator.ts`, `src/runtime/hooks/guarded-command-executor.ts`, `src/infrastructure/process/hook-executable-resolver.ts`, and the focused Pi/runtime/resolver tests.
- Tests added: fidelity Pi idle-delivery integration coverage (nextTurn ignored, steer starts, recursive active state, send failure, three-use exhaustion, and reset paths); deterministic resolver coverage for absolute/cwd/PATH/Windows candidates/missing/abort; Stop exit-2 empty output; null-exit classification; and declaration-order ask reason retention.
- Simplification: Pi fail-closed status now derives from the existing event policy registry; removed unused runtime context plumbing and Stop generation/reset-reason plumbing; replaced the parser sentinel cast with a discriminated result.
- Discrepancies from design: the resolver now accepts private injected platform, host environment, and access adapters so Windows branches are deterministic on non-Windows test hosts; PATH entries resolve from the requested child cwd.
- Adjacent issues parked: none.
- Verification: focused Vitest passed (5 files, 21 tests). Full `npm test` passed: typecheck, dependency boundaries (209 modules / 1,263 dependencies), Vitest (149 files / 781 tests), build, and compiled package import (459 exports). No secret/process-leak regressions observed.
