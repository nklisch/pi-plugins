---
id: epic-mcp-runtime-integration-lifecycle-reconciliation-portable-contracts
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-lifecycle-reconciliation
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Strengthen the Portable MCP Lifecycle Contract

## Checkpoint

Make exact lifecycle reconciliation expressible before a production fork is published. Replace the optional stale-digest replacement input with required absent/exact compare-and-replace, wrap each complete secret-free source in a canonical registration digest, unify source/server/component/transport bindings, and add a non-secret runtime execution-lease callback. Tighten `applied`, `removed`, and `absent` semantics so success proves exact source-owned registration, tool/cache/process/connection, provider, and lease cleanup.

This is a package-neutral pre-production contract change. It does not add a runtime dependency, production adapter, lifecycle coordinator, state, journal, settings file, or transport implementation.

## Planned files

- `src/application/ports/mcp-runtime.ts`
- `src/application/mcp-source-registration.ts`
- `src/application/mcp-plugin-projection.ts`
- `src/application/ports/mcp-launch-context.ts`
- `src/application/mcp-runtime-capability-probe.ts`
- `src/domain/error-contract.ts`
- `src/index.ts`
- `test/application/mcp-runtime-contract.test.ts`
- `test/application/mcp-plugin-projection.test.ts`
- `test/application/mcp-launch-contract.test.ts`
- `test/application/mcp-runtime-capability-probe.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Required contract

- `McpSourceRegistrationSchemaV1` binds one `McpConfigSource` to a recomputed canonical SHA-256 digest.
- `McpSourcePreconditionSchemaV1` is exactly `{kind:"absent"} | {kind:"exact", identity}` and is required by every `replaceSource` call.
- `McpRuntimeServerBindingSchemaV1` is reused by launch values, active selection, and runtime leases.
- `McpRuntimeLeaseProvider.acquire/release` uses opaque non-serializable tokens and is separate from plaintext launch-value disposal.
- `McpSourceStatus` carries `registrationDigest`; source state and sorted inventory remain redacted.
- `McpRuntimeCapabilities.sourceLifecycle.runtimeLeases` is required for aggregate MCP runtime availability.
- `PluginMcpProjection.kind:"source"` carries the verified registration while its existing digest remains contribution evidence.
- Exact remove `absent` is an idempotent cleanup proof, not merely “not in one map.” Ownership mismatch never cleans a newer source.

## Acceptance evidence

- [ ] Registration digest rejects any identity/server/options/projection/template/alias/provenance mutation and caller-supplied mismatch.
- [ ] Absent CAS catches concurrent first registration; exact CAS catches stale revision without an unconditional fallback.
- [ ] Source/launch/lease binding disagreement fails before provider invocation.
- [ ] Capability mapping reports the runtime unavailable when execution leases are unsupported while leaving unrelated facts unchanged.
- [ ] Strict statuses/results/tokens serialize without source definitions, plaintext, paths, lease/session/process identity, abort messages, native causes, or package names.
- [ ] Existing source fake/conformance callers migrate in one break; optional `expectedProjectionDigest` and any compatibility branch are removed.
- [ ] The maintained-fork and production-adapter stories can consume the strengthened contract unchanged, but fake success does not claim published production support.

## Ordering constraint

Foundation checkpoint. The reconciliation participant and runtime-lease cleanup stories depend on this contract.

## Implementation notes

- Added canonical `McpSourceRegistration` construction and verification over the complete secret-free source, with required absent/exact source preconditions and one shared runtime server binding for launch and execution-lease callbacks.
- Replaced the development-only optional projection-digest path in `McpRuntimePort` with exact registration, CAS, runtime-lease, registration-status, and runtime-lease capability contracts. `PluginMcpProjection` now carries the verified registration.
- Migrated the package-neutral fake and reusable conformance harness in one break. The fake validates registration digests, rejects concurrent absent/stale exact writers, keeps native keys owner-local, and treats process/connection lease cleanup as part of successful replace/remove/absent semantics.
- Exported only portable schemas, types, and registration factories. No package adapter, Pi integration, settings writer, state/journal path, or production capability claim was added.

## Verification

- Focused MCP contract/projection/launch/fake/conformance/integration suites: **47 passed, 0 failed**.
- Full Vitest suite at this checkpoint: **937 passed, 0 failed**.
- `npm run typecheck`: passed.
- `npm run boundaries`: passed (**235 modules, 1,418 dependencies**, no violations).
