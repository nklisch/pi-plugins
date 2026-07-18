---
id: epic-mcp-runtime-integration-config-source-bridge-upstream-contribution
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: [epic-mcp-runtime-integration-config-source-bridge-production-adapter]
release_binding: 0.1.0
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Contribute the MCP Source Lifecycle Upstream

## Brief

After the maintained fork is integrated and proven against real Plugin Host activation, rebase the generic source-lifecycle commits onto current `nicobailon/pi-mcp-adapter` `main` and open a focused upstream pull request. Reference issue #85 and prior PR #56 as motivation and prior art, but submit a current implementation rather than extending the stale provider patch.

The contribution must be independently useful to other Pi extensions: no Plugin Host names, compatibility policy, state model, or fork-specific branches. Package-level tests document unchanged standalone behavior and the new programmatic contract.

## Delivery plan

1. Re-check contribution guidelines, current main, open issues/PRs, and API changes.
2. Extract or replay minimal generic commits from the proven fork.
3. Rebase and rerun upstream tests plus portable conformance.
4. Add public API docs, examples, migration/non-regression notes, and design rationale.
5. Open the PR, record its URL and exact head/base commits, and respond to review without weakening required semantics.
6. Track the first qualifying upstream release; when available, replace the fork dependency through the existing wrapper and rerun qualification.
7. Retire the fork only after released upstream bytes pass unchanged conformance and rollback proof.

## Acceptance

- [x] A focused current-main PR is opened and linked here with immutable head/base commits.
- [x] The PR preserves standalone file/CLI behavior and contains no Plugin Host-specific policy.
- [x] Required source lifecycle semantics and tests are not split into an unusable partial API.
- [x] The upstream-return checklist covers release qualification, dependency swap, fork deprecation, and rollback.

## Simplification opportunity

Upstream acceptance eventually deletes fork publication, security-rebase, and divergence overhead while leaving Plugin Host contracts unchanged.

## Upstream contribution opened — 2026-07-18

- Pull request: https://github.com/nicobailon/pi-mcp-adapter/pull/191 (`OPEN`, non-draft, clean merge state at submission).
- Title: `feat: add programmatic MCP source lifecycle`.
- Exact upstream base: `82724dccc13a49310530898f922bafff12b7f3fe` (`nicobailon/main`, also `v2.11.0`).
- Exact submitted head: `4f1a2af656f48581e0d9d8c9a5719e7dbf83fb55` (`nklisch:upstream/programmatic-source-lifecycle`).
- External worktree: `/tmp/pi-mcp-adapter-upstream-pr`, created directly from the fetched upstream base; external checkout and project worktree were clean after delivery.
- Focused commits: `66ad581` generic lifecycle and tests; `17a2c8e` package export/build/packed qualification; `4f1a2af` public rationale/example/changelog.

Current-main discovery found no `CONTRIBUTING.md`, `.github` contribution guide, pull-request template, branch protection, or repository ruleset. Issue #85 remains open. PR #56 remains open on a dirty stale provider branch, and PR #86 remains open on a dirty in-memory-overlay branch. The submitted PR acknowledges both prior approaches and provides a current-main complete lifecycle instead of depending on either stale head.

The upstream surface is deliberately package-generic: source identity is a caller-owned `id + revision`; server policy contains transport, timeout, and tool allow/deny facts; launch values and optional runtime leases are callback-scoped. It contains no Plugin Host state model, compatibility verdicts, package-fork metadata, maintenance policy, or product names. The complete public lifecycle ships together: initial sources, isolated file discovery, local validation, atomic compare-and-replace, exact removal, redacted inspection, cancellation, late launch values, lease draining, complete capabilities, and the source-qualified Pi gateway.

Default `pi-mcp-adapter` identity/version, `pi.extensions`, CLI bin, file precedence, commands, imports, direct tools, metadata-cache behavior, and ordinary Streamable HTTP-to-SSE fallback remain unchanged. The isolated factory performs no file/import/cache discovery; exact programmatic Streamable HTTP never falls back to SSE. Compiled root and `pi-mcp-adapter/programmatic` exports are packed and import-tested.

### Verification receipts

Node `v24.17.0`:

- `npm --prefix examples/interactive-visualizer run build` passed.
- `npm run typecheck` passed.
- `npm test` passed: 51 files / 457 tests.
- `npm run test:oauth-provider` passed: 30 tests.
- `npm run build` and direct compiled root/programmatic imports passed.
- `npm run test:package` passed against an isolated tarball consumer, including package identity/version, default Pi entry, exports, CLI, MIT license, and denied manager subpath.
- `npm pack --dry-run` passed with 143 files and all required source, declarations, runtime, docs/example, and license artifacts.
- The unchanged portable MCP lifecycle contract passed through a temporary adapter over the packed generic public API: 1 file / 1 contract test. The mapping used only generic source IDs/revisions and did not require an upstream policy branch.
- Focused Pi tests cover source-before-tool order, rapid session serialization, no-file/cache isolation, native-name collisions, exact replacement/removal, rollback, cancellation, redaction, late disposal, lease drain, stdio process-environment isolation, exact HTTP transport, and unchanged default-extension parity.

### Upstream-return checklist

- [ ] Respond to PR #191 review and keep its base current without weakening exact ownership, redaction, cancellation, or default-behavior guarantees.
- [ ] Wait for a merged upstream commit and a published `pi-mcp-adapter` release containing the documented `./programmatic` export; an open PR or commit-only dependency does not qualify.
- [ ] Record the release version, immutable tag/commit, npm `gitHead`, registry integrity, publication time, and shipped MIT license before changing production selection.
- [ ] Install exact registry bytes in a clean consumer and rerun the unchanged portable conformance contract plus Node 24 package/CLI/export, real Pi ordering/isolation, cancellation, redaction, late-value disposal, and rollback qualification.
- [ ] If qualification passes, switch only the concrete package dependency/wrapper from the maintained fork to upstream; keep all Plugin Host application/domain/lifecycle contracts unchanged.
- [ ] If qualification or rollout fails, restore the currently pinned fork bytes and fail closed to unavailable MCP capability rather than introducing a deep import, settings/file mutation, or process-global workaround.
- [ ] Deprecate and archive the maintained fork only after released upstream bytes pass production qualification and a dependency rollback rehearsal; retain the fork/tag long enough to execute that rollback.

## Implementation notes

- Execution capability: GPT-5.6 Sol direct cohesive story ownership; one external package worktree and one project item transition were kept in a single context, with nested agents/refactors prohibited by the caller.
- Review weight: standard by project convention; this child story advances directly to `done`, and the caller explicitly leaves independent review to the feature orchestrator.
- Files changed: external upstream branch only (`programmatic*.ts`, the minimal manager seam, focused tests, package export/build qualification, README/example/changelog) plus this story and the parent feature stage/evidence.
- Tests added: source lifecycle/ordering/default-parity tests, resolved stdio/HTTP manager tests, manifest/packed export tests, and temporary unchanged portable conformance. They protect the public lifecycle, compatibility boundary, cancellation, and secret redaction.
- Simplification: removed fork/package-specific identity and maintenance metadata from the contribution; replaced the host-shaped source model with generic `id + revision` ownership and optional leases; exposed no manager internals.
- Discrepancies from design: the generic upstream source shape is intentionally smaller than the maintained fork shape, so a future return-to-upstream wrapper maps package-neutral host identity/projection evidence into generic source IDs/revisions. Lifecycle semantics remain complete and passed unchanged portable conformance.
- Adjacent issues parked: none.
