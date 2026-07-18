---
id: epic-transactional-plugin-lifecycle-state-schemas-stores
kind: feature
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Versioned State Schemas and Stores

## Brief

Define the schema-derived authoritative records for plugin-host configuration, installed user and project revisions, activation state, marketplace snapshots, portable project declarations, persistent-data references, and transaction generations. Provide storage contracts that validate every read and write, isolate corruption by scope/plugin where possible, and support explicit version migration without turning generated projections into state.

This feature establishes the durable vocabulary consumed by all other lifecycle capabilities. It does not decide trust, store secret values, acquire or promote content, coordinate concurrent writers, execute lifecycle operations, generate runtime projections, or implement Pi reload behavior.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 1 foundation — every other child depends directly or transitively on these records
- Required guarantees: crash, scope, data, and ports guarantees in the parent epic
- Stable seams: authoritative state is the sole input to later replaceable projection generation

## Foundation references

- `docs/SPEC.md` — Scopes; State layout; Project scope; Installed revision record
- `docs/ARCHITECTURE.md` — Authoritative state; Project declaration; State ports; Runtime projections
- `docs/COMPATIBILITY.md` — Whole-plugin behavior; Plugin path environment

## Existing contract references

- `src/domain/schema.ts` — schema/type single-source pattern
- `src/domain/identity.ts` and `src/domain/source.ts` — stable plugin and source identities
- `src/domain/plugin.ts` and `src/domain/compatibility.ts` — normalized bundle/report inputs referenced by installed records

## Late-bound feature decisions

Exact schema version numbers, migration graph, record granularity, corruption-isolation envelope, project-key representation, state snapshot shape, and public store signatures remain for feature design. They must preserve portable project intent, user/project isolation, generated-contract discipline, and fail-fast validation without persisting secrets or runtime adapter state.

## UI alignment

No UI surface. Presentation belongs to `epic-native-plugin-management`.

## Discovery and design decisions

- **Discovery posture**: Direct-read only, as required. Grounding covered the parent epic, all foundation and compatibility documents, project conventions/rules, the completed foreign-model contracts and hardening records, and representative schema, identity, source, plugin, compatibility, content-manifest, package-export, and boundary-rule source. No nested agent or peer mechanism was used.
- **Independent advisory**: The caller-supplied GLM advisory is the design-time completeness pass. Its separate document families, migration registry, corruption isolation, project identity security, scope context, generation contracts, canonical-contract reuse, portable prohibitions, and ownership seams are incorporated below. No additional advisory was invoked.
- **Schema versions**: Each durable family starts independently at integer version `1`: host config, installed user state, trust state, project-local state, portable project declaration, and generation pointers. Versions are not shared because the documents evolve for different reasons. A version change is explicit even when two families happen to change together.
- **Project identity and key**: `ProjectIdentity` contains an adapter-canonical file URL and either a stable repository fingerprint or an explicit path-only limitation. `ProjectKey` is a versioned SHA-256 derivation over the complete identity. Repository replacement at the same path and a checkout moved to another path therefore produce different keys; state/trust transfer requires a future explicit relink operation rather than occurring silently.
- **Scope context**: Every state read/mutation receives `ScopeContext`, discriminated as user or project. Project context carries both identity and verified key. Persisted records use a smaller `ScopeReference` containing only the user tag or project key, so canonical machine paths do not spread through plugin records or diagnostics.
- **Generation model**: A scope snapshot is selected by one versioned pointer document and has one generation. Mutations are compare-and-swap replacements against an expected generation; callers never receive a callback that can accidentally hold a lock during network or inspection work. The locking backend, temporary-file/fsync/rename sequence, and physical blob layout remain adapter decisions for the generation-locking feature.
- **Corruption policy**: Reads validate the pointer and document envelopes first, migrate in memory, then validate collection records individually. A malformed record quarantines only that marketplace/plugin/trust record when identity can still be attributed safely; duplicate keys quarantine every colliding record so file order never becomes precedence. An unreadable pointer, unknown future version, invalid scope binding, generation mismatch, or unidentifiable record is document/scope-fatal. Corruption reports expose safe document kind, stable record key when available, issue code, and schema path only—never raw payloads, configured values, projection content, native causes, or secrets.
- **Canonical installed evidence**: An installed revision embeds the existing validated `NormalizedPlugin`, `CompatibilityReport`, and `ContentManifest`, plus verified source/content binding and logical content/data/config references. These contracts are reused directly rather than copied into lifecycle-shaped interfaces. Cross-field constructors verify plugin identity, resolved source, report identity, manifest binding, revision id, and reference identities before a record can be written.
- **No generated state**: Authoritative documents store normalized bundle inventory and compatibility evidence, but never generated skill roots, hook/MCP projections, expanded environment, absolute installed/data paths, reload observations, or projection contents. Pending transitions may retain a typed opaque journal reference only; recovery owns the versioned transition payload and projection hashes.
- **Trust ownership seam**: This feature owns the independently versioned trust-state envelope and the safe trust-subject evidence shape (canonical marketplace/plugin source identities, immutable revision, executable-surface digest, plugin, and scope). `trust-config-secrets` owns grant/revoke policy, approval semantics, configuration binding, and secret-store behavior. Secret values cannot be represented by any state schema.
- **Pending-transition seam**: Installed records may contain only `PendingTransitionRef`. `operations` and `recovery-journal-gc` own operation state, previous/candidate revision semantics, prepared projection hashes, reload evidence, compensation, journal storage, and recovery transitions. Adding those fields to installed state is prohibited.
- **Portable declaration policy**: `.pi/plugins.json` is one strict, all-or-nothing boundary. It accepts only version, portable marketplace source declarations, requested plugin keys, strict source/version constraints, and enabled intent. It rejects unknown keys, local Git, absolute/file/drive/UNC paths, credentials, canonical/resolved source hashes, project keys/identities, cache/data/blob references, timestamps, trust decisions, installed/active state, pending transitions, configuration/secret references, diagnostics, and projection material. Unlike machine-local state, malformed portable intent is never partially applied.
- **Late binding**: This design does not choose a filesystem/database adapter, lock primitive, lease behavior, storage paths, atomicity implementation, trust policy, automatic-update meaning, promotion algorithm, operation grammar, recovery journal grammar, revision retention, or garbage collection. It defines only the validated values and observable store-port contract those features need.
- **Foundation timing**: No foundation edit is required in this design commit. `SPEC` and `ARCHITECTURE` already assert separate state files, portable intent, machine-local project state, schema versions, generation checks, corruption isolation, derived projections, and adapter-owned writes. Implementation rolls exact public names forward only if they change those assertions.

