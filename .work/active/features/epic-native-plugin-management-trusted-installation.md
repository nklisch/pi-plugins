---
id: epic-native-plugin-management-trusted-installation
kind: feature
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-inspection-diagnostics]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Trusted Configuration and Installation

## Brief

Deliver one transactional installation capability from an inspected marketplace candidate through configuration and trust to an exact activation result. The application flow exposes the signed-off three steps—choose and inspect, configure and trust, activation result—without embedding terminal widgets in application code.

Collect and validate plugin `userConfig`, route sensitive values through secret custody, resolve project trust where required, disclose the exact executable surface, acquire the selected immutable revision, and invoke the completed whole-plugin install transaction. Interactive callers may supply decisions through explicit callbacks; deterministic callers must provide all required decisions and values up front or receive a complete missing-input result without partial mutation.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Consumes the inspection/eligibility contract and packaged lifecycle/configuration/trust adapters.
- Owns installation preflight, configuration/trust request and response contracts, progress milestones, cancellation semantics, and the final operation result.
- Reuses `ConfigurationService`, `TrustService`, candidate preparation, source acquisition, `PluginLifecycleService.install`, recovery, and runtime observation. It does not add an install transaction or weaken compatibility.

## Capability boundaries

- Trust is keyed to the exact revision and executable surface. Changed skills, hook commands, MCP processes/endpoints, or subagent requirements invalidate stale approval and are shown before commitment.
- Configuration validation reports all actionable field errors deterministically. Sensitive values never appear in progress, results, diagnostics, command history, state, or generated runtime projections.
- Cancellation before commit leaves no authoritative install; cancellation or failure after an ambiguous boundary uses existing compensation/recovery evidence and never reports success by callback acceptance.
- Installation success requires exact independent runtime observation for the complete plugin. Unsupported production participants remain an unavailable capability, not a locally faked success.
- Repeated invocation is idempotent or returns a precise conflict/current-state result; no foreign registration or plugin file is mutated.
- Exact progress phases and result vocabulary are shared by the later deterministic facade and TUI.

## Mockup inheritance

The application flow must preserve the state transitions signed off in `.mockups/flows/plugin-install/`: `01-choose-inspect` → `02-configure-trust` → `03-activation-result`. Rendering, focus, and Pi theme use belong to `epic-native-plugin-management-pi-extension-manager`.

## Mockups

- Flow: `.mockups/flows/plugin-install/index.html`
- Steps: `.mockups/flows/plugin-install/01-choose-inspect.html` → `.mockups/flows/plugin-install/02-configure-trust.html` → `.mockups/flows/plugin-install/03-activation-result.html`
- Signed off: 2026-07-11.
- This feature supplies schema-valid application data for all three steps. It adds no HTML, command grammar, terminal component, focus handling, keybinding, or renderer.

## Grounding and design decisions

