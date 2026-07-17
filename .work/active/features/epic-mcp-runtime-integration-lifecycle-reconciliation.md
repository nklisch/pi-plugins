---
id: epic-mcp-runtime-integration-lifecycle-reconciliation
kind: feature
stage: review
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration
depends_on: [epic-mcp-runtime-integration-plugin-projections, epic-mcp-runtime-integration-launch-context]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Whole-Plugin MCP Lifecycle Reconciliation

## Brief

Supply the MCP activation participant consumed by native composition behind the existing complete-plugin `RuntimeProjectionPort` and `LifecycleReloadPort`. Install and enable make the exact plugin-scoped MCP source visible before tool registration; disable and uninstall remove that source without affecting another plugin or scope; update replaces the old source set with the candidate as one lifecycle-observed projection transition. Project-scoped activation remains contingent on exact Pi project trust.

Reload acceptance is never success evidence. The MCP participant inspects the selected runtime and contributes proof of the exact scope, plugin, revision, projection digest, registered source, and server inventory to the complete-plugin observation. It proves local registration rather than remote reachability, so startup uses committed local state and remains offline-safe; remote connection and tool-discovery failures appear as per-server status without disabling unrelated plugins or replacing the authoritative active revision.

Cancellation, partial adapter application, launch failure, source-removal failure, and cleanup failure preserve or restore the previous source through the completed lifecycle compensation/recovery path. Ambiguous runtime state remains explicit recovery-required evidence. This feature does not implement the complete reload/composition adapter, a second transaction coordinator, journal, state store, recovery engine, manager UI, concrete state/credential adapters, foreign ingestion, skills/hooks runtime, or MCP transport/authentication internals; `epic-native-plugin-management` composes all runtime participants and concrete host adapters.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: convergence capability; consumes the parallel plugin-projection and trusted launch-context features
- Depends on: `epic-mcp-runtime-integration-plugin-projections`, `epic-mcp-runtime-integration-launch-context`
- Design alignment: preserve the parent epic's lifecycle, exact observation, offline startup, project trust, cancellation, cleanup, and partial-failure decisions

## Boundary guardrails

- Implement only the MCP participant in the existing whole-plugin projection/reload seams; never take ownership of complete-port composition, commit lifecycle state, clear pending transitions, or run recovery independently.
- Active/inactive changes operate on a complete plugin-scoped source set, not individually selected servers or tool aliases.
- Exact observation comes from inspected runtime registration and safe status identities, not the reload return value, a generated file's existence, or network/tool-discovery success.
- Startup and reload perform no required network handshake. Local registration failure is activation failure; remote unavailability is runtime health unless the source itself cannot be registered faithfully.
- On partial replacement/removal, abort, or cleanup failure, retain enough safe evidence for lifecycle compensation/recovery and never claim the candidate or previous projection is active without exact inspection.

## Simplification opportunity

- Reuse lifecycle's projection expectations, reload observation, compensation, and startup recovery instead of introducing MCP-specific transaction or journal machinery.
- Register and remove one plugin-scoped source rather than diffing global per-server settings.
- Treat runtime status as derived observation and avoid persisting connection/tool inventory as a competing source of truth.

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle; Atomic change; Native Pi experience
- `docs/SPEC.md` — Lifecycle operations; Install transaction; Enablement; Performance and availability
- `docs/ARCHITECTURE.md` — Installation transaction; Revision retention and recovery; MCP adapter; Pi integration
- `docs/COMPATIBILITY.md` — Whole-plugin behavior; MCP identity and tool names; Update behavior

## UI alignment

No UI surface and no mockups. Typed server health, provenance, and lifecycle outcomes are consumed by the native manager in `epic-native-plugin-management`.

## Design decisions

