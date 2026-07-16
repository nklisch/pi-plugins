---
id: epic-skills-hook-runtime-projection-reload-evidence
kind: feature
stage: review
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Skill and Hook Projection with Reload Evidence

## Brief

Make the lifecycle's complete `PluginRuntimeProjection` consumable by the Pi runtime without creating a second authority. The capability prepares and verifies the full scope/plugin/revision-bound projection cache, resolves immutable plugin content and stable data roots through injected lifecycle ports, and derives one deterministic runtime snapshot for this epic's skill and hook components. MCP entries remain present and hash-bound for the sibling MCP adapter; this feature neither interprets nor activates them.

Expose exact skill/hook contribution evidence for activation, deactivation, and reload observation. Evidence remains keyed to the complete projection digest so native composition can combine it with the MCP contribution before satisfying `LifecycleReloadPort`; this feature never treats a successful reload request or its own component slice as proof that the whole bundle is active. User/project scope, current project identity, and Pi project trust remain explicit, while authoritative state reads, credential adapters, reload orchestration, and recovery stay with their existing owners.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: foundation capability — skill discovery and hook adaptation consume its verified runtime snapshot
- Complete-bundle boundary: preserves all skill, hook, and MCP inventory while owning only skill/hook runtime evidence

## Simplification opportunity

- Reuse the existing projection digest/reference, immutable generated-root support, content/data resolvers, and lifecycle observation vocabulary instead of creating per-component state, projection pointers, or reload protocols.

## Foundation references

- `docs/SPEC.md` — State contract; Install transaction; Enablement
- `docs/ARCHITECTURE.md` — Runtime projections; Runtime activation; Installation transaction
- `docs/COMPATIBILITY.md` — Whole-plugin behavior; Plugin path environment

## UI alignment

Mockups skipped. This is a backend-only projection and observation capability with no screen, flow, or visual component. `/plugin` management and reload feedback remain owned by `epic-native-plugin-management`.

## Design decisions

