---
id: epic-native-plugin-management-update-policy-offline-startup
kind: feature
stage: done
tags: [compatibility, reliability]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-lifecycle-sync-operations]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Update Policy, Notifications, and Offline Startup

## Brief

Complete the update experience around the existing marketplace refresh and update-policy services. Persist automatic-update settings, schedule refresh independently of startup readiness, emit one calm Pi-facing event for each newly discovered revision, retain unresolved update counts, and invoke the deterministic update operation only when policy, trust, compatibility, and lifecycle safety permit it.

Startup must activate previously installed local projections without network access. Marketplace, remote MCP, Git, npm, and update-service unavailability remain explicit stale/live health after readiness rather than blocking Pi or disabling unrelated plugins.

## Epic context and ownership

- Parent: `epic-native-plugin-management`.
- Builds on the completed packaged host, marketplace discovery, inspection/diagnostics, trusted installation, native lifecycle facade, lifecycle transaction, transition journal, and recovery services.
- Owns native update-policy precedence and consent, one durable notification ledger/outbox, scheduler ownership and timing, automatic-update admission, startup/readiness orchestration, and update/background status exposed by the packaged application.
- Reuses `MarketplaceRefreshService`, `MarketplaceUpdateScheduler`, `MarketplaceUpdatePolicyService`, `PluginLifecycleService` automatic-update authority, `NativeLifecycleOperationService` target expectations, generation CAS, scope locks, transition recovery, configuration/trust/readiness, capability snapshots, and the packaged lifetime gate. It creates no second scheduler, installer, lifecycle path, recovery service, state family, status database, or runtime projection authority.
- Does not own command grammar, terminal controls, notification rendering, badge rendering, command registration, or TUI components. The deterministic-control and Pi-extension features consume the application facade designed here.

## Capability boundaries

- Update discovery and one notice per newly discovered exact revision are independent of automatic-application policy. Manual, disabled, blocked, and offline states still retain discoverable update evidence.
- Automatic update is explicit policy, disabled by default, and never grants source migration. It may authorize changed executable surfaces only for the unchanged marketplace/plugin source identities covered by the consented policy and the existing exact baseline trust authority.
- Automatic application uses the existing lifecycle update transaction and its exact target/candidate expectations. It never writes installed state, projections, transition records, configuration, trust, or recovery evidence directly.
- Required candidate configuration must already be valid. Automatic application never invents values, copies stale revision configuration, opens a prompt, stores a secret, or treats unavailable secret custody as configured.
- Missing MCP/subagent/runtime capability, untrusted or changed project authority, pending recovery, absent reload-capable Pi operation context, source change, stale candidate, or incompatible content blocks that automatic attempt without changing the active revision.
- Pi 0.80.x exposes reload only through a live command context. Scheduled discovery may mark an eligible update `automatic-pending`, but unattended code must not call the startup-only local reconciler or a stale Pi context. The same update facade drains pending work without another consent when a later command/TUI call is admitted through `runWithPiOperationContext`.
- Startup construction is inert. Explicit `start()` opens local authorities, runs durable recovery, reconciles local runtime projections, publishes `ready | degraded | blocked`, and only then starts the one update coordinator if policy permits it.
- Startup, local inspection, and activation of already installed revisions never wait for marketplace, Git, npm, HTTP, OAuth, remote MCP, notification publisher, or update-service reachability. Their failures remain subsystem degradation after local readiness.
- Offline/stale refresh preserves selected marketplace snapshots and active plugin revisions. Cached intent or a failed remote attempt never becomes “refreshed,” “updated,” or activation evidence.
- Shutdown rejects new foreground/background work, aborts and drains scheduler waits and pre-commit network work, lets any possibly committed lifecycle operation settle through normal rollback/recovery precedence, then closes timers, publishers, sessions, runtimes, and durable adapters idempotently.

## Mockups

- Inherits notification tone and update-count placement from `.mockups/screens/epic-native-plugin-management-manager/option-1.html`.
- This feature owns only schema-valid notice/count/status data. It creates no HTML, notification copy renderer, badge component, keybinding, command spelling, or TUI behavior.
- The application status exposes both `unresolvedCount` and `unreadCount`; the later Pi presentation applies the parent mockup decision rather than this feature hard-coding a visual interpretation.

## Grounding and design decisions

