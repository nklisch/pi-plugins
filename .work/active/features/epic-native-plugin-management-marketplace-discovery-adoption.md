---
id: epic-native-plugin-management-marketplace-discovery-adoption
kind: feature
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-packaged-host-composition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Marketplace Discovery and Foreign Registration Adoption

## Brief

Deliver the marketplace catalog capability behind the native manager: register, remove, list, refresh, and browse native marketplace sources in user or project scope, and discover read-only Claude/Codex marketplace registrations for explicit adoption into Plugin Host authority. Produce one deterministic catalog view with source provenance, refresh state, available revisions, and safe stale/offline evidence.

This capability ends at candidate discovery. It does not install or update plugins, mutate foreign files, render the terminal manager, or reinterpret plugin compatibility.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Depends on the packaged host for scope locations, persisted registration custody, source acquisition, and lifecycle-safe startup.
- Owns marketplace registration persistence, foreign registration comparison/adoption decisions, refresh orchestration, catalog merge/order rules, and candidate lookup consumed by later inspection/install operations.
- Reuses `MarketplaceRefreshService`, registration and foreign-state ports, source resolvers, acquisition safety limits, and the completed normalized marketplace model.

## Capability boundaries

- Native registrations and adopted registrations are explicit Plugin Host state; foreign marketplace files remain read-only inputs and never become hidden startup authority.
- User/project registrations with the same display name remain scope-qualified. Source identity, not display order, controls refresh and removal.
- Browse output is deterministic across registration and network completion order and preserves exact source/revision provenance.
- Refresh cancellation, unavailable networks, malformed sources, moved local roots, and partial source failures produce per-source results without corrupting the last known catalog.
- Offline browse uses previously verified local/catalog evidence and clearly labels staleness; startup is not coupled to refresh.
- Feature design must include native and foreign registration fixtures but must not duplicate foreign reader, acquisition, compatibility, or transaction test matrices.

## Mockup inheritance

The selected split-inspector manager's marketplace mode is inherited as the eventual consumer. This feature owns the catalog/read model only; `.mockups/screens/epic-native-plugin-management-manager/option-1.html` remains authoritative and rendering stays with `epic-native-plugin-management-pi-extension-manager`.

## Grounding and design decisions

