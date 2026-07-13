---
id: epic-transactional-plugin-lifecycle-trust-config-secrets
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

# Trust, Configuration, and Secrets

## Brief

Define lifecycle policy and ports for source/revision/executable-surface trust, validated plugin configuration values, and operating-system-backed secret storage. Trust must bind to canonical marketplace and plugin source identity, immutable revision, and normalized executable component definitions; configured values must satisfy the completed descriptor contracts before activation.

Sensitive values pass directly through a dedicated secret-store boundary and are resolved only at execution or MCP connection time. This feature never places secret material in authoritative state, projections, journals, diagnostics, reports, or logs, and it does not render prompts, implement a credential backend, activate components, or decide automatic-update policy.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 2 safeguard — lifecycle operations consume its validated grants and secret references
- Depends on state schemas for durable non-secret trust/config references
- Required guarantees: scope, data, network, and ports guarantees in the parent epic

## Foundation references

- `docs/VISION.md` — Explicit trust
- `docs/SPEC.md` — Supporting plugin configuration; Trust and security; Enablement
- `docs/ARCHITECTURE.md` — Trust subject; Trust flow; State ports
- `docs/COMPATIBILITY.md` — Supporting plugin configuration; Whole-plugin behavior

## Existing contract references

- `src/domain/configuration.ts` — descriptor-only configuration contracts
- `src/domain/plugin.ts` — normalized executable inventory
- `src/domain/source.ts` and `src/domain/component-identity.ts` — source and component trust identities
- `src/domain/compatibility.ts` — complete report required before trust/activation

## Late-bound feature decisions

Trust-record schema, executable-surface fingerprint representation, grant/revoke semantics, non-sensitive configured-value storage shape, secret key naming, platform credential-adapter selection, missing-secret behavior, and update trust-diff presentation data remain for feature design. The presentation layer collects consent later; this feature exposes typed policy/results only.

## UI alignment

No UI surface in this feature. Trust and configuration interaction belongs to `epic-native-plugin-management`.

## Discovery and design decisions

