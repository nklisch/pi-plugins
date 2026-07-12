---
id: epic-mcp-runtime-integration
kind: epic
stage: drafting
tags: [compatibility, infra]
parent: null
depends_on: [epic-transactional-plugin-lifecycle]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# MCP Runtime Integration

## Brief

This epic activates plugin-bundled MCP servers through a dedicated Pi MCP runtime without reimplementing transport, authentication, discovery, elicitation, sampling, or process management. It defines and realizes the plugin-scoped configuration-source contract between Plugin Host and the MCP implementation.

The capability includes Claude and Codex MCP configuration normalization, server namespacing, foreign tool aliases, plugin root/data and user-configuration substitution, runtime capability validation, lifecycle reconciliation, provenance, and collision-free removal. The integration resolves the upstream-versus-maintained-fork boundary while keeping the application domain independent of either implementation.

This epic does not install plugins or provide the plugin management interface. MCP declarations that require unsupported transport or authentication semantics remain incompatible before activation.

## Foundation references

- `docs/VISION.md` — Product promise, Compatibility boundary
- `docs/SPEC.md` — MCP servers, Enablement, Trust and security
- `docs/ARCHITECTURE.md` — MCP adapter, Runtime projections, Alternatives rejected
- `docs/COMPATIBILITY.md` — MCP configuration shapes, MCP server compatibility, MCP identity and tool names

## Anticipated child features

- research-backed MCP registration and configuration-source contract
- Claude and Codex MCP declaration normalization
- plugin-scoped server identity, provenance, and collision handling
- plugin path, data, environment, header, and user-config substitution
- foreign MCP tool-name compatibility aliases
- runtime capability and authentication requirement validation
- activation, reload, disable, update, and uninstall reconciliation
- upstream adapter contribution or narrow maintained fork packaging

<!-- The design pass on each child feature will fill in real specifics. -->

## Design decisions

- **Alignment status**: No unresolved high-level choices surfaced. The foundation documents already require a narrow plugin-scoped MCP runtime port, server namespacing, foreign tool aliases, late secret substitution, capability validation before activation, and an upstream-first integration with a maintained narrow fork only when necessary. The concrete adapter contract requires feature-level research against the then-current MCP runtime API.
- **Discovery posture**: Direct-read only — no implementation exists to map, and the architecture isolates this epic cleanly behind `McpRuntimePort`.