- **Discovery posture**: Direct-read only, as required by the delegated autopilot pass. Grounding covered project rules/conventions, the principles and UI decision matrix, `VISION`, `SPEC`, `ARCHITECTURE`, `COMPATIBILITY`, the parent epic, the completed lifecycle operation/projection/reload contracts, immutable content/data/generated-root adapters, transition/recovery seams, current source and representative tests, and the MCP sibling briefs. No nested agent, peer mechanism, or question was used.
- **UI**: Explicitly skipped under the backend-only rule. No mock files are created.
- **One complete cached descriptor**: The cache contains the canonical, schema-validated `PluginRuntimeProjection` unchanged. It does not split skills, hooks, and MCP into separately persisted files. Decoding verifies canonical bytes, the complete projection digest, the scope/plugin-bound `ProjectionRootRef`, and the generated-root payload digest before exposing any component.
- **Projection identity versus cache integrity**: Keep `PluginRuntimeProjection.digest` as the authoritative complete-bundle identity. Correct the existing generated-root contract so its metadata separately carries `projectionDigest` and `payloadDigest`; the current root store incorrectly assumes the logical projection digest can also equal the filesystem tree digest. `ProjectionRootRef` remains derived only from scope/plugin/complete projection digest. The payload digest protects the exact cache bytes and cannot become a lifecycle identity or pointer.
- **Preparation timing**: `RuntimeProjectionPort.prepare` writes or verifies the logical cache before lifecycle coordination, as it does today. It does not resolve the plugin content root, because install/update promotion has not happened yet. After commit/reload, native composition supplies the exact installed revision record from its existing authority/transition path; this feature resolves that record through `ContentStorePort.resolvePlugin` and `ensureDataRoot`. It never reads `LifecycleStateStore`, transition storage, manifests, or raw host paths.
- **No path invention**: The snapshot retains the `ResolvedContentRoot` and `WritableDataRoot` returned by the existing injected store port. It does not derive a store path from a digest, concatenate a skill root, decode a logical reference into a filesystem path, or create a second resolver. Skill-root containment and final resource paths remain the skill-discovery feature's responsibility; hook execution consumes the exact returned roots later.
- **Exact revision handoff**: Snapshot construction accepts an active expectation plus its exact `InstalledRevisionRecord`. It rejects any mismatch in scope, plugin identity, selected revision, content reference, data reference, or configuration reference before calling a root port. This is the minimum evidence needed by the existing resolvers and avoids widening `PluginRuntimeProjection` with physical store identity or duplicating authoritative installed state.
- **Current project is runtime evidence**: Every installed snapshot set records one current `ProjectIdentity`, `ProjectKey`, and `ProjectTrustAssessment`, acquired through `ProjectRootAuthorityPort` and `ProjectTrustPort`. A project-scoped projection activates only when its scope key equals the current project key and trust is currently `trusted`; mismatch or untrusted status is a typed failure, never silent omission. User-scoped projections remain usable in an untrusted project, but their observation still records that current identity/trust explicitly.
- **Deterministic snapshot set**: Build every candidate snapshot and verify every collision before one synchronous in-memory swap. The set is process-local, immutable, and replaceable on reload; it is not persisted, is not authoritative state, and stores no per-component active pointer. A read-only catalog is exposed to later skill/hook consumers while the reconcile capability remains private to native composition.
- **Collision behavior**: Duplicate scope/plugin targets in one desired set fail as `TARGET_COLLISION`; user and project copies of the same plugin remain distinct. Exact cache publication races deduplicate only after complete byte/root verification, while a same reference with different bytes is `STORE_IDENTITY_COLLISION`. Skill-name collisions across plugins are preserved, not dropped, renamed, or resolved here; the later `resources_discover` adapter must preserve Pi's native first-skill collision behavior.
- **MCP remains complete and uninterpreted**: Cache read returns one verified complete projection to native composition. The skill/hook snapshot copies only `skills` and `hooks`; it neither transforms nor hashes MCP fields independently. The untouched complete projection remains available for the sibling MCP participant, and every contribution is bound to the same complete projection digest, including an empty component slice.
- **Observation, not invocation**: Reconciliation returning `applied` means only that a complete derived snapshot set was atomically installed. Lifecycle success requires a separate `observe` call against the read-only catalog. Active evidence enumerates the exact skill/hook component ids and a deterministic slice digest; inactive evidence requires an initialized complete catalog and verified absence. Neither `ctx.reload()` acceptance nor a reconcile return value is activation proof.
- **Whole-bundle composition**: Extend the common reload evidence contract with generic `skills-hooks` and `mcp` contribution bindings. Native composition obtains the authoritative expected projection through its existing lifecycle/transition owner, independently asks both participants to observe, and calls `composeActivationObservation`. The helper returns a `LifecycleReloadPort.observe` value only when exactly one contribution from each participant agrees on active/inactive kind, scope, plugin, revision when active, complete projection/tombstone digest, and current project identity/trust. Missing, duplicate, stale, partial, or disagreeing evidence is a mismatch. This feature never exports a complete `LifecycleReloadPort` implementation and never claims MCP activation.
- **Exact inactive evidence**: Add `projectionDigest` and current-project context to the inactive `ActivationObservation`; update lifecycle/recovery comparison to match the canonical inactive expectation digest. Absence without the exact tombstone digest is insufficient deactivation evidence.
- **Cancellation and errors**: Projection preparation preserves the existing port behavior: abort propagates, while malformed/colliding/cache failures map to lifecycle `PROJECTION_FAILED`. Runtime reconciliation returns `cancelled` before the swap, or a stable failure code with no catalog change. If cancellation races after the synchronous swap, native composition treats the result as ambiguous and relies on independent observation/lifecycle compensation. Native causes and absolute roots never enter diagnostics.
- **Public/private boundary**: Public package exports are limited to schema-derived cache/snapshot/contribution contracts, the richer cache reader interface, the read-only skill/hook catalog, participant factory, and composition verifier. Canonical JSON helpers, cache filenames, filesystem read/write routines, mutable maps, target-key encoding, allocation cleanup, and generated-root metadata stay private.
- **Foundation timing**: Code-first. Existing foundation documents already describe complete logical projections, replaceable caches, stable data, project trust, and exact observation. Implementation updates them only if the landed payload-digest distinction or composed contribution wording makes a current assertion misleading.
- **Advisory review**: The boundary is cross-cutting and would normally warrant advisory design review, but the caller explicitly prohibited nested agents/peer review. Design-time advisory is skipped non-blockingly; feature-level implementation review remains required under the project policy.

## Architectural choice

### Option A — persist resolved skill/hook paths beside authoritative state

Lifecycle could write ready-to-use absolute roots or component-specific pointers. Startup would be cheap, but updates/project moves would stale those values, generated state would become a second authority, and skills/hooks could diverge from MCP. This violates the state schema and complete-bundle guarantees. Rejected.

### Option B — reread authoritative state and immutable manifests inside each runtime adapter

Skill and hook adapters could independently discover the selected revision, resolve paths, and rebuild their slices. That avoids a shared snapshot type, but duplicates state/trust/project reads, creates ordering races, and gives each component a partial view of a whole-plugin transition. It also makes native composition unable to prove both slices observed one digest. Rejected.