- **Discovery posture**: Direct-read only, as explicitly required. Grounding covered project/global rules and conventions; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; the parent epic and selected split-inspector mockup; existing refresh comparison/claims/backoff/notification memory, policy setter, scheduler/delay/clock/claim ports, marketplace catalog candidate tokens, automatic authorization and lifecycle update authority, native lifecycle target/update/session/admission/result contracts, recovery/reload/startup composition, inspection evidence/diagnostics, host/project/configuration/trust/secret state, and focused concurrency/offline tests. No question, nested agent, peer mechanism, source edit, or unrelated substrate edit was used.
- **DAG check**: `.work/bin/work-view --blocking` returned no blockers/cycles for all nine proposed child IDs before dependencies were written. Contracts/state are the root; policy and notifications branch; scheduler and automatic application converge into startup; inspection follows startup evidence; packaged composition follows every behavior branch; integrated acceptance is the only leaf.
- **One native update facade**: Add `NativeUpdateManagementService` as the packaged application boundary for policy preview/apply/status, notice list/acknowledgment, pending automatic application, and update subsystem status. Later command and TUI adapters call this facade; they do not join state, policy resolution, notification memory, lifecycle, trust, configuration, capabilities, or scheduler services themselves.
- **Existing marketplace refresh remains singular**: Explicit marketplace refresh and scheduled update checks call the same `MarketplaceRefreshService`. Refresh owns remote materialization/catalog publication/candidate discovery; it no longer directly renders or independently decides native policy. The one update coordinator consumes its exact durable candidate facts, dispatches notices, and invokes lifecycle where eligible.
- **Policy layers and precedence**: Application policy is a four-level override chain: exact plugin → exact marketplace registration → exact scope → global. Absence means inherit. The global value is always `manual | automatic`; lower levels may be `manual | automatic | inherit`. A local marketplace, source-identity mismatch, legacy-unavailable identity, or stale project authority hard-falls to manual regardless of a broader automatic setting.
- **Policy custody**: Global policy and the user-scope override live in host-config state. The current project-scope override lives in project-local state. Marketplace and plugin overrides remain beside their existing scope-local registration records. Policy evaluation reads those existing authorities; no copied “effective policy” is persisted.
- **Global breadth**: Global automatic consent covers current and future user/current-project registrations at unchanged source identity. Preview reports current affected counts and whether scope inventory is incomplete, but the consent disclosure describes future breadth rather than pretending the current list is exhaustive. Marketplace/plugin source changes still require manual approval.
- **Migration posture**: Host-config and project-local state advance from v3 to v4. Existing `automatic` marketplace preferences migrate to exact marketplace automatic overrides. Existing `manual` values migrate to inheritance under the new global-manual default because the old schema could not distinguish an explicit opt-out from the default. The first v4 explicit manual write is retained as an override. This preserves current behavior while making the new global/scope controls usable.
- **Schedule policy**: One registry owns `paused | conservative | balanced | frequent`. `balanced` preserves the current six-hour success cadence and five-minute-to-six-hour failure backoff. The registry also defines bounded deterministic jitter and inventory/lease renewal intervals. Only the global cadence is persisted as user policy; per-registration next-due/backoff memory remains scope-local.
- **Deterministic jitter**: Jitter is derived with SHA-256 from `{registrationId, outcome, failureCount, anchorAt}` and the cadence registry. There is no process-random scheduling authority. The computed anchor/base/jitter/due tuple is persisted, so restarts and multiple processes agree exactly.
- **Clock semantics**: Durable times use the wall clock; in-process waits use the existing monotonic clock plus abortable delay. Every wake rereads wall time and state. Forward jumps make due work eligible. If wall time is earlier than a persisted schedule anchor, status is `clock-regressed`, scheduled work pauses and polls monotonically, and explicit refresh remains available. Claims/leases whose `startedAt` is in the wall-clock future are treated as expired because generation CAS prevents a stale owner from publishing.
- **Single scheduler ownership**: Extend the existing scheduler with one short durable lease per scope: one user owner and one owner for each current trusted project. A process may own either independently; a session in project A cannot monopolize project B. Lease acquisition/renewal/release uses existing generation coordination. A stale owner must present its lease ID when claiming scheduled refresh work, so it cannot start new work after takeover. Per-marketplace refresh claims remain the publication coalescer; leases reduce duplicate timers/network work but are not correctness locks.
- **Restart schedule**: Startup reads persisted due/backoff and leases. It does not force a refresh merely because the process restarted. Zero/unset due state is immediately eligible only after readiness and an enabled cadence. Future due work sleeps to the earliest durable due, capped by the inventory/lease-renewal poll. Clean shutdown releases owned leases best-effort; crash takeover waits for expiry or a detected clock regression.
- **Notice identity and delivery**: `UpdateNoticeId` hashes exact `{scope, plugin, updateCandidate}`. The durable ledger stores exact registration/candidate/snapshot binding, safe installed/available labels, disposition, unread/acknowledged state, publication state, and automatic-attempt memory. An idempotent `UpdateNotificationPublisherPort` receives the stable ID; a crash after publication but before CAS safely retries and receives `already-published`. Without a publisher, notices stay pending/unread and remain visible through the facade.
- **Unread versus unresolved**: Acknowledgment changes only unread state. Resolution changes only update availability. A user may acknowledge an update that remains unresolved; an automatically applied notice may be resolved but unread until its one event is acknowledged. Status returns both counts and never treats acknowledgment as installation evidence.
- **Notice pruning**: Never prune unread or unresolved notices. Resolve exact old notices as `installed`, `superseded`, `plugin-removed`, or `marketplace-removed`; retain acknowledged resolved identities as dedupe tombstones. Deterministically keep the newest 64 resolved/acknowledged notices per plugin and at most 4,096 such notices per scope, pruning by `{resolvedAt, id}`. If a very old pruned revision reappears it may notify again; this bounded guarantee is explicit rather than an unbounded state promise.
- **Universal notice ordering**: Candidate discovery commits the notice before any automatic attempt. Eligibility and final disposition update that same ID before the publisher dispatches its one event where possible. Publisher failure cannot erase candidate/update state, block later plugins, or mark delivery complete.
- **Automatic eligibility**: Evaluation is ordered and typed: current notice/candidate binding; effective consented policy; remote/unchanged stable identities; exact installed target and no pending transition/recovery; current project key/root/trust; candidate revision and captured capability digest; complete compatibility; baseline exact non-revoked trust; already-valid configuration and available secret custody where required; lifecycle/reload operation context; host admission. It returns one registry-owned reason and never prompts or broadens consent.
- **Exact candidate/revision binding**: Notices retain `registrationId`, `MarketplaceSnapshotToken`, `MarketplaceCandidateId`, `UpdateCandidateKey`, and `AvailableRevision`. Before lifecycle, the catalog resolver must return that exact candidate/snapshot and source identities; lifecycle receives `expectedRevision` plus an exact current `LifecycleTargetExpectation`. A moved ref, refreshed catalog, changed target, or source mismatch is stale/approval-required before promotion.
- **Automatic consent is policy, not candidate trust**: Applying an automatic setting stores only the consented override and consent identifier. It does not create an exact candidate trust grant. The existing lifecycle automatic-update authority still rereads policy, verifies baseline trust, checks project trust/configuration/source identities, and authorizes the prepared candidate for that one expected revision.
- **Pi reload-context limitation**: Background scheduling has no safe Pi 0.80.x reload context. The coordinator records `automatic-pending`/`awaiting-host-context` and does not call lifecycle. `runAutomatic` invoked inside `runWithPiOperationContext` re-evaluates all authority and applies without another consent. A future Pi API may implement the same operation-context port; startup-only `reconcileLocal` is never repurposed for a live-session update.
- **Manual/automatic concurrency**: Both paths enter the existing scope/plugin FIFO scheduler, cross-process scope lock, generation CAS, pending-transition journal, reload observation, and exact target expectations. If manual wins, automatic resolves the notice from authoritative state; if automatic wins, a manual preview becomes current/stale. Different candidates cannot stack because the losing expected target/candidate no longer matches.
- **Cancellation and recovery**: Before possible commit, cancellation leaves the notice unresolved and retryable. After promotion/state may have committed, lifecycle rollback/reconciliation/recovery evidence outranks abort. Rolled back keeps the prior active revision and uses bounded retry; recovery-required blocks further attempts until the existing recovery service settles it. Restart recovery runs before notification reconciliation or scheduler ownership.
- **Project trust/root changes**: Every project policy, refresh lease, candidate, and automatic attempt revalidates the exact current project key, trusted root capability, and trust assessment. A change cancels/skips project work, releases no foreign scope authority, and leaves user-scope scheduling/updates unaffected.
- **Missing secret or runtime capability**: Required sensitive configuration with unavailable custody is `secret-unavailable`; it is not retryable until capability changes. Missing qualified MCP/subagent behavior makes the candidate capability-blocked and preserves the installed revision. A plugin that does not require the absent participant remains eligible.
- **Startup status semantics**: `blocked` means no trustworthy local application/read boundary can be established for essential authority. `degraded` means the host is locally usable but one plugin, recovery item, optional capability used by an installed plugin, or background update subsystem is unavailable. `ready` means all locally required recovery/reconciliation succeeded. Optional absent runtimes with no affected installed plugin do not degrade a clean host.
- **Startup order**: construct inert delegates → bind exact session/project → open local state/config/content/recovery/runtime adapters → capture local capabilities → recover required user/current-project scopes → reread settled authority → rebuild/reconcile local runtime projections → publish immutable startup result and operational application → start the update coordinator for enabled readable scopes → let `resources_discover` publish verified skills. No network or notification publisher participates before the status publication point.
- **Remote failure isolation**: Scheduled marketplace/Git/npm/HTTP failure updates only refresh/backoff and update-subsystem health. Remote MCP connect/auth/tool discovery stays live health. Neither changes startup recovery, selected snapshot, installed revision, local runtime selection, or unrelated scope/plugin status.
- **Lifetime/admission**: One host operation gate admits foreground native operations and background update work. Shutdown quiesces both, aborts scheduler waits/remote work, drains lifecycle work with commit-aware cancellation, then closes publisher/coordinator/runtime/application resources. Reload predecessor/successor handling remains the existing exact ticketed exception.
- **Inspection integration**: Extend the existing update digest and installed projection with policy source, notice disposition, unresolved/unread state, automatic blocked/pending/retry/recovery status, schedule freshness, and subsystem health. Diagnostics remain registry-owned and safe. Inspection never starts, renews, refreshes, publishes, acknowledges, or applies.
- **Packaged API cleanup**: Replace the low-level packaged `marketplace.policy.setApplicationPreference` exposure with `application.updates`. Keep the underlying policy resolver/setter package-private for refresh/lifecycle composition. The root reusable package may export schemas/factories deliberately, but packaged callers receive no direct state or automatic-lifecycle bypass.
- **Foundation timing**: Code-first. Current foundation assertions already require non-blocking update checks, per-marketplace automatic updates, exact source/trust/configuration/lifecycle authority, offline startup, stale/live health, and active-revision preservation. Implementation updates only assertions made false by final names/guarantees; omission is not drift.

