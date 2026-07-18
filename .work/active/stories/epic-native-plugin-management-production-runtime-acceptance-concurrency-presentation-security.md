---
id: epic-native-plugin-management-production-runtime-acceptance-concurrency-presentation-security
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-production-runtime-acceptance
depends_on: [epic-native-plugin-management-production-runtime-acceptance-golden-lifecycle, epic-native-plugin-management-production-runtime-acceptance-failure-recovery-drift]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Prove concurrency, presentation parity, and non-retention

## Checkpoint

Implement Unit 5 from the parent feature in `test/e2e/production/concurrency-presentation-security.e2e.test.ts`. Exercise ordinary Pi concurrency/restart behavior, headless and signed manager rendering, and sensitive-input non-retention against the real production bundle. No UI or mockup change belongs here.

## Scenarios

- Two Pi RPC processes share one user scope. Same-target update/disable has one mutation owner and one truthful current/no-change/stale peer; different-target work progresses under existing scope guarantees. Fresh restarts agree on one complete revision and valid SQLite.
- Stop Git and deterministic model services after V2 activation. Offline restart returns local status/skill/MCP source observation within 15 seconds and performs no eager MCP launch/value callback. Explicit model/tool work waits until the service returns.
- RPC and print status/list/show/diagnose report the same revision, component counts, capability, MCP health/alias omission, and recovery facts.
- Real 120×30 and 58-column PTY sessions preserve the selected split inspector and signed choose/inspect → configure/trust → activation-result topology, exact whole-bundle counts, actions, disclosures, and safe outcome states. Assert semantic output/navigation, never ANSI/color/pixels.
- Submit a secret canary through the real sensitive-candidate input path. Unavailable production custody rejects activation, and all owned process/session/control/terminal/model/hook/MCP/state/configuration/projection/Git/log/artifact bytes remain clean.
- Cover keep-data and delete-data uninstall in separate roots, then restart and prove no active runtime contribution/process returns.

## Acceptance evidence

- [ ] Multiprocess operations have truthful ownership/results and converge after restart without mixed revisions, source collision, or database corruption.
- [ ] Offline startup has no Git/model/MCP-connect prerequisite and no eager launch-value resolution.
- [ ] Headless and TUI presentations consume identical facade authority and signed information hierarchy.
- [ ] Manager operations remain whole-plugin actions; no per-component controls or fake success appear.
- [ ] Sensitive values are absent from every durable/visible/diagnostic boundary and failure artifacts.
- [ ] Teardown leaves no process group, listener, port, source, lease, lock, staging tree, or artifact residue.

## Ordering and risk

Depends on both golden and failure/recovery checkpoints so it reuses established observation and fault helpers. Live cross-process automatic reload is not a claimed guarantee; final convergence is asserted after fresh process restart.

## Implementation notes

- Ran same-target V1→V2 updates from two real Pi processes plus a concurrent different-plugin inspection. One mutation owns success, the peer reports truthful stale/current evidence, and two fresh processes agree on exact V2 with valid SQLite.
- Proved V2 startup within 15 seconds after stopping Git and the model service. Skill and local MCP registration remain observable without eager process launch; a later explicit model/tool turn starts the server and returns late values.
- Checked RPC authority, human print projection, strict JSONL, and real 120×30 and 58-column PTY manager topology. Whole-bundle counts are 1 skill, 3 hooks, and 2 MCP servers; alias limitation remains visible in structured status.
- Submitted the secret canary through Pi's real masked TUI input and exact consent disclosure. Unavailable production custody rejects installation; terminal, RPC, state, files, logs, artifacts, and retained diagnostics contain no plaintext.
- Verified all four concurrency/presentation/security tests green, including process/port/source/lease and SQLite cleanup.