- **Discovery posture**: Direct-read only, as explicitly required. Grounding covered the parent epic; project/global rules and conventions; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; all signed install-flow mocks; native candidate/installed inspection, safe disclosure, diagnostics, snapshot evidence, and marketplace resolution; configuration descriptors, validation, custody, resolution, and stores; executable-surface/trust policy and project trust/root authority; candidate materialization/preparation; lifecycle install/enable, mutation coordination, transition/recovery, and activation observation; packaged composition, capability capture, operation admission, and disposal. No question, nested agent, peer mechanism, source edit, or UI implementation was used.
- **Manual DAG check**: `.work/bin/work-view --blocking <story-id>` was run for all eight proposed child IDs before dependencies were written. The graph is acyclic by construction: contracts are the root; candidate leasing follows contracts; configuration, trust, and lifecycle bridging are sibling consumers; session orchestration joins those three; packaged composition follows orchestration; integrated acceptance is the only leaf.
- **One application workflow**: `TrustedInstallationService` owns `open`, `activate`, `run`, `status`, and `cancel`. Staged TUI callers use `open` then `activate`; deterministic callers use `run` with an explicit submission; interactive automation may provide one explicit decision callback. All paths execute the same state machine and result mapping.
- **No hidden interaction**: An absent or incomplete deterministic submission returns the complete sorted `needs-input` result before configuration, trust, lifecycle, or state mutation. The application service never prompts. A decision provider is an explicit callback supplied by a later presentation adapter and receives only the schema-safe disclosure.
- **Transient session, durable authorities**: Workflow sessions are bounded in-memory leases owned by the started packaged host. They are resumable only while that host epoch lives; restart/reload/disposal invalidates them. Authoritative configuration, trust, lifecycle state, immutable content, transitions, and recovery remain in their existing stores. No session database, transaction journal, status table, or secret cache is added.
- **Session lifetime**: A session has a 15-minute idle lease, a 60-minute absolute lease, and a 5-minute terminal-result retention window. Access refreshes only the idle deadline, never the absolute deadline. Reaping is deterministic on service entry and close; no timer or scheduler is added. Expiry disposes unconsumed staging with a fresh cleanup signal and returns `expired`, never a latest-candidate fallback.
- **Opaque token**: A token is a versioned UUID plus SHA-256 checksum over the UUID and host-epoch nonce. It contains no source, path, plugin text, configuration key/value, trust surface, project root, or secret. Lookup also requires the session's monotonic `version`; stale concurrent submissions fail rather than overwrite one another.
- **Candidate authority**: Selection is exactly `{scope, registrationId, candidateId, catalogSnapshot}` from the existing internal `MarketplaceCatalogService.resolve`. Names and display order never resolve a candidate. `open` cross-checks the resolved entry, acquires one hardened staging lease, inspects the complete bundle, assesses compatibility against the packaged host's immutable capability capture, derives the installed revision/configuration reference and exact trust candidate, and binds all of that into one immutable session fingerprint.
- **Candidate lease**: Extend the inspection candidate-content adapter into a reusable, private, single-transfer `CandidateContentLease`. Native inspection continues to use it callback-scoped; trusted installation retains it until activation, cancellation, expiry, or close. Lifecycle consumes the same verified materialization, so an inspected external Git/npm candidate is not downloaded again and can activate after the network goes offline. An unmaterialized candidate cannot create a session.
- **Catalog staleness**: Before the first durable preflight effect, the service validates that the exact catalog snapshot is still selected and the inspection/capability/project evidence remains current. A refresh that selects another snapshot returns `candidate-stale`; the pinned bytes are discarded rather than silently installing an older browse result. Once durable preflight begins, the transferred lease and expected installed revision remain the authority; lifecycle guards decide later races.
- **Offline behavior**: A successfully opened session contains a complete verified materialization and needs no later Git/npm/marketplace network request. Marketplace-relative acquisition uses the already selected immutable marketplace root. Configuration, trust commit, promotion, local reload, and registration remain local. Remote MCP connection/auth/tool discovery is live health after local activation and is not required to prove the install transaction.
- **Compatibility/capability binding**: The session records the packaged capability digest and report fingerprint. It never probes capabilities independently. Before activation, lifecycle re-runs existing inspection/compatibility over the retained bytes and the same host-epoch `CompatibilityService`. A capability or participant epoch change invalidates the session through host replacement; no old consent is carried across reload.
- **Consent binding**: Consent is not a boolean. The caller must echo `consentId`, derived from scope, candidate selection, immutable installed revision, source identity, configuration descriptor digest/reference, trust subject, executable-surface digest, compatibility report fingerprint, and capability digest. `grant` for another session/revision/scope/surface is invalid; `deny` cancels without durable mutation.
- **Executable disclosure**: Reuse `projectSafeSource`, `projectSafeComponents`, safe provenance, native compatibility views, and registry-owned diagnostics. The disclosure includes skill roots; every unexpanded hook event/matcher/command/argv/shell/timeout; every MCP transport, unexpanded command/argv or redacted endpoint, environment/header names, auth kind, declared tool policy and runtime requirements; persistent-data use; and explicit SubagentStart/SubagentStop interception requirements. Query/header/bearer/configured values and expanded paths remain absent. The trust digest still binds the exact underlying declaration, so a redacted value change invalidates consent.
- **MCP and subagent honesty**: No remote MCP server is contacted during `open`. Declared tool allow/deny/approval facts may be shown; dynamically discovered tools are labeled unavailable until runtime. Subagent hook declarations remain supported only when the captured interception requirement is available. Missing MCP/subagent production participants keep compatibility non-activatable; no local fake or partial-install path is introduced.
- **Configuration fields**: Workflow field descriptors derive from `PluginConfiguration` and reuse native safe labels/descriptions. They expose kind, required/sensitive flags, numeric/array/path constraints, safe pattern display, and safe non-sensitive default display. Sensitive descriptors cannot have defaults. Omission applies the existing declared default; existing exact-document secret locators may be preserved without reading plaintext.
- **Input partition**: `nonSensitive` entries accept ordinary typed values only for non-sensitive descriptors. `sensitive` entries accept `SensitiveValue` only for sensitive descriptors. Duplicate, cross-partition, unknown, or wrong-kind keys fail. Plaintext is callback-scoped to existing validation/credential operations and is removed from the session submission reference immediately after `ConfigurationService.save` settles.
- **All-errors validation**: Refactor `configuration-validation.ts` so one collector owns validation semantics and returns all deterministic field issues in unsigned UTF-8 key/code order. Existing throwing validation remains a compatibility wrapper over the collector. Pure/type/default checks run before path adapter calls; path checks remain bounded and report every actionable field without returning attempted values or native causes.
- **Configuration authority**: Any non-empty descriptor set receives an exact `PluginConfigurationDocument`, including all-default/optional configurations because runtime resolution requires its revision-bound reference. The existing configuration service performs CAS, secret create/no-replace, reconciliation, and cleanup. The session retains only configuration reference/revision and configured field identities, never values or locators. Before lifecycle, the exact document revision and descriptor binding are reread; a concurrent edit returns `configuration-stale`.
- **Trust persistence**: Add a narrow `ExactTrustGrantService` over the existing user `LifecycleStateStore` and `GenerationMutationCoordinator`. It creates `grantTrust(candidate)`, replaces only the same subject, sorts records deterministically, and commits the existing trust document. It is idempotent when the exact grant already exists. It creates no trust store, prompt policy, expiry policy, or cross-source grant.
- **Project trust/root**: Project sessions acquire the existing opaque `TrustedProjectRoot` and bind the path-free project key/epoch. Project trust and root identity are checked at open, before configuration, in the trust mutation's `beforeCommit`, and immediately before lifecycle. Root/repository/project-key change or lost trust returns `project-stale`/`project-untrusted`; no user-scope fallback is allowed. Public tokens/results never contain canonical roots.
- **Safe preflight persistence**: Configuration and the exact trust decision are intentional, inert preflight authorities and are not folded into the lifecycle content/state transaction. They may safely remain after a later install rejection, rollback, cancellation, or recovery-required result and make a same-session retry resumable. The result states which safe preflight artifacts were retained using booleans and digests only. Removing them automatically would race concurrent sessions and revoke an explicit user decision.
- **Trust ambiguity**: Exact trust mutation reconciliation mirrors existing generation coordination: exact expected-plus-one evidence is committed; unchanged authority is failed/stale; unreadable or different authority is `recovery-required`. Lifecycle is never invoked while trust persistence is ambiguous. A retry first rereads the exact subject and treats an exact grant as committed.
- **Existing transaction remains sole install authority**: Refactor lifecycle construction to expose a package-private prepared-install authority that enters the same `execute("install")` transaction with a single-transfer candidate lease. Public `PluginLifecycleService.install` remains source-compatible and still materializes itself. Both paths share inspection, compatibility, readiness, projection, promotion, pending transition, state CAS, reload, observation, rollback, and recovery code.
- **Exact install revision**: Apply `expectedRevision` to install as well as update; current code only forwards it for update. The prepared authority additionally verifies candidate ID/snapshot/source hash/materialization binding/report/configuration/trust digests before claiming the lease. Any mismatch returns `AVAILABLE_REVISION_CHANGED`/`candidate-stale` without promotion.
- **Initial enable path**: If exact authoritative state already contains the selected revision disabled, release the candidate lease and invoke existing `PluginLifecycleService.enable`; do not reinstall or update. Exact enabled state returns `current-state`; a different installed revision returns `conflict` because update belongs to the sibling lifecycle feature.
- **Success definition**: Only lifecycle `changed` with matching `ActivationObservation.kind === "active"`, exact revision, scope, plugin, and projection digest maps to `succeeded`. Callback return, progress completion, trust grant, content promotion, state commit, or reload acceptance alone never maps to success.
- **Result mapping**: `unchanged` becomes `current-state`; `ALREADY_INSTALLED`, target generation change, concurrent update/uninstall, pending transition, and changed configuration/candidate bindings become explicit conflict/stale results; rejected preflight remains `rejected`; verified compensation is `rolled-back`; unresolved transition is `recovery-required`; and pre-commit abort is `cancelled`. Raw snapshots, native errors, and causes never cross the workflow contract.
- **Progress truthfulness**: The registry-owned phases are `candidate-acquisition`, `input-validation`, `configuration-custody`, `trust-decision`, `activation-transaction`, `activation-observation`, and `completed`. Events carry sequence, phase, state (`started | completed | retained | failed`), safe identity/digests, and stable codes only. A phase completes only after its boundary proves completion. Progress is bounded in-memory evidence, never activation authority or a durable log.
- **Progress callback failure**: Observer failures are ignored after recording a fixed safe delivery code; they never cancel or change the underlying operation. Input-provider failure happens before mutation and returns `interaction-failed`. Neither native callback error nor message is serialized.
- **Cancellation**: `cancel` aborts the session controller and reports `accepted`; it does not claim operation cancellation. Before any durable preflight write, final result is `cancelled` and the lease is discarded. After configuration/trust commits, those artifacts are retained and reported. During/after lifecycle ambiguity, lifecycle compensation/recovery evidence wins over the abort signal.
- **Concurrency**: One session activation owns a compare-and-set transition from `awaiting-input|ready` to `activating`; another activation gets `operation-in-progress`. Different sessions may inspect concurrently. Configuration CAS, exact trust generation mutation, and the existing scope/plugin scheduler + cross-process lock serialize durable conflicts. A concurrent install/update/uninstall is never hidden by an automatic retry against changed target state.
- **Operation admission and disposal**: Every future command/TUI call reaches the service inside existing `runWithPiOperationContext`; shutdown rejects new admission and lets admitted operations settle. Lifecycle-triggered session shutdown must not abort the admitted install. After the operation drain, trusted-install `close()` rejects tokens, discards unconsumed leases, clears safe progress/results, and participates in reverse packaged cleanup. Crash leftovers remain existing abandoned staging/recovery work.
- **Mock data**: `test/fixtures/trusted-install/plugin-install-flow.ts` provides strict schema-valid data for choose/inspect, required/defaulted/path/sensitive fields, exact hook/MCP/subagent consent, progress, success, current-state, missing-input, stale revision/project, conflict, rollback, recovery-required, cancellation, and capability-unavailable states. It contains no UI markup or plaintext secret fixture.
- **Foundation timing**: Code-first. Foundation documents already assert explicit trust, configuration custody, complete-bundle transactionality, rollback/recovery, exact runtime observation, and thin presentation. Implementation updates an assertion only if final public names or guarantees make it false; omission is not drift.

## Architectural choice

### Option A — stateless request that re-resolves and re-downloads on install

The application could return an inspection result, then accept configuration/consent in one later request that resolves the latest candidate and calls `PluginLifecycleService.install`. This has little transient state, but breaks immutable choose-to-consent binding, downloads external candidates twice, cannot continue offline after inspection, and makes resumability a presentation concern. Rejected.

### Option B — durable workflow/session database and cross-store transaction

A durable session record could survive restart and attempt to atomically group configuration, trust, source staging, lifecycle state, and progress. It would add a second transaction/journal/state authority, retain secret-adjacent workflow data, duplicate lifecycle recovery, and complicate cleanup. Rejected.

### Option C — host-epoch transient candidate lease over existing durable authorities (chosen)

