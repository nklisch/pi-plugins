---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion
kind: feature
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Immutable Stores and Atomic Promotion

## Brief

Own caller-private staging allocation plus immutable marketplace and plugin revision stores keyed by canonical source and resolved revision. Before promotion, rewalk and verify the completed foreign-model materialization handoff, then promote only complete content into a read-only revision location without allowing materializers to choose installed/cache/marketplace paths.

The feature also establishes stable roots for persistent plugin data and generated projections while keeping both outside immutable content. It does not mutate active state, collect trust, orchestrate install/update, delete retained revisions, or generate/activate skill, hook, or MCP runtime behavior.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 2 storage capability — lifecycle operations consume promoted immutable identities
- Depends on state schemas for canonical store references but remains independent of trust and locking design
- Required guarantees: crash, data, scope, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — State layout; Install transaction; Trust and security
- `docs/ARCHITECTURE.md` — Marketplace store; Plugin store; Source acquisition; Runtime projections
- `docs/COMPATIBILITY.md` — Plugin source forms; Plugin path environment

## Existing contract references

- `src/application/source-materialization.ts` — `MaterializedMarketplace` / `MaterializedPlugin` handoffs and caller-owned staging slots
- `src/domain/content-manifest.ts` — deterministic manifest and source/content binding
- `src/infrastructure/filesystem/secure-content-writer.ts` — lifecycle-facing materialized-content verification seam

## Late-bound feature decisions

Store-path encoding, staging ownership/permissions, promotion primitive, deduplication behavior, read-only enforcement, collision handling, marketplace active-pointer representation, projection/data directory placement, fsync support matrix, and promotion idempotency remain for feature design. Promotion must not imply activation and must never accept content that differs from the inspected manifest.

## UI alignment

No UI surface.

## Discovery and design decisions