- **Discovery posture**: Direct-read only, as required. Grounding covered all foundation and compatibility documents, the parent epic and inherited manager mockup, the completed packaged-host design and implementation surface, normalized Claude/Codex readers and merger, secure materializers/content store, lifecycle state schemas/CAS/locks, refresh/update services, adoption services/readers, project/trust/secret boundaries, and their representative tests. No question, nested agent, peer mechanism, or `.work/bin/work-view` invocation was used.
- **Registry authority**: Existing lifecycle state remains the only native registry. User registrations are `hostConfig.records` paired with `installed.marketplaces`; current-project registrations are `project.marketplaceUpdates` paired with `project.marketplaces`. Every new add/refresh changes the record and selected snapshot together in one verified generation mutation. A migrated legacy user record that predates snapshot publication is retained as explicit `not-materialized` cache status and can be repaired by add/refresh; no snapshot is fabricated. No registry JSON file, catalog database, mutable current symlink, or parallel state engine is added.
- **Project scope meaning**: This capability persists a machine-local registration under the exact current `ProjectKey`. It does not write `.pi/plugins.json`; portable project-intent reconciliation remains owned by the later explicit project-sync capability. Project registrations accept only `PortableMarketplaceSourceSchema` sources and current Pi project trust, so they neither hide machine paths in portable intent nor imply that intent was synchronized.
- **Registration identity**: `MarketplaceRegistrationId` is derived from the scope reference plus the canonical declared-source hash. It is never a display alias and need not be persisted. The catalog root `name` remains authoritative. The same canonical source in one scope is idempotent; the same root name with another source is a conflict; one source returning a changed root name is a source/name conflict. Other scopes remain independent.
- **No implicit precedence**: User and current-project registrations are both returned. A same-name marketplace or same `PluginKey` in both scopes yields two scope-qualified registrations/candidates with distinct IDs. Search ordering is deterministic but grants no authority. Candidate resolution requires the candidate ID and exact snapshot token; it never falls back from project to user or chooses by display order.
- **One acquisition and cache path**: Add and refresh call the existing `MarketplaceMaterializer`, `MarketplaceInspectionService`, immutable `ContentStorePort`, and state coordinator. Browse resolves the selected `MarketplaceSnapshotRecord` and reuses the existing readers/merger; it creates no network client, parsed-catalog store, ETag cache, or secondary catalog index. An optional request-local index may exist only for one call and is discarded afterward.
- **Git, GitHub, and local policy**: GitHub shorthand, HTTPS Git, SSH Git, SCP-style Git, and optional refs remain exactly the existing compatibility set. Raw catalog URLs and every other protocol remain rejected. A local source must be an absolute user-scope Git directory; it is canonicalized with `realpath`, and a symlink leaf/non-directory is rejected before the canonical path is persisted. Local sources are never accepted in project scope or automatically refreshed.
- **Hosts, redirects, and SSRF**: A registered direct HTTPS/SSH/SCP host—including an explicitly chosen private or loopback host—is an intentional local-machine network capability, not ambient server-side URL fetching. Add/import must show the canonical direct host before acquisition. The Git adapter verifies `git remote get-url --all` still names that source after Git configuration expansion, permits only the already-supported HTTPS/SSH transports, and sets HTTPS redirect following off. Renamed repositories must be re-added at their canonical URL. GitHub shorthand always targets `github.com`. This prevents foreign declarations, `url.*.insteadOf`, and cross-host redirects from silently pivoting an approved registration while retaining ordinary credential helpers and SSH configuration. SSH `HostName`/`ProxyCommand` behavior remains explicit user-owned SSH configuration and is never persisted or logged by Plugin Host.
- **Authentication custody**: Source declarations cannot contain HTTPS credentials or SSH passwords. Git uses the user's noninteractive Git credential helper, SSH agent, and SSH config through the existing process adapter; Plugin Host stores no token, private key, helper output, header, or prompt result. Foreign credentials/trust are never read or imported. Safe results may display the declared canonical source to the invoking user, but diagnostics/logs carry registration/source hashes and stable codes, never URLs, local home paths, remote stderr, native causes, or secret values.
- **Snapshot and revision honesty**: A selected snapshot records verified resolved source hash, full Git commit, content digest, source/content binding, and immutable content ref. Marketplace-relative candidates can name that marketplace commit as exact available revision evidence. External Git/npm plugin entries expose only their declared selector/source identity until later inspection materializes them; browse never fabricates an immutable plugin revision.
- **ETag contract**: Marketplace transport is Git, not raw HTTP catalog fetch. Therefore ETag is explicitly `not-applicable`; conditional refresh means resolving the declared Git selector and comparing the full commit/content/binding against the selected snapshot. No HTTP `HEAD`, ETag, or alternate downloader is added.
- **Offline and stale contract**: Browse never performs network I/O. It returns verified selected snapshots even when the last refresh failed or the machine is offline. Remote freshness is `current` until `nextScheduledAt`, then `stale`; local freshness is `unknown-local` because the source tree may change without a refresh. Missing/corrupt selected content is `unavailable` and never triggers network fallback or silent selection of an older unselected snapshot.
- **Atomic refresh**: Claim acquisition is a short state commit; materialization and inspection happen outside locks; final immutable promotion plus replacement of the selected snapshot and refresh record occurs through one scope lock/CAS generation. The prior snapshot remains authoritative on any failure, cancellation, malformed catalog, stale claim, source change, or lost race. Identical content updates only refresh status. Promotion may leave an unselected immutable orphan after a lost state race; existing recovery/collection owns it.
- **Cancellation and restart**: Cancellation before a commit changes nothing. After a refresh claim, normal cancellation uses an uncancelled cleanup signal to clear only that claim and records a safe `cancelled` attempt when authority is still unchanged. A process crash leaves the bounded claim until its existing lease expires; no PID takeover or unsafe replay is introduced. Calls during that interval return `coalesced` with the expiry. After expiry, the next explicit/scheduled refresh may claim normally.
- **Concurrent refresh/remove**: Remove verifies registration ID/source under the same scope lock. If remove commits first, an in-flight refresh cannot publish and returns `removed-during-refresh`; if refresh commits first, remove deletes the newly selected record. Removal is blocked while installed plugin records still reference that marketplace. It never deletes immutable bytes inline; collection reclaims unreferenced snapshots later.
- **Search and pagination**: Search is deterministic, read-only, and request-local. It matches all whitespace-delimited query tokens after Unicode NFKC, locale-independent lowercase, and whitespace collapse against plugin key/name, marketplace name, declared version, description, and safe presentation category/tag values. It never indexes raw declarations, hook/MCP commands, authentication fields, or retained executable data. Query length is at most 256 Unicode scalar values and 16 tokens. Candidate order is scope (`user`, then current `project`), marketplace name, plugin entry name, declared version or empty string, then candidate ID, all by Unicode code-point comparison.
- **Cursor contract**: Limit defaults to 50 and is bounded to 1–100. The opaque base64url cursor contains schema version, the canonical query/filter hash, a hash of the exact ordered registration generations/snapshot refs, and the last sort tuple. A malformed cursor returns `CURSOR_INVALID`; changed state/snapshots return `CURSOR_STALE` rather than skipping or duplicating entries. No cursor server state is persisted.
- **Adoption posture**: Preview reads exactly Claude `known_marketplaces.json`, Claude `extraKnownMarketplaces`, and Codex `[marketplaces]`; it performs no network call and compares canonical source identities with the native current user/project registry. Import re-reads all fixed documents, requires selected candidate IDs still exist, then routes each source through the normal registrar. Missing, corrupt, changed, or conflicting foreign state produces per-document/candidate evidence; valid siblings survive.
- **Foreign filesystem policy**: Foreign roots are canonicalized once. Fixed documents must resolve within that root; a symlink leaf, non-regular file, escaping realpath, identity change between open and read, oversized file, invalid UTF-8, or I/O failure is unreadable. Reads use a no-follow file descriptor, bounded bytes, and pre/post `fstat` identity. Preview reports home-relative logical locations, not absolute home paths. Empty clean environments return three deterministic `missing` statuses and no diagnostic.
- **Adoption idempotency/conflicts**: Preview can prove only source equality, not the unmaterialized catalog's authoritative root name. It reports `already-registered` with exact scopes or `not-registered`; suggested foreign aliases remain provenance, not identity. Import of an already registered source is `unchanged`. A materialized root-name collision, source/name change, untrusted project, non-portable source, or stale candidate is an explicit per-candidate rejection. Partial import is allowed; no import installs plugins, copies foreign caches/trust, or mutates foreign files.
- **Untrusted executable material**: Catalog entries and retained declarations remain untrusted discovery input. Serializable summaries/details expose safe presentation claims, source declarations, policy availability/authentication labels, and source-located provenance but no interpreted compatibility/trust verdict. The internal resolver returns a deep-frozen exact `NormalizedMarketplaceEntry` plus verified marketplace context only to later inspection/install application services; it never executes content or grants trust.
- **Foundation timing**: Code-first. Current foundation/compatibility assertions already describe this intended behavior. Implementation updates an assertion only if concrete landed names or guarantees make it false; omission alone is not drift.
- **Manual DAG check**: The child graph is acyclic by construction: contracts/state and source-boundary hardening are roots; registration depends on both; refresh and catalog reads depend on registration; adoption depends on registration plus source hardening; composition depends on refresh/catalog/adoption; integrated acceptance is the sole leaf. No child depends on this feature or a later sibling.

## Architectural choice

### Option A — a new marketplace database and denormalized catalog/search index

Registration, parsed entries, status, and search tokens could live in a dedicated SQLite database. Reads would be fast and pagination easy, but it would duplicate lifecycle state, immutable content, normalized readers, and refresh authority. Restart reconciliation and cross-database atomicity would become the feature rather than marketplace discovery. Rejected.

### Option B — existing lifecycle registry plus immutable selected snapshots and request-local catalog projection (chosen)

