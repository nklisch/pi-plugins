---
id: epic-mcp-runtime-integration-config-source-bridge-upstream-contribution
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: [epic-mcp-runtime-integration-config-source-bridge-production-adapter]
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
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

- [ ] A focused current-main PR is opened and linked here with immutable head/base commits.
- [ ] The PR preserves standalone file/CLI behavior and contains no Plugin Host-specific policy.
- [ ] Required source lifecycle semantics and tests are not split into an unusable partial API.
- [ ] The upstream-return checklist covers release qualification, dependency swap, fork deprecation, and rollback.

## Simplification opportunity

Upstream acceptance eventually deletes fork publication, security-rebase, and divergence overhead while leaving Plugin Host contracts unchanged.
