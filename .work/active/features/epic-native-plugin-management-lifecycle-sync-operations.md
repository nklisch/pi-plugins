---
id: epic-native-plugin-management-lifecycle-sync-operations
kind: feature
stage: drafting
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-inspection-diagnostics]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Lifecycle and Project-Sync Operations

## Brief

Deliver deterministic management operations for enable, disable, update, uninstall, and project-sync across user and project scopes. Each operation starts from exact inspection/authority, invokes the completed whole-plugin lifecycle or adoption service, streams bounded progress, and returns an exact observed result that can be consumed unchanged by slash subcommands or the interactive manager.

Project-sync compares normalized read-only Claude/Codex project state with Plugin Host authority and presents an explicit adoption plan before mutation. Update re-inspects the selected revision, compatibility, changed executable surface, and configuration requirements before entering the existing transaction/recovery path.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Depends on common inspection/diagnostic facts; can be designed in parallel with trusted installation.
- Owns operation request/result/progress contracts, project-sync planning and confirmation, conflict/current-state behavior, and orchestration across existing services.
- Reuses `PluginLifecycleService`, `AdoptionService`, update inspection, configuration/trust services, transition reconciliation, and recovery. It does not add component-level enablement or a second transaction engine.

## Capability boundaries

- Enable and update succeed only after the complete skill/hook/MCP projection is independently observed; disable and uninstall prove exact absence/tombstone evidence.
- Update keeps the prior active revision until the new revision is fully committed and observed, with existing compensation/recovery deciding ambiguous outcomes.
- Uninstall removes Plugin Host authority and derived runtime state without deleting or rewriting foreign files or unrelated immutable content.
- Project-sync is explicit, scope-qualified, previewable, idempotent, and provenance-preserving. It never silently adopts foreign state at startup.
- Every operation distinguishes no-op, conflict, rejected preflight, cancelled, failed, compensated, recovery-required, and succeeded outcomes without leaking secrets or native causes.
- Per-operation progress is truthful and monotonic but never treated as commit/activation evidence.

## Mockup inheritance

Installed-plugin actions and result/status placement inherit the split-inspector manager at `.mockups/screens/epic-native-plugin-management-manager/option-1.html`. This feature owns application behavior only; terminal controls remain with the Pi manager.