## Architectural choice

### Option A — keep policy/timers/notifications inside `MarketplaceRefreshService`

The existing refresh service could grow global/scope/plugin settings, UI acknowledgment, leases, startup, and lifecycle-context checks. It would combine remote acquisition, policy consent, outbox delivery, Pi lifetime, and automatic operations in one already-large service, while still exposing no coherent later command/TUI facade. Rejected.

### Option B — add a generic durable job scheduler, outbox database, and update worker

A general worker system could model refresh, notification, and automatic-update jobs independently. It would introduce a second scheduler, seventh state authority, duplicate lease/recovery semantics, and a path around the lifecycle transaction. It would also be disproportionate to two bounded job kinds. Rejected.

### Option C — one native update facade/coordinator over evolved existing state, refresh scheduler, and lifecycle authority (chosen)

Evolve the existing state records and scheduler with hierarchical policy, scope leases, persisted deterministic timing, and a durable notice ledger. Add one application facade and one coordinator that consume the existing refresh and lifecycle services. Package startup owns when that coordinator may start and the existing lifetime gate owns all work.

**Choice**: Option C. It preserves every current authority, gives later commands/TUI one deterministic surface, and makes offline startup and Pi reload-context limitations explicit without inventing a daemon or installer.

## Trickiest unit first

The hardest unit is safely combining scheduled automatic policy with Pi's reload boundary. Marketplace discovery can run after readiness in background, but Pi 0.80.x permits `ctx.reload()` only in a live extension command call. Calling lifecycle anyway would either roll back every candidate, use a stale context, or misuse startup-only local reconciliation and leave Pi's skill resources inconsistent.

The design separates authorization from executable admission. Discovery durably records an exact notice and evaluates policy. When no live reload-capable operation context exists, the notice becomes `automatic-pending` and remains unresolved. The same `NativeUpdateManagementService.runAutomatic` later runs inside `runWithPiOperationContext`, re-resolves the exact candidate, rebuilds the exact current target expectation, reruns policy/trust/configuration/capability/project checks, and calls the existing lifecycle automatic-update path. There is no second consent and no direct mutation. If Pi later offers a safe background reload capability, only the operation-context port changes.

The fallback is truthful manual availability, never partial activation. A candidate blocked by absent context/capability/secret/trust/recovery stays installed-old and visible. Startup and unrelated plugins remain ready.

## Exact public application contract

### Unit 1: Hierarchical policy, schedule/lease/notice state, IDs, and migrations

**Story**: `epic-native-plugin-management-update-policy-offline-startup-contracts-state`

**Files**:
- `src/domain/update-policy.ts`
- `src/domain/state/config-state.ts`
- `src/domain/state/project-state.ts`
- `src/domain/state/codec.ts`
- `src/domain/state/registry.ts`
- `src/application/native-update-contract.ts`
- `src/application/native-update-identifiers.ts`
- `src/application/marketplace-update-state.ts`
- `src/infrastructure/state/lifecycle-state-defaults.ts`
- `test/domain/update-policy.test.ts`
- `test/domain/state/config-state.test.ts`
- `test/domain/state/project-state.test.ts`
- `test/application/native-update-contract.test.ts`
- `test/application/native-update-identifiers.test.ts`