- **Discovery posture**: Direct-read only. The completed state feature, current state/configuration/source/component/compatibility contracts, application ports, boundary rules, package exports, tests, parent epic, and all four cited foundation documents provide a bounded and complete contract surface. No exploratory fanout was needed.
- **Trust granularity**: A direct grant is exact and scope-bound. It covers one canonical marketplace source, canonical resolved plugin source, verified source/content materialization binding, and executable-surface digest. It never means “trust this plugin name”, “trust future revisions”, or “trust this repository forever”. Automatic-update authority remains a later policy and may only cause that feature to create a new exact grant after its own checks.
- **Immutable revision evidence**: `immutableRevision` is the verified materialization binding used as the installed revision id, not a display version and not merely a mutable branch/tag. Canonical resolved source identity remains separate evidence. This binds trust to both authoritative source and the exact acquired bytes.
- **Executable surface**: One canonical `ExecutableSurfaceRegistry` derives safe, sorted trust entries and the digest from normalized skills, hooks, MCP servers, and configuration descriptors. The completed installed-state evidence builder must consume this function instead of retaining its private second fingerprint implementation. The complete compatibility report must match the normalized component inventory and be activatable before a trust candidate can be constructed. Foreign/incompatible components are shown as compatibility limitations but are not silently treated as executable.
- **State ownership**: Existing `TrustStateRecord` and `TrustSubjectEvidence` remain the durable decision vocabulary. This feature supplies verified constructors and policy over those records; it does not add prompts, approvers, timestamps, or secret/configured values to trust state. Grant and revoke produce proposed trust-document replacements for later compare-and-commit through `parseStateMutation` and `LifecycleStateStore`.
- **Grant and revoke semantics**: Granting or revoking the same exact subject is idempotent. Revocation updates only that exact subject; it does not revoke sibling scopes, old/new revisions, or other source identities by plugin-name wildcard. No grant is inferred by similarity. A revoked or absent record denies activation/resolution with a stable safe reason.
- **Project trust**: Exact plugin trust is necessary but not sufficient in project scope. `ProjectTrustPort` is a separate application port; project candidate creation and authorization fail closed unless the adapter reports the exact `ProjectKey` trusted. User scope does not call this port. This preserves Pi's project-trust boundary without importing Pi into policy.
- **Configured-value authority**: Main lifecycle state stores only the existing `PluginConfigurationRef`. A strict, schema-derived `PluginConfigurationDocument` behind `PluginConfigurationStore` is the authoritative target of that logical ref. It stores normalized non-sensitive values and opaque `SecretLocator`s only—never secret values, expanded strings, environment maps, paths to credential databases, or adapter metadata.
- **Configuration revisions**: Configuration documents are compare-and-swap revisions. The document revision is a SHA-256 digest over its scope, plugin, `PluginConfigurationRef`, descriptor digest, normalized non-secret values, and secret locators. Secret-only edits still change the document because each newly supplied secret receives a fresh write-id-derived locator. A stale writer cannot overwrite a newer configuration.
- **Validation policy**: Unknown keys, duplicate/unset conflicts, wrong primitive kinds, non-finite numbers, pattern failures, bounds failures, and missing required values fail before any write. Non-sensitive defaults are applied only when a value is absent. Sensitive defaults remain impossible by the completed descriptor schema. Omitted sensitive keys preserve an existing locator during replacement; explicit `unset` removes an optional secret and fails for a required one.
- **File and directory values**: `ConfigurationPathPort` normalizes a supplied/default path against an explicit trusted base supplied by the lifecycle/presentation caller and reports its actual kind. Stored path values are canonical absolute `file:` URLs, giving the domain one cross-platform schema while adapters own conversion to native paths. Relative values are never persisted or resolved later against an ambient process working directory. `mustExist` and file-versus-directory constraints are checked at collection and rechecked at execution because the filesystem can change.
- **Secret key naming**: `SecretLocator` is `secret-v1:sha256:<digest>`, derived injectively from scope reference, plugin key, `PluginConfigurationRef`, option key, and a fresh `ConfigurationWriteId`. It contains no plugin name, project path, option name, credential value, or backend/service/account convention. The OS adapter maps the opaque locator to its platform-specific service/account naming.
- **Secret custody**: `SecretStore` accepts/returns an opaque `SensitiveValue`, never a plain value in result contracts. The application save service validates all input first, writes newly supplied secrets under fresh locators, then compare-and-swap replaces the non-secret configuration document. A failed/stale config write removes fresh locators; cleanup failure is explicit and cannot be reported as a clean failure. After commit, superseded locators are deleted; inability to clean them yields a successful-but-cleanup-required result because the active document is already safe and valid.
- **Missing-secret behavior**: A required missing secret fails closed for activation, hook execution, or MCP connection with `CONFIG_SECRET_MISSING`; no empty string, default, stale cached value, or prompt fallback is substituted. An optional missing secret is omitted entirely. Adapter failure is distinct from absence and never degrades to “missing”.
- **Resolution lifetime**: Secrets are fetched only by `withResolvedPluginConfiguration` immediately before a component execution/MCP connection. The callback receives a non-serializable `ResolvedConfiguration` facade and cannot obtain a diagnostic/report object containing values. The facade performs placeholder/environment lookup, is disposed in `finally`, and renders only `[REDACTED]` through string/JSON inspection. No resolved map is persisted or returned from the callback boundary.
- **Update trust diff**: `describeTrustChange` compares safe canonical surface entries and source/revision evidence, returning added/removed/changed component summaries and configuration-descriptor changes. It contains no configured values or secret locators. It is presentation data only and does not decide automatic-update authority.
- **Credential adapter selection**: This feature defines the `SecretStore` contract and adapter conformance suite only. The Node composition feature selects macOS Keychain, Windows Credential Manager, or Linux Secret Service adapters and must fail explicitly when a supported OS credential service is unavailable; plaintext files, environment variables, Pi settings, and plugin-host JSON are not fallback stores.
- **Removal policy**: Disable never deletes configuration or secrets. Reconfiguration deletes only superseded fresh/old locators after the new document wins CAS. Uninstall/persistent-data cleanup must pass an explicit confirmed deletion intent before invoking configuration/secret removal; lifecycle operations owns that confirmation and ordering.
- **Foundation timing**: No design-time foundation edit is required. The current documents already require exact source/revision/surface trust, validated configuration, OS-backed secrets, runtime-only resolution, project trust, and no secret state/projection/logging. Implementation updates them only if exact public names materially change those assertions.

## Other agent review

- **Invoked because**: Exact executable trust and cross-store secret custody are security-critical, cross-cutting contracts with costly failure modes.
- **Phase 1 — advisory/completeness**: Degraded. This delegated design context exposes no further sub-agent or different-model review mechanism; the caller supplied the governing advisory-review capsule but no prior review findings.
- **Phase 2 — adversarial**: Local pre-mortem attacked source/revision aliasing, project-trust bypass, canonicalization omissions, stale config writes, cross-store partial failure, missing-secret fallback, path drift, plaintext leakage, and cleanup ownership.
- **Accepted**: Exact scope/source/binding/surface grants; centralized executable fingerprint reuse; project-trust port; fresh secret locators plus config CAS; required/optional missing semantics; execution-time path recheck; locator-only cleanup evidence; versioned canonicalization.
- **Rejected**: State-held encrypted secrets, mutable/wildcard grants, ambient-cwd path resolution, empty-string credential fallback, plaintext credential-store fallback, and a feature-local recovery journal.
- **Skipped/degraded**: Independent different-class advisory was unavailable and is non-blocking at design time under the principles policy. Feature-level implementation review remains required later.

## Architectural choice

### Option A — put configured values and encrypted secrets in lifecycle state

This would make state commits appear atomic and simplify reads, but encryption keys and ciphertext become a credential backend, secrets enter snapshots/journals/backups, state corruption diagnostics become dangerous, and platform credential-store guarantees are bypassed. Rejected.

### Option B — exact trust policy plus a CAS non-secret configuration store and dedicated secret store (chosen)

Pure domain code derives exact trust candidates, executable surfaces, configured documents, locators, and typed decisions. Application services depend on project-trust, path-validation, configuration-store, secret-store, and write-id ports. Main state retains only exact trust evidence and a logical configuration reference. Fresh secret locators plus config CAS make the active view switch safely without storing secret values. This preserves ports/adapters boundaries and creates one source of truth for every growing variant set. The cost is explicit orphan cleanup after cross-store failures.

