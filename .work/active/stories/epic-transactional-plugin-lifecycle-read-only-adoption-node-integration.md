---
id: epic-transactional-plugin-lifecycle-read-only-adoption-node-integration
kind: story
stage: done
tags: [security, compatibility, infra]
parent: epic-transactional-plugin-lifecycle-read-only-adoption
depends_on: [epic-transactional-plugin-lifecycle-read-only-adoption-application-import]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
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

## Implementation notes

- Added the fixed three-path Node adapter. It performs bounded `stat`/open/read operations, accepts regular symlink targets, rejects non-regular/oversized/invalid-UTF-8 files safely, and never enumerates or writes foreign state. It follows the injected user home, Claude root, Codex root, and `CODEX_HOME` default only.
- Added the Node composition root with an explicit normal marketplace registration port, private reader registry, and injected SHA-256. There is no direct state, trust, cache, activation, or installation fallback.
- Added public stable adoption contracts/factories, the TOML runtime dependency, and an adoption-specific dependency boundary rule. Private parser and filesystem helpers remain unexported.

## Verification

- `npm run typecheck` — passed.
- `npm run boundaries` — passed (143 modules, 836 dependencies).
- `npx vitest run test/infrastructure/adoption/node-foreign-state-files.test.ts test/integration/adoption.test.ts test/application/adoption-contract.test.ts test/application/adoption-service.test.ts test/formats/claude/state-reader.test.ts` — 20 tests passed.
- `npm run test:package` — build and exact compiled import passed (378 exports).
