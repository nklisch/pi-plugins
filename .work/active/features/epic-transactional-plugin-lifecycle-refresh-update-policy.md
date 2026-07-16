---
id: epic-transactional-plugin-lifecycle-refresh-update-policy
kind: feature
stage: review
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-operations, epic-transactional-plugin-lifecycle-recovery-journal-gc]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-17
---

# Marketplace Refresh and Update Policy

## Brief

Provide explicit and scheduled marketplace refresh, installed-versus-available revision comparison, once-per-revision notification memory, and per-marketplace automatic-update policy. Checks cover every configured remote marketplace, are rate-limited, cancellable, and outside startup's critical path; notification availability remains independent of whether automatic application is enabled.

Automatic updates are disabled by default for third-party sources, remain bound to unchanged marketplace/plugin source identity, and invoke the same lifecycle transaction and recovery path as manual updates. Network, source, validation, compatibility, trust, activation, or notification failure never blocks startup or disables the active revision. This feature does not render notifications/UI or create a separate update installer.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 5 network policy — terminal consumer of stable lifecycle and recovery semantics
- Depends on operations and recovery/journal/GC
- Required guarantees: crash, concurrency, network, scope, data, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — Updates; Performance and availability
- `docs/ARCHITECTURE.md` — Update discovery and notifications; Trust; Pi integration
- `docs/COMPATIBILITY.md` — Update behavior

## Existing contract references

- `src/domain/source.ts` — canonical declarations and immutable resolved revisions
- `src/domain/marketplace.ts` — normalized marketplace entries and declared versions
- `src/domain/state/config-state.ts` — per-marketplace update preference
- `src/domain/state/installed-state.ts` — selected immutable plugin and marketplace revisions
- `src/application/source-materialization.ts` — cancellable marketplace/plugin acquisition
- `src/application/plugin-lifecycle-service.ts` — sole update transaction and `automatic-update` origin
- `src/application/ports/lifecycle-state-store.ts` and `src/application/generation-mutation-coordinator.ts` — durable cross-process compare-and-commit
- `src/application/ports/lifecycle-state-inventory.ts` — persisted user/project scope inventory
- `src/application/ports/marketplace-registration.ts` — adoption's normal registration boundary

## UI alignment

No UI surface. This feature returns typed refresh, availability, automatic-application, and notification-intent results. Notification rendering and automatic-update settings controls belong to `epic-native-plugin-management`.

## Design decisions

