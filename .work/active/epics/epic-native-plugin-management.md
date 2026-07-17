---
id: epic-native-plugin-management
kind: epic
stage: implementing
tags: [compatibility]
parent: null
depends_on: [epic-skills-hook-runtime, epic-mcp-runtime-integration]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-17
---

# Native Plugin Management

## Brief

This epic delivers the complete Pi-facing plugin experience. Users add marketplaces, browse and inspect plugins, understand compatibility, provide configuration and trust, and manage installation, synchronization, enablement, updates, and removal through one native `/plugin` surface.

The same deterministic application facade powers scripted subcommands and the interactive manager. The experience covers user and project scopes, read-only foreign-state adoption, actionable diagnostics, universal update notifications, configurable automatic updates, offline-safe startup, and end-to-end packaged operation with no Claude or Codex installation.

This epic does not add new foreign component types, weaken compatibility validation, or replace completed transaction/recovery and runtime systems. It packages, presents, and orchestrates their whole-plugin behavior.

## Foundation references

- `docs/VISION.md` — Users, Product promise, Native Pi experience, Success
- `docs/SPEC.md` — Lifecycle operations, Foreign-state adoption, Performance and availability, Acceptance criteria
- `docs/ARCHITECTURE.md` — Pi integration, Presentation, Error model, Testing strategy
- `docs/COMPATIBILITY.md` — Marketplace behavior, Supporting plugin configuration, Update behavior

## Current seam map

- **Foreign model and inspection**: Claude/Codex marketplace, plugin, skill, hook, MCP, configuration, provenance, compatibility, inspection, and update-candidate contracts are complete. Native management consumes normalized values and reports; it never rereads foreign manifests to decide behavior.
- **Lifecycle authority**: install, enable, disable, update, uninstall, state transitions, compensation, recovery, immutable content/data/projection custody, and exact reload observation are complete behind application ports. This epic supplies concrete packaged adapters and orchestration, not another state or transaction engine.
- **Foreign adoption**: adoption planning/services and read-only foreign-state ports already define how foreign registrations and installed state become explicit Plugin Host authority. Startup must not silently make foreign files authoritative.
- **Skill/hook runtime**: complete-projection caching, skill discovery, ordinary hook adaptation/execution, and portable subagent interception are implemented. The production subagent adapter remains gated by its authorized maintained-fork feature.
- **MCP runtime**: deterministic projections, trusted launch context, portable lifecycle reconciliation, and package-neutral source contracts are implemented. The production configuration-source adapter remains gated by its authorized maintained-fork feature.
- **Local infrastructure**: content/projection stores and significant transition/recovery adapters exist, but there is no complete packaged composition for authoritative state/inventory, configuration/secret/path/write-id custody, installed-revision loading, project authority/trust, all runtime participants, and process lifetime.
- **Pi/package surface**: the package currently exposes the library build and runtime adapters but not the complete Pi extension entry, `/plugin` registration, host lifetime, or native manager composition.
- **Signed-off UI**: the selected manager is option 1's split inspector, and installation is the three-step choose/inspect → configure/trust → activation-result flow. Production uses Pi's active semantic theme and terminal typography.

## Decomposition

Split by user/application capability rather than source-code layer. First establish one locally packageable host kernel. Build marketplace discovery and read-only inspection on that authority. From inspection, trusted installation and ongoing lifecycle/project-sync operations can proceed as parallel mutation capabilities; update policy follows the lifecycle operation. Then converge all capabilities behind one deterministic facade, add the thin Pi extension/manager, prove the package in a clean local environment, and finally qualify the maintained-fork production runtimes.

This shape keeps locally implementable composition and acceptance moving while production MCP/subagent adapters are unpublished. Only the final production acceptance feature crosses into the concrete production-adapter story dependencies and MCP lifecycle reconciliation; upstream-contribution follow-up does not block qualification of an already published authorized fork.

### Child features

