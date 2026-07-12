---
id: epic-transactional-plugin-lifecycle
kind: epic
stage: drafting
tags: [security, infra]
parent: null
depends_on: [epic-foreign-plugin-model]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Transactional Plugin Lifecycle

## Brief

This epic delivers the whole-plugin state machine. It owns immutable installed revisions, user and project scopes, portable project declarations, persistent plugin data, trust decisions, sensitive configuration, and the authoritative records from which every runtime projection derives.

Lifecycle operations stage and validate complete bundles before atomically installing, enabling, disabling, updating, or uninstalling them. Cross-process coordination, pending-transition recovery, rollback, revision retention, garbage collection, update discovery, and read-only adoption preserve a working installation across crashes, concurrent Pi sessions, and unavailable networks.

This epic does not implement skill, hook, or MCP behavior and does not define the interactive plugin manager. It supplies the stable application services and ports those consumers require.

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle, Atomic change, Explicit trust
- `docs/SPEC.md` — Scopes, State layout, Install transaction, Updates, Trust and security
- `docs/ARCHITECTURE.md` — Authoritative state, Installation transaction, Revision retention and recovery, Trust
- `docs/COMPATIBILITY.md` — Whole-plugin behavior, Update behavior, Foreign-state adoption

## Anticipated child features

- versioned state schemas and portable project declarations
- immutable revision, marketplace, staging, data, and project stores
- trust grants, plugin configuration, and operating-system secret storage
- cross-process locking and generation-safe state transactions
- atomic install, enable, disable, update, and uninstall services
- activation journal, rollback, startup recovery, and revision collection
- marketplace refresh, universal update notification state, and automatic-update policy
- read-only Claude and Codex marketplace adoption

<!-- The design pass on each child feature will fill in real specifics. -->