- **Discovery posture**: Direct-read only, as required. Grounding covered project rules and conventions, all foundation/compatibility documents, the parent and native-management epics, the completed lifecycle transaction/reconciler/recovery contracts, runtime projection/reload ports, the skill/hook lifecycle participant precedent, the package-neutral MCP source port/fake/conformance suite, integrated projection and launch-context code through `a6223e1`, the adapter research/reference skill, and the newly authorized maintained-fork plan. No nested agent, peer mechanism, question, or `work-view` invocation was used.
- **Architecture**: Add one stateless, target-scoped MCP lifecycle participant over `McpRuntimePort`. Native composition supplies exact previous and desired MCP states derived from the existing transition/projection authority. The participant performs compare-and-replace/remove plus independent inspection and returns safe local evidence; it stores no authoritative state and never invokes lifecycle or recovery services.
- **Whole-plugin authority**: The existing lifecycle service, transition record, generation coordinator, `LifecycleReloadPort`, transition reconciler, and startup recovery remain the only transaction/recovery authority. MCP results map to reload accepted/failed and strict contribution evidence; they never commit state, clear pending, settle a journal row, choose candidate versus previous, or schedule a retry.
- **Port amendment before production**: Strengthen the still-package-neutral MCP contract before a fork is published. Replace optional `expectedProjectionDigest` with a required `absent | exact identity` precondition; wrap each source in a canonical registration digest; require runtime execution-lease callbacks; and make `removed`/`absent` prove no exact source-owned registration, tool/cache/process/connection, provider, or lease residue. There is no compatibility shim because no production package implements the old development contract.
- **Registration identity versus exact contents**: `McpSourceIdentity` remains ownership authority (`scope + plugin + revision + complete projection digest`). A separate canonical registration digest covers the complete secret-free `McpConfigSource` bytes. Inspection must match both identity and registration digest plus the sorted server key/component/native-key/provenance inventory. Neither display names, native server keys, aliases, connection state, nor tool count can authorize mutation.
- **Transition input**: Reconciliation receives exact `from` and `to` MCP lifecycle states. Each state is one of active `source`, active `none`, or `inactive`; active states carry the complete `ProjectionExpectation` and exact `PluginMcpProjection`. Native composition derives these states from the existing transition record and installed-revision/compatibility authority. No caller may pass a raw server map or an arbitrary identity to bypass those checks.
- **Compare-and-replace**: Before mutation the participant obtains one owner-qualified inspection, cross-checks `inspectSources` with `inspectSource`, and chooses the actual required runtime precondition. Target already exact is idempotent. Current exact `from` or verified absence may move to `to`. A third revision/source is `stale` and is never overwritten or removed. This makes install/enable absence, update old/new identity, and recovery replay explicit rather than relying on an omitted optional digest.
- **Partial adapter application**: A replace/remove return is never final evidence. The participant independently inspects afterward. An `applied` response followed by wrong digest/inventory/source state, an exception after a possible effect, duplicate owner rows, or disagreement between inspection methods returns `ambiguous`; it does not attempt an unbounded repair loop or claim cancellation. On a later compensation/recovery call, exact `from` removal is replayed even if registration appears absent so the runtime can prove orphan process/provider/lease cleanup before the prior source is restored.
- **No-MCP projections**: Active `PluginMcpProjection.kind: "none"` is a real contribution, not a missing participant. `none → none` proves owner absence; `source → none` removes and cleans the old exact source; `none → source` uses an absent precondition. Active observation records `registration.kind: "none"` and the deterministic MCP projection digest. No empty `McpConfigSource` is fabricated.
- **Observation contract**: Add a strict `McpContributionObservationSchema` beside the existing skill/hook schema. Source evidence includes exact identity, registration digest, sorted server keys and component ids; no-source evidence is explicit. `composeActivationObservation` accepts the strict MCP type rather than the generic base fallback. The participant's independent `observe` repeats local inspection and never consumes its own reconcile result as proof.
- **Registration versus health**: Source readiness requires `McpSourceStatus.state === "registered"` and exact local inventory. Per-server states (`idle`, `connecting`, `connected`, `needs-auth`, `failed`), tool counts, and safe error codes are health only and do not change the contribution digest or invalidate an otherwise exact active projection. Launch/configuration/network/tool-discovery failures therefore remain visible per server without triggering source replacement or lifecycle rollback.
- **Capability continuity**: A source state carries the exact runtime capability snapshot used to create its projection. Reconciliation/observation query current facts and require every capability previously required as `true` to remain true, including source lifecycle, selected transports/features, late values, and runtime leases. Newly available capabilities do not invalidate an existing source. Missing/malformed facts or adapter disappearance fail closed for MCP-bearing states; no-MCP states remain usable without a production runtime.
- **Project trust**: Every transition/observation carries `CurrentProjectRuntimeContext`. Project scope must match its exact project key and remain `trusted`; user scope still records current project context. Trust mismatch fails before a runtime mutation and can never be downgraded to no-MCP absence.
- **Execution leases**: Extend the source contract with a separate non-secret `McpRuntimeLeaseProvider`. The MCP runtime acquires one lease before each process/connection consumes launch values, holds it until that process/connection is closed, and releases it on normal close, failure, cancellation, replacement, and removal. This lease is independent of the short-lived plaintext launch-value lease, so secrets are disposed immediately while immutable plugin/projection artifacts remain pinned for the execution lifetime.
- **Revision-lease adaptation**: `createMcpRevisionLeaseProvider` adapts the existing `McpLaunchActiveSelectionPort`, `RevisionLeaseStore`, lifecycle clock, and source/server binding. It derives the plugin store key and projection ref from exact selected revision evidence and acquires only those existing `RetainedArtifactRef` values. It creates no lease database or process supervisor. Native management supplies the concrete lease store, session identity, clock, and active-selection implementation.
- **Process cleanup proof**: Runtime `replaceSource` may report `applied` only after old same-process executions close and release their runtime leases. `removeSource` `removed`/`absent` means exact owned source/tool/cache/process/connection/provider/runtime-lease residue is gone. Lease release or process-close failure is a source-cleanup failure; the participant returns ambiguous/recovery-required evidence. A stale exact-removal request cannot close a newer source or its leases.
- **Cancellation ownership point**: Pre-abort and abort before the first runtime mutation return `cancelled` with no effect. Once replace/remove begins, abort, timeout, thrown error, or lost response returns `ambiguous` unless exact cleanup and observation are later proven. The participant creates no timer and no detached retry. Runtime cleanup uses its own bounded cleanup signal and must still release launch/runtime leases after caller cancellation.
- **Crash and recovery replay**: Crash before mutation is an idempotent replay. Crash after atomic source publication but before observation is classified by the existing recovery service from exact participant observation: matching candidate may finalize where lifecycle rules permit; mismatch/absence compensates. Crash during a nonconforming partial effect yields no candidate proof, so recovery restores/removes through the same participant. Inactive-candidate crashes may conservatively roll back under the existing recovery contract; this feature does not change that policy.
- **Offline startup**: Native composition reconstructs active MCP projections from committed local state/cache and supplies all non-empty sources to the selected runtime factory before Pi tool registration with file discovery disabled. Registration, source validation, contribution observation, and lease-provider construction require no network, process launch, secret resolution, or remote tool discovery. Remote servers may begin in `registered`/`idle` or later fail health without blocking startup.
- **Adapter unavailable/disappears**: Portable implementation and tests proceed against the fake. With no qualifying runtime, capability reporting remains unavailable and MCP-bearing plugins cannot activate. A no-MCP active or already-inactive contribution may still prove structural absence when both transition states contain no source. If an exact source may need cleanup, runtime disappearance is not absence proof and the transition remains failed/recovery-required.
- **Concurrent plugins and native keys**: Mutation and inspection filter by exact scope/plugin owner, while server keys remain source-local component-derived hashes. Concurrent lifecycle coordination stays in the existing scope/plugin scheduler and state CAS. Same native keys across plugins/scopes cannot collide; a stale source for one owner cannot affect another owner or a newer revision.
- **Status and diagnostics**: The public status path returns only strict `McpSourceStatus` or static safe lifecycle codes/identities. Registration/source templates, options, physical roots, environment/configuration names or values, bearer/header data, lease ids/session ids, PIDs, process output, abort messages, native causes, and adapter/package names are excluded. Manager presentation remains downstream.
- **Native-management ownership**: `epic-native-plugin-management` owns reading current/pending transition authority, loading previous/candidate installed evidence, creating both plugin projections, selecting/constructing the real MCP package, passing initial sources before extension registration, implementing active-selection pinning, supplying state/secret/path/project/lease adapters, invoking Pi reload, and composing skill/hook plus MCP observations into `LifecycleReloadPort`. This feature exports the participant and narrow providers only.
- **Maintained-fork boundary**: No child story depends on fork publication. The existing `epic-mcp-runtime-integration-config-source-bridge-maintained-fork` and production-adapter stories must implement the strengthened absent/exact CAS, registration digest, execution-lease, cleanup, inspection, and initial-source semantics and pass the unchanged extended fake/conformance suite before production MCP becomes available. Unpublished bytes remain non-production and do not block portable lifecycle implementation.
- **Foundation timing**: Code-first. Current foundation documents already state the intended whole-plugin, offline, exact-observation, process-ownership, and recovery behavior. Implementation updates an assertion only if final names or package qualification semantics make it false; omission alone is not drift.
- **Advisory review**: This is cross-cutting and would normally benefit from an independent design pass, but the caller explicitly prohibited nested agents. Design-time advisory is skipped non-blockingly. Feature-level implementation review remains governed by project `review_weight: standard`.

