---
id: fix-global-marketplace-registration-defaults
kind: story
stage: verifying
tags: [compatibility]
parent: null
depends_on: []
release_binding: 0.1.1
created: 2026-07-18
updated: 2026-07-18
---

# Make marketplace registration global with ergonomic defaults

Marketplace registration is host-wide configuration, while plugin installation and lifecycle remain explicitly scoped to user or project. The native control grammar currently exposes the internal user/project state partition on marketplace add, remove, list, and refresh, and requires callers to spell both `--source-kind github` and `--scope user` for the common GitHub shorthand.

For the 0.1.1 patch:

- `/plugin marketplace add owner/repository` defaults to a GitHub source;
- marketplace add, remove, list, and refresh no longer expose a scope option and operate on the host-wide user marketplace registry;
- adoption import writes to the same host-wide registry;
- internal scope-bearing state contracts remain intact for reading and migrating 0.1.0 state, avoiding an identifier/storage-format break in a patch;
- plugin install and lifecycle scope controls remain unchanged.

The user state document is the durable host-global marketplace registry; `scope: user` remains in versioned machine DTOs as a storage-boundary compatibility detail.

## Implementation notes

- Global catalog snapshots are projected into distinct user/project plugin candidate identities. This preserves independently scoped plugin installation without duplicating marketplace registration.
- Native inspection evidence binds each target scope to the same global registration and a target-specific snapshot token.
- V4 project state and portable project intent no longer require a project-local marketplace snapshot for every installed plugin. Legacy project marketplace records remain readable for V1-V3 migration.
- Public marketplace add/remove/list/refresh and adoption commands no longer accept `--scope`; dispatcher ownership routes them to the global registry.
