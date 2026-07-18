---
id: epic-native-plugin-management-lifecycle-sync-operations
kind: feature
stage: done
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-inspection-diagnostics]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Lifecycle and Project-Sync Operations

## Brief

Deliver one deterministic application facade for enable, disable, manual update, uninstall, and explicit project synchronization across installed user and current-project scopes. Every installed-plugin operation begins from exact native-inspection evidence, binds the expected generation/revision/activation state, enters the completed whole-plugin lifecycle transaction, streams bounded truthful progress, and returns an exact observed result suitable for the later command and TUI adapters without reinterpretation.

Project sync reconciles the current machine-local project authority with the portable `.pi/plugins.json` declaration. It uses the existing strict portable-project codec and a new project-root-bound compare-and-replace file adapter; it never reads or writes Claude/Codex state. Sync is local and offline: it does not refresh marketplaces, acquire remote sources, install missing plugins, update revisions, collect configuration, or grant trust. Those conditions become explicit required actions, after which the same plan can be previewed again.

## Epic context and ownership

- Parent: `epic-native-plugin-management`.
- Depends on common native inspection and safe diagnostics; consumes completed marketplace discovery, trusted installation, packaged host, state, lifecycle, transition, recovery, configuration, trust, and project authority.
- Owns exact operation request/preview/confirmation/progress/result contracts, transient operation sessions, target/change binding, lifecycle result projection, uninstall cleanup completion, portable project diff/merge/apply, and packaged operation composition.
- Reuses `PluginLifecycleService`, candidate leasing/preparation, `LifecycleStateStore`, `GenerationMutationCoordinator`, scope/plugin scheduling and locks, transition reconciliation, complete-plugin reload/observation, recovery, native inspection disclosure/diagnostics, and the existing portable-project/state codecs. It creates no second transaction, recovery, projection, trust, configuration, or state engine.
- Does not own command grammar, Pi terminal controls, update scheduling/policy/notifications, marketplace refresh, automatic updates, foreign-state adoption, or UI rendering.

## Capability boundaries

- Enable, disable, update, and uninstall always affect the complete skill/hook/MCP projection. Success is derived from exact lifecycle/reload/observation evidence, never callback acceptance or progress completion.
- Manual update is bound to one installed target and one exact inspected marketplace candidate. It reuses trusted-install configuration/trust preparation and the existing lifecycle executor; the prior active revision remains selected until the candidate is committed and independently observed.
- Uninstall removes activation and installed authority transactionally. Immutable revisions remain subject to existing leases/grace collection. Configuration and exact trust grants remain inert and retained. Persistent plugin data is retained unless the confirmation says `delete-confirmed`; requested deletion is restart-recoverable through the existing transition journal/recovery path.
- A pending transition blocks a new operation. Preview returns the existing safe `run-recovery` action; apply never stacks, replays, or silently settles a transition.
- Project sync operates only on the exact current trusted project. User installations/registrations are read-only context and are never disabled, uninstalled, copied into project authority, or written to portable intent.
- `.pi/plugins.json` contains only schema version, portable marketplace sources, requested plugin identities/constraints, and enabled intent. Configuration values, secret locators, trust, cache/revision/state evidence, project identity, and machine paths never cross that boundary.
- Project sync performs no network request and no hidden install/update/registration acquisition. Missing project registrations, missing/wrong revisions, missing trust/configuration, or pending recovery are returned as required actions before mutation.
- Existing Claude/Codex adoption remains available through `application.marketplace.adoption`; sync neither calls it nor reads `ForeignStateFilesPort`. An already-adopted project registration satisfies portable intent only by exact canonical source equality, and its origin is preserved.

## Mockups

- Inherits the selected split inspector: `.mockups/screens/epic-native-plugin-management-manager/option-1.html`.
- The manager's enable/disable/update/uninstall controls and result/status placement consume this feature's application schemas.
- This feature adds no mockup, HTML, command syntax, keybinding, focus behavior, or terminal component.

## Grounding and design decisions

- **Discovery posture**: Direct-read only, as explicitly required. Grounding covered project/global rules and conventions; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; the parent epic and selected manager mockup; completed packaged composition, marketplace discovery/adoption, inspection/diagnostics, and trusted installation designs/implementations; lifecycle service/request/result contracts, state CAS/coordinator/locks, pending transitions, complete reload observation, reconciliation/recovery, update candidate memory, adoption service, persistent-data removal, portable/project/host-config schemas and codecs, project root/trust, configuration paths/custody/write IDs, operation admission, and disposal. No question, nested agent, peer mechanism, source edit, or `.work/bin/work-view` invocation was used.
- **Manual DAG check**: The ten child IDs were checked against the active tree and ordered as an acyclic graph without invoking the prohibited `work-view` binary. Contracts and project-file authority are roots; target/update preparation and project planning branch from them; lifecycle operations and sync application converge into the session facade; packaged composition and integrated acceptance are the only final chain.
- **One application facade**: `NativeLifecycleOperationService` owns `preview`, `apply`, `run`, `status`, and `cancel` for all five operation kinds. Later command and TUI adapters call it only inside `PackagedPluginHost.runWithPiOperationContext`. They do not call lifecycle, state, recovery, configuration, trust, marketplace, project-file, or cleanup services around it.
- **Transient exact previews**: Preview sessions are bounded host-epoch memory, not durable authority. They hold exact safe bindings, a candidate lease only for update, an opaque project-file observation only for sync, bounded progress, and a terminal safe result. They never retain submitted configuration values, `SensitiveValue`, secret locators, canonical roots, raw state snapshots, native errors, or file bytes.
- **Installed target binding**: Enable/disable/update/uninstall start from one installed `InspectionDetailId` plus `InspectionSnapshotId`. The service captures exact scope, plugin, state generation, selected revision, activation, target-record digest, capability/project epochs, and absence of a pending transition. Display names and list order never select a target.
- **Expected state and CAS**: The facade always supplies an internal `LifecycleTargetExpectation` to lifecycle. A changed target revision, activation, pending marker, or target digest is stale/conflict. An unrelated same-scope generation change may rebase only when the exact target record and project authority remain byte-equivalent; project-sync plans bind the complete project generation and never rebase invisibly.
- **Update selection**: Update preview accepts one exact marketplace-candidate detail from the same inspection snapshot. It resolves `{scope, registrationId, candidateId, catalogSnapshot}`, materializes once through `CandidateContentLease`, verifies the derived immutable revision/source identities/update-candidate key, and binds the complete compatibility/configuration/trust/executable/capability evidence. It never resolves “latest” by plugin name or notification display text.
- **Prepared lifecycle reuse**: Generalize the trusted-install candidate binding/service to `PreparedLifecycleCandidate` and extend the package-private prepared authority with `updatePrepared`. Public install remains source-compatible. Prepared install and update vary only candidate source/expected-current-state inputs before entering one lifecycle executor; promotion, pending state, reload, observation, rollback, and recovery remain unchanged.
- **Manual update trust/configuration**: Every manual update confirmation echoes the exact consent ID and supplies any required candidate-revision configuration through the same sensitivity partition, validation, secret custody, exact trust grant, and authority reread used by trusted install. Existing exact candidate trust is idempotent. Configuration is revision-bound; no value or secret is copied from the prior configuration or portable project file without explicit input. Safe preflight configuration/trust may remain after later lifecycle failure and is reported as retained evidence.
- **Current-state meaning**: Enable on exact enabled state, disable on exact disabled state, update to the exact selected revision, uninstall of an already absent target with no pending requested cleanup, and a converged project-sync plan are explicit `current-state`; they are not generic success and do not reload.
- **Pending transitions**: Any exact pending marker or recovery-blocked inspection makes preview `blocked` with safe `run-recovery` diagnostics. A marker appearing after preview yields `recovery-required`/`conflict: pending-transition`. The facade never invokes recovery automatically because settlement changes authority and deserves its own explicit later facade action.
- **Cancellation precedence**: Before durable mutation, cancellation is `cancelled`. Once lifecycle may have committed, lifecycle reconciliation/rollback/recovery evidence outranks the abort signal. Sync reports already-completed action IDs; it never calls a partially changed project “cancelled with no effect.”
- **Progress truthfulness**: Registry phases are monotonic and bounded. A phase completes only after its owning boundary proves completion. Observer failure records one safe delivery code and does not change/cancel the operation. Progress is neither persisted nor used as commit/activation/file-write evidence.
- **Uninstall retention**: Runtime projection removal and installed-state removal are transaction-owned. Revision bytes remain immutable and are reclaimed only by existing lease/grace collection. Configuration documents and exact trust records remain inert/revision-bound and are retained. Persistent data defaults to `keep`; `delete-confirmed` becomes durable cleanup intent on the uninstall transition and is retried idempotently by startup recovery until exact deletion is proven.
- **Portable intent direction**: Sync modes are explicit: `apply-intent` treats the file as desired machine intent; `publish-intent` writes current project intent to the file; `merge` takes the deterministic union and requires per-key resolution for source, enabled, or constraint conflicts. Direction is never guessed from timestamps.
- **Baseline and change detection**: `ProjectLocalStateDocument.declarationDigest` is the last fully synchronized canonical portable digest; the generation-zero sentinel means “never synchronized.” Preview also binds current state generation, machine projection digest, exact file observation/digest, project key/root epoch, and plan digest. Apply revalidates all of them before the first effect.
- **Merge semantics**: Union preserves entries present on only one side. Equal keys collapse. Same marketplace with different canonical sources and same plugin with different enabled/constraint intent are conflicts. Confirmation must resolve every conflict with `file`, `machine`, or `omit`; unknown, duplicate, stale, or incomplete resolutions fail before mutation. Directional apply/publish is the explicit deletion mechanism; merge never infers a deletion without a resolution.
- **User versus project**: Sync projects only `project.marketplaceUpdates`, `project.marketplaces`, and `project.plugins` for the exact current `ProjectKey`. User records may explain a collision diagnostically but cannot satisfy a missing project registration/plugin and are never imported or changed. No project-to-user fallback exists.
- **Constraint projection**: Existing file constraints are preserved when they still match the exact installed/project registration evidence. A newly published machine plugin is unconstrained rather than being falsely pinned from a resolved revision. Apply validates declared-version/source constraints against installed evidence; mismatch is a required `update-plugin` action, not an automatic update.
- **No hidden network in sync**: Sync never calls marketplace add/refresh, candidate materialization, trusted installation, or update. Missing registration returns `register-marketplace`; missing plugin returns `install-plugin`; constraint mismatch returns `update-plugin`; missing trust/configuration returns their exact actions; pending state returns `run-recovery`. The operator completes those explicit operations and previews sync again.
- **Sync execution**: Admission is all-or-nothing for known required actions and unresolved conflicts. Executable actions are ordered: publish merged/file intent when applicable; disable; uninstall; remove unreferenced project registrations; enable; then commit the exact declaration digest. If a later action fails after earlier exact commits, the result includes `partially-changed` effects and leaves the declaration digest old; retry recomputes and converges. No cross-plugin rollback is invented. Each lifecycle action retains its own verified rollback/recovery.
- **Project file authority**: Add a narrow `ProjectIntentFilePort` fixed to `.pi/plugins.json`. It accepts only an opaque `TrustedProjectRoot`, uses the existing portable codec for values, shares project-root no-symlink containment mechanics with configuration paths, and obtains unpredictable temporary names from an injected write-ID port. No caller supplies a path or raw bytes.
- **File identity and writing**: Read uses bounded `O_NOFOLLOW`, regular-file checks, pre/post descriptor identity, UTF-8/JSON/codec validation, and a content digest. Compare-and-replace binds project/root/parent/leaf identity plus digest, writes canonical JSON with one trailing newline to an exclusive sibling, fsyncs file and directory, atomically renames, and rereads. Changed identity returns stale; lost response is success only if exact canonical bytes are independently observed, otherwise `ambiguous`.
- **Crash/retry boundary**: Applying file intent does not modify the file. Publishing writes the exact desired file before recording its digest in project state; a crash between those steps is safe because retry observes file==machine and only records the digest. Merge writes approved desired intent first, then converges machine state; a crash leaves durable desired intent and an old declaration digest, so retry resumes by diff. Temporary files are inert/exclusive and cleaned on next operation/startup. No unsupported cross-filesystem rename or best-effort overwrite is claimed.
- **Adoption reconciliation**: Project sync compares canonical registered sources regardless of origin. Equal adopted/native sources are unchanged and origin remains machine-local. A conflict is source-based, not alias/origin-based. It never calls adoption preview/import and never opens Claude/Codex files.
- **Operation admission/disposal**: New previews/applies/status calls are admitted only through `runWithPiOperationContext`. Shutdown quiesces new sessions but lets an already admitted lifecycle/reload operation settle. After the operation drain, operation sessions release update leases and opaque file observations before project/config/state/content adapters close. Reload destroys all non-admitted host-epoch tokens; no successor reconstructs a preview.
- **Packaged surface simplification**: Replace public packaged `application.lifecycle` with `application.operations`. Raw lifecycle remains private for trusted installation, update policy, recovery, and operation composition. The root library can retain reusable lifecycle exports, but packaged command/TUI callers receive no bypass around the native facade.
- **Foundation timing**: Code-first. Current foundation assertions already require whole-plugin lifecycle, exact trust/configuration, project intent portability, offline startup, rollback/recovery, and thin presentation. Implementation updates assertions only if landed public guarantees/names make one false; omission is not drift.

