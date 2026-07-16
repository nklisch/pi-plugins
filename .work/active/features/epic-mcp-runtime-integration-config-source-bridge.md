---
id: epic-mcp-runtime-integration-config-source-bridge
kind: feature
stage: implementing
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration
depends_on: []
release_binding: null
gate_origin: null
research_refs:
  - docs/research/pi-mcp-adapter-config-source.md
  - .agents/skills/pi-mcp-adapter-v2/SKILL.md
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Plugin-Scoped MCP Configuration-Source Bridge

## Brief

Establish the narrow integration contract through which Plugin Host contributes a complete plugin-scoped MCP configuration source before MCP tool registration, reports the selected runtime's exact capabilities, inspects registered source/server status, and removes only the source it owns. The capability includes grounded verification of the then-current `pi-mcp-adapter` API, an upstream contribution where feasible, and packaging a narrowly maintained fork only when the required source contract cannot land upstream in time.

The bridge preserves the compatibility boundary: standard I/O and Streamable HTTP are eligible when runtime facts satisfy their requirements; explicit legacy SSE and WebSocket do not become supported merely because an implementation can approximate them. Transport, authentication, discovery, elicitation, sampling, process ownership, and tool registration remain MCP-runtime responsibilities.

This feature does not translate a particular plugin bundle, expand configured values or secrets, orchestrate install/update transactions, render status, or own authoritative plugin state. Domain and lifecycle callers depend on stable Plugin Host ports and capability facts, never directly on the upstream-versus-fork package choice.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: foundation capability; plugin projection and trusted launch-context work consume the verified source contract in parallel
- Depends on: none within this epic; the parent already depends on the completed transactional lifecycle
- Design alignment: preserve the parent epic's external integration, configuration-source, transport, trust, cancellation, and offline-startup decisions

## Boundary guardrails

- Verify current upstream behavior before selecting contribution or fork packaging; do not guess an API from foundation prose.
- A source is qualified by scope, plugin, revision/projection evidence, and can be inspected and removed without global-name matching.
- Capability reporting feeds the existing `RuntimeCapabilityProbe`; the adapter does not issue component verdicts or redefine compatibility policy.
- Source registration and structural validation are local and cancellable. They do not require network reachability or eager server startup.
- Status, errors, and provenance must be safe to serialize and must not contain expanded configuration, credentials, bearer material, or native causes.

## Simplification opportunity

- Replace settings-file mutation, per-server global registration, and any temptation to reimplement MCP with one plugin-scoped source adapter over the dedicated runtime.
- Keep the upstream and fork paths contract-identical so package selection does not leak conditional branches through application or domain code.
- Reuse the existing capability registry and error boundary rather than adding adapter-specific verdict or transport vocabularies.

## Foundation references

- `docs/VISION.md` — Standalone operation; Honest compatibility; Native Pi experience
- `docs/SPEC.md` — MCP servers; Component compatibility verdicts; Performance and availability
- `docs/ARCHITECTURE.md` — MCP adapter; Alternatives rejected; Pi integration
- `docs/COMPATIBILITY.md` — MCP server compatibility; MCP configuration shapes

## Research

- [`docs/research/pi-mcp-adapter-config-source.md`](../../../docs/research/pi-mcp-adapter-config-source.md) — grounded review of npm `pi-mcp-adapter@2.11.0` and upstream `main` at `82724dccc13a49310530898f922bafff12b7f3fe`, including package health, exact load timing, current API gaps, option evaluation, and the minimum upstream/fork contract.
- [`.agents/skills/pi-mcp-adapter-v2/SKILL.md`](../../../.agents/skills/pi-mcp-adapter-v2/SKILL.md) — auto-loading version/API reference for implementation and review.
- **External blocker:** no qualifying released upstream configuration-source API or declared maintained fork currently exists. Package-independent bridge ports/contracts/fakes can proceed; the production adapter and truthful MCP-runtime availability remain blocked until an upstream release or narrow maintained fork implements the researched contract.

## Design decisions