A bounded in-memory state machine pins one exact materialized candidate and safe disclosure. Configuration uses the existing CAS/credential service, trust uses the existing state document and mutation coordinator, and activation transfers the lease into the existing lifecycle transaction. Tokens are resumable only inside the owning host epoch; durable preflight authorities make retries safe without a session store.

**Choice**: Option C. It is the shortest design that preserves exact consent, offline continuation, deterministic retries, and existing transaction/recovery ownership.

## Trickiest unit first

The hardest unit is the boundary between an inspected, consented materialization and the existing lifecycle transaction. Re-resolving by name/ref would allow source movement between disclosure and commit; bypassing lifecycle candidate preparation would duplicate compatibility, configuration, projection, promotion, rollback, and observation logic.

The design introduces a single-transfer branded `CandidateContentLease`. `open` obtains it from the existing hardened staging adapter and computes an immutable `TrustedInstallCandidateBinding`. The package-private lifecycle prepared-install authority claims that capability once, re-inspects the same bytes, re-assesses current host-epoch compatibility, re-authorizes exact persisted trust/configuration, prepares the same projection/promotion, and enters the unchanged transaction executor. The lease is discarded on every path not transferred. If this refactor proves unsafe, the fallback is to reject offline continuation and re-materialize with an exact expected revision; never accept a latest-ref fallback or implement a second transaction.

## Exact public application contract

### Unit 1: Workflow schemas, tokens, bindings, progress, and result vocabulary

**Story**: `epic-native-plugin-management-trusted-installation-contracts-identifiers`

**Files**:
- `src/application/trusted-install-contract.ts`
- `src/application/trusted-install-identifiers.ts`
- `src/index.ts`
- `test/application/trusted-install-contract.test.ts`
- `test/application/trusted-install-identifiers.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

All serializable types are inferred from strict readonly Zod schemas. Registries own states, phases, issue codes, stale reasons, and outcomes.

```typescript
export const TrustedInstallSessionPolicy = Object.freeze({
  idleTtlMs: 15 * 60_000,
  absoluteTtlMs: 60 * 60_000,
  terminalRetentionMs: 5 * 60_000,
  maxProgressEvents: 32,
});

export const TrustedInstallSessionTokenSchema = z.string()
  .regex(/^trusted-install-session-v1:[0-9a-f-]{36}\.[0-9a-f]{64}$/)
  .max(128)
  .brand<"TrustedInstallSessionToken">();
export const TrustedInstallSessionVersionSchema = z.number().int().nonnegative();
export const TrustedInstallConsentIdSchema = z.string()
  .regex(/^trusted-install-consent-v1:sha256:[0-9a-f]{64}$/)
  .brand<"TrustedInstallConsentId">();

export const TrustedInstallCandidateBindingSchema = z.object({
  scope: ScopeReferenceSchema,
  registrationId: MarketplaceRegistrationIdSchema,
  candidateId: MarketplaceCandidateIdSchema,
  catalogSnapshot: MarketplaceSnapshotTokenSchema,
  plugin: PluginKeySchema,
  sourceIdentity: SourceHashSchema,
  immutableRevision: ContentDigestSchema,
  contentDigest: ContentDigestSchema,
  compatibilityFingerprint: ContentDigestSchema,
  configurationDescriptorDigest: ContentDigestSchema,
  configurationRef: PluginConfigurationRefSchema.optional(),
  trustSubject: TrustSubjectRefSchema,
  executableSurfaceDigest: ContentDigestSchema,
  capabilityDigest: ContentDigestSchema,
  projectEpoch: ContentDigestSchema.optional(),
}).strict().readonly();

export const TrustedInstallSessionStateSchema = z.enum([
  "awaiting-input", "ready", "activating", "succeeded", "current-state",
  "cancelled", "rejected", "stale", "conflict", "rolled-back",
  "recovery-required", "failed", "expired", "disposed",
]);

export const TrustedInstallConfigurationFieldSchema = z.object({
  key: ConfigurationKeySchema,
  label: SafeDisplayFieldSchema,
  description: SafeDisplayFieldSchema.optional(),
  kind: z.enum(["string", "number", "boolean", "directory", "file", "strings"]),
  required: z.boolean(),
  sensitive: z.boolean(),
  defaultPresent: z.boolean(),
  default: TrustedInstallDefaultViewSchema.optional(),
  constraints: TrustedInstallConstraintViewSchema,
  state: z.enum(["missing", "defaulted", "configured", "unavailable", "invalid"]),
}).strict().readonly();

export const TrustedInstallConsentDisclosureSchema = z.object({
  consentId: TrustedInstallConsentIdSchema,
  source: NativeSourceViewSchema,
  immutableRevision: ContentDigestSchema,
  executableSurfaceDigest: ContentDigestSchema,
  components: NativeComponentInventoryViewSchema,
  requirements: NativeCompatibilityViewSchema.shape.requirements,
  persistentData: z.literal(true),
  configurationEnvironmentNames: z.array(SafeDisplayFieldSchema).readonly(),
  subagentInterception: z.enum(["not-declared", "available", "unavailable"]),
  remoteMcpDiscovery: z.literal("not-performed"),
  statement: SafeDisplayFieldSchema,
}).strict().readonly();

export const TrustedInstallSessionViewSchema = z.object({
  token: TrustedInstallSessionTokenSchema,
  version: TrustedInstallSessionVersionSchema,
  state: TrustedInstallSessionStateSchema,
  expiresAt: EpochMillisecondsSchema,
  binding: TrustedInstallCandidateBindingSchema,
  candidate: NativeInspectionDetailSchema,
  fields: z.array(TrustedInstallConfigurationFieldSchema).readonly(),
  consent: TrustedInstallConsentDisclosureSchema,
  progress: z.array(TrustedInstallProgressEventSchema).max(32).readonly(),
  retained: z.object({ configuration: z.boolean(), trust: z.boolean() }).strict().readonly(),
}).strict().readonly();

export const TrustedInstallOpenRequestSchema = z.object({
  inspectionSnapshotId: InspectionSnapshotIdSchema,
  detailId: InspectionDetailIdSchema,
}).strict().readonly();

export const TrustedInstallSubmissionSchema = z.object({
  expectedVersion: TrustedInstallSessionVersionSchema,
  nonSensitive: z.array(z.object({ key: ConfigurationKeySchema, value: z.unknown() }).strict().readonly()).readonly(),
  sensitive: z.array(z.object({ key: ConfigurationKeySchema, value: z.custom<SensitiveValue>((value) => value instanceof SensitiveValue) }).strict().readonly()).readonly(),
  consent: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("grant"), consentId: TrustedInstallConsentIdSchema }).strict().readonly(),
    z.object({ kind: z.literal("deny"), consentId: TrustedInstallConsentIdSchema }).strict().readonly(),
  ]),
}).strict().readonly();

export const TrustedInstallInputIssueSchema = z.object({
  code: z.enum([
    "CONFIG_UNKNOWN_KEY", "CONFIG_DUPLICATE_INPUT", "CONFIG_REQUIRED",
    "CONFIG_TYPE", "CONFIG_PATTERN", "CONFIG_BOUNDS", "CONFIG_PATH_INVALID",
    "CONFIG_PATH_MISSING", "CONFIG_PATH_WRONG_KIND", "CONFIG_PATH_ADAPTER_FAILED",
    "CONFIG_SENSITIVITY_MISMATCH", "SECRET_CUSTODY_UNAVAILABLE",
    "CONSENT_REQUIRED", "CONSENT_STALE",
  ]),
  key: ConfigurationKeySchema.optional(),
}).strict().readonly();

export const TrustedInstallProgressPhaseRegistry = Object.freeze({
  candidateAcquisition: { tag: "candidate-acquisition" },
  inputValidation: { tag: "input-validation" },
  configurationCustody: { tag: "configuration-custody" },
  trustDecision: { tag: "trust-decision" },
  activationTransaction: { tag: "activation-transaction" },
  activationObservation: { tag: "activation-observation" },
  completed: { tag: "completed" },
} as const);