## Architectural choice

### Option 1 — hide MCP mutations inside the concrete Pi reload adapter

Native reload could directly call package methods and return accepted. This minimizes exported types, but package coupling, stale-writer handling, cleanup, status redaction, and exact observation would be inseparable from the final Pi composition. Portable fake/conformance testing would not protect the lifecycle boundary, and reload acceptance could accidentally become proof. Rejected.

### Option 2 — persist an MCP desired-state catalog and run an independent reconciler

A new store/journal could track old/new sources and replay until convergence. It would make MCP self-contained but duplicate the lifecycle transition record, generation authority, compensation policy, and startup recovery engine. Two authorities could disagree about which revision is active. Rejected.

### Option 3 — one stateless transition participant over exact runtime CAS and inspection (chosen)

Native composition supplies `from`/`to` states backed by the existing lifecycle record. The participant validates package-neutral source registrations, performs at most one exact mutation, repeats inspection, and emits strict contribution/status evidence. Existing lifecycle code decides success, rollback, or recovery-required. A separate callback adapts existing revision leases to runtime process/connection lifetime.

**Choice**: Option 3. It gives the convergence hotspot a named, testable boundary without adding a transaction system, state store, transport wrapper, package branch, or persisted runtime catalog.

## Trickiest unit first

The hardest unit is a source replacement whose call is cancelled or throws after the adapter may have removed the previous source or published part of the candidate. The participant cannot infer “nothing happened” from an error and cannot infer “candidate active” from an applied return. It therefore records the mutation ownership point, refuses a clean-cancel result after that point, independently cross-checks both inspection APIs, and emits only exact candidate evidence or ambiguity. Lifecycle compensation then restores authoritative previous state and calls the same participant with candidate-as-`from`; that replay first cleans candidate residue (even when registration appears absent), then restores the prior source under an absent/exact precondition and observes it. Any cleanup, restore, or observation uncertainty remains pending for startup recovery.

The fallback is deliberate: one affected plugin remains `recovery-required`; unrelated plugins/scopes and offline startup continue. No generic retry daemon, runtime state file, or blind source overwrite is introduced.

## Exact contracts

### Canonical source registration, CAS, and execution leases

**Files**:
- `src/application/ports/mcp-runtime.ts`
- `src/application/mcp-source-registration.ts`
- `src/application/mcp-plugin-projection.ts`
- `src/domain/error-contract.ts`

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-portable-contracts`

```typescript
export const McpSourceRegistrationSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  source: McpConfigSourceSchemaV1,
  digest: ContentDigestSchema,
}).strict().readonly();
export type McpSourceRegistration = z.infer<
  typeof McpSourceRegistrationSchemaV1
>;

export function createMcpSourceRegistration(input: Readonly<{
  source: McpConfigSource;
  sha256: Sha256;
  digest?: ContentDigest;
}>): McpSourceRegistration;

export function verifyMcpSourceRegistration(
  input: unknown,
  sha256: Sha256,
): McpSourceRegistration;

export const McpSourcePreconditionSchemaV1 = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("absent") }).strict().readonly(),
  z.object({
    kind: z.literal("exact"),
    identity: McpSourceIdentitySchemaV1,
  }).strict().readonly(),
]);
export type McpSourcePrecondition = z.infer<
  typeof McpSourcePreconditionSchemaV1
>;

export const McpRuntimeServerBindingSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  source: McpSourceIdentitySchemaV1,
  serverKey: McpRuntimeServerKeySchemaV1,
  componentId: ComponentIdSchema,
  transport: McpBridgeTransportSchema,
}).strict().readonly();
export type McpRuntimeServerBinding = z.infer<
  typeof McpRuntimeServerBindingSchemaV1
>;

// Opaque and intentionally non-serializable.
declare const mcpRuntimeLeaseBrand: unique symbol;
export type McpRuntimeLease = Readonly<{
  readonly [mcpRuntimeLeaseBrand]: true;
}>;

export interface McpRuntimeLeaseProvider {
  acquire(
    binding: McpRuntimeServerBinding,
    signal: AbortSignal,
  ): Promise<McpRuntimeLease>;
  release(lease: McpRuntimeLease, signal: AbortSignal): Promise<void>;
}