- **Architecture**: Land a schema-first Plugin Host application port, capability mapper, reusable fake, and conformance suite now; isolate the concrete `pi-mcp-adapter` import in one blocked runtime adapter story. This preserves Ports & Adapters and lets internal projection and launch-context work compile and test without inventing production availability.
- **External package posture**: Prefer the first qualifying upstream release. Use a narrowly maintained MIT fork only when delivery timing requires it, and only with the identical exported API and conformance suite. Open issue/PR SHAs, deep imports, monkeypatching, generated MCP files, Pi settings mutation, process-global secret injection, and an MCP SDK implementation are rejected.
- **Identity and ownership**: Exact source identity is the versioned tuple `scope + plugin + revision + projectionDigest`. Replacement uses the incoming scope/plugin owner plus an expected prior projection digest; removal receives the complete identity and cannot remove a newer revision or another scope/plugin with the same native server key.
- **Source shape**: The source is strict, JSON-safe, secret-free, and contains only standard-I/O or Streamable HTTP server projections plus source locations stripped of declaration payloads. An empty source is rejected; deactivation uses exact `removeSource`, not replacement with an ambiguous empty map.
- **Validation boundary**: Zod validates the Plugin Host contract before adapter calls, and `validateSource` performs runtime-specific structural validation again. Factory construction and validation are side-effect-free: no file discovery, networking, process startup, remote connection, cache mutation, or Pi tool registration.
- **Late launch values**: The port stores a provider with the source but must not invoke it during creation, validation, replacement, inspection, or capability probing. `resolve` runs only immediately before the runtime launches standard I/O or connects Streamable HTTP; `dispose` runs on success, failure, and cancellation. Expanded values never cross status, provenance, diagnostics, logs, or cache boundaries.
- **Operation outcomes**: Expected rejection and stale ownership are typed, schema-validated results. Unexpected adapter failures become the existing `BoundaryError` with `ADAPTER_FAILED`, safe operation/source identity details, and the native cause retained only on the thrown error. Abort reasons propagate unchanged.
- **Capability policy**: Exact runtime facts are mapped into the existing complete `RuntimeCapabilitySnapshot`; there is no adapter verdict registry. Add transport-specific standard-I/O and Streamable HTTP facts, and an MCP resources fact, to `RuntimeCapabilityRegistry`, then make existing policy rules cite them. Legacy SSE and WebSocket facts remain observable but have no supported policy route and remain explicitly incompatible.
- **Unavailable composition**: Absence of a qualifying package is a normal fail-closed composition state: `pi.mcp.runtime` and all dependent MCP facts are `unavailable`, while unrelated capability facts remain unchanged. A present adapter that fails to report a complete valid snapshot is an adapter boundary failure, not a fabricated unavailable snapshot.
- **Public surface**: Export the schema-derived portable port, source/status/result/capability schemas, and types through the explicit package barrel. Keep the fake, conformance harness, upstream/fork imports, Pi extension types, and concrete adapter factory package-internal unless a later composition feature demonstrates a public caller.
- **Internal handoff versus production closure**: Portable contract, capability, fake, and conformance stories are sufficient for `plugin-projections` and `launch-context` design/implementation. Those consumers must not import or branch on the concrete package. The blocked production adapter is still required before this feature, the production lifecycle integration, or the parent epic can claim MCP activation or close.
- **UI alignment**: No screen, flow, modal, or visual component is introduced. Mockups are skipped; typed status/provenance is presentation input for `epic-native-plugin-management` later.
- **Discovery/review posture**: Direct-read design covered project rules/conventions, all foundation and compatibility documents, parent/sibling items, committed research, the adapter reference skill, compatibility registry/probe, runtime projection/reload ports, error boundary, public export allowlist, and representative contract/integration tests. The caller explicitly prohibited nested agents, peeragent, and questions, so no advisory pass was run.

## Architectural choice

### Option 1 — Portable contract first, production adapter last (chosen)