- **Discovery posture**: Direct-read only. Grounding covered all foundation and compatibility documents, project rules, the parent/dependency records, source/materialization and marketplace readers, current state/config schemas, generation coordination, lifecycle/trust/configuration/recovery seams, adoption registration, package boundaries, and representative tests. The delegated endpoint prohibited nested agents and peeragent.
- **Service split**: Use one `MarketplaceRefreshService` for explicit/scheduled discovery, one `MarketplaceUpdatePolicyService` for exact source-bound preference changes, and one narrow `MarketplaceUpdateScheduler` that invokes refresh. Automatic application is an orchestration branch inside refresh and always calls `PluginLifecycleService.update`; there is no update installer, workflow framework, or second transition engine.
- **Startup independence**: Factories perform no I/O and start no timers. The later Pi adapter may call `scheduler.run(signal)` only after local state loading and required recovery complete. Explicit `refresh(...)` is callable independently at any time. A refresh error is returned as data and never changes startup or activation results.
- **Configured inventory**: Marketplace configuration and update preference are scope-local. User records remain in host config; project-local v2 mirrors only validated portable marketplace declarations plus machine-local update preference/memory, bound to the project declaration digest. The existing complete scope inventory discovers both. Scheduled runs visit every remote (`github`/`git`) record in stable scope/marketplace order. Explicit refresh may also target `local-git`, but local sources are never scheduled or automatically applied. An incomplete inventory permits non-destructive results for readable scopes but suppresses automatic application and destructive memory pruning outside the proven inventory.
- **Default policy**: Every new registration/sync, including adoption and project portable synchronization, starts `manual`. There is no built-in first-party allowlist, so this feature does not invent one. Changing a marketplace declaration resets `automatic → manual`, clears its old refresh claim/backoff, and retains old notification evidence only as inert history until successful reconciliation.
- **State evolution**: Evolve host configuration, installed-user, and project-local families to version 2 rather than silently changing v1. Host-config v1→v2 adds user refresh/notification memory and maps invalid legacy `local-git + automatic` to `manual`; project-local v2 adds scope-local marketplace update records derived only by the normal portable-sync/registration boundary. Installed/project migrations cannot recover stable declared plugin-source identity from intentionally lossy v1 evidence, so they use `legacy-unavailable`; project records without a reconstructable declaration remain manual and unscheduled until normal project sync refreshes them.
- **Stable versus immutable identity**: Stable marketplace identity is the hash of `serializeMarketplaceSource(declared)`; stable plugin identity is the hash of `serializePluginSource(entry.source.value)`. Immutable availability identity is the verified installed-revision binding created from the resolved source and materialized content. Selectors, repository/package/path, registry, and marketplace/plugin source kind remain in stable identity; resolved commit/integrity/content remain in immutable identity. Source changes are represented as typed differences and never normalized to an equal display name.
- **Declared version precedence**: Persist one optional `declaredVersion` selected as plugin-manifest version, then marketplace-entry version. Display falls back to resolved Git/marketplace revision or npm package version. Availability equality is decided by immutable revision, never display text: equal declared versions with different immutable bindings are `revision-changed`; equal immutable bindings are current even if presentation text changed. No semver ordering is fabricated because acquisition already resolves the authoritative selector.
- **Marketplace snapshot decoupling**: Refresh may select a new marketplace snapshot without invalidating installed marketplace-relative plugin revisions copied into their own immutable store. Remove the current cross-record rule that every installed historical revision's marketplace revision must equal the latest catalog snapshot; retain only marketplace-name coverage and each revision's own verified source/content binding.
- **Durable refresh claim**: Each scope-local marketplace update record owns at most one claim `{id, startedAt, expiresAt}`. Claim acquisition, completion, backoff, and notification-memory writes use that scope's existing generation coordinator with short replacements and exact source/claim preconditions. Network, catalog reading, plugin probing, and lifecycle update run outside locks. A 15-minute lease may permit duplicate work after a long pause, but only the current claim may publish its marketplace result; stale workers discard staging. Lifecycle generation checks and immutable expected-revision evidence make duplicate automatic attempts converge.
- **Explicit versus scheduled rate policy**: Explicit refresh bypasses `nextScheduledAt` and failure backoff but coalesces behind an unexpired claim. Scheduled success waits 6 hours. Marketplace/catalog transient or permanent failure uses `min(5 minutes × 2^(failures-1), 6 hours)`; a successful marketplace refresh resets failures. No random-jitter port is added: the durable per-marketplace claim is the herd-control mechanism. Local explicit refresh uses no automatic branch.
- **Materialization and publication**: Claim in one scope, then allocate/materialize/read the marketplace outside coordination. The winning completion briefly reacquires that scope's generation coordinator, verifies the exact declaration digest/source and claim, promotes through the existing `ContentStorePort`, and atomically commits its refresh memory plus selected marketplace snapshot. Content-addressed promotion lets identical user/project work converge without cross-scope state transactions. Plugin probes use separate staging and always discard it; automatic lifecycle update deliberately rematerializes so no prepared-candidate bypass crosses into lifecycle.
- **Source-change boundary**: A marketplace-source or plugin-source identity change produces `approval-required` before automatic application. Plugin source changes are reported from the exact new declaration without fetching that newly authorized external source. A normal explicit approval/registration/update may proceed later, but changing configuration cannot carry an automatic grant forward.
- **Discovery before application**: Successful probing first compares and durably records a new `UpdateCandidateKey`/notification record regardless of `updateApplication`. Only then may the automatic branch run. This preserves discovery evidence across lifecycle failure or process interruption and keeps notification policy independent from application policy.
- **Notification memory**: Each scope-local marketplace update record stores one current notification per installed plugin containing the candidate key, immutable revision when known, selected display labels, phase (`discovered` or `emitted`), and final disposition. A generation winner changes `discovered → emitted` and alone returns `notification: new`; peers return `already-emitted`. A different candidate key replaces the marker and can notify once; marketplace/plugin removal prunes it. Network/probe failure, automatic-update failure, or unchanged policy does not reset it. This guarantees once-per-candidate application-level notification-intent emission; terminal rendering remains the future Pi adapter's concern.
- **Automatic authority**: `origin: automatic-update` is not caller-supplied trust. Lifecycle rereads the exact scope's authoritative marketplace update record (host config for user, project-local for project), requires `automatic` on the unchanged declaration and matching project declaration digest, verifies the previous selected installed revision still has an exact non-revoked trust grant, verifies project trust when applicable, and compares prior/candidate stable marketplace/plugin source identities. Only then may automatic policy authorize a changed immutable revision/executable surface. Exact trust remains mandatory for manual, sync, and adoption origins.
- **Lifecycle race guard**: Automatic update requests carry the probed immutable `expectedRevision`. Candidate preparation must match it before promotion; a moved external ref returns typed `AVAILABLE_REVISION_CHANGED` and leaves the active revision untouched. Pending transitions return `recovery-required`/manual disposition; refresh never invokes recovery or retries a lifecycle command blindly.
- **Automatic result mapping**: `changed`/`unchanged` are applied; `stale`, `PROMOTION_FAILED`, `PROJECTION_FAILED`, `ABORTED`, and verified rollback are retryable on a later eligible check; incompatibility, missing configuration, changed source identity, absent/revoked baseline trust, or project distrust become manual-required; `recovery-required` remains blocked until normal recovery settles it. Every path still emits at most one notification intent for the candidate.
- **Scheduler shape**: The scheduler is a cancellable one-shot loop over a narrow `UpdateDelayPort.wait(ms, signal)`. It runs an immediate scheduled pass only after its caller starts it, then waits until the earliest durable `nextScheduledAt` (bounded by a 15-minute inventory poll so newly registered marketplaces join). No cron grammar, queue, task registry, worker pool, random source, or process-local authority is introduced.
- **Adoption seam**: Adoption continues to submit source declarations only through `MarketplaceRegistrationPort`. Registration implementations use the v2 configuration constructor so adoption cannot import foreign `autoUpdate`; adopted sources always start manual. Refresh never reads foreign state or calls adoption.
- **Implementation ownership**: Keep this as one feature implementation/review bundle. The four child stories are correctness and acceptance checkpoints, not separate-agent assignments.
- **Review policy**: Effective `review_weight` is `standard` from the caller/project: exactly one independent feature pass after implementation, then host adjudication, material fixes, verification, and completion without re-review. Design-time advisory is skipped because this delegated endpoint forbids nested agents/peeragent.
- **Foundation timing**: Code-first. Current foundation assertions already describe network-independent startup, immutable revision comparison, notification independence, and source-bound automatic authority. Implementation updates them only if landed schema/result names make an existing assertion false or misleading.