### Option C — one logical cache, post-commit root resolution, and composed contribution evidence (chosen)

A filesystem adapter implements the existing `RuntimeProjectionPort` with one canonical complete descriptor. Native composition decodes it once, supplies the exact installed revision evidence, and uses one snapshot loader to resolve roots and build an immutable skill/hook catalog. Skill/hook and MCP participants independently observe that same complete digest; a pure common verifier is the only path to lifecycle observation.

**Choice**: Option C. It reuses existing lifecycle and root ports, keeps the cache replaceable, makes current project trust explicit, and introduces no second state store, component pointer, or reload protocol.

## Trickiest unit first

The hardest seam is proving that a cached projection and the post-commit roots describe the same active revision without rereading authority. The cache is prepared before promotion, yet physical content may be resolved only after state commits. The design therefore keeps the cache purely logical, requires native composition to pass the exact `InstalledRevisionRecord` selected by its existing authority/transition owner, cross-checks every logical reference against the complete projection, and only then calls the existing content/data root methods. The resulting snapshot carries both logical identity and adapter-issued roots. If any cache byte, revision field, project identity, trust decision, or root handoff disagrees, no catalog swap occurs and lifecycle receives failure/compensation rather than partial evidence.

## Implementation units

### Unit 1: Complete projection cache codec and generated-root contract

**Story**: `epic-skills-hook-runtime-projection-reload-evidence-cache-contract`

**Files**:
- `src/application/runtime-projection-cache.ts`
- `src/application/ports/runtime-projection.ts`
- `src/application/ports/content-store.ts`
- `src/infrastructure/filesystem/runtime-projection-cache.ts`
- `src/infrastructure/filesystem/runtime-root-store.ts`
- `test/application/runtime-projection-cache.test.ts`
- `test/infrastructure/filesystem/runtime-projection-cache.test.ts`
- `test/infrastructure/filesystem/runtime-root-store.test.ts`

```typescript
export const RuntimeProjectionCacheEnvelopeSchemaV1 = z.object({
  cacheVersion: z.literal(1),
  projection: PluginRuntimeProjectionSchemaV1,
}).strict().readonly();
export type RuntimeProjectionCacheEnvelope = z.infer<
  typeof RuntimeProjectionCacheEnvelopeSchemaV1
>;

export type PreparedRuntimeProjection = Readonly<{
  expectation: Extract<ProjectionExpectation, { kind: "active" }>;
  projection: PluginRuntimeProjection;
  payloadDigest: ContentDigest;
}>;

export type RuntimeProjectionCacheReadResult =
  | Readonly<{ kind: "ready"; value: PreparedRuntimeProjection }>
  | Readonly<{
      kind: "failed";
      code: "CACHE_MISSING" | "CACHE_CORRUPT" | "IDENTITY_COLLISION" | "ADAPTER_FAILED";
    }>
  | Readonly<{ kind: "cancelled" }>;

export interface RuntimeProjectionCacheReaderPort {
  read(
    expectation: Extract<ProjectionExpectation, { kind: "active" }>,
    signal: AbortSignal,
  ): Promise<RuntimeProjectionCacheReadResult>;
}

export interface RuntimeProjectionCachePort
  extends RuntimeProjectionPort, RuntimeProjectionCacheReaderPort {}

export type ProjectionRootRequest = Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  projectionDigest: ContentDigest; // complete bundle identity
  payloadDigest: ContentDigest;    // exact generated tree integrity
  projectionRef: ProjectionRootRef;
}>;

export interface ContentStorePort {
  // existing methods remain
  discardProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<void>;
  resolveProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ResolvedProjectionRoot>;
}
```

`encodeRuntimeProjectionCache` parses and recomputes the active expectation, recursively canonicalizes object keys, emits UTF-8 for exactly one `projection.json`, and derives `payloadDigest` from the fixed filename/mode/size/content-digest entry list. `decodeRuntimeProjectionCache` enforces the bounded file size, strict UTF-8/JSON/schema parsing, canonical byte equality, and exact expected scope/plugin/revision/projection digest/ref. The filesystem adapter allocates, writes with create-only semantics, seals, and rereads before returning; inactive expectations are verified and returned without allocating a root.

Generated-root metadata becomes `{ version, projectionRef, projectionDigest, payloadDigest, scope, plugin }`. `inspectProjection` independently hashes the payload tree and verifies both digests and the self-derived ref. Existing roots are reusable only when all metadata and bytes match. Preparation failure or pre-seal cancellation calls `discardProjectionRoot`; post-publication ambiguity leaves a ready immutable cache for inspection/GC rather than deleting by guess.

