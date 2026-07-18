---
id: epic-native-plugin-management-clean-environment-core-e2e-failure-recovery
kind: story
stage: done
tags: [e2e-test, testing]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [epic-native-plugin-management-clean-environment-core-e2e-infrastructure]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Exercise packed failure and recovery boundaries

## Scope

Implement Unit 3 from the parent feature. Use cloned test-owned packed baselines and real Pi restarts to cover corrupt authority/cache/content, stale cursors and operation tokens, project replacement/trust loss, blocked recovery, unavailable secret/runtime capabilities, malformed/incompatible content, broken output, cancellation, reload failure, and foreign/source disappearance.

The story verifies representative seams only. Do not reproduce every state-codec, materializer, lifecycle crash, or parser matrix already covered by owner suites.

## Files

- `test/e2e/failure/corruption-staleness.e2e.test.ts`
- `test/e2e/failure/project-capability-failures.e2e.test.ts`
- `test/e2e/failure/output-cancellation-reload.e2e.test.ts`

## Failure invariants

- Corruption is isolated and diagnosed; valid sibling scope/plugin evidence remains usable.
- Replaceable projection/cache loss rebuilds or becomes explicitly unavailable; immutable descriptor/content corruption never falls back to current catalog or path guesses.
- Snapshot, cursor, install, lifecycle, notice, and operation capabilities cannot be replayed against changed/restarted authority.
- Project operations require the exact current trusted repository identity; user scope remains independent.
- A pending/blocked transition prevents new stacked mutations and preserves the previous working revision or exact recovery-required evidence.
- Sensitive configuration and required MCP/subagent capabilities remain unavailable without fakes; incompatible plugins do not partially install.
- Output loss and caller cancellation do not rewrite a committed/rolled-back/recovery result.
- Startup and commands terminate inside the declared deadlines and retain no fixture/process/lock/staging leak.

## Acceptance criteria

- [ ] Pointer/blob corruption produces bounded safe diagnosis and no automatic default overwrite; SQLite integrity and readable sibling behavior are independently checked.
- [ ] Missing projection, missing catalog cache, immutable metadata/content tamper, and moved/deleted source each produce their contract-specific fallback without damaging the installed working revision.
- [ ] Stale IDs/tokens after refresh, target mutation, restart, and session expiry perform zero mutation and require requery/reopen.
- [ ] Repository replacement and `--no-approve` restart block project mutation while user status/resources still work.
- [ ] A real interrupted transition plus unavailable rollback/candidate evidence remains recovery-required, and an unrelated plugin still starts.
- [ ] Secret/MCP/subagent/incompatible candidates expose exact public diagnostics and remain absent from installed/resource state.
- [ ] Closing RPC stdout, print stdout, or the PTY during a command cannot hang Pi or turn durable truth into generic cancellation; restart reports the actual state.
- [ ] Abort during slow Git preparation cleans staging and changes no authority; abort after a possible commit returns owner evidence with correct precedence.
- [ ] Reload successor loss/forced shutdown leaves no stale-context use and is explainable through next-start operation/recovery status.
- [ ] Foreign adoption/config fixtures remain byte-identical and no credentials/cache/trust are imported.

## Test integrity

A real production bug is parked via `/agile-workflow:park`; the honest test remains with a linked reason if temporarily skipped/xfail. Repair bad corruption fixtures, stale baselines, RPC framing, and assertions in-session. Never accept any error, any blocked state, any nonzero process result, request-log evidence, or internal table contents as a substitute for the named public invariant.

## Implementation notes

- Execution capability: GPT-5.6 Sol xhigh, caller-selected; direct packed-process ownership with no nested agents.
- Review weight: standard from `.work/CONVENTIONS.md`; child-story checkpoint does not receive review.
- Files changed: `test/e2e/failure/{corruption-staleness,project-capability-failures,output-cancellation-reload}.e2e.test.ts`, RPC approval control, and externally controlled Git-backend pause handling.
- Tests added: schema-valid SQLite pointer corruption/no-rewrite; missing/mutated operation capabilities; stale browse cursor; projection/content corruption; repository replacement/no-approve; foreign-state byte identity; exact unavailable candidates; externally paused refresh cancellation; malformed remote catalog fallback; closed RPC output; and reload owner truth.
- Simplification: corruptions use Node's real SQLite on test-owned state, and cancellation/output faults stay at process/pipe boundaries; no product port, fake database, service spy, or internal success row was added.
- Discrepancies from design: corrupt packed startup discovers `/plugin` but never reaches a reporting host, and paused refresh cancellation returns `STATE_STALE`; both exact desired invariants remain executable linked expected failures. Installed/reload cases are also linked to production projection publication.
- Adjacent issues parked: `idea-packed-corruption-startup-diagnosis`, `idea-packed-refresh-cancellation-state-stale`; candidate-inspection and projection parks remain linked where they block the scenario baseline.
- Verification: all failure files passed (11 tests including linked executable expected failures); ordinary stale cursor, project trust, malformed cache fallback, foreign byte identity, and closed-output restart paths are green.