Registration metadata and selected snapshot references change together in the existing scope generation. Existing materializers and the immutable store acquire bytes; existing readers build normalized catalogs when requested; a pure query projector creates safe summaries, deterministic search order, and snapshot-bound cursors. Adoption routes through the same registrar. This adds only the application capability and missing schema/status evidence, while retaining one state, cache, catalog, and network authority.

### Option C — treat foreign registrations and working directories as live catalogs

Browse could read Claude/Codex files and local/Git checkouts every time, avoiding native registration persistence. That makes foreign mutation, network state, and mutable paths startup/runtime dependencies, loses atomic snapshots, and violates explicit adoption. Rejected.

**Choice**: Option B. It is the shortest architecture that gives exact scope/source identity, offline browsing, restart safety, and one-way adoption without creating another authority.

## Trickiest unit first

Registration and refresh publication are the riskiest unit because the authoritative root name is known only after untrusted source acquisition, while source identity must control concurrent add/remove/refresh and the selected cache must never diverge from configuration. The service therefore prepares and inspects outside coordination, then enters one existing scope mutation with the expected generation. Inside it, the service re-derives registration identity, rechecks name/source/claim conditions, promotes the already verified handoff, and replaces registration plus selected snapshot in one verified mutation. Any stale/ambiguous result is reported exactly; it is never converted to success from a promoted directory alone. The fallback is the previous selected snapshot and an unselected immutable orphan eligible for normal collection—not a second journal or mutable pointer.

## Exact application contracts

### Public schema source of truth

**Files**:
- `src/application/marketplace-management-contract.ts`
- `src/domain/marketplace-registration.ts`
- `src/domain/state/config-state.ts`
- `src/domain/state/project-state.ts`
- `src/domain/update-policy.ts`

All serializable boundary types below are inferred from strict readonly Zod schemas. Variant tags and stable rejection/status codes live in one `MarketplaceManagementContractRegistry`; schemas, result unions, display labels, and exhaustive handling derive from it.

```typescript
export const MarketplaceRegistrationIdSchema = z.string()
  .regex(/^marketplace-registration-v1:sha256:[0-9a-f]{64}$/)
  .brand<"MarketplaceRegistrationId">();
export type MarketplaceRegistrationId = z.infer<typeof MarketplaceRegistrationIdSchema>;

export const MarketplaceCandidateIdSchema = z.string()
  .regex(/^marketplace-candidate-v1:sha256:[0-9a-f]{64}$/)
  .brand<"MarketplaceCandidateId">();
export type MarketplaceCandidateId = z.infer<typeof MarketplaceCandidateIdSchema>;

export const MarketplaceSnapshotTokenSchema = z.string()
  .regex(/^marketplace-snapshot-v1:sha256:[0-9a-f]{64}$/)
  .brand<"MarketplaceSnapshotToken">();
export type MarketplaceSnapshotToken = z.infer<typeof MarketplaceSnapshotTokenSchema>;

export const MarketplaceCursorSchema = z.string()
  .regex(/^marketplace-cursor-v1:[A-Za-z0-9_-]+$/)
  .max(2048)
  .brand<"MarketplaceCursor">();

export const MarketplaceScopeSelectionSchema = z.enum(["user", "project", "all-current"]);
export type MarketplaceScopeSelection = z.infer<typeof MarketplaceScopeSelectionSchema>;

export const MarketplaceRegistrationOriginSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("native") }).strict().readonly(),
  z.object({
    kind: z.literal("adoption"),
    candidateId: AdoptionCandidateIdSchema,
    documents: z.array(z.object({
      host: z.enum(["claude", "codex"]),
      document: AdoptionDocumentKindSchema,
      pointer: z.string().optional(),
    }).strict().readonly()).nonempty().readonly(),
  }).strict().readonly(),
  z.object({ kind: z.literal("legacy") }).strict().readonly(),
]);

export const MarketplaceRegistrationRecordSchema = z.object({
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  origin: MarketplaceRegistrationOriginSchema,
  updateApplication: z.enum(["manual", "automatic"]),
  refresh: MarketplaceRefreshMemorySchema,
  notifications: z.array(UpdateNotificationMemorySchema).readonly(),
}).strict().readonly();
```

`MarketplaceRegistrationId` hashes canonical `{ version, scopeReference, declaredSourceIdentity }`. `MarketplaceSnapshotToken` hashes `{ scopeReference, registrationId, marketplace, resolvedSourceHash, revision, contentDigest, binding, contentRef }`. `MarketplaceCandidateId` adds exact plugin key and declared plugin-source identity to that token. Constructors recompute all hashes using injected SHA-256; plain schema parsing cannot mint trusted internal resolver capabilities.

Host config advances to v3 and project-local state to v3 to store `origin` and richer refresh memory. V2 migration sets `origin: { kind: "legacy" }` and preserves every existing source, preference, claim, notification, selected snapshot, and plugin record. Because user config and installed snapshots are separate state families, a legacy user record with no matching snapshot remains readable as `not-materialized`; only a successful normal add/refresh may create the pair. The one canonical record is renamed `MarketplaceRegistrationRecord`; `MarketplaceUpdateRecord` remains only a source-compatible type/export alias during this feature and is not a second schema.

### Registry service

**Files**:
- `src/application/marketplace-registration-service.ts`
- `src/application/marketplace-state.ts`
- `src/application/ports/marketplace-registration.ts`