export type McpSourceReplaceRequest = Readonly<{
  registration: McpSourceRegistration;
  expected: McpSourcePrecondition;
  launchValues: McpLaunchValueProvider;
  runtimeLeases: McpRuntimeLeaseProvider;
}>;
```

`McpLaunchValueRequestSchema` and `McpLaunchBindingSchemaV1` reuse `McpRuntimeServerBindingSchemaV1`; there is one source/server/component/transport binding vocabulary. `McpSourceStatusSchema` gains required `registrationDigest`. `McpRuntimeCapabilitiesSchemaV1.sourceLifecycle` gains `runtimeLeases`; aggregate MCP runtime availability requires it. `PluginMcpProjection.kind: "source"` carries `registration` instead of a bare source, while its existing projection digest remains the complete MCP contribution digest.

Port semantics are explicit:

```typescript
export interface McpRuntimePort {
  capabilities(signal: AbortSignal): Promise<McpRuntimeCapabilities>;
  validateSource(
    registration: McpSourceRegistration,
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

- `expected: absent` is a real atomic precondition, not omitted/unconditional replacement.
- `expected: exact` compares the full current identity, not a display name or only one digest.
- `applied` means the exact registration is current and replaced same-owner process/provider/lease state has been cleaned.
- `removed` and `absent` both prove no residue for the requested exact identity; `absent` performs/validates an idempotent cleanup sweep.
- `ownership-mismatch` preserves the current exact identity and performs no cleanup against it.
- Every runtime process/connection acquires `runtimeLeases` before launch values, disposes launch values after immediate consumption, and retains only the runtime lease until close.

**Acceptance criteria**:
- [ ] Canonical registration digest changes for identity, server key, component/native key, transport, options, projection binding, launch template, alias, or provenance changes and rejects a caller-supplied mismatch.
- [ ] Required absent/exact CAS catches a concurrent first install and a stale old-revision update without an unconditional replace path.
- [ ] One runtime binding schema drives launch and runtime-lease requests; mismatched component or transport fails before callbacks.
- [ ] Capability/source/status/result schemas remain strict and redacted; no runtime lease can serialize an id, process, path, or secret.
- [ ] The fake and reusable conformance contract define `removed`/`absent` as complete exact-source cleanup and reject an adapter that unregisters before validation, leaks old process leases, or authorizes removal by a global name.

### MCP lifecycle states, participant, and strict contribution evidence

**Files**:
- `src/runtime/mcp/lifecycle-participant.ts`
- `src/application/ports/lifecycle-reload.ts`

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-reconciliation-participant`

```typescript
export type McpLifecycleState =
  | Readonly<{
      kind: "source";
      expectation: Extract<ProjectionExpectation, { kind: "active" }>;
      projection: Extract<PluginMcpProjection, { kind: "source" }>;
      capabilities: McpRuntimeCapabilities;
    }>
  | Readonly<{
      kind: "none";
      expectation: Extract<ProjectionExpectation, { kind: "active" }>;
      projection: Extract<PluginMcpProjection, { kind: "none" }>;
    }>
  | Readonly<{
      kind: "inactive";
      expectation: Extract<ProjectionExpectation, { kind: "inactive" }>;
    }>;

export type McpLifecycleTransitionRequest = Readonly<{
  from: McpLifecycleState;
  to: McpLifecycleState;
  currentProject: CurrentProjectRuntimeContext;
}>;

export const McpLifecycleFailureCodeSchema = z.enum([
  "RUNTIME_UNAVAILABLE",
  "CAPABILITY_MISMATCH",
  "INVALID_TRANSITION",
  "PROJECT_UNTRUSTED",
  "SOURCE_REJECTED",
  "ADAPTER_FAILED",
]);

export const McpLifecycleAmbiguityCodeSchema = z.enum([
  "INSPECTION_AMBIGUOUS",
  "MUTATION_OUTCOME_UNKNOWN",
  "SOURCE_CLEANUP_UNKNOWN",
]);

export const McpLifecycleReconcileResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("applied") }).strict().readonly(),
  z.object({ kind: z.literal("unchanged") }).strict().readonly(),
  z.object({
    kind: z.literal("stale"),
    current: McpSourceIdentitySchemaV1,
  }).strict().readonly(),
  z.object({
    kind: z.literal("failed"),
    code: McpLifecycleFailureCodeSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("ambiguous"),
    code: McpLifecycleAmbiguityCodeSchema,
  }).strict().readonly(),
  z.object({ kind: z.literal("cancelled") }).strict().readonly(),
]);
export type McpLifecycleReconcileResult = z.infer<
  typeof McpLifecycleReconcileResultSchema
>;

export const McpLifecycleObservationResultSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("ready"),
      observation: McpContributionObservationSchema,
    }).strict().readonly(),
    z.object({
      kind: z.literal("failed"),
      code: McpLifecycleFailureCodeSchema,
    }).strict().readonly(),
    z.object({
      kind: z.literal("ambiguous"),
      code: McpLifecycleAmbiguityCodeSchema,
    }).strict().readonly(),
    z.object({ kind: z.literal("cancelled") }).strict().readonly(),
  ],
);
export type McpLifecycleObservationResult = z.infer<
  typeof McpLifecycleObservationResultSchema
>;

export const McpLifecycleStatusResultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ready"),
    owner: z.object({
      scope: ScopeReferenceSchema,
      plugin: PluginKeySchema,
    }).strict().readonly(),
    status: McpSourceStatusSchema.nullable(),
  }).strict().readonly(),
  z.object({ kind: z.literal("unavailable") }).strict().readonly(),
  z.object({
    kind: z.literal("failed"),
    code: McpLifecycleFailureCodeSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("ambiguous"),
    code: McpLifecycleAmbiguityCodeSchema,
  }).strict().readonly(),
  z.object({ kind: z.literal("cancelled") }).strict().readonly(),
]);
export type McpLifecycleStatusResult = z.infer<
  typeof McpLifecycleStatusResultSchema
>;

export interface McpLifecycleParticipant {
  reconcile(
    request: McpLifecycleTransitionRequest,
    signal: AbortSignal,
  ): Promise<McpLifecycleReconcileResult>;
  observe(
    request: McpLifecycleTransitionRequest,
    signal: AbortSignal,
  ): Promise<McpLifecycleObservationResult>;
  status(
    owner: Readonly<{ scope: ScopeReference; plugin: PluginKey }>,
    signal: AbortSignal,
  ): Promise<McpLifecycleStatusResult>;
}

export function createMcpLifecycleParticipant(input: Readonly<{
  runtime?: McpRuntimePort;
  launchValues(
    registration: McpSourceRegistration,
  ): McpLaunchValueProvider;
  runtimeLeases(
    registration: McpSourceRegistration,
  ): McpRuntimeLeaseProvider;
  sha256: Sha256;
}>): McpLifecycleParticipant;
```

The serializable observation is strict:

```typescript
export const McpRegistrationObservationSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("none") }).strict().readonly(),
    z.object({
      kind: z.literal("source"),
      identity: McpSourceIdentitySchemaV1,
      registrationDigest: ContentDigestSchema,
      serverKeys: z.array(McpRuntimeServerKeySchemaV1).readonly(),
      componentIds: z.array(ComponentIdSchema).readonly(),
    }).strict().readonly(),
  ],
);