Define the stable Plugin Host source lifecycle and capability contract in application ports, prove it with a reusable fake and adapter conformance suite, and place the real package import behind one runtime adapter. This optimizes for honest progress and stable internal boundaries while accepting that production activation remains externally blocked.

### Option 2 — Wait for upstream before defining any bridge

Defer all code until upstream publishes an API. This avoids temporary contract work but unnecessarily blocks deterministic projection, launch-context, capability, and lifecycle design, and gives upstream API naming control over Plugin Host's domain-facing boundary.

### Option 3 — Bridge current 2.11.0 internals or own MCP directly

Use deep TypeScript imports, mutate files/settings/process globals, monkeypatch construction order, or reimplement transport behavior on the MCP SDK. This may produce a demo sooner but cannot preserve source isolation, tool-registration timing, secret custody, atomic replacement, or semver safety. It violates committed architecture and is rejected.

The trickiest unit is the source lifecycle contract: it must separate exact local registration from remote connection health, preserve the old source across a failed/stale replacement, retain safe provenance, and carry a late provider without invoking it. The fake and conformance harness are designed around that seam before any production adapter is accepted.

## Portable bridge contract

### Source, status, and capability schemas

**File**: `src/application/ports/mcp-runtime.ts`
**Story**: `epic-mcp-runtime-integration-config-source-bridge-portable-contract`

```typescript
export const McpBridgeTransportSchema = z.enum([
  "stdio",
  "streamable-http",
]);
export type McpBridgeTransport = z.infer<typeof McpBridgeTransportSchema>;

export const McpSourceIdentitySchemaV1 = z.object({
  schemaVersion: z.literal(1),
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  revision: ContentDigestSchema,
  projectionDigest: ContentDigestSchema,
}).strict().readonly();
export type McpSourceIdentity = z.infer<typeof McpSourceIdentitySchemaV1>;

export const McpSourceServerSchemaV1 = z.object({
  componentId: ComponentIdSchema,
  transport: McpBridgeTransportSchema,
  options: z.record(z.string().min(1), JsonValueSchema).readonly(),
  launchTemplate: z.record(z.string().min(1), JsonValueSchema).readonly(),
  provenance: z.array(SourceLocationSchema).nonempty().readonly(),
}).strict().readonly();
export type McpSourceServer = z.infer<typeof McpSourceServerSchemaV1>;

export const McpConfigSourceSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  identity: McpSourceIdentitySchemaV1,
  servers: z.record(z.string().min(1), McpSourceServerSchemaV1).readonly(),
}).strict().readonly().superRefine(/* at least one server; unique component ids */);
export type McpConfigSource = z.infer<typeof McpConfigSourceSchemaV1>;

export const McpRuntimeCapabilitiesSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  sourceLifecycle: z.object({
    initialSourcesBeforeToolRegistration: z.boolean(),
    isolatedFileDiscovery: z.boolean(),
    localValidation: z.boolean(),
    atomicReplace: z.boolean(),
    exactRemove: z.boolean(),
    inspect: z.boolean(),
    cancellable: z.boolean(),
    lateLaunchValues: z.boolean(),
  }).strict().readonly(),
  transports: z.object({
    stdio: z.boolean(),
    streamableHttp: z.boolean(),
    legacySse: z.boolean(),
    websocket: z.boolean(),
  }).strict().readonly(),
  oauth: z.object({
    authorizationCode: z.boolean(),
    clientCredentials: z.boolean(),
  }).strict().readonly(),
  features: z.object({
    sampling: z.boolean(),
    elicitationForm: z.boolean(),
    elicitationUrl: z.boolean(),
    toolApproval: z.boolean(),
    resources: z.boolean(),
  }).strict().readonly(),
}).strict().readonly();
export type McpRuntimeCapabilities = z.infer<typeof McpRuntimeCapabilitiesSchemaV1>;
```

`McpSourceStatusSchema` is source-qualified and redacted. It carries the exact identity, source state (`registered | replacing | removing | failed`), and sorted server rows containing only server key, component id, source locations, local/connection state (`registered | idle | connecting | connected | needs-auth | failed`), optional tool count, and optional stable error code. It cannot carry server definitions, expanded launch values, error messages, callback results, or native causes.