## Architectural choice

### Option A — process-local timers and an in-memory notified set

Each Pi session could periodically fetch marketplaces and remember notifications until exit. This is short but ordinary concurrent sessions duplicate network work, duplicate notifications, and independently decide update authority. A restart forgets every candidate. Rejected.

### Option B — a separate update database, installer, and trust mode

A dedicated scheduler/notification database and prepared update installer could coordinate durable work and avoid repeated materialization. It would create a seventh state authority, duplicate generation/locking and lifecycle recovery, and risk making automatic trust broader than host configuration. Rejected.

### Option C — generation-coordinated durable memory plus one refresh orchestrator and the existing lifecycle service (chosen)

Host config and project-local state evolve within their existing versioned families to retain scope-local claims, backoff, policy, and notification memory. Marketplace/plugin acquisition stays outside locks; short publication and memory writes use existing generation coordination. Refresh probes immutable candidates, while automatic application calls the normal lifecycle `update` with an expected revision and an origin that causes lifecycle to verify durable source-bound policy.

**Choice**: Option C. It adds only the concepts the feature requires, preserves the six-family state architecture, and makes ordinary sessions coalesce or safely converge without weakening trust, compatibility, activation, journal, or recovery guarantees.

## Trickiest unit first

The hardest unit is the automatic-authority race. The check process observes one config generation, marketplace snapshot, catalog entry, installed revision, and candidate binding; another process may change policy, source, installed state, or the external ref before application. The design treats the discovery result as evidence, not authority. `PluginLifecycleService.update` rereads policy, verifies the exact previous trusted revision and unchanged stable source identities, rematerializes through the normal preparation path, and requires the resulting immutable binding to equal `expectedRevision`. Its normal short generation commit is still final authority. Any mismatch becomes a typed non-destructive outcome.

The fallback is manual application, not widened trust. Legacy records without stable identity, incomplete project inventory, source changes, moved refs, corrupt state, pending recovery, or unverifiable baseline grants remain discoverable where safe but cannot automatically activate.

## Implementation units

### Unit 1: Versioned update evidence, comparison, claims, and notification memory

**Story**: `epic-transactional-plugin-lifecycle-refresh-update-policy-contracts-state-comparison`

**Files**:
- `src/domain/time.ts`
- `src/domain/update-policy.ts`
- `src/domain/state/config-state.ts`
- `src/domain/state/installed-state.ts`
- `src/domain/state/project-state.ts`
- `src/domain/state/codec.ts`
- `src/domain/state/registry.ts`
- `src/application/state-contract.ts`
- `src/application/generation-mutation-coordinator.ts`
- `src/application/ports/lifecycle-clock.ts`
- `test/domain/time.test.ts`
- `test/domain/update-policy.test.ts`
- `test/domain/state/config-state.test.ts`
- `test/domain/state/installed-state.test.ts`
- `test/domain/state/project-state.test.ts`
- `test/domain/state/codec.test.ts`
- `test/application/state-contract.test.ts`

```typescript
export const UpdateCandidateKeySchema = z.string()
  .regex(/^update-candidate-v1:sha256:[0-9a-f]{64}$/)
  .brand<"UpdateCandidateKey">();

export const StableSourceIdentitySchema = z.union([
  SourceHashSchema,
  z.literal("legacy-unavailable"),
]);

export const AvailableRevisionSchema = z.object({
  immutableRevision: ContentDigestSchema,
  marketplaceSourceIdentity: SourceHashSchema,
  pluginSourceIdentity: SourceHashSchema,
  declaredVersion: z.string().min(1).optional(),
  sourceRevision: z.string().min(1),
}).strict().readonly();

export type RevisionComparison =
  | Readonly<{ kind: "current"; installed: InstalledRevisionDescriptor }>
  | Readonly<{
      kind: "revision-changed";
      installed: InstalledRevisionDescriptor;
      available: AvailableRevision;
      displayVersionChanged: boolean;
    }>
  | Readonly<{
      kind: "approval-required";
      reason: "MARKETPLACE_SOURCE_CHANGED" | "PLUGIN_SOURCE_CHANGED" |
        "LEGACY_SOURCE_IDENTITY";
      candidate: UpdateCandidateKey;
    }>;

export function selectDeclaredVersion(input: Readonly<{
  plugin?: string;
  marketplace?: string;
}>): string | undefined;

export function compareInstalledRevision(input: Readonly<{
  installed: InstalledRevisionRecord;
  available: AvailableRevision;
}>): RevisionComparison;
```

A shared scope-local update-record shape owns source, preference, and operational memory. Host config v2 uses it for user marketplaces; project-local v2 adds `marketplaceUpdates` records derived from validated portable declarations and bound by the existing declaration digest:

