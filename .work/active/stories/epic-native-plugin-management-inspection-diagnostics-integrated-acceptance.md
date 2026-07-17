---
id: epic-native-plugin-management-inspection-diagnostics-integrated-acceptance
kind: story
stage: done
tags: [compatibility, security, testing]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-packaged-service-composition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Prove native inspection in clean, stale, and hostile environments

## Checkpoint

Add packaged integration coverage and schema-valid split-inspector data for clean/offline, cross-scope, stale-race, corrupt/recovery, capability absence, complete/partial runtime evidence, MCP health, adoption, and hostile text/secret/path/native-cause cases. This checkpoint adds data and tests only, not UI code.

## Files

- `test/integration/native-inspection-clean-environment.test.ts`
- `test/integration/native-inspection-snapshot-races.test.ts`
- `test/integration/native-inspection-runtime-health.test.ts`
- `test/integration/native-inspection-security.test.ts`
- `test/fixtures/native-inspection/split-inspector.ts`
- `test/fixtures/native-inspection/hostile-values.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Acceptance evidence

- Packed clean host needs no Claude/Codex/MCP/subagent package or network for list/installed/host diagnostics.
- User/project and installed/candidate collisions remain separate through IDs, cursors, detail, and diagnostics.
- Every authority-change race returns stale rather than mixed evidence.
- Missing/corrupt/recovery/capability/runtime/adoption failures isolate while valid siblings survive.
- MCP local activation versus remote health is proven without contacting a server.
- Terminal/control/Unicode/path/URL/command/header/environment/secret/native-cause canaries cannot leak or alter output structure.
- Full `npm test` passes typecheck, boundaries, focused suites, build, and compiled export checks.

## Implementation notes

- Added schema-validated split-inspector page/detail fixtures for active-with-update, disabled, marketplace candidate, incompatible, recovery-required, project-untrusted, MCP remote failure, stale/offline, and hostile-display scenarios. They contain data only.
- Integrated race tests prove return-boundary and replay rejection; runtime tests prove activation/health separation and recovery/trust precedence; security tests scan every serialized fixture string and all leakage canaries.
- A real packaged-host clean-environment test starts without optional MCP/subagent packages, lists both subject kinds offline, diagnoses locally, confirms the three-method native inspection surface, and disposes all host resources.
- Public API and compiled-package allowlists now cover the intended native schemas, identifiers, display/disclosure helpers, diagnostic compiler/registry, and unified service factory. The packaged Pi entry remains three exports.
- Final verification: focused native/public suites 64 tests; full `npm test` green with 230 files and 1,124 Vitest tests, dependency boundaries, build, 623 root exports, 3 Pi exports, and isolated packed Pi startup.