### Late provider and lifecycle port

**File**: `src/application/ports/mcp-runtime.ts`
**Story**: `epic-mcp-runtime-integration-config-source-bridge-portable-contract`

```typescript
export const McpLaunchValueRequestSchema = z.object({
  source: McpSourceIdentitySchemaV1,
  serverKey: z.string().min(1),
  transport: McpBridgeTransportSchema,
}).strict().readonly();
export type McpLaunchValueRequest = z.infer<typeof McpLaunchValueRequestSchema>;

// Intentionally callback-only rather than JSON-schema-derived: these are the
// short-lived plaintext values consumed by the dedicated runtime.
export type McpLaunchValues =
  | Readonly<{
      transport: "stdio";
      command: string;
      args: readonly string[];
      cwd?: string;
      env?: Readonly<Record<string, string>>;
    }>
  | Readonly<{
      transport: "streamable-http";
      url: string;
      headers?: Readonly<Record<string, string>>;
      bearerToken?: string;
    }>;

export interface McpLaunchValueProvider {
  resolve(
    request: McpLaunchValueRequest,
    signal: AbortSignal,
  ): Promise<McpLaunchValues>;
  dispose(values: McpLaunchValues): void | Promise<void>;
}

export type McpSourceReplaceRequest = Readonly<{
  source: McpConfigSource;
  expectedProjectionDigest?: ContentDigest;
  launchValues: McpLaunchValueProvider;
}>;

export interface McpRuntimePort {
  capabilities(signal: AbortSignal): Promise<McpRuntimeCapabilities>;
  validateSource(
    source: McpConfigSource,
    signal: AbortSignal,
  ): Promise<McpSourceValidationResult>;
  replaceSource(
    request: McpSourceReplaceRequest,
    signal: AbortSignal,
  ): Promise<McpSourceReplaceResult>;
  removeSource(
    identity: McpSourceIdentity,
    signal: AbortSignal,
  ): Promise<McpSourceRemoveResult>;
  inspectSource(
    identity: McpSourceIdentity,
    signal: AbortSignal,
  ): Promise<McpSourceStatus | undefined>;
  inspectSources(signal: AbortSignal): Promise<readonly McpSourceStatus[]>;
}
```

`McpSourceValidationResultSchema` reuses `ReadResultSchema(McpConfigSourceSchemaV1)`. `McpSourceReplaceResultSchema` has `applied` (safe current status and optional prior identity), `stale` (safe current identity), and `rejected` (one or more existing `DiagnosticSchema` values) variants. `McpSourceRemoveResultSchema` has `removed`, `absent`, and `ownership-mismatch` variants; the mismatch contains requested/current identities only. Adapters validate every returned value against these schemas.

## Implementation units

### Unit 1: Portable schema-first MCP runtime port

