---
id: epic-mcp-runtime-integration-launch-context-trusted-context
kind: story
stage: done
tags: [compatibility, infra, security]
parent: epic-mcp-runtime-integration-launch-context
depends_on: [epic-mcp-runtime-integration-launch-context-portable-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Build the Trusted MCP Invocation Context

## Priority

High; security authority checkpoint before any transport value is rendered.

## Deliverable

Implement `createMcpLaunchContextPort` over the package-neutral active-selection lease and existing content/data, project-root, project-trust, trust-candidate, configuration, path, and secret boundaries. One callback receives exact physical roots plus the existing `ResolvedConfiguration` facade only after every active/trust/configuration binding has been revalidated.

This checkpoint does not interpret command/URL/header values and does not call the MCP runtime. It establishes the authoritative callback in which the next checkpoint may render one immediate launch result.

## Planned files

- `src/application/mcp-launch-context.ts`
- `src/application/ports/mcp-launch-context.ts`
- `src/application/ports/mcp-launch-environment.ts`
- `test/application/mcp-launch-context.test.ts`
- `test/support/fakes/mcp-launch-context.ts`

## Authority checkpoints

- Parse the binding and require the selected active `ProjectionExpectation` to match source scope/plugin/revision/projection digest exactly.
- Verify the installed revision matches projection plugin/revision/content/data/configuration refs and the source's selected component exists exactly once with the requested id/transport.
- Verify the trust candidate and its canonical executable surface contain the exact MCP component id/native key/declaration selected by the projection.
- Authorize the exact candidate before root/data effects. Acquire the current project-root capability and compare identity/key/root with the pinned current-project evidence.
- Project scope requires exact project key and current trusted assessment. User scope remains distinct but still receives the current project root.
- Resolve content/data roots from the exact logical refs per invocation and verify returned scope/plugin/ref evidence.
- Invoke `withResolvedPluginConfiguration` around the final callback, passing the acquired project capability. This repeats project/plugin trust, configuration document/ref/scope/plugin/descriptor/revision validation, path recheck, and secret fetch immediately before use.
- Discard callback completion and let both selection/configuration callbacks dispose in `finally` on success, failure, and abort.

## Selection lease contract

`McpLaunchActiveSelectionPort.withSelection` must keep the exact selection authoritative for callback lifetime. Source replacement/removal either waits for the callback or aborts the supplied signal before authority is withdrawn. A get-only snapshot that can silently go stale is non-conforming. This story supplies a deterministic fake lease only; lifecycle composition later adapts existing active projection/revision authority.

## Acceptance evidence

- [ ] A table independently drifts scope, plugin, revision, projection digest, server key, component id, transport, projection/ref, installed revision, candidate evidence, executable declaration, and current project; every case fails before configuration/secret/environment/final callback.
- [ ] Untrusted, wrong-key, wrong-identity, forged/spread, and changed project-root capabilities fail closed; user scope never authorizes a project source.
- [ ] Missing/mismatched content or data evidence fails without returning physical roots or opening configuration plaintext.
- [ ] Trust revocation, descriptor drift, stale/forged configuration document, path drift, and required-secret loss are observed on the invocation where they occur.
- [ ] Callback completion cannot return a facade/value; escaped facades are disposed and stringify only as `[REDACTED]`.
- [ ] Pre-abort invokes no dependency; abort at every awaited seam propagates the exact reason unchanged.
- [ ] Concurrent callbacks receive independent selection/configuration/root objects and no mutable authority is shared.

## Ordering

Depends on `epic-mcp-runtime-integration-launch-context-portable-contracts`. Transport delivery depends on this checkpoint.

## Risk and rollback

The main risk is a race between active selection and trust/configuration resolution. The callback-style lease plus a second resolver-owned trust check defines the safety boundary. If native composition cannot provide pin-or-abort semantics, production launch remains unavailable; do not replace the lease with a stale cache. Rollback removes this uncomposed application service without changing authoritative state.

## Production boundary

The fake proves authority/callback behavior only. No lifecycle state, reload observer, revision lease implementation, source registration, process, connection, or `pi-mcp-adapter` composition is claimed.

## Implementation notes

- Added `createMcpLaunchContextPort` as the sole application authority window. It parses and copies the active selection, recomputes projection/revision/reference evidence, verifies the exact MCP component against the projection and trust executable surface, and rejects source/component/transport drift before effects.
- Exact plugin trust is authorized before root/data work. Current project trust and the opaque project-root capability are rechecked for every invocation; project-scoped sources must match the current project key/identity/root exactly, while user scope retains its distinct configuration-path semantics.
- Content and data roots are resolved from the installed revision's logical refs per invocation. Content-store identity, binding, manifest digest, scope, plugin, and refs are all checked before any physical root reaches the callback.
- The existing `withResolvedPluginConfiguration` callback remains the final trust/document/descriptor/path/secret revalidation boundary. Callback completions are discarded and all native failures collapse to stable identity-only MCP launch codes.
- Added deterministic active-selection and requested-name-only environment fakes. The active fake implements pin-or-wait replacement rather than a stale get-and-cache snapshot.

## Verification

- Focused authority matrix: `npx vitest run test/application/mcp-launch-context.test.ts` — **11 passed, 0 failed**.
- The matrix covers projection/revision/component/trust/project drift, absent trust before effects, exact project authority, pre-abort, mid-content abort identity, redacted configuration failure, and callback/root success evidence.
- `npm run typecheck` — passed.
- No lifecycle state, reload observer, production selection adapter, source registration, process, connection, or package composition was added.