```typescript
export const MarketplaceRefreshMemorySchema = z.object({
  claim: z.object({
    id: RefreshClaimIdSchema,
    startedAt: EpochMillisecondsSchema,
    expiresAt: EpochMillisecondsSchema,
  }).strict().readonly().optional(),
  lastCompletedAt: EpochMillisecondsSchema.optional(),
  nextScheduledAt: EpochMillisecondsSchema.default(0),
  consecutiveFailures: z.number().int().nonnegative().safe().default(0),
}).strict().readonly();

export const UpdateNotificationMemorySchema = z.object({
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  candidate: UpdateCandidateKeySchema,
  available: AvailableRevisionSchema.optional(),
  display: z.object({ installed: z.string().min(1), available: z.string().min(1) })
    .strict().readonly(),
  phase: z.enum(["discovered", "emitted"]),
  disposition: z.enum([
    "manual-required", "approval-required", "automatic-applied",
    "automatic-retryable", "recovery-required",
  ]).optional(),
}).strict().readonly();

export const MarketplaceUpdateRecordSchema = z.object({
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  updateApplication: UpdateApplicationPreferenceSchema,
  refresh: MarketplaceRefreshMemorySchema,
  notifications: z.array(UpdateNotificationMemorySchema).readonly(),
}).strict().readonly().superRefine(/* local-git cannot be automatic; unique plugin */);

export const HostConfigDocumentSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  generation: GenerationSchema,
  records: z.array(MarketplaceUpdateRecordSchema).readonly(),
}).strict().readonly();

export const ProjectLocalStateDocumentSchemaV2 = ProjectLocalStateDocumentBaseV2.extend({
  schemaVersion: z.literal(2),
  marketplaceUpdates: z.array(MarketplaceUpdateRecordSchema).readonly(),
}).strict().readonly().superRefine(
  /* exact marketplace/source coverage and binding to synced declarationDigest */
);
```

`HostConfigSchemaFamily` registers v1 and v2 with a deterministic v1→v2 migration. Installed-user/project-local families likewise register v2. New installed evidence stores `declaredVersion?`, `sourceRevision`, and stable marketplace/plugin source identities; v1 migration uses `legacy-unavailable` where a declaration cannot be reconstructed. A project v1 migration creates no invented marketplace update authority; normal portable sync populates v2 records. Current aliases and state snapshot/mutation/coordinator schemas point to v2 while explicit v1 exports remain fixtures/migration inputs.

`deriveUpdateCandidateKey` hashes a canonical preimage containing scope, plugin, stable source identities, and immutable revision (or exact changed declaration identity for pre-materialization source-change results). Constructors verify caller-supplied keys/hashes. `createMarketplaceConfigurationRecord` defaults manual and `replaceMarketplaceConfigurationSource` resets policy/memory on any canonical declaration change. Move the existing portable epoch-millisecond schema to `src/domain/time.ts`; `LifecycleClock` imports/re-exports it so state never imports an application port and recovery consumers do not gain a second clock contract.

**Acceptance criteria**:
- [ ] Equal display/declared versions cannot hide a different immutable installed binding; equal immutable bindings remain current.
- [ ] Manifest version wins marketplace version; source revision/version is display fallback only.
- [ ] Marketplace and plugin declaration identity changes remain distinct typed outcomes and cannot be erased by equal names, versions, or resolved bytes.
- [ ] Host, installed-user, and project-local v1 fixtures migrate deterministically; legacy installed source identity denies automatic application without corrupting/manual-disabling the plugin.
- [ ] New/local/source-replaced marketplace config is manual, and source replacement clears claims/backoff while preventing old automatic policy from carrying forward.
- [ ] Notification memory is unique per scope/plugin, stores no path/secret/native error, and changes candidate only through a verified candidate key.
- [ ] Historical marketplace-relative plugin revisions remain valid after the selected marketplace snapshot advances.

### Unit 2: Explicit refresh, catalog inspection, durable coalescing, and candidate discovery

**Story**: `epic-transactional-plugin-lifecycle-refresh-update-policy-marketplace-refresh-discovery`
**Depends on**: `epic-transactional-plugin-lifecycle-refresh-update-policy-contracts-state-comparison`

**Files**:
- `src/application/marketplace-inspection-contract.ts`
- `src/application/marketplace-inspection-service.ts`
- `src/application/update-contract.ts`
- `src/application/update-candidate-inspection.ts`
- `src/application/marketplace-update-policy-service.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/ports/refresh-claim-id.ts`
- `test/application/marketplace-inspection-service.test.ts`
- `test/application/update-candidate-inspection.test.ts`
- `test/application/marketplace-update-policy-service.test.ts`
- `test/application/marketplace-refresh-service.test.ts`

