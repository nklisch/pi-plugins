---
id: epic-skills-hook-runtime-skill-discovery
kind: feature
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime
depends_on: [epic-skills-hook-runtime-projection-reload-evidence]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Deterministic Skill Resource Discovery

## Brief

Activate every supported skill from the verified runtime snapshot through Pi's `resources_discover` lifecycle. Resolve each normalized relative skill root beneath the immutable installed revision, retain its bundled scripts, references, and assets in place, and return a stable, deduplicated path order across enabled user and trusted current-project projections. Pi's native skill validation and collision behavior remain authoritative; a plugin skill never silently replaces an earlier resource.

Discovery must recompute on startup and reload, remove disabled, updated, uninstalled, or scope-inapplicable roots, and report missing, escaping, mutated, or unreadable roots as activation evidence failures rather than dropping them. Project resources are contributed only for the matching trusted Pi project context. This feature does not copy skills into Pi settings, reinterpret foreign manifests, manage plugin state, or implement `/plugin` interaction.

## Epic context

- Parent epic: `epic-skills-hook-runtime`
- Position in epic: parallel consumer of the verified projection/reload capability
- Runtime boundary: contributes skill paths only; lifecycle state and Pi's skill loader remain separate authorities

## Simplification opportunity

- Delete the need for generated Pi skill settings or copied skill trees: immutable installed content plus `resources_discover` is the only discovery path.

## Foundation references

- `docs/VISION.md` — Product promise; Native Pi experience
- `docs/SPEC.md` — Skills; Enablement
- `docs/ARCHITECTURE.md` — Skills adapter; Pi integration
- `docs/COMPATIBILITY.md` — Skills; Names and collisions

## UI alignment

No presentation surface. Skill invocation and collision behavior use Pi's native resource UX; `/plugin` ownership remains outside this epic.

## Design decisions

