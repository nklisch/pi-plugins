---
id: epic-skills-hook-runtime-subagent-interception-upstream-contribution
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-production-adapter]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-subagents-lifecycle-interception.md
research_origin: null
created: 2026-07-16
updated: 2026-07-17
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

- [x] A focused current-main PR is opened and linked here with immutable head/base commits.
- [x] The API is generic and contains no foreign-hook or Plugin Host policy.
- [x] Tool/service and initial/resume lifecycle coverage remains complete; no partial event-only substitute is accepted.
- [x] The return plan covers release qualification, dependency swap, fork deprecation, and rollback.

## Upstream PR

- [PR #614](https://github.com/gotgenes/pi-packages/pull/614): `feat(pi-subagents): add ordered lifecycle interception`.
- Base: `gotgenes/pi-packages` `main` at `0456e17098de1c9f9da8d3ddb90545140b021881`.
- Head: `nklisch:upstream/subagent-lifecycle-interception` at `e74f70ae095b6f6f4d17b458015ed4a716ddf505`.
- The branch is one focused commit from the fetched upstream base and changes only `packages/pi-subagents`.
- The PR references Issue #466 and requests the normal release-please minor release for the additive service API.

## Verification

- Upstream package check, lint, full test suite (65 files, 1,008 tests), packaged public-types consumer check, monorepo check/lint/test, and `fallow dead-code` passed.
- The lifecycle order matrix passed 11 tests, including exact prompt/result ordering, cancellation, bounded same-session continuation, unregister, disposal, initial/resume, tool/service, foreground/background, and queued paths.
- The unchanged portable lifecycle conformance passed 2 files and 11 tests with a clean target-project typecheck.

## Return checklist

- [ ] After merge, identify the first `@gotgenes/pi-subagents` release containing this exact public contract and capture its registry integrity, tag, and commit provenance.
- [ ] Re-run the unchanged portable conformance and real Pi lifecycle-order suite against the released bytes.
- [ ] Switch only the existing package-selection wrapper from the maintained fork after those checks pass, without changing the host port or coordinator semantics.
- [ ] Retain the maintained-fork selection as rollback until the upstream release qualifies in production composition.
- [ ] Deprecate the fork only after the upstream package has qualified and a rollback path is recorded.

## Simplification opportunity

Upstream acceptance removes long-term fork publication and rebase ownership while preserving one host port and wrapper.