- `epic-native-plugin-management-packaged-host-composition` — package the concrete state/configuration/trust/recovery/project/runtime adapter graph behind one host application container — depends on: `[]`
- `epic-native-plugin-management-marketplace-discovery-adoption` — register, refresh, browse, and safely adopt foreign marketplace registrations into deterministic scoped catalogs — depends on: `[epic-native-plugin-management-packaged-host-composition]`
- `epic-native-plugin-management-inspection-diagnostics` — compose candidate and installed details, compatibility, health, provenance, and actionable redacted diagnostics — depends on: `[epic-native-plugin-management-marketplace-discovery-adoption]`
- `epic-native-plugin-management-trusted-installation` — collect configuration/trust and run the exact three-stage transactional installation capability — depends on: `[epic-native-plugin-management-inspection-diagnostics]`
- `epic-native-plugin-management-lifecycle-sync-operations` — provide enable, disable, update, uninstall, and explicit project-sync operations with exact progress/results — depends on: `[epic-native-plugin-management-inspection-diagnostics]`
- `epic-native-plugin-management-update-policy-offline-startup` — persist update policy, deduplicate notifications, authorize automatic updates, and keep startup offline-safe — depends on: `[epic-native-plugin-management-lifecycle-sync-operations]`
- `epic-native-plugin-management-deterministic-control-facade` — unify all native operations behind one typed `/plugin` grammar and machine-safe application surface — depends on: `[epic-native-plugin-management-trusted-installation, epic-native-plugin-management-lifecycle-sync-operations, epic-native-plugin-management-update-policy-offline-startup]`
- `epic-native-plugin-management-pi-extension-manager` — register and package `/plugin`, dispatch subcommands, and render the signed-off native manager/install flow as a thin facade client — depends on: `[epic-native-plugin-management-deterministic-control-facade]`
- `epic-native-plugin-management-clean-environment-core-e2e` — prove the locally implementable package from a clean Pi environment with no Claude/Codex or unpublished fork dependency — depends on: `[epic-native-plugin-management-pi-extension-manager]`
- `epic-native-plugin-management-production-runtime-acceptance` — pin, compose, and qualify the published MCP/subagent production adapters through full clean-environment acceptance — depends on: `[epic-native-plugin-management-clean-environment-core-e2e, epic-mcp-runtime-integration-config-source-bridge-production-adapter, epic-mcp-runtime-integration-lifecycle-reconciliation, epic-skills-hook-runtime-subagent-interception-production-adapter]`

### Capability ownership and exclusions

- Packaged composition owns concrete port implementations, resource lifetime, recovery bootstrap, and participant aggregation; it does not own management behavior or external adapter internals.
- Marketplace discovery owns registration/catalog authority and foreign registration adoption; it does not install or update plugins.
- Inspection owns read models and diagnostics; it does not persist status or mutate state.
- Trusted installation owns preflight inputs and install orchestration; ongoing lifecycle/project-sync owns the other explicit mutations.
- Update policy owns scheduling/settings/notifications; manual and automatic updates share the same lifecycle operation.
- The deterministic facade owns grammar/dispatch/result shape; the Pi extension owns only mode adaptation, package entry, and terminal interaction.
- Core E2E may use package-neutral conforming runtime doubles but cannot claim production MCP/subagent support. Production acceptance alone owns final pinned-adapter packaging evidence.

### Simplification arcs

- Reuse one application container and existing ports instead of service locators, per-command wiring, or a second runtime registry.
- Reuse normalized foreign inventories and inspection/compatibility services instead of presentation-specific readers or verdicts.
- Reuse lifecycle and recovery operations for every caller instead of UI, CLI, and automatic-update mutation paths.
- Reuse one typed facade for subcommands and TUI instead of translating through shell strings or duplicating validation/business logic in components.
- Keep runtime status and catalog/update observations derived and replaceable; do not add authoritative status mirrors.
- Keep clean local acceptance and maintained-fork acceptance separate so external publication risk cannot force fake production claims or block core package work.

## Design decisions

- **Default manager entry**: `/plugin` opens on the installed-plugin overview. Marketplace browsing is an adjacent manager view rather than the landing surface.
- **Deterministic command surface**: `/plugin` arguments cover installed/catalog reads, marketplace add/remove/list/refresh and foreign registration adoption, inspect/diagnose, install, enable, disable, update, uninstall, project-sync, and update settings/status. Exact spelling/options are finalized in facade feature design, but scope and revision targeting must be unambiguous.
- **One facade, two presentations**: subcommands and TUI invoke the same typed request methods and consume the same progress/results. The TUI cannot call lifecycle, compatibility, trust, persistence, or update-policy services around the facade.
- **Non-interactive honesty**: missing values/decisions in scripted, JSON, print, or unavailable-UI modes return deterministic usage or missing-input results. No hidden prompt or fallback default may alter trust, configuration, scope, revision, or lifecycle intent.
- **Packaged composition boundary**: local composition depends only on package-neutral runtime participant contracts. Capability probes report missing production MCP/subagent adapters as unavailable. Only the final acceptance feature wires pinned published implementations.
- **Authority and recovery**: existing authoritative state, CAS/locks, transition journals, immutable roots, and recovery services remain the only mutation authority. Management progress, notification state, TUI state, runtime observations, and cached catalogs never become active-revision pointers.
- **Marketplace/adoption posture**: native registrations are explicit scoped Plugin Host state. Claude/Codex registrations and project plugin state are read-only evidence offered through explicit preview/adoption; they are never mutated or silently adopted at startup.
- **Inspection and diagnostics**: concise health/risk summaries lead, with exact skill paths, hook commands, MCP processes/endpoints, capability facts, provenance, revision changes, and safe recovery detail expandable one level beneath. Existing compatibility and runtime probes remain verdict authority.
- **Installation journey**: use choose and inspect, combined configuration and trust, then activation result. Sensitive `userConfig` values enter secret custody and never progress/results/history; trust binds to the exact revision and executable surface.
- **Whole-plugin interactions**: install, enable, disable, update, uninstall, and project-sync return exact no-op/conflict/cancelled/failed/compensated/recovery-required/succeeded outcomes. Callback acceptance or progress completion is never activation evidence.
- **Update visibility**: emit one calm Pi notification per newly discovered revision and retain an unresolved count in the manager. Automatic updates are configurable and use the same preflight/trust/lifecycle path as manual update.
- **Offline startup**: local state recovery and installed runtime projection activation have no network prerequisite. Marketplace refresh, remote MCP connection/tool discovery, and update checks begin after readiness and report stale/live health independently.
- **Pi extension lifetime**: package discovery, `registerCommand`, resource startup/reload/shutdown, cancellation, and mode checks belong to one extension composition. `ctx.ui.custom()` and terminal components are TUI-only; non-TUI behavior remains deterministic.
- **Manager composition**: use the selected split inspector with persistent list context, adjacent marketplace mode, expandable details, exact progress/result states, and keyboard navigation. The install flow retains its signed-off sequential topology.
- **Visual integration**: production owns no palette or font. Components consume Pi's active semantic theme, injected keybindings, and terminal typography. Static Catppuccin references only approximate Pi in browser mocks.
- **Testing boundary**: core clean-environment E2E installs the built package and proves local composition without Claude/Codex or unpublished forks. Full production runtime acceptance waits for sibling adapter features and must use pinned real packages, not fakes.
- **Late binding and sizing**: each feature design inventories current code before naming concrete files/interfaces. Child features are intended to yield roughly 5–15 cohesive implementation checkpoints; tests stay with the behavior they protect rather than becoming horizontal test-only slices, except the explicit package acceptance capabilities.
- **Discovery posture**: direct-read only, as required. Grounding covered project/global rules, all foundation documents, signed-off design-system/manager/install mockups, completed foreign model and lifecycle contracts, portable skill/hook/MCP implementations, current maintained-fork plans, active substrate items, package metadata, and current Pi extension/TUI/theme/package documentation. No nested agent, question, or `work-view` invocation was used.

