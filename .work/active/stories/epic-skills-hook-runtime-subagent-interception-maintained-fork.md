---
id: epic-skills-hook-runtime-subagent-interception-maintained-fork
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-fake-conformance]
release_binding: 0.1.0
gate_origin: null
research_refs:
  - docs/research/pi-subagents-lifecycle-interception.md
  - .agents/skills/pi-subagents-v18/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-18
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

- [x] No-interceptor behavior and all existing upstream execution features remain unchanged.
- [x] The fork changes only the generic lifecycle seam and tests, not agent execution policy.
- [x] Exact prompt/result ordering, identity, continuation, cancellation, unregister, and disposal pass unchanged conformance on every path.
- [x] Published package provenance and Node/Pi compatibility evidence are immutable and complete.
- [x] Security/rebase ownership and upstream-return checklist are committed.
- [x] Unpublished/local fork work cannot report production capability available.

## Simplification opportunity

One upstream-shaped provider seam replaces event approximation, manager/session exposure, package patching, and any second subagent runtime.

## Local fork implementation and qualification — 2026-07-16

- **Verified release base:** npm `latest` remains `@gotgenes/pi-subagents@18.0.3` with integrity `sha512-J9H814nan6VgGcK5vPjJ95f6xSyD7Kpcp/9Ff/zWJdAw4x2XIHALNvKpotfk1YgEah30qyNBkgcAFsnhItBY0Q==`; upstream tag `pi-subagents-v18.0.3` resolves to immutable commit `c76a294a777a990950da23fc06cb0caf51da7ac6` (tree `1ca9a81e23181badb2201ae0f4a5848fa85e0ca0`). Current fetched upstream `main` is `29d52d6b37ef6a778cbcdfd2e7f317928a38e52e`, has no lifecycle-registration API, and contains unreleased unrelated subagent changes. The fork therefore starts from the exact published release, not unreleased main.
- **Fork location and history:** `/tmp/pi-packages-subagent-lifecycle` on `autopilot/lifecycle-interception`, based on the release commit above. Commit `43efffb459f64e2f5f9aaee50d8ae5afa564f4f3` (`feat(subagents): add ordered lifecycle interception`) preserves upstream history, MIT license, exports, extension entry point, and all non-lifecycle execution ownership.
- **Narrow additive seam:** unpublished `@nklisch/pi-subagents@18.0.4-nklisch.0` adds the documented `registerLifecycleInterceptor()` provider API with immutable agent/session/run/type/parent identity; exact post-inheritance prompt replacement/abort; proposed-result replacement/abort; ordered async snapshots; idempotent unregistration; callback cancellation/error handling; a fixed three-round same-session continuation bound; and one-time provider disposal. The package keeps manager/session internals private. Tool/service, foreground/background, immediate/queued, initial/resume, and parent-present paths are covered; service parent identity is callback-only so no-interceptor child-session setup remains unchanged.
- **Local evidence:** Node `v24.17.0`; package typecheck, lint, and 65-file/986-test package suite pass. New real `SubagentSession` tests prove exact prompt and Pi EventEmitter completion order, start abort, completion cancellation/error, same-session bounded continuation, registration ordering/disposal, every execution-path category, and no-provider event ordering. `verify:public-types` packs `nklisch-pi-subagents-18.0.4-nklisch.0.tgz`, checks its exports and generated declarations, and type-checks an isolated consumer against that local tarball. The unchanged Plugin Host fake/conformance tests `test/contract/subagent-lifecycle.contract.test.ts` and `test/integration/subagent-lifecycle-port.test.ts` also pass (2 files, 11 tests); no Plugin Host production adapter or capability code changed.
- **Publication and integration status:** no push, release, registry login, registry query requiring credentials, publication, production dependency, production adapter, capability change, host policy, deep import, event approximation, package patch, or upstream PR was made. Local packed bytes are qualification evidence only and do not establish published provenance or production availability.

## Published registry qualification — 2026-07-18

### Immutable release and registry receipt

