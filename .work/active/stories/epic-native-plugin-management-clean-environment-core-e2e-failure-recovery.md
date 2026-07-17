---
id: epic-native-plugin-management-clean-environment-core-e2e-failure-recovery
kind: story
stage: implementing
tags: [e2e-test, testing]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [epic-native-plugin-management-clean-environment-core-e2e-infrastructure]
release_binding: null
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