### Option C — delegate all trust/configuration behavior to Pi presentation/runtime adapters

Adapters could prompt, validate, store, and expand values directly. That is initially small but duplicates policy across commands, UI, hooks, and MCP; lets non-interactive paths bypass checks; and couples lifecycle contracts to Pi and credential APIs. Rejected.

**Choice**: Option B. The domain owns deterministic policy and generated contracts; application services orchestrate only ports; adapters own filesystem/project-trust/OS-credential effects and never become policy authorities.

## Trickiest unit first

Cross-store secret replacement is the highest-risk unit. A naïve “write config, then secrets” exposes an active document that references missing credentials; “overwrite secrets, then config” can corrupt the working configuration when CAS loses. The design instead allocates fresh, write-id-qualified locators, writes secrets without touching old locators, atomically CAS-replaces only the non-secret document, and then retires superseded locators. Before CAS, failure leaves the old document and old secrets authoritative. After CAS, cleanup failure can leave only unreachable credentials, never an active missing-secret reference; it is reported for retry rather than disguised as success. No operation hashes a secret or includes one in an error.

## Implementation units

### Unit 1: Canonical executable surface and exact trust policy

**Story**: `epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy`

**Files**:
- `src/domain/executable-surface.ts`
- `src/domain/trust-policy.ts`
- `src/domain/state/installed-state.ts`
- `src/application/trust-service.ts`
- `src/application/ports/project-trust.ts`
- `test/domain/executable-surface.test.ts`
- `test/domain/trust-policy.test.ts`
- `test/application/trust-service.test.ts`

```typescript
// src/domain/executable-surface.ts
export const ExecutableSurfaceKindRegistry = {
  skill: { tag: "skill", schema: SkillTrustEntrySchema },
  hook: { tag: "hook", schema: HookTrustEntrySchema },
  mcpServer: { tag: "mcp-server", schema: McpTrustEntrySchema },
  configuration: { tag: "configuration", schema: ConfigurationTrustEntrySchema },
} as const;

export const ExecutableSurfaceSchema = z.object({
  version: z.literal("executable-surface-v1"),
  entries: z.array(ExecutableSurfaceEntrySchema).readonly(),
}).strict().readonly();
export type ExecutableSurface = z.infer<typeof ExecutableSurfaceSchema>;

export function createExecutableSurface(
  plugin: NormalizedPlugin,
  report: CompatibilityReport,
): ExecutableSurface;
export function digestExecutableSurface(
  surface: ExecutableSurface,
  sha256: Sha256,
): ContentDigest;
```

The registry owns entry schemas, canonical projection, display labels, diff routing, and exhaustive handling. Entries retain the normalized execution-defining fields: skill id/name/root; hook id/event/matcher/full handler; MCP id/native key/full normalized declaration; and each configuration key/type/required/sensitive/default-independent constraint. Entries sort by kind then component/key UTF-8 bytes; object keys canonicalize recursively. Provenance, labels/descriptions, diagnostics, configured values, and secret locators are excluded from the digest. The compatibility graph must exactly cover the plugin inventory and be activatable.

```typescript
// src/domain/trust-policy.ts
export const TrustCandidateSchema = z.object({
  subject: TrustSubjectRefSchema,
  evidence: TrustSubjectEvidenceSchema,
  surface: ExecutableSurfaceSchema,
}).strict().readonly();
export type TrustCandidate = z.infer<typeof TrustCandidateSchema>;

export type TrustDecision =
  | Readonly<{ kind: "authorized"; subject: TrustSubjectRef }>
  | Readonly<{ kind: "denied"; reason: "ABSENT" | "REVOKED" | "EVIDENCE_MISMATCH" }>;

export function createTrustCandidate(input: Readonly<{
  scope: ScopeReference;
  marketplaceSource: ResolvedMarketplaceSource;
  plugin: NormalizedPlugin;
  compatibility: CompatibilityReport;
  content: ContentManifest;
  materializationBinding?: ContentDigest; // caller claim is verified when supplied
}>, sha256: Sha256): TrustCandidate;
export function evaluateTrust(
  candidate: TrustCandidate,
  records: readonly TrustStateRecord[],
  sha256: Sha256,
): TrustDecision;
export function grantTrust(candidate: TrustCandidate, sha256: Sha256): TrustStateRecord;
export function revokeTrust(candidate: TrustCandidate, sha256: Sha256): TrustStateRecord;
export function describeTrustChange(
  previous: TrustCandidate | undefined,
  candidate: TrustCandidate,
  sha256: Sha256,
): TrustChangeDescription;
```

`createTrustCandidate` verifies resolved source hashes, compatibility identity/inventory/activatability, the content manifest, the recomputed plugin-source/content materialization binding, marketplace-relative revision agreement, executable digest, and derived subject. `evaluateTrust` verifies persisted records before selecting an exact subject and never falls back to plugin/source similarity. `TrustChangeDescription` reports source-identity/revision booleans plus safe added/removed/changed summaries and descriptor changes; no configured or credential data is accepted by its schema. `src/domain/state/installed-state.ts` replaces its private executable/configuration fingerprint projection with this same registry-owned digest.

