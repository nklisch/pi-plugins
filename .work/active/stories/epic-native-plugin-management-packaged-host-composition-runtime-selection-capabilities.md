---
id: epic-native-plugin-management-packaged-host-composition-runtime-selection-capabilities
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-project-secret-identity-adapters, epic-native-plugin-management-packaged-host-composition-installed-revision-loader]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Build the Runtime Selection and Capability Authorities

## Checkpoint

Create one immutable exact-selection catalog for hooks and MCP, one desired-state loader over authoritative user/current-project state, one complete Node/Pi capability probe chain, and requested-only MCP ambient environment custody.

## Planned files

- `src/composition/runtime-selection-catalog.ts`
- `src/composition/runtime-desired-state.ts`
- `src/composition/create-host-configuration.ts`
- `src/composition/node-pi-runtime-capability-probe.ts`
- `src/infrastructure/environment/node-mcp-launch-environment.ts`
- `test/composition/runtime-selection-catalog.test.ts`
- `test/composition/runtime-desired-state.test.ts`
- `test/composition/create-host-configuration.test.ts`
- `test/composition/node-pi-runtime-capability-probe.test.ts`

## Required behavior

- Every selection binds projection, installed revision, current report, exact trust candidate/records, configuration descriptors/ref, content/data roots, component ids, and current project context.
- Catalog replacement is atomic. Hook lookups require exact complete bindings; MCP callbacks pin a selection until completion.
- Desired-state loading rereads authoritative user and exact trusted-current-project scopes, loads immutable descriptors, re-assesses current capabilities, and regenerates projections.
- One host-configuration factory binds existing save/remove operations and callback-scoped resolution to the real store, Secret Service adapter, path, project-root/trust, write-id, and hash dependencies; raw stores and plaintext-capable callbacks stay private.
- Base capability facts cover skill restrictions, command hooks, Bash/PowerShell from actual composed/local evidence; existing MCP/subagent decorators complete the registry.
- Optional adapter absence is valid unavailable evidence. Malformed/throwing present evidence remains an adapter failure.
- Ambient MCP environment resolution accepts only requested names, is callback-scoped/redacted, and retains no plaintext map after disposal.

## Acceptance evidence

- [ ] Mixed-generation/catalog replacement, stale bindings, pinned replacement, cancellation, current-project mismatch, and close/drain are covered.
- [ ] Configuration save/remove and hook/MCP callback resolution share one exact dependency bundle; only safe application operations cross the container boundary.
- [ ] Every capability id appears exactly once and added registry entries break tests until mapped.
- [ ] MCP/subagent disappearance blocks only requiring plugins; skill/ordinary-hook/no-MCP plugins remain independently decidable.
- [ ] Fresh versus stored compatibility evidence is distinguished without rewriting installed state.
- [ ] Environment canaries never appear in errors, status, JSON, logs, snapshots, or retained objects.

## Ordering constraint

Converges project/secret and installed-loader checkpoints. Hook/subagent and MCP composition can proceed in parallel afterward.