**Acceptance criteria**:
- [ ] The cache round-trips the complete skill/hook/MCP projection byte-for-byte canonically; array order remains the lifecycle's canonical component-id order.
- [ ] Any MCP-only change changes the complete projection digest/ref even though this feature never interprets that entry.
- [ ] Logical projection digest and payload tree digest are distinct, independently verified fields; neither substitutes for the other.
- [ ] Missing/extra fields, non-canonical JSON, invalid UTF-8, oversized files, digest/ref/scope/plugin/revision mismatch, extra payload entries, symlinks, mutable controls, and tampering return corruption/failure without a projection value.
- [ ] Concurrent identical prepares converge after exact verification; same ref/different payload is a collision and never overwrites the winner.
- [ ] Abort before publication removes only the owned allocation; abort or error after possible publication never reports a false cancellation that invites deletion.
- [ ] `RuntimeProjectionPort.prepare` remains the sole lifecycle preparation seam and does not read state, resolve content/data, trigger reload, or activate components.

### Unit 2: Exact root resolution and deterministic skill/hook snapshots

**Story**: `epic-skills-hook-runtime-projection-reload-evidence-snapshot-resolution`
**Depends on**: `epic-skills-hook-runtime-projection-reload-evidence-cache-contract`

**Files**:
- `src/runtime/skill-hook/runtime-snapshot.ts`
- `src/application/ports/project-root-authority.ts` (reuse only; change only if an export type needs clarification)
- `src/application/ports/project-trust.ts` (reuse only)
- `src/application/ports/content-store.ts` (reuse resolved-root contracts from Unit 1)
- `test/runtime/skill-hook/runtime-snapshot.test.ts`

```typescript
export const CurrentProjectRuntimeContextSchema = z.object({
  identity: ProjectIdentitySchema,
  projectKey: ProjectKeySchema,
  trust: ProjectTrustAssessmentSchema,
}).strict().readonly();
export type CurrentProjectRuntimeContext = z.infer<
  typeof CurrentProjectRuntimeContextSchema
>;

export type RuntimeProjectionSelection = Readonly<{
  prepared: PreparedRuntimeProjection;
  revision: InstalledRevisionRecord;
}>;

export type SkillHookRuntimeSnapshot = Readonly<{
  schemaVersion: 1;
  scope: ScopeReference;
  plugin: PluginKey;
  revision: ContentDigest;
  projectionDigest: ContentDigest;
  projectionRef: ProjectionRootRef;
  currentProject: CurrentProjectRuntimeContext;
  content: ResolvedContentRoot;
  data: WritableDataRoot;
  skills: readonly SkillComponent[];
  hooks: readonly HookComponent[];
  contributionDigest: ContentDigest;
}>;

export type SkillHookSnapshotResult =
  | Readonly<{ kind: "ready"; snapshot: SkillHookRuntimeSnapshot }>
  | Readonly<{
      kind: "failed";
      code:
        | "REVISION_MISMATCH"
        | "CURRENT_PROJECT_UNAVAILABLE"
        | "PROJECT_IDENTITY_MISMATCH"
        | "PROJECT_UNTRUSTED"
        | "CONTENT_UNAVAILABLE"
        | "DATA_UNAVAILABLE"
        | "ADAPTER_FAILED";
    }>
  | Readonly<{ kind: "cancelled" }>;

export function createSkillHookSnapshotLoader(dependencies: Readonly<{
  content: Pick<ContentStorePort, "resolvePlugin" | "ensureDataRoot">;
  projectRoots: ProjectRootAuthorityPort;
  projectTrust: ProjectTrustPort;
  sha256: Sha256;
}>): Readonly<{
  load(selection: RuntimeProjectionSelection, signal: AbortSignal): Promise<SkillHookSnapshotResult>;
}>;
```

The loader acquires and verifies the current project capability, assesses trust, validates the revision envelope against the prepared projection, and only then resolves immutable content and stable data. The contribution digest hashes logical identity plus the complete normalized skill/hook arrays; it excludes absolute roots and current machine paths. Snapshots preserve all skill names/roots and hooks without deduplication. The prepared complete projection remains outside the narrowed snapshot so native composition can pass the same value to MCP.