- **Discovery posture**: Direct-read only, as requested. Grounding covered the parent epic, `VISION`, `SPEC`, `ARCHITECTURE`, `COMPATIBILITY`, project rules, the completed state feature, current state references/records, source-materialization application contracts, the secure filesystem writer/rewalker, Node composition, public exports, and representative unit/integration tests. No agent or peer mechanism was used.
- **Ownership boundary**: Lifecycle obtains a process-private `StagingAllocation` from `ContentStorePort`, passes only its `StagingSlot` view to a materializer, and later presents the allocation plus handoff for promotion. The Node adapter tracks an unguessable allocation token and canonical root; a structural `{root}` from a materializer is never authority to promote or delete a path.
- **Threat boundary**: Private roots, allocation tokens, no-follow checks, exact realpaths, and rewalks defend against malformed/untrusted content and accidental same-user interference. They do not claim resistance to a privileged process or the same account deliberately changing permissions and racing the host; the existing materialization contract makes the same explicit limit.
- **Physical immutable identity**: Physical store keys are content-addressed from verified source evidence, not display names, plugin names, scopes, aliases, or caller paths. Marketplace key: `marketplace-store-v1(sourceHash, gitRevision, binding)`. Plugin key: `plugin-store-v1(sourceHash, binding)`. The binding already commits to the exact manifest root; the source hash commits to canonical resolved source fields. State logical references remain scope/record identities and do not become paths.
- **Layout**: Under one adapter-supplied canonical host root: `staging/v1/<random-id>/`, `stores/marketplaces/v1/<marketplace-store-key>/`, `stores/plugins/v1/<plugin-store-key>/`, `data/v1/<plugin-data-ref-digest>/`, and `generated/v1/<projection-root-ref-digest>/`. Store-key/reference strings are decoded only by strict schemas to lowercase digest segments; raw source, revision, plugin, project, or URL text never enters a path segment.
- **Publication model**: A revision directory is visible only when an exclusive `READY` marker and strict immutable metadata agree with a complete `content/` tree. Promotion prepares a unique sibling, rewalks, seals, syncs, and atomically renames the prepared directory to the final key. Resolvers ignore directories without a valid `READY` marker. A platform that cannot provide no-replace atomic directory publication and required durability fails capability probing rather than weakening the guarantee.
- **Rewalk timing**: The filesystem promotion adapter performs the lifecycle rewalk itself after validating allocation ownership and immediately before sealing/publication. Application-side manifest validation is not treated as disk evidence. The adapter compares every entry, kind, normalized mode, size, link target, digest, count, and root digest through the existing bounded verifier, recomputes the source/content binding, and rewalks again after permission sealing.
- **Idempotency and collision**: An existing ready target is success only after its metadata and complete on-disk rewalk match the requested source hash, revision where applicable, binding, manifest, and store key. Result kind is `already-present`. Any mismatch under the same key is `identity-collision`; existing content is never overwritten, merged, repaired in place, or selected by file order. An incomplete target is not readable; the same operation may reclaim only an adapter-owned matching pending directory, while general crash cleanup belongs to recovery/GC.
- **Staging cleanup**: Promotion consumes and removes an allocation only after `promoted` or verified `already-present`. Failure and cancellation leave the still-owned allocation available for explicit idempotent `discardStaging`; lifecycle operations own that cleanup decision. On process crash, unready staging remains inert for the recovery feature. The adapter may delete only a root whose token, canonical path, inode/device identity, and parent ownership still match its allocation record.
- **Durability**: Full promotion requires file `fsync`, bottom-up directory `fsync`, prepared-directory sync, atomic no-replace publication, and final-parent sync before success. The adapter exposes a startup capability report; unsupported primitives yield `REQUIREMENT_UNAVAILABLE`. No `promoted` result is returned with a downgraded durability label. Tests may inject a durability port, but production Node wiring owns platform probing and native errors.
- **Read-only meaning**: Immutable files are sealed to `0444` or `0555` according to manifest executable mode and directories to `0555`; symlink text remains unchanged. The runtime receives resolver paths only, never a write-capable store API. The adapter verifies sealed modes and manifest equality before publication. This prevents host accidents and ordinary plugin writes but is not described as protection from the account owner or root. Unsupported reliable mode semantics fail the immutable-store capability probe.
- **Logical references**: `MarketplaceContentRef` and `PluginContentRef` remain authoritative state references derived by the completed state constructors. They are verified when building a locator but are not decoded into physical paths. `MarketplaceSnapshotRecord` and `InstalledRevisionRecord` carry sufficient safe evidence (`sourceHash`, revision/binding, content digest/ref) to derive and verify a store locator without persisting an absolute path.
- **Persistent data identity correction**: The completed `PluginDataRef` currently includes revision/content/binding through `pluginDataIdentity`, which would allocate a new data root on every update and violates the foundation contract. This feature corrects its derivation to exactly `{scope, plugin, purpose: "persistent-plugin-data"}` while state is pre-release, keeps `PluginContentRef` revision-bound, and adds regression vectors proving updates preserve the same data reference. This is an adjacent contract repair, not a compatibility shim.
- **Projection roots**: Add registry-owned `runtimeProjection` reference kind and derive `ProjectionRootRef` from `{scope, plugin, projectionDigest}`. Generated roots are immutable, replaceable caches outside content and data. This feature allocates/resolves/seals roots only; later projection code writes descriptors before sealing and operation/recovery code decides which digest is pending or active.
- **Data roots**: `ensureDataRoot(scope, plugin, dataRef)` verifies the stable reference, creates one private writable `0700` directory outside immutable stores, and returns it idempotently. It never deletes, migrates, or clears data. Project/user isolation comes from the scope-bound reference, not from caller-controlled path text.
- **Marketplace active selection**: There is no filesystem `current` symlink or mutable store pointer. The authoritative state generation selects a `MarketplaceSnapshotRecord`; browsing resolves that record. This removes a second authority and prevents promotion from implying activation. `ARCHITECTURE.md` should roll its “small active-pointer record” wording forward during implementation.
- **Error contract**: Add registry-derived codes `STAGING_ALLOCATION_INVALID`, `CONTENT_VERIFICATION_FAILED`, `STORE_IDENTITY_COLLISION`, and `DURABILITY_UNAVAILABLE`. Safe details contain operation, logical store kind/key, and capability only—never host paths, source URLs, native messages, allocation tokens, or content bytes. Native causes remain on the error for redacted logging.
- **Foundation timing**: Code-first. Implementation updates `ARCHITECTURE.md` for marker-gated publication/no filesystem active pointer and clarifies the platform durability/read-only support statement; `SPEC` and `COMPATIBILITY` already express the intended lifecycle behavior.
- **Advisory review**: This security-critical feature would ordinarily warrant independent completeness review, but the caller explicitly prohibited agents. Design proceeds non-blockingly with the local pre-mortem below; feature review remains required at the review stage.

