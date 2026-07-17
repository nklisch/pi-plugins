---
id: epic-native-plugin-management-production-runtime-acceptance
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-clean-environment-core-e2e, epic-mcp-runtime-integration-config-source-bridge-production-adapter, epic-mcp-runtime-integration-lifecycle-reconciliation, epic-skills-hook-runtime-subagent-interception-production-adapter]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Production Runtime Packaging and Acceptance

## Brief

Close the production-only package boundary after the authorized maintained MCP and subagent adapter features are complete. Pin and compose their published production adapters into the Pi extension, qualify them through the existing package-neutral conformance contracts, and run the full clean-environment acceptance path with no Claude or Codex installation.

This capability proves that plugins containing supported skills, ordinary and subagent hooks, and MCP servers install and move through enable, disable, update, rollback/recovery, and uninstall as one observed bundle. It is intentionally downstream of locally implementable composition and core acceptance so maintained-fork publication cannot block the rest of native management work.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- External gates: the MCP configuration-source production-adapter story, MCP lifecycle reconciliation feature, and subagent interception production-adapter story. Upstream-contribution follow-up is not an acceptance prerequisite once the authorized maintained forks are published and qualified.
- Owns pinned production dependency wiring, package-level adapter selection, final capability qualification, and production clean-environment evidence.
- The sibling runtime features own adapter/fork implementation and upstream contributions. This feature must not copy their code, expand their APIs, or substitute a test fake for production proof.

## Acceptance boundary

- The packed extension installs into an empty environment using only declared production dependencies; no Claude/Codex binary, settings directory, plugin cache, or global package is consulted.
- Startup capability probes report the pinned adapter facts truthfully and reject unsupported version/API drift before plugin activation.
- Full-bundle install/update/disable/uninstall proves exact skill/hook/MCP contribution observation and rollback/recovery behavior through the existing lifecycle contract.
- Subagent pre-start context injection and pre-stop continuation run through the production interception boundary; unsupported interception remains incompatible rather than observationally approximated.
- MCP source registration, launch-time value delivery, identity/provenance, aliases, offline local registration, failure isolation, and exact source removal pass the existing conformance and redaction expectations.
- Packaging and tests preserve the replaceability of maintained forks: an upstream release may replace a fork only after the same capability probes and conformance suite pass, without changing the domain or management facade.

## Mockup inheritance

No new visual design is introduced. Final acceptance drives the already signed-off manager and install-flow states and verifies production results/diagnostics are rendered through the same thin facade mapping.