```typescript
export const UpdateApplicationModeSchema = z.enum(["manual", "automatic"]);
export const UpdateApplicationOverrideSchema = z.enum(["inherit", "manual", "automatic"]);
export const UpdateCadenceSchema = z.enum(["paused", "conservative", "balanced", "frequent"]);

export const UpdatePolicyTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }).strict().readonly(),
  z.object({ kind: z.literal("scope"), scope: ScopeReferenceSchema }).strict().readonly(),
  z.object({ kind: z.literal("marketplace"), scope: ScopeReferenceSchema,
    registrationId: MarketplaceRegistrationIdSchema }).strict().readonly(),
  z.object({ kind: z.literal("plugin"), scope: ScopeReferenceSchema,
    plugin: PluginKeySchema }).strict().readonly(),
]);

export const UpdatePolicyChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("application"), target: UpdatePolicyTargetSchema,
    mode: UpdateApplicationOverrideSchema }).strict().readonly(),
  z.object({ kind: z.literal("cadence"), target: z.object({ kind: z.literal("global") }).strict().readonly(),
    cadence: UpdateCadenceSchema }).strict().readonly(),
]).superRefine(/* global application cannot inherit */);

export const UpdateScheduleMemorySchema = z.object({
  anchorAt: EpochMillisecondsSchema,
  baseDelayMs: z.number().int().positive().safe(),
  jitterMs: z.number().int().safe(),
  dueAt: EpochMillisecondsSchema,
  reason: z.enum(["success", "failure", "legacy"]),
}).strict().readonly().superRefine(/* dueAt === anchorAt + baseDelayMs + jitterMs */);

export const UpdateSchedulerLeaseSchema = z.object({
  id: UpdateSchedulerLeaseIdSchema,
  startedAt: EpochMillisecondsSchema,
  renewedAt: EpochMillisecondsSchema,
  expiresAt: EpochMillisecondsSchema,
}).strict().readonly();

export const UpdateNoticeSchema = z.object({
  id: UpdateNoticeIdSchema,
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  registrationId: MarketplaceRegistrationIdSchema,
  snapshot: MarketplaceSnapshotTokenSchema,
  candidateId: MarketplaceCandidateIdSchema,
  candidate: UpdateCandidateKeySchema,
  available: AvailableRevisionSchema,
  display: z.object({ installed: z.string().min(1), available: z.string().min(1) }).strict().readonly(),
  disposition: UpdateNoticeDispositionSchema,
  publication: z.enum(["pending", "published"]),
  unread: z.boolean(),
  discoveredAt: EpochMillisecondsSchema,
  acknowledgedAt: EpochMillisecondsSchema.optional(),
  resolution: z.object({ kind: z.enum(["installed", "superseded", "plugin-removed", "marketplace-removed"]),
    at: EpochMillisecondsSchema }).strict().readonly().optional(),
  automatic: AutomaticUpdateAttemptMemorySchema.optional(),
}).strict().readonly();
```

Host-config v4 adds `{ global: { application, cadence }, scope: { application?, schedulerLease? } }`. Project-local v4 adds `{ scope: { application?, schedulerLease? } }`. Registration v4 removes the ambiguous scalar `updateApplication`, adds `applicationOverride?`, source-bound `pluginOverrides`, v2 refresh schedule memory, and `notices`. Exact migrations preserve registration origin, source, snapshots, claims, backoff, and notice candidates.

**Acceptance criteria**:
- [ ] Strict schemas reject unknown/impossible targets, global inherit, duplicate policy/notice identities, plugin overrides for another marketplace/source, malformed lease windows, inconsistent schedule arithmetic, impossible ack/resolution/publication state, and path/secret/native-cause fields.
- [ ] Pure resolution proves plugin > marketplace > scope > global and hard-manual source/local/legacy guards across user/current-project scopes.
- [ ] Notice, consent, policy-preview, and scheduler-lease IDs bind exact semantic evidence and are stable across insertion order/restart.
- [ ] v1→v4 host and project migrations plus fresh generation-zero defaults are deterministic; v3 automatic preferences remain automatic while v3 manual records inherit global-manual.

### Unit 2: Deterministic policy preview, consent, apply, and status

**Story**: `epic-native-plugin-management-update-policy-offline-startup-policy-facade`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-contracts-state`

**Files**:
- `src/application/update-policy-resolution.ts`
- `src/application/native-update-policy-service.ts`
- `src/application/marketplace-update-policy-service.ts`
- `src/application/ports/update-policy-authority.ts`
- `test/application/update-policy-resolution.test.ts`
- `test/application/native-update-policy-service.test.ts`
- `test/integration/native-update-policy-concurrency.test.ts`

```typescript
export interface NativeUpdatePolicyService {
  preview(request: UpdatePolicyChange, signal: AbortSignal): Promise<NativeUpdatePolicyPreviewResult>;
  apply(request: Readonly<{
    change: UpdatePolicyChange;
    expectedPreviewId: UpdatePolicyPreviewId;
    consent?: Readonly<{ kind: "grant"; consentId: UpdatePolicyConsentId }>;
  }>, signal: AbortSignal): Promise<NativeUpdatePolicyApplyResult>;
  status(request: NativeUpdateStatusRequest, signal: AbortSignal): Promise<NativeUpdatePolicyStatus>;
}

export interface UpdatePolicyAuthorityPort {
  resolve(request: Readonly<{
    scope: ScopeContext;
    registrationId: MarketplaceRegistrationId;
    plugin: PluginKey;
    marketplaceSourceIdentity: StableSourceIdentity;
    pluginSourceIdentity: StableSourceIdentity;
  }>, signal: AbortSignal): Promise<EffectiveUpdatePolicy>;
}
```

Preview binds the authoritative user generation and, for project targets, exact project generation/key/root/trust epoch. It reports effective before/after values, the winning level, current affected counts, inventory completeness, source guards, cadence effect, and a registry-owned automatic-consent disclosure. Apply reruns preview, requires exact preview/consent IDs, then performs one short generation mutation in the owning scope. Global application changes mutate only user host config; later project evaluations read that authority rather than copied project values.

**Acceptance criteria**:
- [ ] Preview/apply are network-free, strict, deterministic, and source/project bound; changed target/source/generation/root/trust/consent returns typed stale/rejected without a write.
- [ ] Automatic at any level requires the exact breadth disclosure; manual/inherit/cadence changes cannot forge or retain unrelated consent.
- [ ] Two processes applying one preview produce changed plus stale/current convergence through existing CAS.
- [ ] Status explains persisted overrides, effective value and winning level, hard source guards, cadence, due/clock state, lease ownership as `self | other | none`, and incomplete inventory without exposing lease IDs or paths.

### Unit 3: Durable notice ledger, idempotent publisher, counts, acknowledgment, and pruning

**Story**: `epic-native-plugin-management-update-policy-offline-startup-notification-ledger`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-contracts-state`