## Architectural choice

### Option A — thin stateless wrappers around `PluginLifecycleService`

Each command/TUI action could inspect, then call lifecycle directly with a plugin key. This is short initially, but loses exact preview-to-commit binding, duplicates update configuration/trust work, exposes raw snapshots, cannot safely bind file merge/change evidence, and lets every presentation invent cancellation/result semantics. Rejected.

### Option B — a durable operation/workflow database and cross-resource transaction

A database could retain previews, file bytes, progress, multi-plugin sync checkpoints, and cleanup work across restart. It would become a second journal/state engine beside lifecycle transitions and project declaration digests, retain unnecessary sensitive-adjacent evidence, and claim atomicity across runtime reload, authoritative SQLite, and a Git-working-tree file that the platform cannot provide. Rejected.

### Option C — one host-epoch operation facade over exact existing authorities (chosen)

A bounded transient facade pins exact inspected targets/update bytes/file observations, requires confirmation against a preview ID/version, and delegates every durable effect to its existing owner. Sync is a deterministic convergent plan: known nonlocal prerequisites are required actions, each plugin action is an existing transaction, and the declaration digest is committed only after exact convergence. A narrow project-file compare-and-replace adapter supplies the one missing boundary.

**Choice**: Option C. It gives command/TUI parity, exact consent/change detection, offline sync, and honest recovery without a second lifecycle or fake cross-system transaction.

## Trickiest unit first

The hardest unit is project sync because three independently mutable authorities meet: portable file intent, machine-local project state, and per-plugin runtime transitions. No portable atomic transaction can cover a Git-working-tree file, SQLite state, and Pi reload. A design that writes both “atomically” would either hold locks through reload/network work or lie after a crash.

The chosen plan makes desired intent durable first only for publish/merge, performs no hidden network or missing install, then applies exact existing lifecycle actions in deterministic order. `declarationDigest` advances only after the file, project records, activation intents, and constraints are independently re-read as converged. A crash or cancellation leaves either no effect, a valid desired file with an old baseline, or exact committed plugin actions with an old baseline. All three are safe to re-preview/retry. Lifecycle owns per-plugin compensation; sync never attempts a fragile reverse replay of earlier successful plugins.

The fallback if the verified file compare-and-replace cannot meet no-follow/fsync/rename capability on a platform is `PROJECT_INTENT_WRITE_UNAVAILABLE`. Apply-intent remains read-only/file-to-machine where possible; publish/merge do not downgrade to ordinary `writeFile`.

## Exact public application contract

### Unit 1: Operation schemas, IDs, previews, confirmations, progress, and result vocabulary

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers`

**Files**:
- `src/application/native-lifecycle-operation-contract.ts`
- `src/application/native-lifecycle-operation-identifiers.ts`
- `src/application/project-sync-contract.ts`
- `src/index.ts`
- `test/application/native-lifecycle-operation-contract.test.ts`
- `test/application/native-lifecycle-operation-identifiers.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

All serializable boundary types are inferred from strict readonly Zod schemas. One registry owns operation kinds, phases, outcomes, conflict/stale/rejection codes, sync actions, required actions, and display-independent ordering.