```typescript
export const MarketplaceAddRequestSchema = z.object({
  source: MarketplaceSourceSchema,
  scope: z.enum(["user", "project"]),
  origin: MarketplaceRegistrationOriginSchema.default({ kind: "native" }),
}).strict().readonly();

export type MarketplaceAddResult =
  | Readonly<{ kind: "added"; registration: MarketplaceRegistrationView }>
  | Readonly<{ kind: "unchanged"; registration: MarketplaceRegistrationView }>
  | Readonly<{ kind: "rejected"; code:
      | "INVALID_SOURCE" | "PROJECT_UNTRUSTED" | "NOT_PORTABLE"
      | "NAME_CONFLICT" | "SOURCE_NAME_CHANGED" | "SOURCE_UNAVAILABLE"
      | "CATALOG_INVALID" | "PROMOTION_FAILED" | "STATE_CORRUPT" | "STATE_STALE" }>
  | Readonly<{ kind: "indeterminate"; code: "COMMIT_AMBIGUOUS"; registrationId: MarketplaceRegistrationId }>;

export type MarketplaceRemoveResult =
  | Readonly<{ kind: "removed"; registrationId: MarketplaceRegistrationId }>
  | Readonly<{ kind: "unchanged"; reason: "not-configured" }>
  | Readonly<{ kind: "blocked"; code: "INSTALLED_PLUGINS_DEPEND"; plugins: readonly PluginKey[] }>
  | Readonly<{ kind: "rejected"; code: "PROJECT_UNTRUSTED" | "SOURCE_CHANGED" | "STATE_CORRUPT" | "STATE_STALE" }>
  | Readonly<{ kind: "indeterminate"; code: "COMMIT_AMBIGUOUS"; registrationId: MarketplaceRegistrationId }>;

export interface MarketplaceRegistrationService extends MarketplaceRegistrationPort {
  add(request: MarketplaceAddRequest, signal: AbortSignal): Promise<MarketplaceAddResult>;
  remove(request: Readonly<{
    registrationId: MarketplaceRegistrationId;
    scope: "user" | "project";
  }>, signal: AbortSignal): Promise<MarketplaceRemoveResult>;
  list(request: Readonly<{
    scope?: MarketplaceScopeSelection;
    cursor?: MarketplaceCursor;
    limit?: number;
  }>, signal: AbortSignal): Promise<MarketplaceRegistrationPage>;
}
```

The adoption `register()` port becomes a narrow adapter over `add()` with exact `ScopeContext` and adoption origin. It may not skip source acquisition, root-name validation, project trust/portability, immutable promotion, or state CAS.

`MarketplaceRegistrationView` contains registration ID, scope reference without canonical project root, root name, exact declared source and source hash, origin, update preference, selected snapshot evidence, refresh status, and cache status. Project views expose only `ProjectKey`, not project filesystem identity. Results are deeply frozen.

### Refresh status and service

**Files**:
- `src/application/update-contract.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/marketplace-update-state.ts`

```typescript
export const MarketplaceRefreshAttemptSchema = z.object({
  completedAt: EpochMillisecondsSchema,
  outcome: z.enum(["succeeded", "unchanged", "cancelled", "unavailable", "failed"]),
  code: z.enum([
    "SOURCE_UNAVAILABLE", "CATALOG_INVALID", "CONTENT_INVALID", "PROMOTION_FAILED",
    "STATE_STALE", "REMOVED_DURING_REFRESH", "ABORTED",
  ]).optional(),
}).strict().readonly();

export const MarketplaceRefreshRequestSchema = z.object({
  trigger: z.enum(["explicit", "scheduled"]),
  scope: MarketplaceScopeSelection.default("all-current"),
  registrationIds: z.array(MarketplaceRegistrationIdSchema).nonempty().readonly().optional(),
}).strict().readonly();

export type MarketplaceRefreshOutcome =
  | Readonly<{ kind: "refreshed"; registrationId: MarketplaceRegistrationId; change: "changed" | "unchanged"; registration: MarketplaceRegistrationView; plugins: readonly PluginUpdateOutcome[] }>
  | Readonly<{ kind: "coalesced"; registrationId: MarketplaceRegistrationId; claimExpiresAt: EpochMilliseconds }>
  | Readonly<{ kind: "rate-limited"; registrationId: MarketplaceRegistrationId; nextAt: EpochMilliseconds }>
  | Readonly<{ kind: "skipped-local"; registrationId: MarketplaceRegistrationId }>
  | Readonly<{ kind: "cancelled"; registrationId: MarketplaceRegistrationId }>
  | Readonly<{ kind: "failed"; registrationId: MarketplaceRegistrationId; code: string; retained: MarketplaceCacheStatus }>
  | Readonly<{ kind: "not-configured"; registrationId: MarketplaceRegistrationId }>;

export interface MarketplaceRefreshService {
  refresh(request: MarketplaceRefreshRequest, signal: AbortSignal): Promise<Readonly<{
    outcomes: readonly MarketplaceRefreshOutcome[];
    notifications: readonly NotificationIntent[];
  }>>;
  nextScheduledAt(signal: AbortSignal): Promise<number | undefined>;
}
```

Outcomes are ordered by scope, marketplace, registration ID regardless of acquisition timing. Explicit refresh may include local sources; scheduled refresh emits `skipped-local`. Each failure includes the retained selected-cache status. `nextScheduledAt` considers user plus exact current project only. `validator` in cache views is `{ kind: "git-commit", revision }`; `etag` is `{ kind: "not-applicable" }`.

### Catalog search, detail, and internal resolution

**Files**:
- `src/application/marketplace-catalog-contract.ts`
- `src/application/marketplace-catalog-service.ts`
- `src/application/marketplace-search.ts`