## Architectural choice

### Option A — let each materializer promote directly into its cache

Git/npm/marketplace adapters could compute destination paths and rename their own output. This minimizes new code, but gives untrusted-source adapters installed-path authority, duplicates collision and durability policy, and makes marketplace/plugin behavior drift. It violates the completed handoff contract and Ports & Adapters. Rejected.

### Option B — application service copies verified trees into immutable destinations

A portable service could validate handoffs and stream-copy into a store port. This keeps orchestration centralized, but doubles I/O, creates a second hardened copier, and cannot itself prove filesystem atomicity, fsync, symlink behavior, or read-only sealing. It also widens the TOCTOU gap between rewalk and publication. Rejected.

### Option C — capability-owned staging plus one filesystem promotion adapter behind a narrow port (chosen)

Application code validates source/manifest/binding/logical evidence and creates an opaque promotion plan. The infrastructure adapter exclusively allocates staging, rewalks its owned content, derives strict physical keys, seals/syncs a prepared revision, and atomically publishes it. One engine handles marketplace and plugin variants through a schema-derived registry. Data and projection roots share only the safe root/path codec, not immutable-publication semantics.

**Choice**: Option C. It places policy-visible identities and ports inward while keeping filesystem correctness in one adapter. It also preserves the existing materializers unchanged: they receive an empty `StagingSlot`, never a store root.

## Trickiest unit first

Atomic no-replace publication is the highest-risk unit. Plain Node `rename()` can replace or merge differently by platform, and making the final directory before moving content creates a visible half-install. The design therefore defines visibility by a verified prepared directory plus `READY`, requires an adapter primitive with explicit no-replace semantics, and probes that primitive before accepting lifecycle work. Existing targets are never trusted from metadata alone: idempotency requires a complete bounded rewalk. If a supported Node primitive cannot satisfy no-replace publication on a platform, the fallback is a platform-specific adapter or transactional local store behind the same port—not best-effort overwrite or lock-only publication.

## Implementation units

### Unit 1: Store identities, locators, stable data/projection references, and application port

**Story**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-contracts`

**Files**:
- `src/domain/content-store.ts`
- `src/domain/state/references.ts`
- `src/domain/state/installed-state.ts`
- `src/application/content-promotion.ts`
- `src/application/ports/content-store.ts`
- `test/domain/content-store.test.ts`
- `test/domain/state/references.test.ts`
- `test/domain/state/installed-state.test.ts`
- `test/application/content-promotion.test.ts`

```typescript
// src/domain/content-store.ts
export const ContentStoreKindRegistry = {
  marketplace: { tag: "marketplace-store-v1" },
  plugin: { tag: "plugin-store-v1" },
} as const;

export const MarketplaceStoreIdentitySchema = z.object({
  kind: z.literal("marketplace"),
  sourceHash: SourceHashSchema,
  revision: GitRevisionSchema,
  binding: ContentDigestSchema,
  key: taggedSha256("marketplace-store-v1"),
}).strict().readonly();

