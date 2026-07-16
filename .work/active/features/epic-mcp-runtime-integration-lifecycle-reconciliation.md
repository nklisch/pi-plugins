---
id: epic-mcp-runtime-integration-lifecycle-reconciliation
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration
depends_on: [epic-mcp-runtime-integration-plugin-projections, epic-mcp-runtime-integration-launch-context]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Whole-Plugin MCP Lifecycle Reconciliation

## Brief

Supply the MCP activation participant consumed by native composition behind the existing complete-plugin `RuntimeProjectionPort` and `LifecycleReloadPort`. Install and enable make the exact plugin-scoped MCP source visible before tool registration; disable and uninstall remove that source without affecting another plugin or scope; update replaces the old source set with the candidate as one lifecycle-observed projection transition. Project-scoped activation remains contingent on exact Pi project trust.

Reload acceptance is never success evidence. The MCP participant inspects the selected runtime and contributes proof of the exact scope, plugin, revision, projection digest, registered source, and server inventory to the complete-plugin observation. It proves local registration rather than remote reachability, so startup uses committed local state and remains offline-safe; remote connection and tool-discovery failures appear as per-server status without disabling unrelated plugins or replacing the authoritative active revision.

Cancellation, partial adapter application, launch failure, source-removal failure, and cleanup failure preserve or restore the previous source through the completed lifecycle compensation/recovery path. Ambiguous runtime state remains explicit recovery-required evidence. This feature does not implement the complete reload/composition adapter, a second transaction coordinator, journal, state store, recovery engine, manager UI, concrete state/credential adapters, foreign ingestion, skills/hooks runtime, or MCP transport/authentication internals; `epic-native-plugin-management` composes all runtime participants and concrete host adapters.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: convergence capability; consumes the parallel plugin-projection and trusted launch-context features
- Depends on: `epic-mcp-runtime-integration-plugin-projections`, `epic-mcp-runtime-integration-launch-context`
- Design alignment: preserve the parent epic's lifecycle, exact observation, offline startup, project trust, cancellation, cleanup, and partial-failure decisions

## Boundary guardrails

- Implement only the MCP participant in the existing whole-plugin projection/reload seams; never take ownership of complete-port composition, commit lifecycle state, clear pending transitions, or run recovery independently.
- Active/inactive changes operate on a complete plugin-scoped source set, not individually selected servers or tool aliases.
- Exact observation comes from inspected runtime registration and safe status identities, not the reload return value, a generated file's existence, or network/tool-discovery success.
- Startup and reload perform no required network handshake. Local registration failure is activation failure; remote unavailability is runtime health unless the source itself cannot be registered faithfully.
- On partial replacement/removal, abort, or cleanup failure, retain enough safe evidence for lifecycle compensation/recovery and never claim the candidate or previous projection is active without exact inspection.

## Simplification opportunity

- Reuse lifecycle's projection expectations, reload observation, compensation, and startup recovery instead of introducing MCP-specific transaction or journal machinery.
- Register and remove one plugin-scoped source rather than diffing global per-server settings.
- Treat runtime status as derived observation and avoid persisting connection/tool inventory as a competing source of truth.

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle; Atomic change; Native Pi experience
- `docs/SPEC.md` — Lifecycle operations; Install transaction; Enablement; Performance and availability
- `docs/ARCHITECTURE.md` — Installation transaction; Revision retention and recovery; MCP adapter; Pi integration
- `docs/COMPATIBILITY.md` — Whole-plugin behavior; MCP identity and tool names; Update behavior

## UI alignment

No UI surface and no mockups. Typed server health, provenance, and lifecycle outcomes are consumed by the native manager in `epic-native-plugin-management`.

<!-- The feature-design pass will fill in interfaces, signatures, implementation units, and verification. -->