- **Registry:** [`@nklisch/pi-subagents@18.0.4-nklisch.0`](https://registry.npmjs.org/%40nklisch%2Fpi-subagents) resolves to the public tarball [`pi-subagents-18.0.4-nklisch.0.tgz`](https://registry.npmjs.org/@nklisch/pi-subagents/-/pi-subagents-18.0.4-nklisch.0.tgz). Both registry `latest` and `maintained` tags resolve to this version.
- **Tarball bytes:** 230,941 bytes; registry and locally computed SHA-1 are `58c9fed855d8f15c8c71353b4aa5cac59b98a691`; locally computed SHA-512 is `df743c2437df5d4ba24f53375e32d7088e087fda7edc03b0b14a7f6f97f5f81ed8e4923c67c49553e0e772ad2e9801b622381560a9d3f451d3a051cda19196a1`; registry and locally computed integrity are `sha512-33Q8JDffXUuiT1M3XjLXCI4If9p+3AOwsUp/b5f1+B7Y5JI8Z8SVU+Dncq0umAG2IjgVYKnT9FHToFHNoZGWoQ==`.
- **Release provenance:** [public release](https://github.com/nklisch/pi-packages/releases/tag/pi-subagents-v18.0.4-nklisch.0) `pi-subagents-v18.0.4-nklisch.0` is published, non-draft, and non-prerelease. Its annotated tag `ad55fae043abf87d4ec74a5cb0f2f8f17b1fb175` dereferences to `43efffb459f64e2f5f9aaee50d8ae5afa564f4f3`, and GitHub names `nklisch` as the release author. The commit's sole parent is the verified upstream base `c76a294a777a990950da23fc06cb0caf51da7ac6`.
- **Published manifest:** repository `git+https://github.com/nklisch/pi-packages.git` at `packages/pi-subagents`; MIT license; Node `>=22`; Pi AI, coding-agent, and TUI peers `>=0.75.0`; and exactly the root plus `./settings` exports. The root remains Pi's `./src/index.ts` extension entry point.

### Byte correspondence and ownership

- A fresh public GitHub tag archive was checked against the downloaded registry tarball. All 89 directly represented packed files match byte-for-byte. The two packed generated declarations are intentionally absent from the source checkout; rebuilding them from that public tagged checkout produced byte-identical `dist/public.d.ts` (`sha256:67a7342bfa5a18b2d4128c9410773fae98d99bea00de36bb5c198ac442714c6e`) and `dist/settings.d.ts` (`sha256:ccced8c757ae32e90f33cd5050a0b55d5dd2eb2195080a959cc803c3355b6f61`). Thus all 91 packed files correspond to the public tagged source or its deterministic declared build products.
- The verified base-to-release diff touches only `packages/pi-subagents/`: its documented lifecycle seam, service/manager/session/tool wiring, public type check, decision and maintenance documents, and lifecycle/service tests. It does not alter unrelated packages or an agent execution policy surface.
- `docs/FORK-MAINTENANCE.md` and ADR 0005 commit the maintained-fork responsibility: fork maintainers monitor upstream releases and security reports, rebase the narrow generic commit on a current verified upstream release, contribute the generic seam upstream when ready, and return to upstream by changing package selection only. The public repository and release are owned by `nklisch`; no credentials or publication action is needed by Plugin Host consumers.

### Isolated consumer and behavior qualification

- A newly created registry-only consumer installed the package with Pi AI, coding-agent, and TUI all pinned to **0.80.8**. Its lockfile records the exact tarball URL and the integrity above. A strict TypeScript consumer successfully imported the root lifecycle service/types and the `./settings` subpath.
- The same isolated installation loaded `src/index.ts` in real Pi 0.80.8 RPC mode and registered both public `subagents:settings` and `subagents:sessions` commands.
- The immutable tag's unchanged `test/lifecycle/lifecycle-interceptor.test.ts` was run against a byte-copy of the registry package source with Pi 0.80.8 peers: **1 file, 11 tests passed**. It covers tool/service, foreground/background, queued admission, initial/resume runs, start and completion cancellation, sequential prompt/result replacement, bounded same-session continuation, idempotent unregister/disposal, Pi EventEmitter completion ordering, and no-interceptor parity.
- Plugin Host remained at exact commit `de6c2ef780da4b749f791bbbe4533363ed2a912c` with no source or dependency edits. Its unchanged lifecycle conformance files, `test/contract/subagent-lifecycle.contract.test.ts` and `test/integration/subagent-lifecycle-port.test.ts`, passed: **2 files, 11 tests, no type errors**.

### Capability and release-note boundary

Plugin Host still has no `@nklisch/pi-subagents` dependency, production adapter, lifecycle capability change, deep import, event approximation, package patch, or upstream PR.
The portable probe consequently remains unavailable as required until the separately tracked production-adapter story validates and installs the published package.
This story is complete because publication and behavioral qualification are now immutable, not because Plugin Host has begun integration.

The release already exists, so no release note was amended from this story.
The tagged README and `docs/FORK-MAINTENANCE.md` still contain their pre-publication “unpublished” wording; that is a documentation caveat in otherwise immutable released bytes, not a reason to mutate this qualification-only commit.

### Next dependency

The published-fork gate is now satisfied for `epic-skills-hook-runtime-subagent-interception-production-adapter`.
That downstream work remains deliberately untouched; the generic upstream contribution remains sequenced after production integration.