export const PluginStoreIdentitySchema = z.object({
  kind: z.literal("plugin"),
  sourceHash: SourceHashSchema,
  binding: ContentDigestSchema,
  key: taggedSha256("plugin-store-v1"),
}).strict().readonly();

export type ContentStoreIdentity =
  | z.infer<typeof MarketplaceStoreIdentitySchema>
  | z.infer<typeof PluginStoreIdentitySchema>;

export function createMarketplaceStoreIdentity(
  source: ResolvedMarketplaceSource,
  manifest: ContentManifest,
  binding: ContentDigest,
  sha256: Sha256,
): MarketplaceStoreIdentity;
export function createPluginStoreIdentity(
  source: ResolvedPluginSource,
  manifest: ContentManifest,
  binding: ContentDigest,
  sha256: Sha256,
): PluginStoreIdentity;
```

Constructors verify the resolved source hash, complete manifest, and recomputed materialization binding before deriving a tagged key from an injective versioned preimage. Types and routing derive from `ContentStoreKindRegistry`; no adapter switch owns a second variant list.

```typescript
// src/domain/state/references.ts
export const StateReferenceKindRegistry = {
  // existing entries...
  runtimeProjection: { tag: "runtime-projection-v1" },
} as const;
export const ProjectionRootRefSchema = taggedSha256<"ProjectionRootRef">(
  StateReferenceKindRegistry.runtimeProjection.tag,
);
export function deriveProjectionRootRef(
  identity: { scope: ScopeReference; plugin: PluginKey; projectionDigest: ContentDigest },
  sha256: Sha256,
): ProjectionRootRef;

// src/domain/state/installed-state.ts
export function deriveStablePluginDataRef(
  input: { scope: ScopeReference; plugin: PluginKey },
  sha256: Sha256,
): PluginDataRef;
```

`createInstalledRevisionRecord` and persisted verification use the stable data constructor. Content/configuration references remain revision-bound. Migration is unnecessary because no release exists; committed fixtures and all constructors update atomically in this feature.

```typescript
// src/application/ports/content-store.ts
export type StagingAllocation = Readonly<{
  slot: StagingSlot;
  allocationId: string; // opaque capability; never serialized or logged
}>;

export type PromotionResult = Readonly<{
  kind: "promoted" | "already-present";
  identity: ContentStoreIdentity;
  root: string; // ephemeral adapter result; forbidden in state
  manifest: ContentManifest;
}>;