```typescript
// src/application/ports/project-trust.ts
export interface ProjectTrustPort {
  assess(projectKey: ProjectKey, signal: AbortSignal): Promise<
    | Readonly<{ kind: "trusted" }>
    | Readonly<{ kind: "untrusted" }>
  >;
}

// src/application/trust-service.ts
export function authorizeTrustCandidate(
  request: Readonly<{ candidate: TrustCandidate; records: readonly TrustStateRecord[] }>,
  dependencies: Readonly<{ projectTrust: ProjectTrustPort; sha256: Sha256 }>,
  signal: AbortSignal,
): Promise<TrustAuthorizationResult>;
```

For project scope, project trust is assessed before plugin trust. Result codes are stable and safe (`PROJECT_UNTRUSTED`, `TRUST_ABSENT`, `TRUST_REVOKED`, `TRUST_EVIDENCE_INVALID`) and never include raw declarations or causes.

**Acceptance criteria**:
- [ ] Trust subject changes when scope, marketplace source, plugin source, materialization binding, hook command/matcher, MCP declaration, skill inventory, or configuration descriptor changes.
- [ ] Reordering components/properties/provenance does not change the surface digest; all digest variants derive from one registry.
- [ ] Candidate construction rejects unverified source hashes, mismatched/incomplete compatibility reports, non-activatable bundles, and forged subject/digest evidence.
- [ ] Grant/revoke are idempotent and exact; absent, revoked, and mismatched evidence fail closed without wildcard inheritance.
- [ ] Project candidates cannot be authorized while the exact project key is untrusted; user candidates do not depend on project trust.
- [ ] Trust-change data is useful for later presentation but contains no configured values, secret locators, or secret material.

### Unit 2: Configured-value contracts and validation

**Story**: `epic-transactional-plugin-lifecycle-trust-config-secrets-value-validation`

**Files**:
- `src/domain/configuration.ts` (export the existing authoritative `ConfigurationKeySchema`)
- `src/domain/configured-values.ts`
- `src/application/configuration-validation.ts`
- `src/application/ports/configuration-path.ts`
- `test/domain/configured-values.test.ts`
- `test/application/configuration-validation.test.ts`

```typescript
// src/domain/configured-values.ts
export const ConfiguredValueSchemaRegistry = {
  string: z.object({ kind: z.literal("string"), value: z.string() }).strict(),
  number: z.object({ kind: z.literal("number"), value: z.number().finite() }).strict(),
  boolean: z.object({ kind: z.literal("boolean"), value: z.boolean() }).strict(),
  directory: z.object({ kind: z.literal("directory"), value: CanonicalConfigurationPathSchema }).strict(),
  file: z.object({ kind: z.literal("file"), value: CanonicalConfigurationPathSchema }).strict(),
  strings: z.object({ kind: z.literal("strings"), value: z.array(z.string()).readonly() }).strict(),
} as const;
export const ConfiguredValueSchema = z.discriminatedUnion(
  "kind", schemaValues(ConfiguredValueSchemaRegistry),
);
export type ConfiguredValue = z.infer<typeof ConfiguredValueSchema>;

export const SecretLocatorSchema = z.string()
  .regex(/^secret-v1:sha256:[0-9a-f]{64}$/)
  .brand<"SecretLocator">();
export const ConfigurationWriteIdSchema = z.string()
  .regex(/^config-write-v1:[A-Za-z0-9_-]{22,128}$/)
  .brand<"ConfigurationWriteId">();

export const PluginConfigurationDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  configurationRef: PluginConfigurationRefSchema,
  plugin: PluginKeySchema,
  scope: ScopeReferenceSchema,
  descriptorDigest: ContentDigestSchema,
  revision: ContentDigestSchema,
  values: z.array(z.object({ key: ConfigurationKeySchema, value: ConfiguredValueSchema }).strict()).readonly(),
  secrets: z.array(z.object({ key: ConfigurationKeySchema, locator: SecretLocatorSchema }).strict()).readonly(),
}).strict().readonly().superRefine(/* unique keys; descriptor sensitivity partition */);
export type PluginConfigurationDocument = z.infer<typeof PluginConfigurationDocumentSchemaV1>;

export function digestConfigurationDescriptors(
  configuration: PluginConfiguration,
  sha256: Sha256,
): ContentDigest;
export function deriveSecretLocator(input: Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  configurationRef: PluginConfigurationRef;
  key: string;
  writeId: ConfigurationWriteId;
}>, sha256: Sha256): SecretLocator;
export function createPluginConfigurationDocument(input: unknown, sha256: Sha256): PluginConfigurationDocument;
export function verifyPluginConfigurationDocument(input: unknown, descriptors: PluginConfiguration, sha256: Sha256): PluginConfigurationDocument;
```

The descriptor digest derives from the completed `PluginConfigurationSchema`; configured-value variants derive from `ConfigurationValueKindRegistry` with an exhaustive type-level assertion so adding a descriptor kind cannot silently skip validation/storage. Document creation verifies `PluginConfigurationRef`, descriptor digest, key partition, locator derivation shape, sorted keys, and its own revision.