## Other agent review

- **Invoked because**: This is a foundational security and persistence contract with broad downstream fan-out.
- **Reviewer**: Caller-supplied Z.AI GLM advisory, used as the Phase 1 completeness pass.
- **Accepted**: Independent versions for config, installed user, trust, project-local, portable declaration, and pointers; a pure migration registry; record-level corruption quarantine; repository-aware project keys and scope contexts; generation snapshots/mutations/store ports; direct reuse of canonical source/plugin/content/report contracts; no secret or projection content; explicit pending-transition and trust ownership seams; strict portable prohibitions; and concrete boundaries/tests/risks.
- **Late-bound as advised**: Physical storage and locking, trust semantics, immutable promotion, lifecycle operations, recovery grammar, and garbage collection.
- **Phase 2**: No additional agent/peer review was run because the caller explicitly prohibited nested agents and peeragent. The local pre-mortem below is the adversarial pass.

## Architectural choice

### Option A — one monolithic lifecycle state document

A single versioned document could contain configuration, trust, installed revisions, project state, and pointers. One parse and one atomic replacement are simple, but one corrupt record could disable every scope, trust evolution would force unrelated migrations, and project declarations could accidentally share machine-local fields. It also creates a convergence point that later features would all edit. Rejected.

### Option B — independently versioned documents with a generation pointer and schema registry (chosen)

Each durable family has a strict Zod schema and inferred type. A single typed registry owns current versions, historical schemas, pure adjacent migrations, record isolation, and document routing. Immutable document blobs are selected by one logical pointer document per scope; the store port returns a validated generation snapshot and accepts expected-generation replacements. This gives independent evolution and plugin-level quarantine while preserving atomic scope snapshots. The cost is explicit codecs and cross-document invariant checks.

### Option C — event log plus derived current state

Persist lifecycle events and rebuild current state by replay. This provides history and recovery evidence, but it makes migrations and corruption recovery replay concerns, duplicates the later recovery journal, and turns operation history into the authority even though the product contract is current state plus pending-transition evidence. Rejected.

**Choice**: Option B. Versioned schema families remain cohesive, `StateDocumentRegistry` is the routing/migration single source of truth, and one generation pointer gives adapters a narrow atomic-publication seam without prescribing their storage mechanism.

## Trickiest unit first

Project identity plus generation decoding is the highest-risk unit. If a path is treated as identity, a repository replacement can inherit executable trust; if repository identity alone is used, two checkouts can silently share project state; if each document advertises its own independent generation, a crash can produce a mixed snapshot. The design binds `ProjectKey` to both canonical root and repository fingerprint when available, labels path-only identity explicitly, and makes the pointer document the sole generation selector. Decoders refuse mismatched scope/generation/digest references before exposing any records. Record-level quarantine starts only after that enclosing context is trustworthy.

## Implementation units

### Unit 1: Versioning, project identity, scope, and safe references

**Story**: `epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning`

**Files**:
- `src/domain/state/versioning.ts`
- `src/domain/state/scope.ts`
- `src/domain/state/references.ts`
- `test/domain/state/versioning.test.ts`
- `test/domain/state/scope.test.ts`
- `test/domain/state/references.test.ts`

```typescript
// src/domain/state/scope.ts
export const CanonicalProjectRootSchema = z.string().url().superRefine(
  /* file: only; no credentials, query, fragment, dot segments, or lone surrogates */
).brand<"CanonicalProjectRoot">();

export const ProjectIdentitySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("repository"),
    canonicalRoot: CanonicalProjectRootSchema,
    repositoryFingerprint: SourceHashSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("path-only"),
    canonicalRoot: CanonicalProjectRootSchema,
    limitation: z.literal("identity-changes-with-canonical-root"),
  }).strict().readonly(),
]);
export type ProjectIdentity = z.infer<typeof ProjectIdentitySchema>;

export const ProjectKeySchema = z.string()
  .regex(/^project-v1:sha256:[0-9a-f]{64}$/)
  .brand<"ProjectKey">();
export type ProjectKey = z.infer<typeof ProjectKeySchema>;

export const ScopeReferenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user") }).strict().readonly(),
  z.object({ kind: z.literal("project"), projectKey: ProjectKeySchema }).strict().readonly(),
]);
export type ScopeReference = z.infer<typeof ScopeReferenceSchema>;

export const ScopeContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user") }).strict().readonly(),
  z.object({
    kind: z.literal("project"),
    identity: ProjectIdentitySchema,
    projectKey: ProjectKeySchema,
  }).strict().readonly(),
]);
export type ScopeContext = z.infer<typeof ScopeContextSchema>;

export function deriveProjectKey(identity: ProjectIdentity, sha256: Sha256): ProjectKey;
export function createScopeContext(input: unknown, sha256: Sha256): ScopeContext;
export function toScopeReference(context: ScopeContext): ScopeReference;
```

