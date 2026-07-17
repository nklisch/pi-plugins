---
id: epic-mcp-runtime-integration-config-source-bridge-maintained-fork
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: [epic-mcp-runtime-integration-config-source-bridge-capability-probe, epic-mcp-runtime-integration-config-source-bridge-conformance-suite]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Establish the Maintained MCP Adapter Fork

## Brief

Create and publish a narrowly maintained MIT fork of `pi-mcp-adapter`, based on the current verified upstream release history, that exposes the package-neutral programmatic source lifecycle already defined by Plugin Host. The planned repository/package identities are `nklisch/pi-mcp-adapter` and `@nklisch/pi-mcp-adapter`; registry and repository ownership must be verified before publication.

The fork retains every ordinary upstream extension/CLI behavior when the new API is unused. Its only behavioral addition is the generic exported source lifecycle: initial sources before tool registration, optional file-discovery isolation, atomic compare-and-replace, exact removal, redacted inspection, complete capabilities, cancellation, and callback-scoped launch values. It does not add Plugin Host policy or fork MCP transport, authentication, discovery, elicitation, sampling, caching, process, or UI behavior.

## Strategic decision

The operator authorized the maintained-fork fallback on 2026-07-16. This supersedes the wait-only posture but does not weaken qualification: an unpublished local patch cannot make production capability available.

## Implementation plan

1. Fork from verified upstream `pi-mcp-adapter@2.11.0` / commit `82724dccc13a49310530898f922bafff12b7f3fe`, then re-check upstream latest before implementation and rebase if appropriate.
2. Preserve full history, copyright, MIT license, notices, extension entry, CLI, file-config behavior, and no-programmatic-source parity.
3. Add a documented typed export for the generic source lifecycle without exposing manager internals.
4. Implement source-qualified tool/cache/process/status identity and the exact lifecycle semantics from the committed host port.
5. Port package-level tests and run the unchanged Plugin Host conformance suite plus Pi construction-order, file-isolation, cancellation, redaction, Node 24, and package-export tests.
6. Publish an exact pinned version with npm integrity, repository commit, upstream base, license, engines, and Pi compatibility evidence.
7. Document maintainers, namespace credentials, security intake, upstream release monitoring, rebase cadence, and emergency rollback.

## Acceptance

- [ ] Ordinary upstream file/CLI behavior is byte- or behavior-parity tested when the new API is unused.
- [ ] Only the narrow generic source lifecycle and its tests differ from upstream policy.
- [ ] The unchanged host conformance suite and real Pi ordering/isolation tests pass.
- [ ] The published package has immutable version/integrity/repository/upstream-base/license provenance.
- [ ] Security/rebase ownership and an upstream-return checklist are committed.
- [ ] No Plugin Host production capability changes until the published bytes pass qualification.

## Simplification opportunity

One generic source seam replaces file generation, settings mutation, process-global secret injection, manager deep imports, and any need for an MCP SDK reimplementation.

## Pre-publication implementation checkpoint — 2026-07-17

The maintained fork is fully implemented and locally qualified up to the explicit publication/push boundary. This story intentionally remains `stage: implementing`: local commits and tarballs are not published provenance and do not unblock the production-adapter child.

### Verified base and external repository

- External checkout: `/home/nathan/dev/pi-mcp-adapter`
- Branch: `autopilot/programmatic-source-lifecycle`
- Upstream remote: `https://github.com/nicobailon/pi-mcp-adapter.git` as `upstream`; no fork `origin` was fabricated.
- Rechecked npm `latest`: `pi-mcp-adapter@2.11.0`, npm `gitHead` `82724dccc13a49310530898f922bafff12b7f3fe`.
- Rechecked GitHub release: `v2.11.0`; rechecked upstream `main`: `82724dccc13a49310530898f922bafff12b7f3fe`; `v2.11.0...main` is identical (zero commits ahead/behind).
- Exact base: `82724dccc13a49310530898f922bafff12b7f3fe`. No rebase was appropriate because the current release, tag, npm bytes, and upstream main still share that commit.
- Generic lifecycle commit: `e46e7ae5a09094cacbc0c044eba1db6c75e796cc` (`feat: add programmatic source lifecycle`).
- Package/maintenance qualification commit: `1c1cd71fd069bc65cc06bf49399d83ff9e3d008b` (`build: qualify maintained fork package`).
- Base remains an ancestor of both commits; upstream history, Nico Bailon's authorship, MIT `LICENSE`, changelog, README content, CLI, Pi extension entry, and file-config runtime remain present.

### Implemented boundary

