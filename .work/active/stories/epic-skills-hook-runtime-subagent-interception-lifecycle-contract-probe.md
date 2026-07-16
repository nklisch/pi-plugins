---
id: epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: []
release_binding: null
gate_origin: null
research_refs: [docs/research/pi-subagents-lifecycle-interception.md]
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Define the Subagent Lifecycle Port and Capability Probe

## Priority

High; implementable now and the first portable checkpoint.

## Deliverable

Create the public schema-first `SubagentLifecyclePort` in `src/application/ports/subagent-lifecycle.ts`. Define immutable execution identity/path, exact start/completion callback requests, typed continue/complete/abort decisions, published-package versus test-provider qualification evidence, complete semantic/path conformance facts, registration evidence, ordered interceptor registration, and idempotent disposal.

Add `createSubagentLifecycleCapabilityProbe` as a decorator over the existing complete `RuntimeCapabilityProbe`. It overwrites only `pi.subagents.lifecycle-interception`, validates a qualification digest tied to exact released package metadata and every required behavior vector, and keeps a test fake incapable of claiming production availability.

## Planned files

- `src/application/ports/subagent-lifecycle.ts`
- `src/application/subagent-lifecycle-capability-probe.ts`
- `src/domain/hook-runtime-limits.ts`
- `src/index.ts`
- `test/application/subagent-lifecycle-contract.test.ts`
- `test/application/subagent-lifecycle-capability-probe.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Contract checkpoints

- Identity is exactly agent id, child session id, unique per-execution run id, agent type, and optional parent session id.
- Execution path is exactly initial/resume, tool/service, foreground/background, and immediate/queued.
- Start sees the final assembled next prompt and can return its sole replacement or abort before `AgentSession.prompt()`.
- Completion sees the proposed result before addendum/status/events/history/notification/disposal and can complete, continue the same session, or abort.
- One `HOOK_SUBAGENT_CONTINUATION_BUDGET = 3` constant is shared by registration and coordinator evidence.
- Serializable public values derive from strict Zod schemas. `AbortSignal` and exact prompt/result strings exist only in callback request types.
- Provider qualification distinguishes `test` from `published-package`. Published evidence includes exact package/version/canonical integrity/tag/full commit/MIT/Node/Pi ranges plus contract/suite versions, suite digest, and every required literal-true vector.
- Registration echoes the expected qualification digest and exact continuation bound; disposal is idempotent.

## Acceptance evidence

- [ ] Strict schemas reject unknown/missing identity, execution, semantics, coverage, package, conformance, decision, and registration fields.
- [ ] Initial/resume identities cannot alias one run id; parsed fixtures are immutable against caller mutation.
- [ ] Missing lifecycle changes only `pi.subagents.lifecycle-interception` to unavailable and preserves all unrelated facts.
- [ ] Test providers, method-only fixtures, partial vectors, bad integrity/commit/license/ranges, or qualification mismatch never map production availability.
- [ ] A complete published-package fixture maps available; malformed present evidence is a redacted `ADAPTER_FAILED`; caller cancellation propagates unchanged.
- [ ] Mixed compatibility evidence proves supported subagent components receive an unavailable requirement while ordinary-only plugins remain activatable.
- [ ] Public and compiled allowlists expose only portable contracts/probe, not package imports, fake/conformance internals, prompt/result values, or registration handles.

## Ordering

No sibling dependencies. The fake/conformance and hook-coordinator stories depend on this checkpoint.

## Blocker ownership

None. Current upstream API absence does not block the host-owned portable contract or truthful unavailable mapping.

## Risk and rollback

The risk is ceremonial capability evidence. Require exact released package metadata, qualification digest, all behavior/path vectors, and a published-package provider; the future concrete wrapper must pass the shared suite. Rollback removes an unconsumed portable surface and restores the existing unavailable fact without state or migration changes.

## Implementation summary

- Added the adapter-neutral lifecycle identity, path, decision, qualification, conformance, registration, and port contracts. Callback prompt/result values and signals remain type-only, while all durable evidence is strict and serializable.
- Added the capability-probe decorator. Missing ports and test providers make only `pi.subagents.lifecycle-interception` unavailable; only a complete published-package receipt whose runtime ranges and behavioral vectors qualify can make it available.
- Added the shared continuation budget, explicit source/compiled exports, semver type support, and strict capability/public-boundary tests. No subagent package or package-specific type enters the application port.

## Implementation record

- Execution capability: `xhigh feature owner`; one cohesive direct implementation with no nested agents.
- Commit ref: `70a699f` (`implement: subagent lifecycle contract and probe`).
- Verification: `npm run typecheck`; 35 focused Vitest tests across lifecycle contracts/probe, compatibility evaluation/reporting, and public API; `npm run test:package`; compiled import passed with 478 exports.
- Deviations: none affecting the designed boundary. Invalid present semver/range evidence fails as redacted `ADAPTER_FAILED`; incomplete but well-formed behavioral coverage remains truthfully unavailable.