- **Discovery posture**: Direct-read only, as required by the delegated design pass. Grounding covered the project rules and conventions; the principles and UI decision matrix; all foundation documents and `COMPATIBILITY.md`; the parent epic; the completed projection/reload feature body, source, and tests; the normalized skill reader and content-manifest reader; and the installed Pi 0.80.8 README, `docs/extensions.md`, `docs/skills.md`, `docs/packages.md`, extension examples index, and complete `dynamic-resources` example. No nested agent, peer mechanism, or question was used.
- **UI**: Mockups skipped under the backend-only rule. This feature registers one resource event and has no screen, flow, component, copy, or presentation decision.
- **Current Pi contract**: Compile against Pi's exported types rather than a local copy. In Pi 0.80.8, `ExtensionAPI.on("resources_discover", handler)` receives `ResourcesDiscoverEvent { type, cwd, reason: "startup" | "reload" }` and an `ExtensionContext`; the handler returns `ResourcesDiscoverResult { skillPaths?: string[]; promptPaths?: string[]; themePaths?: string[] }`. Project trust is read through `ctx.isProjectTrusted()`. `resources_discover` has no event-scoped `AbortSignal`; idle `ctx.signal` is normally `undefined`.
- **Current Pi ordering and reload behavior**: Pi awaits extension handlers in extension/handler load order, records each returned path with extension provenance, then calls `ResourceLoader.extendResources`. Existing configured paths remain before extension paths. Pi canonicalizes exact paths for deduplication; skill loading keeps the first canonical file, warns on a same-name/different-file collision, and does not load a missing-description skill. A full reload resets the resource loader to configured paths before the new extension instance receives `resources_discover(reason: "reload")`. The adapter relies on that replacement lifecycle; it never tries to subtract paths from Pi incrementally.
- **Exact file contribution**: Contribute the verified `<immutable-content>/<normalized-root>/SKILL.md` file, not the containing directory. Pi accepts explicit Markdown skill paths and derives `baseDir` from the file, so scripts, references, and assets remain beside the immutable source while the loader cannot recursively discover an undeclared sibling skill.
- **Pi remains the skill authority**: Plugin Host does not parse frontmatter again, compare skill names, rename a skill, or suppress a same-name resource. It verifies only that the declared `SKILL.md` is the exact manifest-bound readable file and returns paths in a deterministic order. Pi performs final Agent Skills validation and same-name collision handling. Different files with the same declared name are both returned; Pi warns and keeps the first. Exact canonical-file duplicates are collapsed before return because Pi itself treats them as the same file.
- **Observation means exact contribution, not native parse success**: Pi exposes no post-`resources_discover` acceptance callback or supported API for reading the just-loaded resource diagnostics. Activation evidence therefore proves the complete logical projection, exact component ids, verified physical files, and exact path set returned to Pi. It does not claim that Plugin Host overruled or independently reproduced Pi's validation/collision verdict. This is intentional: Pi's diagnostics and first-skill rule remain authoritative.
- **Scope selection**: The read-only `SkillHookRuntimeCatalog` is the only source of candidate snapshots; no lifecycle state, trust document, portable declaration, manifest, or settings file is read here. Include every user snapshot. Include a project snapshot only when its scope key equals the catalog's current project key, its snapshot context equals the catalog context, both contexts say `trusted`, and Pi's live `ctx.isProjectTrusted()` is true. A stale/mismatched project target receives explicit contribution failure and contributes no project paths; valid user targets remain available.
- **Empty-set current-project evidence**: Correct the completed catalog request so every reconcile supplies `currentProject`, even when `active` is empty. The current implementation derives catalog context only from the first loaded snapshot, which makes a fresh empty catalog unable to prove disable/uninstall absence. `SkillHookRuntimeSetRequest.currentProject` and `SkillHookRuntimeCatalog.currentProject()` close that gap without adding state or another trust authority; non-empty loaded snapshots must agree with the supplied context.
- **Stable ordering**: Sort candidate targets by explicit scope rank (`user` before `project`), then plugin key by code-point comparison; sort each target's skills by component id, then normalized root as a defensive tie-break. Do not use locale-sensitive comparison. This mirrors Pi's own default user-before-project precedence and makes plugin collision winners reproducible. Order is independent of state-map insertion, filesystem directory enumeration, verification completion, and absolute install location.
- **Stable deduplication and ownership**: Verify all roots first, then collapse only identical canonical `SKILL.md` files, preserving the first ordered path. Internally retain every `(scope, plugin, revision, projectionDigest, componentId)` owner of that emitted path. This lets user/project references to the same immutable revision share one Pi path while activation and deactivation evidence remain scope-specific.
- **Manifest-bound path verification**: Derive `SKILL.md` from the normalized relative root and require the exact regular-file entry in `snapshot.content.manifest`. Reuse the manifest-backed reader's no-symlink, lexical containment, `O_NOFOLLOW`, size, bounded read, and SHA-256 checks; extract its private safe-path/open logic rather than implementing a weaker second resolver. The ready result contains an ephemeral absolute path and canonical dedupe key; failures expose stable codes only, never paths or native causes.
- **Failure isolation**: A missing manifest/file, escaping or symlinked path, digest/type mutation, or unreadable file invalidates the complete plugin target's skill contribution; no skill from that `(scope, plugin)` is returned. Other verified targets still contribute. The latest discovery registry records the target failure so lifecycle observation fails explicitly instead of interpreting omission as success. Unexpected catalog/adapter failure invalidates the complete event and returns no paths. Empty skill slices are valid active contributions.
- **Cancellation**: Every host-neutral discovery and verification method accepts an `AbortSignal` and checks it before/after each asynchronous boundary and before the atomic observation swap. Pi does not provide a signal for `resources_discover`, so the Pi adapter owns one extension-instance lifetime controller, aborts it from `session_shutdown`, and never substitutes the normally undefined idle `ctx.signal`. Cancellation publishes no successful replacement evidence and throws an `AbortError` to Pi; the old extension instance cannot report a new path set after shutdown.
- **Startup/reload removal**: The handler recomputes from the complete current catalog on both reasons and never caches or merges old path lists. Lifecycle commands remain responsible for committing state and invoking Pi's normal `ctx.reload()`. The new Pi instance returns only current roots, so update removes the old revision path, trust revocation removes project paths while retaining user paths, and disable/uninstall remove target ownership and paths. No copied tree, generated settings entry, active symlink, or Plugin Host resource file exists to clean up.
- **Contribution observation integration**: Separate the existing source-catalog observation from final `skills-hooks` evidence. The source participant emits `SkillHookSnapshotObservation`; the discovery registry emits `SkillResourceContributionObservation`. A pure composer requires exact scope/plugin/revision/complete projection digest/current-project agreement and exact equality between projected and contributed skill component ids before creating the existing final `SkillHookContributionObservation`. Its digest binds the prior complete skill/hook slice digest to the logical skill-root contribution digest without hashing absolute paths. `composeActivationObservation` accepts only this final evidence plus MCP evidence, so snapshot presence alone can no longer claim skill activation.
- **Observation invalidation**: The final participant delegates reconcile to the existing snapshot participant. A successful catalog swap invalidates prior discovery evidence before returning; failed or cancelled reconcile leaves both prior catalog and prior discovery evidence intact. Active observation is unavailable until the new instance's `resources_discover` completes. Inactive observation requires an initialized latest discovery set, source-catalog absence, scope-specific path ownership absence, and the exact tombstone digest.
- **Complete projection evidence**: Every active resource observation carries and verifies the unchanged complete `PluginRuntimeProjection.digest`, even for an empty skill slice; MCP inventory remains untouched and independently observed. Skill-path evidence never creates a component digest that can replace the complete projection digest, and the existing two-participant skill/hook-plus-MCP composition remains mandatory.
- **Public/private boundary**: Export schema-derived snapshot/resource/final observation contracts and the host-neutral final participant factory needed by lifecycle composition. Keep absolute/canonical path evidence, mutable maps, target/path keys, order helpers, failure causes, filesystem verifier, Pi handler registration, event-lifetime controller, and fake Pi host private. Keep `createRuntimeProjectionCache`, raw state/transition stores, and reload invocation outside this feature. Add Pi as `peerDependencies: { "@earendil-works/pi-coding-agent": "*" }` with tested dev version 0.80.8; production Pi imports are type-only.
- **Foundation timing**: Code-first. The foundation documents already state that enabled trusted roots flow through `resources_discover`, Pi owns collisions, projections remain derived, and reload removes lifecycle-inapplicable components. Update them only if implementation changes one of those assertions; do not add prose merely because this design is more detailed.
- **Advisory review**: This is a host integration with security-sensitive paths and normally warrants design review, but the caller explicitly prohibited nested agents. The non-blocking design-time advisory path is skipped and recorded; feature-level implementation review remains required by project policy.

