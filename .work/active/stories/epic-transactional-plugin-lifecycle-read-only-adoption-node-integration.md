---
id: epic-transactional-plugin-lifecycle-read-only-adoption-node-integration
kind: story
stage: implementing
tags: [security, compatibility, infra]
parent: epic-transactional-plugin-lifecycle-read-only-adoption
depends_on: [epic-transactional-plugin-lifecycle-read-only-adoption-application-import]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Wire fixed read-only Node discovery and package integration

## Checkpoint

Implement and compose the fixed three-file Node adapter for Claude known marketplaces, Claude user settings, and Codex user config. Enforce bounded regular UTF-8 reads, missing-host tolerance, cancellation, and zero writes/enumeration. Wire pure readers, SHA-256, and the caller-supplied normal marketplace registrar into the public Node adoption service.

The adapter must never inspect Claude/Codex marketplace install roots, plugin caches, credentials, trust, auth, enabled plugins, or activation data. The composition factory requires a registrar and has no direct-state or install fallback.

## Scope

- `src/infrastructure/adoption/node-foreign-state-files.ts`
- `src/composition/create-adoption-service.ts`
- `src/index.ts`
- `package.json` and `package-lock.json` for the TOML parser
- `.dependency-cruiser.cjs`
- infrastructure/integration/public/package/boundary tests
- foundation docs only if implementation makes a current assertion false or misleading

## Acceptance evidence

- Filesystem tests observe exactly `~/.claude/plugins/known_marketplaces.json`, `~/.claude/settings.json`, and `${CODEX_HOME:-~/.codex}/config.toml`; no directory scan or write occurs.
- Missing, non-regular, oversized/growing, invalid-UTF-8, unreadable, symlink-to-regular, and aborted cases return the designed deterministic observation or cancellation behavior.
- Temporary-home integration proves no CLI dependency, cross-host equivalent merge, source-located conflicts, stale-selection rejection, project local-path rejection, and declaration-only registrar calls.
- Sentinel cache/credential/trust/enabled-plugin files are never opened.
- Public/compiled allowlists expose only stable adoption contracts, ports, service, and Node factory; private parsers/file handles/native causes stay private.
- Full `npm test` passes strict typechecking, dependency boundaries, Vitest, build, and exact compiled import.

## Ordering constraint

Depends on application orchestration. This is the final integration checkpoint before feature-level verification and one standard review pass.
