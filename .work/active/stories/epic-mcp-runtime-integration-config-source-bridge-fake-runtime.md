---
id: epic-mcp-runtime-integration-config-source-bridge-fake-runtime
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: [epic-mcp-runtime-integration-config-source-bridge-portable-contract]
release_binding: 0.1.0
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Build the Deterministic MCP Runtime Fake

## Priority

High; implementable after the portable contract and required for sibling feature tests.

## Deliverable

Create a reusable in-memory `FakeMcpRuntime` under test support. It implements `McpRuntimePort`, models exact scope/plugin ownership and revision/projection evidence, stages complete atomic replacement, preserves prior state on stale/rejected/cancelled operations, returns deterministic redacted inspection, and exposes a test-only launch hook proving late provider resolution and disposal.

## Planned files

- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`

## Fake checkpoint

```typescript
export class FakeMcpRuntime implements McpRuntimePort {
  constructor(options?: FakeMcpRuntimeOptions);
  capabilities(signal: AbortSignal): Promise<McpRuntimeCapabilities>;
  validateSource(source: McpConfigSource, signal: AbortSignal): Promise<McpSourceValidationResult>;
  replaceSource(request: McpSourceReplaceRequest, signal: AbortSignal): Promise<McpSourceReplaceResult>;
  removeSource(identity: McpSourceIdentity, signal: AbortSignal): Promise<McpSourceRemoveResult>;
  inspectSource(identity: McpSourceIdentity, signal: AbortSignal): Promise<McpSourceStatus | undefined>;
  inspectSources(signal: AbortSignal): Promise<readonly McpSourceStatus[]>;

  launch(identity: McpSourceIdentity, serverKey: string, signal: AbortSignal): Promise<void>;
  failNextReplacement(code?: string): void;
}
```

- Use scope/plugin as the logical owner and retain the complete exact identity as current evidence. Native server keys never become global deletion authority.
- Parse and copy stored input/output so callers cannot mutate fake authority.
- Stage validation and failure injection before one map swap. Stale expected digest and abort leave source, status, and provider untouched.
- Do not invoke providers during construction, capability probing, validation, replace, remove, or inspect. Only test-only `launch` resolves values immediately, verifies the transport, and disposes in `finally` on success/failure/cancel.
- Inspect source locations only; never serialize source definitions or provider/callback objects.

## Acceptance evidence

- [ ] Identical native server keys remain isolated by scope and plugin.
- [ ] Atomic replace retains the old inspectable source after validation rejection, injected failure, stale expectation, or cancellation.
- [ ] Exact removal is idempotent only for true absence and refuses to remove a newer owner revision.
- [ ] Late provider call count is zero before launch and disposal count is one for every launch outcome.
- [ ] Secret canaries never appear in JSON/string output from status, diagnostics, results, or thrown fake failures.

## Ordering

Depends on `epic-mcp-runtime-integration-config-source-bridge-portable-contract`. It does not depend on capability mapping or the production adapter.

## Risk and rollback

A fake can become more permissive than production and hide integration defects. Keep it intentionally strict and make the next conformance story run the same behavioral assertions against every adapter. Rollback is test-support replacement only; no production state exists.

## Blocker ownership

None. Plugin Host maintainers own implementation. Sibling projection/launch-context tests may consume the fake once verified without waiting for the external package.

## Implementation notes

- Execution capability: Luna xhigh; the fake is an adversarial authority model for atomic ownership, cancellation, and secret-callback tests rather than a permissive mock.
- Review weight: standard (caller explicitly requested no feature review; focused fake tests and typecheck are the checkpoint evidence).
- Files changed: `test/support/fakes/mcp-runtime.ts`, `test/support/fakes/mcp-runtime.test.ts`.
- Tests added: six focused cases covering complete capabilities, scope/plugin collision isolation, atomic stale/injected/cancelled replacement, exact removal, late callback disposal, deterministic redaction/order, and copied authority.
- Simplification: one in-memory owner map models replacement/removal; no transport, process, filesystem, or package behavior is reimplemented.
- Discrepancies from design: `FakeMcpRuntimeOptions` only overrides the complete capability snapshot; failure injection uses the existing stable diagnostic-code registry and never echoes arbitrary caller codes.
- Adjacent issues parked: none.
- Verification: `npm run typecheck` and `npm run test:unit -- --run test/support/fakes/mcp-runtime.test.ts` passed (6 tests, no type errors).