## Architectural choice

### Option A — copy each skill into a generated Pi resource tree

Projection preparation could copy `SKILL.md` and support files under a Pi-shaped directory and point discovery there. This makes paths visually uniform but duplicates immutable plugin content, creates a second integrity/lifecycle surface, risks dropping support assets, and requires cleanup after update/disable/uninstall. Rejected.

### Option B — return snapshot-derived paths and let Pi discover failures

The event handler could join `snapshot.content.root` and `skill.root.value`, return every path, and rely on Pi warnings for missing or invalid files. This is short, but Pi's handler errors and loader warnings are not lifecycle activation evidence; a missing or mutated root could be silently absent while Plugin Host reports the complete projection active. It also leaves containment and cancellation implicit. Rejected.

### Option C — verify exact immutable files, atomically observe the returned set, and let Pi parse them (chosen)

A host-neutral discovery service selects scope-correct snapshots, asks one manifest-backed filesystem port to verify exact `SKILL.md` files, orders and canonical-deduplicates them, and atomically records logical contribution evidence. A thin Pi adapter returns those file paths from `resources_discover`. Final skill/hook evidence composes the source snapshot with the verified resource contribution; Pi still parses names and decides collisions.

**Choice**: Option C. It adds no state or copied projection, preserves Pi's authority, turns path corruption into explicit lifecycle evidence, and keeps the Pi-specific surface to one typed event adapter.

## Trickiest unit first

