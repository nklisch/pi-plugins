---
id: epic-native-plugin-management-inspection-diagnostics
kind: feature
stage: review
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Plugin Inspection and Actionable Diagnostics

## Brief

Provide one read-only management view for installed plugins and marketplace candidates. It combines exact source and revision identity, normalized component inventory, compatibility requirements, trust/configuration readiness, lifecycle state, update availability, runtime contribution health, and recovery status into deterministic, redacted inspection and diagnostic results.

The capability explains why an operation is available, blocked, stale, degraded, failed, or recovery-required and identifies the next safe action. It does not remediate, mutate authoritative state, expand secrets, contact remote MCP servers during startup, or render the Pi UI.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Consumes marketplace candidates from `epic-native-plugin-management-marketplace-discovery-adoption` and installed state/runtime evidence from packaged composition.
- Owns the management read model, stable diagnostic categories, safe detail expansion, operation eligibility facts, and cross-service aggregation.
- Reuses the completed plugin/marketplace inspection, compatibility, update-candidate, lifecycle observation, transition, and recovery contracts rather than creating another evaluator.

## Capability boundaries

- Candidate inspection and installed inspection share identity/provenance vocabulary while retaining their different authorities.
- Compatibility verdicts and runtime requirements come only from the existing compatibility evaluator and the host's already-captured capability snapshot; presentation never turns an unavailable requirement into a warning-only path.
- Diagnostics distinguish acquisition, normalization, compatibility, trust/configuration, transition/recovery, local runtime registration, and live runtime health without exposing secret values, executable expansions, absolute custody paths, or native causes.
- Exact skill source roots, unexpanded hook commands, and redacted MCP process/endpoint declarations are available one disclosure level below a concise risk/health summary, matching the signed-off trust posture.
- Results sort deterministically and are suitable for both machine-readable callers and the interactive split inspector.
- The implementation composes a read model over authoritative state and replaceable observations; it adds no persisted status table, policy evaluator, runtime probe, remote health request, or repair path.

## Mockups

- Inherits the selected split inspector: `.mockups/screens/epic-native-plugin-management-manager/option-1.html`.
- This feature supplies list/detail/diagnostic contracts and schema-valid split-inspector fixture data only. It adds no HTML, TUI component, command grammar, keybinding, or rendering logic.

## Grounding and design decisions

