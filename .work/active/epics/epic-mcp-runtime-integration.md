---
id: epic-mcp-runtime-integration
kind: epic
stage: review
tags: [compatibility, infra]
parent: null
depends_on: [epic-transactional-plugin-lifecycle]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-17
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

## Current seam map

- `src/formats/{claude,codex}/mcp-reader.ts` and `src/formats/mcp-reader-support.ts` already ingest wrapped, direct, and inline foreign declarations as provenance-rich `McpServerComponent` values. This epic consumes that inventory; it does not reopen foreign files, manifest authority, or dual-format merging.
- `src/domain/compatibility-policy.ts`, `src/domain/compatibility-evaluator.ts`, and `src/application/compatibility-service.ts` already own supported MCP semantics and the complete runtime-capability snapshot. The runtime bridge supplies truthful capability facts and translates only compatibility-approved components.
- `src/application/ports/runtime-projection.ts` and `src/application/ports/lifecycle-reload.ts` already define the authoritative complete-plugin projection, active/inactive expectations, and exact post-reload observation contract. This epic implements the MCP side without creating a component-specific transaction path or state store.
- `src/application/configuration-resolver.ts`, `src/application/resolved-configuration.ts`, and the trust/configuration ports already enforce project trust and callback-scoped secret resolution. MCP launch uses those seams instead of persisting expanded values or inventing another credential adapter.
- Existing tests cover foreign MCP shapes, compatibility policy, trust/configuration custody, and lifecycle behavior through fake runtime seams. No concrete MCP runtime dependency, plugin-scoped configuration-source adapter, or runtime activation test exists yet.

## Decomposition

Split by runtime capability rather than technical layer: establish the external plugin-scoped source contract first; then build two parallel consumers of it—deterministic plugin source projection and trusted launch-time value delivery; finally compose both behind the existing whole-plugin lifecycle and reload-observation seams. This keeps foreign ingestion, authoritative lifecycle policy, and MCP transport ownership in their existing homes while giving the external adapter boundary and secret-bearing execution boundary independent design and review scopes.

### Child features

- `epic-mcp-runtime-integration-config-source-bridge` — establish and package the upstream-first `pi-mcp-adapter` plugin-scoped configuration-source, capability, inspection, and removal contract — depends on: `[]`
- `epic-mcp-runtime-integration-plugin-projections` — translate compatibility-approved MCP inventory into collision-free plugin-scoped servers, provenance, status identities, and foreign tool aliases — depends on: `[epic-mcp-runtime-integration-config-source-bridge]`
- `epic-mcp-runtime-integration-launch-context` — deliver trusted roots, configured values, headers, bearer material, and environment only at the MCP runtime's immediate launch/connection boundary — depends on: `[epic-mcp-runtime-integration-config-source-bridge]`
- `epic-mcp-runtime-integration-lifecycle-reconciliation` — synchronize complete MCP source activation, replacement, observation, rollback, and removal with whole-plugin lifecycle transitions — depends on: `[epic-mcp-runtime-integration-plugin-projections, epic-mcp-runtime-integration-launch-context]`

### Simplification arcs

- `epic-mcp-runtime-integration-config-source-bridge` — avoid copied Pi settings, generated native MCP configuration, and a Plugin Host transport implementation; one source contract delegates runtime behavior to the dedicated MCP package.
- `epic-mcp-runtime-integration-plugin-projections` — derive runtime identity, aliases, provenance, and removal keys from the existing plugin/component authorities rather than maintaining parallel registries.
- `epic-mcp-runtime-integration-launch-context` — reuse callback-scoped configuration and secret custody instead of adding MCP-specific secret state, environment caches, or placeholder expansion.
- `epic-mcp-runtime-integration-lifecycle-reconciliation` — implement the MCP side of the existing projection/reload ports instead of adding a second transaction engine, activation journal, or MCP-owned authoritative state.

## Design decisions

