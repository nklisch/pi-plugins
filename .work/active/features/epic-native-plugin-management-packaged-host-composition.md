---
id: epic-native-plugin-management-packaged-host-composition
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-native-plugin-management
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Packaged Host Composition and Concrete Adapters

## Brief

Create the locally packageable Plugin Host kernel that assembles the completed ingestion, compatibility, lifecycle, recovery, skill/hook, and MCP participant contracts behind one application container. Supply the concrete Node/Pi adapters still missing from packaged operation: authoritative lifecycle state and inventory, configuration and secret custody, configuration paths and write IDs, transition/recovery artifacts, installed-revision loading, project-root and trust authority, and complete runtime reconciliation/reload observation.

The composition root accepts package-neutral runtime participants, so it can be implemented and verified before the maintained MCP and subagent forks are published. Missing optional production participants remain explicit unavailable capabilities; composition must never claim a complete plugin active from partial runtime evidence.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Position: local foundation for every management capability
- Owns concrete adapter lifetime, filesystem/database locations, startup/shutdown ordering, recovery bootstrap, and one host application container.
- Reuses the existing application ports and services; it does not redesign state schemas, transactions, recovery, foreign formats, skill/hook execution, MCP transport, or subagent interception.
- Does not own marketplace behavior, command grammar, Pi rendering, or external adapter package implementation.

## Existing seams to compose

- State, lifecycle, configuration, trust, recovery, projection, reload, and inventory contracts under `src/application/ports/` and the completed lifecycle services.
- Existing filesystem content/projection stores, SQLite transition/revision adapters, recovery scanner, and project-root authority composition.
- `SkillHookLifecycleParticipant`, MCP lifecycle participant, and `composeActivationObservation` package-neutral seams.
- Pi project trust and effective working-directory evidence must remain explicit rather than inferred from path spelling.

## Acceptance boundary

- A fresh process can open one user scope and the current project scope, recover incomplete transitions, load installed revisions, build exact desired runtime projections, reconcile all supplied participants, and expose a ready application container.
- Adapter results are typed, abort-aware, redacted, deterministic, and idempotently closable; secret plaintext and native causes do not enter state, logs, diagnostics, or projection caches.
- User and project scope locations cannot alias; concurrent writers use the existing lock/CAS/journal guarantees rather than a new authority.
- Package-neutral fakes prove complete-participant composition, missing-capability behavior, restart, recovery, and shutdown without Claude, Codex, `pi-mcp-adapter`, or `pi-subagents` installed.
- Concrete file names, schemas, and public factory signatures remain late-bound to feature design after an inventory of already implemented adapters.

## Mockup inheritance

No new UI is owned here. This feature supplies status and capability data to the selected split-inspector manager but does not render it. The parent mockups remain the presentation authority.
