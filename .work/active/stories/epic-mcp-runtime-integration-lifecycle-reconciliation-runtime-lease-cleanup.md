---
id: epic-mcp-runtime-integration-lifecycle-reconciliation-runtime-lease-cleanup
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-lifecycle-reconciliation
depends_on: [epic-mcp-runtime-integration-lifecycle-reconciliation-portable-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Bind MCP Execution Cleanup to Existing Revision Leases

## Checkpoint

Adapt exact MCP active-selection evidence to the existing `RevisionLeaseStore` so a standard-I/O process or remote connection pins its immutable plugin revision and complete projection until runtime close. Keep this non-secret runtime lease separate from the short-lived launch-value lease: values are disposed immediately after launch/connect consumption while artifact retention lasts until process/connection termination.

The MCP runtime remains responsible for process/connection start, supervision, cancellation, and close. This checkpoint adds no process manager, lease database, heartbeat, expiry, takeover, or transport code.

## Planned files

- `src/runtime/mcp/revision-lease-provider.ts`
- `src/index.ts`
- `test/runtime/mcp/revision-lease-provider.test.ts`
- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-runtime-port.test.ts`

## Required behavior

- `createMcpRevisionLeaseProvider` accepts one verified source registration, `McpLaunchActiveSelectionPort`, existing `RevisionLeaseStore`, `LifecycleClock`, session id, and SHA-256.
- Acquire validates source/server/component/transport, enters the pin-or-abort active-selection callback, verifies exact expectation/revision/component evidence, derives existing plugin-store and projection refs, then acquires exactly those retained artifacts.
- Returned tokens are provider-owned, opaque, redacted, and backed by private state.
- Release is idempotent after success; a failed underlying release remains retryable and cannot become cleanup success.
- The fake runtime acquires before launch values, disposes values after immediate consumption, holds the runtime lease until execution close, and releases on success, failure, cancellation, source replacement, and removal.
- Replace/remove may return `applied`/`removed`/`absent` only after all old exact-source execution leases are released. Ownership mismatch leaves newer-source leases untouched.

## Acceptance evidence

- [ ] Wrong source/server/component/transport/revision/project/trust evidence performs no lease effect.
- [ ] Open executions pin both plugin and projection artifacts while no command, URL, header, bearer, environment, root, configuration value, or process identity enters the public lease token.
- [ ] Replacement and removal close/release exact old executions before success; another plugin/scope with the same native key remains open.
- [ ] Launch cancellation disposes plaintext and releases the runtime lease exactly once.
- [ ] Release/process-close failure produces explicit cleanup failure/ambiguity and blocks exact removal evidence.
- [ ] Process death relies on the existing process-start-token owner classification; unsupported/unknown liveness retains rather than guessing.
- [ ] The reusable conformance suite catches early release, missing release, double-effect release, stale-owner cleanup, and unregister-before-cleanup.

## Ordering constraint

Depends only on portable contracts and may implement in parallel with the reconciliation participant. Recovery conformance requires both.

## Implementation notes

- Added `createMcpRevisionLeaseProvider`, adapting one immutable source registration and the existing pin-or-abort active-selection callback to the existing `RevisionLeaseStore`.
- Acquire validates exact source/server/component/transport, complete projection/revision/component/current-project trust evidence, and derives only the existing plugin-store key and projection reference. The returned token is provider-owned, opaque, non-serializable, and redacted.
- Release is idempotent after success, serialized under concurrent calls, and remains retryable after failure. Cancellation after underlying acquisition performs runtime-owned cleanup before returning a safe failure.
- Extended the reusable runtime conformance negatives to catch early, missing, and double execution-lease release. The package-neutral fake proves launch-value disposal is immediate while runtime leases remain until process/connection close and block replace/remove success on cleanup failure.
- Added no process supervisor, heartbeat, expiry, takeover, lease database, liveness classifier, transport implementation, or secret/configuration/root field to lease artifacts.

## Verification

- Focused revision-lease/fake/conformance/runtime/public suites: **31 passed, 0 failed**.
- `npm run typecheck`: passed.
- `npm run boundaries`: passed (**237 modules, 1,444 dependencies**, no violations).
- `npm run test:package`: passed; compiled package import allowlist **522 exports**.