export const McpContributionObservationSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("active"),
      participant: z.literal("mcp"),
      scope: ScopeReferenceSchema,
      plugin: PluginKeySchema,
      revision: ContentDigestSchema,
      projectionDigest: ContentDigestSchema,
      currentProject: CurrentProjectRuntimeContextSchema,
      contributionDigest: ContentDigestSchema,
      registration: McpRegistrationObservationSchema,
    }).strict().readonly(),
    z.object({
      kind: z.literal("inactive"),
      participant: z.literal("mcp"),
      scope: ScopeReferenceSchema,
      plugin: PluginKeySchema,
      projectionDigest: ContentDigestSchema,
      currentProject: CurrentProjectRuntimeContextSchema,
      contributionDigest: ContentDigestSchema,
      registration: z.object({ kind: z.literal("none") }).strict().readonly(),
    }).strict().readonly(),
  ],
);
```

`composeActivationObservation` changes its MCP argument from generic `RuntimeContributionObservation` to `McpContributionObservation`. The generic base remains useful internally but is no longer sufficient to satisfy the MCP participant. Active source contribution uses the verified `PluginMcpProjection.digest`; active no-MCP uses its `none` projection digest; inactive contribution hashes the exact tombstone binding. Server health fields are deliberately absent from contribution identity.

**Implementation notes**:
- Verify `from`/`to` have the same scope/plugin owner and that every active MCP identity exactly matches its complete expectation before touching the runtime.
- For project scope, compare the current project key and trust before provider construction or inspection-driven mutation.
- Owner inspection parses and sorts `inspectSources`, permits at most one row for the owner, and cross-checks it byte-for-byte with `inspectSource(identity)`. Disagreement is ambiguous.
- A source is observation-ready only when identity, registration digest, exact server keys/component ids/native keys/provenance, and source state match. Server connection health is not part of readiness.
- Perform at most one replace/remove call per reconciliation. If post-effect inspection is not exact, return ambiguity and let lifecycle compensation/recovery own the next transition.
- `status` returns the same redacted source status or static unavailable/ambiguous/failure code for manager composition; it never returns provider or native error objects.

**Acceptance criteria**:
- [ ] `source ↔ source`, `source ↔ none`, `none ↔ none`, `inactive ↔ source`, and `inactive ↔ none` transitions use complete source semantics and exact owner isolation.
- [ ] Active source observation proves registration digest and exact sorted inventory; active no-MCP and inactive observations prove exact absence without fabricating an empty source.
- [ ] Reconcile success is never accepted as observation; stale/partial/ambiguous inspection cannot produce `McpContributionObservation`.
- [ ] Launch/tool/network/auth failures alter only safe per-server health and do not alter exact contribution evidence or cause a source mutation.
- [ ] Project mismatch/untrusted, malformed capability/status, missing runtime for a source, or adapter disappearance fails before a false active/inactive claim.

### Runtime execution lease adaptation

**File**: `src/runtime/mcp/revision-lease-provider.ts`
**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-runtime-lease-cleanup`

```typescript
export function createMcpRevisionLeaseProvider(input: Readonly<{
  source: McpSourceRegistration;
  active: McpLaunchActiveSelectionPort;
  leases: RevisionLeaseStore;
  clock: LifecycleClock;
  sessionId: string;
  sha256: Sha256;
}>): McpRuntimeLeaseProvider;
```

On `acquire`, the provider:

1. validates the exact runtime server binding against the immutable registration;
2. enters `McpLaunchActiveSelectionPort.withSelection`, which pins or aborts exact authority;
3. verifies expectation/revision/plugin/component/source binding without resolving plaintext;
4. derives the existing plugin store key from revision source evidence and the existing projection ref from the active expectation;
5. calls `RevisionLeaseStore.acquire` for exactly those two retained artifacts;
6. returns a fresh opaque token backed by a private `WeakMap`.

On `release`, it validates provider ownership, calls `RevisionLeaseStore.release`, and marks the token released only after success. Repeated successful release is idempotent; failed release remains retryable and is never converted to success. Token string/JSON/inspection is `[REDACTED]`.

**Acceptance criteria**:
- [ ] Wrong source/server/component/transport/revision/project/trust evidence fails before lease acquisition.
- [ ] Every opened standard-I/O process or remote connection holds plugin and projection artifacts until close; no secret/configuration/data-root value enters the lease.
- [ ] Replacement/removal closes old executions and releases all leases before `applied`/`removed`/`absent`; cleanup failure remains explicit ambiguity.
- [ ] Cancellation during launch or source removal still disposes plaintext values and releases runtime leases exactly once using runtime-owned cleanup control.
- [ ] Process death leaves the existing process-identity lease adapter to classify the owner; this feature adds no heartbeat, lease expiry, takeover, or lease store.

### Lifecycle compensation, recovery, and crash conformance

**Files**:
- `test/runtime/mcp/lifecycle-participant.test.ts`
- `test/runtime/mcp/revision-lease-provider.test.ts`
- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/application/lifecycle-transition-reconciler.test.ts`
- `test/application/recovery-service.test.ts`
- `test/integration/mcp-lifecycle-recovery.test.ts`

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-recovery-conformance`

Extend `FakeMcpRuntime` and the reusable contract harness with deterministic test-only controls for:

- atomic and intentionally partial replacement;
- removal failure before effect and after unregister-before-cleanup;
- duplicate/disagreeing/malformed inspection;
- runtime disappearance/capability downgrade;
- opened execution handles with runtime-lease acquire/release counters;
- launch health failure without source failure;
- lost response/cancellation after the mutation ownership point.

The integration adapter used by tests maps participant results into the existing `LifecycleReloadPort`: only `applied | unchanged` may return `accepted`; every other result returns one static failed code. `observe` obtains strict skill/hook and MCP evidence independently and calls `composeActivationObservation`. The real lifecycle service/reconciler/recovery service then decide finalize, verified rollback, or recovery-required.

