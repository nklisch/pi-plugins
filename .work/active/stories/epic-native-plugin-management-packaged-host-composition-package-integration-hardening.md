---
id: epic-native-plugin-management-packaged-host-composition-package-integration-hardening
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-reload-recovery-application-container]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Harden the Compiled Pi Package and Consumer Composition

## Checkpoint

Publish the default compiled no-production-runtime Pi entry and `./pi` composition subpath, prove clean consumer discovery/import, and close duplicate/process/restart/disposal/public-boundary evidence. Do not add command grammar, TUI, unpublished runtime dependencies, push, or release behavior.

## Planned files

- `src/pi/extension.ts`
- `src/pi/index.ts`
- `src/index.ts`
- `package.json`
- `.dependency-cruiser.cjs`
- `test/integration/packaged-host-clean-environment.test.ts`
- `test/integration/packaged-host-reload.test.ts`
- `test/integration/packaged-host-disposal.test.ts`
- `test/compiled-package-import.mjs`
- `test/compiled-pi-package-import.mjs`
- `test/public-api.test.ts`
- `test/tooling/boundaries.test.ts`

## Required behavior

- `package.json#pi.extensions` names compiled `dist/pi/extension.js`; package files remain compiled `dist` only.
- `@nklisch/pi-plugin-host/pi` exports the construct-only factory and safe host/application/status types, not raw session id/cwd/file binding.
- The default extension passes no MCP/subagent production adapter and truthfully reports both unavailable.
- Root exports retain intended library contracts; no private state/config/SQLite/path/credential/broker/selection/runtime mutation surface escapes.
- Dependency rules preserve inward application/domain boundaries and isolate Pi types to Pi/composition adapters.
- Packed clean startup works without Claude/Codex homes, executables, caches, or unpublished packages.

## Acceptance evidence

- [ ] `npm pack` installs into an empty consumer and Pi package metadata discovers the compiled extension without source imports or TypeScript loader.
- [ ] Offline skill/ordinary-hook-only fixture starts; no-MCP/no-subagent facts are unavailable without false production claims.
- [ ] Duplicate roots, two processes, restart, adapter disappearance, partial start after each acquisition, reload overlap, in-flight callback shutdown, and repeated close are covered.
- [ ] Exact source/compiled root and `./pi` export allowlists pass; raw session identity/paths, private internals, and fakes remain absent.
- [ ] Full `npm test` passes typecheck, boundaries, focused/unit/integration/child-process tests, build, package imports, and packed discovery.

## Ordering constraint

Final checkpoint after the complete application container. It advances no user workflow and selects no production fork.

## Implementation notes

- Added the compiled default Pi extension and `./pi` subpath. The public Pi surface contains only the construct-only factory, redacted host error/status values, and safe structural types; raw bindings, paths, database adapters, brokers, catalogs, and fakes remain private.
- Added `pi-package` discovery metadata and a compiled `dist/pi/extension.js` manifest entry. The default extension supplies no MCP or subagent implementation.
- Added source/compiled Pi export allowlists, clean packed-consumer extraction/import/discovery, duplicate-root and partial-start reverse-disposal coverage, and idempotent close evidence.
- Fixed real first-use multiprocess races found by the full suite: private-directory creation now accepts only a revalidated `EEXIST` winner, lifecycle state openers use a bounded SQLite busy handler, and recovery-journal schema/identity publication is serialized under one exclusive transaction. The adversarial recovery and lifecycle-state process tests passed repeated stress runs.
- Full verification: 201 test files and 1,037 tests passed; source/test typechecking had no errors; dependency boundaries passed over 276 modules/1,746 dependencies; build, 522-export root import, 3-export Pi subpath import, and packed-consumer discovery passed.