```typescript
export const NativeLifecycleOperationSessionPolicy = Object.freeze({
  idleTtlMs: 15 * 60_000,
  absoluteTtlMs: 60 * 60_000,
  terminalRetentionMs: 5 * 60_000,
  maxProgressEvents: 128,
  maxSyncActions: 512,
  maxProjectIntentBytes: 1_048_576,
  maxProjectDeclarations: 512,
});

export const NativeLifecycleOperationKindSchema = z.enum([
  "enable", "disable", "update", "uninstall", "project-sync",
]);
export const NativeLifecycleOperationTokenSchema = z.string()
  .regex(/^native-operation-session-v1:[0-9a-f-]{36}\.[0-9a-f]{64}$/)
  .max(128).brand<"NativeLifecycleOperationToken">();
export const NativeLifecyclePreviewIdSchema = z.string()
  .regex(/^native-operation-preview-v1:sha256:[0-9a-f]{64}$/)
  .brand<"NativeLifecyclePreviewId">();
export const NativeLifecycleSessionVersionSchema = z.number().int().nonnegative();

export const NativeInstalledOperationTargetRequestSchema = z.object({
  inspectionSnapshotId: InspectionSnapshotIdSchema,
  detailId: InspectionDetailIdSchema,
}).strict().readonly();

export const NativeLifecycleOperationRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.enum(["enable", "disable", "uninstall"]),
    target: NativeInstalledOperationTargetRequestSchema }).strict().readonly(),
  z.object({ operation: z.literal("update"),
    target: NativeInstalledOperationTargetRequestSchema,
    candidate: NativeInstalledOperationTargetRequestSchema }).strict().readonly(),
  z.object({ operation: z.literal("project-sync"),
    mode: z.enum(["apply-intent", "publish-intent", "merge"]),
    projectKey: ProjectKeySchema }).strict().readonly(),
]);

export const NativeLifecycleTargetBindingSchema = z.object({
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  stateGeneration: GenerationSchema,
  selectedRevision: ContentDigestSchema,
  activation: z.enum(["enabled", "disabled"]),
  targetDigest: ContentDigestSchema,
  inspectionSnapshotId: InspectionSnapshotIdSchema,
  detailId: InspectionDetailIdSchema,
  projectEpoch: ContentDigestSchema.optional(),
  transition: z.literal("none"),
}).strict().readonly();

export const ProjectIntentObservationIdSchema = z.string()
  .regex(/^project-intent-observation-v1:sha256:[0-9a-f]{64}$/)
  .brand<"ProjectIntentObservationId">();
export const ProjectSyncActionIdSchema = z.string()
  .regex(/^project-sync-action-v1:sha256:[0-9a-f]{64}$/)
  .brand<"ProjectSyncActionId">();
export const ProjectSyncConflictIdSchema = z.string()
  .regex(/^project-sync-conflict-v1:sha256:[0-9a-f]{64}$/)
  .brand<"ProjectSyncConflictId">();

export const ProjectSyncActionSchema = z.object({
  id: ProjectSyncActionIdSchema,
  kind: z.enum(["write-intent", "disable-plugin", "uninstall-plugin",
    "remove-marketplace", "enable-plugin", "record-intent-digest"]),
  plugin: PluginKeySchema.optional(),
  registrationId: MarketplaceRegistrationIdSchema.optional(),
}).strict().readonly();
export const ProjectSyncRequiredActionSchema = z.object({
  id: ProjectSyncActionIdSchema,
  kind: z.enum(["register-marketplace", "install-plugin", "update-plugin",
    "review-trust", "provide-configuration", "run-recovery"]),
  plugin: PluginKeySchema.optional(),
  marketplace: MarketplaceNameSchema.optional(),
  action: NativeDiagnosticActionSchema,
}).strict().readonly();
export const ProjectSyncConflictSchema = z.object({
  id: ProjectSyncConflictIdSchema,
  kind: z.enum(["marketplace-source", "plugin-enabled", "plugin-constraint"]),
  marketplace: MarketplaceNameSchema.optional(),
  plugin: PluginKeySchema.optional(),
  file: ProjectSyncConflictValueSchema,
  machine: ProjectSyncConflictValueSchema,
}).strict().readonly();

export const ProjectSyncPlanSchema = z.object({
  mode: z.enum(["apply-intent", "publish-intent", "merge"]),
  projectKey: ProjectKeySchema,
  projectEpoch: ContentDigestSchema,
  stateGeneration: GenerationSchema,
  baselineDigest: ContentDigestSchema,
  file: z.object({
    status: z.enum(["missing", "present"]),
    observationId: ProjectIntentObservationIdSchema,
    digest: ContentDigestSchema.optional(),
  }).strict().readonly(),
  machineDigest: ContentDigestSchema,
  desiredDigest: ContentDigestSchema.optional(),
  planDigest: ContentDigestSchema,
  actions: z.array(ProjectSyncActionSchema).max(512).readonly(),
  requiredActions: z.array(ProjectSyncRequiredActionSchema).max(512).readonly(),
  conflicts: z.array(ProjectSyncConflictSchema).max(512).readonly(),
}).strict().readonly();

export const NativeLifecycleOperationPreviewSchema = z.object({
  previewId: NativeLifecyclePreviewIdSchema,
  operation: NativeLifecycleOperationKindSchema,
  admission: z.enum(["ready", "needs-input", "needs-action", "blocked"]),
  target: NativeLifecycleTargetBindingSchema.optional(),
  update: z.object({
    candidate: PreparedLifecycleCandidateBindingSchema,
    updateCandidate: UpdateCandidateKeySchema,
    fields: z.array(TrustedInstallConfigurationFieldSchema).readonly(),
    consent: TrustedInstallConsentDisclosureSchema,
  }).strict().readonly().optional(),
  sync: ProjectSyncPlanSchema.optional(),
  diagnostics: z.array(NativeDiagnosticSchema).readonly(),
}).strict().readonly();

export const NativeLifecycleOperationSessionViewSchema = z.object({
  token: NativeLifecycleOperationTokenSchema,
  version: NativeLifecycleSessionVersionSchema,
  state: z.enum(["previewed", "applying", "succeeded", "current-state",
    "needs-action", "cancelled", "stale", "conflict", "rejected",
    "rolled-back", "recovery-required", "failed", "expired", "disposed"]),
  expiresAt: EpochMillisecondsSchema,
  preview: NativeLifecycleOperationPreviewSchema,
  progress: z.array(NativeLifecycleProgressEventSchema).max(128).readonly(),
}).strict().readonly();

export const NativeLifecycleOperationPreviewResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("opened"), session: NativeLifecycleOperationSessionViewSchema }).strict().readonly(),
  z.object({ kind: z.literal("current-state"), operation: NativeLifecycleOperationKindSchema,
    diagnostics: z.array(NativeDiagnosticSchema).readonly() }).strict().readonly(),
  z.object({ kind: z.literal("stale"), reason: z.enum(["inspection", "target", "candidate", "project", "file", "capability"]) }).strict().readonly(),
  z.object({ kind: z.literal("unavailable"), code: NativeLifecycleStableCodeSchema,
    diagnostics: z.array(NativeDiagnosticSchema).readonly() }).strict().readonly(),
  z.object({ kind: z.literal("rejected"), code: NativeLifecycleStableCodeSchema,
    diagnostics: z.array(NativeDiagnosticSchema).readonly() }).strict().readonly(),
]);

const NativeUpdateConfirmationInputSchema = z.object({
  nonSensitive: z.array(z.object({ key: ConfigurationKeySchema, value: z.unknown() }).strict().readonly()).readonly(),
  sensitive: z.array(z.object({ key: ConfigurationKeySchema,
    value: z.custom<SensitiveValue>((value) => value instanceof SensitiveValue) }).strict().readonly()).readonly(),
  consent: z.object({ kind: z.literal("grant"), consentId: TrustedInstallConsentIdSchema }).strict().readonly(),
}).strict().readonly();

export const NativeLifecycleOperationConfirmationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("deny"), previewId: NativeLifecyclePreviewIdSchema,
    expectedVersion: NativeLifecycleSessionVersionSchema }).strict().readonly(),
  z.object({ kind: z.literal("confirm"), previewId: NativeLifecyclePreviewIdSchema,
    expectedVersion: NativeLifecycleSessionVersionSchema,
    operation: z.enum(["enable", "disable"]) }).strict().readonly(),
  z.object({ kind: z.literal("confirm-update"), previewId: NativeLifecyclePreviewIdSchema,
    expectedVersion: NativeLifecycleSessionVersionSchema,
    input: NativeUpdateConfirmationInputSchema }).strict().readonly(),
  z.object({ kind: z.literal("confirm-uninstall"), previewId: NativeLifecyclePreviewIdSchema,
    expectedVersion: NativeLifecycleSessionVersionSchema,
    persistentData: z.enum(["keep", "delete-confirmed"]) }).strict().readonly(),
  z.object({ kind: z.literal("confirm-project-sync"), previewId: NativeLifecyclePreviewIdSchema,
    expectedVersion: NativeLifecycleSessionVersionSchema,
    resolutions: z.array(z.object({ conflictId: ProjectSyncConflictIdSchema,
      choose: z.enum(["file", "machine", "omit"]) }).strict().readonly()).readonly(),
  }).strict().readonly(),
]);

export const NativeLifecycleProgressPhaseSchema = z.enum([
  "preflight", "authority-revalidation", "candidate-preparation",
  "configuration-custody", "trust-decision", "project-file-write",
  "lifecycle-transaction", "runtime-observation", "project-reconciliation",
  "uninstall-cleanup", "finalization", "completed",
]);
export const NativeLifecycleProgressEventSchema = z.object({
  sequence: z.number().int().nonnegative(),
  operation: NativeLifecycleOperationKindSchema,
  phase: NativeLifecycleProgressPhaseSchema,
  state: z.enum(["started", "completed", "skipped", "retained", "failed"]),
  plugin: PluginKeySchema.optional(),
  actionId: ProjectSyncActionIdSchema.optional(),
  code: NativeLifecycleStableCodeSchema.optional(),
}).strict().readonly();

export const NativeLifecycleEffectSchema = z.object({
  state: z.enum(["unchanged", "changed", "partially-changed", "unknown"]),
  projectFile: z.enum(["unchanged", "written", "unknown"]),
  completedActionIds: z.array(ProjectSyncActionIdSchema).readonly(),
  pendingActionIds: z.array(ProjectSyncActionIdSchema).readonly(),
  generation: GenerationSchema.optional(),
}).strict().readonly();

const NativeComponentCountsSchema = z.object({
  skills: z.number().int().nonnegative(),
  hooks: z.number().int().nonnegative(),
  mcpServers: z.number().int().nonnegative(),
}).strict().readonly();
const NativeUninstallCleanupViewSchema = z.object({
  persistentData: z.enum(["retained", "deleted", "recovery-required"]),
  configuration: z.literal("retained"),
  trust: z.literal("retained"),
  revisions: z.literal("collection-deferred"),
}).strict().readonly();
const NativeLifecycleResultBase = {
  operation: NativeLifecycleOperationKindSchema,
  previewId: NativeLifecyclePreviewIdSchema,
  progress: z.array(NativeLifecycleProgressEventSchema).max(128).readonly(),
  diagnostics: z.array(NativeDiagnosticSchema).readonly(),
  effects: NativeLifecycleEffectSchema,
} as const;

export const NativeLifecycleOperationResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("succeeded"), ...NativeLifecycleResultBase,
    before: NativeLifecycleTargetBindingSchema.optional(),
    after: NativeLifecycleTargetBindingSchema.optional(),
    syncDigest: ContentDigestSchema.optional(),
    components: NativeComponentCountsSchema.optional(),
    cleanup: NativeUninstallCleanupViewSchema.optional(),
  }).strict().readonly().superRefine(validateSucceededResult),
  z.object({ kind: z.literal("current-state"), ...NativeLifecycleResultBase,
    reason: z.enum(["already-enabled", "already-disabled", "revision-current",
      "already-uninstalled", "project-converged"]),
    target: NativeLifecycleTargetBindingSchema.optional(),
    syncDigest: ContentDigestSchema.optional(),
  }).strict().readonly().superRefine(validateCurrentStateResult),
  z.object({ kind: z.literal("needs-action"), ...NativeLifecycleResultBase,
    operation: z.literal("project-sync"),
    actions: z.array(ProjectSyncRequiredActionSchema).nonempty().max(512).readonly(),
  }).strict().readonly(),
  z.object({ kind: z.literal("cancelled"), ...NativeLifecycleResultBase,
    phase: NativeLifecycleProgressPhaseSchema,
  }).strict().readonly(),
  z.object({ kind: z.literal("stale"), ...NativeLifecycleResultBase,
    reason: z.enum(["session", "inspection", "target", "candidate",
      "configuration", "consent", "project", "file", "capability"]),
  }).strict().readonly(),
  z.object({ kind: z.literal("conflict"), ...NativeLifecycleResultBase,
    reason: z.enum(["operation-in-progress", "pending-transition", "target-changed",
      "state-generation-changed", "file-changed", "unresolved-merge",
      "concurrent-mutation"]),
  }).strict().readonly(),
  z.object({ kind: z.literal("rejected"), ...NativeLifecycleResultBase,
    code: NativeLifecycleStableCodeSchema,
  }).strict().readonly(),
  z.object({ kind: z.literal("rolled-back"), ...NativeLifecycleResultBase,
    operation: z.enum(["enable", "disable", "update", "uninstall"]),
    failure: z.enum(["reload-rejected", "observation-mismatch", "adapter-error"]),
    restored: NativeLifecycleTargetBindingSchema,
  }).strict().readonly(),
  z.object({ kind: z.literal("recovery-required"), ...NativeLifecycleResultBase,
    code: NativeLifecycleStableCodeSchema,
    transition: PendingTransitionRefSchema.optional(),
    committed: GenerationSchema.optional(),
    action: z.literal("run-recovery"),
  }).strict().readonly(),
  z.object({ kind: z.literal("failed"), ...NativeLifecycleResultBase,
    code: z.enum(["ADAPTER_FAILED", "PROGRESS_DELIVERY_FAILED",
      "PROJECT_INTENT_WRITE_FAILED", "CLEANUP_FAILED", "DISPOSED"]),
  }).strict().readonly(),
  z.object({ kind: z.literal("expired") }).strict().readonly(),
  z.object({ kind: z.literal("disposed") }).strict().readonly(),
]);
```

