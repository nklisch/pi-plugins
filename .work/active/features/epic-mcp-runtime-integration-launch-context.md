---
id: epic-mcp-runtime-integration-launch-context
kind: feature
stage: drafting
tags: [compatibility, infra, security]
parent: epic-mcp-runtime-integration
depends_on: [epic-mcp-runtime-integration-config-source-bridge]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Trusted MCP Launch Context and Secret Delivery

## Brief

Supply the MCP runtime with trusted, short-lived launch context for plugin servers. At the immediate standard-I/O process-launch or remote-connection boundary, resolve logical plugin content/data references to runtime roots, verify project scope and project-root trust, resolve the exact configuration document through the existing callback-scoped configuration service, and substitute supported plugin paths and `${user_config.KEY}` values into command, arguments, environment, working directory, URL, headers, and bearer-token references.

Sensitive configured values, bearer material, and environment-backed headers exist only inside the callback that the MCP runtime immediately consumes. They never enter generated projections, registered source descriptors, status, provenance, reload observations, diagnostics, logs, or caches; the resolved facade is disposed on success, failure, cancellation, and partial launch. Missing required credentials, trust loss, path drift, adapter failure, or abort fail closed with redacted evidence, while runtime-owned process/connection cleanup remains cancellable and explicit.

This feature does not implement MCP transports, OAuth, process supervision, HTTP clients, or tool discovery; those remain in the selected MCP runtime. It also does not create or compose state, credential, configuration-path, project-root, or recovery adapters, change trust policy, mutate authoritative state, coordinate lifecycle transitions, or render configuration prompts; concrete host composition remains in `epic-native-plugin-management`.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: trusted execution-context capability consuming the bridge's late-value boundary; it can proceed in parallel with plugin projection work
- Depends on: `epic-mcp-runtime-integration-config-source-bridge`
- Design alignment: preserve the parent epic's trust authority, secret timing, project boundary, cancellation, cleanup, and redaction decisions

## Boundary guardrails

- Reuse `withResolvedPluginConfiguration`, `ResolvedConfiguration`, content/data root resolution, `ProjectTrustPort`, and project-root authority; do not create MCP-specific secret storage or trust evaluation.
- Keep all registered/prepared source values unexpanded. Plaintext is resolved only when the runtime is about to consume it for one process launch or remote connection.
- Project-scoped launches require the exact trusted project identity/root; user-scope authority cannot substitute for project trust.
- Abort propagates through resolution and runtime handoff. Any started process/session or callback-held value is cleaned up or reported as an explicit ambiguous/cleanup failure, never silently leaked.
- Runtime errors remain safely attributable to plugin/server provenance without copying secret-bearing commands, URLs, headers, or environment values into diagnostics.

## Simplification opportunity

- Reuse one existing callback-scoped configuration and secret-custody path across hooks and MCP instead of creating a second expansion engine.
- Resolve logical content/data references at the adapter edge instead of persisting physical paths or generating per-machine MCP files.
- Keep process and remote-session lifecycle in the MCP runtime; Plugin Host supplies trusted context rather than wrapping or duplicating transport behavior.

## Foundation references

- `docs/VISION.md` — Explicit trust; Standalone operation
- `docs/SPEC.md` — Supporting plugin configuration; MCP servers; Trust and security; Enablement
- `docs/ARCHITECTURE.md` — Runtime projections; Trust flow; MCP adapter
- `docs/COMPATIBILITY.md` — Supporting plugin configuration; Plugin path environment; MCP server compatibility

## UI alignment

No UI surface and no mockups. Configuration/trust collection and status presentation belong to `epic-native-plugin-management`.

<!-- The feature-design pass will fill in interfaces, signatures, implementation units, and verification. -->