- **Discovery posture**: Direct-read only, as required. Grounding covered project/global rules; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; the parent epic and selected split-inspector mockup; normalized marketplace/plugin/compatibility/diagnostic contracts; lifecycle state, transition, recovery, and update evidence; runtime projection/selection/capability/activation evidence; skill/hook contribution evidence; MCP projection, launch, registration, status, and lifecycle evidence; trust/configuration contracts; packaged-host startup/application APIs; and the completed marketplace registration/catalog/adoption APIs. No question, nested agent, peer mechanism, source edit, or UI implementation was used.
- **Manual DAG check**: `.work/bin/work-view --blocking <story-id>` was run for all eight proposed child IDs before dependencies were added. The graph is acyclic by construction: contracts are the root; display safety and snapshot evidence follow contracts; candidate and installed projections are sibling consumers; diagnostics consumes their common contract; packaged composition follows all projections; integrated acceptance is the only leaf.
- **Read-only meaning**: Public methods never commit lifecycle/configuration/trust/marketplace state, promote content, settle recovery, reload Pi, start a scheduler, or invoke a mutation service. An explicit candidate-detail read may use the existing private staging/materializer and bundle inspector in a callback-scoped scratch lease because external candidates do not otherwise have an exact revision or complete inventory. Scratch is always discarded and never becomes selected cache or installed authority. Listing, host diagnostics, installed inspection, and startup remain local/offline and allocate no candidate staging.
- **No runtime probing**: Inspection consumes one immutable capability snapshot captured by packaged composition and current local observation/status APIs. It never calls `RuntimeCapabilityProbe.snapshot`, `McpRuntimePort.capabilities`, a subagent probe, remote MCP connect/auth/tool discovery, or hook/skill execution. Candidate compatibility is evaluated by the existing pure `evaluateCompatibility` policy against that captured snapshot, then validated by `CompatibilityReportSchema`; no compatibility rule is copied here.
- **One application surface**: `NativeInspectionService` owns `list`, `detail`, and `diagnose`. Those methods share the same snapshot binding, subject IDs, safe field vocabulary, diagnostic registry, sorting, and pagination. Later facade/TUI work adapts this service rather than joining state/runtime services itself.
- **Authority hierarchy**: Installed identity/revision/activation comes from authoritative state and immutable installed descriptors. Candidate identity/source comes from the exact marketplace candidate and selected snapshot. Compatibility comes from a report over a complete normalized plugin. Trust comes from exact `TrustCandidate`/trust-state evaluation. Configuration readiness comes from descriptors plus a verified configuration-document presence projection. Local activation comes from exact projection/contribution observations. MCP connection status is live health only. Update status comes from existing candidate/notification/refresh records. No lower authority overrides a higher one.
- **Scope collision policy**: Every subject key includes `ScopeReference`; candidate subjects additionally include registration ID, candidate ID, and marketplace snapshot token; installed subjects additionally include selected immutable revision. The same `plugin@marketplace` in user and project scope therefore has separate detail IDs, diagnostics, cursors, trust, configuration, runtime, and update evidence. No project-over-user precedence or display-order selection exists.
- **Stable opaque IDs**: Detail IDs and cursors are canonical JSON payloads encoded base64url with a SHA-256 checksum. They are stateless, versioned, bounded, and snapshot-bound. A detail ID carries only safe identifiers—not source URLs, paths, commands, or descriptions. A malformed checksum returns `invalid-id`; a changed snapshot, state generation, selected revision, catalog token, capability digest, runtime epoch, or project-trust epoch returns `stale`, never fallback lookup.
- **Snapshot binding**: One `InspectionEvidenceSnapshot` captures user/current-project generations or corruption observations, project trust/key, registration/snapshot tokens and refresh memory, startup recovery result, capability digest/capture identity, runtime selection epoch, skill/hook observations, MCP local statuses, and update memory. The evidence port validates the binding again before a page/detail is returned. Candidate acquisition is bracketed by this validation. Mid-read changes produce a stale result; mixed generations are never rendered as current.
- **Freshness is not health**: `freshness` is `current | stale | unknown | unavailable | not-applicable` and names its evidence basis. `condition` is independently `ready | degraded | blocked | unavailable`. A stale verified catalog may still provide an inspectable candidate; it is degraded, not incompatible. Missing evidence is unavailable, not failed. A known unmet compatibility/trust/config/recovery precondition is blocked. A currently usable plugin with stale update data or a failed remote MCP connection is degraded.
- **Activation versus remote health**: Exact local MCP source registration contributes to activation evidence. Per-server `idle`, `connecting`, `connected`, `needs-auth`, or `failed` is live health after activation. `needs-auth`/`failed` may degrade an otherwise exactly active plugin but never retroactively changes the compatibility report or local activation proof. Registration identity/digest/inventory mismatch is blocked/recovery-required, not a remote-health warning.
- **Partially active plugins**: The surface never reports “partially active” as success. If authoritative enabled intent lacks complete matching skill/hook and MCP observations, the subject is blocked with exact missing/mismatched participant diagnostics. A pending transition or recovery-required journal status takes precedence over runtime health and hides no evidence, but stale prior runtime status is labeled non-authoritative.
- **Project trust changes**: Project state is included only for the exact current project. Untrusted project plugins are blocked and their executable runtime observations cannot prove current activity. A trust change during capture invalidates the entire snapshot. A user plugin may still be inspected while the current project is untrusted; only project-scoped activation and project-dependent launch readiness are affected.
- **Compatibility/component requirements**: Installed detail reconstructs the normalized bundle from the immutable descriptor and evaluates current compatibility against the captured capability snapshot while retaining the stored report fingerprint. Candidate detail resolves the exact candidate/snapshot, inspects a complete transient bundle, and evaluates it against that same snapshot. Failure to acquire/inspect produces an unavailable detail result with catalog facts; it never fabricates components or falls back to the latest entry.
- **Trust/configuration readiness**: Trust detail exposes only `authorized | required | revoked | invalid-evidence | project-untrusted | unavailable`, subject/source/revision digests, and safe surface summaries. Configuration exposes descriptor key, label, kind, required/sensitive/default-present, and state `configured | defaulted | missing | unavailable | invalid`; it never exposes configured values, secret locators, path values, defaults, patterns, or native credential-provider details. Sensitive required input is additionally blocked when host secret custody is unavailable.
- **Exact detail disclosure**: Skill detail shows escaped logical name and plugin-relative source root, never resolved content/custody roots. Hook detail shows event, matcher, handler kind, unexpanded command/argv, shell, and timeout as separately escaped fields; it never joins argv into a shell command or substitutes configuration/environment/plugin paths. MCP detail shows component/server IDs, escaped native key, transport, unexpanded command/argv or a redacted URL projection, environment/header names, authentication kind, timeout/policy facts, and provenance. URL userinfo is forbidden upstream; query values, fragments, header values, bearer values, configured substitutions, and expanded launch context are never serialized.
- **Terminal-safe text**: All plugin-authored/human text crosses `toSafeDisplayField` before entering a public view. It preserves identity bytes separately, but escapes C0/C1/DEL, ESC/CSI, CR/LF/TAB, bidi marks/embeddings/overrides/isolates, BOM, line/paragraph separators, and lone surrogate input using visible `\\u{HEX}` notation. It bounds output by Unicode scalar count before serialization and reports `escaped`/`truncated`. No renderer is trusted to sanitize a second time. This consumes `.work/backlog/idea-escape-mcp-status-native-keys`; implementation archives that parked item after the regression is verified.
- **Redaction**: Existing domain `Diagnostic.message/details`, native errors, MCP status native values, and adapter messages are untrusted inputs and are never passed through wholesale. The compiler selects stable codes, registry-owned summaries, whitelisted identifiers/counts/states, and escaped source-relative provenance. Native `cause`, stdout/stderr, database/path/provider messages, environment/configured values, secret locators, absolute content/data/generated/configuration paths, session files, project canonical roots, and remote response bodies are structurally unrepresentable in public schemas.
- **Diagnostic ordering and deduplication**: One `NativeDiagnosticRegistry` owns category, severity, blocking semantics, rank, summary, and action code. Diagnostics sort by registry rank, severity, subject sort tuple, component ID, code, and canonical safe facts. Deduplication uses `{code, subjectId, componentId?, provenance?, canonicalSafeFacts}`; messages do not define identity. Higher-level summaries never erase distinct component/provenance facts. Unknown upstream codes become one `EVIDENCE_UNAVAILABLE` diagnostic with the owning subsystem name, not echoed text.
- **Actionability without grammar**: Diagnostics carry semantic actions such as `retry-read`, `refresh-marketplace`, `review-trust`, `provide-configuration`, `trust-project`, `run-recovery`, `reload-runtime`, `review-update`, or `inspect-source`. They contain no slash command, shell command, flag spelling, or terminal instruction. The later deterministic facade maps action codes to command requests; the TUI maps them to controls.
- **Missing/corrupt state**: Missing first-use state remains the packaged host's clean generation-zero state and yields an empty ready page. Corrupt pointers/documents/records become scope/record diagnostics; valid sibling scopes/records remain visible where existing state isolation permits. Packaged startup retains a blocked read-only application container after classifiable state/recovery/runtime reconstruction failures so inspection can explain them; only failure to open the host root/composition remains terminal.
- **Offline behavior**: List, installed detail, host diagnostics, adoption preview, stale selected-catalog detail, and local runtime status require no network. External candidate detail may return `source-unavailable` offline; marketplace-relative candidates remain inspectable from the selected immutable marketplace snapshot. No read initiates marketplace refresh, update check, remote MCP connection, OAuth, or scheduler work.
- **Adoption diagnostics**: Host diagnosis may request `includeAdoption: true`; it calls the existing read-only adoption preview over fixed foreign documents. Clean missing foreign hosts produce informational `missing` evidence and no warning. Unreadable/changed documents use stable safe codes and logical home-relative paths only. Inspection never imports a candidate or rereads foreign caches/trust/installations.
- **Packaged API cleanup**: Replace the started container's low-level `inspection: PluginInspectionService` exposure with `inspection: NativeInspectionService`; keep the bundle inspector private to composition and candidate/lifecycle internals. The root library may still export its reusable schema/service factory, but packaged management callers receive only the native read surface. This removes the ambiguous two-inspector application API rather than adding `nativeInspection` beside it.
- **Mock data**: `test/fixtures/native-inspection/split-inspector.ts` supplies schema-validated pages/details for active-with-update, disabled, marketplace candidate, incompatible requirement, recovery-required, project-untrusted, MCP registered-but-remote-failed, stale/offline catalog, and hostile native-key/command/path/URL cases. It mirrors the selected list/detail hierarchy but contains no UI markup or rendering assertions.
- **Foundation timing**: Code-first. Foundation documents already assert read-only inspection, typed diagnostics, exact runtime evidence, redaction, offline startup, and thin presentation. Implementation updates an assertion only if final public names or guarantees make it false; omission alone is not drift.

## Architectural choice

### Option A — presentation adapters join domain services directly

The future subcommand and TUI layers could read marketplace pages, state, recovery, compatibility, and runtime services independently and render a combined view. This minimizes a new application module, but duplicates policy and precedence in every presentation, permits mixed-generation views, and makes redaction and terminal safety caller-dependent. Rejected.

### Option B — persist a denormalized management/status database

A status database could provide fast pages and historical diagnostics. It would become a competing authority for active revision, runtime health, catalog freshness, and recovery; would require reconciliation and migrations; and would store sensitive or stale projections. Rejected.

### Option C — snapshot-bound application projector over existing reports and local observations (chosen)

A strict schema-first service captures an immutable evidence snapshot, projects candidate and installed subjects through common safe view schemas, compiles diagnostics from one registry, and revalidates the binding before return. Candidate detail alone may obtain a callback-scoped transient bundle; all compatibility policy and runtime health facts remain owned upstream. Stateless IDs/cursors bind callers to exact evidence without persisted read-model state.

**Choice**: Option C. It creates one read boundary without a second policy, probe, cache authority, or presentation implementation.

## Trickiest unit first

The hardest unit is a coherent installed-plugin result across state, recovery, current project trust, current capability support, replaceable projection caches, exact skill/hook contribution evidence, MCP local registration, remote server health, and update memory. Those authorities can change independently while inspection runs, and “latest of each” would produce a view that never existed.

The design therefore captures an `InspectionSnapshotBinding` with state generations, project-trust evidence, catalog tokens, capability digest, runtime epoch, and recovery/update observation digests. Installed projection uses only evidence in that snapshot. Before return, `validate(binding)` proves the same authorities are current. If validation fails, the method returns `stale` with `retry-read`; it does not retry invisibly, combine epochs, or downgrade a mismatch to degraded. The fallback for a subsystem that cannot expose an epoch is an explicit `unavailable` evidence observation, not an unbound live read.

## Exact public application contract

### Unit 1: Stable schemas, IDs, cursors, and service boundary

**Story**: `epic-native-plugin-management-inspection-diagnostics-contracts-identifiers`