`validateSucceededResult` and `validateCurrentStateResult` are registry-derived refinements: lifecycle success requires before/after and forbids `syncDigest`; sync success requires `syncDigest` and forbids lifecycle-only fields; uninstall alone may carry cleanup; component counts appear only for exact active update/enable observation. Effects must agree with completed/pending IDs and success/current-state kind.

No preview/result/progress/status variant can contain raw `GenerationSnapshot`, installed records/revisions, canonical project/content/data/configuration roots, project file bytes or file-system identity, configuration values, `SensitiveValue`, secret locators, executable expansions, raw diagnostics, native causes, output, or callback messages.

```typescript
export interface NativeLifecycleOperationService {
  preview(request: NativeLifecycleOperationRequest, signal: AbortSignal): Promise<NativeLifecycleOperationPreviewResult>;
  apply(request: Readonly<{ token: NativeLifecycleOperationToken;
    confirmation: NativeLifecycleOperationConfirmation }>,
    options: NativeLifecycleExecutionOptions, signal: AbortSignal): Promise<NativeLifecycleOperationResult>;
  run(request: NativeLifecycleOperationRequest,
    options: NativeLifecycleRunOptions, signal: AbortSignal): Promise<NativeLifecycleOperationResult>;
  status(request: Readonly<{ token: NativeLifecycleOperationToken }>,
    signal: AbortSignal): Promise<NativeLifecycleOperationStatusResult>;
  cancel(request: Readonly<{ token: NativeLifecycleOperationToken }>,
    signal: AbortSignal): Promise<NativeLifecycleOperationCancellationResult>;
}
export type NativeLifecycleDecisionProvider = (
  preview: NativeLifecycleOperationSessionView,
  signal: AbortSignal,
) => Promise<NativeLifecycleOperationConfirmation | Readonly<{ kind: "cancelled" }>>;
export type NativeLifecycleExecutionOptions = Readonly<{
  onProgress?: (event: NativeLifecycleProgressEvent) => void | Promise<void>;
}>;
export type NativeLifecycleRunOptions = NativeLifecycleExecutionOptions & Readonly<{
  decisionProvider: NativeLifecycleDecisionProvider;
}>;
```

**Acceptance criteria**:
- [ ] Schemas reject unknown fields, wrong confirmation/operation pairings, forged/oversized tokens and IDs, impossible result/effect combinations, duplicate conflict resolutions, raw secrets/paths/native causes, and progress beyond the registry bounds.
- [ ] Preview IDs differ across host/project/capability epoch, scope, target generation/revision/activation/digest, candidate binding, file observation, sync mode, plan/actions/conflicts, and desired digest.
- [ ] Deterministic callers can use preview/apply without callbacks; one-shot run requires one explicit decision provider and has no hidden default approval.
- [ ] Every variant derives from registry/schema inference and serializable output passes structural path/secret/native-cause canary scans.

### Unit 2: Exact installed targets and prepared update candidate/lifecycle bridge

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-exact-target-update-preparation`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers`

**Files**:
- `src/application/prepared-lifecycle-candidate.ts` (rename/generalize trusted-install candidate implementation)
- `src/application/prepared-lifecycle-candidate-identifiers.ts`
- `src/application/native-lifecycle-target.ts`
- `src/application/native-lifecycle-update.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-candidate-preparation.ts`
- `src/application/trusted-install-candidate.ts` (source-compatible re-export or removal after callers move)
- `src/application/trusted-install-contract.ts`
- `src/application/trusted-install-lifecycle.ts`
- `test/application/native-lifecycle-target.test.ts`
- `test/application/native-lifecycle-update.test.ts`
- `test/application/plugin-lifecycle-service.test.ts`
- `test/integration/plugin-lifecycle.test.ts`

```typescript
export const LifecycleTargetExpectationSchema = z.object({
  generation: GenerationSchema,
  plugin: PluginKeySchema,
  selectedRevision: ContentDigestSchema,
  activation: z.enum(["enabled", "disabled"]),
  targetDigest: ContentDigestSchema,
  pendingTransition: z.literal("none"),
}).strict().readonly();

export interface PreparedLifecycleAuthority {
  installPrepared(request: PreparedLifecycleMutationRequest & Readonly<{
    operation: "install";
  }>, signal: AbortSignal): Promise<PluginLifecycleResult>;
  updatePrepared(request: PreparedLifecycleMutationRequest & Readonly<{
    operation: "update";
    expectedTarget: LifecycleTargetExpectation;
  }>, signal: AbortSignal): Promise<PluginLifecycleResult>;
}
```

`PluginLifecycleService` request types gain optional `expectedTarget` for source compatibility; the packaged facade always supplies it. Lifecycle verifies exact target immediately after read and again in the existing guarded commit callback. A generation-only change may rebase only if `targetDigest`, selected revision, activation, and no-pending evidence still match. Update candidate lease/binding is verified before promotion and then enters the same `execute("update")` path.

`PreparedLifecycleCandidateBindingSchema` is the semantic generalization of `TrustedInstallCandidateBindingSchema`; trusted-install names remain aliases during migration. `PreparedLifecycleCandidateService` retains the existing exact catalog resolution, one lease, complete inspection, compatibility report, revision, trust candidate, configuration fields, consent disclosure, safe detail, capability/project binding, and revalidation. Update additionally proves:

```typescript
export const PreparedUpdateBindingSchema = z.object({
  target: NativeLifecycleTargetBindingSchema,
  candidate: PreparedLifecycleCandidateBindingSchema,
  updateCandidate: UpdateCandidateKeySchema,
  installedSourceIdentity: StableSourceIdentitySchema,
  candidateMarketplaceSourceIdentity: SourceHashSchema,
  candidatePluginSourceIdentity: SourceHashSchema,
}).strict().readonly();
```

