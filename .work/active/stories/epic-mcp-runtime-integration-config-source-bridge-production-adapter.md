---
id: epic-mcp-runtime-integration-config-source-bridge-production-adapter
kind: story
stage: done
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
updated: 2026-07-18
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

- [x] The pinned supported package passes the unchanged portable conformance contract.
- [x] Pi integration proves source-before-tool-registration and complete native file/import isolation without mutating files, settings, arguments, or process environment.
- [x] Colliding native server keys remain isolated across plugin/scope through real tool/cache/process/status identity.
- [x] Real replacement/removal/cancellation preserve exact ownership and old-source rollback evidence.
- [x] Late callback values are consumed only immediately before launch/connect and disposed on every outcome; canaries never enter status/errors/log fixtures.
- [x] Only a passing package changes `pi.mcp.runtime` from unavailable; fake success alone never claims production activation.

## Ordering

Depends on:
- `epic-mcp-runtime-integration-config-source-bridge-capability-probe`
- `epic-mcp-runtime-integration-config-source-bridge-conformance-suite`
- `epic-mcp-runtime-integration-config-source-bridge-maintained-fork`

Portable sibling features may design and implement against the contract/fake without this story. This story remains required for production lifecycle proof, this feature's completion, and parent-epic closure.

## Risk and rollback

The highest risk is a package whose TypeScript shape looks sufficient while tool/cache/process ownership or eager behavior violates semantics. The conformance and Pi-specific integration tests are the gate. Rollback removes the concrete dependency/wrapper and selects no runtime, making all MCP facts unavailable while preserving portable contracts and authoritative plugin state. File/settings/global workarounds are not rollback options.

## Published package qualification and implementation — 2026-07-18

The maintained-fork gate is satisfied by exact public registry bytes:

- Package: `@nklisch/pi-mcp-adapter@2.11.0-nklisch.0` from the npm registry.
- npm integrity: `sha512-kkMQwrNbggAhSCJCJUxVLKKiMswKjYaEbOLNSZrZlYY2teoxrtKld2+3MQpvsHDJYFypi1PPHuAS2YC/0z+7tg==`; SHA-1 `4f810535dbe25bcc1e683913931ab6c625b625a2`.
- Fork commit: `1c1cd71fd069bc65cc06bf49399d83ff9e3d008b`; annotated tag object `39c0c367db35ecb125b05ad0b9b639bc6b09b97d`; upstream base `82724dccc13a49310530898f922bafff12b7f3fe`.
- Package export: documented `@nklisch/pi-mcp-adapter/programmatic`; manager/deep subpaths are denied by `exports`.
- License: MIT, shipped `LICENSE` SHA-256 `2d20dfacd9742706e564470dc77438608a1e54b0ed46959f080709389209093c`.

Implementation installs the exact dependency and confines it to `src/runtime/mcp/pi-mcp-adapter-runtime.ts`. The wrapper translates every `McpRuntimePort` input, callback, result, capability, status, compare-and-replace, and removal handoff through Plugin Host schemas; preserves exact abort reasons; retains plaintext launch values and runtime leases only in caller-owned weak custody; and maps unexpected package/schema drift to static redacted `BoundaryError` evidence. No application, domain, lifecycle, or public package contract names the fork.

`createProductionMcpRuntimeCandidate()` selects one isolated empty candidate for packaged Pi composition. The adapter extension attaches before host startup so environment-aware facts exist when the existing central `qualifyRuntimeParticipants()` authority runs. Only complete published-package evidence admits the runtime; malformed or incomplete facts remain unavailable. Initial composition is empty so existing full-bundle desired-state reconstruction and reconciliation remain the sole production source-publication authority.

### Verification evidence

- Unchanged portable conformance passed directly against the concrete registry-backed wrapper.
- Focused production tests passed: 5 tests covering package provenance/exports/license, side-effect-free factory and validation, source-before-tool order, complete file/import/cache isolation, exact capability selection and fail-closed drift, source-key collisions, real standard-I/O process/tool/status isolation, replacement, exact/idempotent removal, cancellation, rollback, offline registration, late-value disposal, lease cleanup, and redaction/non-retention.
- Full `npm test` passed: typecheck; 418-module / 2,980-edge dependency boundaries; 328 Vitest files / 1,600 tests with no type errors; build; exact 847 root exports and 3 Pi exports; isolated packed real Pi 0.80.8 RPC/JSON/PTY acceptance.
- `npm run test:e2e:infrastructure` passed: 1 file / 2 tests against an offline clean packed consumer and exact Pi 0.80.8.
- `npm run build`, exact package manifest/lock integrity probe, MIT digest probe, documented-export import, and manager-subpath rejection passed on Node 24.17.0.

## Implementation notes

- Execution capability: GPT-5.6 Sol, direct cohesive story ownership; the concrete package boundary and its real-process qualification required one context and the caller prohibited nested agents.
- Review weight: standard by project convention; review is not applicable to this child-story checkpoint, which advances directly to `done` on green verification.
- Files changed: exact package manifest/lock; sole runtime wrapper; existing MCP composition/Pi extension selection; dependency boundary; focused conformance/integration fixtures; packed/clean acceptance assertions; this item and parent evidence.
- Tests added: unchanged concrete conformance registration, real registry/Pi/process lifecycle integration, and one plain JSON-RPC standard-I/O fixture. Existing package/extension/E2E acceptance was tightened to require the production candidate.
- Simplification: no file/settings/argument/environment path, package policy branch, manager deep import, MCP SDK runtime, transport/auth duplication, or second projection/reconciliation authority was introduced.
- Discrepancies from design: the implemented initial-source shape follows the feature's current complete contract (`registration`, `launchValues`, and `runtimeLeases`), which supersedes the older abbreviated factory sketch.
- Adjacent issues parked: none.
