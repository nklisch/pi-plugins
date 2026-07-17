---
id: epic-skills-hook-runtime-subagent-interception-upstream-contribution
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-production-adapter]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-subagents-lifecycle-interception.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Contribute Subagent Lifecycle Interception Upstream

## Brief

After the maintained fork is integrated and proven in production composition, rebase its generic lifecycle-interceptor commits onto current `gotgenes/pi-packages` `main` and open a focused pull request for `packages/pi-subagents`. Frame it as an additive provider/interceptor seam consistent with upstream ADR 0002, not as foreign-hook or Plugin Host policy.

## Delivery plan

1. Re-check contribution guidance, current architecture decisions, package exports, issue #466, and overlapping current work.
2. Extract the minimal generic lifecycle commits and tests from the proven fork.
3. Rebase and run upstream package tests plus unchanged portable/real-session conformance.
4. Document ordering, identity, cancellation, continuation, no-interceptor parity, unregister, disposal, and examples for other extensions.
5. Open the PR and record URL plus exact head/base commits; respond to review without replacing semantics with observational events.
6. Qualify the first upstream release containing the contract, swap package selection through the existing wrapper, and deprecate the fork only after unchanged tests pass.

## Acceptance

- [ ] A focused current-main PR is opened and linked here with immutable head/base commits.
- [ ] The API is generic and contains no foreign-hook or Plugin Host policy.
- [ ] Tool/service and initial/resume lifecycle coverage remains complete; no partial event-only substitute is accepted.
- [ ] The return plan covers release qualification, dependency swap, fork deprecation, and rollback.

## Simplification opportunity

Upstream acceptance removes long-term fork publication and rebase ownership while preserving one host port and wrapper.