**Acceptance criteria**:
- [ ] Installed target resolution accepts only an installed detail from the exact inspection snapshot and returns stale/blocked for changed scope, generation, revision, activation, pending transition, project/capability epoch, or target digest.
- [ ] Update candidate resolution requires exact scope/registration/candidate/catalog snapshot/plugin, one materialization, and derived revision/source/update-key equality; no latest/name/notification-text fallback exists.
- [ ] Prepared update performs no second materializer call and executes the unchanged lifecycle promotion/pending/reload/observation/reconciliation path.
- [ ] Initial/previous active revision remains selected on candidate preparation, trust/configuration, promotion, reload, and observation failure; verified rollback/recovery maps unchanged.
- [ ] Trusted installation remains behavior/source compatible through aliases and uses the same generalized candidate/prepared authority rather than a fork.

### Unit 3: Whole-plugin enable, disable, update, and lifecycle result projection

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-exact-target-update-preparation`

**Files**:
- `src/application/native-lifecycle-operation.ts`
- `src/application/native-lifecycle-update.ts`
- `src/application/native-lifecycle-result.ts`
- `src/application/native-lifecycle-progress.ts`
- `src/application/trusted-install-configuration.ts`
- `src/application/exact-trust-grant-service.ts`
- `test/application/native-lifecycle-operation.test.ts`
- `test/application/native-lifecycle-update.test.ts`
- `test/application/native-lifecycle-result.test.ts`

`executeNativeLifecycleOperation` accepts only an internally verified preview context. Enable/disable call public lifecycle with exact target expectations. Update validates all input first, writes/reconciles candidate-revision configuration through existing custody, grants/reconciles exact consent through existing trust state, rereads those exact revisions plus target/candidate/project authority, transfers the lease to `updatePrepared`, and losslessly projects the lifecycle result.

**Acceptance criteria**:
- [ ] Exact enabled/disabled/current-update states return `current-state` without reload or writes; wrong operation/current state cannot be represented as success.
- [ ] Enable/update revalidate current project trust/root, exact plugin trust, configuration, target, candidate, and capability before lifecycle; disable does not invent trust/configuration requirements.
- [ ] Update missing inputs are complete/sorted/mutation-free; sensitive values remain callback-scoped to existing custody and are absent from sessions/progress/results.
- [ ] `changed` succeeds only with exact complete active/inactive observation; `unchanged`, rejected, stale, rolled-back, and recovery-required lifecycle results map without raw snapshots or cause leakage.
- [ ] Abort/progress callback/concurrent same-token calls obey declared precedence and never convert committed/recovery evidence into cancellation.

### Unit 4: Uninstall retention, persistent-data cleanup, and startup retry

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration`

**Files**:
- `src/application/native-uninstall-cleanup.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/ports/lifecycle-transition-store.ts`
- `src/application/recovery-contract.ts`
- `src/application/recovery-service.ts`
- `src/infrastructure/recovery/sqlite-transition-journal.ts`
- `test/application/native-uninstall-cleanup.test.ts`
- `test/application/recovery-service.test.ts`
- `test/infrastructure/recovery/sqlite-transition-journal.test.ts`
- `test/integration/lifecycle-recovery.test.ts`

Transition journal v2 adds strict cleanup status derived from uninstall operation plus retained-data intent: `not-required | pending-data-delete | completed | recovery-required`. V1 migrates deterministically: non-uninstall/keep is not required; completed uninstall with `delete-confirmed` is pending and safe to retry because `PersistentDataRemovalPort.remove` is idempotent. The transition's verified previous revision supplies the exact scope/plugin/data ref; no caller/path is trusted.

Configuration and exact trust are always reported `retained`; revision content is `collection-deferred`. Persistent data is either `retained`, `deleted`, or `recovery-required`. Startup `LifecycleRecoveryService` resumes terminal uninstall cleanup after transition settlement, then marks cleanup complete. It does not block unrelated plugins.

**Acceptance criteria**:
- [ ] Uninstall first proves exact inactive complete projection and absent installed record through lifecycle; cleanup cannot make a failed activation removal look successful.
- [ ] `keep` never calls persistent removal. `delete-confirmed` calls it only after exact uninstall commit and retries safely after crash/lost response until `removed|already-absent` is observed.
- [ ] Configuration/trust remain inert, exact, and retained; immutable revisions are never deleted inline and respect existing leases/grace collection.
- [ ] Cleanup failure after uninstall returns recovery-required with changed-state evidence; retry/startup does not reinstall or replay uninstall.
- [ ] Pending transition, abort, rollback, process crash at every settle/cleanup marker, corrupt journal, and unrelated-plugin continuation are covered.

### Unit 5: Project-intent codec and verified `.pi/plugins.json` file authority

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-project-intent-file-authority`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers`

**Files**:
- `src/application/ports/project-intent-file.ts`
- `src/application/ports/project-intent-write-id.ts`
- `src/application/project-intent-codec.ts`
- `src/infrastructure/project/node-project-path-authority.ts`
- `src/infrastructure/project/node-project-intent-file.ts`
- `src/infrastructure/configuration/node-configuration-path.ts`
- `src/infrastructure/node/node-identifiers.ts`
- `test/application/project-intent-codec.test.ts`
- `test/infrastructure/project/node-project-intent-file.test.ts`
- `test/infrastructure/configuration/node-configuration-path.test.ts`

```typescript
declare const projectIntentObservationBrand: unique symbol;
export type VerifiedProjectIntentObservation = Readonly<{
  readonly [projectIntentObservationBrand]: true;
  readonly publicId: ProjectIntentObservationId;
}>;

export type ProjectIntentReadResult =
  | Readonly<{ kind: "missing"; observation: VerifiedProjectIntentObservation }>
  | Readonly<{ kind: "found"; observation: VerifiedProjectIntentObservation;
      declaration: PortableProjectDeclaration; digest: ContentDigest }>
  | Readonly<{ kind: "unavailable"; code: "PROJECT_UNTRUSTED" |
      "PROJECT_ROOT_STALE" | "FILE_UNSAFE" | "FILE_TOO_LARGE" |
      "FILE_INVALID_UTF8" | "FILE_INVALID" | "ADAPTER_FAILED" }>;

export type ProjectIntentReplaceResult =
  | Readonly<{ kind: "written" | "unchanged";
      observation: VerifiedProjectIntentObservation; digest: ContentDigest }>
  | Readonly<{ kind: "stale" }>
  | Readonly<{ kind: "ambiguous"; expectedDigest: ContentDigest }>;

export interface ProjectIntentFilePort {
  read(root: TrustedProjectRoot, signal: AbortSignal): Promise<ProjectIntentReadResult>;
  replace(request: Readonly<{
    root: TrustedProjectRoot;
    expected: VerifiedProjectIntentObservation;
    declaration: PortableProjectDeclaration;
    writeId: ProjectIntentWriteId;
  }>, signal: AbortSignal): Promise<ProjectIntentReplaceResult>;
  cleanup(signal: AbortSignal): Promise<void>;
}
```

`project-intent-codec.ts` uses `parsePortableProjectDeclaration`, `decodeStateDocument("portableProject")`, `encodeStateDocument("portableProject")`, and `hashStateDocument`; it adds only feature-owned byte/declaration-count limits and canonical newline serialization. `node-project-path-authority.ts` extracts the current configuration adapter's project-root revalidation/no-symlink containment mechanics so configuration and portable-file writes have one implementation. The new write ID has its own schema/port but comes from the existing composed cryptographic identifier factory; config-write IDs are not semantically reused as filenames.

**Acceptance criteria**:
- [ ] The only reachable target is exact current-root `.pi/plugins.json`; no public method accepts a path, bytes, root string, user scope, or foreign-home location.
- [ ] Missing/found reads bind parent and leaf identity plus canonical digest; symlink parent/leaf, nonregular file, escape, growth/replacement, invalid UTF-8/JSON/schema, oversize, and root/project change fail closed.
- [ ] Replace is exact compare-and-replace with exclusive sibling temp, bounded canonical bytes, fsync, same-directory atomic rename, reread/reconciliation, and cleanup; stale identity never overwrites.
- [ ] Output is deterministic across input ordering and contains no machine path, trust/configuration/secret/revision/cache/runtime/state field.
- [ ] Shared path hardening preserves all existing configuration path behavior and tests.

### Unit 6: Pure project projection, diff, merge, conflict, and action planner

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-project-sync-diff-merge-planner`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers`, `epic-native-plugin-management-lifecycle-sync-operations-project-intent-file-authority`

**Files**:
- `src/application/project-sync-projection.ts`
- `src/application/project-sync-planner.ts`
- `src/application/project-sync-identifiers.ts`
- `test/application/project-sync-projection.test.ts`
- `test/application/project-sync-planner.test.ts`

The pure planner receives a verified current-project snapshot, exact portable file observation, local registration/catalog/readiness projections, and mode. It never reads files/state, probes runtimes, contacts sources, or mutates. Unsigned UTF-8 ordering is fixed for marketplaces, plugins, conflicts, required actions, and executable actions.

`apply-intent` plans file-to-project enable/disable/uninstall/remove plus required prerequisites. `publish-intent` plans one canonical file write and baseline record. `merge` unions and emits exact conflicts; after complete confirmation resolutions, it derives one desired declaration and the same executable diff. The planner rejects dangling plugin marketplaces and revalidates the strict portable schema after every resolution.