```typescript
export const MarketplaceCatalogSearchRequestSchema = z.object({
  scope: MarketplaceScopeSelection.default("all-current"),
  marketplaceIds: z.array(MarketplaceRegistrationIdSchema).readonly().optional(),
  query: z.string().default(""),
  availability: z.array(MarketplaceAvailabilitySchema).readonly().optional(),
  cursor: MarketplaceCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
}).strict().readonly();

export const CatalogAvailableRevisionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("marketplace-snapshot"),
    marketplaceRevision: GitRevisionSchema,
    snapshot: MarketplaceSnapshotTokenSchema,
    declaredVersion: z.string().min(1).optional(),
  }).strict().readonly(),
  z.object({
    kind: z.literal("declared-selector"),
    sourceIdentity: SourceHashSchema,
    selector: z.string().min(1).optional(),
    declaredVersion: z.string().min(1).optional(),
  }).strict().readonly(),
]);

export const MarketplaceCandidateSummarySchema = z.object({
  id: MarketplaceCandidateIdSchema,
  snapshot: MarketplaceSnapshotTokenSchema,
  scope: ScopeReferenceSchema,
  registrationId: MarketplaceRegistrationIdSchema,
  plugin: PluginKeySchema,
  marketplace: MarketplaceNameSchema,
  name: PluginNameSchema,
  description: z.string().optional(),
  available: CatalogAvailableRevisionSchema,
  availability: MarketplaceAvailabilitySchema,
  source: PluginSourceSchema,
  sourceIdentity: SourceHashSchema,
  provenance: z.array(CatalogClaimOriginSchema).nonempty().readonly(),
  trust: z.literal("untrusted-not-inspected"),
}).strict().readonly();

export interface MarketplaceCatalogService {
  search(request: MarketplaceCatalogSearchRequest, signal: AbortSignal): Promise<MarketplaceCatalogPage>;
  detail(request: Readonly<{
    candidateId: MarketplaceCandidateId;
    snapshot: MarketplaceSnapshotToken;
  }>, signal: AbortSignal): Promise<MarketplaceCandidateDetailResult>;
  resolve(request: Readonly<{
    candidateId: MarketplaceCandidateId;
    snapshot: MarketplaceSnapshotToken;
  }>, signal: AbortSignal): Promise<ResolvedMarketplaceCandidateResult>;
}

export type ResolvedMarketplaceCandidate = Readonly<{
  id: MarketplaceCandidateId;
  scope: ScopeContext;
  registrationId: MarketplaceRegistrationId;
  snapshot: MarketplaceSnapshotToken;
  snapshotRecord: MarketplaceSnapshotRecord;
  marketplace: Readonly<{
    root: string;
    source: ResolvedMarketplaceSource;
    content: ContentManifest;
    binding: ContentDigest;
  }>;
  entry: NormalizedMarketplaceEntry;
}>;
```

`MarketplaceCatalogPage` contains candidates, per-registration `MarketplaceCatalogObservation` (`ready`, `stale`, `unavailable`, or `corrupt`), optional next cursor, and no native causes. `detail()` is serializable and adds safe root/catalog metadata and exact claim locations without raw declarations. `resolve()` returns an in-process branded/deep-frozen capability only after re-resolving the selected immutable content and re-deriving every ID; it returns `candidate-stale`, `candidate-missing`, or `catalog-unavailable` rather than accepting caller-supplied entries or roots.

### Adoption preview and import

**Files**:
- `src/application/adoption-contract.ts`
- `src/application/adoption-service.ts`
- `src/infrastructure/adoption/node-foreign-state-files.ts`

```typescript
export const AdoptionPreviewRequestSchema = z.object({
  compareScope: MarketplaceScopeSelection.default("all-current"),
}).strict().readonly();

export const AdoptionPreviewCandidateSchema = z.object({
  candidate: AdoptionCandidateSchema,
  comparison: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("not-registered") }).strict().readonly(),
    z.object({
      kind: z.literal("already-registered"),
      registrations: z.array(MarketplaceRegistrationIdSchema).nonempty().readonly(),
      scopes: z.array(ScopeReferenceSchema).nonempty().readonly(),
    }).strict().readonly(),
  ]),
}).strict().readonly();

export interface AdoptionService {
  preview(request: AdoptionPreviewRequest, signal: AbortSignal): Promise<AdoptionPreviewResult>;
  import(request: Readonly<{
    candidateIds: readonly AdoptionCandidateId[];
    scope: "user" | "project";
  }>, signal: AbortSignal): Promise<AdoptionImportResult>;
}
```

`AdoptionDocumentStatus` uses fixed logical locations and statuses `missing | present | unreadable | changed-during-read`; unreadable codes include `SYMLINK`, `ESCAPES_ROOT`, `NOT_REGULAR`, `TOO_LARGE`, `INVALID_UTF8`, and `IO_FAILED`. Internal reader provenance may retain the canonical opened path for exact parsing, but preview projects it to the fixed home-relative location and JSON Pointer. Import outcomes preserve sorted candidate IDs and normal registrar results, plus `candidate-unavailable`, `not-portable`, and `cancelled-before-start`. Cancellation during one registration returns its real result only if committed evidence exists, marks later candidates `cancelled-before-start`, and never mutates foreign state.

## Implementation units

### Unit 1: Canonical registration contracts and state migration

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-registration-contracts-state`

**Files**:
- `src/domain/marketplace-registration.ts`
- `src/domain/update-policy.ts`
- `src/domain/state/config-state.ts`
- `src/domain/state/project-state.ts`
- `src/application/marketplace-management-contract.ts`
- `src/application/marketplace-update-state.ts`
- `src/domain/error-contract.ts`
- `test/domain/marketplace-registration.test.ts`
- `test/domain/state/config-state.test.ts`
- `test/domain/state/project-state.test.ts`

**Implementation notes**:
- Add the one variant/status registry, ID/snapshot/cursor constructors, current record, v2→v3 migrations, and mutations that replace registration and selected snapshot together.
- Add only stable management error codes actually crossing the public boundary; keep native causes on thrown errors and out of serialized results.

**Acceptance criteria**:
- [ ] IDs are deterministic from exact scope/source/snapshot/plugin evidence and differ across scopes, sources, revisions, and entries.
- [ ] V2 fixtures migrate without losing preferences, claims, notifications, snapshots, plugins, or generation evidence; origin becomes `legacy`, and a legacy user record without a snapshot is explicitly `not-materialized`.
- [ ] New add/refresh mutation constructors replace registration and selected snapshot together; no constructor fabricates a snapshot for legacy state.
- [ ] Project state rejects local sources; duplicate root names and canonical source identities fail verification.

### Unit 2: Approved source and foreign-file boundary hardening

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-source-foreign-boundaries`

**Files**:
- `src/infrastructure/git/git-source-acquirer.ts`
- `src/infrastructure/adoption/node-foreign-state-files.ts`
- `src/composition/create-adoption-service.ts`
- `test/infrastructure/git/git-source-acquirer.test.ts`
- `test/infrastructure/adoption/node-foreign-state-files.test.ts`