The hardest seam is not path joining; it is proving exactly what Plugin Host contributed without falsely claiming that Pi accepted or renamed a skill. Pi awaits `resources_discover`, then loads returned paths synchronously, but exposes no post-load callback to the extension. The design therefore defines the honest boundary precisely: contribution observation proves that every projected skill component mapped to an immutable manifest-bound readable `SKILL.md`, that the exact deterministic path list was returned, and that no expected target was silently omitted. Pi's subsequent frontmatter and collision diagnostics remain native facts. A source-only observation cannot satisfy lifecycle composition, and a native warning cannot be hidden by a Plugin Host collision algorithm because none exists.

## Implementation units

### Unit 1: Current-project catalog contract and observation composition

**Story**: `epic-skills-hook-runtime-skill-discovery-observation-contract`

**Files**:
- `src/runtime/skill-hook/runtime-catalog.ts`
- `src/runtime/skill-hook/lifecycle-participant.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/runtime/skills/contribution-observation.ts`
- `test/runtime/skill-hook/lifecycle-participant.test.ts`
- `test/runtime/skills/contribution-observation.test.ts`

```typescript
export type SkillHookRuntimeSetRequest = Readonly<{
  active: readonly RuntimeProjectionSelection[];
  currentProject: CurrentProjectRuntimeContext;
}>;

export interface SkillHookRuntimeCatalog {
  list(): readonly SkillHookRuntimeSnapshot[];
  get(scope: ScopeReference, plugin: PluginKey): SkillHookRuntimeSnapshot | undefined;
  currentProject(): CurrentProjectRuntimeContext | undefined;
}

export const SkillHookSnapshotObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    participant: z.literal("skills-hooks-snapshot"),
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
    participant: z.literal("skills-hooks-snapshot"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
    skillComponentIds: z.tuple([]),
    hookComponentIds: z.tuple([]),
  }).strict().readonly(),
]);
export type SkillHookSnapshotObservation = z.infer<
  typeof SkillHookSnapshotObservationSchema
>;

export const SkillResourceContributionObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    participant: z.literal("skill-resources"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
    skillComponentIds: z.array(ComponentIdSchema).readonly(),
  }).strict().readonly(),
  z.object({
    kind: z.literal("inactive"),
    participant: z.literal("skill-resources"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
    skillComponentIds: z.tuple([]),
  }).strict().readonly(),
]);
export type SkillResourceContributionObservation = z.infer<
  typeof SkillResourceContributionObservationSchema
>;

export function composeSkillHookContributionObservation(input: Readonly<{
  expectation: ProjectionExpectation;
  snapshot: SkillHookSnapshotObservation;
  resources: SkillResourceContributionObservation;
  sha256: Sha256;
}>): SkillHookContributionObservation;
```

Reconcile parses the explicit current project, requires every loaded snapshot to carry that exact context, and publishes it even for `active: []`. The existing source observer changes its literal so it cannot be passed to `composeActivationObservation`. The pure resource composer verifies exact active/inactive binding, sorted unique ids, source/resource skill-id equality, current project/trust, and complete projection digest before deriving the final `skills-hooks` contribution digest. Absolute paths are never inputs to either digest.

**Acceptance criteria**:
- [ ] A fresh empty catalog retains exact current-project identity/trust and can prove inactive absence; no stale context is inherited accidentally.
- [ ] Non-empty reconciliation rejects snapshots whose current-project evidence differs from the request and preserves the previous catalog.
- [ ] Source-only observation no longer satisfies `SkillHookContributionObservationSchema` or `composeActivationObservation`.
- [ ] Active composition requires exact skill component-id equality and complete projection binding; inactive composition requires both source and resource absence with the same tombstone.
- [ ] Empty skill slices compose successfully while hooks and MCP remain independently bound to the complete projection.

### Unit 2: Manifest-backed immutable skill path verifier

**Story**: `epic-skills-hook-runtime-skill-discovery-path-verification`

**Files**:
- `src/application/ports/skill-resource-path.ts`
- `src/infrastructure/filesystem/manifest-backed-file.ts`
- `src/infrastructure/filesystem/manifest-content-reader.ts`
- `src/infrastructure/filesystem/manifest-skill-path-verifier.ts`
- `test/infrastructure/filesystem/manifest-content-reader.test.ts`
- `test/infrastructure/filesystem/manifest-skill-path-verifier.test.ts`