export const TrustedInstallProgressEventSchema = z.object({
  sequence: z.number().int().nonnegative(),
  phase: z.enum(["candidate-acquisition", "input-validation", "configuration-custody",
    "trust-decision", "activation-transaction", "activation-observation", "completed"]),
  state: z.enum(["started", "completed", "retained", "failed"]),
  plugin: PluginKeySchema,
  scope: ScopeReferenceSchema,
  revision: ContentDigestSchema,
  code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/).optional(),
}).strict().readonly();
```

`TrustedInstallOpenResultSchema` is `opened | stale | unavailable | rejected`. `TrustedInstallActivationResultSchema` is a strict discriminated union:

- `needs-input`: complete sorted issues, unchanged safe session view, no durable mutation;
- `succeeded`: exact scope/plugin/revision/projection digest, complete component counts, safe progress, diagnostics, retained preflight evidence;
- `current-state`: exact installed activation/revision and stable reason;
- `cancelled`: final phase plus retained-preflight flags;
- `stale`: `session | candidate | configuration | consent | project | capability`;
- `conflict`: `already-installed-different-revision | operation-in-progress | pending-transition | concurrent-mutation`;
- `rejected`: stable workflow/lifecycle rejection code and diagnostics;
- `rolled-back`: safe lifecycle failure category plus independently observed restored state;
- `recovery-required`: transition reference/committed generation when available plus `run-recovery` diagnostics;
- `failed`: stable adapter/interaction/cleanup code only.

No result variant can contain `SensitiveValue`, configured values, secret locators, canonical project/content/data/configuration roots, raw lifecycle snapshots, executable expansions, native causes, stdout/stderr, or callback messages.

```typescript
export interface TrustedInstallationService {
  open(request: TrustedInstallOpenRequest, signal: AbortSignal): Promise<TrustedInstallOpenResult>;
  activate(request: Readonly<{ token: TrustedInstallSessionToken; submission: TrustedInstallSubmission }>, options: TrustedInstallExecutionOptions, signal: AbortSignal): Promise<TrustedInstallActivationResult>;
  run(request: TrustedInstallOpenRequest, options: TrustedInstallRunOptions, signal: AbortSignal): Promise<TrustedInstallActivationResult>;
  status(request: Readonly<{ token: TrustedInstallSessionToken }>, signal: AbortSignal): Promise<TrustedInstallStatusResult>;
  cancel(request: Readonly<{ token: TrustedInstallSessionToken }>, signal: AbortSignal): Promise<TrustedInstallCancellationResult>;
}

export type TrustedInstallDecisionProvider = (
  request: Readonly<{ session: TrustedInstallSessionView }>,
  signal: AbortSignal,
) => Promise<TrustedInstallSubmission | Readonly<{ kind: "cancelled" }>>;

export type TrustedInstallExecutionOptions = Readonly<{
  onProgress?: (event: TrustedInstallProgressEvent) => void | Promise<void>;
}>;
export type TrustedInstallRunOptions = TrustedInstallExecutionOptions & Readonly<{
  submission?: TrustedInstallSubmission;
  decisionProvider?: TrustedInstallDecisionProvider;
}>;
```

**Acceptance criteria**:
- [ ] Schemas reject unknown fields, impossible state/result combinations, plaintext sensitive submissions, oversized/forged tokens, and consent for another binding.
- [ ] Candidate/consent IDs differ across scope, project epoch, registration, catalog snapshot, source, revision, descriptors, trust surface, report, and capability capture.
- [ ] Every public variant derives from one registry/schema and every serialized result passes secret/path/native-cause canary scans.
- [ ] Deterministic invocation without sufficient input returns all sorted issues and performs no writes.

### Unit 2: Exact candidate lease and shared safe consent disclosure

**Story**: `epic-native-plugin-management-trusted-installation-candidate-lease-disclosure`
**Depends on**: `epic-native-plugin-management-trusted-installation-contracts-identifiers`

**Files**:
- `src/application/ports/candidate-content-lease.ts`
- `src/application/trusted-install-candidate.ts`
- `src/application/native-candidate-inspection.ts`
- `src/application/native-inspection-disclosure.ts`
- `src/application/native-inspection-contract.ts`
- `src/composition/candidate-content-lease.ts`
- `src/composition/inspection-candidate-content.ts` (remove after callers move)
- `test/application/trusted-install-candidate.test.ts`
- `test/application/native-candidate-inspection.test.ts`
- `test/application/native-inspection-disclosure.test.ts`
- `test/composition/candidate-content-lease.test.ts`

```typescript
declare const candidateContentLeaseBrand: unique symbol;

export interface CandidateContentLease {
  readonly [candidateContentLeaseBrand]: true;
  readonly candidate: ResolvedMarketplaceCandidate;
  readonly materialized: MaterializedPlugin;
  claim(signal: AbortSignal): Promise<ClaimedCandidateContent>;
  release(): Promise<void>;
}

export interface CandidateContentLeasePort {
  acquire(candidate: ResolvedMarketplaceCandidate, signal: AbortSignal): Promise<CandidateContentLease>;
  withMaterialized<T>(candidate: ResolvedMarketplaceCandidate, signal: AbortSignal,
    use: (materialized: MaterializedPlugin) => Promise<T>): Promise<T>;
}

export type TrustedInstallCandidate = Readonly<{
  lease: CandidateContentLease;
  resolved: ResolvedMarketplaceCandidate;
  plugin: NormalizedPlugin;
  compatibility: CompatibilityReport;
  revision: InstalledRevisionRecord;
  trust: TrustCandidate;
  binding: TrustedInstallCandidateBinding;
  detail: NativeInspectionDetail;
  fields: readonly TrustedInstallConfigurationField[];
  consent: TrustedInstallConsentDisclosure;
}>;

export function acquireTrustedInstallCandidate(
  request: Readonly<{ subject: CandidateInspectionDetailSubject; snapshot: InspectionEvidenceSnapshot }>,
  dependencies: TrustedInstallCandidateDependencies,
  signal: AbortSignal,
): Promise<Readonly<{ kind: "ready"; candidate: TrustedInstallCandidate } | { kind: "stale" | "unavailable" | "rejected"; diagnostics: readonly NativeDiagnostic[] }>>;
```

The adapter owns one allocation, enforces exact `<slot>/content`, allows exactly one `claim` or any number of idempotent `release` calls, and discards with a fresh signal. A claimed lease transfers allocation cleanup to lifecycle. `NativeCandidateInspector` uses `withMaterialized`; no duplicate staging adapter remains.

`NativeMcpComponentViewSchema` gains declared safe tool-policy facts needed by consent: allow/deny tool names and approval-policy kind only. It still performs no tool discovery and contains no header/environment values. Shared disclosure projectors, compatibility report, readiness projections, and diagnostic compiler build both native inspection detail and the install disclosure; trusted install does not copy component or redaction logic.

**Acceptance criteria**:
- [ ] Exact catalog selection is cross-checked by scope/registration/candidate/snapshot/plugin and never falls back by name/latest.
- [ ] One materialization feeds inspection, trust derivation, consent, and lifecycle; `claim` is single-use and release is idempotent on success/failure/abort/expiry.
- [ ] Marketplace-relative and already acquired external candidates continue offline; failure before acquisition returns unavailable without a session.
- [ ] Hook/MCP/subagent disclosure is complete for safe executable facts, and all redacted values still participate in executable/consent digests.
- [ ] Native inspection retains callback-scoped cleanup and produces byte-equivalent safe detail for the same candidate evidence.

### Unit 3: Complete configuration issues, defaults, and existing credential custody

**Story**: `epic-native-plugin-management-trusted-installation-configuration-custody`
**Depends on**: `epic-native-plugin-management-trusted-installation-candidate-lease-disclosure`

**Files**:
- `src/application/configuration-validation.ts`
- `src/application/configuration-service.ts`
- `src/application/trusted-install-configuration.ts`
- `src/composition/create-host-configuration.ts`
- `test/application/configuration-validation.test.ts`
- `test/application/configuration-service.test.ts`
- `test/application/trusted-install-configuration.test.ts`
- `test/integration/trust-config-secrets.test.ts`

```typescript
export type ConfigurationValidationIssue = z.infer<typeof ConfigurationValidationIssueSchema>;
export type ConfigurationValidationResult =
  | Readonly<{ kind: "valid"; submission: ValidatedConfigurationSubmission }>
  | Readonly<{ kind: "invalid"; issues: readonly ConfigurationValidationIssue[] }>;