```typescript
export interface MarketplaceInspectionService {
  inspect(
    materialized: MaterializedMarketplace,
    signal: AbortSignal,
  ): Promise<MarketplaceReadResult>;
}

export type MarketplaceRefreshRequest = Readonly<{
  trigger: "explicit" | "scheduled";
  marketplace?: MarketplaceName;
}>;

export interface MarketplaceRefreshService {
  refresh(
    request: MarketplaceRefreshRequest,
    signal: AbortSignal,
  ): Promise<MarketplaceRefreshResult>;
  nextScheduledAt(signal: AbortSignal): Promise<EpochMilliseconds | undefined>;
}

export interface MarketplaceUpdatePolicyService {
  setApplicationPreference(request: Readonly<{
    scope: ScopeContext;
    marketplace: MarketplaceName;
    sourceIdentity: SourceHash;
    preference: "manual" | "automatic";
  }>, signal: AbortSignal): Promise<
    | Readonly<{ kind: "changed" | "unchanged"; preference: UpdateApplicationPreference }>
    | Readonly<{ kind: "rejected"; code: "NOT_CONFIGURED" |
        "SOURCE_CHANGED" | "LOCAL_AUTOMATIC_FORBIDDEN" | "STATE_STALE" }>
  >;
}

export type MarketplaceRefreshOutcome =
  | Readonly<{ kind: "refreshed"; marketplace: MarketplaceName;
      snapshot: MarketplaceSnapshotRecord; plugins: readonly PluginUpdateOutcome[] }>
  | Readonly<{ kind: "rate-limited"; marketplace: MarketplaceName; nextAt: EpochMilliseconds }>
  | Readonly<{ kind: "coalesced"; marketplace: MarketplaceName; claimExpiresAt: EpochMilliseconds }>
  | Readonly<{ kind: "skipped-local"; marketplace: MarketplaceName; trigger: "scheduled" }>
  | Readonly<{ kind: "failed"; marketplace: MarketplaceName;
      code: "SOURCE_FAILED" | "CATALOG_INVALID" | "STATE_STALE" |
        "STATE_CORRUPT" | "ABORTED" }>;
```

`MarketplaceInspectionService` builds a finite `ContentIndex` over the verified marketplace manifest, reads only `.agents/plugins/marketplace.json` and `.claude-plugin/marketplace.json` through `ContentReadPort` with a 1 MiB limit, invokes the existing Codex/Claude readers, and merges dual catalogs through `mergeMarketplaces`. No directory scan or arbitrary path read is added.

`MarketplaceRefreshService` discovers complete scope contexts, rereads each snapshot authoritatively, and obtains user records from host config or project records from project-local state. It claims exact scope/marketplace records in stable order, materializes/inspects outside coordination, then verifies scope generation, declaration digest/source, and claim before promotion and selected-snapshot commit. Source-change results are recorded before plugin acquisition. For unchanged identity, `inspectUpdateCandidate` allocates/materializes/inspects/assesses compatibility only far enough to create `AvailableRevision`; it performs no trust/configuration/projection/reload work and always discards staging.

Explicit runs bypass cadence and can refresh one/all readable scope records, including local sources. Scheduled runs filter local sources and respect durable cadence. Expired claims can be replaced; unexpired claims return `coalesced`. A stale/lost claim cannot promote or publish. Every plugin result is deterministic by scope/plugin; malformed one-plugin source does not hide valid siblings. Incomplete inventory suppresses automatic eligibility and destructive memory pruning outside the proven readable set but does not block safe results from readable scopes.

`MarketplaceUpdatePolicyService` performs no network work. It rereads the exact scope record and declaration digest, compares the caller's stable source identity, rejects automatic for local sources, and uses one short generation mutation. A concurrent source replacement returns `SOURCE_CHANGED`; it cannot accidentally set automatic on the replacement. Preference changes never mark a candidate notified or grant exact revision trust.

**Acceptance criteria**:
- [ ] Factory/service construction performs no I/O; only explicit `refresh` or later scheduler invocation can materialize a source.
- [ ] Explicit calls bypass rate/backoff, scheduled calls cover every remote config record, and local sources are explicit/manual only.
- [ ] Policy changes require exact scope/marketplace/source identity, reject local automatic and source races, and expose typed changed/unchanged/rejected outcomes without network or trust mutation.
- [ ] Two service instances sharing state produce one current claim/publication or converge after expiry; a stale worker cannot overwrite the winner.
- [ ] Marketplace and plugin materialization, catalog/plugin reading, and compatibility work occur outside generation locks; claim/publication/notification writes are short exact-precondition mutations.
- [ ] A new marketplace snapshot is promoted through `ContentStorePort`; old installed marketplace-relative plugin revisions remain usable.
- [ ] Source identity changes stop before external plugin materialization and return approval-required evidence.
- [ ] Same immutable candidate is current; different immutable candidate is discoverable even with equal declared/display version.
- [ ] Network/catalog/plugin failures preserve active state, keep prior notification memory, update bounded backoff, and continue unrelated marketplaces/plugins.

### Unit 3: Source-bound automatic authority through the normal lifecycle update

**Story**: `epic-transactional-plugin-lifecycle-refresh-update-policy-automatic-application-authority`
**Depends on**: `epic-transactional-plugin-lifecycle-refresh-update-policy-marketplace-refresh-discovery`

**Files**:
- `src/application/automatic-update-authorization.ts`
- `src/application/trust-service.ts`
- `src/application/configuration-resolver.ts`
- `src/application/plugin-candidate-preparation.ts`
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/marketplace-refresh-service.ts`
- `test/application/automatic-update-authorization.test.ts`
- `test/application/plugin-candidate-preparation.test.ts`
- `test/application/plugin-lifecycle-service.test.ts`
- `test/application/marketplace-refresh-service.test.ts`

```typescript
export type AutomaticUpdateAuthorizationResult =
  | Readonly<{ kind: "authorized"; subject: TrustSubjectRef }>
  | Readonly<{ kind: "denied"; code:
      "POLICY_MANUAL" | "LOCAL_SOURCE" | "MARKETPLACE_SOURCE_CHANGED" |
      "PLUGIN_SOURCE_CHANGED" | "LEGACY_SOURCE_IDENTITY" |
      "BASELINE_TRUST_ABSENT" | "BASELINE_TRUST_REVOKED" |
      "PROJECT_UNTRUSTED" | "STATE_STALE" }>;