**Files**:
- `src/application/native-inspection-contract.ts`
- `src/application/native-inspection-identifiers.ts`
- `src/index.ts`
- `test/application/native-inspection-contract.test.ts`
- `test/application/native-inspection-identifiers.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

All serializable public types are inferred from strict readonly Zod schemas. Registries own variant sets; no hand-copied unions exist.

```typescript
export const NativeInspectionSubjectKindSchema = z.enum([
  "installed",
  "marketplace-candidate",
]);
export const NativeInspectionConditionSchema = z.enum([
  "ready",
  "degraded",
  "blocked",
  "unavailable",
]);
export const NativeInspectionFreshnessSchema = z.enum([
  "current",
  "stale",
  "unknown",
  "unavailable",
  "not-applicable",
]);

export const InspectionSnapshotIdSchema = z.string()
  .regex(/^inspection-snapshot-v1:sha256:[0-9a-f]{64}$/)
  .brand<"InspectionSnapshotId">();
export const InspectionDetailIdSchema = z.string()
  .regex(/^inspection-detail-v1:[A-Za-z0-9_-]+\.[0-9a-f]{64}$/)
  .max(4096)
  .brand<"InspectionDetailId">();
export const InspectionCursorSchema = z.string()
  .regex(/^inspection-cursor-v1:[A-Za-z0-9_-]+\.[0-9a-f]{64}$/)
  .max(4096)
  .brand<"InspectionCursor">();

export const SafeDisplayFieldSchema = z.object({
  text: z.string().max(8192),
  escaped: z.boolean(),
  truncated: z.boolean(),
}).strict().readonly();

export const NativeInspectionListRequestSchema = z.object({
  subjects: z.array(NativeInspectionSubjectKindSchema).nonempty()
    .default(["installed", "marketplace-candidate"]),
  scope: MarketplaceScopeSelectionSchema.default("all-current"),
  query: z.string().max(256).default(""),
  conditions: z.array(NativeInspectionConditionSchema).readonly().optional(),
  cursor: InspectionCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
}).strict().readonly();

export const NativeInspectionSummarySchema = z.object({
  detailId: InspectionDetailIdSchema,
  subject: NativeInspectionSubjectKindSchema,
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  name: SafeDisplayFieldSchema,
  marketplace: SafeDisplayFieldSchema,
  revision: z.object({
    installed: SafeDisplayFieldSchema.optional(),
    available: SafeDisplayFieldSchema.optional(),
    immutable: ContentDigestSchema.optional(),
    resolution: z.enum(["exact", "declared-selector", "unresolved"]),
  }).strict().readonly(),
  condition: NativeInspectionConditionSchema,
  freshness: z.object({
    status: NativeInspectionFreshnessSchema,
    basis: z.enum(["state", "marketplace", "runtime", "update", "none"]),
  }).strict().readonly(),
  diagnosticCounts: z.object({
    error: z.number().int().nonnegative(),
    warning: z.number().int().nonnegative(),
    info: z.number().int().nonnegative(),
  }).strict().readonly(),
}).strict().readonly();

export const NativeScopeObservationSchema = z.object({
  scope: ScopeReferenceSchema,
  status: z.enum(["ready", "corrupt", "unavailable"]),
  generation: GenerationSchema.optional(),
  corruptionCodes: z.array(SafeDisplayFieldSchema).readonly(),
}).strict().readonly();

export const NativeInspectionPageSchema = z.object({
  snapshotId: InspectionSnapshotIdSchema,
  items: z.array(NativeInspectionSummarySchema).readonly(),
  observations: z.array(NativeScopeObservationSchema).readonly(),
  nextCursor: InspectionCursorSchema.optional(),
}).strict().readonly();

export const NativeInspectionDetailRequestSchema = z.object({
  snapshotId: InspectionSnapshotIdSchema,
  detailId: InspectionDetailIdSchema,
}).strict().readonly();

export const NativeTrustReadinessSchema = z.enum([
  "authorized", "required", "revoked", "invalid-evidence",
  "project-untrusted", "unavailable", "not-applicable",
]);
export const NativeConfigurationOptionViewSchema = z.object({
  key: ConfigurationKeySchema,
  label: SafeDisplayFieldSchema,
  valueKind: z.enum(["string", "number", "boolean", "directory", "file", "strings"]),
  required: z.boolean(),
  sensitive: z.boolean(),
  defaultPresent: z.boolean(),
  state: z.enum(["configured", "defaulted", "missing", "unavailable", "invalid"]),
}).strict().readonly();
export const NativeCompatibilityViewSchema = z.object({
  status: z.enum(["activatable", "incompatible", "unavailable"]),
  reportFingerprint: ContentDigestSchema.optional(),
  components: NativeComponentInventoryViewSchema,
  requirements: z.array(z.object({
    id: RuntimeRequirementIdSchema,
    capability: SafeDisplayFieldSchema,
    status: z.enum(["available", "unavailable"]),
    explanation: SafeDisplayFieldSchema,
    provenance: z.array(NativeProvenanceViewSchema).readonly(),
  }).strict().readonly()).readonly(),
}).strict().readonly();
export const NativeLifecycleViewSchema = z.object({
  installed: z.boolean(),
  activationIntent: z.enum(["enabled", "disabled"]).optional(),
  transition: z.enum(["none", "pending", "recovery-required", "deferred", "blocked"]),
  update: z.enum([
    "current", "available", "manual-required", "approval-required",
    "automatic-applied", "automatic-retryable", "recovery-required",
    "failed", "unknown", "not-applicable",
  ]),
}).strict().readonly();
export const NativeInspectionDetailSchema = z.object({
  snapshotId: InspectionSnapshotIdSchema,
  summary: NativeInspectionSummarySchema,
  source: NativeSourceViewSchema,
  provenance: z.array(NativeProvenanceViewSchema).readonly(),
  compatibility: NativeCompatibilityViewSchema,
  trust: NativeTrustReadinessSchema,
  configuration: z.array(NativeConfigurationOptionViewSchema).readonly(),
  lifecycle: NativeLifecycleViewSchema,
  activation: NativeActivationViewSchema.optional(),
  mcpHealth: NativeMcpHealthViewSchema.optional(),
  diagnostics: z.array(NativeDiagnosticSchema).readonly(),
}).strict().readonly();

export const NativeInspectionDetailResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("found"), detail: NativeInspectionDetailSchema }).strict().readonly(),
  z.object({ kind: z.literal("stale"), action: z.literal("retry-read") }).strict().readonly(),
  z.object({ kind: z.literal("invalid-id") }).strict().readonly(),
  z.object({ kind: z.literal("missing") }).strict().readonly(),
  z.object({
    kind: z.literal("unavailable"),
    summary: NativeInspectionSummarySchema.optional(),
    diagnostics: z.array(NativeDiagnosticSchema).nonempty().readonly(),
  }).strict().readonly(),
]);

export const NativeDiagnosisRequestSchema = z.object({
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("host") }).strict().readonly(),
    z.object({ kind: z.literal("detail"), snapshotId: InspectionSnapshotIdSchema,
      detailId: InspectionDetailIdSchema }).strict().readonly(),
  ]).default({ kind: "host" }),
  includeAdoption: z.boolean().default(false),
}).strict().readonly();
export const NativeDiagnosticReportSchema = z.object({
  snapshotId: InspectionSnapshotIdSchema,
  condition: NativeInspectionConditionSchema,
  observations: z.array(NativeScopeObservationSchema).readonly(),
  diagnostics: z.array(NativeDiagnosticSchema).readonly(),
}).strict().readonly();