```typescript
export type SkillResourcePathFailureCode =
  | "ROOT_MISSING"
  | "ROOT_ESCAPE"
  | "ROOT_MUTATED"
  | "ROOT_UNREADABLE"
  | "ADAPTER_FAILED";

export type VerifiedSkillResourcePath = Readonly<{
  path: string;          // ephemeral absolute file returned only to Pi
  canonicalPath: string; // process-local exact-file dedupe key
}>;

export type SkillResourcePathVerificationResult =
  | Readonly<{ kind: "ready"; value: VerifiedSkillResourcePath }>
  | Readonly<{ kind: "failed"; code: SkillResourcePathFailureCode }>
  | Readonly<{ kind: "cancelled" }>;

export interface SkillResourcePathPort {
  verify(file: ManifestFileRef, signal: AbortSignal): Promise<SkillResourcePathVerificationResult>;
}

export function createManifestSkillPathVerifier(dependencies: Readonly<{
  content: ContentReadPort;
}>): SkillResourcePathPort;
```

The runtime discovery service derives `SKILL.md` for root `.` and `<root>/SKILL.md` otherwise, then obtains the exact regular-file entry from `createContentIndex(snapshot.content.manifest)` before calling this port. The infrastructure verifier and existing content reader share one private helper for absolute-root validation, lexical containment, component `lstat`, realpath containment, and no-follow open. Verification reads and hashes the manifest-declared bytes through the existing `ContentReadPort`; successful return occurs only after the exact file is readable and unchanged.

**Acceptance criteria**:
- [ ] Root and nested skills resolve to exact `SKILL.md` files under the adapter-issued immutable content root; support directories are neither copied nor traversed as new skills.
- [ ] Missing manifest entries/files, non-regular files, ancestor/final symlinks, lexical/realpath escape, changed size/digest/type, and unreadable files map to stable non-path-bearing results.
- [ ] Cancellation before open, during chunked read, after read, and before ready return yields `cancelled` with no successful path.
- [ ] Ready paths are absolute and canonical-deduplicable, while diagnostics/results never serialize the content root or native cause.
- [ ] Refactoring the shared helper preserves existing bundle-inspection content-read behavior and does not widen `ContentReadPort` into arbitrary listing or reads.

### Unit 3: Deterministic resource-set assembly and observed participant

**Story**: `epic-skills-hook-runtime-skill-discovery-resource-set`
**Depends on**: `epic-skills-hook-runtime-skill-discovery-observation-contract`, `epic-skills-hook-runtime-skill-discovery-path-verification`

**Files**:
- `src/runtime/skills/resource-discovery.ts`
- `src/runtime/skills/contribution-observation.ts`
- `src/runtime/skill-hook/runtime-catalog.ts` (consume the context accessor)
- `test/runtime/skills/resource-discovery.test.ts`

```typescript
export type SkillResourceDiscoveryRequest = Readonly<{
  reason: "startup" | "reload";
  projectTrusted: boolean;
}>;

export type SkillResourceTargetFailure = Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  code:
    | SkillResourcePathFailureCode
    | "PROJECT_IDENTITY_MISMATCH"
    | "PROJECT_UNTRUSTED";
}>;

export type SkillResourceDiscoveryResult =
  | Readonly<{
      kind: "ready";
      skillPaths: readonly string[];
      failedTargets: readonly SkillResourceTargetFailure[];
    }>
  | Readonly<{
      kind: "failed";
      code: "CATALOG_UNINITIALIZED" | "CURRENT_PROJECT_MISMATCH" | "ADAPTER_FAILED";
    }>
  | Readonly<{ kind: "cancelled" }>;

export interface SkillResourceDiscoveryPort {
  discover(
    request: SkillResourceDiscoveryRequest,
    signal: AbortSignal,
  ): Promise<SkillResourceDiscoveryResult>;
}

export function createSkillResourceDiscoveryRuntime(dependencies: Readonly<{
  snapshots: SkillHookSnapshotParticipant;
  catalog: SkillHookRuntimeCatalog;
  paths: SkillResourcePathPort;
  sha256: Sha256;
}>): Readonly<{
  participant: SkillHookLifecycleParticipant;
  resources: SkillResourceDiscoveryPort;
}>;
```

