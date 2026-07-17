---
id: epic-skills-hook-runtime-subagent-interception-maintained-fork
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-fake-conformance]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-subagents-lifecycle-interception.md
  - .agents/skills/pi-subagents-v18/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Establish the Maintained Subagents Fork

## Brief

Create and publish a narrowly maintained MIT fork of `@gotgenes/pi-subagents`, based on current verified upstream history, that exports the lifecycle interception seam already defined by Plugin Host. The planned repository/package identities are `nklisch/pi-packages` and `@nklisch/pi-subagents`; repository and registry ownership must be verified before publication.

The fork preserves upstream agent configuration, models, sessions, tools, queues, concurrency, steering, resume, persistence, workspaces, turn limits, notifications, and disposal. It adds only generic ordered asynchronous pre-start and pre-completion interception with exact identity, cancellation, prompt/result replacement, abort, bounded same-session continuation, unregister, and no-interceptor parity.

## Strategic decision

The operator authorized the maintained-fork fallback on 2026-07-16. This removes the wait-only blocker but does not permit event approximation or production qualification from unpublished bytes.

## Implementation plan

1. Fork from verified `@gotgenes/pi-subagents@18.0.3` / commit `c76a294a777a990950da23fc06cb0caf51da7ac6`, then re-check/rebase to current upstream before implementation.
2. Preserve history, copyright, MIT license, package exports, extension behavior, and no-interceptor parity.
3. Add a generic documented lifecycle registration export consistent with upstream's provider architecture.
4. Integrate exact start and completion boundaries across tool/service, foreground/background/queued, initial/resume, cancellation, error, and disposal paths.
5. Run package tests, unchanged Plugin Host conformance, and real Pi session/event-order tests.
6. Publish exact pinned bytes with npm integrity, repository/upstream commits, license, engines, peers, and suite receipt.
7. Document maintainers, credentials, security intake, upstream monitoring/rebase cadence, and rollback.

## Acceptance

- [ ] No-interceptor behavior and all existing upstream execution features remain unchanged.
- [ ] The fork changes only the generic lifecycle seam and tests, not agent execution policy.
- [ ] Exact prompt/result ordering, identity, continuation, cancellation, unregister, and disposal pass unchanged conformance on every path.
- [ ] Published package provenance and Node/Pi compatibility evidence are immutable and complete.
- [ ] Security/rebase ownership and upstream-return checklist are committed.
- [ ] Unpublished/local fork work cannot report production capability available.

## Simplification opportunity

One upstream-shaped provider seam replaces event approximation, manager/session exposure, package patching, and any second subagent runtime.