export interface NativeInspectionService {
  list(request: NativeInspectionListRequest, signal: AbortSignal): Promise<NativeInspectionPage>;
  detail(request: NativeInspectionDetailRequest, signal: AbortSignal): Promise<NativeInspectionDetailResult>;
  diagnose(request: NativeDiagnosisRequest, signal: AbortSignal): Promise<NativeDiagnosticReport>;
}
```

`deriveInspectionDetailId`, `deriveInspectionSnapshotId`, `encodeInspectionCursor`, and their verify/decode counterparts accept an injected SHA-256 function. The detail payload is exactly `{version, subject, scope, plugin, selectedRevision? | registrationId/candidateId/catalogSnapshot}`. Cursor payload adds canonical filter hash, snapshot ID, and last sort tuple. No ID contains a description, source, path, command, endpoint, diagnostic, project root, or secret-adjacent field.

**Acceptance criteria**:
- [ ] Schemas reject unknown fields, impossible variant combinations, oversized IDs/cursors, and hand-forged checksums.
- [ ] IDs differ across scope, subject kind, selected revision, registration, candidate, and catalog snapshot; canonical input permutations produce identical IDs.
- [ ] Cursor replay against another filter/snapshot or changed evidence returns stale/invalid instead of skipping/duplicating rows.
- [ ] Public types are schema-inferred and compiled exports contain only intended contracts/factories.

### Unit 2: Terminal-safe display and redacted disclosure projection

**Story**: `epic-native-plugin-management-inspection-diagnostics-safe-display-redaction`
**Depends on**: `epic-native-plugin-management-inspection-diagnostics-contracts-identifiers`

**Files**:
- `src/application/native-inspection-display.ts`
- `src/application/native-inspection-disclosure.ts`
- `test/application/native-inspection-display.test.ts`
- `test/application/native-inspection-disclosure.test.ts`

```typescript
export const NativeDisplayLimits = Object.freeze({
  labelScalars: 256,
  descriptionScalars: 2_048,
  pathScalars: 1_024,
  commandScalars: 4_096,
  argumentScalars: 2_048,
  maxArguments: 256,
  maxProvenance: 256,
});

export function toSafeDisplayField(
  input: string,
  options: Readonly<{ maxScalars: number }>,
): SafeDisplayField;

export function projectSafeSource(input: MarketplaceSource | PluginSource | ResolvedPluginSource): NativeSourceView;
export function projectSafeProvenance(input: readonly Provenance[]): readonly NativeProvenanceView[];
export function projectSafeComponents(input: Readonly<{
  plugin: NormalizedPlugin;
  compatibility: CompatibilityReport;
}>): NativeComponentInventoryView;
```

`NativeComponentInventoryView` has sorted summary counts and detail rows:

- skill: component ID, escaped name, escaped plugin-relative root, verdict, requirement IDs, safe provenance;
- hook: component ID, event, matcher, handler kind, separately escaped unexpanded command/args, shell and timeout, verdict/requirements/provenance;
- MCP: component/server IDs, escaped native key, transport, separately escaped unexpanded command/args or redacted URL structure, environment/header names only, authentication/capability labels, verdict/requirements/provenance;
- foreign: component ID, native host/kind, incompatible/metadata verdict and provenance; raw declaration omitted.

`NativeRedactedUrlSchema` contains `scheme`, escaped host/port/path, and booleans `queryPresent`/`fragmentPresent`; it cannot contain userinfo, query values, or fragments. Local declared source paths may be disclosed as escaped declared-source detail because they are user-selected identity, but generated content/data/configuration/projection roots and canonical project roots are never accepted by any projection function.

**Acceptance criteria**:
- [ ] ANSI/OSC/CSI sequences, C0/C1/DEL, CRLF/tab, bidi controls, BOM, line separators, isolated surrogates, combining/zero-width edge cases, and overlong strings cannot alter terminal structure or break JSON.
- [ ] Native MCP keys retain exact identity separately while every public display occurrence is escaped, closing `idea-escape-mcp-status-native-keys`.
- [ ] Hook argv remains structured; no shell joining, placeholder/config/environment expansion, or command execution occurs.
- [ ] MCP query/header/bearer/environment values, configured/default values, secret locators, absolute custody paths, project roots, native causes, stderr/stdout, and raw declarations are absent under canary search.

### Unit 3: Coherent read snapshot and existing-evidence adapters

**Story**: `epic-native-plugin-management-inspection-diagnostics-snapshot-evidence`
**Depends on**: `epic-native-plugin-management-inspection-diagnostics-contracts-identifiers`

**Files**:
- `src/application/ports/native-inspection-evidence.ts`
- `src/application/ports/inspection-readiness.ts`
- `src/composition/native-inspection-evidence.ts`
- `src/composition/native-inspection-readiness.ts`
- `src/composition/runtime-selection-catalog.ts`
- `src/composition/create-skill-hook-runtime.ts`
- `src/composition/create-mcp-runtime.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `test/composition/native-inspection-evidence.test.ts`
- `test/composition/runtime-selection-catalog.test.ts`

```typescript
export type InspectionSnapshotBinding = Readonly<{
  capturedAt: EpochMilliseconds;
  scopes: readonly Readonly<{
    scope: ScopeReference;
    generation?: Generation;
    status: "ready" | "corrupt" | "unavailable";
    corruptionCodes: readonly string[];
  }>[];
  currentProject: Readonly<{
    projectKey: ProjectKey;
    trust: ProjectTrustAssessment;
    epoch: ContentDigest;
  }>;
  catalogs: readonly Readonly<{
    registrationId: MarketplaceRegistrationId;
    snapshot?: MarketplaceSnapshotToken;
    cache: MarketplaceCacheStatus;
  }>[];
  capability: Readonly<{
    status: "ready" | "unavailable";
    digest?: ContentDigest;
    capturedBy?: string;
  }>;
  runtimeEpoch: ContentDigest;
  recoveryDigest: ContentDigest;
  updateDigest: ContentDigest;
}>;

export type InspectionEvidenceSnapshot = Readonly<{
  binding: InspectionSnapshotBinding;
  states: readonly StateLoadResult[];
  currentProject: CurrentProjectRuntimeContext;
  capabilities?: RuntimeCapabilitySnapshot;
  runtime: readonly InstalledRuntimeEvidence[];
  recovery: LifecycleRecoveryResult;
  startup: HostStartupResult;
}>;

export interface NativeInspectionEvidencePort {
  capture(signal: AbortSignal): Promise<InspectionEvidenceSnapshot>;
  validate(binding: InspectionSnapshotBinding, signal: AbortSignal): Promise<"current" | "stale">;
}

export interface InspectionReadinessPort {
  trust(
    candidate: TrustCandidate,
    scope: ScopeReference,
    signal: AbortSignal,
  ): Promise<z.infer<typeof NativeTrustReadinessSchema>>;
  configuration(
    request: Readonly<{
      plugin: PluginKey;
      scope: ScopeReference;
      descriptors: PluginConfiguration;
      configurationRef?: PluginConfigurationRef;
    }>,
    signal: AbortSignal,
  ): Promise<readonly z.infer<typeof NativeConfigurationOptionViewSchema>[]>;
  secretCustody(): HostCapabilityStatus;
}
```

The composition adapter uses existing state reads, runtime selection catalog, skill/hook catalog and contribution observations, `McpLifecycleParticipant.status`, startup/recovery evidence, registration/update memory, and current project trust. `RuntimeSelectionCatalog.snapshot()` gains a monotonic content-derived `epoch`; skill/hook and MCP composition expose read-only observation/status accessors only. None of these methods reconcile, reload, launch, probe, or mutate.

Capability evidence is captured once by packaged startup through the existing composed probe and retained as an immutable validated snapshot plus digest. Desired-state compatibility and inspection consume the same capture for that host epoch. A runtime-participant change requires a new host epoch/reload; inspection never refreshes it independently.

