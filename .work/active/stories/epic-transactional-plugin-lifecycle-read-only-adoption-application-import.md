---
id: epic-transactional-plugin-lifecycle-read-only-adoption-application-import
kind: story
stage: implementing
tags: [security, compatibility]
parent: epic-transactional-plugin-lifecycle-read-only-adoption
depends_on: [epic-transactional-plugin-lifecycle-read-only-adoption-contracts-readers]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Orchestrate discovery and declaration-only registration

## Checkpoint

Define the effect-neutral file observation port, normal marketplace registration port, discovery/result schemas, and adoption service. Discovery reconciles independent document outcomes. Selection re-discovers current foreign state, resolves canonical candidate IDs, defaults to user scope, preflights explicit project destinations for portability, and sends only source/scope/adoption origin through the normal registration path.

The service must not import `LifecycleStateStore`, construct state mutations, call plugin install/update/enable, or accept foreign aliases/trust/credentials/caches/policies/activation as registration authority.

## Scope

- `src/application/adoption-contract.ts`
- `src/application/adoption-service.ts`
- `src/application/ports/foreign-state-files.ts`
- `src/application/ports/marketplace-registration.ts`
- focused application contract/service tests

## Acceptance evidence

- All documents missing is a successful empty discovery; one malformed/unreadable document does not suppress another host.
- A source changed or removed after presentation resolves as `candidate-unavailable` because adoption re-discovers rather than caching.
- Omitted scope delegates user registration; explicit project scope accepts only `PortableMarketplaceSourceSchema` values and never delegates local paths.
- Registrar calls carry exactly normalized source, scope, and `origin: "adoption"`; normal typed rejection is preserved.
- Multi-selection is unique, ID-sorted, partial-success, and cancellation is rethrown before another call.
- Tests prove no installation, trust, credential, cache, absolute materialized path, enabled-plugin, or activation field crosses the application ports.

## Ordering constraint

Depends on the completed candidate/readers checkpoint. Finish before wiring Node paths or public composition.