`deriveProjectKey` hashes an injective binary `project-identity-v1` preimage with tagged, length-prefixed UTF-8 fields. It never calls Git, filesystem, URL resolution, time, or randomness. `createScopeContext` recomputes and constant-time compares the supplied key. The infrastructure adapter is responsible for resolving a real root to the canonical file URL and repository fingerprint before calling the constructor.

```typescript
// src/domain/state/references.ts
export const StateReferenceKindRegistry = {
  stateBlob: { tag: "state-blob-v1" },
  marketplaceContent: { tag: "marketplace-content-v1" },
  pluginContent: { tag: "plugin-content-v1" },
  pluginData: { tag: "plugin-data-v1" },
  pluginConfiguration: { tag: "plugin-configuration-v1" },
  trustSubject: { tag: "trust-subject-v1" },
  pendingTransition: { tag: "pending-transition-v1" },
} as const;

export const StateBlobRefSchema = taggedSha256("state-blob-v1");
export const MarketplaceContentRefSchema = taggedSha256("marketplace-content-v1");
export const PluginContentRefSchema = taggedSha256("plugin-content-v1");
export const PluginDataRefSchema = taggedSha256("plugin-data-v1");
export const PluginConfigurationRefSchema = taggedSha256("plugin-configuration-v1");
export const TrustSubjectRefSchema = taggedSha256("trust-subject-v1");
export const PendingTransitionRefSchema = taggedSha256("pending-transition-v1");
```

References are opaque logical identifiers, never paths. Pure constructors derive each reference from its canonical identity inputs and injected SHA-256. Their schemas reject `/`, `\\`, `file:`, drive/UNC forms, and all unknown tags.

```typescript
// src/domain/state/versioning.ts
export const StateSchemaVersionSchema = z.number().int().positive().safe();
export type StateMigration = (input: unknown) => unknown;

export type VersionedSchemaFamily<T> = Readonly<{
  latestVersion: number;
  versions: ReadonlyMap<number, z.ZodType<T>>;
  migrations: ReadonlyMap<number, StateMigration>; // v -> v + 1 only
}>;

export function defineVersionedSchemaFamily<T>(input: VersionedSchemaFamily<T>): VersionedSchemaFamily<T>;
export function migrateVersionedDocument<T>(family: VersionedSchemaFamily<T>, input: unknown): T;
```

The helper reads only `schemaVersion`, rejects missing/non-integer/unknown-future versions, executes every adjacent migration in order, validates every intermediate output against the next schema, deep-clones before migration, and parses the final value. Registries reject gaps, backward/skipping edges, a migration beyond latest, mutation of a frozen fixture, and non-deterministic metadata such as clock/random dependencies by API shape and repeat-output tests. The initial production families register version `1` and no fabricated v0 migration; synthetic fixtures prove migration behavior.

**Acceptance criteria**:
- [ ] Replacing a repository at one root, moving the checkout, or changing identity kind changes `ProjectKey`; identical canonical identity reproduces the same key.
- [ ] A caller cannot create trusted project `ScopeContext` with a mismatched key.
- [ ] Path-only identity is explicit in the value and diagnostics; it never masquerades as repository identity.
- [ ] All references are versioned logical hashes and cannot encode absolute or relative storage paths.
- [ ] Migration registry rejects unknown future versions and invalid graphs, validates each hop, is deterministic, and does not mutate input.

### Unit 2: Host configuration and strict portable project declaration

**Story**: `epic-transactional-plugin-lifecycle-state-schemas-stores-config-portable`
**Depends on**: `epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning`

**Files**:
- `src/domain/state/config-state.ts`
- `src/domain/state/portable-project-declaration.ts`
- `test/domain/state/config-state.test.ts`
- `test/domain/state/portable-project-declaration.test.ts`

```typescript
// src/domain/state/config-state.ts
export const UpdateApplicationPreferenceSchema = z.enum(["manual", "automatic"]);
export const MarketplaceConfigurationRecordSchema = z.object({
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  updateApplication: UpdateApplicationPreferenceSchema,
}).strict().readonly();

export const HostConfigDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  generation: GenerationSchema,
  records: z.array(MarketplaceConfigurationRecordSchema).readonly(),
}).strict().readonly().superRefine(/* unique marketplace names */);
export type HostConfigDocumentV1 = z.infer<typeof HostConfigDocumentSchemaV1>;
```

The schema represents the preference, not update authority: `refresh-update-policy` later decides defaults, source-identity constraints, notification cadence, and whether/when an automatic update may run. No credentials, resolved source, cache identity, timestamp, trust, plugin configuration value, or secret field exists.