```typescript
// src/application/ports/configuration-path.ts
export type ConfigurationPathContext = Readonly<{
  scope: ScopeContext;
  trustedBaseDirectory: string;
}>;
export interface ConfigurationPathPort {
  normalizeAndInspect(
    input: Readonly<{ value: string; expected: "file" | "directory"; mustExist: boolean; context: ConfigurationPathContext }>,
    signal: AbortSignal,
  ): Promise<
    | Readonly<{ kind: "valid"; canonicalPath: CanonicalConfigurationPath }>
    | Readonly<{ kind: "missing" | "wrong-kind" | "invalid" }>
  >;
}

// src/application/configuration-validation.ts
export function validateConfigurationSubmission(
  request: ConfigurationSubmission,
  pathPort: ConfigurationPathPort,
  signal: AbortSignal,
): Promise<ValidatedConfigurationSubmission>;
```

`CanonicalConfigurationPathSchema` accepts only canonical absolute `file:` URLs without credentials, query, fragment, control characters, unsafe segments, or ambiguous spelling; adapters convert to/from platform paths. `ValidatedConfigurationSubmission` is internal application data: normalized non-sensitive entries, sensitive entries wrapped in `SensitiveValue`, preserved existing locators, and locators to unset. Its JSON/string projection is always redacted and it is not exported from the package barrel. Validation performs no writes and diagnostics expose only option keys, expected kinds, and stable codes.

**Acceptance criteria**:
- [ ] Every descriptor kind validates exact runtime type, defaults, requiredness, patterns/bounds, and string-array limits; unknown keys and ambiguous unset/submission combinations fail.
- [ ] Sensitive values never appear in configured document schemas, validation results intended for diagnostics, thrown messages, or JSON serialization.
- [ ] Omitted sensitive values preserve existing locators; explicit unset removes only optional secrets; first-time required secrets cannot be omitted.
- [ ] File/directory values are normalized through the port against an explicit trusted base and stored only as canonical absolute `file:` URLs; existence/kind failures are typed.
- [ ] Descriptor/document/locator/revision digests are deterministic, scope-bound, verified, and reject caller-forged hashes.
- [ ] Adding a configuration descriptor variant fails compilation/tests until validation and persistence handling are added to the registry.

### Unit 3: Secret custody and crash-safe configuration replacement

**Story**: `epic-transactional-plugin-lifecycle-trust-config-secrets-secret-custody`
**Depends on**: `epic-transactional-plugin-lifecycle-trust-config-secrets-value-validation`

**Files**:
- `src/application/sensitive-value.ts`
- `src/application/configuration-service.ts`
- `src/application/ports/plugin-configuration-store.ts`
- `src/application/ports/secret-store.ts`
- `src/application/ports/configuration-write-id.ts`
- `test/application/sensitive-value.test.ts`
- `test/application/configuration-service.test.ts`
- `test/contract/secret-store.contract.ts`

```typescript
// src/application/sensitive-value.ts
export class SensitiveValue {
  static fromUnknown(input: unknown): SensitiveValue;
  toString(): "[REDACTED]";
  toJSON(): "[REDACTED]";
  [Symbol.toPrimitive](): "[REDACTED]";
  // Native private storage; no public getter.
}
export function withSensitiveValue<T>(
  value: SensitiveValue,
  consume: (plaintext: string) => T,
): T;

// src/application/ports/secret-store.ts
export interface SecretStore {
  put(locator: SecretLocator, value: SensitiveValue, signal: AbortSignal): Promise<void>;
  get(locator: SecretLocator, signal: AbortSignal): Promise<
    | Readonly<{ kind: "found"; value: SensitiveValue }>
    | Readonly<{ kind: "missing" }>
  >;
  remove(locator: SecretLocator, signal: AbortSignal): Promise<"removed" | "missing">;
}

// src/application/ports/plugin-configuration-store.ts
export interface PluginConfigurationStore {
  read(ref: PluginConfigurationRef, signal: AbortSignal): Promise<
    | Readonly<{ kind: "found"; document: PluginConfigurationDocument }>
    | Readonly<{ kind: "missing" }>
  >;
  replace(request: Readonly<{
    expectedRevision: ContentDigest | null;
    document: PluginConfigurationDocument;
  }>, signal: AbortSignal): Promise<
    | Readonly<{ kind: "stored" }>
    | Readonly<{ kind: "stale"; actualRevision: ContentDigest | null }>
  >;
  remove(request: Readonly<{
    ref: PluginConfigurationRef;
    expectedRevision: ContentDigest;
    confirmedSecretDeletion: true;
  }>, signal: AbortSignal): Promise<"removed" | "stale" | "missing">;
}

// src/application/ports/configuration-write-id.ts
export interface ConfigurationWriteIdPort {
  create(signal: AbortSignal): Promise<ConfigurationWriteId>;
}
```

Ports distinguish missing values from adapter failures. Adapter failures throw typed `BoundaryError(ADAPTER_FAILED)` with no native cause in serialized diagnostics; abort propagates unchanged. `ConfigurationWriteIdPort` must provide unpredictable, process-safe unique ids but application/domain code imports no randomness API.

```typescript
// src/application/configuration-service.ts
export function savePluginConfiguration(
  request: SavePluginConfigurationRequest,
  dependencies: Readonly<{
    configurations: PluginConfigurationStore;
    secrets: SecretStore;
    paths: ConfigurationPathPort;
    writeIds: ConfigurationWriteIdPort;
    sha256: Sha256;
  }>,
  signal: AbortSignal,
): Promise<ConfigurationSaveResult>;

export function removePluginConfiguration(
  request: RemovePluginConfigurationRequest & Readonly<{ confirmedSecretDeletion: true }>,
  dependencies: Readonly<{ configurations: PluginConfigurationStore; secrets: SecretStore; sha256: Sha256 }>,
  signal: AbortSignal,
): Promise<ConfigurationRemovalResult>;
```