export function collectConfigurationValidation(
  request: ConfigurationSubmission,
  pathPort: ConfigurationPathPort,
  signal: AbortSignal,
): Promise<ConfigurationValidationResult>;

export function validateTrustedInstallSubmission(
  fields: readonly TrustedInstallConfigurationField[],
  submission: TrustedInstallSubmission,
  dependencies: TrustedInstallConfigurationDependencies,
  signal: AbortSignal,
): Promise<Readonly<{ kind: "valid"; request: SavePluginConfigurationRequest } | { kind: "invalid"; issues: readonly TrustedInstallInputIssue[] }>>;
```

The collector is the single validation implementation. `validateConfigurationSubmission` calls it and throws the first sorted issue for existing callers. The workflow adapter checks sensitivity partition and consent before invoking it, builds path context internally from the current session binding/opaque project-root capability, and maps only stable key/code evidence.

`ConfigurationService.save` remains the sole writer. Its existing no-replace secret creation, CAS reconciliation, old-locator cleanup, cancellation behavior, and locator-only recovery are unchanged. The workflow never calls `SecretStore` directly.

**Acceptance criteria**:
- [ ] Unknown/duplicate/cross-partition/required/type/pattern/bounds/path issues are complete, deduplicated, and deterministically ordered without attempted values.
- [ ] Defaults apply exactly once; sensitive defaults remain impossible; all-default descriptor sets still create a revision-bound document.
- [ ] Sensitive values reach only `SensitiveValue` → configuration validation → existing secret custody and never enter session/progress/result/diagnostics/log fixtures.
- [ ] Secret collision, stale CAS, ambiguous replace, cleanup-required, custody unavailable, and concurrent configuration edit map honestly and prevent lifecycle until settled.
- [ ] Project paths require the current opaque root and revalidation; user paths remain session-cwd-bound with no caller-selected base.

### Unit 4: Idempotent exact trust grants on existing state authority

**Story**: `epic-native-plugin-management-trusted-installation-exact-trust-grants`
**Depends on**: `epic-native-plugin-management-trusted-installation-candidate-lease-disclosure`

**Files**:
- `src/application/exact-trust-grant-service.ts`
- `src/application/trust-service.ts`
- `src/domain/state/trust-state.ts`
- `test/application/exact-trust-grant-service.test.ts`
- `test/application/trust-service.test.ts`
- `test/integration/state-contracts.test.ts`

```typescript
export type ExactTrustGrantResult =
  | Readonly<{ kind: "recorded" | "already-recorded"; subject: TrustSubjectRef; generation: Generation }>
  | Readonly<{ kind: "stale"; expected: Generation; actual: Generation }>
  | Readonly<{ kind: "project-untrusted" | "project-stale" }>
  | Readonly<{ kind: "recovery-required"; subject: TrustSubjectRef; committed?: Generation }>;

export interface ExactTrustGrantService {
  grant(request: Readonly<{
    candidate: TrustCandidate;
    scope: ScopeContext;
    projectRoot?: TrustedProjectRoot;
  }>, signal: AbortSignal): Promise<ExactTrustGrantResult>;
}

export function createExactTrustGrantService(dependencies: Readonly<{
  state: LifecycleStateStore;
  mutations: GenerationMutationCoordinator;
  projectTrust: ProjectTrustPort;
  projectRoots: ProjectRootAuthorityPort;
  sha256: Sha256;
}>): ExactTrustGrantService;
```

The service always reads and commits the user trust document because both user- and project-scoped trust evidence is user-local machine authority. The scheduler key uses the candidate's scope-qualified plugin identity; the verified mutation replaces only `trust`, preserving config/installed documents. `beforeCommit` revalidates project trust/root for project subjects. Exact same grant is a no-op; same subject revoked can be explicitly re-granted; another revision/surface is another subject and is never replaced by identity fallback.

**Acceptance criteria**:
- [ ] Grant records reproduce the candidate subject/evidence exactly and bind scope/source/revision/executable digest.
- [ ] Same grant is idempotent; revoked exact subject requires current consent and becomes granted; sibling subjects remain byte-identical.
- [ ] User state generation races return stale/recovery evidence and never invoke lifecycle from ambiguous trust.
- [ ] Project trust/root changes at read, queue wait, before-commit, and return boundaries fail closed with no user fallback.
- [ ] No new store, transaction, trust policy, expiry, source wildcard, or raw executable surface is persisted.

### Unit 5: Single-transfer candidate activation through existing lifecycle authority

**Story**: `epic-native-plugin-management-trusted-installation-lifecycle-activation-bridge`
**Depends on**: `epic-native-plugin-management-trusted-installation-candidate-lease-disclosure`

**Files**:
- `src/application/plugin-candidate-preparation.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/trusted-install-lifecycle.ts`
- `test/application/plugin-candidate-preparation.test.ts`
- `test/application/plugin-lifecycle-service.test.ts`
- `test/application/trusted-install-lifecycle.test.ts`
- `test/integration/plugin-lifecycle.test.ts`

```typescript
/** Package-private; not exported from the root package barrel. */
export interface PreparedInstallLifecycleAuthority {
  installPrepared(request: Readonly<{
    scope: ScopeContext;
    plugin: PluginKey;
    entry: NormalizedMarketplaceEntry;
    marketplaceSource: ResolvedMarketplaceSource;
    sourceContext: SourceContext;
    lease: CandidateContentLease;
    expected: TrustedInstallCandidateBinding;
    configurationPathContext: ConfigurationPathContext;
  }>, signal: AbortSignal): Promise<PluginLifecycleResult>;
}

export type PluginLifecycleComposition = Readonly<{
  application: PluginLifecycleService;
  preparedInstall: PreparedInstallLifecycleAuthority;
}>;

export function createPluginLifecycleComposition(
  dependencies: PluginLifecycleServiceDependencies,
): PluginLifecycleComposition;