**Acceptance criteria**:
- [ ] Snapshot capture produces one immutable binding independent of map/insertion/completion order and contains no paths, runtime handles, native errors, or plaintext launch/config values.
- [ ] Any state/catalog/trust/capability/runtime/recovery/update epoch change makes validation stale.
- [ ] Missing/corrupt one scope or unavailable one participant remains explicit while readable siblings survive.
- [ ] Evidence access performs no capability call, remote MCP work, hook/skill execution, reload, recovery settlement, state write, or marketplace refresh.

### Unit 4: Marketplace-candidate inspection over exact snapshot authority

**Story**: `epic-native-plugin-management-inspection-diagnostics-candidate-inspection`
**Depends on**: `epic-native-plugin-management-inspection-diagnostics-safe-display-redaction`, `epic-native-plugin-management-inspection-diagnostics-snapshot-evidence`

**Files**:
- `src/application/ports/inspection-candidate-content.ts`
- `src/application/native-candidate-inspection.ts`
- `src/composition/inspection-candidate-content.ts`
- `test/application/native-candidate-inspection.test.ts`
- `test/composition/inspection-candidate-content.test.ts`

```typescript
export interface InspectionCandidateContentPort {
  withMaterialized<T>(
    candidate: ResolvedMarketplaceCandidate,
    signal: AbortSignal,
    use: (materialized: MaterializedPlugin) => Promise<T>,
  ): Promise<T>;
}

export type MarketplaceCatalogResolverPort = Pick<MarketplaceCatalogService, "resolve">;

export type CandidateInspectionDependencies = Readonly<{
  catalog: MarketplaceCatalogResolverPort;
  content: InspectionCandidateContentPort;
  inspector: PluginInspectionService;
  evidence: NativeInspectionEvidencePort;
  readiness: InspectionReadinessPort;
  sha256: Sha256;
}>;

export function createNativeCandidateInspector(
  dependencies: CandidateInspectionDependencies,
): Readonly<{
  inspect(subject: CandidateInspectionSubject, snapshot: InspectionEvidenceSnapshot,
    signal: AbortSignal): Promise<NativeInspectionDetailResult>;
}>;
```

The inspector decodes/verifies the detail subject, resolves the exact candidate and snapshot through the existing internal catalog resolver, then uses callback-scoped materialization. Inside the callback it calls the existing bundle inspector and the pure compatibility evaluator with `snapshot.capabilities`. For an activatable report it derives exact trust candidate/change evidence; an incompatible or unavailable report makes trust `not-applicable` rather than calling `createExecutableSurface`. Configuration requirements are projected without saving values. The adapter discards staging on success, failure, and abort. It never promotes, caches as selected, updates the catalog, or returns physical roots.

If capabilities are unavailable, the complete normalized inventory remains inspectable but compatibility/readiness is unavailable rather than guessed. If acquisition or bundle inspection fails, return the catalog summary plus stable safe diagnostics. Before success, validate the original binding; a refreshed catalog, project trust change, or capability/runtime epoch change returns stale.

**Acceptance criteria**:
- [ ] Candidate identity/source/revision/provenance is exact for the supplied registration/candidate/snapshot with no cross-scope/name fallback.
- [ ] Complete compatibility and component requirements come from existing inspector/evaluator contracts; no copied rule or partial component inventory appears.
- [ ] Marketplace-relative candidates work offline from selected immutable content; external offline acquisition is unavailable and non-destructive.
- [ ] Scratch cleanup is guaranteed and no selected cache/state/trust/configuration/runtime mutation occurs.
- [ ] Stale candidate/snapshot, malformed bundle, incompatible component, absent capability snapshot, and abort produce distinct safe outcomes.

### Unit 5: Installed state, readiness, runtime, recovery, and update projection

**Story**: `epic-native-plugin-management-inspection-diagnostics-installed-runtime-inspection`
**Depends on**: `epic-native-plugin-management-inspection-diagnostics-safe-display-redaction`, `epic-native-plugin-management-inspection-diagnostics-snapshot-evidence`

**Files**:
- `src/application/native-installed-inspection.ts`
- `test/application/native-installed-inspection.test.ts`
- `test/composition/native-inspection-readiness.test.ts`

```typescript
export const NativeActivationViewSchema = z.object({
  intent: z.enum(["enabled", "disabled"]),
  state: z.enum([
    "active", "inactive", "pending", "recovery-required",
    "blocked", "unavailable",
  ]),
  selectedRevision: ContentDigestSchema,
  projectionDigest: ContentDigestSchema.optional(),
  participants: z.array(z.object({
    participant: RuntimeContributionParticipantSchema,
    status: z.enum(["matching", "missing", "mismatched", "unavailable"]),
    contributionDigest: ContentDigestSchema.optional(),
  }).strict().readonly()).readonly(),
}).strict().readonly();

export const NativeMcpHealthViewSchema = z.object({
  localRegistration: z.enum(["matching", "absent", "mismatched", "unavailable"]),
  servers: z.array(z.object({
    componentId: ComponentIdSchema,
    serverKey: McpRuntimeServerKeySchemaV1,
    nativeKey: SafeDisplayFieldSchema,
    transport: McpBridgeTransportSchema,
    state: z.enum(["registered", "idle", "connecting", "connected", "needs-auth", "failed"]),
    toolCount: z.number().int().nonnegative().optional(),
    errorCode: ErrorCodeSchema.optional(),
  }).strict().readonly()).readonly(),
}).strict().readonly();

export function createNativeInstalledInspector(dependencies: Readonly<{
  installed: InstalledPluginLoader;
  readiness: InspectionReadinessPort;
  evidence: NativeInspectionEvidencePort;
  sha256: Sha256;
}>): NativeInstalledInspector;
```

`InspectionReadinessPort` exposes only verified presence/status projections for trust records, configuration keys, secret custody, and installed reconstruction. It never returns values, locators, roots, or mutable stores. Installed inspection loads the exact selected immutable descriptor, validates stored compatibility evidence, evaluates current compatibility against the captured capability snapshot, and projects source/components. It then joins transition/recovery, activation observations, skill/hook component IDs, MCP local status, host capability, configuration/trust, and update records from the same snapshot.

Precedence is fixed: state corruption → pending/recovery → project trust → compatibility/capability → trust/configuration → local activation evidence → remote/live health → update/freshness. Disabled intent with exact inactive evidence is ready; an enabled plugin without complete matching participants is blocked. Remote MCP failure is degraded after exact local registration. Prior observations for a pending/untrusted/mismatched subject are retained only as explicitly stale evidence.

**Acceptance criteria**:
- [ ] Enabled/disabled, selected/retained revision, pending transition, recovery result, exact complete activation, and unavailable evidence map to the declared states without partial-success claims.
- [ ] Skill/hook status compares exact sorted component IDs/contribution digest; it does not claim Pi accepted frontmatter beyond existing resource observation.
- [ ] MCP registration identity/digest/inventory mismatch blocks local activation; connected/needs-auth/failed remains separate live health.
- [ ] Trust/configuration status exposes no values/locators/defaults/paths; project trust changes invalidate the snapshot.
- [ ] Current/discovered/approval/manual/automatic/recovery update dispositions and stale/failed checks reuse update records without network work.

### Unit 6: Registry-owned diagnostics, ordering, deduplication, and actions

**Story**: `epic-native-plugin-management-inspection-diagnostics-diagnostic-compiler`
**Depends on**: `epic-native-plugin-management-inspection-diagnostics-safe-display-redaction`, `epic-native-plugin-management-inspection-diagnostics-candidate-inspection`, `epic-native-plugin-management-inspection-diagnostics-installed-runtime-inspection`