**Implementation notes**:
- Verify effective Git remote URL before contact and disable HTTPS redirects without introducing DNS/HTTP code.
- Canonicalize approved local paths in the registration boundary; harden fixed foreign reads with root containment, no-follow open, descriptor identity, and safe logical locations.

**Acceptance criteria**:
- [ ] Supported direct Git/GitHub/SSH/SCP sources still acquire through the existing adapter; unsupported protocols, redirect attempts, and `insteadOf` host pivots fail before catalog publication.
- [ ] Local source aliases/symlink leaves/non-directories are rejected or canonicalized exactly as specified, and project local sources never reach acquisition.
- [ ] Foreign symlink/escape/growth/replacement/oversize/UTF-8 cases are isolated per document with no arbitrary-file content or absolute home path in safe results.
- [ ] Git/foreign failures pass credential/path marker canaries without leaking them into diagnostics or JSON.

### Unit 3: Atomic scoped marketplace registration and removal

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-registration-service`
**Depends on**: `epic-native-plugin-management-marketplace-discovery-adoption-registration-contracts-state`, `epic-native-plugin-management-marketplace-discovery-adoption-source-foreign-boundaries`

**Files**:
- `src/application/marketplace-registration-service.ts`
- `src/application/marketplace-state.ts`
- `src/application/ports/marketplace-registration.ts`
- `test/application/marketplace-registration-service.test.ts`
- `test/integration/marketplace-registration.test.ts`

**Acceptance criteria**:
- [ ] Add materializes/inspects once, treats catalog root name as authority, promotes verified content, and commits registration plus snapshot in one generation.
- [ ] Same source/scope is unchanged; name/source changes are exact conflicts; identical names across user/current project remain independently listable.
- [ ] Remove uses registration ID/source equality, blocks installed dependents, tolerates not-configured idempotently, and leaves physical collection to existing GC.
- [ ] Cancellation, stale generation, lost response, commit ambiguity, two processes adding, and add/remove races return exact outcomes without false success or selected-cache corruption.

### Unit 4: Snapshot-atomic refresh and offline status

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status`
**Depends on**: `epic-native-plugin-management-marketplace-discovery-adoption-registration-service`

**Files**:
- `src/application/update-contract.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/marketplace-update-state.ts`
- `src/application/marketplace-update-policy-service.ts`
- `src/composition/create-marketplace-update-services.ts`
- `test/application/marketplace-refresh-service.test.ts`
- `test/integration/marketplace-update-policy.test.ts`

**Acceptance criteria**:
- [ ] Refresh selection is by exact current scope/registration ID and deterministic across completion order; historical project databases are not scheduled.
- [ ] Claim, materialize/inspect, promote/commit, failure, cancellation cleanup, lease expiry, and restart behavior match the declared state machine.
- [ ] Changed/unchanged Git revision evidence, no-ETag status, stale/offline/unknown-local cache status, and retained prior snapshot are exact after success and every failure class.
- [ ] Refresh/remove and two-process refresh races produce coalesced, removed, stale, or committed evidence without publishing a stale source.
- [ ] Installed-plugin update probing/notification still reuses the existing probe and lifecycle path; this story does not broaden it to all catalog entries.

### Unit 5: Deterministic catalog projection, search, detail, and resolver

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-catalog-query`
**Depends on**: `epic-native-plugin-management-marketplace-discovery-adoption-registration-service`, `epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status`

**Files**:
- `src/application/marketplace-catalog-contract.ts`
- `src/application/marketplace-catalog-service.ts`
- `src/application/marketplace-search.ts`
- `test/application/marketplace-search.test.ts`
- `test/application/marketplace-catalog-service.test.ts`

**Acceptance criteria**:
- [ ] Offline search resolves only selected verified snapshots and emits deterministic scope/name/version/ID order independent of registration or refresh completion order.
- [ ] Tokenized search, filters, limits, next cursors, invalid cursors, and stale cursors follow the exact normalization/fingerprint contract with no server-side cursor state.
- [ ] Same marketplace/plugin identities across scopes remain separate; exact candidate/snapshot resolution has no implicit precedence or fallback.
- [ ] Safe detail retains exact source/revision/content/provenance evidence without raw executable declarations; internal resolution returns the exact frozen normalized entry and verified marketplace context.
- [ ] Missing/corrupt one-source content produces an observation while valid siblings remain browsable and no network fallback occurs.

### Unit 6: Read-only adoption preview and normal-path import

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-adoption-preview-import`
**Depends on**: `epic-native-plugin-management-marketplace-discovery-adoption-registration-service`, `epic-native-plugin-management-marketplace-discovery-adoption-source-foreign-boundaries`

**Files**:
- `src/domain/adoption.ts`
- `src/application/adoption-contract.ts`
- `src/application/adoption-service.ts`
- `src/composition/create-adoption-service.ts`
- `test/domain/adoption.test.ts`
- `test/application/adoption-service.test.ts`
- `test/integration/adoption.test.ts`

**Acceptance criteria**:
- [ ] Preview performs zero acquisition/network/native writes, reconciles Claude/Codex declarations deterministically, and compares exact canonical source identities to both current scopes.
- [ ] Clean/missing/corrupt/changed/conflicting documents preserve valid siblings and fixed logical provenance.
- [ ] Import re-discovers, rejects stale IDs/non-portable or untrusted project sources, and passes provenance-bound origin through the normal registrar.
- [ ] Repeated import is unchanged, root-name conflicts are registrar-owned, partial outcomes are sorted, and cancellation never writes foreign files or imports caches/trust/credentials/installations.