```typescript
// src/domain/state/portable-project-declaration.ts
export const PortableMarketplaceSourceSchema = z.discriminatedUnion("kind", [
  MarketplaceSourceVariantRegistry.github.schema,
  MarketplaceSourceVariantRegistry.git.schema,
]);
export const PortablePluginSourceSchema = PluginSourceSchema.superRefine(
  /* marketplace paths must be safe ./ relative paths; Git/npm remain credential-free */
);
export const PortablePluginConstraintSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("declared-version"), value: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("source"), source: PortablePluginSourceSchema }).strict(),
]);
export const PortableMarketplaceDeclarationSchema = z.object({
  marketplace: MarketplaceNameSchema,
  source: PortableMarketplaceSourceSchema,
}).strict().readonly();
export const PortablePluginDeclarationSchema = z.object({
  plugin: PluginKeySchema,
  enabled: z.boolean(),
  constraint: PortablePluginConstraintSchema.optional(),
}).strict().readonly();
export const PortableProjectDeclarationSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  marketplaces: z.array(PortableMarketplaceDeclarationSchema).readonly(),
  plugins: z.array(PortablePluginDeclarationSchema).readonly(),
}).strict().readonly().superRefine(/* unique identities; every plugin marketplace declared */);
export type PortableProjectDeclarationV1 = z.infer<typeof PortableProjectDeclarationSchemaV1>;
```

The portable decoder is whole-file fail-fast and runs a recursive prohibited-key/value guard in addition to strict schemas. The guard rejects keys that imply paths outside source declarations, roots, caches, data, state blobs, project keys/identity, install/active revisions, trust, secrets/credentials/tokens, timestamps, operations/pending transitions, generated/projections, diagnostics, or host-specific state. String values are checked contextually: only validated Git/npm URLs and safe `./` marketplace paths may carry path-like syntax. `local-git`, `file:` URLs, absolute POSIX paths, drive/UNC paths, home-relative paths, and embedded credentials fail.

**Acceptance criteria**:
- [ ] Host config records derive from strict schemas, isolate duplicate/malformed marketplace records on read, and cannot represent credentials, trust, secrets, or machine content locations.
- [ ] `.pi/plugins.json` round-trips only portable marketplace declarations, requested plugin identities, constraints, and enabled intent.
- [ ] Local Git, file URLs, absolute/home/drive/UNC paths, resolved/canonical source hashes, timestamps, project keys, trust, installed state, data/cache/blob refs, pending operations, diagnostics, and projection fields are rejected.
- [ ] Unknown keys at every depth fail; malformed portable intent never yields a partial declaration.
- [ ] Source/version constraints remain declarations and cannot masquerade as resolved installed revisions or trust evidence.

### Unit 3: Installed revision, marketplace snapshot, and project-local records

**Story**: `epic-transactional-plugin-lifecycle-state-schemas-stores-installed-project`
**Depends on**: `epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning`

**Files**:
- `src/domain/state/installed-state.ts`
- `src/domain/state/project-state.ts`
- `test/domain/state/installed-state.test.ts`
- `test/domain/state/project-state.test.ts`

```typescript
// src/domain/state/installed-state.ts
export const GenerationSchema = z.number().int().nonnegative().safe().brand<"Generation">();
export const ActivationIntentSchema = z.enum(["enabled", "disabled"]);

export const MarketplaceSnapshotRecordSchema = z.object({
  marketplace: MarketplaceNameSchema,
  source: ResolvedMarketplaceSourceSchema,
  content: ContentManifestSchema,
  binding: ContentDigestSchema,
  contentRef: MarketplaceContentRefSchema,
}).strict().readonly();

export const InstalledRevisionRecordSchema = z.object({
  revision: ContentDigestSchema, // verified materialization binding and stable revision id
  plugin: NormalizedPluginSchema,
  compatibility: CompatibilityReportSchema,
  content: ContentManifestSchema,
  contentRef: PluginContentRefSchema,
  dataRef: PluginDataRefSchema,
  configurationRef: PluginConfigurationRefSchema.optional(),
}).strict().readonly();

export const InstalledPluginRecordSchema = z.object({
  plugin: PluginKeySchema,
  activation: ActivationIntentSchema,
  selectedRevision: ContentDigestSchema,
  revisions: z.array(InstalledRevisionRecordSchema).min(1).readonly(),
  pendingTransition: PendingTransitionRefSchema.optional(),
}).strict().readonly().superRefine(
  /* unique revisions; identities match; selected revision exists */
);

export const InstalledUserStateDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  generation: GenerationSchema,
  marketplaces: z.array(MarketplaceSnapshotRecordSchema).readonly(),
  plugins: z.array(InstalledPluginRecordSchema).readonly(),
}).strict().readonly();

export function createMarketplaceSnapshotRecord(input: unknown, sha256: Sha256): MarketplaceSnapshotRecord;
export function createInstalledRevisionRecord(input: unknown, sha256: Sha256): InstalledRevisionRecord;
```

Constructors reuse `verifyResolved*Source`, `verifyContentManifest`, `createMaterializationBinding`, `NormalizedPluginSchema`, and `CompatibilityReportSchema`. They require the normalized plugin source to equal the verified resolved source, compatibility identity to equal plugin identity, `revision` to equal the materialization binding, and logical references to derive from the scope/plugin/source/content inputs. No caller-supplied duplicated identity or digest is trusted.

```typescript
// src/domain/state/project-state.ts
export const ProjectLocalStateDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  generation: GenerationSchema,
  projectKey: ProjectKeySchema,
  identity: ProjectIdentitySchema,
  declarationDigest: ContentDigestSchema,
  marketplaces: z.array(MarketplaceSnapshotRecordSchema).readonly(),
  plugins: z.array(InstalledPluginRecordSchema).readonly(),
}).strict().readonly();
export type ProjectLocalStateDocumentV1 = z.infer<typeof ProjectLocalStateDocumentSchemaV1>;

export function createProjectLocalStateDocument(
  input: unknown,
  context: Extract<ScopeContext, { kind: "project" }>,
  sha256: Sha256,
): ProjectLocalStateDocumentV1;
```