**Files**:
- `src/application/update-notification-service.ts`
- `src/application/ports/update-notification-publisher.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/update-contract.ts`
- `test/application/update-notification-service.test.ts`
- `test/application/marketplace-refresh-service.test.ts`
- `test/integration/update-notification-delivery.test.ts`

```typescript
export interface UpdateNotificationPublisherPort {
  publish(event: UpdateNotificationEvent, signal: AbortSignal): Promise<"published" | "already-published">;
}

export interface UpdateNotificationService {
  record(discoveries: readonly ExactUpdateDiscovery[], signal: AbortSignal): Promise<readonly UpdateNoticeId[]>;
  dispatch(request: Readonly<{ limit?: number }>, signal: AbortSignal): Promise<UpdateNotificationDispatchResult>;
  list(request: NativeUpdateNotificationListRequest, signal: AbortSignal): Promise<NativeUpdateNotificationPage>;
  acknowledge(request: Readonly<{ ids: readonly UpdateNoticeId[] }>, signal: AbortSignal): Promise<NativeUpdateAcknowledgmentResult>;
  reconcile(signal: AbortSignal): Promise<NativeUpdateNoticeReconciliationResult>;
}
```

Refresh commits exact candidate bindings to the ledger before returning. The service updates disposition, resolves installed/superseded/removed candidates from authority, publishes only pending records, marks publication after idempotent publisher evidence, and prunes only resolved+acknowledged tombstones under the declared limits.

**Acceptance criteria**:
- [ ] Repeated refresh, restart, two processes, publication retry/lost response, automatic failure, and acknowledgment produce one publisher-visible event per retained exact candidate ID.
- [ ] Publisher absence/failure leaves pending state and does not fail refresh/startup, acknowledge a notice, or lose counts.
- [ ] Acknowledgment is idempotent and cannot resolve/install; lifecycle/state reconciliation alone resolves notices.
- [ ] Unread/unresolved records never prune; deterministic tombstone pruning preserves current candidate and count identity.

### Unit 4: One scheduler with scope leases, persisted cadence/backoff/jitter, and clock handling

**Story**: `epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-policy-facade`, `epic-native-plugin-management-update-policy-offline-startup-notification-ledger`

**Files**:
- `src/application/marketplace-update-scheduler.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/update-schedule.ts`
- `src/application/ports/update-delay.ts`
- `src/application/ports/update-scheduler-lease-id.ts`
- `src/infrastructure/node/node-identifiers.ts`
- `src/composition/create-marketplace-update-services.ts`
- `test/application/update-schedule.test.ts`
- `test/application/marketplace-update-scheduler.test.ts`
- `test/integration/marketplace-scheduler-multiprocess.test.ts`

```typescript
export interface MarketplaceUpdateScheduler {
  run(signal: AbortSignal): Promise<void>;
  status(signal: AbortSignal): Promise<UpdateSchedulerStatus>;
}

export type UpdateSchedulerStatus = Readonly<{
  state: "disabled" | "standby" | "running" | "clock-regressed" | "degraded" | "stopped";
  scopes: readonly Readonly<{
    scope: ScopeReference;
    ownership: "self" | "other" | "none";
    nextAt?: EpochMilliseconds;
  }>[];
}>;
```

The scheduler acquires/renews scope leases through policy authority, asks refresh for exact due scope/registration jobs, supplies lease evidence to scheduled claims, dispatches/reconciles notices, and waits until the earliest durable refresh or automatic-retry due bounded by inventory/lease polling. Explicit refresh bypasses cadence but still coalesces on active registration claims.

**Acceptance criteria**:
- [ ] Construction starts no timer/I/O; `run` alone owns waits and propagates abort.
- [ ] Restart honors persisted future due/backoff; first-use due runs only after explicit scheduler start; deterministic jitter is byte-identical across processes.
- [ ] Two processes yield one owner per scope while allowing different project owners; stale/expired/future-clock lease holders cannot start new scheduled claims.
- [ ] Forward/backward clock jumps, lease/claim expiry, renewal loss, scheduled failure, explicit bypass, local-source exclusion, incomplete inventory, and shutdown are deterministic and preserve active/catalog authority.

### Unit 5: Automatic eligibility and exact lifecycle application

**Story**: `epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-policy-facade`, `epic-native-plugin-management-update-policy-offline-startup-notification-ledger`

**Files**:
- `src/application/automatic-update-eligibility.ts`
- `src/application/automatic-update-coordinator.ts`
- `src/application/automatic-update-authorization.ts`
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/native-lifecycle-target.ts`
- `src/application/ports/update-activation-context.ts`
- `test/application/automatic-update-eligibility.test.ts`
- `test/application/automatic-update-coordinator.test.ts`
- `test/application/automatic-update-authorization.test.ts`
- `test/integration/native-automatic-update-lifecycle.test.ts`

```typescript
export interface UpdateActivationContextPort {
  availability(): "available" | "unavailable";
}