**Files**:
- `src/application/ports/mcp-runtime.ts`
- `src/index.ts`
- `test/application/mcp-runtime-contract.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

**Story**: `epic-mcp-runtime-integration-config-source-bridge-portable-contract`

**Implementation notes**:
- Infer every serializable public type from strict Zod schemas. The only type-only exception is callback-scoped plaintext `McpLaunchValues`, matching the existing `ResolvedConfiguration` custody pattern.
- Reuse `ScopeReferenceSchema`, `PluginKeySchema`, `ContentDigestSchema`, `ComponentIdSchema`, `SourceLocationSchema`, `JsonValueSchema`, `DiagnosticSchema`, `ReadResultSchema`, and `BoundaryError`; do not add state schemas, adapter verdicts, or upstream package names.
- Cross-check the two bridge transports against supported MCP policy rules in tests. The bridge subset is not a second transport policy registry.
- Preserve the explicit package allowlist. Export portable contract values/types and the port; do not export fake/conformance/concrete adapter symbols.

**Acceptance criteria**:
- [ ] Strict schemas reject unknown fields, empty sources, duplicate component ids, unsupported `sse`/`websocket` source transports, and non-JSON/function launch templates.
- [ ] User/project scopes and different revision/projection digests produce distinct exact identities even when plugin and native server keys match.
- [ ] Status, validation, replacement, and removal results round-trip through schemas without declaration bodies, secrets, messages, or causes.
- [ ] Cancellation is part of every asynchronous port/provider signature and the public API/type/package allowlists are updated intentionally from the 438-export baseline.

### Unit 2: Exact MCP fact contribution to the existing runtime probe

**Files**:
- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/application/mcp-runtime-capability-probe.ts`
- `src/index.ts`
- `test/domain/compatibility-policy.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/domain/compatibility-table-contract.test.ts`
- `test/application/mcp-runtime-capability-probe.test.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

**Story**: `epic-mcp-runtime-integration-config-source-bridge-capability-probe`

```typescript
export function createMcpRuntimeCapabilityProbe(input: Readonly<{
  base: RuntimeCapabilityProbe;
  runtime?: Pick<McpRuntimePort, "capabilities">;
  capturedBy: string;
}>): RuntimeCapabilityProbe;
```

**Implementation notes**:
- Extend `RuntimeCapabilityRegistry` with standard-I/O transport, Streamable HTTP transport, and MCP resources facts. Existing MCP policy rules cite those IDs in addition to `pi.mcp.runtime`; do not add capability-specific component verdicts.
- Decorate one complete base snapshot and overwrite only MCP-owned capability entries. Non-MCP facts and complete-snapshot validation remain unchanged.
- `pi.mcp.runtime` is available only when all required programmatic-source lifecycle facts are true. Transport/feature facts are available only when the runtime contract itself is available and the exact fact is true.
- When `runtime` is absent, return a complete validated snapshot with every MCP fact unavailable and an explicit package-unavailable explanation. When a present runtime throws or returns malformed/incomplete facts, propagate abort or fail as `ADAPTER_FAILED`; do not silently downgrade a broken adapter.
- Keep explicit SSE and WebSocket policy rules incompatible regardless of reported runtime facts.

**Acceptance criteria**:
- [ ] Standard-I/O and Streamable HTTP components require their corresponding exact runtime fact; one may be available while the other is unavailable.
- [ ] Resource-bearing declarations require the resources fact; OAuth, sampling, approval, and elicitation continue to map from the existing registry.
- [ ] No qualifying runtime yields `pi.mcp.runtime: unavailable` without changing skill/hook/platform/subagent facts.
- [ ] Legacy SSE and WebSocket remain incompatible even when a fixture reports those runtime booleans as true.
- [ ] Abort and malformed adapter snapshots follow the existing capability-service error contract.

### Unit 3: Deterministic reusable in-memory fake

**Files**:
- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`

**Story**: `epic-mcp-runtime-integration-config-source-bridge-fake-runtime`

```typescript
export class FakeMcpRuntime implements McpRuntimePort {
  constructor(options?: FakeMcpRuntimeOptions);
  capabilities(signal: AbortSignal): Promise<McpRuntimeCapabilities>;
  validateSource(source: McpConfigSource, signal: AbortSignal): Promise<McpSourceValidationResult>;
  replaceSource(request: McpSourceReplaceRequest, signal: AbortSignal): Promise<McpSourceReplaceResult>;
  removeSource(identity: McpSourceIdentity, signal: AbortSignal): Promise<McpSourceRemoveResult>;
  inspectSource(identity: McpSourceIdentity, signal: AbortSignal): Promise<McpSourceStatus | undefined>;
  inspectSources(signal: AbortSignal): Promise<readonly McpSourceStatus[]>;

  // Test harness only; not part of McpRuntimePort.
  launch(identity: McpSourceIdentity, serverKey: string, signal: AbortSignal): Promise<void>;
  failNextReplacement(code?: string): void;
}
```