The factory privately owns the latest discovery registry. `participant.reconcile` delegates to the source participant and invalidates the registry only after an applied catalog swap. `resources.discover` reads one immutable catalog snapshot, selects scope-correct targets, verifies every declared skill for each target, omits a complete failed target while retaining unrelated targets, applies explicit stable order, canonical-file dedupe, and atomic registry replacement, then returns the same emitted path list. `participant.observe` composes source and resource observations; it cannot observe a new reconcile before discovery.

**Acceptance criteria**:
- [ ] User targets precede project targets, then plugin/component/root code-point order; randomized catalog and verifier completion order produce the same output.
- [ ] Only an exact matching trusted current project contributes project skills; Pi trust denial removes project ownership without removing valid user ownership.
- [ ] One bad skill root excludes its complete plugin target and records a stable failure, while unrelated targets still contribute.
- [ ] Exact canonical-file duplicates emit once but retain all logical owners; same-name different files are not deduplicated.
- [ ] Applied reconcile invalidates old observation; failed/cancelled reconcile preserves it; cancelled discovery performs no partial registry swap.
- [ ] Active, empty-skill, and inactive observations preserve exact complete projection/tombstone evidence without physical paths in digests.

### Unit 4: Typed Pi `resources_discover` adapter and lifetime cancellation

**Story**: `epic-skills-hook-runtime-skill-discovery-pi-adapter`
**Depends on**: `epic-skills-hook-runtime-skill-discovery-resource-set`

**Files**:
- `src/pi/skill-resource-discovery.ts`
- `package.json`
- `package-lock.json`
- `test/pi/skill-resource-discovery.test.ts`

```typescript
import type {
  ExtensionAPI,
  ResourcesDiscoverEvent,
  ResourcesDiscoverResult,
} from "@earendil-works/pi-coding-agent";

export function registerSkillResourceDiscovery(
  pi: ExtensionAPI,
  resources: SkillResourceDiscoveryPort,
): void;
```

Registration creates one lifetime `AbortController`. The `session_shutdown` handler aborts it idempotently. The `resources_discover` handler verifies `event.cwd === ctx.cwd`, calls the host-neutral port with `event.reason` and `ctx.isProjectTrusted()`, and returns only `{ skillPaths: [...result.skillPaths] }`. Known per-target failures remain in the observation registry for lifecycle/status consumers and do not trigger UI or suppress unrelated paths. Global failure throws a safe code-only error; cancellation throws `AbortError`. The adapter never uses `ctx.signal`, prompts, writes settings, calls reload, or caches a previous result.

Add Pi using the package convention: peer range `"*"`, exact 0.80.8 dev dependency for the tested contract. The import is type-only in production; no second Pi runtime is bundled.

**Acceptance criteria**:
- [ ] The adapter registers exactly `resources_discover` and `session_shutdown` against Pi's exported types and returns no prompt/theme/settings values.
- [ ] Startup and reload reasons are forwarded exactly; current Pi project trust is sampled for every discovery event.
- [ ] Shutdown cancellation prevents the old extension instance from publishing a later contribution result.
- [ ] Per-target failure keeps unrelated paths and remains observable; global failure/cancellation returns no stale path list and exposes no absolute root.
- [ ] No command, UI, state read, copied tree, settings mutation, reload trigger, or native skill parser is introduced.

### Unit 5: Fake-Pi, native-loader, lifecycle-removal, and public-boundary evidence

**Story**: `epic-skills-hook-runtime-skill-discovery-integration-hardening`
**Depends on**: `epic-skills-hook-runtime-skill-discovery-pi-adapter`

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/pi-skill-resource-discovery.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed behavior makes an existing assertion stale

The integration fixture uses real immutable content publication, projection cache/snapshot/catalog construction, manifest path verification, the final observed participant, and a typed fake Pi API that captures registered handlers and models Pi's full resource reset before reload. It invokes Pi's exported `loadSkills` on returned paths to prove native first-name collision behavior without copying that algorithm into Plugin Host.