export interface AutomaticUpdateCoordinator {
  evaluate(request: Readonly<{ noticeId: UpdateNoticeId }>, signal: AbortSignal): Promise<AutomaticUpdateEligibility>;
  run(request: Readonly<{ noticeIds?: readonly UpdateNoticeId[]; limit?: number }>, signal: AbortSignal): Promise<AutomaticUpdateRunResult>;
}
```

Eligibility uses one registry and returns `eligible | manual | approval-required | stale | project-untrusted | recovery-required | configuration-required | secret-unavailable | capability-unavailable | awaiting-host-context | retryable`. For `eligible`, resolve exact catalog candidate/snapshot, derive exact current target expectation, then call the existing `PluginLifecycleService.update` with `origin: "automatic-update"`, `expectedRevision`, exact target expectation, entry/source context, and current configuration context. Lifecycle remains responsible for automatic authorization, preparation, promotion, journal, reload observation, rollback, and recovery.

**Acceptance criteria**:
- [ ] Every policy/consent/source/project/trust/configuration/secret/capability/recovery/context gate is proved before lifecycle; forged notice/origin cannot bypass lifecycle rereads.
- [ ] Moved refs, catalog replacement, revision equality, source identity change, and target generation/revision/activation/pending changes produce exact current/stale/manual outcomes before promotion.
- [ ] Concurrent manual/automatic same/different-candidate updates converge through existing scheduler/lock/CAS; one winner cannot overwrite or disable the other revision.
- [ ] Cancellation before commit, commit ambiguity, reload failure, rollback, recovery-required, restart settlement, and bounded retry preserve prior active revision and truthful notice state.
- [ ] Missing Pi operation context records pending and makes zero lifecycle calls; an admitted later call applies without a second consent.

### Unit 6: Offline startup/readiness and background task orchestration

**Story**: `epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock`, `epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application`

**Files**:
- `src/application/host-observation-contract.ts`
- `src/composition/packaged-host-startup.ts`
- `src/composition/host-status-service.ts`
- `src/composition/background-update-coordinator.ts`
- `src/composition/complete-plugin-reload.ts`
- `test/composition/packaged-host-startup.test.ts`
- `test/composition/host-status-service.test.ts`
- `test/composition/background-update-coordinator.test.ts`

```typescript
export const HostReadinessStatusSchema = z.enum(["ready", "degraded", "blocked"]);
export const HostStatusSnapshotSchema = z.object({
  status: HostReadinessStatusSchema,
  local: z.object({
    recovery: z.enum(["settled", "degraded", "blocked"]),
    runtime: z.enum(["reconciled", "degraded", "blocked"]),
  }).strict().readonly(),
  update: z.object({
    state: z.enum(["disabled", "standby", "running", "clock-regressed", "degraded", "stopped"]),
    unresolvedCount: z.number().int().nonnegative(),
    unreadCount: z.number().int().nonnegative(),
  }).strict().readonly(),
  blocked: z.array(HostBlockedPluginSchema).readonly(),
  capabilities: HostCapabilitiesSchema,
}).strict().readonly();

export interface HostStatusService {
  snapshot(): HostStatusSnapshot;
}
```

`packaged-host-startup.ts` names and enforces the local order. `background-update-coordinator.start()` is called only after the immutable initial local status and application are published; it starts the existing scheduler loop and catches subsystem failures into status. It never participates in initial recovery/reconciliation.

**Acceptance criteria**:
- [ ] Factory construction is filesystem/network/process/timer/recovery inert; explicit start performs local work only through readiness publication.
- [ ] Recovery always precedes local reconciliation; notice reconciliation and scheduler ownership always follow both.
- [ ] Offline/hung/failing fetch, npm/Git, publisher, remote MCP, and update adapters cannot delay initial status or disable an existing revision/unrelated plugin.
- [ ] Host-wide versus plugin/subsystem failure maps truthfully to blocked/degraded/ready, including clean optional-runtime absence.
- [ ] Repeated start/close, failed partial start, and restart after recovery leave no background task or false readiness.

### Unit 7: Inspection/diagnostic update and host-status integration

**Story**: `epic-native-plugin-management-update-policy-offline-startup-inspection-status-integration`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-policy-facade`, `epic-native-plugin-management-update-policy-offline-startup-notification-ledger`, `epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator`

**Files**:
- `src/application/ports/native-inspection-evidence.ts`
- `src/application/native-inspection-contract.ts`
- `src/application/native-installed-inspection.ts`
- `src/application/native-diagnostic-registry.ts`
- `src/composition/native-inspection-evidence.ts`
- `src/composition/create-native-inspection-service.ts`
- `test/application/native-installed-inspection.test.ts`
- `test/application/native-diagnostic-registry.test.ts`
- `test/composition/native-inspection-evidence.test.ts`

Extend lifecycle/update views with `automatic-pending`, `capability-blocked`, `configuration-blocked`, and `awaiting-recovery`; add policy winning level, notice unread/resolution, schedule freshness, and host update subsystem status. The snapshot `updateDigest` binds every policy/notice/schedule/status field returned. New diagnostics use registry-owned summaries/actions only and never expose owner IDs, source credentials, paths, secret/provider text, native causes, or publisher errors.

**Acceptance criteria**:
- [ ] Inspection reports effective policy, available revision, unread/unresolved, automatic pending/applied/retry/recovery, clock regression, and remote failure from one snapshot without performing work.
- [ ] Project trust/root, policy, notice, schedule lease, startup/background, catalog, target, or capability changes make the snapshot stale.
- [ ] Offline stale catalog and remote MCP/update failures are degraded while exact active local revision remains active; pending/recovery mismatches remain blocking.
- [ ] Split-inspector fixture data validates against updated schemas with no rendering code.

### Unit 8: Packaged facade, operation admission, composition, and clean shutdown

**Story**: `epic-native-plugin-management-update-policy-offline-startup-packaged-lifetime-composition`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock`, `epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application`, `epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator`, `epic-native-plugin-management-update-policy-offline-startup-inspection-status-integration`

**Files**:
- `src/application/native-update-management-service.ts`
- `src/composition/create-native-update-management-service.ts`
- `src/composition/create-marketplace-discovery-services.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/pi/pi-operation-context.ts`
- `src/index.ts`
- `src/pi/index.ts`
- `test/application/native-update-management-service.test.ts`
- `test/composition/create-native-update-management-service.test.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/integration/packaged-host-shutdown.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

