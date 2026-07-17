---
id: epic-native-plugin-management-trusted-installation
kind: feature
stage: drafting
tags: [compatibility, security]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-inspection-diagnostics]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Trusted Configuration and Installation

## Brief

Deliver one transactional installation capability from an inspected marketplace candidate through configuration and trust to an exact activation result. The application flow exposes the signed-off three steps—choose and inspect, configure and trust, activation result—without embedding terminal widgets in application code.

Collect and validate plugin `userConfig`, route sensitive values through secret custody, resolve project trust where required, disclose the exact executable surface, acquire the selected immutable revision, and invoke the completed whole-plugin install transaction. Interactive callers may supply decisions through explicit callbacks; deterministic callers must provide all required decisions and values up front or receive a complete missing-input result without partial mutation.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Consumes the inspection/eligibility contract and packaged lifecycle/configuration/trust adapters.
- Owns installation preflight, configuration/trust request and response contracts, progress milestones, cancellation semantics, and the final operation result.
- Reuses `ConfigurationService`, `TrustService`, candidate preparation, source acquisition, `PluginLifecycleService.install`, recovery, and runtime observation. It does not add an install transaction or weaken compatibility.

## Capability boundaries

- Trust is keyed to the exact revision and executable surface. Changed skills, hook commands, MCP processes/endpoints, or subagent requirements invalidate stale approval and are shown before commitment.
- Configuration validation reports all actionable field errors deterministically. Sensitive values never appear in progress, results, diagnostics, command history, state, or generated runtime projections.
- Cancellation before commit leaves no authoritative install; cancellation or failure after an ambiguous boundary uses existing compensation/recovery evidence and never reports success by callback acceptance.
- Installation success requires exact independent runtime observation for the complete plugin. Unsupported production participants remain an unavailable capability, not a locally faked success.
- Repeated invocation is idempotent or returns a precise conflict/current-state result; no foreign registration or plugin file is mutated.
- Exact progress phases and result vocabulary are shared by the later deterministic facade and TUI.

## Mockup inheritance

The application flow must preserve the state transitions signed off in `.mockups/flows/plugin-install/`: `01-choose-inspect` → `02-configure-trust` → `03-activation-result`. Rendering, focus, and Pi theme use belong to `epic-native-plugin-management-pi-extension-manager`.
