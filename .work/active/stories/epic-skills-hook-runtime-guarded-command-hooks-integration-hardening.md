---
id: epic-skills-hook-runtime-guarded-command-hooks-integration-hardening
kind: story
stage: implementing
tags: [compatibility, security, infra]
parent: epic-skills-hook-runtime-guarded-command-hooks
depends_on: [epic-skills-hook-runtime-guarded-command-hooks-pi-application]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Harden guarded command hooks end to end

## Checkpoint

Prove the full selected-plan → trust/config/root callback → real process → strict decision → exact fake-Pi application path, including hostile process/output/secret/order/continuation cases, package boundaries, and migration-free rollback.

## Design element

- Add real Node and shell fixtures for stdin/env/cwd/substitution, delayed completion, output/error forms, descendants, TERM resistance, and held pipes.
- Integrate unchanged Agile Workflow hook declarations plus exec-form decision fixtures with real temporary immutable/data/project roots, the real command runner/configuration resolver, and canary secret/path/trust adapters.
- Build exhaustive JSON/plain/exit/event/decision and mode-aware ask matrices, then exercise them through the typed fake Pi callback runner rather than parser-only tests.
- Prove source-order dedup/concurrency, plan ordering, all-or-nothing fail-closed behavior, and Stop continuation lifecycle under real timing inversions.
- Extend dependency-cruiser and source/compiled export allowlists so process/config/root/signal/parser/Pi-mutation internals remain package-private.
- Update rolling foundation assertions only when implementation makes current prose false or misleading; record supplied baselines and exact additions after full verification.

## Acceptance evidence

- Real shell/exec fixtures receive exact canonical stdin, cwd, path/config environment, template expansion, and explicit executable/shell semantics. Exec metacharacters stay literal.
- Abort, timeout, resistant parent, descendant tree kill, held pipe, stdout/stderr limit, invalid UTF-8/JSON, resolution/spawn failure, and inverse completion settle without flakes or leaked processes.
- Secret/native/root/command/environment/raw-output canaries appear in none of diagnostics, notifications, custom-message details, state, projections, logs, snapshots, or compiled API output.
- Decision matrices cover every ordinary event and supported block/context/input/output/stop/title/continuation behavior, unsupported field class, exit 0/2/other, and TUI/RPC/JSON/print ask path.
- Scope/revision-aware dedup, 256-handler/8-concurrency bounds, delayed completion, and `PostCompact` → compact `SessionStart` ordering are deterministic across runs.
- Stop covers initial/recursive/no-continuation/exact-budget/exhausted/send-failure/user-input/reload/replacement/shutdown, with no SubagentStart/Stop registration.
- Existing source acquisition, normalized readers/evaluator, projection/event planning, trust/config/path/error, public API, and compiled import suites remain green.
- Full `npm test` passes typecheck, boundaries, Vitest, build, and exact compiled import. The feature body records main baseline `133/696/459`, branch start `141/744/459`, and final additions.
- Rollback removes runtime execution/application and reverts runner request/callers without state, projection-cache, installed/trust/configuration, content/data, transition, recovery, or credential migration. Command-hook capability becomes unavailable and subagent interception remains blocked.

## Ordering constraint

Depends on Pi application and closes the checkpoint graph. It verifies integrated behavior; it is not a separate parser, runner, UI, or subagent implementation lane.