export interface ContentStorePort {
  capabilities(signal: AbortSignal): Promise<ContentStoreCapabilities>;
  allocateStaging(signal: AbortSignal): Promise<StagingAllocation>;
  discardStaging(allocation: StagingAllocation, signal: AbortSignal): Promise<void>;
  promote(plan: VerifiedPromotionPlan, signal: AbortSignal): Promise<PromotionResult>;
  resolveMarketplace(record: MarketplaceSnapshotRecord, signal: AbortSignal): Promise<ResolvedContentRoot>;
  resolvePlugin(record: InstalledRevisionRecord, signal: AbortSignal): Promise<ResolvedContentRoot>;
  ensureDataRoot(input: StableDataRootRequest, signal: AbortSignal): Promise<WritableDataRoot>;
  allocateProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ProjectionRootAllocation>;
  sealProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<ResolvedProjectionRoot>;
}
```

`createPromotionPlan` is the only factory for an opaque, frozen `VerifiedPromotionPlan`; adapters reject structural forgeries with a runtime membership guard, then independently validate allocation ownership. The application contract imports no Node/filesystem APIs.

**Acceptance criteria**:
- [ ] Store identities change for any source hash, immutable revision, binding, or manifest change and never incorporate a caller path/display alias.
- [ ] Forged resolved sources, manifests, bindings, keys, logical refs, allocations, and promotion plans fail before filesystem mutation.
- [ ] `PluginDataRef` is stable across revisions for one scope/plugin, distinct across user/project scopes and plugin keys, and remains outside content identities.
- [ ] Projection references are registry-derived, scope/plugin/digest-bound, and cannot alias data or content references.
- [ ] The port exposes no `fs`, path-layout, chmod, fsync, rename, lock, state mutation, trust, activation, deletion, or GC primitive.

### Unit 2: Private staging allocation and ownership enforcement

**Story**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-staging`
**Depends on**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-contracts`

**Files**:
- `src/infrastructure/filesystem/content-store-layout.ts`
- `src/infrastructure/filesystem/staging-allocator.ts`
- `test/infrastructure/filesystem/content-store-layout.test.ts`
- `test/infrastructure/filesystem/staging-allocator.test.ts`

The layout codec accepts only branded store/reference values and strips validated digest prefixes to lowercase hex directory names. Root bootstrap walks each ancestor with `lstat`/`realpath`, rejects symlinks and non-directories, creates private host/store/staging parents with restrictive modes, and verifies the configured host root is absolute and adapter-owned.

The allocator uses injected cryptographic random bytes for a 128-bit allocation id, exclusive `mkdir(0700)`, canonicalizes the slot, records token + realpath + device/inode identity in a process-private map, and returns a frozen capability. No OS temporary directory is used. `discardStaging` is idempotent only for a still-owned allocation and refuses path, parent, inode, or token substitution before recursive removal.

**Acceptance criteria**:
- [ ] Every allocation is a new empty real directory under `<host-root>/staging/v1`, mode `0700` where supported, and is accepted by the existing materializer unchanged.
- [ ] Materializers see only `allocation.slot`; they cannot select or infer marketplace/plugin/data/generated destinations from the port.
- [ ] Relative roots, symlinked parents/slots, pre-existing leaves, weak permissions, token swaps, path swaps, inode replacement, and foreign allocation objects fail closed.
- [ ] Cancellation before allocation leaves nothing; discard removes only the owned slot and is safe to retry after verified absence.
- [ ] Safe diagnostics and logs never expose allocation ids, absolute roots, source URLs, or native filesystem messages.

### Unit 3: Verified, durable, atomic immutable promotion engine

**Story**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-atomic-engine`
**Depends on**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-staging`

**Files**:
- `src/application/ports/content-store-platform.ts`
- `src/infrastructure/filesystem/immutable-content-store.ts`
- `src/infrastructure/filesystem/content-store-durability.ts`
- `test/infrastructure/filesystem/immutable-content-store.test.ts`
- `test/infrastructure/filesystem/content-store-durability.test.ts`

```typescript
export interface ContentStorePlatform {
  probe(root: string): Promise<ContentStoreCapabilities>;
  renameNoReplace(source: string, destination: string): Promise<"published" | "exists">;
  syncFile(path: string): Promise<void>;
  syncDirectory(path: string): Promise<void>;
  sealReadOnly(root: string, manifest: ContentManifest): Promise<void>;
}

