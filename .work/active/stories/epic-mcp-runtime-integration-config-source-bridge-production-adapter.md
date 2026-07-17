---
id: epic-mcp-runtime-integration-config-source-bridge-production-adapter
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: [epic-mcp-runtime-integration-config-source-bridge-capability-probe, epic-mcp-runtime-integration-config-source-bridge-conformance-suite, epic-mcp-runtime-integration-config-source-bridge-maintained-fork]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Integrate a Qualifying Production MCP Adapter Package

## Priority

Critical for production activation and feature/epic closure. The operator authorized the maintained-fork path on 2026-07-16; this story is now sequenced behind the fork-publication story rather than waiting indefinitely for upstream.

## Selected package path

`pi-mcp-adapter@2.11.0`, release/main commit `82724dccc13a49310530898f922bafff12b7f3fe`, lacks the required source lifecycle. Implement and qualify the planned `@nklisch/pi-mcp-adapter` fork in `epic-mcp-runtime-integration-config-source-bridge-maintained-fork`, then integrate only its published, pinned, conformance-passing API here. After real integration passes, `epic-mcp-runtime-integration-config-source-bridge-upstream-contribution` opens a generic current-main upstream PR and tracks return to upstream.

Do not add a deep import, package patch, file/settings/process-global workaround, MCP SDK runtime, unpublished fork dependency, or unverified production capability.

## Objective unblock criteria

One path must satisfy every criterion before implementation begins.

### Upstream release

1. A published npm release—not an open PR or commit dependency—documents an `exports` subpath with types for initial programmatic sources, disabled file discovery, complete source validate/replace/remove/inspect/capabilities, cancellation, and late launch values.
2. It passes the shared Plugin Host conformance suite plus Pi integration tests proving initial sources are accepted before tool registration, construction/validation have no side effects, file/import discovery is fully disabled, and local registration is offline-safe.
3. Exact npm version and lockfile integrity are pinned and linked to immutable upstream tag/commit provenance.
4. MIT licensing and shipped notice are verified.
5. Node 24 and the project's Pi version pass package/API tests without deep imports or ambient global setup.

### Maintained MIT fork fallback

1. Plugin Host maintainers explicitly decide to publish a clearly named fork from a current verified upstream release, retain upstream history/copyright/license, and name owners for publishing, security updates, and upstream rebases.
2. The fork contains only the narrow identical public source-lifecycle seam and tests; transport/auth/discovery policy does not diverge and Plugin Host application/domain/lifecycle code contains no fork branch.
3. Exact package version, registry integrity, repository commit, upstream base commit, and license provenance are pinned.
4. The unchanged conformance suite and all Pi factory-order/file-isolation, cancellation, redaction, Node 24, and package-export tests pass.
5. Returning to upstream requires changing only the package selection/wrapper, not Plugin Host contracts.

## Blocker ownership

- Upstream maintainers own merge/release timing.
- Plugin Host maintainers own a current contract-focused upstream contribution, release qualification, and the explicit fork fallback go/no-go.
- If forked, Plugin Host maintainers own package namespace/credentials, MIT notices, security/rebase maintenance, provenance pinning, and conformance evidence.
- No agent may represent an unsubmitted/unmerged PR, unpublished fork, or local patch as satisfying this gate.

## Deliverable after unblock

Implement the sole concrete package wrapper and package-selection composition. The wrapper translates the qualifying package's supported API into `McpRuntimePort`, validates every handoff, maps unexpected failures to redacted `BoundaryError`, and never leaks package identity into application/domain/lifecycle contracts.

## Planned files after unblock

- `src/runtime/mcp/pi-mcp-adapter-runtime.ts`
- `src/composition/create-mcp-runtime.ts`
- `test/integration/pi-mcp-adapter-runtime.test.ts`
- `test/contract/pi-mcp-adapter-runtime.contract.test.ts`
- `package.json`
- `package-lock.json`

## Factory checkpoint