**Acceptance criteria**:
- [ ] Trusted startup contributes enabled user then matching project skill files directly from immutable revisions, with bundled sibling assets left in place.
- [ ] Pi's real loader receives same-name different files, emits its collision diagnostic, and keeps the first deterministic skill; Plugin Host returns both and makes no name verdict.
- [ ] Trust revocation reload removes project paths while retaining user paths; a project switch cannot reuse the previous project's roots or observation.
- [ ] Update reload removes the old revision path and observes only the new revision/complete digest; old expectation fails.
- [ ] Disable and uninstall reloads remove all target ownership and paths, produce exact inactive skill/source evidence, and require the independent MCP contribution before lifecycle inactivity composes.
- [ ] Missing, symlink-escaping, unreadable, and digest-mutated `SKILL.md` cases produce target activation failure with no target path; an unrelated plugin remains loaded.
- [ ] Cancellation before verification completion returns no paths and no final observation; retry on a new runtime can succeed.
- [ ] Public/compiled allowlists expose stable schemas/contracts/final factory only and exclude absolute path evidence, Node verifier, Pi registration, mutable registry, order/dedupe helpers, fake host, state readers, and reload implementation.
- [ ] Full `npm test` passes strict production/test typechecking, dependency boundaries, all Vitest suites, build, and exact compiled import. Record additions against the current baseline of 128 test files / 674 tests / 447 exports.

## Implementation order

1. `epic-skills-hook-runtime-skill-discovery-observation-contract`
2. `epic-skills-hook-runtime-skill-discovery-path-verification` (may proceed alongside 1 with disjoint files)
3. `epic-skills-hook-runtime-skill-discovery-resource-set`
4. `epic-skills-hook-runtime-skill-discovery-pi-adapter`
5. `epic-skills-hook-runtime-skill-discovery-integration-hardening`

The two foundations are independent: one makes final observation honest and preserves empty-set project evidence; the other proves physical files. Resource assembly needs both, the Pi adapter needs the assembled port, and lifecycle/removal/public evidence needs the complete integration. These are durable checkpoints for one cohesive feature owner, not five default implementation agents.

## Simplification

- Use exact immutable `SKILL.md` paths; do not copy trees, create projection-specific skill directories, write Pi settings, or maintain an active-path file.
- Reuse `SkillHookRuntimeCatalog`, complete projection/tombstone expectations, current project/trust evidence, `createContentIndex`, `ContentReadPort`, and the existing manifest-backed no-follow reader.
- Extract one private manifest-path helper instead of maintaining two containment/open algorithms.
- Keep one process-local latest contribution registry shared by the handler and final observer; no persisted observation, generation pointer, or reload protocol.
- Let Pi parse frontmatter, issue validation/collision diagnostics, and select the first same-name skill. Do not create a second name registry or collision table.
- Remove the source-only success path to lifecycle observation rather than layering another permissive optional field onto it.
- Do not test raw path-join wrappers, every schema field, Pi's complete skill-validation matrix, or callback counts. Test the path/evidence/reload contracts that can break whole-plugin activation.

## Testing