- Added only the documented `@nklisch/pi-mcp-adapter/programmatic` source lifecycle and the minimal internal manager options it needs.
- Initial registrations are synchronously validated/stored before the returned extension can register Pi tools; isolated mode does not invoke file/import discovery or the shared metadata cache.
- Source ownership is exact `scope + plugin + revision + projectionDigest`; replacement is compare-and-replace, removal is exact/idempotent, and colliding native names remain isolated.
- Process and in-memory tool/cache identity use the exact source plus source-local server key; inspection is sorted, source-qualified, JSON-safe, and definition/value/cause-free.
- Callback values resolve only at immediate launch/connect, bypass process-environment interpolation, are disposed on success/failure/cancellation, and are not retained in status/cache/diagnostics. Runtime leases drain before replacement/removal publication.
- Programmatic Streamable HTTP is exact and cannot silently become legacy SSE. File-config HTTP keeps upstream fallback behavior.
- Capability reporting is complete and environment-aware, including explicit false values for unsupported client-credentials OAuth, approval, and plugin alias behavior.
- Package exports expose only the compiled extension and programmatic lifecycle; manager deep imports are blocked. The existing CLI and default extension remain available.
- No Plugin Host policy/state, production adapter, MCP SDK/transport/auth reimplementation, generated settings/files, or process-global secret workaround was added.

### Local qualification receipts

All commands ran on Node `v24.17.0` from the external branch after a clean dependency/example-fixture setup:

- `npm run typecheck && vitest run`: **51 test files, 451 tests passed**. This includes the complete upstream suite plus source ordering, no-source/default parity, disabled file/cache discovery, exact CAS/removal/isolation, cancellation queue recovery, redaction, late disposal/leases, exact HTTP transport, resolved stdio environment, and package-manifest tests.
- `npm run test:package`: passed against a freshly packed tarball installed in an isolated consumer; Node 24 imported both documented exports, the CLI help executed, the MIT license/notices were present, and manager subpath import failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- `PLUGIN_HOST_ROOT=/tmp/pi-plugins-mcp-fork-owner npm run test:host-conformance`: the committed Plugin Host `test/contract/mcp-runtime.contract.ts` ran unchanged against an adapter importing only the locally packed package; **1 conformance test passed**.
- `npm pack --dry-run`: passed; local candidate `@nklisch/pi-mcp-adapter@2.11.0-nklisch.0`, 143 files, 1.5 MB packed/2.5 MB unpacked, MIT `LICENSE` included.
- Latest local tarball receipt (qualification evidence only, not registry provenance): shasum `4f810535dbe25bcc1e683913931ab6c625b625a2`, integrity `sha512-kkMQwrNbggAhSCJCJUxVLKKiMswKjYaEbOLNSZrZlYY2teoxrtKld2+3MQpvsHDJYFypi1PPHuAS2YC/0z+7tg==`.
- External checkout is clean on `autopilot/programmatic-source-lifecycle` after the two commits (ignored build/dependency fixtures only).

### Genuine remaining blocker and operator actions

Current immutable-publication checks still fail by design: `https://github.com/nklisch/pi-mcp-adapter` returns GitHub 404, `@nklisch/pi-mcp-adapter` returns npm 404, npm is unauthenticated for this run, and push/publication/release were explicitly prohibited. The exact remaining actions are:

1. Create `nklisch/pi-mcp-adapter` as a real GitHub fork with full history, configure repository/security ownership, retain `nicobailon/pi-mcp-adapter` as `upstream`, and add the fork as `origin`.
2. Review the two generic commits, choose the immutable release version (the local candidate is `2.11.0-nklisch.0`), push this branch/release commit, and create an annotated GitHub tag without rewriting history.
3. Authenticate an authorized maintainer for the `@nklisch` npm scope, verify package ownership, and publish the exact reviewed tarball with public access. Do not claim npm provenance unless the registry actually issues it.
4. Record immutable GitHub commit/tag objects plus npm version, publication time, tarball URL, `gitHead`, registry `sha512` integrity, upstream base, and shipped `LICENSE` digest.
5. Install the exact registry version in a fresh consumer and rerun the upstream suite, Node 24 package/CLI/export checks, Pi construction-order/file-isolation/cancellation/redaction tests, and unchanged Plugin Host conformance. Compare the registry integrity to the recorded npm receipt.
6. Only after step 5 is green may this story advance to `done` and `epic-mcp-runtime-integration-config-source-bridge-production-adapter` begin against published pinned bytes. The upstream-contribution child remains transitively blocked behind that real production integration.

### Implementation notes

- Execution capability: GPT-5.6 Sol direct sequential feature ownership; no nested agents or peer mechanisms, per caller instruction.
- Review weight: not entered; the caller required a hard stop at genuine publication dependency with this child and its dependents still implementing/blocked.
- Project files changed: this maintained-fork story only. No Plugin Host production source, manifest, lockfile, capability composition, other substrate item, or `.work/bin/work-view` change.
- Adjacent issues parked: none.