export async function authorizeAutomaticUpdateCandidate(
  request: Readonly<{
    scope: ScopeContext;
    previous: LoadedInstalledPlugin;
    previousRecord: InstalledRevisionRecord;
    candidate: TrustCandidate;
    candidateMarketplaceSourceIdentity: SourceHash;
    candidatePluginSourceIdentity: SourceHash;
    policyRecord: MarketplaceUpdateRecord;
    trustRecords: readonly TrustStateRecord[];
  }>,
  dependencies: Readonly<{ projectTrust: ProjectTrustPort; sha256: Sha256 }>,
  signal: AbortSignal,
): Promise<AutomaticUpdateAuthorizationResult>;
```

For an automatic origin, lifecycle loads the selected previous revision through `InstalledPluginLoader`, reconstructs/verifies its exact trust candidate, confirms a current granted/non-revoked baseline record, rereads current user host policy, and invokes this evaluator. The evaluator requires exact scope/plugin and stable source identities; it never grants based on marketplace name, display version, current resolved revision, or caller claims. Candidate compatibility, configuration validation, project-root authority, promotion, pending journal, reload observation, rollback, and recovery remain unchanged.

```typescript
export type UpdatePluginRequest = InstallPluginRequest & Readonly<{
  expectedRevision?: ContentDigest;
}>;
```

`origin: automatic-update` requires `expectedRevision`; lifecycle rejects a prepared mismatch with `AVAILABLE_REVISION_CHANGED` before promotion. Other origins retain exact trust semantics and do not receive automatic authorization. The configuration resolver gains an internal non-exported path accepting only authorization evidence produced in the same preparation call; the existing exported `withResolvedPluginConfiguration` remains exact-trust-only, so no public trust bypass appears.

Refresh persists discovery memory before calling:

```typescript
await lifecycle.update({
  scope,
  plugin,
  origin: "automatic-update",
  entry,
  marketplaceSource,
  sourceContext,
  expectedRevision: available.immutableRevision,
  configurationPathContext,
}, signal);
```

It maps lifecycle results into disposition, finalizes notification memory through the same scope's generation CAS, and returns one `NotificationIntent` only to the process that changed the candidate's phase to emitted. A concurrent automatic call may become lifecycle `unchanged`; that is treated as applied convergence.

**Acceptance criteria**:
- [ ] Disabled/manual/local/source-changed/legacy policy never reaches lifecycle automatic application, but availability and one notification intent remain.
- [ ] A forged direct `origin: automatic-update` cannot bypass current host policy, exact baseline trust, project trust, unchanged source identity, compatibility, configuration, projection, promotion, journal, reload, or recovery checks.
- [ ] Changed hook/MCP/skill definitions may be authorized only by explicit automatic policy over unchanged source identity; manual/sync/adoption still require exact candidate trust.
- [ ] A ref moving between probe and lifecycle preparation returns `AVAILABLE_REVISION_CHANGED` before promotion and leaves the active revision intact.
- [ ] Every automatic attempt calls `PluginLifecycleService.update` exactly as `origin: automatic-update`; no lower-level state/promotion/reload method is called by refresh.
- [ ] Lifecycle changed/unchanged, rejection, stale, verified rollback, and recovery-required map to stable typed dispositions without duplicate notification emission or active-revision loss.
- [ ] Pending recovery blocks automatic mutation; refresh never invokes or duplicates recovery behavior.

### Unit 4: Cancellable scheduler, Node composition, integration, and public boundary

**Story**: `epic-transactional-plugin-lifecycle-refresh-update-policy-scheduled-composition-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-refresh-update-policy-marketplace-refresh-discovery`, `epic-transactional-plugin-lifecycle-refresh-update-policy-automatic-application-authority`

**Files**:
- `src/application/marketplace-update-scheduler.ts`
- `src/application/ports/update-delay.ts`
- `src/infrastructure/update/node-update-delay.ts`
- `src/composition/create-marketplace-update-services.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/application/marketplace-update-scheduler.test.ts`
- `test/integration/marketplace-update-policy.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed assertions require correction

```typescript
export const DefaultMarketplaceUpdatePolicy = Object.freeze({
  successIntervalMs: 6 * 60 * 60 * 1_000,
  failureBaseMs: 5 * 60 * 1_000,
  failureMaxMs: 6 * 60 * 60 * 1_000,
  claimLeaseMs: 15 * 60 * 1_000,
  inventoryPollMs: 15 * 60 * 1_000,
});

export interface UpdateDelayPort {
  wait(milliseconds: number, signal: AbortSignal): Promise<void>;
}

export interface MarketplaceUpdateScheduler {
  run(signal: AbortSignal): Promise<void>;
}

export function createMarketplaceUpdateScheduler(dependencies: Readonly<{
  refresh: MarketplaceRefreshService;
  clock: LifecycleClock;
  delay: UpdateDelayPort;
}>): MarketplaceUpdateScheduler;
```