Save order is: read/verify current document; validate the entire submission; allocate write id; derive and write fresh locators; build/verify the candidate document; CAS replace; on failed CAS remove every fresh locator; after stored CAS remove superseded locators. A secret write failure cleans already-written fresh locators. Cleanup errors return only locator ids and stable operation codes, never values. Removal reads/verifies the exact document, requires explicit confirmed deletion, removes secrets, then CAS-removes the document; partial adapter failure is explicit for lifecycle retry.

**Acceptance criteria**:
- [ ] No secret store call occurs until the complete submission, descriptors, existing document, paths, refs, and hashes validate.
- [ ] Config CAS never points at an unwritten fresh secret; stale/config failure leaves old document and old secret locators untouched.
- [ ] Every pre-CAS failure cleans fresh locators; cleanup failure is surfaced distinctly and cannot become a successful save.
- [ ] Post-CAS old-secret cleanup failure reports `stored-with-cleanup-required` while the new active document remains complete.
- [ ] Disable has no deletion API path; removal requires the literal confirmed deletion capability and cannot be called accidentally with a boolean default.
- [ ] Sensitive wrappers stringify/serialize as `[REDACTED]`, secret port fakes prove values never enter results/errors, and adapter conformance rejects plaintext fallback behavior.

### Unit 4: Trust-gated execution-time resolution

**Story**: `epic-transactional-plugin-lifecycle-trust-config-secrets-runtime-resolution`
**Depends on**: `epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy`, `epic-transactional-plugin-lifecycle-trust-config-secrets-secret-custody`

**Files**:
- `src/application/resolved-configuration.ts`
- `src/application/configuration-resolver.ts`
- `test/application/resolved-configuration.test.ts`
- `test/application/configuration-resolver.test.ts`

```typescript
// src/application/resolved-configuration.ts
export interface ResolvedConfiguration {
  has(key: string): boolean;
  substitute(template: string): string;
  environment(prefix?: "CLAUDE_PLUGIN_OPTION_"): Readonly<Record<string, string>>;
  dispose(): void;
  toString(): "[REDACTED]";
  toJSON(): "[REDACTED]";
}

// src/application/configuration-resolver.ts
export async function withResolvedPluginConfiguration<T>(
  request: Readonly<{
    candidate: TrustCandidate;
    trustRecords: readonly TrustStateRecord[];
    configurationRef: PluginConfigurationRef | undefined;
    descriptors: PluginConfiguration;
    pathContext: ConfigurationPathContext;
  }>,
  dependencies: Readonly<{
    projectTrust: ProjectTrustPort;
    configurations: PluginConfigurationStore;
    secrets: SecretStore;
    paths: ConfigurationPathPort;
    sha256: Sha256;
  }>,
  signal: AbortSignal,
  use: (configuration: ResolvedConfiguration) => Promise<T>,
): Promise<T>;
```

Resolution order is: verify project trust and exact plugin grant; read and verify configuration document/ref/scope/plugin/descriptor digest/revision; revalidate non-secret values and path existence/kind; fetch required/optional secrets; construct the private facade; invoke callback; dispose in `finally`. Placeholder expansion recognizes only exact `${user_config.KEY}` tokens; unknown or missing required references fail rather than remain partially expanded. Environment names derive from already-valid descriptor keys. Optional absent values produce neither substitution value nor environment entry.

The resolver does not cache secrets, persist expanded data, return the facade itself, render prompts, or activate a component. A runtime adapter is a trusted plaintext consumer and can necessarily materialize command/environment strings inside the callback; its port contract forbids retaining or returning the facade or resolved maps, and conformance tests enforce that boundary. Hook and MCP runtime adapters later call this boundary at each process start/connection so credential-store changes and deletions are observed.

**Acceptance criteria**:
- [ ] Resolution is impossible without current project trust (project scope) and an exact granted trust subject.
- [ ] Forged/stale/wrong-scope config documents and descriptor drift fail before any secret is returned to a runtime callback.
- [ ] Required missing secrets produce `CONFIG_SECRET_MISSING`; optional missing secrets are omitted; adapter errors remain adapter errors.
- [ ] Path constraints are rechecked immediately before use, and changed/missing paths fail closed.
- [ ] Substitution/environment behavior covers all descriptor kinds without coercing booleans/numbers/arrays inconsistently; serialization is deterministic and documented by tests.
- [ ] The facade is disposed on callback success, throw, and abort; no result, error, diagnostic, snapshot, or fake logger contains plaintext.

### Unit 5: Public contracts, boundary hardening, and adversarial leak tests