```typescript
export interface NativeUpdateManagementService {
  previewPolicy(request: UpdatePolicyChange, signal: AbortSignal): Promise<NativeUpdatePolicyPreviewResult>;
  applyPolicy(request: NativeUpdatePolicyApplyRequest, signal: AbortSignal): Promise<NativeUpdatePolicyApplyResult>;
  status(request: NativeUpdateStatusRequest, signal: AbortSignal): Promise<NativeUpdateStatus>;
  notifications(request: NativeUpdateNotificationListRequest, signal: AbortSignal): Promise<NativeUpdateNotificationPage>;
  acknowledge(request: NativeUpdateAcknowledgmentRequest, signal: AbortSignal): Promise<NativeUpdateAcknowledgmentResult>;
  runAutomatic(request: NativeAutomaticUpdateRunRequest, signal: AbortSignal): Promise<NativeAutomaticUpdateRunResult>;
}

export type PackagedPluginHostApplication = Readonly<{
  operations: NativeLifecycleOperationService;
  trustedInstallation: TrustedInstallationService;
  updates: NativeUpdateManagementService;
  inspection: NativeInspectionService;
  status: HostStatusService;
  // existing safe capabilities retained
}>;
```

The host operation gate wraps both `operations` and `updates.runAutomatic`; policy/status/list/ack remain safe non-reload operations but still obey host quiescence/project binding. Background coordinator gets the same internal services through private composition, not the public application object. Shutdown order is coordinator stop/drain → quiesce new foreground work → runtime event admission stop → possibly committed operations settle → publishers/sessions/runtime/stores close in reverse acquisition order.

**Acceptance criteria**:
- [ ] Packaged callers have one update facade and no raw policy setter, scheduler, lifecycle automatic origin, notice mutation helper, lease, publisher, state store, or timer handle.
- [ ] Later subcommand/TUI callers can implement every update settings/status/count/ack/automatic action from `application.updates` without service joins.
- [ ] Background and manual operations share admission/concurrency/reload context; quiescence rejects new work while an admitted possibly committed update settles truthfully.
- [ ] Clean/abort/reload/partial-failure shutdown drains timers, refresh, notification dispatch, automatic attempts, operation sessions, and adapters exactly once.
- [ ] Source and packed exports remain schema-derived and explicit; no command/TUI rendering or Pi notification call lands here.

### Unit 9: Clean-environment, restart, multiprocess, offline, and failure acceptance

**Story**: `epic-native-plugin-management-update-policy-offline-startup-integrated-acceptance`
**Depends on**: `epic-native-plugin-management-update-policy-offline-startup-packaged-lifetime-composition`