**Acceptance criteria**:
- [ ] Exact scope/plugin/revision/projection digest/ref/content ref/data ref/configuration ref are present and cross-checked before any runtime root is exposed.
- [ ] Content and data paths appear only as outputs of the injected existing root methods; no digest/path codec, raw state read, manifest reread, or relative-root join exists in runtime snapshot code.
- [ ] The same logical input and project context yields stable ordering and contribution digest regardless of physical host root; user/project same-key projections remain distinct.
- [ ] A project projection for another current project or an untrusted current project fails closed; user scope remains loadable while recording current identity/trust.
- [ ] Empty skill or hook slices remain valid and are still bound to the complete projection digest.
- [ ] Cancellation or any failed selection leaves no partial snapshot value and exposes no native cause, secret, or absolute path in the failure result.

### Unit 3: Atomic snapshot catalog and independently composed reload evidence

**Story**: `epic-skills-hook-runtime-projection-reload-evidence-contribution-observation`
**Depends on**: `epic-skills-hook-runtime-projection-reload-evidence-snapshot-resolution`

**Files**:
- `src/runtime/skill-hook/runtime-catalog.ts`
- `src/runtime/skill-hook/lifecycle-participant.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/application/recovery-contract.ts`
- `src/application/plugin-lifecycle-service.ts` (consume stricter inactive observation)
- `test/runtime/skill-hook/runtime-catalog.test.ts`
- `test/runtime/skill-hook/lifecycle-participant.test.ts`
- `test/application/lifecycle-transition-reconciler.test.ts`
- `test/application/plugin-lifecycle-service.test.ts`

```typescript
export type SkillHookRuntimeSetRequest = Readonly<{
  active: readonly RuntimeProjectionSelection[];
}>;

export type SkillHookReconcileResult =
  | Readonly<{ kind: "applied"; count: number }>
  | Readonly<{ kind: "failed"; code: "TARGET_COLLISION" | "SNAPSHOT_FAILED" | "ADAPTER_FAILED" }>
  | Readonly<{ kind: "cancelled" }>;

export interface SkillHookRuntimeCatalog {
  list(): readonly SkillHookRuntimeSnapshot[];
  get(scope: ScopeReference, plugin: PluginKey): SkillHookRuntimeSnapshot | undefined;
}

export interface SkillHookLifecycleParticipant {
  reconcile(request: SkillHookRuntimeSetRequest, signal: AbortSignal): Promise<SkillHookReconcileResult>;
  observe(
    expectation: ProjectionExpectation,
    signal: AbortSignal,
  ): Promise<SkillHookContributionObservationResult>;
}

export const RuntimeContributionObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    participant: z.enum(["skills-hooks", "mcp"]),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("inactive"),
    participant: z.enum(["skills-hooks", "mcp"]),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
  }).strict().readonly(),
]);

export const SkillHookContributionObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    participant: z.literal("skills-hooks"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
    skillComponentIds: z.array(ComponentIdSchema).readonly(),
    hookComponentIds: z.array(ComponentIdSchema).readonly(),
  }).strict().readonly(),
  z.object({
    kind: z.literal("inactive"),
    participant: z.literal("skills-hooks"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
    skillComponentIds: z.tuple([]),
    hookComponentIds: z.tuple([]),
  }).strict().readonly(),
]);

export function composeActivationObservation(input: Readonly<{
  expectation: ProjectionExpectation;
  skillsHooks: RuntimeContributionObservation;
  mcp: RuntimeContributionObservation;
}>): ActivationObservation;
```

`createSkillHookRuntimeParticipant` returns split capabilities: native composition receives `participant`; later skill/hook adapters receive only `catalog`. Reconcile loads all selections into a temporary map, rejects duplicate encoded target keys, sorts by explicit scope/plugin/component identity, checks abort immediately before the synchronous swap, and publishes one frozen set. Observe fails before first complete initialization. Active observation compares the entire logical binding and emits sorted exact ids from the installed snapshot. Inactive observation requires exact target absence in the initialized catalog and emits the canonical tombstone digest supplied by the authoritative expectation.

`composeActivationObservation` is pure validation, not a reload implementation. It requires one `skills-hooks` and one `mcp` observation; both must exactly match the expectation and each other, including current-project context. For project-active evidence it additionally requires current project key equality and `trusted`. It then returns the stricter `ActivationObservation`, whose inactive branch now includes `projectionDigest` and whose branches include current-project context. Lifecycle and recovery comparison use that digest; no participant invocation result is accepted as evidence.