- **External integration posture**: Start feature design with grounded verification of the then-current `pi-mcp-adapter` API. Prefer an upstream plugin-scoped configuration-source contribution. Package a narrowly maintained fork only when upstream cannot provide source registration before tool discovery, capability reporting, provenance-preserving inspection, exact removal, or launch-time value callbacks. The domain and lifecycle contracts must not expose which path is selected.
- **Configuration-source handoff**: Hand the MCP runtime one scope- and plugin-qualified source for an exact revision/projection digest, rather than writing individual servers into global settings. Source inspection and removal use the same stable identity, so duplicate native server keys in different plugins or scopes cannot collide or remove one another.
- **Transport policy**: Preserve the current compatibility contract: local standard I/O and Streamable HTTP are supported when the selected runtime reports the required capabilities. Explicit legacy SSE remains incompatible, and WebSocket remains unsupported. This epic does not silently broaden policy because an adapter happens to accept a transport approximately.
- **Foreign-model boundary**: Runtime projection consumes `McpServerComponent`, `CompatibilityReport`, and existing runtime requirements. It may produce a typed MCP adapter projection, but it must not reread Claude/Codex files, change catalog/manifest authority, or create a second acceptance vocabulary that can drift from `CompatibilityPolicyRegistry`.
- **Sibling ownership**: This epic supplies only the MCP runtime participant. It does not absorb skill discovery or hook execution from `epic-skills-hook-runtime`, concrete complete-plugin reload/composition or state/credential/configuration-path/project-root adapters from `epic-native-plugin-management`, or any native manager command/UI. Native composition combines the runtime participants behind the existing complete-plugin ports.
- **Trust and authority**: Authoritative installed state, exact executable-surface trust, project trust, logical content/data/configuration references, and whole-plugin activation intent remain owned by the completed lifecycle. Generated MCP source objects and runtime status are derived, replaceable observations, never state authority.
- **Secret timing**: Plugin roots and non-secret templates may be prepared without expansion, but configured sensitive values, bearer material, environment-backed headers, and secret-derived environment entries resolve only inside the callback that immediately launches a standard-I/O process or establishes the remote runtime connection. Plaintext never enters projections, MCP source registration, status, provenance, diagnostics, logs, or reload evidence, and callback-scoped values are disposed on every outcome.
- **Names and provenance**: Server identity derives from scope, plugin key, revision/projection, and native server key. Foreign tool aliases are exposed only when collision-free and faithful; native MCP discovery remains available. Status and diagnostics retain plugin/component provenance, while removal addresses the source identity rather than a display name or tool alias.
- **Lifecycle synchronization**: Install/enable publishes the complete source set; disable/uninstall removes it; update replaces the old set as one observed projection transition. A partial adapter change, launch failure, cancellation, or cleanup failure cannot be reported as success. The existing lifecycle compensation/recovery path preserves or restores the previous projection; this epic does not commit state independently.
- **Observation and offline startup**: Reload acceptance is not activation evidence. Observation must prove the exact scope, plugin, revision, and projection digest from inspected MCP source registration. It proves deterministic local registration and server inventory, not remote reachability or completed tool discovery; startup therefore remains local and offline-safe. Connection failures are explicit per-server runtime status and do not disable unrelated plugins or invalidate a previously active revision merely because the network is unavailable.
- **UI alignment**: UI mockups are skipped. This is backend/runtime integration with no presentation screen. MCP provenance and health are supplied as typed status for the Pi-native manager owned by `epic-native-plugin-management`; this epic does not render status or terminal UI.
- **Discovery posture**: Direct-read only, as required. Grounding covered all project rules and conventions, all four foundation/compatibility documents, sibling epic boundaries, completed foreign-model and lifecycle feature contracts, and representative MCP reader, compatibility, projection, reload, trust/configuration, and integration tests. No nested subagent or peer mechanism was used.
- **Sizing**: Four capabilities keep the adapter research/packaging risk, deterministic projection semantics, secret-bearing execution boundary, and lifecycle integration separately reviewable. Each is expected to yield roughly 5–15 implementation units during its own feature-design pass; interfaces, signatures, files, and tests remain late-bound there.

## UI alignment

Mockups skipped: the epic introduces no screen, flow, modal, or visual component. Runtime status and provenance will feed the native management experience in `epic-native-plugin-management`, which already owns the relevant UI alignment artifacts.

## Decomposition risks

- **The external adapter may lack the required source lifecycle**: current package dependencies contain no MCP runtime, and the exact upstream API is intentionally unresolved. Feature design must verify registration timing, capability facts, inspection evidence, late value callbacks, cancellation, and source-scoped removal before choosing upstream contribution versus a narrow fork.
- **Opaque foreign declarations can invite policy duplication**: compatibility currently validates opaque MCP JSON, while runtime projection must translate it. If translation grows a separate field/alias matrix, a component can be declared compatible yet activate differently. The projection feature must derive from or mechanically cross-check the existing policy registry.
- **Late secret delivery can be defeated by adapter caching**: an MCP runtime that clones configuration, serializes callbacks, or eagerly expands headers/environment would extend plaintext lifetime and violate trust guarantees. The bridge contract must make immediate consumption and redacted status observable requirements, not implementation convention.
- **Lifecycle replacement is the convergence hotspot**: update or disable can partially change registered sources or leave launched processes behind. Exact source inspection, abort propagation, idempotent cleanup, and the existing compensation/recovery evidence must distinguish restored, failed, and ambiguous outcomes.
- **Offline correctness and activation proof can be confused**: requiring a remote handshake at reload would make startup network-dependent, while observing only a reload return would be too weak. Evidence must prove exact local source registration and separately report live connection/tool-discovery health.
- **Alias and removal collisions cross multiple identities**: plugin names, marketplace names, native server keys, scopes, and foreign tool aliases can overlap. Canonical source/server identities must drive registration and removal; aliases remain derived compatibility views and never become authority.

## Aggregate review readiness — 2026-07-18

All four child features are `stage: done`, including the exact published production MCP adapter and upstream PR #191. The epic advances to `review` for its independent aggregate pass.
