---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-config-portable
kind: story
stage: review
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Host Configuration and Portable Project Intent

## Scope

Implement Unit 2 of the parent design: independently versioned host marketplace configuration and the strict all-or-nothing `.pi/plugins.json` declaration contract.

The host config records declaration plus manual/automatic application preference only; update authority, cadence, notifications, acquisition, trust, and activation remain late-bound. Portable declarations contain team-shareable intent only and never machine state.

## Files

- `src/domain/state/config-state.ts`
- `src/domain/state/portable-project-declaration.ts`
- `test/domain/state/config-state.test.ts`
- `test/domain/state/portable-project-declaration.test.ts`

## Implementation requirements

- Use the existing marketplace/plugin source and identity schemas rather than mirrored source interfaces.
- Exclude `local-git` from portable marketplace sources.
- Require safe relative marketplace paths for portable plugin-source constraints.
- Use strict nested schemas plus a recursive prohibited-key/value guard.
- Reject unknown fields and the whole portable file; do not return partial intent.
- Keep host-config corruption isolation at marketplace-record granularity for the common codec.
- Represent automatic-update preference without implementing its semantics.

## Acceptance criteria

- [ ] Host config contains no credentials, trust, secrets, resolved snapshots, timestamps, or physical content paths.
- [ ] Portable declarations accept only version, portable marketplace declarations, plugin keys, source/version constraints, and enabled intent.
- [ ] Local/file/absolute/home/drive/UNC paths, embedded credentials, canonical/resolved hashes, project keys, blob/cache/data refs, installed/active state, timestamps, trust, secret/config refs, operations, diagnostics, and projections are rejected at any depth.
- [ ] Every requested plugin refers to a declared marketplace and duplicate identities fail.
- [ ] Unknown future schema versions and unknown nested fields fail closed.

## Implementation notes

- Execution capability: inline single-owner implementation; the two domain modules and focused tests form one cohesive, adapter-free boundary, and the caller explicitly prohibited agents.
- Review weight: standard (default); implementation stops at the requested `stage: review` boundary.
- Files changed: `src/domain/state/config-state.ts`, `src/domain/state/portable-project-declaration.ts`, `test/domain/state/config-state.test.ts`, `test/domain/state/portable-project-declaration.test.ts`.
- Tests added: strict host configuration/version-family tests; portable round-trip, source-registry, path-safety, identity-integrity, recursive prohibition, fail-closed, and future-version tests.
- Discrepancies from design: none; the shared `GenerationSchema` and independently versioned family exports live beside these schemas so later state registry work can consume them without duplicating contracts.
- Adjacent issues parked: none.