/** Source-compatible wrapper retained for package consumers/tests. */
export function createPluginLifecycleService(
  dependencies: PluginLifecycleServiceDependencies,
): PluginLifecycleService;
```

`preparePluginCandidate` accepts either its existing materialize request or one verified claimed lease. Both enter one shared inspection → compatibility → trust/configuration → projection → promotion-plan path. Install forwards and enforces `expectedRevision`; the prepared path additionally verifies every candidate binding before it can prepare promotion. The transaction executor, journal, promotion, state CAS, reload, observation, finalization, rollback, and recovery remain one implementation.

`executeTrustedInstallLifecycle` reads current exact installed state: absent uses `installPrepared`; exact revision disabled releases the lease and uses `enable`; exact revision enabled returns current-state; another revision returns conflict. Final workflow mapping validates all result evidence and compiles existing native diagnostics without returning a `GenerationSnapshot`.

**Acceptance criteria**:
- [ ] Prepared install performs no Git/npm/materializer call and can complete after network loss.
- [ ] Public lifecycle install remains behavior/source compatible and both entry paths execute the same transaction code.
- [ ] Expected revision is enforced for initial install; lease/candidate/config/trust/report mismatch fails before promotion.
- [ ] Exact disabled revision uses enable; exact enabled returns current-state; different revision never silently updates.
- [ ] Changed succeeds only with exact active observation; unchanged/rejected/stale/rolled-back/recovery-required map losslessly.
- [ ] Concurrent install/update/uninstall and target generation changes rely on existing scheduler/lock/CAS and surface precise current-state/conflict/recovery outcomes.

### Unit 6: Resumable session orchestration, cancellation, and deterministic callbacks

**Story**: `epic-native-plugin-management-trusted-installation-session-orchestration`
**Depends on**: `epic-native-plugin-management-trusted-installation-configuration-custody`, `epic-native-plugin-management-trusted-installation-exact-trust-grants`, `epic-native-plugin-management-trusted-installation-lifecycle-activation-bridge`

**Files**:
- `src/application/trusted-install-session.ts`
- `src/application/trusted-install-service.ts`
- `test/application/trusted-install-session.test.ts`
- `test/application/trusted-install-service.test.ts`

```typescript
export function createTrustedInstallationService(dependencies: Readonly<{
  candidate: TrustedInstallCandidateService;
  configuration: BoundPluginConfigurationService;
  configurationAuthority: TrustedInstallConfigurationAuthority;
  trust: ExactTrustGrantService;
  lifecycle: PreparedInstallLifecycleAuthority;
  publicLifecycle: Pick<PluginLifecycleService, "enable">;
  evidence: NativeInspectionEvidencePort;
  state: LifecycleStateStore;
  projectTrust: ProjectTrustPort;
  projectRoots: ProjectRootAuthorityPort;
  clock: LifecycleClock;
  sessionIds: LifecycleOperationIdPort;
  hostEpoch: ContentDigest;
  sha256: Sha256;
}>): Readonly<{
  application: TrustedInstallationService;
  quiesce(): void;
  close(): Promise<void>;
}>;
```

`open` validates the inspection detail subject/snapshot, acquires and binds the candidate, emits candidate-complete, and returns the configure/trust view. `activate` atomically claims the session version, validates all input/consent before mutation, saves/reconciles configuration, records/reconciles trust, revalidates candidate/project/config authority, transfers the lease into lifecycle, and maps the exact result. `run` is `open` + explicit submission/provider + the same `activate`; it never has a separate fast path.

The registry keeps only lease/bindings/safe views/progress/controller/result. It never stores a submission, `SensitiveValue`, configured value, locator, resolved configuration, project root text, or native error. Terminal entries release any unclaimed lease immediately and retain only safe result evidence for five minutes.

**Acceptance criteria**:
- [ ] Open/activate and one-shot run produce equivalent results/progress for equivalent evidence.
- [ ] Missing inputs are complete and mutation-free; callback cancellation/failure is pre-mutation and deterministic.
- [ ] Retry after retained exact config/trust skips duplicate writes only after authority reread proves the same revisions.
- [ ] Session version prevents double activation; same-token concurrent call reports operation-in-progress; expiry/disposal/stale tokens cannot reacquire latest bytes.
- [ ] Cancellation at every boundary preserves committed/rollback/recovery truth and never reports success from callback/progress.
- [ ] Progress is monotonic, bounded, observer-independent, safe, and never used as activation proof.

### Unit 7: Packaged composition, operation admission, and cleanup ownership

**Story**: `epic-native-plugin-management-trusted-installation-packaged-composition-disposal`
**Depends on**: `epic-native-plugin-management-trusted-installation-session-orchestration`

**Files**:
- `src/composition/create-trusted-installation-service.ts`
- `src/composition/create-native-inspection-service.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/composition/create-host-configuration.ts`
- `src/index.ts`
- `test/composition/create-trusted-installation-service.test.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/integration/packaged-host-disposal.test.ts`
- `test/tooling/boundaries.test.ts`

```typescript
export type PackagedPluginHostApplication = Readonly<{
  lifecycle: PluginLifecycleService;
  trustedInstallation: TrustedInstallationService;
  compatibility: CompatibilityService;
  inspection: NativeInspectionService;
  configuration: BoundPluginConfigurationService;
  recovery: LifecycleRecoveryService;
  collection: ReturnType<typeof createRevisionCollectionService>;
  marketplace: MarketplaceDiscoveryServices;
  capabilities: RuntimeCapabilityProbe;
  resources: SkillResourceDiscoveryPort;
}>;
```

Composition creates one candidate lease port, one inspection evidence/readiness context, one lifecycle composition, one exact trust grant service, and one trusted-install service. Raw catalog resolve, materializer, lease, bundle inspector, trust mutation, prepared lifecycle authority, stores, project roots, and session registry remain private. The public root exports schemas/service types/factory useful to adapters; the `./pi` entry remains packaged-host-only.

`runWithPiOperationContext` remains the admission boundary. Shutdown sets admission false and allows an admitted activation—including its Pi reload handoff—to settle. Trusted-install cleanup joins `closeApplication` after operation drain, before content/config/state adapters close. No session cleanup is attached to runtime shutdown because lifecycle reload deliberately shuts runtime down while the admitted operation is still proving activation.

**Acceptance criteria**:
- [ ] Packaged callers obtain the complete three-step workflow through `application.trustedInstallation` and need no raw state/catalog/materializer/trust/config joins.
- [ ] Construction/start performs no candidate acquisition or network request; only `open` acquires bytes.
- [ ] Shutdown rejects new operations/tokens, preserves admitted lifecycle reload, then releases every unclaimed lease before dependent adapters close.
- [ ] Repeated close, partial startup failure, reload successor, expired sessions, and cleanup errors preserve existing aggregate cleanup semantics.
- [ ] Dependency boundaries keep domain/application independent of Pi, Node filesystem/network/time/randomness; composition injects all infrastructure.

### Unit 8: Integrated flow, security, offline, race, and mock-data acceptance

**Story**: `epic-native-plugin-management-trusted-installation-integrated-acceptance`
**Depends on**: `epic-native-plugin-management-trusted-installation-packaged-composition-disposal`

**Files**:
- `test/integration/trusted-installation-clean-environment.test.ts`
- `test/integration/trusted-installation-offline.test.ts`
- `test/integration/trusted-installation-concurrency.test.ts`
- `test/integration/trusted-installation-recovery.test.ts`
- `test/integration/trusted-installation-security.test.ts`
- `test/fixtures/trusted-install/plugin-install-flow.ts`
- `test/fixtures/trusted-install/hostile-values.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

The schema-valid fixture mirrors the signed three-step data hierarchy: exact candidate/source/revision and compatibility counts; required/defaulted/path/sensitive configuration fields; skill/hook/MCP/subagent consent disclosure; progress; exact activation counts; and safe result/recovery states. It is data only.

**Acceptance criteria**:
- [ ] A clean packaged host with no Claude/Codex installation opens, configures, trusts, installs, reloads, and independently observes one whole plugin.
- [ ] User/project scopes, project trust/root changes, candidate refresh, capability loss, configuration edits, and session expiry cannot cross-bind approval or activation.
- [ ] Acquired external and marketplace-relative candidates activate offline with no second source request; unacquired external source reports unavailable.
- [ ] Every configuration/secret/trust failure and lifecycle no-op/conflict/rejection/rollback/recovery/cancellation maps to one exact result with retained-preflight evidence.
- [ ] Multi-session and multi-process install/update/uninstall races preserve one authority and return deterministic conflict/current/recovery outcomes.
- [ ] Hook commands, MCP URLs/headers/env/auth/tool policy, subagent hooks, control/bidi text, project/content/config paths, secrets/locators, native causes, output, and callback errors pass structural redaction scans.
- [ ] Full `npm test` covers typecheck, dependency boundaries, focused tests, build, exact exports, and packaged startup/disposal.

## Implementation order and child-story DAG

1. `epic-native-plugin-management-trusted-installation-contracts-identifiers`
2. `epic-native-plugin-management-trusted-installation-candidate-lease-disclosure`
3. In parallel after candidate binding:
   - `epic-native-plugin-management-trusted-installation-configuration-custody`
   - `epic-native-plugin-management-trusted-installation-exact-trust-grants`
   - `epic-native-plugin-management-trusted-installation-lifecycle-activation-bridge`
4. `epic-native-plugin-management-trusted-installation-session-orchestration`
5. `epic-native-plugin-management-trusted-installation-packaged-composition-disposal`
6. `epic-native-plugin-management-trusted-installation-integrated-acceptance`

The feature remains one cohesive implementation/review bundle. Stories are durable design and verification checkpoints, not one worker per story.

## Workflow invariants