**Acceptance criteria**:
- [ ] Reconcile is all-or-nothing across the full desired skill/hook set; load failure, target collision, or cancellation before swap leaves the previous catalog untouched.
- [ ] Read-only consumers cannot mutate, replace, or clear the catalog; no persistent state, active projection pointer, or per-component switch is introduced.
- [ ] Active observation proves exact scope/plugin/revision/complete projection digest plus actual skill/hook component ids and slice digest; stale snapshots fail observation.
- [ ] Inactive observation requires initialized-catalog absence and exact tombstone digest; wrong scope, plugin, project context, or digest fails.
- [ ] Native composition cannot produce `ActivationObservation` with only skill/hook evidence, only MCP evidence, duplicate participants, differing digests/revisions/project contexts, or a project-untrusted active contribution.
- [ ] Zero-MCP and zero-skill/hook plugins still require two independently observed empty contributions bound to the same complete digest.
- [ ] Existing lifecycle rollback/recovery tests use the stricter inactive digest and continue to distinguish accepted reload from independent observation.

### Unit 4: Composition contract, public boundary, and integration evidence

**Story**: `epic-skills-hook-runtime-projection-reload-evidence-integration-hardening`
**Depends on**: `epic-skills-hook-runtime-projection-reload-evidence-contribution-observation`

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/skill-hook-runtime-projection.test.ts`
- `test/integration/plugin-lifecycle.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed contracts make current assertions stale

The integration fixture uses one complete skill/hook/MCP projection and real generated-root/content/data adapters. It prepares before promotion, promotes content, resolves after commit-shaped handoff, atomically installs a skill/hook snapshot, and uses a minimal fake MCP contribution only to prove the common composition contract. The fake does not interpret or activate MCP. Update, disable, project-scope, corruption, cancellation, and mismatch cases assert evidence and rollback-facing outcomes rather than callback counts.

Public source/compiled allowlists expose the stable contracts and factories named above. They exclude cache filenames/codecs, raw generated-root metadata, target-key/path helpers, mutable catalog implementation, fake participant, filesystem primitives, state/transition readers, reload implementation, credential/configuration adapters, and MCP-specific behavior. Dependency rules keep application contracts free of Node/runtime/Pi imports, keep filesystem cache code out of runtime policy, and prevent runtime projection code from importing lifecycle state stores.

**Acceptance criteria**:
- [ ] One integration path proves prepare → promote → post-commit resolve → skill/hook reconcile → separate skill/hook+MCP observe → composed active evidence for a complete bundle.
- [ ] Update proves old/new revision and complete digests cannot alias; disable proves both participants must independently report the exact inactive tombstone before lifecycle observation succeeds.
- [ ] User/project same plugin keys remain isolated; current-project change or trust revocation blocks project evidence without disabling the user projection.
- [ ] Corrupt/noncanonical cache, wrong revision record, missing/unready content, data-root failure, target collision, participant disagreement, cancellation before swap, and cancellation after possible swap have explicit results and never manufacture success.
- [ ] Integration asserts the MCP inventory survives cache round-trip unchanged and is handed to the fake sibling while skill/hook code never imports MCP policy or launch types.
- [ ] Public and compiled export allowlists expose no second state store, component-specific projection pointer, alternate reload method, raw path resolver, or success-by-invocation API.
- [ ] Full `npm test` passes strict production/test typechecking, dependency boundaries, all Vitest suites, build, and exact compiled import. Evidence is compared against the stated starting baseline of 122 test files / 653 tests / 438 exports, with expected additions recorded rather than silently changing the contract.

## Implementation order

1. `epic-skills-hook-runtime-projection-reload-evidence-cache-contract`
2. `epic-skills-hook-runtime-projection-reload-evidence-snapshot-resolution`
3. `epic-skills-hook-runtime-projection-reload-evidence-contribution-observation`
4. `epic-skills-hook-runtime-projection-reload-evidence-integration-hardening`

The sequence is real: the loader needs a verified complete cache and corrected generated-root contract; the participant needs exact snapshots; integration can only prove lifecycle composition after the common observation vocabulary exists. These are checkpoints for one cohesive feature owner, not four default implementation agents.

## Simplification

- Keep one complete `projection.json`; do not create skill, hook, and MCP cache files or component-specific projection refs.
- Reuse `RuntimeProjectionPort`, `ContentStorePort`, `ProjectRootAuthorityPort`, `ProjectTrustPort`, `ProjectionExpectation`, and lifecycle observation/recovery comparison. Add only the read/discard methods and payload-integrity field the existing generated-root seam lacks.
- Keep the mutable catalog closure private and expose separate read-only and reconcile capabilities. Do not add a persistent runtime database, settings writer, active symlink, per-plugin file pointer, reload queue, or component enablement API.
- Preserve normalized components exactly. Skill path joining/collision semantics, hook mapping/execution, MCP projection/launch, raw state composition, credentials, reload invocation, and recovery stay with their owning features.
- Use one common contribution-binding schema and composition verifier; do not maintain parallel skill/hook and MCP lifecycle observation algorithms.
- Do not duplicate source-reader, compatibility, immutable-publication, state-CAS, or transition-recovery test matrices. This feature tests the new cache/snapshot/observation seams and composes existing ports.