### Unit 7: Packaged application composition and public boundary

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-packaged-composition`
**Depends on**: `epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status`, `epic-native-plugin-management-marketplace-discovery-adoption-catalog-query`, `epic-native-plugin-management-marketplace-discovery-adoption-adoption-preview-import`

**Files**:
- `src/composition/create-marketplace-discovery-services.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/index.ts`
- `src/pi/index.ts`
- `test/composition/create-marketplace-discovery-services.test.ts`
- `test/public-api.test.ts`
- `test/tooling/boundaries.test.ts`

**Acceptance criteria**:
- [ ] The started container exposes one bound `marketplace` capability containing registration, refresh/policy, catalog, and adoption; raw state/content/mutation/readers remain private.
- [ ] User/current-project scope binding and trust come from the existing packaged project context, never caller paths or arbitrary historical project keys.
- [ ] Construction and startup remain local/offline and perform no adoption read, refresh, source acquisition, timer start, or catalog parse until explicitly called.
- [ ] Root and `./pi` exports expose only strict result/request/application types and intended service factories, not internal resolver brands, roots, entries, credentials, state commits, or adapter handles.

### Unit 8: Clean-environment, restart, concurrency, and security acceptance

**Story**: `epic-native-plugin-management-marketplace-discovery-adoption-integrated-acceptance`
**Depends on**: `epic-native-plugin-management-marketplace-discovery-adoption-packaged-composition`

**Files**:
- `test/integration/marketplace-discovery-clean-environment.test.ts`
- `test/integration/marketplace-discovery-restart.test.ts`
- `test/integration/marketplace-discovery-concurrency.test.ts`
- `test/integration/marketplace-discovery-security.test.ts`
- `test/fixtures/marketplaces/native-registration/`
- `test/fixtures/adoption/`

**Acceptance criteria**:
- [ ] A packed clean host with no Claude/Codex installation adds local and Git-backed fixture marketplaces, restarts offline, lists/searches/details candidates, and preserves exact snapshot evidence.
- [ ] User/current-project duplicates, candidate collisions, malformed sibling entries, moved local roots, corrupt/missing cache, partial Git archive, abort, refresh/remove races, and crash-expired claims match contracts.
- [ ] Claude/Codex preview/import works without either CLI and proves foreign files, caches, trust, credentials, and installations are never mutated or reused.
- [ ] Redirect/host-pivot, path traversal, symlink escape, content digest/provenance tamper, secret/URL/path log canaries, and untrusted project cases fail closed at the owning boundary.
- [ ] Tests consume the packaged application capability only and do not exercise install, activation, Pi rendering, command grammar, or duplicate owning test matrices.

## Implementation order

1. In parallel:
   - `epic-native-plugin-management-marketplace-discovery-adoption-registration-contracts-state`
   - `epic-native-plugin-management-marketplace-discovery-adoption-source-foreign-boundaries`
2. `epic-native-plugin-management-marketplace-discovery-adoption-registration-service`
3. In parallel:
   - `epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status`
   - `epic-native-plugin-management-marketplace-discovery-adoption-adoption-preview-import`
4. `epic-native-plugin-management-marketplace-discovery-adoption-catalog-query`
5. `epic-native-plugin-management-marketplace-discovery-adoption-packaged-composition`
6. `epic-native-plugin-management-marketplace-discovery-adoption-integrated-acceptance`

The feature remains one cohesive implementation and review bundle. Stories are durable design/verification checkpoints, not one worker per story.

## Registry, cache, and operation invariants

1. One registration is one canonical declared source in one exact scope; aliases and root display order never identify it.
2. One root name maps to at most one registration source per scope; another scope is independent and never hidden.
3. Every newly added/refreshed registration has exactly one selected verified snapshot committed with it. A migrated legacy user record may be `not-materialized` until explicit add/refresh repairs it; it is never silently dropped or given fabricated cache evidence. Installed plugins block removal of their marketplace coverage.
4. A snapshot becomes selected only after source verification, full content-manifest verification, catalog root validation/merge, immutable promotion, and successful state CAS.
5. Browse and detail use selected immutable evidence only. Network/source state cannot change a result mid-request; changed authority makes cursors/candidates stale.
6. Refresh claims do not select content. Claim expiration authorizes retry, not success or takeover of a live operation.
7. Failure/cancellation preserves the prior selected snapshot. Promoted-but-unselected content is inert and collectible.
8. Catalog source provenance remains exact; display projections omit raw declarations and native causes. Internal normalized entries remain untrusted until later inspection/compatibility/trust.
9. Adoption is read-only discovery plus one-way explicit registration. Foreign files, caches, installations, trust, and credentials never become runtime/state authority.
10. User/project management requires exact current scope; project mutation additionally requires current Pi trust and portable remote source.
11. Source credentials remain in existing Git/SSH custody. No result, state document, cursor, registration origin, notification, diagnostic, or log contains secret material.
12. Startup and ordinary browse are offline. Scheduler start remains explicit in the later update-policy/offline-startup feature.

## Failure and status matrix

| Operation/condition | Result | Authority/cache effect |
|---|---|---|
| Add malformed/unsupported/credential URL | `rejected: INVALID_SOURCE` | No acquisition or state |
| Add untrusted/non-portable project source | `PROJECT_UNTRUSTED` / `NOT_PORTABLE` | No acquisition or state |
| Add same canonical source/scope/name | `unchanged` | Existing snapshot retained |
| Add same name/different source | `NAME_CONFLICT` | Existing registration retained |
| Add same source now declaring another name | `SOURCE_NAME_CHANGED` | Existing registration retained |
| Acquisition/catalog/materialization failure | typed rejection | Staging discarded; no selected cache |
| Promotion succeeds, CAS loses/ambiguous | stale or indeterminate | No false registration; orphan collectible |
| Remove missing | `unchanged: not-configured` | No effect |
| Remove with installed dependents | `blocked` + sorted plugin keys | Registration/snapshot retained |
| Remove races refresh and wins | removed; refresh `REMOVED_DURING_REFRESH` | No selected stale refresh |
| Refresh active claim | `coalesced` + expiry | Existing cache retained |
| Scheduled local refresh | `skipped-local` | Existing cache retained |
| Same commit/content refresh | `refreshed: unchanged` | Attempt/freshness advances atomically |
| Changed verified refresh | `refreshed: changed` | New snapshot/status selected atomically |
| Network unavailable/malformed/partial/abort | typed failed/cancelled + retained status | Prior snapshot retained |
| Crash after claim | coalesced until lease expiry | Prior snapshot retained; safe retry after expiry |
| Browse offline with selected content | ready/current or stale | No network; immutable cache read |
| Browse selected content missing/corrupt | per-registration unavailable/corrupt | No fallback or authority mutation |
| Candidate/snapshot changed | `candidate-stale` / `CURSOR_STALE` | Caller must requery |
| Foreign host absent | fixed `missing` statuses | No diagnostic, network, or mutation |
| Foreign file corrupt/symlink/changed | per-document unreadable/changed | Valid siblings survive |
| Foreign candidate changed before import | `candidate-unavailable` | No registration |
| Foreign source already native | preview `already-registered`; import `unchanged` | No duplicate |
| Import root-name conflict | registrar rejection | Existing native state retained; foreign untouched |

## Simplification

- Consolidate the current split “marketplace configuration/update record” vocabulary into one registration record and one state helper; retain a temporary exported type alias only where source compatibility requires it.
- Replace the current optional-field refresh result object with a discriminated union so impossible combinations (`failed` plus snapshot, `coalesced` without expiry) cannot be represented.
- Reuse state generations, scope locks, immutable content, source staging, readers/merger, refresh probe, lifecycle update service, project trust, and foreign readers. Do not add a database, HTTP client, downloader, parsed catalog cache, search index, registration journal, PID ownership protocol, or generic repository abstraction.
- Keep project portable-intent writes and project plugin synchronization out of this feature; their later capability consumes these same registration/catalog contracts.
- Keep candidate compatibility, executable inventory interpretation, install/trust/configuration, activation, update application, command parsing, and terminal rendering out. Later features receive the internal exact resolver capability.
- Retire tests that only assert the old loose refresh optional-field shape after the discriminated contract tests replace them. Preserve owning reader/materializer/state/lifecycle matrices and add only seam cases here.

## Testing

- **Contract/migration tests** protect scope/source/snapshot ID derivation, strict unions, v2→v3 losslessness, paired registration/snapshot invariants, and serializable redaction.
- **Registration interface tests** protect root-name authority, source/name collisions, user/project duplication, idempotency, installed-dependent removal, cancellation, stale/ambiguous commits, and two-process CAS.
- **Refresh interface tests** protect claim ownership/expiry, selected-snapshot atomicity, changed/unchanged commits, retained-cache failure, cancellation cleanup, restart, remove races, deterministic batching, and local scheduling policy.
- **Catalog interface tests** protect offline-only reads, exact safe provenance/revision projection, duplicate scope identities, request-local token search, stable ordering, page continuity, stale cursors/candidates, and per-source corruption isolation.
- **Adoption interface tests** protect fixed-file clean environments, missing/corrupt/changed documents, canonical reconciliation, source comparison, stale import, partial/idempotent outcomes, current-project portability/trust, and no foreign mutation.
- **Security regressions** target redirect/`insteadOf` pivot, local/foreign symlinks and containment, partial archives, content/provenance tamper, credential-bearing URL rejection, configured-secret/remote-stderr/path marker redaction, and hostile retained declarations never entering the search index.
- **Avoid duplication**: reader field matrices, archive/path extraction, source revision resolution, content promotion durability, state codec/CAS, plugin inspection/compatibility, update candidate materialization, and lifecycle transactions remain in their owning suites. This feature adds one representative success and one owning-boundary failure at each seam.

## Risks and pre-mortem

- **Riskiest assumption — registration and selected snapshot can remain coherent without another journal**: immutable promotion precedes the state CAS and can outlive a lost race. Mitigation: promotion is idempotent/content-addressed, only state selection grants authority, and the mutation replaces record plus snapshot together. Fallback: report stale/indeterminate and let existing collection reclaim the inert orphan; never infer registration from disk.
- **Git redirect enforcement may reject repositories that previously followed a rename**: this is deliberate to preserve approved host/source identity. Mitigation: return a safe source-resolution rejection and require explicit add of the canonical URL. Fallback: users may choose the exact HTTPS, SSH, SCP, GitHub shorthand, or local source already supported; no permissive hidden redirect mode is added.
- **Catalog parsing on browse may be slower than a denormalized index**: correctness and one authority outweigh speculative caching. Mitigation: bounded catalog size, request-local indexing, pagination, and immutable content reads. Fallback: if measurement later proves a bottleneck, a separately designed derived cache can bind to snapshot token without changing these contracts.
- **A crashed refresh claim delays retry until lease expiry**: without holding a cross-process lock during network I/O, immediate owner-death proof is unavailable. Mitigation: bounded lease, visible coalesced expiry, normal cancellation cleanup, and retained cache. Fallback: wait for expiry; do not introduce PID takeover or duplicate publication.
- **Local marketplace freshness cannot be inferred offline**: checking the working tree would be I/O plus mutable-source interpretation on every browse. Mitigation: label `unknown-local`, retain last verified commit, and require explicit refresh. Fallback: no false “current” status.
- **Project-local registration can be mistaken for portable project intent**: mitigation is an explicit machine-local contract, ProjectKey-qualified views, no `.pi/plugins.json` write, and later sync ownership. Fallback: project-sync reconciles portable declarations explicitly; this feature never claims it did.
- **Foreign source aliases cannot predict catalog name conflicts without network**: preview labels aliases as provenance only. Mitigation: import routes through full normal registration and reports the authoritative conflict after inspection. Fallback: no partial or alias-based registration.
- **Least certainty — inheriting user Git/SSH configuration while proving the approved host**: `remote get-url` and redirect disable cover Git URL rewriting/HTTP redirects, but SSH config can intentionally route a host through another endpoint or command. That is user-owned authentication/transport configuration, not marketplace-controlled state. The adapter must still keep it noninteractive and redact all output; if that boundary cannot be demonstrated, reject the source rather than inspect configuration or log it.

This design fails if native/foreign aliases become identity, user/project collisions silently shadow, refresh can select content apart from registration state, browse contacts the network, an ETag or parsed catalog becomes a second authority, a foreign file or credential is mutated/imported, raw executable declarations become trusted display data, or candidate resolution accepts caller-supplied roots/entries. The source-derived IDs, paired state mutation, immutable selected snapshots, request-local projection, normal-path adoption, and branded internal resolver directly prevent those outcomes.
