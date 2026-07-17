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

## Local fork implementation and qualification — 2026-07-16

- **Verified release base:** npm `latest` remains `@gotgenes/pi-subagents@18.0.3` with integrity `sha512-J9H814nan6VgGcK5vPjJ95f6xSyD7Kpcp/9Ff/zWJdAw4x2XIHALNvKpotfk1YgEah30qyNBkgcAFsnhItBY0Q==`; upstream tag `pi-subagents-v18.0.3` resolves to immutable commit `c76a294a777a990950da23fc06cb0caf51da7ac6` (tree `1ca9a81e23181badb2201ae0f4a5848fa85e0ca0`). Current fetched upstream `main` is `29d52d6b37ef6a778cbcdfd2e7f317928a38e52e`, has no lifecycle-registration API, and contains unreleased unrelated subagent changes. The fork therefore starts from the exact published release, not unreleased main.
- **Fork location and history:** `/tmp/pi-packages-subagent-lifecycle` on `autopilot/lifecycle-interception`, based on the release commit above. Commit `43efffb459f64e2f5f9aaee50d8ae5afa564f4f3` (`feat(subagents): add ordered lifecycle interception`) preserves upstream history, MIT license, exports, extension entry point, and all non-lifecycle execution ownership.
- **Narrow additive seam:** unpublished `@nklisch/pi-subagents@18.0.4-nklisch.0` adds the documented `registerLifecycleInterceptor()` provider API with immutable agent/session/run/type/parent identity; exact post-inheritance prompt replacement/abort; proposed-result replacement/abort; ordered async snapshots; idempotent unregistration; callback cancellation/error handling; a fixed three-round same-session continuation bound; and one-time provider disposal. The package keeps manager/session internals private. Tool/service, foreground/background, immediate/queued, initial/resume, and parent-present paths are covered; service parent identity is callback-only so no-interceptor child-session setup remains unchanged.
- **Local evidence:** Node `v24.17.0`; package typecheck, lint, and 65-file/986-test package suite pass. New real `SubagentSession` tests prove exact prompt and Pi EventEmitter completion order, start abort, completion cancellation/error, same-session bounded continuation, registration ordering/disposal, every execution-path category, and no-provider event ordering. `verify:public-types` packs `nklisch-pi-subagents-18.0.4-nklisch.0.tgz`, checks its exports and generated declarations, and type-checks an isolated consumer against that local tarball. The unchanged Plugin Host fake/conformance tests `test/contract/subagent-lifecycle.contract.test.ts` and `test/integration/subagent-lifecycle-port.test.ts` also pass (2 files, 11 tests); no Plugin Host production adapter or capability code changed.
- **Publication and integration status:** no push, release, registry login, registry query requiring credentials, publication, production dependency, production adapter, capability change, host policy, deep import, event approximation, package patch, or upstream PR was made. Local packed bytes are qualification evidence only and do not establish published provenance or production availability.

### Remaining real dependency

The story remains **`stage: implementing`** and the production-adapter and upstream-contribution dependents remain blocked. An authorized maintainer must first publish immutable fork bytes and record the selected version, npm integrity, release tag, repository commit, package license/peer/engine receipt, and maintainer/security/rebase ownership. Then the unchanged real-package/Plugin Host conformance and Pi session-order tests must pass from those published pinned bytes before the production adapter can begin. The eventual generic upstream contribution remains sequenced after production integration; it is not opened from this local qualification alone.