## Testing

- **Canonical cache contract**: fixed complete vectors with reordered object keys, reordered component arrays, MCP-only mutation, forged digest/ref, malformed UTF-8/JSON/schema, noncanonical bytes, size limit, extra files, and payload/projection digest confusion. Protects deterministic decoding and complete-bundle binding.
- **Generated-root behavior**: identical prepare races, different-payload collision, pre-seal abort cleanup, ready-root restart resolution, tampered metadata/bytes/modes/controls, and post-publication ambiguity. Protects replaceable-cache integrity without repeating immutable plugin-store coverage.
- **Snapshot boundary**: table-driven scope/plugin/revision/ref mismatches; exact current-project identity/trust; user/project isolation; stable physical-root independence; content/data adapter failures; empty slices. Protects the no-state-read/no-path-invention seam.
- **Catalog and evidence**: atomic full-set replacement, duplicate target refusal, previous-set preservation on failure, pre-initialization inactive refusal, active ids/digest, exact inactive tombstone, stale project/trust, and abort before/after swap. Protects observation honesty.
- **Composition matrix**: matching skill/hook+MCP active, matching inactive, each missing participant, duplicate/wrong participant, revision/digest/scope/plugin/project mismatch, untrusted project, and empty-slice bundles. Protects the rule that this feature cannot satisfy lifecycle alone.
- **Whole-bundle integration**: one realistic complete fixture proves cache-to-roots-to-catalog-to-composition across update and disable. Existing lifecycle tests remain the owner of state commit, compensation, and recovery; this suite supplies exact runtime evidence to those seams.
- **Low-value tests avoided**: no tests that merely assert `prepare`, `reconcile`, or `reload` was called; no duplicate reader/compatibility/root-publication matrices; no snapshot of absolute temporary paths; no test per trivial schema field.

## Risks and rollback

- **Riskiest assumption — the generated-root seam can separate logical and payload digests without destabilizing completed lifecycle code**: the current implementation conflates them, so a real descriptor cannot satisfy both hashes. Mitigation: retain the existing projection ref/digest unchanged, add payload digest only to replaceable cache metadata, and update root tests before the cache adapter. Rollback: revert the cache adapter and payload field together; no authoritative state migration is needed and orphan generated roots remain collectible.
- **Native composition may be tempted to treat one participant as enough**: that would make skills/hooks appear healthy while MCP failed. Mitigation: the only helper that produces lifecycle observation requires both participant literals and the same complete digest. The feature does not export a complete reload adapter. Rollback/fallback: return observation mismatch and let existing lifecycle compensation/recovery restore or retain the previous revision.
- **Current project changes during reload**: a project root/trust decision could change between snapshot build and observation. Mitigation: both contributions carry the exact current-project context and composition compares them; mismatch cannot finalize. A subsequent reload rebuilds against the new project rather than mutating the prior catalog.
- **Cancellation after the atomic catalog swap is inherently ambiguous**: returning cancelled could invite an incorrect assumption that nothing changed. Mitigation: only pre-swap cancellation returns a clean cancelled result; a post-swap race is handled as ambiguous adapter outcome and must be observed or compensated by the existing lifecycle path.
- **Resolved roots are ephemeral machine paths**: hashing them would make evidence unstable and leaking them would widen the public surface. Mitigation: snapshot consumers receive them, but contribution digests and diagnostics use only logical refs/identities. Public results never serialize paths.
- **Inactive absence could be mistaken for proof before runtime initialization**: mitigation is an explicit uninitialized catalog state; inactive observation is unavailable until one complete desired set has been installed and current project context established.
- **Later skill/hook consumers could drift from snapshot evidence**: this feature proves the exact source catalog, not that Pi invoked every hook or resolved every skill. The downstream skill-discovery and hook-adaptation features must consume only this read-only catalog and retain its contribution binding. Native composition should not enable lifecycle observation until both consumers are wired to that catalog.
- **Least certainty — exact native reload-instance plumbing is owned elsewhere**: `ctx.reload()` and authoritative transition/state selection are not implemented here. Mitigation: participant and composition contracts are host-neutral and require the owning native adapter to supply exact selections. If native observation cannot access the current instance's participants, lifecycle remains failed/recovery-required; do not add a persistent projection pointer as a workaround.

## Pre-mortem

