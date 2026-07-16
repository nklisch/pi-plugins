---
id: epic-mcp-runtime-integration-config-source-bridge
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration
depends_on: []
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Plugin-Scoped MCP Configuration-Source Bridge

## Brief

Establish the narrow integration contract through which Plugin Host contributes a complete plugin-scoped MCP configuration source before MCP tool registration, reports the selected runtime's exact capabilities, inspects registered source/server status, and removes only the source it owns. The capability includes grounded verification of the then-current `pi-mcp-adapter` API, an upstream contribution where feasible, and packaging a narrowly maintained fork only when the required source contract cannot land upstream in time.

The bridge preserves the compatibility boundary: standard I/O and Streamable HTTP are eligible when runtime facts satisfy their requirements; explicit legacy SSE and WebSocket do not become supported merely because an implementation can approximate them. Transport, authentication, discovery, elicitation, sampling, process ownership, and tool registration remain MCP-runtime responsibilities.

This feature does not translate a particular plugin bundle, expand configured values or secrets, orchestrate install/update transactions, render status, or own authoritative plugin state. Domain and lifecycle callers depend on stable Plugin Host ports and capability facts, never directly on the upstream-versus-fork package choice.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: foundation capability; plugin projection and trusted launch-context work consume the verified source contract in parallel
- Depends on: none within this epic; the parent already depends on the completed transactional lifecycle
- Design alignment: preserve the parent epic's external integration, configuration-source, transport, trust, cancellation, and offline-startup decisions

## Boundary guardrails

- Verify current upstream behavior before selecting contribution or fork packaging; do not guess an API from foundation prose.
- A source is qualified by scope, plugin, revision/projection evidence, and can be inspected and removed without global-name matching.
- Capability reporting feeds the existing `RuntimeCapabilityProbe`; the adapter does not issue component verdicts or redefine compatibility policy.
- Source registration and structural validation are local and cancellable. They do not require network reachability or eager server startup.
- Status, errors, and provenance must be safe to serialize and must not contain expanded configuration, credentials, bearer material, or native causes.

## Simplification opportunity

- Replace settings-file mutation, per-server global registration, and any temptation to reimplement MCP with one plugin-scoped source adapter over the dedicated runtime.
- Keep the upstream and fork paths contract-identical so package selection does not leak conditional branches through application or domain code.
- Reuse the existing capability registry and error boundary rather than adding adapter-specific verdict or transport vocabularies.

## Foundation references

- `docs/VISION.md` — Standalone operation; Honest compatibility; Native Pi experience
- `docs/SPEC.md` — MCP servers; Component compatibility verdicts; Performance and availability
- `docs/ARCHITECTURE.md` — MCP adapter; Alternatives rejected; Pi integration
- `docs/COMPATIBILITY.md` — MCP server compatibility; MCP configuration shapes

## Research

- [`docs/research/pi-mcp-adapter-config-source.md`](../../../docs/research/pi-mcp-adapter-config-source.md) — grounded review of npm `pi-mcp-adapter@2.11.0` and upstream `main` at `82724dccc13a49310530898f922bafff12b7f3fe`, including package health, exact load timing, current API gaps, option evaluation, and the minimum upstream/fork contract.
- [`.agents/skills/pi-mcp-adapter-v2/SKILL.md`](../../../.agents/skills/pi-mcp-adapter-v2/SKILL.md) — auto-loading version/API reference for implementation and review.
- **External blocker:** no qualifying released upstream configuration-source API or declared maintained fork currently exists. Package-independent bridge ports/contracts/fakes can proceed; the production adapter and truthful MCP-runtime availability remain blocked until an upstream release or narrow maintained fork implements the researched contract.
- This research adds evidence only. The feature remains at `stage: drafting`; design, decomposition, and stage advancement are intentionally deferred.

## UI alignment

No UI surface and no mockups. The bridge returns typed capability and status evidence for `epic-native-plugin-management` to present later.

<!-- The feature-design pass will fill in interfaces, signatures, implementation units, verification, and the exact upstream/fork decision from grounded evidence. -->