Project-local records repeat the canonical identity as verification evidence but every other nested record carries only the `ProjectKey` through derived references. The constructor verifies identity/key/context and declaration digest. User and project plugin records use the same schema and invariants, while their envelopes stay independently versioned.

**Acceptance criteria**:
- [ ] Installed revisions reuse—rather than mirror—canonical source, normalized plugin, content manifest, and compatibility report contracts.
- [ ] Forged source/content binding, mismatched plugin/report identity, wrong logical content/data/config reference, dangling selected revision, and duplicate revision fail before write.
- [ ] User and project records can install/enable the same `PluginKey` independently without shared references or selected-revision pointers.
- [ ] Installed/project schemas contain no absolute paths, secret values, trust decisions, generated projection contents, expanded environment, reload evidence, timestamps, adapter objects, or native causes.
- [ ] A pending transition is only an opaque typed reference; no operation/recovery payload leaks into installed state.
- [ ] Corrupt plugin records are quarantined independently after a valid envelope; duplicate plugin keys quarantine all colliding records.

### Unit 4: Trust envelope, generation pointers, codecs, mutations, and store port

**Story**: `epic-transactional-plugin-lifecycle-state-schemas-stores-trust-pointers-ports`
**Depends on**: `epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning`

**Files**:
- `src/domain/state/trust-state.ts`
- `src/domain/state/pointers.ts`
- `src/domain/state/registry.ts`
- `src/domain/state/codec.ts`
- `src/application/state-contract.ts`
- `src/application/ports/lifecycle-state-store.ts`
- `test/domain/state/trust-state.test.ts`
- `test/domain/state/pointers.test.ts`
- `test/domain/state/registry.test.ts`
- `test/domain/state/codec.test.ts`
- `test/application/state-contract.test.ts`

```typescript
// src/domain/state/trust-state.ts
export const TrustDecisionStatusSchema = z.enum(["granted", "revoked"]);
export const TrustSubjectEvidenceSchema = z.object({
  plugin: PluginKeySchema,
  scope: ScopeReferenceSchema,
  marketplaceSource: CanonicalSourceSchema,
  pluginSource: CanonicalSourceSchema,
  immutableRevision: z.string().min(1),
  executableSurfaceDigest: ContentDigestSchema,
}).strict().readonly();
export const TrustStateRecordSchema = z.object({
  subject: TrustSubjectRefSchema,
  evidence: TrustSubjectEvidenceSchema,
  status: TrustDecisionStatusSchema,
}).strict().readonly();
export const TrustStateDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  generation: GenerationSchema,
  records: z.array(TrustStateRecordSchema).readonly(),
}).strict().readonly();
```

The subject constructor verifies the reference digest from evidence. This is persistence vocabulary only: the next feature decides when a grant is sufficient, how executable definitions are canonicalized into the surface digest, when source changes require approval, and how grants are collected/revoked. No approver identity, timestamp, prompt state, credential, configured value, or secret can be stored here.

```typescript
// src/domain/state/pointers.ts
export const StateDocumentKindRegistry = {
  hostConfig: { tag: "host-config" },
  installedUser: { tag: "installed-user" },
  trust: { tag: "trust" },
  projectLocal: { tag: "project-local" },
} as const;
export const StateDocumentPointerSchema = z.object({
  kind: StateDocumentKindSchema,
  generation: GenerationSchema,
  blob: StateBlobRefSchema,
  digest: ContentDigestSchema,
}).strict().readonly();
export const StatePointersDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  scope: ScopeReferenceSchema,
  generation: GenerationSchema,
  previousGeneration: GenerationSchema.optional(),
  documents: z.array(StateDocumentPointerSchema).readonly(),
}).strict().readonly().superRefine(
  /* exact user/project document set, unique kinds, every generation matches, previous < current */
);
```

A user pointer must select config, installed-user, and trust. A project pointer selects only project-local. `previousGeneration` is optional recovery evidence, not rollback policy. Blobs and digests are logical values; physical files, manifests, rename/fsync, lock ownership, retention, and cleanup remain adapter/later-feature concerns.

```typescript
// src/domain/state/registry.ts
export const StateDocumentRegistry = {
  hostConfig: { family: HostConfigSchemaFamily, isolation: "marketplace-record" },
  installedUser: { family: InstalledUserSchemaFamily, isolation: "plugin-record" },
  trust: { family: TrustStateSchemaFamily, isolation: "trust-record" },
  projectLocal: { family: ProjectLocalSchemaFamily, isolation: "plugin-record" },
  portableProject: { family: PortableProjectSchemaFamily, isolation: "none" },
  pointers: { family: StatePointersSchemaFamily, isolation: "none" },
} as const;
export type StateDocumentKind = keyof typeof StateDocumentRegistry;
```

Types, routing, latest-version lookup, migration, decoder selection, and tests derive from this registry. No switch may re-enumerate document kinds without an exhaustiveness assertion.