**Files**:
- `test/integration/native-update-policy-precedence.test.ts`
- `test/integration/native-update-notification-restart.test.ts`
- `test/integration/native-update-scheduler-multiprocess.test.ts`
- `test/integration/native-automatic-update-races.test.ts`
- `test/integration/packaged-host-offline-startup.test.ts`
- `test/integration/packaged-host-update-shutdown.test.ts`
- `test/fixtures/native-inspection/split-inspector.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

Use built package/local adapters where the feature boundary matters, shared durable state across child processes for scheduler ownership, deterministic fake clock/delay/publisher for timing, and existing real lifecycle/recovery integration fixtures rather than duplicating secure materializer or transaction internals.

**Acceptance criteria**:
- [ ] Clean Pi environment with no Claude/Codex, network, marketplace, secret provider, MCP fork, or subagent fork starts ready with empty local state and no eager timer/network work.
- [ ] Restart preserves future due/backoff, notice identity/publication/ack/counts, policy precedence, and active revisions; crash recovery settles before any retry.
- [ ] Two processes prove one scheduler owner per scope, claim expiry/takeover, clock jumps, one retained publisher event, and safe manual/automatic races.
- [ ] Project trust/root change, missing required secret, incompatible/missing fork capability, moved revision, source change, cancellation, rollback, recovery-required, stale catalogs, offline remote failure, and clean shutdown preserve the prior active revision and isolate siblings.
- [ ] Full `npm test` passes typecheck, boundaries, focused integration, build, packed import, and exact public allowlists.

## Implementation order

1. `epic-native-plugin-management-update-policy-offline-startup-contracts-state`
2. In parallel after 1:
   - `epic-native-plugin-management-update-policy-offline-startup-policy-facade`
   - `epic-native-plugin-management-update-policy-offline-startup-notification-ledger`
3. After policy/notice authority:
   - `epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock`
   - `epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application`
4. `epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator`
5. `epic-native-plugin-management-update-policy-offline-startup-inspection-status-integration`
6. `epic-native-plugin-management-update-policy-offline-startup-packaged-lifetime-composition`
7. `epic-native-plugin-management-update-policy-offline-startup-integrated-acceptance`

One feature owner should normally carry the graph. State migration, refresh publication, scheduler leases, notice delivery, lifecycle admission, and startup lifetime form one integrated authority contract; stories are durable checkpoints, not independent competing implementations.

## Simplification

- Extend `domain/update-policy.ts`, host-config/project-local families, `MarketplaceRefreshService`, `MarketplaceUpdateScheduler`, existing policy service, lifecycle automatic authority, packaged operation gate, and inspection update digest rather than adding parallel state/services with overlapping authority.
- Move the refresh service's direct automatic/render-intent branch behind the native coordinator; retain one candidate discovery path and one lifecycle update path.
- Replace the packaged low-level marketplace policy setter with `application.updates`; do not retain two public policy APIs without a demonstrated external compatibility requirement.
- Use cadence presets and hash-derived jitter instead of cron syntax, arbitrary duration matrices, a random port, generic queues, or a worker framework.
- Use stable idempotent notice IDs and the existing state CAS instead of a notification database, in-memory notified set, or best-effort “emitted” boolean.
- Reuse lifecycle operation target expectations, scope/plugin scheduling, locks, journals, reload observations, and recovery; do not duplicate their detailed transaction tests.
- No existing low-value test is identified for removal at design time. Replace assertions tied to v3 `updateApplication`/`phase: emitted` with v4 policy/ledger contracts rather than maintaining compatibility-only branches.

## Testing

- **Policy/state contracts**: v1–v4 migration, defaults, precedence/source guards, consent IDs, target binding, strict field exclusion, and generation CAS. Protects durable authority and broad automatic consent.
- **Notice boundary**: exact candidate identity, two-process discovery, idempotent publisher lost-response retry, ack versus resolution, counts, supersession, and pruning. Protects the one-event/unread guarantees.
- **Schedule/lease matrix**: cadence presets, success/failure jitter, restart, due selection, explicit bypass, lease renewal/takeover, active/expired/future claims, forward/backward clocks, local source, incomplete inventory, and abort. Protects deterministic multi-process operation.
- **Automatic eligibility table**: policy level, consent, stable source, exact target/candidate, project root/trust, compatibility and missing runtime fork, baseline trust, configuration/secret custody, pending recovery, and reload context. Protects “automatic means authorized and safe,” not “best effort.”
- **Lifecycle race integration**: concurrent manual/automatic same and different candidates, moved ref, cancellation before/after possible commit, rollback, recovery-required, and restart. Existing lifecycle suites remain transaction detail authority.
- **Startup/offline integration**: construction/start event ordering with fail-on-call network/publisher/remote MCP spies, stale catalogs, blocked sibling isolation, and status transitions. Protects the offline critical path.
- **Lifetime integration**: scheduler/refresh/publisher/automatic/manual operation in each wait/prepare/commit/recovery phase during shutdown and reload successor overlap. Protects no leaks and commit-aware cancellation.
- **Clean packaged acceptance**: packed extension, generation zero, no foreign installations/forks/network, local inspection/status, and idempotent close. Protects standalone distribution.

## Risks

- **Automatic application is delayed without a reload-capable Pi context**: Pi 0.80.x cannot safely reload from a timer. Mitigation: durable `automatic-pending`, one notice, truthful status, and automatic drain through the same facade at the next admitted command/TUI operation. Fallback: manual update remains available; never misuse local reconciliation.
- **Global automatic policy is intentionally broad**: it can cover future third-party registrations. Mitigation: exact breadth disclosure/consent, preview completeness flag, source-identity hard guard, baseline trust, and per-scope/marketplace/plugin manual overrides. Fallback: default global manual.
- **Wall-clock leases cannot prove a live process**: clock jumps and pauses can create duplicate work. Mitigation: leases are optimization only; future-start evidence expires, per-registration claims and generation CAS gate publication, and lifecycle exact expectations converge application. Fallback: duplicate network work, never duplicate authority.
- **Publisher idempotence is a real port contract**: a nonconforming renderer could duplicate a visible event after lost response. Mitigation: stable notice ID, conformance test, durable pending state, and no “published” mark without publisher evidence. Fallback: ledger/count remains correct even if an adapter violates visual dedupe.
- **Notification tombstones are bounded**: a revision older than retained history may notify again if it reappears. Mitigation: generous deterministic per-plugin/scope caps and pruning only resolved+acknowledged records. Fallback: truthful occasional old-revision notice rather than unbounded state or a false forever guarantee.
- **State v4 touches shared registration documents**: refresh, registration, project sync, and adoption can accidentally drop policy/notice/lease fields. Mitigation: one v4 constructor/mutation projection, preservation tests at every writer, and no hand-built document copies. Fallback: fail schema/CAS before commit.
- **Startup status can be misclassified by optional capabilities**: missing forks should not block an unrelated clean host. Mitigation: derive host status from affected installed projections and distinguish host-wide, plugin-specific, and background subsystem evidence. Fallback: degrade honestly, preserve local management.

## Pre-mortem

The design fails if construction starts a timer, startup waits for network, a project process owns every project's scheduler, restart forgets due/notified state, backward clock movement spins refresh, acknowledgment hides an unresolved update, broad policy crosses a source change, missing secret/runtime capability still reaches lifecycle, manual and automatic operations stack transitions, abort reports cancellation after commit, rollback loses the active revision, or shutdown closes stores beneath an admitted operation.

The chosen boundaries address each failure directly: explicit post-readiness start, per-scope leases plus exact claims/CAS, persisted deterministic schedule and notice IDs, separate unread/resolution state, source-bound effective policy and lifecycle authority, exact candidate/target expectations, commit-aware lifecycle results, recovery-before-retry, and one host operation/lifetime gate. When any required evidence is unavailable, the conservative outcome is visible pending/manual/degraded status with the previous active revision retained.

## Implementation completion

All nine child checkpoints are done. The implementation landed as a single authority chain: v4 durable state → hierarchical policy and notice ledger → lease-fenced scheduler → eligibility/lifecycle coordinator → recovery-first packaged startup → inspection/status → admitted `application.updates` facade. The packaged marketplace surface no longer exposes the lower-level policy setter.

Verification at review entry: `npm test` passed typecheck, dependency boundaries (358 modules / 2,599 dependencies), 274 test files / 1,333 tests, build, 783 exact public exports, 3 Pi exports, and isolated packed Pi startup. Feature is ready for integrated review.

The owner pre-review found and fixed four integration gaps before this transition: post-refresh ledger/automatic maintenance now runs on the existing scheduler cycle; an initially disabled background owner can be awakened after policy/registration changes; persisted automatic retry backoff is honored and lifecycle completion preserves concurrent acknowledgment; and marketplace policy can be set before its first plugin is installed. Live facade reads/actions now also refresh host unread/unresolved counts.

## Review (2026-07-17)

**Verdict**: Approve after fixes

**Blockers**: Eight sole-review blockers were accepted and fixed inline: current-project-only historical scope authority; one cadence-independent wakeable maintenance owner and ordered reconciliation/application/publication; project policy CAS bound to live root/trust epoch; internally derived exact candidate revision/configuration custody; fresh-signal post-lifecycle ledger settlement; detached locally ready startup; one shared safe scheduler projection; and real SQLite child-process/packaged-startup acceptance.

**Important**: Parked `idea-prune-update-notifications-per-scope` and `idea-report-local-source-update-policy-guard` as unbound follow-up ideas.

**Nits**: none

**Rejected**: none

**Notes**: Effective review weight was `standard`. This record closes the sole independent pass after receiver-adjudicated blocker fixes; no repeat review, nested agent, or second review pass ran. All nine child stories remain `done`. Focused update/state/lifecycle/project/process/startup/security verification passed. Final `npm test` passed typecheck, dependency boundaries (359 modules / 2,627 dependencies), 275 test files / 1,367 tests, build, 785 exact public exports, 3 Pi exports, and isolated packed Pi extension startup.