**Acceptance criteria**:
- [ ] Permuting state/file/registration/observation order yields byte-identical machine/file/desired/plan/action/conflict digests and ordering.
- [ ] Same plugin/marketplace across user/project remains project-qualified; user records never satisfy or alter project intent.
- [ ] Missing registration/plugin, constraint mismatch, missing trust/config, or pending transition produces a required action and prevents executable admission; no install/update/refresh/add is planned.
- [ ] Apply/publish/merge additions, removals, enablement, source conflicts, constraint conflicts, unsynchronized sentinel, missing file, and stale baseline follow declared semantics.
- [ ] Existing matching constraints and adopted-origin registrations are preserved; machine-only new plugins publish unconstrained; config/trust/origin/paths never enter intent.

### Unit 7: Project-sync application, file/state CAS, lifecycle sequencing, and retry evidence

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-project-sync-application`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration`, `epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery`, `epic-native-plugin-management-lifecycle-sync-operations-project-sync-diff-merge-planner`

**Files**:
- `src/application/project-sync-service.ts`
- `src/application/project-sync-state.ts`
- `src/application/native-lifecycle-result.ts`
- `test/application/project-sync-service.test.ts`
- `test/integration/project-sync-retry.test.ts`

```typescript
export interface ProjectSyncService {
  preview(request: Readonly<{ mode: ProjectSyncMode; projectKey: ProjectKey }>,
    signal: AbortSignal): Promise<ProjectSyncPreviewResult>;
  apply(request: Readonly<{ context: VerifiedProjectSyncContext;
    resolutions: readonly ProjectSyncConflictResolution[] }>,
    progress: NativeLifecycleProgressSink, signal: AbortSignal): Promise<NativeLifecycleOperationResult>;
}
```

Before any effect, apply revalidates project root/trust/epoch, exact project generation, file observation, plan ID, and resolutions. Known required actions cause `needs-action` with zero writes. Publish/merge writes desired intent first with file CAS. Existing exact lifecycle methods execute project-only actions; marketplace removal uses the existing registration service after dependent uninstalls. Finalization rereads file/state/activation/constraints and commits only `declarationDigest` through `createProjectLocalStateDocumentV3`, `parseStateMutation`, and `GenerationMutationCoordinator`.

**Acceptance criteria**:
- [ ] Sync never calls source materializer, marketplace add/refresh, trusted install, prepared update, trust grant, configuration save, foreign adoption/files, scheduler, or network adapter; spies enforce zero calls.
- [ ] File/project changes before apply return stale/conflict with zero effects; changes after committed actions are reported with exact partial effects and an old baseline.
- [ ] Each enable/disable/uninstall uses complete lifecycle/reload/recovery and exact target expectations; no direct project record edits impersonate runtime activation.
- [ ] Publish crash after file write/before digest commit retries as digest-only convergence; merge/apply crash/cancel after any action retries idempotently without reverse replay.
- [ ] Final declaration digest advances only when exact file intent, registrations, installed constraints, and activation intents converge; otherwise it remains old.

### Unit 8: Transient operation sessions, facade orchestration, cancellation, and disposal

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-session-facade-admission-disposal`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration`, `epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery`, `epic-native-plugin-management-lifecycle-sync-operations-project-sync-application`

**Files**:
- `src/application/native-lifecycle-operation-session.ts`
- `src/application/native-lifecycle-operation-service.ts`
- `test/application/native-lifecycle-operation-session.test.ts`
- `test/application/native-lifecycle-operation-service.test.ts`

`preview` captures inspection/project evidence and produces one session. `apply` compare-and-sets `previewed → applying`, validates exact confirmation/version, revalidates all authority, executes exactly one internal operation, stores only the safe terminal result, and releases leases/observations. `run` is preview + explicit decision provider + the same apply path. Entry-time deterministic reaping enforces idle/absolute/terminal limits without a timer.

**Acceptance criteria**:
- [ ] Preview/apply and one-shot run return equivalent results/progress for equivalent evidence; no alternate fast path exists.
- [ ] Wrong token/version/preview/operation/consent/resolution is stale/conflict before mutation; concurrent apply has one owner.
- [ ] Update lease transfers once or releases on deny/expiry/failure/disposal; sync file observations cannot be replayed after host/project/file change.
- [ ] Progress is bounded/monotonic/observer-independent; no sensitive input or native callback error is retained.
- [ ] Quiesce rejects new previews/applies/tokens but does not abort an admitted reload; close is idempotent and releases all remaining resources after operation drain.

### Unit 9: Packaged composition and one management mutation surface

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-packaged-composition`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-session-facade-admission-disposal`

**Files**:
- `src/composition/create-native-lifecycle-operation-service.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/composition/create-trusted-installation-service.ts`
- `src/infrastructure/recovery/create-node-recovery-adapters.ts`
- `src/index.ts`
- `src/pi/index.ts`
- `test/composition/create-native-lifecycle-operation-service.test.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/integration/packaged-host-disposal.test.ts`
- `test/tooling/boundaries.test.ts`