`run` performs a scheduled pass only after invocation, computes the next durable due time, waits cancellably, and repeats. It never swallows abort, starts itself, owns update authority, or renders results. `createNodeMarketplaceUpdateServices` wires existing source/content/state/lifecycle/inventory ports, marketplace readers, policy service, SHA-256, UUID claim IDs, wall/monotonic clock, and abortable Node delay. It returns services to the host but does not register Pi events or launch background work.

One integration suite uses two refresh/scheduler instances over shared fake generation state, remote and local marketplaces, user/project installs, a moved ref, equal display versions, automatic/manual policies, and a fake real lifecycle facade. It proves durable coalescing, once-per-candidate notification intent, explicit bypass, local exclusion, source-change denial, expected-revision race rejection, project isolation, and cancellation. Existing lifecycle/recovery/source/locking suites remain the detailed owners of transaction rollback, crash recovery, secure materialization, and cross-process lock behavior.

Public exports include update schemas/results, pure comparison/identity constructors, service/scheduler factories, and narrow ports. They exclude claim mutation helpers, timer handles, prepared candidates, automatic authorization tokens, direct state writers, content roots, native errors, notification rendering, and Pi APIs.

**Acceptance criteria**:
- [ ] Constructing Node update services causes no network, timer, recovery, lifecycle, notification, or state write; the host must explicitly start the scheduler after local readiness.
- [ ] Scheduler delay and all source/lifecycle work obey one caller signal; cancellation cannot be converted into success or disable an active revision.
- [ ] Two ordinary session instances coalesce through durable claims or converge through expected revision and lifecycle generations; no process-local notified set or authority affects correctness.
- [ ] Integration proves every configured remote marketplace is attempted, explicit refresh bypasses cadence, local is never scheduled/automatic, and one marketplace failure leaves siblings active/checkable.
- [ ] Public source/compiled allowlists expose typed management results without UI, Pi notification adapter, timer implementation details, raw paths, secret values, or alternate lifecycle methods.
- [ ] Dependency rules keep update domain/application code free of Node, formats, infrastructure, runtime, and Pi imports; composition alone wires readers/adapters.
- [ ] Full `npm test` passes source/test typechecking, boundaries, focused concurrency/failure integration, build, and exact compiled import.

## Implementation order

1. `epic-transactional-plugin-lifecycle-refresh-update-policy-contracts-state-comparison`
2. `epic-transactional-plugin-lifecycle-refresh-update-policy-marketplace-refresh-discovery`
3. `epic-transactional-plugin-lifecycle-refresh-update-policy-automatic-application-authority`
4. `epic-transactional-plugin-lifecycle-refresh-update-policy-scheduled-composition-hardening`

The chain is deliberate. Durable identity/memory must exist before network results can be published; refresh must produce immutable evidence before automatic authority can consume it; scheduler/composition hardening is last so it cannot accidentally define policy or start network work. One feature owner should normally carry the chain because state migration, discovery evidence, and lifecycle authority are one security contract.

## Simplification

- Reuse `MarketplaceSourceSchema`, canonical source serialization/hash, normalized marketplace readers/merger, source materializers, `ContentStorePort`, `LifecycleStateInventoryPort`, `GenerationMutationCoordinator`, `LifecycleClock`, lifecycle update, transition journal, recovery, and existing trust/configuration/projection ports.
- Keep one refresh service, one narrow policy setter, one delay-driven scheduler, and the existing lifecycle service. Do not add a generic scheduler/queue, cron syntax, retry daemon, second state database, process-local dedupe authority, prepared-candidate handoff, or second installer.
- Extend existing versioned state families rather than adding a seventh authoritative family. Keep notification/claim memory path-free and secret-free; do not put timers, PIDs, roots, adapters, or native errors in state.
- Do not teach adoption to import foreign update policy. The registration seam still receives declarations only and defaults them manual.
- Do not duplicate secure Git/npm/archive tests, lifecycle rollback/recovery matrices, or generation-lock SQLite races. New tests protect comparison, claim publication, policy authority, orchestration, and package boundaries.
- No current test is a clear removal candidate. The installed-state equality assertion that binds every historical marketplace-relative revision to the latest snapshot is replaced with coverage for revision independence because refresh makes that old invariant incorrect.

## Testing

- **State/migration contracts**: v1→v2 host/installed/project fixtures, deterministic encoding, legacy-unavailable denial, local automatic downgrade, source replacement reset, notification uniqueness, and no forbidden state fields. Protects durable compatibility and authority.
- **Comparison vectors**: same/different immutable revision crossed with same/different/missing manifest and marketplace versions, all source kinds, and stable source changes. Protects “equal version cannot hide changed bytes.”
- **Claim/rate matrix**: due/not-due, explicit bypass, unexpired/expired claim, stale config generation, source changed during fetch, winner/loser completion, success reset, exponential cap, and abort. Protects ordinary-session coalescing.
- **Refresh partial success**: dual catalog, malformed sibling, missing installed entry, plugin probe failure, incomplete project inventory, local explicit, remote scheduled, and marketplace promotion/state publication. Protects network isolation and scope continuation.
- **Automatic authority matrix**: manual/automatic, local/remote, exact/legacy/changed stable identities, granted/revoked/missing baseline, user/project trust, changed executable surface, moved expected revision, and pending transition. Protects trust containment.
- **Lifecycle mapping**: one table over changed/unchanged/rejected/stale/rolled-back/recovery-required proves disposition and notification memory without retesting lifecycle internals.
- **Scheduler contract**: no eager work, immediate invoked pass, earliest-due delay, 15-minute inventory ceiling, abort during wait/refresh, and refresh failure continuation.
- **One integrated concurrency path**: two service instances and shared generation state prove one notification intent and lifecycle convergence. Existing SQLite/child-process suites remain the lock/recovery authority.