1. A session binds exactly one `{scope, registration, candidate, catalog snapshot, source, immutable revision, compatibility report, configuration descriptor, trust subject, executable surface, capability capture, project epoch}` tuple.
2. A token is lookup capability only. It cannot reconstruct, refresh, or select a candidate after the owning host epoch/session disappears.
3. Consent must echo the exact `consentId`; a generic confirmation cannot grant trust.
4. Candidate bytes are materialized and verified once, leased privately, and transferred at most once into the existing lifecycle transaction.
5. Compatibility and activatability come only from existing bundle inspection/evaluation over the packaged capability capture. No workflow-specific verdict or partial-install rule exists.
6. Configuration validation/default/path rules have one implementation. Sensitive values use existing immediate custody and never enter workflow state or serializable evidence.
7. Configuration documents bind exact descriptors/scope/plugin/revision. A changed document revision blocks lifecycle rather than silently using new values.
8. Trust records bind exact scope/source/revision/executable digest. Project trust/root must remain current through the commit and lifecycle boundary.
9. Configuration/trust preflight may remain after failure because neither activates content. Lifecycle state/content/projection changes remain wholly owned by the existing transaction and recovery system.
10. Success requires exact complete activation observation. Remote MCP health and progress completion are never activation evidence.
11. Concurrent target mutation is surfaced, not retried against a different revision or operation intent.
12. Cancellation cannot erase committed evidence. Rollback/recovery/current-state outrank the caller's abort signal after ambiguous boundaries.
13. Public strings are constrained identifiers/enums or `SafeDisplayField`; raw plugin/native/callback text never crosses the contract.
14. Sessions/progress/results add no durable status authority, event log, transaction journal, secret store, source cache, or timer.
15. Operation admission and disposal preserve an admitted lifecycle reload and release all unclaimed resources afterward.

## Failure and result matrix

| Condition | Result | Durable/lease behavior |
|---|---|---|
| Exact compatible candidate opened | `opened` / `awaiting-input` or `ready` | private lease retained; no durable mutation |
| Candidate missing/catalog snapshot changed | `stale: candidate` | lease discarded |
| External acquisition unavailable before open | `unavailable` | no session/lease residue |
| Compatibility incompatible / required MCP or subagent capability absent | `rejected` with native diagnostics | lease discarded; no partial install |
| Deterministic values/consent absent or invalid | `needs-input` with all issues | no config/trust/lifecycle mutation; session retained |
| Consent denied | `cancelled` | no durable mutation; lease discarded |
| Secret custody unavailable/collision | `needs-input` or `rejected` | existing configuration service cleans/reconciles; no lifecycle |
| Configuration CAS stale | `stale: configuration` | fresh owned secrets cleaned by existing service; session may retry after reread |
| Configuration replace ambiguous | `recovery-required` | locator-only existing recovery evidence; no trust/lifecycle |
| Exact trust already granted | continue | no trust mutation |
| Project trust/root changed | `stale: project` or `rejected: PROJECT_UNTRUSTED` | no later mutation; prior safe config may remain |
| Trust commit ambiguous | `recovery-required` | reread exact subject on retry; no lifecycle until proven |
| Exact revision already enabled | `current-state` | lease discarded; no transaction |
| Exact revision installed disabled | lifecycle `enable` | lease discarded; exact installed bytes observed |
| Different revision installed | `conflict` | lease discarded; update not attempted |
| Concurrent same-session activation | `conflict: operation-in-progress` | one owner continues |
| Concurrent install/update/uninstall changes target | `conflict`/`stale`/`recovery-required` from existing authority | no hidden retry |
| Abort before preflight commit | `cancelled` | lease discarded; no durable install |
| Abort after config/trust commit, before lifecycle | `cancelled` with retained flags | safe preflight retained; lease discarded |
| Lifecycle rejects before state commit | `rejected` | safe preflight retained; lifecycle discards lease/staging |
| Reload/observation fails and compensation proves prior state | `rolled-back` | safe preflight retained; no success claim |
| Commit/transition outcome ambiguous | `recovery-required` | transition/generation evidence only; existing recovery owns settlement |
| Exact active observation | `succeeded` | lease consumed; result contains safe counts/digests only |
| Session expires/disposes | `expired` / `disposed` | unclaimed lease discarded with fresh cleanup signal |
| Progress/decision callback throws | progress ignored or `failed: interaction` before mutation | native callback text omitted |

## Simplification

- Generalize one candidate-content lease adapter and remove the inspection-only staging wrapper after native inspection migrates.
- Reuse native inspection safe schemas/projectors/diagnostics rather than inventing install-only rendering or redaction types.
- Reuse configuration validation/custody and make its issue collector the single validation implementation instead of copying field rules into the workflow.
- Reuse trust documents, state store, scheduler, scope lock, and mutation reconciliation; add no trust database or policy engine.
- Reuse one lifecycle transaction executor for ordinary and leased install entry paths; add no promotion, transition, rollback, observation, or recovery branch in the workflow.
- Keep raw catalog resolver, materializer lease, trust mutation, prepared lifecycle authority, roots, values, locators, and session registry private to composition.
- Add no command parser, TUI model, terminal sanitizer, prompt abstraction, event bus, durable progress/status history, source cache, transaction store, secret store, timer, update/uninstall logic, or ongoing lifecycle management.

## Testing

- **Contract/identifier tests** protect strict generated variants, token/consent checksums, cross-scope/revision/surface/capability binding, stale versions, and structural secret exclusion.
- **Candidate lease tests** protect exact resolution, one materialization/one transfer, cleanup on every edge, offline continuation, report/trust/config derivation, and shared safe disclosure.
- **Configuration interface tests** protect complete issue ordering, defaults, path constraints, sensitivity partition, custody/CAS/reconciliation/cleanup mappings, and no value leakage.
- **Trust interface tests** protect exact subject persistence, idempotence, sibling preservation, revoked re-grant, user-state authority, project revalidation, and ambiguous commit handling.
- **Lifecycle seam tests** protect no second acquisition, install expected revision, exact-enable/current/conflict selection, unchanged transaction code, complete observation, rollback, and recovery mapping.
- **Session tests** protect TTL/version/resume/cancel/provider/progress semantics, retained safe preflight, no sensitive retention, and double-activation prevention.
- **Composition/disposal tests** protect private adapter wiring, admission quiescence, lifecycle reload continuity, reverse cleanup, partial startup, and repeated close.
- **Integrated tests** protect clean packaged install, user/project separation, offline acquisition, all result categories, multi-session/process races, hostile disclosure, and signed mock data.
- Do not repeat foreign reader, materializer hardening, configuration-store/secret-store conformance, trust digest, lifecycle transaction, runtime participant, or recovery matrices. Use one seam case per consumed contract plus feature-owned binding/orchestration cases.

## Risks

- **Riskiest assumption — a staging lease can safely survive between calls**: bounded in-memory leases consume disk and must outlive one operation without becoming authority. Mitigation: hard 15/60-minute limits, no durability, exact host ownership, one transfer, deterministic reap, and existing crash cleanup. Fallback: reject offline continuation and rematerialize only with exact expected revision; never weaken binding.
- **Prepared lifecycle entry could fork transaction behavior**: a second install executor would drift from rollback/recovery. Mitigation: refactor one lifecycle composition/executor and vary only the materialization source before candidate preparation. Fallback: keep ordinary install as a wrapper over the same prepared path.
- **Configuration and trust are separate durable boundaries**: they cannot be atomically grouped with plugin state without a new cross-store transaction. Mitigation: validate all missing input first, keep both artifacts inert/revision-bound, reconcile each existing authority, report retained evidence, and invoke lifecycle only when both are proven. Automatic deletion would be less safe under races.
- **Consent exactness conflicts with redaction**: MCP headers/query/configuration can affect execution but cannot be displayed literally. Mitigation: disclose safe structure and names while binding the consent/trust digest to the complete canonical declaration. Security wins over textual exposure of secret values.
- **Capability or project authority can change during a session**: old consent must not survive a host/project change. Mitigation: bind capability/project epochs, revalidate before every effectful boundary, and make host replacement destroy sessions. Fallback: stale and reopen.
- **All-errors validation can accidentally produce side effects or leak attempted values**: path checks are adapters and secret parsing is sensitive. Mitigation: pure checks first, stable key/code issues only, bounded per-field path checks, no values/messages, and no credential write until all issues are clear.
- **Cancellation during reload is inherently ambiguous**: caller intent cannot prove commit state. Mitigation: existing lifecycle reconciliation/compensation wins; result mapping never overwrites it with cancelled.
- **Session status could become an accidental authority**: retained progress/result may look authoritative. Mitigation: bounded ephemeral status, explicit safe evidence only, no restart persistence, and success only from lifecycle observation.