```typescript
// Package-internal. Factory creation and validation are side-effect-free.
export function createPiMcpRuntime(input: Readonly<{
  initialSources: readonly Readonly<{
    source: McpConfigSource;
    launchValues: McpLaunchValueProvider;
  }>[];
  fileDiscovery: "disabled";
}>): Readonly<{
  extension: (pi: ExtensionAPI) => void;
  runtime: McpRuntimePort;
}>;
```

Initial sources are supplied before invoking the returned Pi extension. The factory itself performs no file reads, networking, process startup, remote connection, cache write, or tool registration. Runtime registration proves local source/inventory acceptance only; remote health remains per-server status.

## Acceptance evidence

- [ ] The pinned supported package passes the unchanged portable conformance contract.
- [ ] Pi integration proves source-before-tool-registration and complete native file/import isolation without mutating files, settings, arguments, or process environment.
- [ ] Colliding native server keys remain isolated across plugin/scope through real tool/cache/process/status identity.
- [ ] Real replacement/removal/cancellation preserve exact ownership and old-source rollback evidence.
- [ ] Late callback values are consumed only immediately before launch/connect and disposed on every outcome; canaries never enter status/errors/log fixtures.
- [ ] Only a passing package changes `pi.mcp.runtime` from unavailable; fake success alone never claims production activation.

## Ordering

Depends on:
- `epic-mcp-runtime-integration-config-source-bridge-capability-probe`
- `epic-mcp-runtime-integration-config-source-bridge-conformance-suite`
- `epic-mcp-runtime-integration-config-source-bridge-maintained-fork`

Portable sibling features may design and implement against the contract/fake without this story. This story remains required for production lifecycle proof, this feature's completion, and parent-epic closure.

## Risk and rollback

The highest risk is a package whose TypeScript shape looks sufficient while tool/cache/process ownership or eager behavior violates semantics. The conformance and Pi-specific integration tests are the gate. Rollback removes the concrete dependency/wrapper and selects no runtime, making all MCP facts unavailable while preserving portable contracts and authoritative plugin state. File/settings/global workarounds are not rollback options.

## Blocker re-verification

Reverified for this partial implementation against the committed research evidence for npm `pi-mcp-adapter@2.11.0`, GitHub release `v2.11.0`, and upstream `main`, all pinned to `82724dccc13a49310530898f922bafff12b7f3fe`:

- The published package is a Pi extension package with `pi.extensions: ["./index.ts"]` and no documented `exports`, `main`, or `module` library entry. Its `loadMcpConfig`/`initializeMcp` path performs file discovery and direct/proxy tool registration around extension construction/session startup.
- No supported exported source lifecycle exists for initial source injection before tool registration, disabled file/import discovery, complete source validation, atomic replace, exact removal, source-qualified redacted inspection, complete capability facts, cancellable source lifecycle, or source-scoped late launch-value callbacks with mandatory disposal.
- Existing `McpServerManager` and configuration helpers are implementation internals; using them would require a deep import and would not supply the missing ownership, atomicity, registration-order, or secret-custody semantics.
- Upstream issue #85 remains an unmerged request, and PR #56 remains an open stale/dirty, semantically incomplete provider proposal. No maintained qualifying fork is declared or published in this repository.

No objective unblock criterion is met. The story remains `stage: implementing` and the exact unblock gate is unchanged: either a published MIT upstream release with a documented package export and all required lifecycle/cancellation/redaction/timing semantics, pinned with registry integrity and immutable provenance, or an explicitly selected, published, maintained MIT fork from a verified current upstream base with the identical API, ownership, security/rebase responsibility, pins, license evidence, unchanged conformance/Pi integration/Node 24 test evidence, and an upstream return path. Until then, production MCP availability remains fail-closed/unavailable and no adapter implementation is honest.

## Implementation notes

- Execution capability: Luna xhigh; blocker verification only. No production source, dependency, package patch, deep import, external PR claim, fork publication, or workaround was added.
- Review weight: standard by project convention; no feature review or production-story review was run because the caller explicitly required the feature and production story to remain implementing.
- Files changed: this item and its parent feature body only for the blocker record and partial implementation evidence.
- Verification: the package-independent bridge/fake/conformance work passed the full `npm test`; production qualification remains unrun because the objective external gate is unmet.
- Adjacent issues parked: none.