**Acceptance criteria**:
- [ ] Install/enable/update/disable/uninstall over a complete skill/hook/MCP fixture use the existing pending transition, state CAS, reload, observation, finalization, compensation, and journal; no MCP transaction record exists.
- [ ] Candidate replace rejection preserves and observes the old source; partial/lost-response change cannot finalize and compensation restores the old exact source before `rolled-back`.
- [ ] Restore replacement failure, restore observation mismatch, removal cleanup failure, or stale third source leaves the transition `recovery-required` and preserves safe pending evidence.
- [ ] Crash points before replace, after replace before observation, during partial removal, after removal before finalization, during compensation, and after restore before settlement replay idempotently through existing recovery classification.
- [ ] Cancellation before effect is clean; cancellation after possible effect is ambiguous and resolves only through exact observation/compensation/recovery.
- [ ] Concurrent unrelated plugin mutations continue to use lifecycle's target-preserving generation rebase, while same-owner stale source identity is never overwritten.
- [ ] Runtime execution leases pin old artifacts across open executions and release before exact cleanup success; another plugin/scope with the same native key remains untouched.

## Failure matrix

| Situation | Participant evidence | Lifecycle consequence |
|---|---|---|
| Active source already exact | `unchanged`; independent exact source observation | Existing lifecycle may finalize after composed observation |
| Active no-MCP projection, owner absent | `unchanged`; active `registration:none` | Whole plugin remains observable without MCP package/network |
| Update old source → new source | Replace with `expected: exact(old)`; inspect new identity/digest/inventory | Finalize only after composed exact observation |
| Update old source → no MCP | Exact old removal and cleanup; inspect owner absence | Active `none` contribution; old processes/leases gone |
| Update no MCP → source | Replace with `expected: absent` | Concurrent first writer yields typed stale, never overwrite |
| Same native key in another plugin/scope | Different owner and source-local server identity | No mutation/inspection collision |
| Adapter rejects validation/replace before effect | Safe failed result; old source exact | Lifecycle compensates/no-ops and preserves old revision |
| Adapter reports applied but inventory/digest is partial | `ambiguous`, never observation-ready | Restore previous through lifecycle; unresolved restore → recovery-required |
| Compare-and-replace sees third/newer identity | `stale` with safe current identity | Never overwrite; lifecycle cannot claim rollback, remains recoverable |
| `inspectSources` duplicates owner or disagrees with `inspectSource` | `INSPECTION_AMBIGUOUS` | No mutation/success claim; isolate plugin |
| Remote connection/tool discovery/launch fails | Exact source remains ready; server status `failed` with code | Runtime health only; no active-revision/state change |
| Runtime lease acquisition fails before launch | Per-server failed health; no process starts | Active source remains registered; status is redacted |
| Remove fails before effect | Failed/ambiguous; source still inspectable | Existing compensation/recovery determines next action |
| Remove unregisters then process/lease cleanup fails | `SOURCE_CLEANUP_UNKNOWN`; absent is not accepted yet | Recovery replays exact removal cleanup; no false inactive evidence |
| Rollback restore fails/rejects | No previous source observation | Existing transition stays `recovery-required` |
| Rollback remove of failed install fails | No exact inactive observation | Existing transition stays `recovery-required` |
| Cancellation before runtime mutation | `cancelled`, no effect | Lifecycle reports failed/aborted without false mutation evidence |
| Cancellation/lost response after mutation starts | `MUTATION_OUTCOME_UNKNOWN` | Independent observation or compensation; otherwise recovery-required |
| Crash after candidate publish, before observation | Startup exact inspect of candidate | Existing recovery finalizes only where its classifier permits; otherwise compensates |
| Crash during partial change | Candidate observation mismatch/absence | Existing recovery compensates; no candidate retry engine here |
| Repeated disable/uninstall cleanup | Exact remove returns `absent`, owner inspection empty | Idempotent inactive contribution; unrelated sources untouched |
| Capability required by projection disappears | `CAPABILITY_MISMATCH` | MCP-bearing activation fails closed; prior state is not silently rewritten |
| Adapter package unavailable | Source target: `RUNTIME_UNAVAILABLE`; no-source target may prove absence | Portable work remains valid; production MCP stays unavailable |
| Project trust/key changes | `PROJECT_UNTRUSTED`/invalid transition before effect | No executable project source is activated or observed |
| Offline startup with local source | Registered inventory observed without launch/provider resolution | Startup succeeds locally; later health is per server |
| Status serialization | Strict source/server ids, provenance, health code/count only | Native manager can render safely; no plaintext/native cause |

## Native composition interaction

This feature deliberately stops before a complete `LifecycleReloadPort` implementation. The later native-management composition performs this sequence:

1. Read the referenced existing `LifecycleTransitionRecord` and current authoritative target using existing stores; do not invent MCP state.
2. Resolve previous/candidate complete `ProjectionExpectation` values and installed revision/compatibility evidence through existing loaders.
3. Create/verify each `PluginMcpProjection` using current package-neutral capability facts.
4. For process startup/reload construction, pass every active non-empty registration plus source-bound launch/runtime-lease providers to the selected MCP factory before invoking its Pi extension; disable file/import discovery.
5. For an in-process transition, call `McpLifecycleParticipant.reconcile({from,to,currentProject})` while the active-selection authority prevents stale launch callbacks.
6. Invoke Pi reload orchestration and return only accepted/failed; do not expose participant internals as lifecycle success.
7. On `observe`, ask the skill/hook and MCP participants independently, then call strict `composeActivationObservation`.
8. Let the existing lifecycle reconciler finalize or restore state. On startup, let the existing recovery service classify and call the same native reload/participant path.
9. Present participant `status` through `/plugin` without giving UI code mutation, state, package, process, or secret access.

Concrete state, transition, credential, configuration-path/write-id, project-root, process-revision-lease, package wrapper, Pi API, current-project, and runtime factory adapters remain native-management responsibilities.

## Implementation units

### Unit 1: Strengthen the portable source lifecycle contract

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-portable-contracts`

**Files**:
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

Implement canonical registration digest, required absent/exact preconditions, shared source/server binding, execution-lease callbacks, strict cleanup semantics, capability fact, and schema/public-boundary changes. Update the existing fake/conformance source signatures in one pre-release contract break; do not retain the optional digest path.

### Unit 2: Implement exact target-scoped reconciliation and observation

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-reconciliation-participant`
**Depends on**: portable contracts

**Files**:
- `src/runtime/mcp/lifecycle-participant.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/index.ts`
- `test/runtime/mcp/lifecycle-participant.test.ts`
- `test/application/runtime-contribution-observation.test.ts`