export type ContentStoreCapabilities = Readonly<{
  atomicNoReplaceDirectory: true;
  fileSync: true;
  directorySync: true;
  readOnlyModeEnforcement: "posix-mode";
}>;
```

Promotion validates the opaque plan and allocation record, requires exact `<slot>/content`, rejects leftover `.work`, and calls the bounded lifecycle verifier. It recomputes the store identity from the verified rewalk rather than trusting a requested key. A unique prepared sibling receives strict metadata and a `READY.tmp` file; files and directories are sealed and synced bottom-up, then rewalked. `READY.tmp` is synced/renamed to `READY`, the prepared directory is synced, `renameNoReplace` publishes it, and the final parent is synced before success.

If publication reports `exists`, the adapter verifies strict metadata, ready marker, permissions, and full content against the plan. Exact equality returns `already-present` and consumes staging. Any difference raises a collision without touching the existing target. Cancellation propagates until publication begins; after publication, the adapter completes verification/parent sync and returns success or a typed indeterminate durability failure for later recovery—never a false cancellation that invites destructive rollback.

**Acceptance criteria**:
- [ ] Mutation between materializer handoff and promotion, including bytes, mode, type, symlink target, added/removed entry, or manifest/binding/source evidence, is detected before publication.
- [ ] Only a complete ready revision resolves; tests pause/crash after every write, seal, sync, marker, and rename boundary and never observe partial content.
- [ ] Concurrent identical promotions converge to one exact revision with one `promoted` and verified `already-present` results; differing content under one key produces collision and preserves the winner byte-for-byte.
- [ ] A ready matching target is idempotent only after full rewalk; metadata or marker alone is insufficient.
- [ ] Full success occurs only after file/directory sync and final-parent sync; unsupported/probe/runtime durability failure is explicit and never downgraded.
- [ ] Published files/directories match manifest executable semantics and read-only modes, and the adapter exposes no mutation operation for immutable roots.

### Unit 4: Content resolution plus persistent data and generated projection roots

**Story**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-runtime-roots`
**Depends on**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-contracts`

**Files**:
- `src/infrastructure/filesystem/content-root-resolver.ts`
- `src/infrastructure/filesystem/runtime-root-store.ts`
- `test/infrastructure/filesystem/content-root-resolver.test.ts`
- `test/infrastructure/filesystem/runtime-root-store.test.ts`

Marketplace/plugin resolvers accept validated state records, verify their logical content references through completed state constructors, derive the physical store identity from safe source evidence plus binding, require `READY`, and rewalk before first process use. They return an ephemeral `ResolvedContentRoot`; no absolute path is added to state or a projection descriptor schema.

`ensureDataRoot` verifies `deriveStablePluginDataRef({scope, plugin})`, creates `data/v1/<digest>` exclusively as writable/private `0700`, and returns the same root across plugin revisions. It rejects content/projection refs and never removes existing data. Projection allocation creates a private unique work root under `generated/v1/.staging`; sealing verifies the expected projection digest, applies read-only permissions/durability, and atomically publishes `generated/v1/<projection-ref-digest>`. Generated roots use the same visibility/durability discipline but not source-manifest semantics.

**Acceptance criteria**:
- [ ] Marketplace/plugin resolution derives paths only from verified state evidence and refuses missing, unready, colliding, mutated, or wrong-kind roots.
- [ ] User and project roots for one plugin never alias; two revisions in one scope resolve different content but the same writable data root.
- [ ] Data creation is idempotent, private, writable, outside immutable revisions, and has no deletion/reset API.
- [ ] Projection roots are immutable after sealing, digest-verified, replaceable, separate from content/data, and invisible before ready publication.
- [ ] No filesystem active marketplace pointer exists; changing selected marketplace content requires a later authoritative state commit.

### Unit 5: Node composition, public contract, adversarial integration, and rolling docs

**Story**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-immutable-stores-promotion-atomic-engine`, `epic-transactional-plugin-lifecycle-immutable-stores-promotion-runtime-roots`

**Files**:
- `src/infrastructure/source/create-source-materializers.ts`
- `src/infrastructure/filesystem/create-content-store.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/content-promotion.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md` and `docs/COMPATIBILITY.md` only if implementation changes their assertions

The Node factory composes one host-root-bound `ContentStorePort` with the existing source materializers. Public exports include schema-derived store/reference contracts, promotion-plan application functions, narrow port/result types, and `createNodeContentStore`; low-level path codecs, allocation constructors/tokens, no-replace/fsync/chmod adapters, metadata formats, and cleanup helpers stay internal.

Integration tests allocate through the store, materialize real local Git/marketplace-relative/npm fixtures into the returned slot, mutate handoffs adversarially, promote, restart the store, resolve through state records, and prove data survives update while generated roots remain replaceable. Dependency rules keep domain/application free of Node and prevent lifecycle consumers from importing filesystem internals.