```typescript
// src/domain/state/codec.ts
export type StateCorruption = Readonly<{
  document: StateDocumentKind;
  scope: ScopeReference;
  code: "DOCUMENT_INVALID" | "VERSION_UNSUPPORTED" | "GENERATION_MISMATCH" |
    "SCOPE_MISMATCH" | "RECORD_INVALID" | "RECORD_DUPLICATE" | "DIGEST_MISMATCH";
  recordKey?: string;
  schemaPath?: string;
  message: string;
}>;
export type DecodedDocument<T> = Readonly<{
  value: T;
  corruptions: readonly StateCorruption[];
}>;

export function decodeStateDocument<K extends StateDocumentKind>(
  kind: K,
  input: unknown,
  context: Readonly<{ scope: ScopeContext; generation: Generation; sha256: Sha256 }>,
): DecodedDocument<StateDocumentByKind<K>>;
export function encodeStateDocument<K extends StateDocumentKind>(
  kind: K,
  input: StateDocumentByKind<K>,
  context: Readonly<{ scope: ScopeContext; generation: Generation; sha256: Sha256 }>,
): JsonValue;
```

Decode first validates/migrates the root and safe identity fields, then parses records separately. Corruption details are built from whitelisted metadata and Zod paths; raw values and causes are discarded. Encode validates the complete current schema and all cross-field constructors, sorts keyed records deterministically, and returns JSON-safe data. A write containing one bad record fails as a whole; isolation is a read/recovery behavior, never permission to persist known corruption.

```typescript
// src/application/state-contract.ts
export type UserGenerationSnapshot = Readonly<{
  scope: Extract<ScopeContext, { kind: "user" }>;
  generation: Generation;
  pointers: StatePointersDocumentV1;
  config: HostConfigDocumentV1;
  installed: InstalledUserStateDocumentV1;
  trust: TrustStateDocumentV1;
  corruptions: readonly StateCorruption[];
}>;
export type ProjectGenerationSnapshot = Readonly<{
  scope: Extract<ScopeContext, { kind: "project" }>;
  generation: Generation;
  pointers: StatePointersDocumentV1;
  project: ProjectLocalStateDocumentV1;
  corruptions: readonly StateCorruption[];
}>;
export type GenerationSnapshot = UserGenerationSnapshot | ProjectGenerationSnapshot;

export type StateMutation =
  | Readonly<{
      scope: Extract<ScopeContext, { kind: "user" }>;
      expectedGeneration: Generation;
      replace: Readonly<{
        config?: HostConfigDocumentV1;
        installed?: InstalledUserStateDocumentV1;
        trust?: TrustStateDocumentV1;
      }>;
    }>
  | Readonly<{
      scope: Extract<ScopeContext, { kind: "project" }>;
      expectedGeneration: Generation;
      replace: Readonly<{ project: ProjectLocalStateDocumentV1 }>;
    }>;

export type StateCommitResult =
  | Readonly<{ kind: "committed"; snapshot: GenerationSnapshot }>
  | Readonly<{ kind: "stale-generation"; expected: Generation; actual: Generation }>;

export type StateLoadResult =
  | Readonly<{ ok: true; snapshot: GenerationSnapshot }>
  | Readonly<{ ok: false; scope: ScopeReference; corruptions: readonly [StateCorruption, ...StateCorruption[]] }>;
```

Mutation schemas require at least one user replacement, verify every replacement's current generation equals `expectedGeneration`, and do not allow callers to provide the next generation or pointers. The store computes `expected + 1`, encodes replacement/current documents consistently, and returns the validated new snapshot. A snapshot may be successful with record-level corruptions; pointer/envelope/scope/generation failures produce `ok: false`.

```typescript
// src/application/ports/lifecycle-state-store.ts
export interface LifecycleStateStore {
  read(scope: ScopeContext, signal: AbortSignal): Promise<StateLoadResult>;
  commit(mutation: StateMutation, signal: AbortSignal): Promise<StateCommitResult>;
}
```

The port promises validated reads, schema-validated writes, one-scope generation consistency, and stale-generation detection. It does not prescribe lock acquisition, retries, filesystem/database technology, callback transactions, path layout, temp files, fsync, rename, leases, process coordination, or recovery. Adapter failures throw `BoundaryError(ADAPTER_FAILED)`; abort propagates unchanged; corruption is data in `StateLoadResult`.

**Acceptance criteria**:
- [ ] Trust state is independently versioned, source/revision/surface-bound, and structurally unable to contain secret/configuration values; trust policy remains outside this feature.
- [ ] Pointer schemas select exactly one coherent scope generation with the exact allowed document set and no paths.
- [ ] Every document kind/version/migration/decoder derives from `StateDocumentRegistry`; unknown kinds and future versions fail fast.
- [ ] Record-level corruption preserves valid siblings, duplicate keys never gain precedence, and enclosing pointer/scope/generation corruption fails the scope snapshot.
- [ ] Mutations are expected-generation replacements, compute the next generation internally, reject empty/invalid writes, and return a typed stale result rather than overwrite.
- [ ] Store port exposes no filesystem, lock, transaction-callback, trust-policy, projection, promotion, operation, journal, or recovery implementation detail.

### Unit 5: Public contract, adversarial fixtures, and architecture hardening

