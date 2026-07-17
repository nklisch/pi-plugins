---
id: epic-native-plugin-management-marketplace-discovery-adoption
kind: feature
stage: drafting
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-packaged-host-composition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Marketplace Discovery and Foreign Registration Adoption

## Brief

Deliver the marketplace catalog capability behind the native manager: register, remove, list, refresh, and browse native marketplace sources in user or project scope, and discover read-only Claude/Codex marketplace registrations for explicit adoption into Plugin Host authority. Produce one deterministic catalog view with source provenance, refresh state, available revisions, and safe stale/offline evidence.

This capability ends at candidate discovery. It does not install or update plugins, mutate foreign files, render the terminal manager, or reinterpret plugin compatibility.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Depends on the packaged host for scope locations, persisted registration custody, source acquisition, and lifecycle-safe startup.
- Owns marketplace registration persistence, foreign registration comparison/adoption decisions, refresh orchestration, catalog merge/order rules, and candidate lookup consumed by later inspection/install operations.
- Reuses `MarketplaceRefreshService`, registration and foreign-state ports, source resolvers, acquisition safety limits, and the completed normalized marketplace model.

## Capability boundaries

- Native registrations and adopted registrations are explicit Plugin Host state; foreign marketplace files remain read-only inputs and never become hidden startup authority.
- User/project registrations with the same display name remain scope-qualified. Source identity, not display order, controls refresh and removal.
- Browse output is deterministic across registration and network completion order and preserves exact source/revision provenance.
- Refresh cancellation, unavailable networks, malformed sources, moved local roots, and partial source failures produce per-source results without corrupting the last known catalog.
- Offline browse uses previously verified local/catalog evidence and clearly labels staleness; startup is not coupled to refresh.
- Feature design must include native and foreign registration fixtures but must not duplicate foreign reader, acquisition, compatibility, or transaction test matrices.

## Mockup inheritance

The selected split-inspector manager's marketplace mode is inherited as the eventual consumer. This feature owns the catalog/read model only; `.mockups/screens/epic-native-plugin-management-manager/option-1.html` remains authoritative and rendering stays with `epic-native-plugin-management-pi-extension-manager`.
