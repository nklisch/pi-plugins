---
id: epic-mcp-runtime-integration-plugin-projections-projection-conformance
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-plugin-projections
depends_on: [epic-mcp-runtime-integration-plugin-projections-source-projection]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Prove MCP Projection Behavior Through the Portable Fake

## Checkpoint

Exercise generated sources through the completed package-neutral `FakeMcpRuntime` and its conformance semantics. This proves descriptor validity, exact ownership, deterministic inspection/removal, alias capability handling, and redaction without pretending a production adapter or registration path exists.

## Files

- `test/integration/mcp-plugin-projection.test.ts`
- `test/fixtures/compatibility/mcp.ts`

## Integration vectors

- a no-MCP complete plugin;
- stdio and Streamable HTTP structural plans;
- duplicate native keys across user/project scope and distinct plugins;
- revision/projection replacement with stable server keys and exact source identity;
- missing, extra, unavailable, stale, and mismatched compatibility evidence;
- supported-to-unsupported declaration drift;
- Claude, Codex-only, and dual-provenance alias decisions;
- alias capability on/off, native collisions, and two-source claim collisions;
- composed/decomposed Unicode, separators, path-like names, controls, and insertion-order permutations;
- declaration/path/header/environment/secret canaries.

## Acceptance evidence

- [ ] Every generated non-empty source passes fake validation/replacement and returns source-qualified, deterministic, redacted status.
- [ ] `kind: none` makes no runtime call, and no test treats an empty source as deactivation.
- [ ] Inspection/removal succeeds only with exact generated identity; native/display/alias names cannot remove another source.
- [ ] Alias-disabled and collision cases retain native discovery semantics and stable safe omission evidence.
- [ ] Launch provider resolve/dispose counters remain zero throughout this feature's tests.
- [ ] Full verification records no production dependency, runtime adapter, launch/connect, lifecycle mutation, reload, projection persistence, or `pi-mcp-adapter` coupling.

## Ordering and boundary

Depends on the deterministic source projection. This is the final feature checkpoint and remains fully implementable against the portable fake while the parent bridge's production-adapter story is externally blocked.

## Implementation notes

- Added one package-neutral integration matrix that feeds generated non-empty sources through `FakeMcpRuntime.validateSource` and atomic replacement, while `kind: none` performs no runtime call.
- Proved exact source-qualified inspection/removal, equal native-key isolation across user/project scopes and plugins, stable local replacement keys, stale ownership handling, sorted status provenance, alias capability on/off, native-first collision handling, and omit-all claimant behavior.
- Provider resolve/dispose counters remain zero because this feature never enters launch/connect ownership. Status and result serialization omit declaration, command, argument, working-directory, environment, URL, header, bearer, provider, options, and launch-template canaries.
- Integration uses only the portable projection contracts, package-internal resolver, test fixture, and fake. No production dependency/adapter, package claim, lifecycle mutation, reload, projection persistence, or `pi-mcp-adapter` coupling was added.

## Verification

- `npm run typecheck` — passed.
- `npx vitest run test/integration/mcp-plugin-projection.test.ts` — 1 file, 4 tests passed.