Implement state verification, current-project checks, capability continuity, owner inspection cross-checking, at-most-one exact mutation, no-MCP/inactive behavior, safe status, strict MCP contribution schema, and composer narrowing. Do not import state, transition, recovery, Pi, filesystem, or package modules.

### Unit 3: Bind runtime process lifetime to existing revision leases

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-runtime-lease-cleanup`
**Depends on**: portable contracts

**Files**:
- `src/runtime/mcp/revision-lease-provider.ts`
- `src/index.ts`
- `test/runtime/mcp/revision-lease-provider.test.ts`
- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-runtime-port.test.ts`

Adapt exact active-selection evidence to `RevisionLeaseStore`, then extend fake/conformance launch/open/close/replacement/removal cases so old artifact leases cannot outlive a successful cleanup result. Keep all transport/process behavior in the runtime fake/package harness; the provider only pins artifacts.

### Unit 4: Prove lifecycle compensation and startup recovery reuse

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-recovery-conformance`
**Depends on**: participant, runtime lease cleanup

**Files**:
- `test/application/lifecycle-transition-reconciler.test.ts`
- `test/application/recovery-service.test.ts`
- `test/integration/mcp-lifecycle-recovery.test.ts`
- `test/integration/plugin-lifecycle.test.ts`

Compose a test-only `LifecycleReloadPort` around real lifecycle/recovery services, skill/hook evidence, the MCP participant, fake runtime, and fake revision leases. Exercise whole-plugin success, rollback, ambiguous cleanup, cancellation, stale identities, crash boundaries, no-MCP transitions, scope isolation, and remote-health separation. Production lifecycle/recovery source should require no new mutation path; a source change there is justified only to consume the stricter observation type without changing authority.

### Unit 5: Public/native handoff and package-neutral integration hardening

**Story**: `epic-mcp-runtime-integration-lifecycle-reconciliation-integration-hardening`
**Depends on**: recovery conformance

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/mcp-lifecycle-participant.test.ts`
- `test/integration/skill-hook-runtime-projection.test.ts`
- `test/tooling/boundaries.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed assertions become stale

Prove local startup registration/observation, exact two-participant composition, runtime-unavailable/no-MCP degradation, project trust, concurrent plugins, update identity, status redaction, and public/dependency boundaries. Record the native-management handoff and ensure the maintained-fork/production package must pass the extended unchanged contract, but add no package dependency, Pi reload implementation, or production capability claim.

## Implementation order and child-story DAG

1. `epic-mcp-runtime-integration-lifecycle-reconciliation-portable-contracts` — no sibling dependencies.
2. In parallel after contracts:
   - `epic-mcp-runtime-integration-lifecycle-reconciliation-reconciliation-participant`
   - `epic-mcp-runtime-integration-lifecycle-reconciliation-runtime-lease-cleanup`
3. `epic-mcp-runtime-integration-lifecycle-reconciliation-recovery-conformance` — depends on both participant and lease cleanup.
4. `epic-mcp-runtime-integration-lifecycle-reconciliation-integration-hardening` — depends on recovery conformance.

Manual cycle check: every child edge points from a later checkpoint to an earlier sibling; no child depends on the parent, itself, or a descendant. The caller prohibited `.work/bin/work-view`, so no work-view command was run.

The stories are durable correctness checkpoints for one cohesive feature owner. They do not imply one implementation agent per story. No child depends on the maintained-fork or production-adapter stories, so portable implementation can finish while production availability remains honestly blocked.

## Testing

- **Portable contract**: registration digest vectors, absent/exact CAS, strict binding, capability continuity, cleanup result semantics, and schema/public export tests. Protects the external adapter ABI that the fork must satisfy.
- **Participant transition table**: all nine `source | none | inactive` from/to combinations, target idempotency, old/new revision, unexpected third identity, project trust, capability downgrade, no runtime, and source/inventory mismatch. Protects complete-source behavior without per-server selection.
- **Inspection ambiguity**: duplicate owner rows, `inspectSource`/`inspectSources` disagreement, malformed/unsorted status, wrong registration digest, missing/extra server rows, replacing/removing/failed source state. Protects exact observation.
- **Health separation**: registered source crossed with every server health state, tool count, and safe launch error. Protects offline startup and prevents network health from becoming activation authority.
- **Mutation/cancellation matrix**: rejection before effect, atomic success, lost response, partial replace, partial remove, pre-abort, abort before mutation, abort after ownership point, and post-effect inspection cancellation. Protects honest ambiguity.
- **Process/runtime leases**: acquire before values, immediate value disposal, hold until execution close, close on replace/remove, stale remove isolation, cleanup failure, process death classification, and no lease serialization. Protects old-revision retention without transport ownership.
- **Lifecycle/recovery integration**: complete-bundle install/enable/update/disable/uninstall, candidate rollback, failed restore/remove, crash at each runtime boundary, candidate observation/finalization, conservative inactive rollback, pending replay, and unrelated generation rebase. Protects reuse of existing authority.
- **Scope/concurrency**: user/project same plugin, different plugins with same native key, concurrent absent precondition, stale same-owner update, and unrelated plugin state mutation. Protects isolation.
- **Redaction canaries**: source template/options, command/args/cwd, URL/header/bearer, environment/configuration, roots, lease/session/process identity, native cause/message, and package identity are absent from status, results, observations, diagnostics, logs, and serialized errors.
- **Production qualification**: the existing maintained-fork/production story runs the extended reusable runtime contract plus package-specific initial-source-before-tools, file-isolation, process/cache/tool cleanup, Pi/Node, and published-byte provenance tests. Fake success cannot satisfy it.
- **Test economy**: extend the existing parameterized fake/conformance harness and lifecycle/recovery fixtures. Do not duplicate format-reader, compatibility-policy, state-CAS, journal durability, transport, OAuth, secret-store, or filesystem atomicity matrices.

## Simplification

- Replace the optional stale-digest input with one required absent/exact precondition; remove the unconditional source replacement path rather than supporting both.
- Reuse one source/server binding for launch values, active selection, and runtime leases.
- Reuse `PluginMcpProjection`, `ProjectionExpectation`, `CurrentProjectRuntimeContext`, `RevisionLeaseStore`, `LifecycleReloadPort`, transition records, and the shared reconciler/recovery service.
- Narrow the generic MCP contribution fallback to one strict schema instead of creating another reload protocol.
- Keep one source per scope/plugin and one exact source mutation per reconcile; do not diff individual servers, tools, aliases, or health rows.
- Add no MCP state store, journal, retry worker, lock, settings/config file, process runner, HTTP client, transport/auth implementation, package conditional, or production wrapper.
- No existing guarantee is removed. The source contract changes are pre-production hardening required to make lifecycle guarantees expressible.

## Risks and rollback

- **Riskiest assumption — the future package can make process/provider/lease cleanup part of atomic source semantics**: a type-compatible fork could still unregister first and leak old executions. Mitigation: runtime lease callbacks, exact absent cleanup semantics, negative fake/conformance harnesses, and real package process/cache/tool tests. Rollback is no production runtime selection; MCP capabilities become unavailable while portable code remains.
- **Registration digest can be echoed without truthful registration**: any adapter can lie at a port. Mitigation: independent source/server inventory inspection and qualification against intentionally broken implementations. The project risk model trusts a conforming selected adapter, not a malicious one.
- **Native composition does not yet expose exact transition/revision pairs**: the participant cannot invent them. Mitigation: keep input explicit and assign selection/state/transition loading to native management. Until composed, tests supply verified lifecycle records; no production claim is made.
- **Source disappears between inspect and mutation**: required runtime CAS returns stale/rejected and the participant never retries against a new identity. Lifecycle compensates or retains pending evidence.
- **Runtime disappears after removing a source but before observation**: if `from` contained a source, package absence is not cleanup proof. The operation remains recovery-required until exact cleanup can be observed or process death/release evidence resolves it.
- **Capability facts change during reload**: projection and participant checks may see different snapshots. The participant requires the current runtime to satisfy every capability used by the projection; mismatch fails safely and the lifecycle preserves/restores the previous revision.
- **Process lease release fails after process close**: removal cannot claim success. The existing dead-owner classification eventually prevents unsafe deletion without requiring this participant to mutate the lease database.
- **No-MCP plugins are accidentally blocked by package publication**: explicit `none` states and runtime-optional absence observation prevent that. A prior exact source still requires cleanup and cannot be waved away as none.
- **Recovery could accidentally retry candidate activation**: this feature never selects candidate versus previous. The existing recovery classifier observes candidate and otherwise chooses compensation; the participant only executes the state transition it is given.
- **Status grows into a secret-bearing diagnostic**: strict schemas, code-only errors, and canary serialization tests prohibit definitions, plaintext, messages, causes, roots, and process evidence. Manager needs use the allowlisted status only.
- **Where confidence is lowest**: actual Pi reload construction order and the maintained fork's process/cache/tool ownership. Those are intentionally left to native composition and published-package qualification rather than simulated as complete by the portable participant.

## Pre-mortem

The design fails if an omitted CAS precondition overwrites a concurrent source, an adapter's return is accepted without inspection, a failed update destroys the prior process set, inactive observation ignores leaked source/process leases, remote health becomes activation authority, no-MCP plugins require a package they do not use, project trust drifts, or recovery creates an MCP-specific replay engine. Required absent/exact CAS, canonical registration evidence, independent local inspection, runtime revision leases, strict absence cleanup, health separation, explicit none states, current-project checks, and reuse of the existing lifecycle/recovery authority address each failure.

When evidence is uncertain, the rule is simple: do not emit exact MCP contribution evidence. Let the existing lifecycle restore what it can; otherwise retain the pending transition for recovery. Availability for one plugin never outranks proof of the active whole-plugin projection.

## Implementation summary

All five child checkpoints are implemented and verified in the designed DAG order by one cohesive xhigh feature owner:

1. Portable contracts now use canonical complete-source registrations, required absent/exact CAS, one launch/lease binding, strict registration status, and execution-lease capability/cleanup semantics.
2. The stateless MCP participant plugs into the existing whole-plugin transition/reload/observation seams. It owns no state, transaction, journal, commit, settlement, retry, or recovery policy.
3. Runtime execution lifetime adapts exact active-selection evidence to the existing `RevisionLeaseStore`; opaque tokens pin only plugin/projection artifacts and remain retryable on cleanup failure.
4. The fake and reusable conformance contract cover partial/lost effects, cancellation ownership, stale writers, strict cleanup, and runtime leases. Real transition-reconciler integration proves exact finalization, compensation, recovery-required retention, and crash replay without an MCP recovery engine.
5. Public/package/boundary integration proves offline local registration and observation, explicit no-MCP behavior, remote-health separation, project and owner isolation, redaction, and the absence of production package claims.

The implementation consumes the exact complete plugin projection and the existing `McpRuntimePort`. There is no `pi-mcp-adapter` dependency, production wrapper, Pi reload implementation, settings/config writer, concrete credential/root/state adapter, or native composition branch.

## Native-management handoff

`epic-native-plugin-management` remains responsible for loading the authoritative current/pending transition and installed revision pair; constructing previous/candidate complete projections; supplying current-project trust and active-selection authority; composing concrete state, credential, configuration, root, lease, and Pi adapters; selecting a qualified runtime package; passing all initial sources before tool registration with file discovery isolated; invoking Pi reload; and composing strict skill/hook plus MCP evidence into `LifecycleReloadPort`.

The maintained-fork and production-adapter items remain the production blocker. They must implement the unchanged exact registration/CAS/runtime-lease/cleanup/inspection/initial-source contract and pass both the reusable conformance suite and package-specific published-byte, Node/Pi, source-isolation, source-before-tools, process/cache/tool cleanup, and provenance qualification. Portable fake success does not make MCP production-available.

## Implementation verification

- Child stories: **5 done**, none entered review.
- Full `npm test` pipeline: passed.
  - Typecheck: **0 errors**.
  - Dependency boundaries: **237 modules, 1,444 dependencies**, no violations.
  - Vitest: **177 files, 967 tests passed, 0 failed; 0 type errors**.
  - Build and compiled package import: passed, **522 exports**.
- Review boundary: advanced from `implementing` to `review` as requested. Independent review was not run because the caller prohibited nested agents.