**Story**: `epic-transactional-plugin-lifecycle-trust-config-secrets-contract-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy`, `epic-transactional-plugin-lifecycle-trust-config-secrets-runtime-resolution`

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/trust-config-secrets.test.ts`
- `test/fixtures/configuration/`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if implementation changes their current assertions

The package exports schema-derived trust/configuration evidence, pure constructors/diff policy, safe result contracts, resolver/service entry points, and application ports. It does not export internal validated submissions, plaintext accessors, secret backend details, path/credential implementations, prompt/UI contracts, automatic-update policy, runtime activation, or cleanup journals.

Dependency rules enforce:

- `src/domain/executable-surface.ts`, `trust-policy.ts`, and `configured-values.ts` import only domain modules/Zod and no Node/application/adapter modules;
- application trust/configuration services import only domain and application ports, never formats/infrastructure/runtime/Pi/composition or Node built-ins;
- secret/path/project-trust/config-store ports expose no backend technology;
- infrastructure adapters may implement ports but cannot be imported inward;
- only composition may select an OS credential backend.

Committed adversarial fixtures include canary secrets in every supported value shape, malicious keys/prototypes, Unicode/control characters, regex/bounds failures, path changes, forged locators/revisions/subjects, source and executable-surface drift, stale CAS, missing credentials, aborts, adapter errors containing credential-like causes, and cleanup failures. Source/package scans assert canaries never enter state documents, generated projections, JSON results, errors, diagnostics, reports, logs, snapshots, or compiled declarations.

**Acceptance criteria**:
- [ ] Source and compiled ESM allowlists expose exact safe contracts and no plaintext accessor/backend/prompt/update/activation surface.
- [ ] Dependency-cruiser and generated violation fixtures prove domain/application/port boundaries.
- [ ] Integration tests carry a configuration from validated submission through fake OS secret/config stores to one trust-gated execution callback without secret persistence or leakage.
- [ ] Exact grant/revoke, source/revision/surface changes, project trust, stale config CAS, path drift, required/optional missing secrets, abort, and every cleanup branch have adversarial coverage.
- [ ] `npm test` passes strict production/test typechecking, boundaries, unit/integration suites, build, and exact package export checks.
- [ ] Foundation documents remain rolling-current and never claim a concrete credential backend or automatic-update policy owned elsewhere.

## Implementation order

1. In parallel:
   - `epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy`
   - `epic-transactional-plugin-lifecycle-trust-config-secrets-value-validation`
2. `epic-transactional-plugin-lifecycle-trust-config-secrets-secret-custody`
3. `epic-transactional-plugin-lifecycle-trust-config-secrets-runtime-resolution`
4. `epic-transactional-plugin-lifecycle-trust-config-secrets-contract-hardening`

Trust and configured-value validation have separate write ownership and test surfaces. Secret custody consumes validation. Runtime resolution converges exact authorization and custody. Contract hardening then verifies public/boundary/leak guarantees across the completed graph.

## Implementation summary

All five child stories are implemented in dependency order and advanced to `stage: review`:

1. `epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy` — canonical executable-surface registry, exact source/revision/materialization trust candidates, grant/revoke/diff policy, and project-trust authorization.
2. `epic-transactional-plugin-lifecycle-trust-config-secrets-value-validation` — schema-derived configured values/documents, canonical paths, descriptor/revision/opaque-locator digests, and write-free validation.
3. `epic-transactional-plugin-lifecycle-trust-config-secrets-secret-custody` — redacted sensitive custody, adapter-neutral stores, fresh-locator CAS replacement, cleanup outcomes, explicit removal confirmation, and port contracts.
4. `epic-transactional-plugin-lifecycle-trust-config-secrets-runtime-resolution` — exact trust/document/path verification and callback-scoped runtime resolution with required/optional missing-secret semantics.
5. `epic-transactional-plugin-lifecycle-trust-config-secrets-contract-hardening` — public/compiled API allowlists, dependency rules, adversarial fixtures, leak canaries, and end-to-end fake-port integration.

Implementation remained host-local as requested; no agents or worktree isolation were used. The five implementation commits are:

- `f991db7` — trust policy
- `36d3ec4` — value validation
- `eeabef8` — secret custody
- `2e979b1` — runtime resolution
- `eb328af` — contract hardening

Verification is green: full `npm test` completed strict production/test typechecking, dependency-cruiser, 76 Vitest files with 457 passing tests, a clean build, and the compiled ESM 293-export allowlist/import check. `.work/bin/work-view` was preserved and its pre-existing working-tree modification was not staged.

## Review findings

Deep GLM 5.2 and GPT-5.6 Sol review accepted seven required fixes: stale removal could delete an actively referenced credential; resolver callbacks could return plaintext; project scope/root provenance was forgeable; cancellation could orphan new credentials; adapter output was not runtime validated; unknown keys leaked through serialized errors; and untrusted regexes allowed catastrophic backtracking. `epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening` closes all seven and passed independent verification.

## Review-hardening implementation summary

The first two hardening stories close all previously tracked findings. Final adversarial review reproduced one remaining CAS lineage race: a descendant authoritative document can preserve a candidate locator while changing revision, causing revision-only reconciliation to delete an active credential. `epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-3` now reconciles each fresh locator against the validated current authority, cleaning only proven-inactive credentials and retaining safe recovery evidence for unreadable or malformed authority. The feature remains at `stage: implementing` while its broader lifecycle work continues.

## Testing

- **Canonical trust vectors**: permute component/property/provenance order; independently change scope, both canonical sources, binding, skills, hooks, MCP declarations, configuration descriptors, compatibility coverage/status, and persisted subject. Assert deterministic digest or exact denial.
- **Trust policy table**: absent/granted/revoked/duplicate-invalid records; user/project scopes; trusted/untrusted project; same plugin across scope/revision/source; grant/revoke idempotence; no wildcard inheritance.
- **Trust diff safety**: initial/add/remove/change, source identity versus revision change, hook/MCP/config descriptor changes, and canary configured/credential fields rejected by schema/source scan.
- **Value property tests**: all six descriptor kinds, defaults, required/optional, finite numbers, regex, min/max, array bounds, unknown/unsafe keys, unset conflicts, Unicode/lone-surrogate/control cases, and future-registry exhaustiveness.
- **Path seam**: relative/absolute/default values, explicit trusted base, user/project scope, normalization, missing/wrong-kind, symlink/adapter policy delegated without filesystem imports, collection-time and execution-time drift.
- **Configuration document integrity**: wrong scope/plugin/ref/descriptor digest/revision, duplicate keys, sensitivity partition errors, secret locator tampering, insertion-order permutations, stale revisions, and secret-only edits.
- **Failure matrix**: fail each secret put, config read/CAS, fresh-locator cleanup, superseded cleanup, secret get, path recheck, project-trust check, callback, and abort point. Assert old/new authority and exact safe result for every branch.
- **Missing-secret semantics**: required versus optional, missing versus adapter failure, no empty/default fallback, no retained runtime cache, and deletion observed on next execution.
- **Leak canaries**: spies over JSON/string conversion, thrown errors, diagnostics, fake logger, state mutation, trust diff/report, projections, snapshots, process-like environment preparation, and compiled declarations. Plaintext may exist only inside the secret adapter and the resolver callback lifetime.
- **Port contracts**: shared conformance suites for config CAS/missing semantics, secret found/missing/adapter/abort semantics, write-id uniqueness contract, and project-trust exact-key behavior. No suite requires filesystem, Pi, or a concrete credential service.
- **Public/boundary tests**: exact source and compiled exports; no internal validation aggregate or plaintext accessor; generated dependency-cruiser violations for domain/application/port imports.

## Risks

- **Riskiest assumption — OS credential stores can support locator lifecycle reliably across platforms**: native services differ in naming, lock state, headless availability, and delete semantics. Mitigation: the port uses opaque bounded locators and explicit found/missing/failure results, while conformance tests forbid plaintext fallback. Fallback: composition reports the capability unavailable and the plugin remains unconfigured/inactive; it must not downgrade storage.
- **Cross-store atomicity is not physically available**: configuration and OS credentials cannot share one transaction. Mitigation: immutable fresh locators, config CAS, and ordered cleanup ensure failures expose either the complete old view or complete new view; only unreachable secrets can remain. Fallback: return cleanup-required evidence for lifecycle recovery without placing secret values in a journal.
- **Executable canonicalization can omit a future execution-defining field**: that would let behavior change without changing trust. Mitigation: one registry owns schemas, digest projection, diff, and exhaustiveness tests; compatibility/component additions break compile/tests. Fallback: introduce `executable-surface-v2` and require fresh exact grants rather than reinterpret v1.
- **Configuration descriptors can drift across revisions while a logical ref survives**: stale values could be applied under new constraints. Mitigation: every document binds the descriptor digest and every save/resolve verifies it. Fallback: treat drift as unconfigured and collect/migrate values explicitly; never coerce silently.
- **Path normalization is platform-specific and time-varying**: collection success does not prove later existence or kind. Mitigation: adapter-owned canonicalization plus execution-time recheck. Fallback: typed runtime denial; never resolve against ambient cwd.
- **Sensitive wrappers cannot erase every JavaScript string copy**: input and final environment/substitution necessarily materialize plaintext. Mitigation: narrow callback lifetime, native-private storage, redacted coercion, no caches/results, and canary tests at all observable boundaries. Fallback: runtime adapters consume direct callback methods and avoid intermediate maps where possible.
- **Static plugin-authored MCP/header declarations may themselves look credential-like**: they are executable source declarations, not collected secrets, and trust presentation may need them. Mitigation: digest exact normalized declarations while safe diff summaries expose field identity/change rather than arbitrary values; serialized diagnostics never include declarations. Later UI may render explicit redaction/reveal controls without changing policy.
- **Least certainty — cleanup retry ownership**: this feature can safely identify unreachable locators but the recovery journal is owned later. Mitigation: return typed locator-only cleanup evidence. `operations`/`recovery-journal-gc` must decide retry durability; this feature must not create a second journal.

## Pre-mortem

The design fails if a repository or component change inherits an old grant, project trust is bypassed, a stale configuration writer wins, config points to a secret that was never stored, a missing credential becomes an empty value, relative paths change meaning by process cwd, or plaintext reaches any durable/diagnostic boundary. Exact verified subjects, a single executable registry, project-trust port, config CAS, fresh-locator write-before-CAS sequencing, required/optional missing semantics, explicit path normalization/recheck, and callback-scoped redacted values directly counter those failures.

The fallback for an unavailable credential service is non-activation, not plaintext storage. The fallback for canonicalization uncertainty is a versioned surface and new consent, not preserving an old digest. The fallback for cleanup failure is locator-only recovery evidence, not a secret-bearing journal.