## Pre-mortem

This design fails if a refreshed or moved source is installed under old consent, a secret enters a session/result/log, project scope falls back to user scope, candidate inspection downloads twice and fails offline, trust/configuration drift between consent and activation, a prepared path bypasses lifecycle rollback/recovery, concurrent update/uninstall is retried invisibly, cancellation masks a committed transition, progress is treated as success, or shutdown discards resources before an admitted reload settles.

The countermeasures are exact candidate/session/consent bindings, `SensitiveValue` plus existing custody, repeated project authority checks, one leased materialization, exact config/trust rereads, one transaction executor, existing scheduler/lock/CAS, recovery-first result precedence, observation-only success, and operation-drain-aware cleanup. If any authority cannot be proven current, the correct outcome is needs-input, stale, conflict, rejected, rolled-back, or recovery-required—never guessed activation.

## Implementation summary

Implemented all eight checkpoints in DAG order as one cohesive xhigh feature-owner bundle with direct repository grounding and no nested agents.

### Delivered architecture

- Strict schema-derived public workflow contracts, registry-owned result/progress vocabularies, host-epoch checksum session tokens, and complete-binding consent IDs.
- One private single-transfer candidate lease shared by native inspection and trusted installation; exact acquired bytes continue into lifecycle without a second source request.
- Shared safe executable disclosure now includes declared MCP tool policy while retaining value/path redaction and no remote discovery.
- One all-errors configuration collector over existing validation/custody, plus partition enforcement and exact post-save authority reread.
- Idempotent exact trust grants over existing user trust state and generation coordination, including project trust/root checks and ambiguity evidence.
- A package-private prepared lifecycle entry that rejoins the existing transaction/activation/rollback/recovery executor; public lifecycle remains source-compatible.
- A bounded nondurable session engine for staged and one-shot operation, exact pre-effect revalidation, retained-preflight evidence, honest cancellation, duplicate admission, bounded progress, status, expiry, and disposal.
- Packaged `application.trustedInstallation` composition sharing existing inspection, capability, configuration, trust, state, lifecycle, admission, reload, and cleanup authorities.
- Schema-valid data-only evidence for the signed choose/inspect → configure/trust → activation-result flow, with offline, concurrency, recovery, and security acceptance.

### Lifecycle and authority notes

No durable workflow/session/status/transaction/secret authority was added. Configuration, trust, content/state transitions, recovery, project roots/trust, candidate materialization, inspection, marketplace selection, runtime observation, operation scheduling, and cross-process locking remain with their existing owners. Sessions retain safe evidence and an unclaimed lease only for the current host epoch; `SensitiveValue` remains callback-scoped and is never copied into session/progress/result/status evidence.

### Verification

- Full `npm test` green.
- TypeScript: green.
- Dependency boundaries: 312 modules / 2,174 dependencies, no violations.
- Vitest: 247 files / 1,230 tests passed.
- Post-rebase focused trusted-install, inspection, marketplace, host, lifecycle, and security selection: 204 tests passed.
- Package build/import: 651 public root exports and 3 Pi exports exact.
- Isolated packed Pi extension startup: passed.

### Execution notes

- Owner capability: GPT-5.6 Sol, xhigh, selected by explicit caller instruction for the security/concurrency/cross-module scope.
- Review weight: `standard`, from project convention. Feature advanced to `review` only after every child reached `done` and the integrated full suite passed.
- Completion hardening makes staging/session-ID cleanup failure explicit, releases acquisition when session creation fails, preserves committed trust evidence across project-return staleness, treats committed lock-cleanup ambiguity as recovery-required, filters resolved preflight diagnostics from success, and rejects activation after quiescence.
- After rebasing onto finalized inspection review `fa075ca`, the integration audit consumed the corrected scope-qualified catalog authority, safe display, snapshot/detail result, and diagnostic contracts directly; no deleted inspection-content wrapper or alternate result parser remains.
- The post-rebase hardening rejects invalid inspection IDs distinctly, revalidates candidate publication/quarantine plus inspection and project-root authority before session publication and lifecycle transfer, preserves exact existing configuration/credential authority without plaintext access, returns partition and descriptor input issues together, and refuses truncated executable consent disclosure.
- HTTP bearer credential environment names are now included in the shared safe MCP disclosure while values remain structurally absent and digest-bound.
- No command/TUI rendering, later lifecycle operation, fork/refactor, release, push, stage transition, or `.work/bin/work-view` change was made.

## Review (2026-07-17)

**Verdict**: Approve

**Blockers**: Five sole-review blockers accepted and fixed in this cycle:

1. Exact configuration revision was not carried beyond the workflow `readExact` check.
2. Candidate acquisition and post-inspection cleanup failures could be swallowed or lose cleanup ownership.
3. `lifecycleStarted` conflated cancellation, adapter failure, and cleanup failure.
4. Configuration ambiguity and credential cleanup advertised lifecycle recovery without an operation that could settle either condition.
5. Trusted-install integration files asserted fixtures or isolated primitives rather than the composed service flow.

**Important**: Public result-union tightening was explicitly deferred as `idea-tighten-trusted-install-result-unions` (`.work/backlog/idea-tighten-trusted-install-result-unions.md`).

**Nits**: none

**Rejected**: none

**Fixes**:

- Threaded the exact configuration revision through prepared install and enable readiness, lifecycle commit guards, pre-reload checks, and post-observation verification. `CONFIGURATION_STALE` now returns before promotion/reload when the revision changes after workflow `readExact`; a later observation-window change enters verified rollback rather than success.
- Introduced typed, path-free candidate cleanup failures with opaque retry ownership. Acquisition, inspection rejection, session publication, lifecycle preparation, and host close preserve and retry cleanup authority; open returns `CLEANUP_FAILED` without a session when acquired bytes cannot be discarded.
- Replaced the boolean lifecycle boundary with typed `before-transaction` outcomes. Pre-transaction abort maps to `cancelled`, ordinary boundary rejection maps to `ADAPTER_FAILED`, and only typed cleanup failures map to `CLEANUP_FAILED`.
- Replaced locator-bearing configuration recovery evidence with opaque capabilities that perform bounded authority reconciliation and credential cleanup. Trusted installation attempts settlement immediately, retains unresolved capability ownership in the transient session, and exposes callable `recover` actions for configuration and trust without falsely citing lifecycle recovery.
- Replaced fixture-only integration coverage with a production-composed open → configure/trust → activate harness over the real candidate lease, configuration custody, exact trust grant, session engine, prepared lifecycle, reload observation, rollback, and recovery orchestration. Boundary adapters remain controllable for offline, stale, concurrent, cancellation, cleanup, rollback, recovery, and hostile-output cases. Static signed-flow fixture validation moved to a focused contract test.

**Commits**:

- `1c4e8a3` — parked result-union tightening.
- `8e10b85` — fixed authority binding, cleanup ownership, typed lifecycle outcomes, and callable recovery.
- `835851f` — added the composed trusted-install acceptance harness and replaced fixture-only integration tests.

**Totals**:

- Review-fix diff before this record: 27 files, 1,893 insertions, 212 deletions.
- Focused trusted-install/configuration/lifecycle/security verification: 28 files, 128 tests passed.
- Full verification: 248 test files, 1,247 tests passed; TypeScript green; dependency boundaries green (312 modules / 2,180 dependencies); package build/import green (651 root exports / 3 Pi exports); isolated packed Pi startup passed.
- One first full-suite run hit the existing generation-locking process-contention timeout; its isolated rerun passed, and the complete `npm test` rerun passed.
- All eight child stories remain `stage: done`.

**Notes**: Substrate feature review, effective weight `standard` from project convention and caller instruction. This is closure of the single completed review pass after receiver adjudication and verified blocker fixes. No repeat review, nested agent, peer mechanism, or second independent pass ran. The feature advanced `review → done`; its parent epic remains active because sibling features are not all complete.
