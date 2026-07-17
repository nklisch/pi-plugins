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