**Files**:
- `src/application/native-diagnostic-registry.ts`
- `src/application/native-diagnostic-compiler.ts`
- `test/application/native-diagnostic-registry.test.ts`
- `test/application/native-diagnostic-compiler.test.ts`

```typescript
export const NativeDiagnosticActionSchema = z.enum([
  "retry-read", "refresh-marketplace", "inspect-source", "review-trust",
  "provide-configuration", "trust-project", "run-recovery",
  "reload-runtime", "review-update", "none",
]);

export const NativeDiagnosticRegistry = Object.freeze({
  stateCorrupt: { code: "STATE_CORRUPT", category: "integrity", severity: "error", rank: 100, blocks: true, action: "run-recovery" },
  recoveryRequired: { code: "RECOVERY_REQUIRED", category: "recovery", severity: "error", rank: 200, blocks: true, action: "run-recovery" },
  projectUntrusted: { code: "PROJECT_UNTRUSTED", category: "trust", severity: "error", rank: 300, blocks: true, action: "trust-project" },
  incompatible: { code: "COMPATIBILITY_INCOMPATIBLE", category: "compatibility", severity: "error", rank: 400, blocks: true, action: "inspect-source" },
  requirementUnavailable: { code: "RUNTIME_REQUIREMENT_UNAVAILABLE", category: "capability", severity: "error", rank: 410, blocks: true, action: "reload-runtime" },
  trustRequired: { code: "TRUST_REQUIRED", category: "trust", severity: "error", rank: 500, blocks: true, action: "review-trust" },
  configurationRequired: { code: "CONFIGURATION_REQUIRED", category: "configuration", severity: "error", rank: 510, blocks: true, action: "provide-configuration" },
  activationMismatch: { code: "ACTIVATION_EVIDENCE_MISMATCH", category: "activation", severity: "error", rank: 600, blocks: true, action: "reload-runtime" },
  mcpRemoteFailed: { code: "MCP_REMOTE_HEALTH_FAILED", category: "live-health", severity: "warning", rank: 700, blocks: false, action: "retry-read" },
  updateAvailable: { code: "UPDATE_AVAILABLE", category: "update", severity: "info", rank: 800, blocks: false, action: "review-update" },
  catalogStale: { code: "CATALOG_STALE", category: "freshness", severity: "warning", rank: 900, blocks: false, action: "refresh-marketplace" },
  evidenceUnavailable: { code: "EVIDENCE_UNAVAILABLE", category: "evidence", severity: "warning", rank: 1000, blocks: false, action: "retry-read" },
  // The implemented registry includes all named matrix cases; this excerpt fixes ordering semantics.
} as const);

export const NativeDiagnosticSchema = z.object({
  id: z.string().regex(/^native-diagnostic-v1:sha256:[0-9a-f]{64}$/),
  code: NativeDiagnosticCodeSchema,
  category: NativeDiagnosticCategorySchema,
  severity: z.enum(["error", "warning", "info"]),
  subjectId: InspectionDetailIdSchema.optional(),
  componentId: ComponentIdSchema.optional(),
  summary: SafeDisplayFieldSchema,
  facts: z.array(NativeDiagnosticFactSchema).readonly(),
  provenance: z.array(NativeProvenanceViewSchema).readonly(),
  action: NativeDiagnosticActionSchema,
}).strict().readonly();

export function compileNativeDiagnostics(input: NativeDiagnosticInput, sha256: Sha256): readonly NativeDiagnostic[];
```

The complete registry covers state/record corruption; stale/missing catalog/candidate; adoption unreadable/changed; pending/deferred/blocked recovery; incompatible components; unavailable requirements/capability capture; project/plugin trust; required/invalid configuration and secret custody; projection/cache/revision reconstruction; skill/hook/MCP registration mismatches; MCP runtime unavailable and per-server auth/failure; update available/approval/manual/recovery/failed/stale; and generic unavailable evidence. Registry-owned summaries never interpolate raw upstream messages.

**Acceptance criteria**:
- [ ] Every diagnostic code has one category/severity/rank/blocking/action definition and schema/table coverage.
- [ ] Permuting upstream evidence produces byte-identical ordered/deduplicated diagnostics and stable diagnostic IDs.
- [ ] Distinct component/provenance facts survive; duplicate upstream report/runtime copies collapse exactly once.
- [ ] Unknown/native errors map to safe subsystem-level unavailable evidence with no message/cause/detail leakage.
- [ ] Condition derivation is registry-driven: any current blocking diagnostic yields blocked; nonblocking health/freshness warnings yield degraded; absent required evidence yields unavailable; otherwise ready.

### Unit 7: Unified service, packaged composition, and degraded startup exposure

**Story**: `epic-native-plugin-management-inspection-diagnostics-packaged-service-composition`
**Depends on**: `epic-native-plugin-management-inspection-diagnostics-candidate-inspection`, `epic-native-plugin-management-inspection-diagnostics-installed-runtime-inspection`, `epic-native-plugin-management-inspection-diagnostics-diagnostic-compiler`

**Files**:
- `src/application/native-inspection-service.ts`
- `src/composition/create-native-inspection-service.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/composition/create-marketplace-discovery-services.ts`
- `src/index.ts`
- `src/pi/index.ts`
- `test/application/native-inspection-service.test.ts`
- `test/composition/create-native-inspection-service.test.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/tooling/boundaries.test.ts`

```typescript
export function createNativeInspectionService(dependencies: Readonly<{
  evidence: NativeInspectionEvidencePort;
  installed: NativeInstalledInspector;
  candidates: NativeCandidateInspector;
  catalog: Pick<MarketplaceCatalogService, "search" | "detail">;
  adoption: Pick<AdoptionService, "preview">;
  clock: LifecycleClock;
  sha256: Sha256;
}>): NativeInspectionService;

export type PackagedPluginHostApplication = Readonly<{
  lifecycle: PluginLifecycleService;
  compatibility: CompatibilityService;
  configuration: BoundPluginConfigurationService;
  recovery: LifecycleRecoveryService;
  collection: ReturnType<typeof createRevisionCollectionService>;
  marketplace: MarketplaceDiscoveryServices;
  inspection: NativeInspectionService;
  capabilities: RuntimeCapabilityProbe;
  resources: SkillResourceDiscoveryPort;
}>;
```

`list` captures once, projects installed records and catalog summaries, computes diagnostics/condition, sorts by subject kind (`installed`, then candidate), scope (`user`, then project), marketplace, plugin name, revision, and detail ID using unsigned UTF-8 comparison, then applies snapshot-bound cursor pagination. Query normalization reuses marketplace search's NFKC/lowercase/token limits over safe summary fields only; it never indexes commands, endpoints, paths, diagnostics, or raw metadata.

`detail` decodes the ID, verifies the supplied snapshot, routes to exactly one installed/candidate projector, and revalidates. `diagnose(host)` compiles scope/startup/recovery/capability/catalog/update evidence and optionally the existing read-only adoption preview. It never invokes detail acquisition unless the request targets a candidate detail.

Packaged construction keeps the bundle inspector private. After local adapters open, classifiable state/recovery/runtime reconstruction failures produce `HostStartupResult.status: "blocked"` plus an operational inspection service; they do not terminate the extension solely because management evidence is needed to explain the block. Root/path/database-open/composition failures remain terminal because no trustworthy read boundary exists.

