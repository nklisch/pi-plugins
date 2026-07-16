---
id: epic-mcp-runtime-integration-launch-context-conformance
kind: story
stage: implementing
tags: [compatibility, infra, security]
parent: epic-mcp-runtime-integration-launch-context
depends_on: [epic-mcp-runtime-integration-launch-context-transport-delivery]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Prove MCP Launch Lifetime and Race Conformance

## Priority

High; final portable evidence checkpoint before the feature can enter review.

## Deliverable

Extend the existing MCP fake and reusable bridge conformance suite to prove immediate provider timing, exact active selection, safe transport consumption, ownership transfer, exactly-once disposal, redacted typed failure/status, cancellation/timeout races, concurrent launches, and configuration/source revision changes. Add an end-to-end fake-port integration that runs the real trust/configuration resolver and launch provider without a concrete MCP package.

This story does not add or qualify a production runtime adapter. Package factory-order, file-discovery isolation, real process/connection cleanup, and Pi tool-registration tests remain in the externally blocked bridge production-adapter story.

## Planned files

- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`
- `test/support/fakes/mcp-launch-context.ts`
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-launch-context.test.ts`
- `test/application/mcp-runtime-contract.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`

## Conformance checkpoints

- Provider invocation count is zero through source creation, validation, replacement, inspection, capability probing, and removal.
- Fake launch consumes values in one callback and calls disposal in `finally` after success, transport mismatch, consumer throw, cancellation, timeout, and partial consumption.
- Safe source/server status may retain only source identity, server key, component id, provenance, connection state, tool count, and stable error code. It cannot retain values, templates, environment names, or native reason/cause/message.
- Cancellation and timeout reason objects propagate unchanged from provider resolution. Status classification observes only safe reason kind/code.
- Active-selection replacement/removal before callback denies the old source; replacement during a pinned callback must abort or wait according to the fake lease contract.
- Every resolve obtains current configuration/secret/path/environment authority. There is no per-source or per-server resolved-value cache.

## Race matrix

1. Pre-abort before selection: zero calls and zero leases.
2. Abort/timeout while selection, project root, trust, content, data, configuration, secret, path, or ambient environment is pending: exact reason, no output.
3. Abort after lease construction but before provider return: provider disposes once and rejects.
4. Abort after provider return: fake runtime disposes once in `finally`.
5. Consumer throw after reading one field: runtime disposes once; thrown/status evidence is redacted.
6. Source replacement before selection: old request rejected.
7. Replacement during selection: pin completes before replace or selection signal aborts; no silent stale continuation.
8. Two concurrent launches around configuration/environment revision change: each launch is internally coherent, objects are distinct, and neither mutates the other.
9. Disposal called twice or through another provider: cleanup effect remains once and no other lease is invalidated.

## Negative harnesses

The reusable contract must fail deliberately broken adapters/providers that:

- resolve during registration/inspection;
- return or retain a shared values object;
- match an active server by display/native name rather than exact source/component identity;
- permit source replacement while a stale un-aborted selection runs;
- copy plaintext into status, errors, diagnostics, logs, or test observations;
- skip disposal on consumer failure/cancel/timeout;
- run disposal effects twice;
- permit disposed value access;
- apply last-writer precedence to colliding environment/header names.

## Acceptance evidence

- [ ] Existing fake lifecycle/conformance assertions remain green and the extended suite covers all ownership/race outcomes above.
- [ ] Intentionally non-conforming harnesses fail for eager resolution, stale selection, shared/retained values, unsafe status, and missing/double disposal.
- [ ] Real `withResolvedPluginConfiguration`, trust candidate/record verification, root/content/data fakes, ambient facade, provider, and `FakeMcpRuntime.launch` integrate for both transports.
- [ ] Revoked trust, missing required secret, path drift, changed configuration revision, changed source projection, cancellation, and timeout are observed without a cache.
- [ ] Canary scans cover source/projection/configuration/status/evidence/diagnostic/error/logger/cache/public/compiled surfaces and find plaintext only inside live callback/lease assertions.
- [ ] Dependency tests keep domain/application ports package-neutral and prevent application imports from runtime/infrastructure/Pi/composition.
- [ ] Full `npm test` passes and implementation notes record test/export counts without claiming production launch support.

## Ordering

Depends on `epic-mcp-runtime-integration-launch-context-transport-delivery`. Green evidence advances this child directly to `done`; only the parent feature receives integrated review.

## Risk and rollback

A fake can overstate a future adapter. Keep package-specific timing, source replacement, file isolation, process/session cleanup, and tool-registration qualification explicitly in the blocked production story. The portable suite is necessary but not sufficient. Rollback removes fake/conformance additions only; runtime availability remains unchanged either way.

## Production boundary

Completion proves the largest faithful portable increment against the completed bridge seam. It does not satisfy `epic-mcp-runtime-integration-config-source-bridge-production-adapter`, does not make MCP capability facts available in production, and does not close the parent MCP epic.