```typescript
export type PackagedPluginHostApplication = Readonly<{
  trustedInstallation: TrustedInstallationService;
  operations: NativeLifecycleOperationService;
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

Composition shares one inspection evidence/readiness capture, candidate lease port, candidate service, lifecycle composition, exact trust/configuration authority, state/coordinator/locks, project root/trust, registration service, transition cleanup, identifier authority, and project file adapter. Raw lifecycle/prepared candidate/state/file/config/trust roots remain private. `application.lifecycle` is removed from the packaged surface so later presentations cannot bypass operation contracts.

**Acceptance criteria**:
- [ ] Packaged callers perform all ongoing plugin mutations through `application.operations`; trusted install remains its signed-off three-step service and raw lifecycle is private.
- [ ] Construction/startup performs no project-file read/write, candidate acquisition, sync, recovery replay beyond existing startup, network, scheduler, or operation session creation.
- [ ] Every later operation call requires `runWithPiOperationContext`; reload predecessor admission and reverse cleanup remain exact.
- [ ] Partial startup/reload successor/repeated close/active operation/expired preview/cleanup failure preserve existing aggregate disposal semantics.
- [ ] Dependency boundaries keep domain/application independent of Node/Pi and keep filesystem identity/write mechanics inside infrastructure.

### Unit 10: Integrated lifecycle, sync, concurrency, security, and package acceptance

**Story**: `epic-native-plugin-management-lifecycle-sync-operations-integrated-acceptance`
**Depends on**: `epic-native-plugin-management-lifecycle-sync-operations-packaged-composition`

**Files**:
- `test/integration/native-lifecycle-operations-clean-environment.test.ts`
- `test/integration/native-lifecycle-operations-concurrency.test.ts`
- `test/integration/native-lifecycle-operations-recovery.test.ts`
- `test/integration/project-sync-clean-environment.test.ts`
- `test/integration/project-sync-concurrency.test.ts`
- `test/integration/project-sync-security.test.ts`
- `test/fixtures/native-operations/manager-actions.ts`
- `test/fixtures/project-sync/`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

**Acceptance criteria**:
- [ ] A packed clean host with no Claude/Codex installation enables, disables, updates, uninstalls, reloads, and independently observes complete skill/hook/MCP fixture projections through the operation facade.
- [ ] Same-operation/session/process races, unrelated generation rebase, target mutation, pending transition, rollback, lost commit response, cleanup crash, and restart recovery produce exact current/conflict/rolled-back/recovery results.
- [ ] Trusted manual update binds one inspected revision, remains offline after acquisition, preserves prior active revision on every failure, and leaks no config/trust/executable/native evidence.
- [ ] Apply/publish/merge sync covers missing/existing file, baseline sentinel, file/state races, conflict resolutions, user/project collisions, adoption-origin preservation, constraints, enable/disable/uninstall/removal, crash/retry, and digest finalization.
- [ ] Network/materializer/refresh/install/update/trust/config/foreign-state spies prove sync has no hidden prerequisite mutation; required actions are complete and deterministic.
- [ ] Symlink/no-follow/root replacement/file growth/invalid UTF-8/schema/oversize/temp collision/fsync/rename/lost-response cases fail closed without corrupting file/state.
- [ ] Full `npm test` covers strict typecheck, dependency boundaries, focused unit/integration/process tests, build, exact exports, and packed Pi startup/disposal.

## Implementation order and child-story DAG

1. `epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers`
2. In parallel after contracts:
   - `epic-native-plugin-management-lifecycle-sync-operations-exact-target-update-preparation`
   - `epic-native-plugin-management-lifecycle-sync-operations-project-intent-file-authority`
3. In parallel:
   - `epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration` (after exact target/update preparation)
   - `epic-native-plugin-management-lifecycle-sync-operations-project-sync-diff-merge-planner` (after contracts + file authority)
4. `epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery`
5. `epic-native-plugin-management-lifecycle-sync-operations-project-sync-application`
6. `epic-native-plugin-management-lifecycle-sync-operations-session-facade-admission-disposal`
7. `epic-native-plugin-management-lifecycle-sync-operations-packaged-composition`
8. `epic-native-plugin-management-lifecycle-sync-operations-integrated-acceptance`

The feature remains one cohesive implementation/review bundle. Stories are durable design and verification checkpoints, not one worker per story.

## Operation and synchronization invariants

1. Every installed operation binds one exact `{scope, plugin, state generation, selected revision, activation, target digest, inspection snapshot, project/capability epoch, no pending transition}` tuple.
2. Every update additionally binds one exact `{registration, candidate, catalog snapshot, immutable revision, source/content/report/config/trust/executable/capability digest, update candidate key}` tuple and one leased materialization.
3. Display names, aliases, current list order, notification text, declared version alone, and “latest” never select mutation authority.
4. Lifecycle state, scheduler/scope lock, transition journal, reload observation, and recovery remain the sole whole-plugin mutation engine. The facade projects them; it does not duplicate them.
5. Success requires exact complete observation. Progress, callback return, candidate promotion, trust/configuration persistence, file rename acceptance, or state commit alone is insufficient.
6. A pending transition blocks new work. Recovery is explicit and never hidden inside enable/disable/update/uninstall/sync.
7. Update leaves the prior active revision selected until exact candidate activation; failure compensates or requires recovery through existing authority.
8. Uninstall requested data deletion is durable transition cleanup. Configuration/trust remain retained; revisions obey existing leases/grace collection.
9. `.pi/plugins.json` is strict portable intent, never machine authority, trust, config, secret, path, revision, cache, runtime status, or foreign state.
10. File read/write uses exact current project root/trust and no-follow identity. A changed project/file/plan is stale, never silently merged at apply time.
11. Sync changes project scope only. User scope never satisfies, shadows, or receives project intent.
12. Sync is local/offline and never installs, updates, registers/acquires, refreshes, grants trust, collects configuration, or reads foreign state. Missing prerequisites are required actions.
13. `declarationDigest` advances only after exact convergence. Old digest plus partial exact effects is retry evidence, not corruption.
14. Merge is union plus explicit conflict resolution. Deletion requires directional apply/publish or an explicit `omit` resolution.
15. Cancellation never erases committed evidence. Per-plugin lifecycle compensation wins after ambiguity; sync reports completed/pending actions.
16. Public data is schema-safe. Raw state/file identities/bytes, roots, values, locators, native causes/messages/output, and executable expansions are structurally absent.
17. Sessions add no durable operation/status/event/source/file cache. Host restart/reload invalidates tokens; durable authorities alone survive.
18. Later command/TUI adapters cannot bypass the facade through packaged raw lifecycle exposure.

## Failure and result matrix

| Condition | Result | Durable effect / retry rule |
|---|---|---|
| Exact enable/disable already satisfied | `current-state` | No write/reload |
| Update candidate equals selected revision | `current-state` | Lease released; no config/trust write |
| Inspection/target/candidate/project/capability changed | `stale` | No mutation; re-preview |
| Pending transition before/after preview | preview blocked or `recovery-required`/conflict | No stacked operation; run explicit recovery |
| Missing update input/consent | preview `needs-input` or rejected confirmation | No mutation; session retained |
| Update config/trust persisted, lifecycle later fails | lifecycle result + retained preflight | Safe inert evidence may be reused after exact reread |
| Lifecycle target changes while waiting | `conflict: target-changed`/stale | No hidden retry against another revision |
| Reload/observation failure, prior state proven | `rolled-back` | Prior complete projection remains active |
| Commit/transition/cleanup ambiguity | `recovery-required` + transition/generation/effects | Startup/explicit recovery owns settlement |
| Uninstall keep data | `succeeded`, data `retained` | Config/trust retained; revisions deferred to GC |
| Uninstall delete data succeeds/already absent | `succeeded`, data `deleted` | Cleanup journal terminal |
| Crash/failure after uninstall before data delete | `recovery-required` or startup retry | Installed state remains absent; deletion resumes only |
| Sync missing/untrusted/unconfigured/wrong revision | `needs-action` | Zero sync mutation/network; complete actions then re-preview |
| Apply-intent missing file | rejected `PROJECT_INTENT_MISSING` | No state mutation |
| Publish missing file | ready create plan | Exact safe `.pi` parent/create/write |
| File/root/state changes before first effect | stale/conflict | Zero effects |
| Publish file written, digest commit lost | reconciled success or recovery-required | Reread file/state; never blind rewrite |
| Merge file written, later lifecycle fails | failed/conflict/recovery with partial effects | Desired file remains; baseline old; retry converges |
| Sync cancelled after prior actions | `cancelled` with `partially-changed` effects | Baseline old; retry recomputes |
| Same-token concurrent apply | one owner; other conflict | One candidate/file observation owner |
| Progress callback throws | operation continues; safe delivery code | Native callback text absent |
| Shutdown during admitted reload | lifecycle evidence wins; cleanup after drain | No new operations admitted |
| Expired/disposed preview | `expired`/`disposed` | Candidate lease/temp evidence released; no latest fallback |

## Simplification

- Generalize trusted-install candidate/prepared lifecycle seams instead of creating update-specific inspection, materialization, trust, configuration, promotion, or transaction code.
- Replace packaged raw lifecycle exposure with one operation facade; do not add a facade beside an equally privileged command/TUI bypass.
- Reuse native inspection schemas, safe display/disclosure, diagnostic registry/actions, and result redaction rather than inventing presentation strings.
- Reuse state codecs, `parseStateMutation`, generation coordinator, scheduler/scope lock, transition journal, complete reload/recovery, persistent-data removal, and project root/trust.
- Extract one project no-symlink path authority shared by configuration and project-intent file adapters; do not copy traversal logic.
- Add one fixed project-intent file port, not a generic filesystem/editor/config framework.
- Use `declarationDigest` and exact action results as retry evidence; add no durable sync session, batch journal, rollback log, event bus, timer, watcher, or background daemon.
- Keep marketplace add/refresh, install of missing plugins, update scheduler/policy, automatic update, adoption reads/import, command grammar, and TUI rendering outside this feature.
- Retire lifecycle tests that only assert permissive calls without target expectation after exact facade/lifecycle seam tests replace their value; preserve owning transaction/recovery matrices.

## Testing

- **Contract/identifier tests** protect strict generated variants, confirmation pairing, host/scope/revision/candidate/file/plan binding, stale session versions, effect truthfulness, and structural redaction.
- **Target/update seam tests** protect exact inspection authority, one candidate acquisition/transfer, source/revision/update-key binding, unrelated-generation rebase, changed-target rejection, configuration/trust reread, and one lifecycle executor.
- **Lifecycle facade tests** protect current-state, enable/disable/update outcome mapping, complete observation, cancellation precedence, progress observer isolation, and no raw snapshot/cause leakage.
- **Uninstall/recovery tests** protect inactive observation, installed absence, retain/delete confirmation, config/trust retention, lease/grace revision handling, cleanup crash/retry, journal migration, and unrelated-plugin startup.
- **Project file adapter tests** protect fixed path, root/project trust, no-follow identity, bounds/UTF-8/schema/canonical bytes, exclusive temp, fsync/rename/reconcile, stale compare, cleanup, and no path leakage.
- **Planner tests** protect deterministic apply/publish/merge, union/conflicts/resolutions, user/project separation, constraints, baseline sentinel, required actions, action order, and no prohibited portable fields.
- **Sync application tests** protect zero hidden network/acquisition/trust/config/adoption calls, exact file/state revalidation, lifecycle-only activation changes, partial effects, cancellation, crash/retry, and final digest convergence.
- **Composition/disposal tests** protect private wiring, operation-context admission, raw lifecycle removal, reload predecessor drain, host-token invalidation, reverse cleanup, and partial startup.
- **Integrated tests** protect clean packaged operation, multi-process target/file/state races, pending/recovery/rollback, hostile inputs, update/offline-after-acquisition, sync/no-network, and exact manager-data fixtures.
- Do not duplicate foreign reader/materializer hardening, compatibility evaluator, configuration/secret-store conformance, lifecycle transition crash matrix, runtime participant conformance, marketplace refresh, or adoption parsing. Add one seam case per consumed contract plus feature-owned binding/orchestration/security cases.

## Risks

- **Riskiest assumption — exact file compare-and-replace is sufficient beside external editors**: no portable OS primitive makes arbitrary editors participate in our CAS. Mitigation: no-follow identity/digest checks immediately before same-directory rename, process-local/scope operation serialization, fsync, post-read reconciliation, and stale/ambiguous outcomes. Same-user malicious nanosecond replacement remains outside the project review bar; ordinary concurrent saves are covered. Fallback: disable publish/merge on platforms that cannot prove required semantics.
- **Sync can partially converge across plugins**: a real cross-plugin/runtime/file transaction is unavailable. Mitigation: block known prerequisites before mutation, deterministic idempotent order, per-plugin lifecycle rollback/recovery, exact effects, and baseline advancement only at convergence. Reverse replay would be less safe.
- **Generalizing trusted-install candidate code could fork or regress install**: mitigation is aliases, one implementation, and cross-feature contract tests. Fallback: retain source-compatible wrappers but never copy acquisition/inspection logic.
- **Update configuration is revision-bound**: existing secrets cannot be silently copied to a new locator/ref without plaintext custody. Mitigation: explicit update fields and existing `SensitiveValue` custody; safe preflight remains inert. Fallback: needs-input, never reuse a mismatched configuration document.
- **Uninstall data cleanup occurs after installed authority removal**: a crash loses ordinary target lookup. Mitigation: verified previous state and delete intent stay in the existing transition journal until cleanup completes. Fallback: recovery-required; never derive a path from plugin text.
- **Packaged raw lifecycle removal may affect internal consumers**: mitigation is keep root-library factories/types and move automatic policy/trusted install to private composition dependencies. Packaged callers intentionally migrate to `operations`.
- **Merge without a stored base document cannot infer deletions**: only the base digest exists. Mitigation: deterministic union and explicit conflicts; directional apply/publish handles deletion. Storing historical portable bytes would add a second state copy and is rejected.
- **Long sync action sets can monopolize interaction**: bounded 512 declarations/actions, cancellation between actions, no network, and progress remain adequate. Fallback: reject oversize intent rather than add parallelism or a scheduler.

## Pre-mortem

This design fails if update resolves a moved/latest source under old consent, a presentation bypasses expected target state, a pending transition is stacked, prior active content disappears on failed update, uninstall claims cleanup while data remains, project sync touches user state or foreign files, sync performs hidden network/install/trust/config writes, an editor change is overwritten after preview, merge silently chooses a side, cancellation hides committed actions, the declaration digest advances before convergence, or shutdown destroys an admitted reload.

The countermeasures are exact inspection/candidate/target/preview bindings, one prepared lifecycle executor, pending-state admission, existing compensation/recovery, durable uninstall cleanup intent, project-only local/offline planner, fixed no-follow file CAS, explicit conflict resolutions, effect-bearing results, final convergence reread, and operation-drain-aware disposal. Whenever evidence cannot be proven current, the correct result is current-state, needs-input/action, stale, conflict, rejected, cancelled-with-effects, rolled-back, recovery-required, or failed—never guessed success.

## Implementation summary

All ten child stories were implemented in declared dependency order by one cohesive xhigh owner. The implementation adds strict safe contracts/opaque identifiers; exact installed targets and trusted prepared update leases; fixed no-follow project intent CAS; lifecycle orchestration with rollback/recovery truth; a deterministic offline project-sync planner and executor; journal-v2 uninstall cleanup; transient operation sessions with duplicate/cancel/disposal admission; and private packaged composition exposing `application.operations` instead of raw lifecycle.

The feature deliberately reuses native inspection evidence, the candidate lease/materializer seam, exact trust/configuration authorities, generation coordination and scope locks, the lifecycle transition/reload/recovery engine, project root/trust, registration mutation, and persistent-data removal. It adds no second transaction/state engine, network-capable sync path, command, TUI, scheduler, watcher, durable operation session, or generic filesystem surface.

## Integrated verification

- Full `npm test`: 259 test files / 1,265 tests passed; no type errors.
- Dependency boundaries: 337 modules / 2,403 dependencies, no violations.
- Package acceptance: exact root allowlist 711 exports; exact Pi allowlist 3 exports; isolated packed Pi startup passed.
- Feature-owned tests cover stale targets/candidates/capabilities, update lease ownership/races, disable/uninstall rollback, cleanup crash/restart/migration, hostile values and progress observers, symlink/replacement/CAS behavior, deterministic three-way conflict resolution, offline missing prerequisites, partial sync retry, duplicate apply/cancellation, session expiry/disposal, packaged context admission, and raw lifecycle removal.

## Execution record

Execution capability: one xhigh feature owner, selected because the ten stories share lifecycle transaction, target binding, project authority, session, recovery, and packaged-composition state. No delegated worker or nested agent was used. Implementation commits: `afaa479`, `e0102ce`, `20c2453`, `ee9cd13`, `727de2e`, `f2f8473`, `6b59af2`, `6524270`, `453140e`, `3d1f188`.

## Trusted-install rebase integration

- Rebased all eleven feature/workflow commits onto trusted-install review head `403d7eb`; the feature remains `stage: review` and every child remains `stage: done`.
- Conflict resolution kept the shared prepared candidate/update target authority while retaining trusted install's exact configuration revision on install and enable, commit/pre-reload/post-observation guards, typed candidate cleanup failures, and opaque cleanup recovery.
- The auto-merge audit removed stale pre-review assumptions: manual update now transfers its exact configuration revision into the shared prepared lifecycle executor, `CONFIGURATION_STALE` projects as configuration staleness, candidate/configuration recovery capabilities remain owned and retried by operation composition, and cancellation is reported only before a durable phase starts.
- Native lifecycle composition now consumes the prepared-candidate aliases over the finalized trusted-install implementation rather than introducing another acquisition/materialization path.
- Focused trusted-install, lifecycle-sync, configuration/lifecycle/recovery, project-file, and security verification: 47 files / 205 tests passed.
- Full `npm test`: 260 files / 1,287 tests passed; typecheck green; dependency boundaries green (337 modules / 2,412 dependencies); package imports green (711 root exports / 3 Pi exports); isolated packed Pi startup passed.

## Review (2026-07-17)

**Verdict**: Approve after receiver fixes and verification. Per caller instruction, the completed standard-weight sole review was not repeated.

**Blockers**: Two critical and five high findings were accepted and fixed:

1. Project lifecycle mutation, transition completion, rollback, and startup recovery rebuilt project state through V2 and could discard V3 registration origin/source evidence.
2. Project sync could execute multiple lifecycle reload actions even though one packaged Pi operation frame carries one consumable reload authority.
3. Sync plans did not explicitly bind exact trust/configuration/capability readiness through both the first-effect and declaration-digest commit boundaries.
4. Direct update confirmation did not echo the exact configuration revision and trust fingerprint, and later failures could lose safe retained-preflight evidence.
5. Project intent replacement used inspect-then-rename, which is not a filesystem compare-and-swap and could overwrite an editor save.
6. Cancellation bypassed the operation facade's owned release path and swallowed candidate cleanup failure/retry authority.
7. Acceptance evidence did not integrate the V3 state, real lifecycle/reconciler/recovery, reload broker, sync executor, and Node project-file adapter deeply enough.

**Fixes**:

- All project plugin mutations now use `createProjectLocalStateDocumentV3`; exact `declarationDigest` and byte-equivalent native/adopted `marketplaceUpdates` survive lifecycle success, rollback, transition reconciliation, and real-journal startup recovery.
- Sync now treats a changed lifecycle action as the one reload horizon for that admitted operation. It returns exact partial effects plus `repreview-sync`, leaves the baseline old, and converges by deterministic re-preview. Active removal plans one uninstall rather than disable plus uninstall; two-plugin plans were verified across successive real plans without a second broker reload in one call.
- Plans carry current and convergence readiness digests derived from capability, project trust, exact plugin trust fingerprints, exact configuration revisions/absence, and readiness state. Apply revalidates before its first effect, after re-preview following a lifecycle action, and twice at finalization with the last read immediately adjacent to declaration CAS. Readiness loss produces zero/partial truthful effects and explicit required actions; the old baseline remains.
- Update previews and confirmations bind an exact nullable configuration revision and opaque trust fingerprint, and preview IDs include that authority. Exact rereads precede writes/lifecycle transfer. Terminal results retain only safe booleans plus configuration revision/trust fingerprint—never values, locators, roots, commands, or native causes.
- The Node project-file adapter no longer renames over an existing leaf. Existing-file changes return `PROJECT_INTENT_WRITE_UNAVAILABLE`. Missing-file publication capability-probes and uses same-filesystem hard-link create-if-absent, binds a newly created parent identity, fsyncs, rereads, and reports stale/ambiguous without overwriting editor bytes. Ordinary and paused editor races were exercised against the real adapter.
- Cancellation now calls `releaseEntry`; cleanup failure becomes terminal `CLEANUP_FAILED`, retains opaque retry ownership, and is retried by `status` and `close` without abandoning staging.
- Integrated evidence now runs actual V3 lifecycle success/rollback, real reload-broker tickets, project sync re-preview convergence, real SQLite transition-journal recovery, and the Node project-file adapter. Sync composition remains local/offline and has no source materializer, refresh, install, update, trust-grant, configuration-save, or foreign-state dependency.

**Objective capability-unavailable behavior**: Node provides a genuine conditional create primitive through same-filesystem hard links, so missing `.pi/plugins.json` can be safely published. Node exposes no conditional replacement primitive for an existing leaf; publish/merge that would change an existing file now fail closed with `PROJECT_INTENT_WRITE_UNAVAILABLE`. Apply-intent and unchanged-file convergence remain available.

**Important parked follow-ups**:

- `idea-tighten-native-lifecycle-operation-result-unions`
- `idea-stabilize-project-sync-conflict-resolution-order`
- `idea-refine-native-lifecycle-progress-outcomes`

**Commits**:

- `f588108` — parked native lifecycle result-union tightening.
- `bdea2c4` — parked conflict-resolution order stabilization.
- `cdad293` — parked native lifecycle progress outcome refinement.
- `534ae8e` — fixed all seven accepted lifecycle/project-sync review findings and added integrated evidence.

**Totals**:

- Review-fix diff before this record: 26 files, 948 insertions, 116 deletions.
- Focused lifecycle-sync/trusted-install/lifecycle/recovery/file/process/security verification: 47 test files / 227 tests passed; no type errors.
- Full verification: 260 test files / 1,297 tests passed; TypeScript green; dependency boundaries green (337 modules / 2,423 dependencies); package build/import green (713 root exports / 3 Pi exports); isolated packed Pi startup passed.
- All ten child stories remain `stage: done`.

**Notes**: Review weight `standard`, from project convention and caller instruction: one independent sole review, receiver adjudication, blocker fixes, full verification, then closure without re-review. No nested agent, peer mechanism, second independent pass, update-policy work, fork/refactor, later feature, release, push, or `.work/bin/work-view` change was made. The feature advanced `review → done`.
