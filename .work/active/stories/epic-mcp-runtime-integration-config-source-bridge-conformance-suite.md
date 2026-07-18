---
id: epic-mcp-runtime-integration-config-source-bridge-conformance-suite
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-config-source-bridge
depends_on: [epic-mcp-runtime-integration-config-source-bridge-fake-runtime]
release_binding: 0.1.0
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Create the MCP Runtime Adapter Conformance Suite

## Priority

High; implementable after the capability mapper and fake, and the acceptance gate for any production package.

## Deliverable

Create one reusable parameterized contract suite for `McpRuntimePort` implementations. Run it against `FakeMcpRuntime` immediately. The future upstream or fork wrapper must invoke this suite unchanged and add only package/Pi-specific factory-order tests.

## Planned files

- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-runtime-port.test.ts`

## Harness checkpoint

```typescript
export interface McpRuntimeContractHarness {
  readonly runtime: McpRuntimePort;
  launch(identity: McpSourceIdentity, serverKey: string, signal: AbortSignal): Promise<void>;
  failNextReplacement(): void | Promise<void>;
}

export function defineMcpRuntimeContract(
  name: string,
  create: () => McpRuntimeContractHarness | Promise<McpRuntimeContractHarness>,
): void;
```

The shared matrix covers strict local validation, exact source identity, complete replacement, expected-digest stale detection, prior-source retention, exact/idempotent removal, sorted source-qualified inspection, safe provenance/status, registration-versus-connection health, complete capabilities, cancellation, late provider timing, and guaranteed disposal.

Package-specific tests remain separate because the portable port cannot itself prove that a factory is side-effect-free, file discovery is disabled, initial sources precede Pi tool registration, no global settings/files are touched, or cache/process/tool keys retain source identity.

## Acceptance evidence

- [ ] The verified fake passes the complete shared contract.
- [ ] Deliberately broken harness variants prove the suite detects non-atomic replacement, global-name removal, early provider resolution, and unsafe inspection.
- [ ] Offline/local registration succeeds while simulated remote connection status may fail independently.
- [ ] Cancellation and secret canaries are covered at every mutable/launch seam.
- [ ] The suite accepts either upstream or fork wrappers without package-name conditionals.

## Ordering

Depends on `epic-mcp-runtime-integration-config-source-bridge-fake-runtime`. Capability mapping can complete in parallel because the shared conformance matrix validates portable runtime facts, not compatibility-policy projection.

The production adapter depends on this suite; implementable stories do not depend on the production adapter.

## Risk and rollback

The risk is testing only the fake's implementation choices. Keep assertions at public behavior and require intentionally broken harnesses. Package construction/tool-order assertions remain explicit production integration tests. Rollback is replacing the harness while preserving the portable port; no runtime behavior changes.

## Blocker ownership

None. Plugin Host maintainers own the shared suite. A future production package owner must make its wrapper pass rather than weakening assertions.

## Implementation notes

- Execution capability: Luna xhigh; the suite is the qualification seam for atomic ownership and callback custody, so it deliberately includes adversarial negative evidence.
- Review weight: standard (caller explicitly requested no feature review; fake contract and negative-harness tests are the checkpoint evidence).
- Files changed: `test/contract/mcp-runtime.contract.ts`, `test/contract/mcp-runtime.contract.test.ts`, `test/integration/mcp-runtime-port.test.ts`.
- Tests added: one reusable lifecycle matrix plus four deliberately broken harnesses covering early provider resolution, pre-publication deletion, global-name removal, and unsafe inspection.
- Simplification: future adapters register one `McpRuntimeContractHarness`; package-specific factory/order tests remain outside the portable contract.
- Discrepancies from design: the reusable assertion helper is exported from the test-only contract module so negative harnesses and future adapter tests can invoke the same matrix; no production barrel export was added.
- Adjacent issues parked: none.
- Verification: `npm run typecheck` and the two contract test files passed (5 tests, no type errors). The fake passed the unchanged shared suite; every broken harness was rejected by the same assertions.