**Implementation notes**:
- Key mutable ownership by exact scope/plugin and retain the full revision/projection identity in each record. Server keys are source-local only.
- Parse/copy all stored source and status values so caller mutation cannot change fake authority.
- Validate and stage complete replacement before one map swap. Injected rejection, stale digest, or cancellation leaves the old source/provider/status unchanged.
- Never call the provider during construction, capability probing, validation, replacement, removal, or inspection. `launch` is the only test hook that calls `resolve`, checks matching source/server/transport, and calls `dispose` in `finally` on every outcome.
- Return sorted, schema-parsed status snapshots with source locations only. Definitions and providers never appear in inspection.

**Acceptance criteria**:
- [ ] Same native keys remain isolated across scope/plugin identities.
- [ ] Failed, stale, and cancelled replacements retain inspectable prior evidence and provider ownership.
- [ ] Exact removal is idempotent when absent and returns ownership mismatch rather than deleting a newer source.
- [ ] Provider invocation is provably late and disposal runs on launch success, failure, and cancellation.
- [ ] Serializing every fake status/error/result with secret canaries never reveals source definitions or callback values.

### Unit 4: Reusable adapter conformance contract

**Files**:
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-runtime-port.test.ts`

**Story**: `epic-mcp-runtime-integration-config-source-bridge-conformance-suite`

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

**Implementation notes**:
- Run the contract first against `FakeMcpRuntime`; the later production package must use the same suite rather than copy assertions.
- Cover strict validation, complete source replacement, expected-digest stale detection, exact ownership/removal, status sorting/provenance/redaction, capability completeness, cancellation, late provider timing, and disposal.
- Keep package-specific factory timing, disabled file discovery, Pi tool-registration order, and no-file/settings assertions as additional production integration tests because they cannot be proven through the portable port alone.
- Preserve useful-test economy: one parameterized contract matrix plus focused mapper/public-boundary tests, not a test for every schema branch.

**Acceptance criteria**:
- [ ] The fake passes the reusable lifecycle/redaction/cancellation contract.
- [ ] A deliberately non-conforming harness demonstrates the suite catches non-atomic replacement, imprecise removal, early provider resolution, and unsafe status.
- [ ] Contract assertions distinguish local registered inventory from remote connection/tool health.
- [ ] The suite can be invoked unchanged by either a qualifying upstream adapter or maintained fork adapter.

### Unit 5: Production `pi-mcp-adapter` integration and package selection

**Planned files after unblock**:
- `src/runtime/mcp/pi-mcp-adapter-runtime.ts`
- `src/composition/create-mcp-runtime.ts`
- `test/integration/pi-mcp-adapter-runtime.test.ts`
- `test/contract/pi-mcp-adapter-runtime.contract.test.ts`
- `package.json`
- `package-lock.json`

**Story**: `epic-mcp-runtime-integration-config-source-bridge-production-adapter`

```typescript
// Package-internal: callers receive only Plugin Host contracts.
export function createPiMcpRuntime(input: Readonly<{
  initialSources: readonly Readonly<{
    source: McpConfigSource;
    launchValues: McpLaunchValueProvider;
  }>[];
  fileDiscovery: "disabled";
}>): Readonly<{
  extension: (pi: ExtensionAPI) => void;
  runtime: McpRuntimePort;
}>;
```

**Implementation notes**:
- This unit is externally blocked. Do not add a dependency, source adapter, PR/fork claim, or production availability until the story's objective unblock gate is satisfied.
- The wrapper is the only source file importing the qualifying adapter export. It translates package values/errors into Plugin Host schemas and `BoundaryError`; application/domain/lifecycle modules never import or branch on upstream/fork identity.
- Factory creation parses inputs and captures no global state but performs no file reads, network activity, process startup, connection, cache write, or Pi tool registration. Initial sources are handed to the adapter before invoking its returned extension; Plugin Host always disables native file/import discovery.
- Running the returned extension may register Pi tools and runtime lifecycle behavior; source registration itself proves local inventory only and cannot require remote health.

**Acceptance criteria**:
- [ ] The pinned package exposes a documented supported export and passes the reusable conformance suite plus Pi factory-order/file-isolation integration tests.
- [ ] Two plugins/scopes with the same native server key remain isolated through real package status, replacement, removal, cache/process identity, and tool registration.
- [ ] Real replacement is all-or-nothing, exact removal closes only owned processes/metadata/tools, and inspection remains redacted/source-qualified.
- [ ] Late callback values are consumed only immediately before launch/connect and disposed on success, failure, and cancellation.
- [ ] Package absence keeps MCP facts unavailable; only a passing pinned package changes truthful production availability.

## Implementation order and dependency DAG

1. `epic-mcp-runtime-integration-config-source-bridge-portable-contract` — no dependencies.
2. In parallel after the contract:
   - `epic-mcp-runtime-integration-config-source-bridge-capability-probe` — depends on portable contract.
   - `epic-mcp-runtime-integration-config-source-bridge-fake-runtime` — depends on portable contract.
3. `epic-mcp-runtime-integration-config-source-bridge-conformance-suite` — depends on the fake runtime; capability mapping may complete in parallel.
4. `epic-mcp-runtime-integration-config-source-bridge-production-adapter` — depends on capability probe and conformance suite, and remains externally blocked.

There is no path from an implementable story to the blocked production story. Completion of the portable contract/fake/conformance checkpoints is the internal handoff for sibling projection and launch-context work. Production lifecycle proof, feature completion, and parent-epic completion remain dependent on the production adapter story.

## External blocker and exact unblock gate

**Current evidence**: `pi-mcp-adapter@2.11.0`, npm/GitHub release `v2.11.0`, and upstream `main` all point to `82724dccc13a49310530898f922bafff12b7f3fe`. The package has no supported library export for programmatic source registration, replace/remove, source status, complete capabilities, or late callbacks. Issue #85 is open; PR #56 is open, stale, dirty, and semantically incomplete. Neither is consumable.

The production adapter story unblocks only when **one** path satisfies all criteria:

### Qualifying upstream release

1. A published npm release—not an open PR or commit-only dependency—contains a documented package `exports` subpath with types for initial programmatic sources, disabled file discovery, complete source validate/replace/remove/inspect/capabilities, cancellation, and late launch values.
2. Source identity, atomicity, exact ownership, redacted local status, offline registration, callback timing/disposal, and pre-tool-registration semantics pass the committed conformance and Pi integration tests.
3. The exact npm version is pinned in `package.json`/lockfile with registry integrity and linked to its immutable upstream commit/tag provenance.
4. MIT licensing remains declared and the shipped package contains the required license notice.
5. Node 24 and the project's Pi version are covered by package/API tests; no deep imports or ambient file/settings/process-global setup is required.

### Qualifying maintained fork fallback

1. Plugin Host maintainers explicitly select and publish a clearly named MIT fork from a current verified upstream release, retain upstream history/copyright/license, identify package/repository owners, and document security-update/rebase responsibility.
2. The fork carries only the narrow public source-lifecycle seam and tests needed for the identical API; it does not fork transport/auth/discovery policy or introduce Plugin Host-specific branches outside the wrapper.
3. The exact package version, integrity, repository commit, upstream base commit, and license provenance are pinned and reviewable.
4. The same conformance, Pi factory-order/file-isolation, Node 24, cancellation, redaction, and package-export tests pass unchanged.
5. There is a documented path to return to upstream without changing any Plugin Host application/domain/lifecycle contract.

**Blocker ownership**:
- Upstream path: `nicobailon/pi-mcp-adapter` maintainers own API merge/release timing; Plugin Host maintainers own a current contract-focused contribution and release qualification.
- Fork fallback: Plugin Host maintainers own the explicit go/no-go decision, package namespace, publishing credentials, MIT notices, security/rebase maintenance, provenance pin, and conformance evidence.
- No agent may represent an unsubmitted/unmerged PR, unpublished fork, or local patch as satisfying this gate.

## Testing

- **Stable public contract**: schema/type/public-export tests protect the exact adapter-neutral ABI and explicit package allowlist.
- **Compatibility truth**: capability mapper and evaluator tests protect transport-specific/resource requirements, fail-closed absence, and unchanged SSE/WebSocket policy.
- **Lifecycle semantics**: the reusable contract protects atomic replacement, stale writer handling, exact removal, deterministic inspection, and registration-versus-health separation.
- **Secret boundary**: canary tests protect late provider timing, disposal, status/provenance/error redaction, and cancellation.
- **Production qualification**: package/factory integration tests are mandatory after external unblock and cannot be substituted by the fake.
- **Baseline**: design began from 122 files, 653 tests, and 438 compiled runtime exports. Implementation records intentional count changes and runs `npm test`; no low-value existing tests are scheduled for removal.

## Simplification

- One application port replaces global settings/file mutation and per-server ownership APIs.
- One existing compatibility/capability registry remains authoritative; the adapter reports facts only.
- One fake and one parameterized contract suite support all internal consumers and either production package path.
- No MCP state store, transaction engine, transport wrapper, SDK runtime, adapter-specific domain type, or upstream/fork conditional branch is introduced.
- No existing behavior or guarantee is removed.

## Risks and rollback

- **External API never lands**: portable work remains useful and truthful; production MCP stays unavailable. The maintained-fork path is an explicit operator-owned fallback, not an automatic design pivot.
- **Portable contract diverges from a later package**: one wrapper absorbs naming/shape differences only when semantics match. If semantics do not match, the package fails qualification rather than forcing application/domain leakage.
- **A capability mapper overclaims support**: exact fact tests and complete snapshot validation fail closed; rollback is to select no runtime and report all MCP facts unavailable.
- **Replacement loses the prior source**: fake/conformance failure blocks the production dependency. Production rollback is dependency removal plus unavailable capability composition; lifecycle never claims activation from partial evidence.
- **Late values escape through status/errors**: redaction canaries and provider timing/disposal contracts block acceptance. Rollback removes the concrete adapter without changing portable projections or authoritative state.
- **Tool-registration timing is wrong**: production factory-order tests block activation. No file/flag workaround is permitted as a rollback.
- **Where confidence is lowest**: the future upstream/fork factory semantics around direct-tool caches and eager behavior. That uncertainty is deliberately isolated to the blocked package story and its Pi integration tests.

## Priority and completion policy

- Portable contract, capability probe, fake, and conformance suite: **high priority / implementable now**, because they unblock internal MCP feature work without overclaiming production support.
- Production adapter/package: **critical for production and parent-epic closure / externally blocked now**.
- The feature remains `stage: implementing` until every child story, including the production adapter, is done. Implementable stories advance directly to `done` on green verification; the blocked story remains `implementing` with this evidence until the objective gate is met.

## UI alignment

No UI surface and no mockups. The bridge returns typed capability and status evidence for `epic-native-plugin-management` to present later.

## Partial implementation and verification

- Execution capability: Luna xhigh, direct sequential ownership across the dependency DAG; no nested agents, peeragent, or feature review were used per caller instruction.
- Completed child checkpoints: portable contract (`e04833e`), capability probe (`7586ecc`), fake runtime (`97974bd`), and conformance suite (`b6e5bf6`) are each at `stage: done` with their own implementation notes and commits.
- Integrated files: the adapter-neutral MCP source/status/capability schemas and port; existing capability registry/policy mapping; test-only fake; reusable conformance contract and adversarial harness tests; deliberate public export allowlist updates.
- Verification: full `npm test` passed — 127 test files, 675 tests, no type errors, no dependency-boundary violations, and compiled package allowlist import passed with 450 exports. The baseline was 122 files, 653 tests, and 438 exports.
- Production boundary: no `pi-mcp-adapter` dependency, deep import, file/settings mutation, process-global secret workaround, SDK runtime, or production adapter was added. The feature remains `stage: implementing` because the production-adapter child is still externally blocked.
- Review posture: no feature review or summary-to-review transition was performed; the parent and feature remain implementing as requested.