**Acceptance criteria**:
- [ ] Real source handoffs promote through one store without giving materializers a destination path, and restart resolution uses logical records only.
- [ ] Public source/compiled exports expose the intended contracts and no allocator token factory, raw path builder, platform primitive, immutable writer, deletion, activation, state mutation, or trust API.
- [ ] Integration tests cover restart, cancellation, concurrent same/different promotion, crash points, tampering, symlink/path/inode swaps, durability failure, read-only modes, idempotency, collision, data continuity, and projection replacement.
- [ ] Dependency-cruiser proves domain/application contracts import no Node/infrastructure/runtime/Pi modules and only infrastructure implements physical layout/publication.
- [ ] `ARCHITECTURE.md` describes marker-gated atomic publication, logical state selection instead of a store pointer, stable external data, projection separation, and honest platform support without migration-history prose.
- [ ] Full `npm test` passes typecheck, boundaries, unit/integration tests, build, and exact compiled package exports.

## Store ownership and visibility matrix

| Root | Identity authority | Writable by | Visibility condition | Explicitly not owned here |
|---|---|---|---|---|
| `staging/v1/<random>` | process-private allocation capability | materializer inside `content/` and `.work/` only | never runtime-visible | retention/age cleanup after crash |
| marketplace revision | verified resolved marketplace source + manifest binding | promotion adapter before seal only | valid metadata + `READY` + rewalk | active selection, refresh policy, GC |
| plugin revision | verified resolved plugin source + manifest binding | promotion adapter before seal only | valid metadata + `READY` + rewalk | trust, activation, selected revision, GC |
| persistent data | stable scope + plugin `PluginDataRef` | plugin runtime | verified ref + private root | deletion/reset/backup/migration policy |
| generated projection | scope + plugin + projection digest | future projection writer before seal | sealed digest + `READY` | projection contents, active selection, reload |

## Implementation order

1. `epic-transactional-plugin-lifecycle-immutable-stores-promotion-contracts`
2. In parallel after contracts:
   - `epic-transactional-plugin-lifecycle-immutable-stores-promotion-staging`
   - `epic-transactional-plugin-lifecycle-immutable-stores-promotion-runtime-roots`
3. `epic-transactional-plugin-lifecycle-immutable-stores-promotion-atomic-engine`
4. `epic-transactional-plugin-lifecycle-immutable-stores-promotion-hardening`

The contracts story fixes identity and port vocabulary first. Staging and runtime roots then have disjoint adapters and test surfaces. The atomic engine consumes staging ownership and is deliberately isolated for crash/concurrency scrutiny. Hardening converges all paths through real source handoffs, package exports, boundaries, and rolling docs.

## Testing

- **Pure identity/reference tests**: injected SHA-256 vectors, every source variant, manifest/binding tamper, permutation determinism, malformed tags/digests, cross-kind alias attempts, stable data across updates, scope/plugin separation, and projection digest separation.
- **Application tests**: fake port proves opaque plan construction, source/manifest/binding validation, exact allocation root binding, cancellation, safe result/error projection, and absence of filesystem assumptions.
- **Staging tests**: absolute/private root bootstrap, exclusive random allocation, empty-slot compatibility with existing materializers, symlink/non-directory/weak-mode ancestors, token/root/inode/device swaps, foreign capabilities, repeated discard, and cleanup failures.
- **Rewalk tests**: mutate bytes, size, executable bit, symlink text/target, entry type, case/Unicode collision, added/removed entries, special files, limits, and source/content binding between handoff and promotion.
- **Atomicity tests**: injected platform primitive records every file/directory sync and pauses at each boundary. Resolvers run concurrently and see only absent or a complete ready revision. No test treats a lock as a substitute for no-replace publication.
- **Idempotency/collision tests**: concurrent identical plans, sequential retries after lost result, pre-existing matching tree, forged metadata, valid marker with changed tree, same key/different content, incomplete destination, and prepared-directory leftovers.
- **Durability/read-only tests**: missing directory fsync, failed file sync, final-parent sync failure, unsupported platform probe, chmod/seal failure, post-seal rewalk, writable files, executable preservation, and safe indeterminate outcomes after publication.
- **Root separation tests**: same plugin user/project, two revisions, marketplace/plugin hash overlap attempts, data continuity, generated digest changes, no path from aliases/URLs/plugin names, and no filesystem active pointer.
- **Integration tests**: existing local Git/Git-subdir/marketplace-path/npm materializers, restart, state-record resolution, materializer failure/cancellation cleanup, parallel processes where supported, and lifecycle-shaped explicit discard before state commit.
- **Boundary/public tests**: exact exports, package ESM import, dependency-cruiser canaries, source scans for raw path/source interpolation, and diagnostics redaction for paths/tokens/native causes.