- **Catalog/current project**: explicit context on empty/non-empty reconcile, disagreement preservation, user/project same plugin isolation, and initialized inactive evidence. Protects trust-correct removal and fixes the discovered empty-set gap.
- **Physical verifier**: root/nested exact files; manifest missing; physical missing; directory/special/symlink replacement; lexical/realpath escape; size/digest mutation; unreadable/open failure; abort at each asynchronous phase. Protects immutable-root containment and honest readiness.
- **Ordering/dedupe**: randomized input order, user-before-project, code-point plugin/component/root order, same canonical file with multiple owners, and same-name different files. Protects reproducible Pi first-wins behavior without duplicating it.
- **Failure isolation**: one bad root invalidates its complete target, unrelated target survives, empty slice succeeds, unexpected global failure returns no paths, and no failure includes an absolute path/native cause. Protects startup availability and whole-plugin semantics together.
- **Observation**: source-only rejection; active binding/id/root digest match; stale revision/project/trust mismatch; empty skill contribution; inactive source-plus-resource absence; MCP still required. Protects complete projection evidence rather than handler invocation counts.
- **Typed fake Pi API**: exact event/result signature, reason forwarding, trust sampling, shutdown-owned cancellation, no prompt/theme values, no UI/settings/reload calls. Protects the narrow host adapter and catches upstream type drift.
- **Real Pi loader integration**: call exported `loadSkills` with returned paths to verify canonical-file dedupe and same-name first-winner diagnostics. Pi remains the tested authority; Plugin Host does not assert a copied algorithm.
- **Lifecycle replacement matrix**: trusted/untrusted project, project switch, update, disable, uninstall, missing/mutated root, and cancellation/retry across startup/reload. Assert exact current paths and final observations, not merely that a callback ran.
- **Low-value tests avoided**: no duplicate Agent Skills frontmatter suite, no assertion that joining two strings returns a path, no snapshot of temporary absolute roots, and no copy of Pi's resource-loader internals in the fake.

## Risks and rollback

- **Riskiest assumption — contribution evidence is sufficient without a post-load callback**: Pi 0.80.8 exposes only a pre-load return value. The honest guarantee is exact verified paths returned, not native parse success. Mitigation: installation already normalized valid Agent Skills, runtime re-verifies immutable bytes, real-Pi-loader integration covers the current contract, and Pi remains responsible for warnings/collisions. If Pi later exposes post-load diagnostics, extend the observer to require that evidence without changing projection or state schemas.
- **Pi API drift**: event names, trust access, path result shape, or resource reload order may change. Mitigation: use exported Pi types, pin the development contract to 0.80.8, keep the adapter one file, and test startup/reload against a type-compatible fake plus Pi's real `loadSkills` export. A type/build failure is preferable to approximation.
- **No event-scoped Pi cancellation**: `resources_discover` is awaited and normally runs idle, so `ctx.signal` is absent. The extension-lifetime controller gives deterministic shutdown cancellation but cannot cancel Pi's synchronous loading after the handler returns. This limitation is documented rather than hidden.
- **Verification-to-load race**: a file could change after digest verification and before Pi synchronously reads it. The installed content root is already immutable, no-follow verified, and read-only; ordinary failures are caught. Same-user malicious replacement in that tiny window remains within the project's explicitly non-blocking residual-risk policy.
- **Partial target failure versus unrelated availability**: throwing the whole handler would hide healthy plugins; silently omitting one would lie about activation. The registry therefore returns healthy paths and records the failed target for lifecycle compensation/status. Rollback affects that plugin only.
- **User/project shared physical roots**: global path dedupe can leave a file present after one scope deactivates. Scope-specific ownership in the registry prevents that presence from being mistaken for the deactivated scope's evidence; the remaining scope legitimately keeps the shared Pi resource available.
- **Current project changes mid-discovery**: the catalog context and Pi trust sample could become stale during an unusual concurrent session replacement. Lifetime cancellation plus final context check prevents registry publication; the replacement instance recomputes from its own catalog.
- **Public API pressure**: exporting absolute paths or mutable registries would make machine-local derived state look authoritative. Keep those implementation details internal; only logical observations and host-neutral lifecycle composition are stable public contracts.

## Pre-mortem

This feature fails if it returns a path outside the immutable revision, accepts a mutated `SKILL.md`, leaves an old revision visible after reload, contributes an untrusted/different project, lets map/filesystem order decide a collision winner, silently omits one plugin, claims activation from the snapshot before discovery, or mistakes a user-owned shared path for project activation. Manifest-bound no-follow reads, explicit project context, code-point ordering, target-scoped failures, full reload replacement, ownership-aware dedupe, invalidated contribution observation, and strict source/resource/MCP composition address those cases.

The fallback is the existing lifecycle compensation path. A target whose skill files cannot be verified or observed does not receive final `skills-hooks` evidence; native composition cannot produce complete activation evidence, so lifecycle retains/restores the prior working revision. There is no copied tree, settings mutation, or new persistent state to roll back.