## Mockup inheritance

- **Design system**: `.mockups/design-system/`
  - Production rule: active Pi semantic theme and terminal monospace.
  - Static reference: Catppuccin Latte/Mocha, tokens locked 2026-07-11.
- **Manager**: `.mockups/screens/epic-native-plugin-management-manager/option-1.html`
  - Selected: option 1, split inspector — 2026-07-11.
  - Primary owner: `epic-native-plugin-management-pi-extension-manager`.
  - Data/operation inheritance: marketplace discovery, inspection/diagnostics, lifecycle/sync, and update-policy features.
- **Install flow**: `.mockups/flows/plugin-install/index.html`
  - Steps: `01-choose-inspect` → `02-configure-trust` → `03-activation-result`.
  - Signed off: 2026-07-11.
  - Application-state owner: `epic-native-plugin-management-trusted-installation`; renderer owner: `epic-native-plugin-management-pi-extension-manager`.
- Backend/composition/facade/acceptance features create no additional mockups. They must preserve the signed-off states but do not own visual decisions.

## Decomposition risks

- **Concrete composition can accidentally become a second authority**: broad adapter work may tempt a new registry or status database. Feature design must map every adapter to an existing port and keep active revision/transition/recovery ownership in completed lifecycle contracts.
- **Partial participant health can be reported as whole-plugin success**: local composition may have skills/hooks while MCP or subagent interception is unavailable. Complete projection observation must require every declared participant and capability; partial evidence remains failed/unavailable.
- **Maintained-fork timelines can block the package**: core composition, facade, UI, and local E2E therefore use package-neutral seams and honest unavailable paths. Only production acceptance depends on the external feature closures.
- **Configuration and trust can leak through presentation plumbing**: command history, progress events, result DTOs, notifications, logs, and diagnostics must carry safe field identities/codes only. Secret values resolve at existing immediate-use boundaries.
- **TUI and subcommands can drift**: if components call services directly or reinterpret results, scripted and interactive behavior diverge. The facade dependency and thin-presentation rule must be enforced by dependency tests and cross-presentation acceptance.
- **Offline guarantees can be defeated by eager refresh or remote health checks**: extension startup must establish local readiness first and isolate network work with cancellation/time bounds. Remote MCP reachability is live health, not activation proof.
- **Foreign adoption can become implicit mutation**: convenience auto-sync could silently make Claude/Codex state authoritative or write back to it. Every adoption remains previewable, explicit, provenance-preserving, and one-way into Plugin Host state.
- **Local E2E can overclaim production readiness**: conforming doubles prove composition and UI behavior, not the maintained forks. Evidence and feature closure must label production MCP/subagent paths unavailable until the final feature uses pinned packages.
- **Pi reload/session lifetime can leak resources**: duplicate command instances, schedulers, database handles, overlays, watchers, or child processes can survive reload. One extension-owned lifecycle and idempotent close/cancel behavior must be verified.
- **Cross-feature result vocabularies can fragment**: install, lifecycle, refresh, and policy capabilities may invent incompatible progress/error shapes. Facade design must consolidate stable shared categories without erasing operation-specific recovery evidence.