## Risks

- **Riskiest assumption — portable no-replace directory publication plus directory fsync is available through a maintainable Node adapter**: Node's ordinary rename contract is not enough on every platform. Mitigation: isolate and probe `ContentStorePlatform`, test native behavior, and fail capability checks. Fallback: add a small platform-specific binding or transactional local-store adapter behind the port; do not emulate atomicity with overwrite or a process-local lock.
- **TOCTOU between final rewalk and publication**: a same-user process could mutate private staging. Mitigation: private ancestors, allocation ownership/inode checks, immediate seal, post-seal rewalk, and prepared-root publication. Residual privileged/same-account adversary risk is documented rather than overstated.
- **Durability after rename can be indeterminate**: publication may be visible before final-parent sync reports failure. Mitigation: classify the result as indeterminate, never delete the target, and let later recovery inspect ready metadata/content. Operations must not assume failure means absence.
- **Read-only permissions are not an adversarial sandbox**: the account owner can chmod content and Windows semantics differ. Mitigation: capability probe, no store mutation API, runtime read-only path use, verification on resolution, and honest support language. Plugin process sandboxing is outside this feature.
- **Changing pre-release `PluginDataRef` derivation affects completed fixtures/contracts**: leaving it revision-bound would violate data survival. Mitigation: make the correction in the first story, update all constructors/fixtures/public tests together, and add explicit two-revision continuity tests before downstream operations consume it.
- **Full rewalk on every idempotent retry or process resolution can be expensive**: correctness and collision safety take precedence. Mitigation: always rewalk before promotion and first resolution; process-local verified inode metadata may cache subsequent reads. Any persistent verification cache must be digest-bound and is late-bound performance work.
- **Incomplete destinations after crashes need ownership-safe cleanup**: eager cleanup here could delete another process's promotion. Mitigation: unready targets are invisible; this feature only resumes/removes a matching adapter-owned pending directory. General age/reference-based cleanup belongs to recovery/GC.
- **Least certainty — generated projection writer contract**: later runtime epics may need a richer prepared-projection API. Mitigation: expose allocation/seal around bytes and digest only, with no component-specific shape. The port can gain a new writer adapter without changing immutable content/data identities.

## Pre-mortem

This design fails if a forged handoff can make lifecycle rename an arbitrary path, a matching directory name is accepted without hashing its tree, a crash exposes half a revision, two promoters overwrite each other, an update silently receives fresh data, or a generated projection becomes authoritative state. The design counters those failures with tracked staging capabilities, exact-root and inode checks, adapter-owned bounded rewalks, marker-gated no-replace publication, collision verification, stable scope/plugin data references, and projection refs that remain replaceable caches.

The most dangerous shortcut would be to call `verifyMaterializedContent` in application code and then perform a later generic rename: that leaves filesystem ownership, TOCTOU, collision, and durability semantics undesigned. Implementation must keep rewalk + sealing + sync + publication in one adapter operation. If the required primitive cannot be proven, the story remains blocked on a platform adapter rather than weakening `promoted` semantics.