This design fails if a cache drops MCP while preserving a skill/hook hash, if a generated-root path is invented from a logical ref, if a stale revision record resolves under a new projection, if an untrusted or different project contributes executable components, if duplicate targets overwrite by map order, if reconcile success is treated as activation, or if native composition finalizes from one participant. Canonical complete-cache verification, separate payload integrity, exact revision cross-checks, injected roots, explicit current project/trust, collision refusal, independent observation, and mandatory two-participant composition address each failure.

The operational fallback is existing lifecycle behavior: cache/snapshot/reconcile errors fail preparation or reload; observation disagreement triggers compensation; uncertain state remains `recovery-required`. No new rollback engine, state mutation, or destructive cache guess is introduced.

## Integrated implementation summary
- Execution capability: GPT-5.6 Luna xhigh, one feature owner across the four sequential checkpoints; no nested agents, peer mechanism, or questions.
- Review weight: standard, from project convention. Per the caller boundary, the feature is intentionally left at `stage: review` and is not reviewed in this run.
- Child checkpoints completed directly to `done` in dependency order:
  - `epic-skills-hook-runtime-projection-reload-evidence-cache-contract` — `ee598bd`
  - `epic-skills-hook-runtime-projection-reload-evidence-snapshot-resolution` — `0504601`
  - `epic-skills-hook-runtime-projection-reload-evidence-contribution-observation` — `7051369`
  - `epic-skills-hook-runtime-projection-reload-evidence-integration-hardening` — `a79cfa3`
- Integrated behavior: one complete canonical `projection.json` preserves skill, hook, and MCP inventory; generated roots carry independently verified logical projection and payload digests; post-commit snapshot loading uses only injected content/data/project/trust ports; skill/hook catalogs atomically replace immutable derived snapshots; active and inactive skill/hook observations compose with an independently observed MCP contribution before lifecycle evidence exists.
- Public boundary: cache codecs/filesystem factory/path helpers/mutable catalog internals/state and transition authorities/reload invocation/MCP policy remain private; stable schemas, reader/catalog/participant ports, factories, and pure composition verification are exported.
- Full verification: `npm test` passed — 128 test files / 663 tests / 447 compiled exports, with strict production typecheck, dependency boundaries, Vitest, build, and exact compiled import. Starting baseline was 122 / 653 / 438; additions are 6 test files, 10 tests, and 9 exports.
- Deviations: `ProjectionRootRequest.payloadDigest` remains optional for legacy lifecycle-only generated-root callers; the filesystem adapter normalizes that compatibility shape, while all cache publications and metadata verify distinct payload and projection digests. Current-project context is hosted in the application project-trust port and re-exported by the runtime snapshot module to preserve dependency direction.
- Blockers: none. Feature review remains the next lifecycle step.

## Review findings (2026-07-16)

Effective weight: `standard`; one fresh-context Umans GLM 5.2 pass. The reviewer approved the implementation contract and found no runtime correctness blocker, but the receiver confirmed one bounded hardening set before closure:

- Add the designed snapshot trust/scope/adapter-failure/empty/cancellation matrix.
- Add participant collision, preserve-prior-on-snapshot-failure, pre-swap cancellation, and exact observation mismatch/project-trust cases.
- Add integrated update-alias, two-participant disable, project-scope isolation, and cache-corruption paths.
- Make the pure contribution composer require strict `SkillHookContributionObservation` evidence for the `skills-hooks` participant; do not fall back to a base observation missing exact skill/hook component IDs.

Tracked by `epic-skills-hook-runtime-projection-reload-evidence-review-hardening`. Under standard review, closure after this exact set is host verification only; no second independent pass. Optional duplicate-defense inside the private catalog, canonical project comparison, and cleanup-signal commentary do not cross the current-cycle bar and are intentionally rejected as unrelated churn.

## Review hardening completion

- Child story `epic-skills-hook-runtime-projection-reload-evidence-review-hardening` advanced directly to `done` in `e229464`.
- Strict composition now parses `skills-hooks` evidence with `SkillHookContributionObservationSchema` and retains the common base parser for MCP.
- Added non-vacuous snapshot, participant, and integration negative evidence for trust/scope/adapter failures, empty slices, cancellation, collision and catalog preservation, exact mismatches, revision/digest non-aliasing, two-participant disable, project context disagreement, and corrupt-cache fail-closed behavior.
- Administrative verification passed: focused Vitest 15 tests; full `npm test` 128 test files / 674 tests / 447 exports, including typecheck, boundaries, build, and compiled package import.
- No second review was run per the standard-review hardening instruction; feature remains at `stage: review` for the existing feature review boundary.