**Acceptance criteria**:
- [ ] TUI/subcommand consumers can obtain every required list/detail/diagnostic fact through `application.inspection` alone; they do not need state/runtime/compatibility joins.
- [ ] Pagination/detail is stateless, deterministic, snapshot-bound, and collision-free across user/project/candidate/installed identities.
- [ ] Clean first start returns an empty ready installed page and clean host diagnostics without network/foreign-host requirements.
- [ ] Classifiable corrupt/recovery/runtime blocked startup exposes read-only diagnostics while mutation services continue to enforce their own blocks.
- [ ] Package startup/list/host diagnosis performs no candidate acquisition, marketplace refresh, update check, remote MCP work, scheduler start, hook execution, reload, or mutation.
- [ ] The low-level bundle inspector is absent from `PackagedPluginHostApplication`; raw state/runtime/catalog resolver/materializer/readiness adapters remain private.

### Unit 8: Integrated snapshot, hostile-input, offline, and split-inspector fixture acceptance

**Story**: `epic-native-plugin-management-inspection-diagnostics-integrated-acceptance`
**Depends on**: `epic-native-plugin-management-inspection-diagnostics-packaged-service-composition`

**Files**:
- `test/integration/native-inspection-clean-environment.test.ts`
- `test/integration/native-inspection-snapshot-races.test.ts`
- `test/integration/native-inspection-runtime-health.test.ts`
- `test/integration/native-inspection-security.test.ts`
- `test/fixtures/native-inspection/split-inspector.ts`
- `test/fixtures/native-inspection/hostile-values.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

The schema-valid fixture covers the selected mock's installed list/detail/update card plus marketplace, disabled, incompatible, recovery-required, untrusted-project, offline/stale, MCP live-health, and hostile-string states. It is data only and becomes the later Pi-manager renderer's contract fixture.

**Acceptance criteria**:
- [ ] Packed clean host with no Claude/Codex/MCP/subagent package lists empty/available state and reports optional capabilities honestly without startup network.
- [ ] Installed and candidate user/project collisions remain separate across list, cursor, detail, diagnostics, trust/configuration, update, and runtime evidence.
- [ ] State/catalog/capability/runtime/project-trust changes at every capture/acquisition/return boundary produce stale, never mixed current output.
- [ ] Missing/corrupt state, missing immutable descriptor/cache, unavailable capabilities, pending/recovery-required transition, partially matching participants, and adoption document failure isolate correctly.
- [ ] MCP exact local registration plus remote connected/needs-auth/failed demonstrates activation-health separation without contacting a server.
- [ ] Control/Unicode/bidi/path/URL/command/header/environment/secret/native-cause canaries prove terminal safety and structural redaction in every JSON result.
- [ ] Offline selected marketplace-relative candidate works; external candidate unavailable retains safe catalog facts; no operation mutates authority or leaves scratch.
- [ ] Full `npm test` covers typecheck, dependency boundaries, focused units/integration, build, and exact compiled exports.

## Implementation order and child-story DAG

1. `epic-native-plugin-management-inspection-diagnostics-contracts-identifiers`
2. In parallel after contracts:
   - `epic-native-plugin-management-inspection-diagnostics-safe-display-redaction`
   - `epic-native-plugin-management-inspection-diagnostics-snapshot-evidence`
3. In parallel after both foundations:
   - `epic-native-plugin-management-inspection-diagnostics-candidate-inspection`
   - `epic-native-plugin-management-inspection-diagnostics-installed-runtime-inspection`
4. `epic-native-plugin-management-inspection-diagnostics-diagnostic-compiler`
5. `epic-native-plugin-management-inspection-diagnostics-packaged-service-composition`
6. `epic-native-plugin-management-inspection-diagnostics-integrated-acceptance`

The feature remains one cohesive implementation/review bundle. Stories are durable design and verification checkpoints, not one worker per story.

## Read-model invariants

1. A public result belongs to one verified `InspectionSnapshotBinding`; mixed state generations, project-trust epochs, catalog tokens, capability captures, or runtime epochs are unrepresentable as current.
2. Installed authority is `{scope, plugin, selectedRevision}` from state. Candidate authority is `{scope, registrationId, candidateId, catalogSnapshot}`. Display names and list order never resolve identity.
3. Compatibility is complete-bundle policy output over one normalized plugin and one captured capability snapshot. Inspection adds no verdict, requirement, or activatability rule.
4. Authoritative activation requires complete matching skill/hook and MCP contribution evidence. Remote MCP connection health is never activation authority.
5. Pending/recovery-required state prevents a ready/active claim. Disabled plus exact inactive evidence may be ready.
6. Trust and configuration status use exact revision/scope evidence. Secret values, locators, configured values, and resolved paths never cross the read boundary.
7. Public strings are either constrained stable identifiers/enums or `SafeDisplayField`; raw plugin-authored text is never serialized directly.
8. Native causes, upstream messages/details, command output, remote responses, custody paths, project roots, environment/header/configuration values, and raw declarations are absent by schema, not convention.
9. Diagnostics are registry-owned, deterministic, deduplicated by stable facts, and carry semantic action codes only.
10. List/installed/host reads are local/offline and side-effect free. Candidate detail may use only callback-scoped disposable staging and never selects/promotes/persists/activates content.
11. Missing evidence is unavailable, stale evidence is freshness, known unmet preconditions are blocked, and non-authoritative live/freshness faults on otherwise usable subjects are degraded.
12. Valid sibling scopes/registrations/plugins remain visible when one scope, record, catalog, runtime participant, adoption document, or candidate is unavailable/corrupt.

## Failure and status matrix

| Condition | Public condition/result | Safe action |
|---|---|---|
| Clean generation-zero host | empty `ready` page | `none` |
| Scope state corrupt | scope observation + blocked diagnostics; valid siblings continue | `run-recovery` |
| Candidate ID/checksum invalid | `invalid-id` | `retry-read` |
| State/catalog/runtime/trust epoch changes | `stale` | `retry-read` |
| Selected catalog stale but verified | detail/list `degraded`, freshness `stale` | `refresh-marketplace` |
| Selected catalog missing/corrupt | candidate `unavailable` | `refresh-marketplace` |
| External candidate offline | candidate detail `unavailable`, catalog summary retained | `retry-read` |
| Bundle malformed | candidate unavailable with stable ingestion category/provenance | `inspect-source` |
| Compatibility incompatible | `blocked` with complete component evidence | `inspect-source` |
| Required capability absent | supported component + unavailable requirement; `blocked` | `reload-runtime` |
| Capability capture absent | inventory inspectable; compatibility/readiness `unavailable` | `retry-read` |
| Project untrusted | project subject `blocked`; stale runtime not authoritative | `trust-project` |
| Exact plugin trust absent/revoked/invalid | `blocked` | `review-trust` |
| Required config missing | `blocked` | `provide-configuration` |
| Required sensitive config and no custody | `blocked` | `provide-configuration` |
| Disabled + exact inactive observation | `ready` | `none` |
| Enabled + exact all-participant observation | `ready` | `none` |
| Enabled + missing/mismatched participant | `blocked`, never partial active | `reload-runtime` |
| Pending transition/recovery-required | `blocked` ahead of runtime health | `run-recovery` |
| MCP runtime absent for declared MCP | capability/activation `blocked` or evidence `unavailable` as upstream proves | `reload-runtime` |
| MCP local registration exact, remote failed/needs auth | activation retained, `degraded` live health | `retry-read` |
| Update available/manual/approval required | current plugin remains usable; informational/warning diagnostic | `review-update` |
| Update check stale/failed | `degraded` freshness; active revision retained | `refresh-marketplace` |
| Adoption documents all missing | clean informational evidence, no warning | `none` |
| Adoption document unreadable/changed | host diagnostic with logical path and stable code | `retry-read` |
| Unknown adapter/native error | subsystem `EVIDENCE_UNAVAILABLE`; no native message/cause | `retry-read` |

## Simplification

- Replace packaged exposure of the low-level bundle inspector with one native inspection surface; keep the bundle inspector as an internal dependency for lifecycle and candidate detail.
- Reuse the existing marketplace catalog resolver, bundle inspector, pure compatibility evaluator, trust evaluator, configuration verifier, installed loader, runtime selection/contribution observations, MCP status, recovery results, and update/adoption contracts.
- Add no persisted read model, status history, search index, event bus, policy engine, runtime probe, health daemon, remote request, repair action, generic serializer, or rendering abstraction.
- Keep command grammar, operation eligibility-to-command mapping, Pi theme/components, keybindings, and TUI state in their later owning features.
- Retire duplicate presentation sanitizers if implementation finds any; every public native view must use `native-inspection-display.ts`.
- Archive `idea-escape-mcp-status-native-keys` once the terminal-safety regression passes; do not change upstream MCP native-key identity semantics.

## Testing

- **Contract/identifier tests** protect schema-derived variants, stateless checksum IDs/cursors, cross-scope/candidate/revision separation, stale replay, and exact exports.
- **Display/security tables** protect terminal escapes, Unicode scalar bounds, structured commands, URL/header/environment redaction, provenance limits, and absence of all secret/native/path canaries.
- **Snapshot seam tests** protect coherent generation/catalog/trust/capability/runtime/recovery/update capture and invalidation without probing or mutation.
- **Candidate interface tests** protect exact resolver authority, complete inspection/compatibility, callback scratch cleanup, offline distinctions, and stale acquisition races.
- **Installed interface tests** protect readiness precedence, exact participant evidence, disabled behavior, recovery blocking, remote-health separation, trust/config projection, and update memory.
- **Diagnostic compiler tests** protect complete registry coverage, deterministic ordering, fact-based deduplication, condition derivation, unknown-code handling, and semantic actions.
- **Integrated tests** protect clean packaged operation, corruption isolation, cross-scope collisions, stale races, hostile values, no remote health work, and the split-inspector data contract.
- Do not duplicate the foreign reader, compatibility policy, lifecycle transaction/recovery, runtime conformance, or marketplace refresh matrices; use one seam case per consumed contract plus feature-owned aggregation/safety cases.

## Risks

- **Riskiest assumption — all live authorities can expose a stable epoch**: state and catalogs already have generations/tokens, but runtime observations are currently exposed as snapshots without one common epoch. Mitigation: add a content-derived epoch to composition-owned immutable catalogs and status sets, then validate it before return. Fallback: mark that subsystem unavailable; never call an unbound live method and claim a coherent snapshot.
- **Candidate detail needs transient acquisition**: exact external revision/components cannot be obtained from catalog declarations alone. Mitigation: explicit detail only, existing hardened materializer/inspector, callback-scoped scratch, no promotion/state, and snapshot revalidation. Fallback: return catalog facts plus unavailable; never fabricate compatibility.
- **Existing diagnostic messages may contain hostile or sensitive values**: direct reuse would violate terminal safety. Mitigation: code/category/provenance whitelist and registry-owned summaries; ignore native messages/details by default. Fallback: `EVIDENCE_UNAVAILABLE` with subsystem only.
- **Capability capture may become stale after adapter replacement**: inspecting against a fresh ad hoc probe would be incoherent with active runtime. Mitigation: bind compatibility to the host/runtime epoch and force a new epoch through normal reload/composition. Fallback: stale/unavailable, not a new probe.
- **Read-only blocked startup can broaden lifecycle complexity**: retaining a management service after classifiable state/runtime failure must not accidentally permit mutations. Mitigation: mutation services retain existing authority checks; packaged host marks startup blocked and inspection has separate read-only dependencies. Fallback: expose only host-level diagnostics when a scope cannot be read.
- **Unicode escaping can harm readability or alter identity**: normalization would alias distinct names. Mitigation: keep constrained raw identity fields for machine equality and escape display without normalization. Fallback: show an escaped digest/identifier; never normalize identity.
- **Exact endpoint disclosure conflicts with secret redaction**: URLs/headers can carry secret material. Mitigation: show transport, host/path, query/fragment presence, header/environment names, and trust digest while omitting values. Security wins over textual exactness; provenance and component identity still identify the declaration.

## Pre-mortem

This design fails if a list combines evidence from different generations, a stale runtime status becomes activation proof, a remote MCP failure makes a compatible plugin “incompatible,” a project-scope duplicate resolves to user scope, a renderer receives raw control text, a diagnostic echoes a secret/native cause, candidate inspection leaves authoritative or scratch residue, or clean/offline startup triggers network work.

The countermeasures are snapshot validation, strict authority precedence, activation/health separation, scope-qualified IDs, schema-enforced safe fields, whitelist diagnostics, callback-scoped candidate acquisition, and local-only default reads. If evidence cannot meet those contracts, the correct output is stale, unavailable, or blocked—never guessed readiness or partial activation.

## Implementation summary

- **Ownership/dispatch**: one cohesive GPT-5.6 Sol xhigh owner implemented the eight-story DAG sequentially. Shared context and overlapping application/composition boundaries made a split less safe; no nested agent or peer mechanism ran, per the explicit caller boundary.
- **Architecture**: `NativeInspectionService` is the sole packaged management read surface. It composes strict snapshot-bound identifiers/cursors, one display/disclosure boundary, registry-owned diagnostics, exact candidate and installed projectors, and private evidence/readiness adapters over existing state/catalog/trust/compatibility/runtime/recovery/update authorities.
- **Coherence**: state generations, project trust, catalog tokens/cache status, one packaged capability capture, monotonic runtime selections, local skill/hook observations, MCP local/live status, recovery, and update memory bind each result. Capture-time metadata is excluded from authority identity; any authority change returns stale rather than retrying or mixing.
- **Safety/read-only behavior**: candidate acquisition is callback-scoped disposable staging; all other reads remain local/offline. Public schemas cannot contain raw declarations, configuration/secret values or locators, custody/project paths, URL query/fragment/userinfo values, native messages/causes, command output, or remote bodies. Hostile display text is escaped before rendering.
- **Packaged composition**: capabilities are captured once per host epoch and reused by compatibility, desired runtime, and inspection. `PackagedPluginHostApplication.inspection` exposes only `list/detail/diagnose`; the low-level bundle inspector and all raw adapters remain private. Classifiable local runtime reconstruction failure retains a blocked read-only container.
- **Verification**: the post-rebase focused inspection/marketplace/packaged/security run passed 128 tests. Full `npm test` passed typecheck, 302-module / 2,044-edge dependency boundaries, 233 Vitest files / 1,145 tests with no type errors, package build, exact 623 root exports, exact 3 Pi exports, and isolated packed extension startup.
- **Review readiness**: all eight child checkpoints are `done`; integrated verification is green. Effective review weight is project-default `standard`. Independent feature review is intentionally left to the invoking orchestrator because this owner was explicitly forbidden from nesting agents.
- **Owner pre-review correction**: a final authority-precedence walk found that exact inactive skill evidence could be mislabeled when a disabled plugin declared components and no MCP runtime was composed. The projector now treats exact inactivity/structural MCP absence as matching only for disabled intent (or an active no-MCP projection), while enabled missing-selection evidence remains unavailable/blocked.
- **Post-marketplace-rebase correction**: inspection now binds quarantined lifecycle-v3 record evidence by digest while preserving readable siblings; consumes the catalog service's finalized publication observations so corrupt content stays distinct from unavailable content; revalidates every public detail outcome; reports blocked packaged startup; redacts query/fragment values from SCP-style URL fallbacks; and proves candidate bytes use and leave the production private staging layout. Snapshot revalidation remains centralized at the public service boundary to avoid repeated whole-host captures inside item projectors.