**Story**: `epic-transactional-plugin-lifecycle-state-schemas-stores-contract-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-state-schemas-stores-config-portable`, `epic-transactional-plugin-lifecycle-state-schemas-stores-installed-project`, `epic-transactional-plugin-lifecycle-state-schemas-stores-trust-pointers-ports`

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/state-contracts.test.ts`
- `test/fixtures/state/v1/valid/`
- `test/fixtures/state/v1/corrupt/`
- `test/fixtures/state/portable/`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if implementation changes their current assertions

The package barrel exports current schemas, inferred types, registry metadata, pure constructors/codecs, snapshot/mutation/result contracts, and the `LifecycleStateStore` port. It does not export adapter path builders, physical blob formats, lock APIs, trust policy, secret storage, pending-transition payloads, projection content, operation coordinators, or recovery machinery.

Dependency rules add:

- `src/domain/state/**` may import only domain modules/Zod and no Node/outer layer;
- `src/application/state-contract.ts` and `ports/lifecycle-state-store.ts` may import only domain state/canonical contracts and application sibling types;
- no current state module imports runtime, Pi, formats, infrastructure, trust adapters, secret adapters, filesystem, process, clock, or randomness;
- only future infrastructure/composition modules may implement the store port.

Committed fixtures contain independently authored JSON for every v1 family, mixed valid/corrupt record collections, generation/scope/digest mismatches, unknown future versions, migration test families, and portable-prohibition canaries. Golden serialization snapshots prove deterministic sorting and that no forbidden data appears.

**Acceptance criteria**:
- [ ] Public source and compiled ESM allowlists expose the exact intended state/schema/store contracts and no late-bound implementation surface.
- [ ] `npm test` covers typecheck, dependency boundaries, schema/migration/unit/integration/adversarial tests, build, and exact package exports.
- [ ] A full user snapshot and independent project snapshot round-trip canonical plugin/content/report evidence through fake in-memory store ports without filesystem assumptions.
- [ ] Mixed corruption fixtures preserve unrelated plugins/scopes and emit redacted safe reports; fatal envelope/pointer failures expose no partial snapshot.
- [ ] Source scans and canary fixtures prove state contains no secret values, projection contents, expanded environment, absolute installed/data/cache paths, timestamps in portable declarations, or native causes.
- [ ] Foundation documents remain current and do not claim a concrete lock/storage/trust/promotion/operation/recovery policy this feature does not own.

## Exact document ownership and isolation matrix

| Family | Version owner | Isolation boundary | Allowed authority | Explicitly absent |
|---|---|---|---|---|
| Host config | this feature; update policy consumes | marketplace record | user marketplace declaration + application preference | credentials, trust, cache paths, timestamps, resolved snapshots |
| Installed user | this feature; lifecycle mutates | plugin record; whole revision record within plugin | normalized plugin/report/content evidence + logical refs | secrets, projections, reload evidence, trust policy, physical paths |
| Trust | envelope/evidence here; semantics in `trust-config-secrets` | trust subject record | canonical source/revision/surface evidence + status | secrets, configured values, prompts, approver/time policy |
| Project local | this feature; lifecycle mutates | plugin record after identity envelope | verified `ProjectIdentity`/`ProjectKey`, declaration digest, project records | portable declaration authority, imported trust, physical paths |
| Portable project | this feature; project sync consumes | none—whole file fails | portable marketplace/plugin intent only | every machine-local/operational field |
| Generation pointers | this feature; store adapter publishes | none—scope fatal | logical blob refs/digests for one exact generation | storage path, lock, fsync, rename, journal/GC policy |
| Pending transition payload | `operations` + `recovery-journal-gc` | later design | opaque ref only in installed record | payload and projection hashes in current schemas |

## Implementation order

1. `epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning`
2. In parallel after Unit 1:
   - `epic-transactional-plugin-lifecycle-state-schemas-stores-config-portable`
   - `epic-transactional-plugin-lifecycle-state-schemas-stores-installed-project`
   - `epic-transactional-plugin-lifecycle-state-schemas-stores-trust-pointers-ports`
3. `epic-transactional-plugin-lifecycle-state-schemas-stores-contract-hardening`

The root story fixes identity, scope, reference, and migration grammar. Three independently owned schema surfaces can then proceed in parallel. Contract hardening converges them through the registry, public package, fake store, architecture checks, and adversarial fixtures. The decomposition provides real dependency edges and isolated review surfaces rather than splitting by frontend/backend.

## Testing

- **Schema/type agreement**: every exported type is `z.infer` from its schema; `expectTypeOf` and runtime parses cover every family/version/registry tag. No handwritten persistence interface mirrors a schema-owned shape.
- **Project identity vectors**: repository/path-only, same root/different fingerprint, same fingerprint/different root, URI normalization, credentials/query/fragment/dot segments, Unicode/lone-surrogate cases, wrong key, and deterministic injected SHA-256.
- **Migration tests**: synthetic v1→v2 families prove ordered pure hops, intermediate validation, input immutability, repeat determinism, graph-gap rejection, unknown old/future version handling, and schema-path diagnostics. Production v1 families prove no implicit migration or defaulting.
- **Portable boundary**: positive fixtures for GitHub/HTTPS/SSH and relative marketplace/plugin declarations; generated negative cases inject every prohibited key at every depth plus local/file/absolute/home/drive/UNC paths, credentials, hashes, timestamps, trust, config/secret refs, operations, and projection material.
- **Canonical reuse**: construct installed revisions from real normalized bundle/compatibility/content fixtures. Tamper independently with plugin key, marketplace, source canonical/hash, immutable revision, report identity, content entry/root digest/binding, selected revision, and each logical reference.
- **Corruption isolation**: corrupt one marketplace, plugin, revision, trust record, and project plugin while valid siblings survive; duplicate identity tests quarantine all duplicates. Corrupt version, pointer, scope, project key, generation, or selected document digest and assert no snapshot.
- **Mutation/store contract**: fake store proves read validation, partial user replacement retaining untouched documents, project-only replacement, generation increment, stale compare-and-swap, abort propagation, adapter failure, and no callback/lock during caller work.
- **Secret/projection safety**: canary strings in secret-looking fields, raw MCP headers/configured values, projection roots, environment expansion, absolute paths, and native causes must be rejected or absent from serialized state and corruption JSON. The normalized canonical bundle remains allowed; generated projections do not.
- **Determinism**: permute input collection/property order and assert canonical encoded records and derived keys/refs are byte-for-byte stable. Duplicate records never depend on input order.
- **Boundaries/public API**: generated dependency-cruiser violations cover state-domain→Node/application/infrastructure/runtime/Pi and state-port→infrastructure. Source and compiled export allowlists assert only intended schemas, types, constructors, codec/registry, and store port.

## Risks

- **Riskiest assumption — a pointer-selected multi-document generation is implementable with required crash guarantees on every target filesystem**: the schema/port can express coherence, but physical durability differs. Mitigation: the store port promises only validated coherent publication; `generation-locking` must state platform guarantees and fail when required primitives are unavailable. Fallback: an adapter may use a transactional database or single packed generation blob without changing this port; do not weaken snapshot semantics.
- **Project identity may be unavailable or unstable outside Git**: path-only identity changes on moves and cannot distinguish all repository histories. Mitigation: label it in the value, include the canonical root in the key, and never inherit trust across keys. Fallback: a future identity adapter adds a new tagged identity/key version and explicit relink flow; it does not reinterpret v1.
- **Embedding normalized plugin/report/content records can make state large**: these are the exact authoritative inputs needed to rebuild projections and explain trust/compatibility. Mitigation: immutable revision records deduplicate through logical content refs and bounded canonical schemas; measure before introducing indirection. Fallback: a later schema version can move canonical evidence to content-addressed blobs while retaining digest-verified semantics.
- **Record isolation can hide a coordinated corruption pattern**: preserving siblings must not turn an invalid envelope or duplicate key into precedence. Mitigation: only identifiable independent records are quarantined; pointer, scope, generation, duplicate identity, and cross-record reference failures are fatal at the smallest safe enclosing boundary.
- **Trust evidence shape could constrain future policy**: canonical source/revision/surface binding is required by the foundation, but grant policy may evolve. Mitigation: trust has its own schema version and the next feature owns semantics. Fallback: migrate trust independently; never add trust policy fields to installed/project documents.
- **Portable prohibited-field guard can overreject future legitimate metadata**: strictness is intentional for executable project intent. Mitigation: allowlist the exact contract and version it. Fallback: add a reviewed v2 field with portable semantics rather than allowing generic metadata or ignoring unknown keys.
- **Least certainty — configuration reference lifetime**: persistent non-secret configuration and OS secret references are not yet designed. Mitigation: installed state carries only one opaque logical `PluginConfigurationRef`; `trust-config-secrets` owns its target and lifecycle. If that feature proves no reference is needed, v1 records can omit it; no secret value can enter state meanwhile.

## Pre-mortem

This design fails if two projects alias one key and inherit executable trust, a corrupted plugin disables every installation, a stale writer overwrites a newer scope, a portable declaration smuggles a machine path or trust decision, or installed state becomes a second projection store. The design counters those failures with root+repository-bound project keys, record quarantine behind trusted envelopes, expected-generation mutations, whole-file strict portable validation with explicit prohibitions, and schemas that retain canonical normalized evidence but have no projection-content fields.

The least recoverable mistake is exposing unvalidated unknown state through the store port: every downstream operation would then need its own migration and corruption policy. Implementation must therefore land the registry/codecs before any adapter and make both read and write validation mandatory. If atomic pointer publication cannot be proven by a chosen adapter, implementation stops at the port/fake contract and leaves that adapter for `generation-locking`; it must not simulate success with best-effort multi-file writes.

## Implementation summary

The initial state-schema units delivered strict versioned state families, secure project/scope identity, portable project intent, installed user/project evidence, trust/pointer codecs, corruption isolation, deterministic mutations, and an adapter-neutral lifecycle state port. Review hardening replaces unrestricted declarations with safe evidence summaries, verifies raw digests before isolation, fails unidentified records closed, exposes fixed corruption projections, and separates unverified mutation input from opaque verified store mutations. Physical storage, locks, trust policy, secrets, promotion, operations, projections, and recovery remain outside this feature.

Integrated verification: `npm test` performs real production and test-file typechecking and passes 426 tests plus clean dependency boundaries, build, and exact 257-export package import.

## Other agent review

- Phase 1 completeness: Z.AI GLM 5.2 xhigh approved the intended schema, migration, scope, isolation, and port architecture.
- Phase 2 contract quality: GPT-5.6 Sol high reproduced unrestricted runtime/secret persistence, digest checks that defeated isolation, optional mutation verification, recovery of unidentifiable records, and free-form corruption-detail leakage.
- Accepted: all blocker and important findings because they violate authoritative-state safety and corruption isolation. Tracked by `epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening`.

## Review findings

All three review-hardening stories are done. Test files participate in strict typechecking, every surfaced suite error is repaired, verified-mutation compile-time rejection is actually exercised, and a participation regression prevents silent exclusion.

## Final review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

GLM 5.2 completeness and GPT-5.6 Sol adversarial contract review independently approved current HEAD with zero significant findings. Both confirmed the real test-typecheck pipeline, active verified-mutation compile-time rejection, all five prior state-boundary closures, 426 passing tests, clean production/test typechecking and dependency boundaries, successful build, and exact 257-export package import.