## Risks

- **Scope-local records may duplicate one remote fetch across user/project scopes**: avoiding that would require cross-scope claims or a second global authority. Mitigation: each scope coalesces independently, content-addressed promotion deduplicates bytes, and lifecycle expected revisions converge application. Fallback: duplicate network work is acceptable; no scope can grant policy or overwrite memory for another.
- **Legacy v1 records lack declared source identity by design**: inferring it from resolved hashes would broaden authority. Mitigation: migrate as `legacy-unavailable` and deny auto. Fallback: one explicit/manual update records v2 identities; installed content continues working meanwhile.
- **A lease may expire during a valid long fetch**: another session may duplicate network work. Mitigation: only the current claim may publish and automatic lifecycle requires exact expected revision/generation. Fallback: duplicate work converges or returns stale; correctness does not depend on one worker.
- **Probe then lifecycle rematerializes external plugins**: this costs extra network/I/O. Mitigation: it preserves one installer and prevents a prepared discovery candidate from bypassing trust/compatibility/journal/recovery. Measure before inventing a reusable candidate cache.
- **A marketplace snapshot can advance while old plugins remain installed**: the previous equality invariant conflated catalog selection with copied plugin content. Mitigation: every installed revision retains its own immutable source/content evidence and plugin-store ref; marketplace name coverage remains. Retention/GC already pins revision artifacts independently.
- **Application-level once-only intent is not a transactional terminal draw**: a process can die after the durable emitted transition but before a future Pi adapter paints it. Mitigation: keep `discovered` durable before auto work and define the guarantee at the typed intent boundary. The native adapter may add host-appropriate delivery acknowledgment later without changing candidate identity or update authority.
- **Clock regression can delay a lease/backoff**: wall time is the only cross-process clock evidence; monotonic time cannot survive processes. Mitigation: validate nonnegative bounded timestamps and let explicit refresh bypass cadence. Fallback: delayed checks preserve availability and active state.
- **Source-change notification cannot know candidate bytes without fetching a newly authorized source**: fetching first would blur approval. Mitigation: notify from exact changed declaration/candidate key and require explicit approval before normal lifecycle materialization. Fallback: native management performs inspect/approval through the manual path.

## Pre-mortem

The design fails if startup waits for network, two sessions both become update authority, equal display versions hide changed bytes, a changed repository/ref/package inherits automatic trust, discovery disappears when auto is off, refresh invalidates old installed content, an external ref moves between probe and activation, or a scheduler invents a second installer/recovery path. Explicit host-started scheduling, durable generation claims, immutable comparison, stable source hashes, notification memory before application, snapshot/revision decoupling, expected-revision enforcement, and mandatory `PluginLifecycleService.update` directly address those failures.

When evidence is incomplete, the invariant is conservative: return typed discovery/manual/recovery status, retain the active revision and notification evidence, and continue unrelated marketplaces/plugins. Network freshness never outranks a provable working installation or explicit trust authority.

## Implementation summary

Implemented all four checkpoints in dependency order:

- Durable v2 update-policy contracts, source identity/comparison, notification memory, bounded time, and state-family migrations.
- Marketplace inspection, explicit/scheduled refresh, durable scope-local claims, candidate discovery, policy mutation, and notification persistence before application.
- Source-bound automatic authority through the public lifecycle update path, including exact prior trust, project trust, stable source identity, and immutable expected-revision checks.
- A cancellable delay-driven scheduler, Node composition factory, project-v2 state preservation during mutations, and explicit stable package exports with compiled allowlist coverage.

## Deviations and implementation decisions

- The Node timer adapter remains private inside the composition module rather than adding a separately exported infrastructure delay factory; this keeps timer handles and runtime details out of the package API while preserving the required `UpdateDelayPort` boundary.
- Legacy installed evidence remains optional rather than inserting sentinel fields into every migrated record. Automatic authorization treats absent source identities as `legacy-unavailable` and denies automatic application without rewriting otherwise valid installed state. This avoids inventing source identity and preserves lifecycle equality during v1 compatibility rewrites.
- The project v2 constructor now carries validated `marketplaceUpdates` through state mutations instead of resetting them to an empty list. v1 migration still creates no update authority.
- No UI, Pi event registration, recovery invocation, alternate installer, or process-local scheduling authority was added.

## Verification

- Checkpoint commits: `beca3fd`, `c1ce0e5`, `79d0060`, `6a3c09d`.
- `npm test` passed: typecheck, dependency boundaries, 115 unit-test files / 627 tests, build, and compiled package import.
- Dependency cruiser passed with 176 modules and 1,078 dependencies; the explicit compiled package allowlist passed with 434 exports.
