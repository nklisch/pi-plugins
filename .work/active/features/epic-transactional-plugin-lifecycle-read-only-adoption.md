---
id: epic-transactional-plugin-lifecycle-read-only-adoption
kind: feature
stage: done
tags: [security, compatibility, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-operations]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-16
---

# Read-Only Foreign-State Adoption

## Brief

Read supported Claude Code and Codex user-state locations to discover marketplace source declarations and return provenance-rich adoption candidates without requiring either CLI. Readers treat foreign files as untrusted, tolerate absent hosts, and never modify foreign state or read foreign installed-plugin caches for activation.

Accepted candidates copy source declarations only into Pi-owned state; foreign trust, credentials, caches, absolute materialized paths, plugin enablement, and activation decisions are never imported. Any selected installation or synchronization proceeds through the normal lifecycle operation, compatibility, trust, project-scope, and recovery boundaries. This feature does not implement adoption UI or bidirectional synchronization.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 4 import boundary — can proceed alongside recovery once normal lifecycle operations are stable
- Depends on lifecycle operations so accepted candidates cannot create an alternate install path
- Required guarantees: scope, data, network, security-boundary, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — Foreign-state adoption; Marketplace sources; Project scope
- `docs/ARCHITECTURE.md` — Standalone context; Trust; Pi integration
- `docs/COMPATIBILITY.md` — Foreign-state adoption; Explicit non-goals

## Existing contract references

- `src/domain/source.ts` — validated marketplace source declarations
- `src/domain/provenance.ts` — source-located claims
- `src/domain/errors.ts` — partial-success diagnostics and fatal boundary errors

## Late-bound feature decisions

Supported file discovery paths by platform/version, reader-specific schemas, missing/malformed-file fatality, duplicate/equivalent candidate merge rules, provenance shape, candidate-selection request contract, project-versus-user destination defaults, and deterministic import result remain for feature design. Readers must be read-only adapters and produce declarations, never operational state.

## UI alignment

No UI surface. Candidate selection and confirmation belong to `epic-native-plugin-management`.

## Design decisions

- **Discovery posture**: Direct-read only. Grounding covered every foundation and compatibility document, project rules, the completed state/source/marketplace/lifecycle contracts and representative tests, official Claude settings/marketplace documentation, and current OpenAI Codex source and tests. The feature is bounded enough not to warrant exploratory fanout. Nested agents and peer mechanisms were also explicitly prohibited.
- **Supported locations**: Probe exactly three user-state documents: `~/.claude/plugins/known_marketplaces.json`, `~/.claude/settings.json`, and `${CODEX_HOME:-~/.codex}/config.toml`. Paths use the injected user home and optional injected Claude/Codex roots so tests and host composition never depend on either CLI. All operating systems use Node path resolution from those roots; there is no platform-specific legacy-path scan or version guessing.
- **Strict path allowlist**: The Node adapter receives a fixed registry of those three files and never traverses directories. It never opens Claude `plugins/cache`, Claude materialized `plugins/marketplaces`, Codex marketplace install roots, plugin caches, auth files, credentials, trust records, enabled-plugin state, or generated activation state.
- **Reader separation**: Infrastructure only locates and bounded-reads UTF-8 text. Pure Claude JSON and Codex TOML readers map unknown documents to source-located declarations. Pure reconciliation merges declarations into candidates. The application service orchestrates discovery, selection, and registration planning. No parser imports filesystem, Node, lifecycle, state, or Pi APIs.
- **Claude schema**: Read the map entries in `known_marketplaces.json` and only the `extraKnownMarketplaces` map from user `settings.json`. Each entry must contain a supported `source` object. Map `github {repo, ref?}`, `git {url, ref?}`, and `directory {path}` to the existing `MarketplaceSource` variants. Ignore operational siblings such as `autoUpdate`, install locations, timestamps, and enabled-plugin settings rather than importing them. Reject the entry, with provenance, when the source carries `skipLfs`, a repository subdirectory/path, headers, inline `settings`, `hostPattern`, raw `url`, npm, or another field/variant that the current Pi marketplace-source contract cannot preserve exactly.
- **Codex schema**: Parse only `[marketplaces.<name>]` tables in `config.toml`. Map `source_type = "git"` plus `source` and optional `ref` to `{ kind: "git" }`, and `source_type = "local"` plus `source` to `{ kind: "local-git" }`. Ignore only known operational fields `last_updated` and `last_revision`. A non-empty `sparse_paths`, unknown source-semantic field, malformed table, unsupported `source_type`, insecure URL, or embedded credential omits that entry with a diagnostic. Root keys and unrelated config sections are never adoption input.
- **TOML parsing**: Add one small ESM-compatible runtime TOML parser (`smol-toml`) and keep its values behind the Codex reader. Hand-parsing TOML would create a larger and less trustworthy boundary; moving parsing into infrastructure would mix file effects with schema policy.
- **Provenance**: Add `foreign-state` to `SourceDocumentKindSchema`. Every alias and source is a `Claimed<T>` whose provenance names native host, exact observed file path, RFC 6901 pointer over the parsed JSON/TOML object, and the raw source declaration. Provenance is returned to the caller but is never written by the registration port; absolute foreign document paths therefore cannot enter Pi marketplace configuration.
- **Alias authority**: A foreign map/table key is a `suggestedMarketplace` claim, not authoritative Pi marketplace identity. Normal registration materializes and validates the catalog-declared root name. Adoption never writes a foreign alias directly into `HostConfigDocument` and never lets an alias override the catalog.
- **Candidate identity and merge**: Derive `AdoptionCandidateId` from the versioned canonical `MarketplaceSource` bytes through injected SHA-256. Equivalent declarations across files/hosts collapse to one source candidate with all unique provenance and sorted suggested-name claims. Two different sources declared at the same host + document + alias are a `CLAIM_CONFLICT`; both declarations at that location are omitted. A surviving declaration for the same canonical source can still retain that source as a candidate. Equal aliases in different hosts are not conflicts because aliases are host-local and non-authoritative.
- **Missing and malformed files**: A missing file is a normal `missing` observation and produces no error. An unreadable, oversized, non-regular, invalid-UTF-8, syntactically malformed, or root-invalid file is document-local: report one safe error status and continue with the other files. Malformed entries are entry-local when their alias can be located. Discovery has no global failure merely because Claude or Codex is absent.
- **Selection freshness**: `adopt(request)` re-runs discovery and resolves the requested candidate IDs against current canonical source declarations. It does not cache foreign data or persist candidates. If a file changes after presentation, the old ID becomes `candidate-unavailable`; no stale source is registered.
- **Normal registration path**: Adoption depends on `MarketplaceRegistrationPort`, the same application seam later used by `/plugin marketplace add`. For each selected current candidate it submits only `{ source, scope, origin: "adoption" }`. The port owns source materialization, catalog-name verification, Pi-state compare-and-commit, project trust, and ordinary marketplace diagnostics. Adoption never imports `LifecycleStateStore`, constructs a state mutation, calls plugin installation, or supplies a trust/configuration/activation bypass.
- **Destination default**: Omitted destination means user scope because both inputs are user state and `.pi/plugins.json` is shared project intent. An explicit verified project `ScopeContext` is allowed only for sources accepted by `PortableMarketplaceSourceSchema`; local paths are returned as `not-portable` before registration. The registration path remains responsible for Pi project trust and portable declaration persistence.
- **Import ordering and partial success**: Validate unique, non-empty candidate IDs, sort them by ID, then register sequentially. Return one schema-validated outcome per requested candidate (`registered`, `unchanged`, `candidate-unavailable`, `not-portable`, or the normal registrar's typed rejection) plus discovery diagnostics. One bad candidate does not discard successful siblings; cancellation stops before the next registration and is rethrown rather than converted into apparent success.
- **No adoption-time installation**: Registration copies marketplace intent only. The import result contains no installed plugin, enabled plugin, foreign revision/cache path, trust grant, credential, secret, or activation evidence. Later install/sync invokes `PluginLifecycleService` with `origin: "adoption"` through the existing compatibility, trust, project-scope, pending-transition, reload-verification, and recovery path.
- **Implementation ownership**: Keep this as one cohesive feature implementation bundle at the caller-selected highest appropriate capability. The three child stories are dependency/acceptance checkpoints, not separate-agent assignments; parser, application, and Node integration decisions share one security boundary.
- **Review policy**: Effective `review_weight` is `standard` from the caller and project. Implementation receives exactly one independent feature-level pass, followed by receiver adjudication, fixes, and verification without re-review. Design-time advisory would be reasonable because foreign schemas drift, but no independent pass is allowed at this delegated endpoint; that non-blocking degradation does not change implementation review.
- **Foundation timing**: Code-first. Current foundation assertions already describe the intended read-only adoption boundary; implementation changes them only if landed supported locations or outcome names make an assertion false or misleading.

## External grounding

Verified on 2026-07-16:

- Official Claude settings documentation at `https://code.claude.com/docs/en/settings.md` defines user settings at `~/.claude/settings.json`, the `extraKnownMarketplaces` keyed map, nested `source` objects, and current `github`, `git`, `directory`, `hostPattern`, and inline `settings` variants. It also documents `skipLfs` and `autoUpdate`; neither is silently imported because Pi's current source/state contracts do not preserve those semantics.
- Official Claude marketplace documentation at `https://code.claude.com/docs/en/plugin-marketplaces.md` identifies user marketplace state at `~/.claude/plugins/known_marketplaces.json` and distinguishes marketplace source declarations from materialized/cache state.
- OpenAI Codex `main` currently writes `[marketplaces.<name>]` through `codex-rs/config/src/marketplace_edit.rs` and `codex-rs/core-plugins/src/marketplace_add/metadata.rs`. Current fields are `source_type`, `source`, optional `ref`, optional `sparse_paths`, `last_updated`, and optional `last_revision`; `marketplace_add.rs` tests cover both `git` and `local`. `codex-rs/core/src/config/mod.rs` confirms `${CODEX_HOME}/config.toml` with `~/.codex` as the default home.

External format evidence constrains the private readers; it does not broaden the public Pi source union or authorize trust, cache, credential, update-policy, installation, or activation import.

## Architectural choice

### Option A — read foreign materialized marketplaces and installed caches

This could discover plugin names and revisions immediately, but foreign cache layouts and garbage collection would become runtime dependencies. Cache paths could be mistaken for source declarations, and foreign activation/trust could leak across hosts. Rejected by the product boundary.

### Option B — parse files and mutate Pi state directly in the adoption service

This is shorter at first, but it would trust foreign aliases, duplicate marketplace registration policy, bypass catalog identity validation, and create an adoption-only compare-and-commit path. Project writes could also bypass portability and trust. Rejected.

### Option C — pure declaration readers, deterministic candidate reconciliation, and a normal registration port (chosen)

Fixed read-only adapters return bounded text; pure readers emit only claimed `MarketplaceSource` declarations; a pure reconciler produces stable candidates; the application service re-discovers selections and invokes the ordinary marketplace registration seam. The cost is one explicit port and result contract, but it keeps foreign input, application planning, state authority, and later plugin installation separate.

**Choice**: Option C. It is the smallest design that can discover without either CLI while proving that adoption imports declarations only and cannot become an alternate installer.

## Trickiest unit first

The hardest unit is declaration extraction and reconciliation. Both hosts mix source declarations with operational data, their schemas change independently, aliases are not authoritative marketplace identities, and equivalent sources can appear in several documents. The reader must retain exact provenance while ensuring fields such as Claude install locations, `autoUpdate`, enabled plugins, Codex `last_revision`, and sparse checkout metadata never influence accepted Pi intent. The reconciler therefore works only over already-validated `MarketplaceSource` claims, keys equality by `serializeMarketplaceSource`, treats same-location contradictions as conflicts, and derives selection IDs from canonical source bytes rather than aliases or array order.

## Implementation units

### Unit 1: Adoption contracts, host readers, and pure reconciliation

**Story**: `epic-transactional-plugin-lifecycle-read-only-adoption-contracts-readers`

**Files**:
- `src/domain/adoption.ts`
- `src/domain/provenance-location.ts`
- `src/domain/error-contract.ts`
- `src/formats/adoption-reader-support.ts`
- `src/formats/claude/state-reader.ts`
- `src/formats/codex/state-reader.ts`
- `src/formats/adoption-reconciler.ts`
- `test/domain/adoption.test.ts`
- `test/formats/claude/state-reader.test.ts`
- `test/formats/codex/state-reader.test.ts`
- `test/formats/adoption-reconciler.test.ts`
- `test/fixtures/adoption/claude-known-marketplaces.json`
- `test/fixtures/adoption/claude-settings.json`
- `test/fixtures/adoption/codex-config.toml`

```typescript
export const AdoptionDocumentKindRegistry = {
  claudeKnownMarketplaces: { tag: "claude-known-marketplaces" },
  claudeUserSettings: { tag: "claude-user-settings" },
  codexUserConfig: { tag: "codex-user-config" },
} as const;
export type AdoptionDocumentKind =
  (typeof AdoptionDocumentKindRegistry)[keyof typeof AdoptionDocumentKindRegistry]["tag"];

export const AdoptionCandidateIdSchema = z
  .string()
  .regex(/^adoption-v1:sha256:[0-9a-f]{64}$/)
  .brand<"AdoptionCandidateId">();
export type AdoptionCandidateId = z.infer<typeof AdoptionCandidateIdSchema>;

export const AdoptionDeclarationSchema = z.object({
  host: NativeHostSchema,
  document: AdoptionDocumentKindSchema,
  suggestedMarketplace: ClaimedSchema(MarketplaceNameSchema),
  source: ClaimedSchema(MarketplaceSourceSchema),
}).strict().readonly();
export type AdoptionDeclaration = z.infer<typeof AdoptionDeclarationSchema>;

export const AdoptionCandidateSchema = z.object({
  id: AdoptionCandidateIdSchema,
  source: ClaimedSchema(MarketplaceSourceSchema),
  suggestedMarketplaces: z.array(ClaimedSchema(MarketplaceNameSchema)).nonempty().readonly(),
  nativeHosts: z.array(NativeHostSchema).nonempty().readonly(),
}).strict().readonly();
export type AdoptionCandidate = z.infer<typeof AdoptionCandidateSchema>;

export function deriveAdoptionCandidateId(
  source: MarketplaceSource,
  sha256: Sha256,
): AdoptionCandidateId;

export function reconcileAdoptionDeclarations(
  declarations: readonly AdoptionDeclaration[],
  sha256: Sha256,
): CollectionReadResult<AdoptionCandidate>;

export function readClaudeKnownMarketplacesJson(
  source: string,
  context: Readonly<{ path: string }>,
): CollectionReadResult<AdoptionDeclaration>;

export function readClaudeUserSettingsJson(
  source: string,
  context: Readonly<{ path: string }>,
): CollectionReadResult<AdoptionDeclaration>;

export function readCodexUserConfigToml(
  source: string,
  context: Readonly<{ path: string }>,
): CollectionReadResult<AdoptionDeclaration>;
```

Readers parse syntax/root shape once, iterate map/table entries in sorted key order, validate only supported source declarations, and attach `documentKind: "foreign-state"` provenance. JSON/TOML pointer helpers escape aliases with RFC 6901 rules. Raw source objects, not enclosing operational records, become `Provenance.declaration`. Root syntax/shape failures use a new `FOREIGN_STATE_ROOT_INVALID` error code; malformed entries use the existing schema/source/claim diagnostics.

`reconcileAdoptionDeclarations` first rejects contradictory declarations that reuse one host/document/path/alias location. It then groups survivors by canonical source, merges equal source claims with `mergeEquivalentClaims` using canonical serialization, deduplicates provenance, sorts alias claims and host tags, derives the ID, and sorts candidates by ID. It never opens a path, resolves a Git ref, materializes a source, or interprets trust/update/activation fields.

**Acceptance criteria**:
- [ ] Current Claude `known_marketplaces.json`/user `extraKnownMarketplaces` and Codex git/local table shapes produce only validated `MarketplaceSource` claims with exact file/pointer/raw-declaration provenance.
- [ ] Missing source fields, unsupported source types/semantics, embedded credentials, insecure URLs, Claude `skipLfs`/subdirectory/inline settings, and Codex sparse sources are diagnosed and omitted without weakening `MarketplaceSourceSchema`.
- [ ] Enabled plugins, plugin config, trust, auth, update policy, timestamps, revisions, install locations, cache paths, and unrelated settings cannot appear in an `AdoptionCandidate`.
- [ ] Equivalent declarations merge deterministically; same-location conflicts omit contradictory declarations and report both provenances; caller order does not change bytes or IDs.
- [ ] Readers and reconciler import only domain/sibling format modules; no Node, filesystem, application, infrastructure, lifecycle, state-store, or Pi imports exist.

### Unit 2: Discovery, selection freshness, and registration planning

**Story**: `epic-transactional-plugin-lifecycle-read-only-adoption-application-import`
**Depends on**: `epic-transactional-plugin-lifecycle-read-only-adoption-contracts-readers`

**Files**:
- `src/application/adoption-contract.ts`
- `src/application/adoption-service.ts`
- `src/application/ports/foreign-state-files.ts`
- `src/application/ports/marketplace-registration.ts`
- `test/application/adoption-contract.test.ts`
- `test/application/adoption-service.test.ts`

```typescript
export type ForeignStateFileObservation =
  | Readonly<{ kind: "missing"; document: AdoptionDocumentKind; host: NativeHost; path: string }>
  | Readonly<{ kind: "present"; document: AdoptionDocumentKind; host: NativeHost; path: string; source: string }>
  | Readonly<{
      kind: "unreadable";
      document: AdoptionDocumentKind;
      host: NativeHost;
      path: string;
      code: "NOT_REGULAR" | "TOO_LARGE" | "INVALID_UTF8" | "IO_FAILED";
    }>;

export interface ForeignStateFilesPort {
  readAll(signal: AbortSignal): Promise<readonly ForeignStateFileObservation[]>;
}

export type MarketplaceRegistrationResult =
  | Readonly<{ kind: "registered"; marketplace: MarketplaceName }>
  | Readonly<{ kind: "unchanged"; marketplace: MarketplaceName }>
  | Readonly<{
      kind: "rejected";
      code: "INVALID_SOURCE" | "NAME_CONFLICT" | "PROJECT_UNTRUSTED" |
        "NOT_PORTABLE" | "STALE" | "ABORTED" | "ADAPTER_FAILED";
    }>;

export interface MarketplaceRegistrationPort {
  register(
    request: Readonly<{
      source: MarketplaceSource;
      scope: ScopeContext;
      origin: "adoption";
    }>,
    signal: AbortSignal,
  ): Promise<MarketplaceRegistrationResult>;
}

export const AdoptionSelectionRequestSchema = z.object({
  candidateIds: z.array(AdoptionCandidateIdSchema).min(1).superRefine(uniqueIds).readonly(),
  scope: ScopeContextSchema.default({ kind: "user" }),
}).strict().readonly();
export type AdoptionSelectionRequest = z.infer<typeof AdoptionSelectionRequestSchema>;

export type AdoptionImportOutcome =
  | MarketplaceRegistrationResult
  | Readonly<{ kind: "candidate-unavailable" }>
  | Readonly<{ kind: "not-portable" }>;

export interface AdoptionService {
  discover(signal: AbortSignal): Promise<AdoptionDiscoveryResult>;
  adopt(request: AdoptionSelectionRequest, signal: AbortSignal): Promise<AdoptionImportResult>;
}

export function createAdoptionService(dependencies: Readonly<{
  files: ForeignStateFilesPort;
  readers: AdoptionReaderRegistry;
  registrations: MarketplaceRegistrationPort;
  sha256: Sha256;
}>): AdoptionService;
```

`discover` parses every `present` observation with the registry entry matching its document tag, converts unreadable observations to safe diagnostics/status, reconciles all valid declarations, and returns all three document statuses in fixed registry order. Missing files are visible as status but are not errors.

`adopt` validates the request, calls `discover` again, indexes current candidates by ID, and processes sorted requested IDs. Missing IDs return `candidate-unavailable`. Project scope first parses the candidate through `PortableMarketplaceSourceSchema`; local sources return `not-portable` and never reach the registrar. Every accepted call passes only the normalized source, scope, and adoption origin. Results are schema-validated and returned in ID order. The service has no install/update/enable method and no dependency on plugin lifecycle, state mutation, trust, secrets, credentials, caches, or runtime projections.

**Acceptance criteria**:
- [ ] No Claude/Codex installation and all three missing files return an empty successful discovery with deterministic `missing` statuses.
- [ ] One malformed/unreadable document does not suppress valid candidates from another, and diagnostics contain no native causes or file contents.
- [ ] Adoption re-discovers; changed/removed source declarations cannot be registered through a previously presented ID.
- [ ] Omitted scope registers user intent; explicit project scope accepts only portable remote sources and delegates project trust/persistence to the normal registrar.
- [ ] The registrar receives only source, scope, and `origin: "adoption"`; no alias, foreign policy, trust, credentials, cache/materialized path, enabled plugin, or activation claim crosses the port.
- [ ] Multi-selection outcomes are deterministic and partial-success; cancellation never becomes a success result.

### Unit 3: Fixed Node reader, composition, and package integration

**Story**: `epic-transactional-plugin-lifecycle-read-only-adoption-node-integration`
**Depends on**: `epic-transactional-plugin-lifecycle-read-only-adoption-application-import`

**Files**:
- `src/infrastructure/adoption/node-foreign-state-files.ts`
- `src/composition/create-adoption-service.ts`
- `src/index.ts`
- `package.json`
- `package-lock.json`
- `.dependency-cruiser.cjs`
- `test/infrastructure/adoption/node-foreign-state-files.test.ts`
- `test/integration/adoption.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if implementation changes a current assertion

```typescript
export const ForeignStateLocationRegistry = {
  claudeKnownMarketplaces: {
    host: "claude",
    document: "claude-known-marketplaces",
    relativePath: ["plugins", "known_marketplaces.json"],
  },
  claudeUserSettings: {
    host: "claude",
    document: "claude-user-settings",
    relativePath: ["settings.json"],
  },
  codexUserConfig: {
    host: "codex",
    document: "codex-user-config",
    relativePath: ["config.toml"],
  },
} as const;

export type NodeForeignStateFilesOptions = Readonly<{
  userHome: string;
  claudeRoot?: string;
  codexHome?: string;
  maxDocumentBytes?: number;
}>;

export function createNodeForeignStateFiles(
  options: NodeForeignStateFilesOptions,
): ForeignStateFilesPort;

export type NodeAdoptionServiceOptions = Readonly<{
  registrations: MarketplaceRegistrationPort;
  userHome?: string;
  claudeRoot?: string;
  codexHome?: string;
  maxDocumentBytes?: number;
}>;

export function createNodeAdoptionService(
  options: NodeAdoptionServiceOptions,
): AdoptionService;
```

The default composition root uses `homedir()` for `userHome`, `<home>/.claude` for Claude, and `process.env.CODEX_HOME` or `<home>/.codex` for Codex. Explicit options win and are mandatory in tests. The adapter joins only registry segments, uses metadata/open/read steps that accept regular files (including user-managed symlinks resolving to a regular target), enforces a default 1 MiB document limit before and during reading, decodes UTF-8 fatally, respects abort before each file, and never writes, creates, chmods, renames, locks, watches, or enumerates.

The integration test builds temporary Claude/Codex homes containing current valid, duplicate, conflicting, unsupported, missing, and malformed documents. A fake normal registrar records declarations and returns catalog-derived names; tests prove discovery does not call it, selection calls it once per current canonical source, local project adoption is blocked, and no cache/credential/trust/enabled-plugin sentinel file is opened. Public exports include adoption schemas/types, service factory, two ports, and Node composition; host-private reader schemas and low-level path helpers remain internal.

**Acceptance criteria**:
- [ ] Filesystem tests prove exact three-path access, no directory traversal/enumeration or writes, bounded regular-file/UTF-8 handling, missing-host tolerance, cancellation, and safe unreadable statuses on Linux/macOS/Windows path fixtures.
- [ ] Integration proves equivalent Claude/Codex declarations collapse, conflicts remain source-located, only selected current source declarations reach the registrar, and no foreign operational state crosses the port or result.
- [ ] The Node composition works with neither CLI installed and with injected roots; only `CODEX_HOME` changes the default Codex root.
- [ ] Dependency rules keep domain/application/formats free of Node and prevent adoption policy from importing state stores, lifecycle internals, infrastructure, runtime, or Pi.
- [ ] Source and compiled package allowlists expose the stable adoption surface without private parsers, native causes, file handles, cache paths, or an installation bypass.
- [ ] Full `npm test` passes strict source/test typechecking, dependency boundaries, focused fixtures/integration, build, and exact compiled import.

## Implementation order

1. `epic-transactional-plugin-lifecycle-read-only-adoption-contracts-readers`
2. `epic-transactional-plugin-lifecycle-read-only-adoption-application-import`
3. `epic-transactional-plugin-lifecycle-read-only-adoption-node-integration`

The chain is intentional. Pure schemas/readers establish the only data allowed out of foreign files. The application checkpoint can then prove freshness and the normal registration handoff without filesystem behavior. Node integration finally wires fixed paths and package exports without moving format policy into the adapter.

## Simplification

- Reuse `MarketplaceSourceSchema`, `serializeMarketplaceSource`, `Claimed<T>`, `mergeEquivalentClaims`, `Diagnostic`, `ScopeContext`, and `PortableMarketplaceSourceSchema`; do not create host-specific public source unions, trust models, or state documents.
- Add one `foreign-state` provenance kind instead of separate provenance schemas for JSON and TOML.
- Keep one fixed three-file adapter, one reader registry, one reconciler, and one application service. Do not add host CLI adapters, directory scanners, watcher/cache layers, migration registries for foreign files, candidate persistence, or a generic import framework.
- Do not change lifecycle/state schemas to retain foreign aliases, provenance, timestamps, revisions, cache paths, update preferences, trust, or activation. The ordinary registration service remains the sole writer of Pi marketplace intent.
- Do not duplicate marketplace materialization, catalog reading, project trust, state compare-and-commit, installation, compatibility, or recovery tests. Adoption tests stop at the registration port; owning features keep detailed behavior.
- No existing tests are candidates for removal. The new tests protect a distinct untrusted-input and authority boundary rather than repeating marketplace catalog readers.

## Testing

- **Pure reader fixtures**: one current-shaped valid fixture per document plus focused unsupported/malformed entries. Protects exact host mappings and proves operational siblings are not imported.
- **Reconciliation vectors**: equivalent source across all documents, same-location source conflict, same alias across hosts with different sources, caller-order permutation, and forged candidate ID. Protects deterministic identity/provenance without broad combinatorics.
- **Application contract**: all-missing, one bad/one good document, re-discovery after mutation, duplicate selection rejection, user default, project portable/local split, registrar rejection, and mid-batch abort. Protects freshness, scope, and no alternate install path.
- **Node adapter contract**: fixed access list, regular/symlinked regular file, non-regular target, oversized growth, invalid UTF-8, permission/I/O failure, and abort. Protects the only effectful boundary.
- **One integration path**: temporary user homes plus a fake normal registrar. Protects no-CLI operation and the complete declaration-only handoff.
- **No low-value copies**: do not retest source URL grammar, lifecycle trust/activation, state CAS, project trust, or catalog root identity in detail; assert that those existing contracts/ports receive or reject the right normalized value.

## Risks

- **Riskiest assumption — undocumented Claude persisted-entry shape**: official docs identify `known_marketplaces.json` but do not publish every operational field. Mitigation: read only a nested supported `source`, tolerate unrelated enclosing fields, commit a current real-shaped fixture, and fail one entry/document visibly when the source shape changes. Fallback: update the Claude-private reader without changing candidates or the application service.
- **Foreign schemas can add source semantics**: silently dropping `skipLfs`, sparse paths, headers, or repository subdirectories could change acquired content or credentials. Mitigation: explicitly reject unsupported source-semantic fields. Fallback: first extend Pi's authoritative source contract in its owning feature, then add a reader mapping.
- **A local path may look like a materialized cache path**: importing an `installLocation` would violate standalone operation. Mitigation: accept paths only from the exact source fields for Claude `directory` or Codex `source_type = "local"`; fixed readers never inspect host cache fields or directories. Project destination rejects all local sources.
- **Foreign aliases can disagree with catalog identity**: persisting them directly would create competing identity authorities. Mitigation: aliases are presentation claims only; normal registration validates the catalog name. Fallback: source remains selectable even when aliases differ, while name conflicts are reported by registration.
- **Discovery-to-selection race**: files can change while the user reviews candidates. Mitigation: candidate IDs commit to canonical source and `adopt` re-discovers. Fallback: return `candidate-unavailable` and let presentation refresh rather than using cached authority.
- **TOML parser behavior is another boundary dependency**: dates or extension values may not be JSON-safe. Mitigation: only selected primitive source fields cross into domain schemas, parser-native values never enter provenance wholesale, and malformed roots are document-local.
- **Normal marketplace registration lands in a later presentation epic**: this feature defines and tests the required port rather than duplicating that service. Until composition supplies the port, the Node factory requires it explicitly and cannot fall back to direct state mutation or plugin installation.

## Pre-mortem

The design fails if a foreign cache path is accepted as a source, malformed one-host state suppresses the other host, aliases become authoritative identity, source-semantic fields are silently discarded, stale candidates register after a file change, project adoption writes machine-local paths, or adoption directly installs/enables plugins. Fixed path/field allowlists, strict source mapping, document-local diagnostics, canonical-source candidate IDs, re-discovery, portable-project preflight, and the mandatory normal registration port directly address those failures.

The fallback is deliberately narrow: unsupported or drifted declarations remain visible diagnostics and are not candidates. Supporting a new host path or source form requires new external evidence and an explicit reader/source-contract change; it never comes from scanning foreign state more broadly.

## Implementation summary

- **Execution capability**: GPT-5.6 Luna xhigh, one cohesive feature owner. The three child stories were used as ordered checkpoints because the parser, application, and filesystem boundaries share one authority/trust contract.
- **Completed checkpoints**: contracts/readers, application import, and Node integration all advanced directly `implementing -> done`, each with focused tests and its own implementation commit.
- **Delivered boundary**: pure Claude JSON/Codex TOML source readers, deterministic canonical-source candidate reconciliation, freshness-aware declaration-only application import, fixed three-file bounded Node reads, and an explicit normal marketplace registration port.
- **Security and authority choices**: only the three fixed user-state files are read; caches, credentials, trust, enablement, revisions, and materialized paths are never consulted. Foreign aliases remain suggestions. Project local sources are rejected before registration. Adoption has no state-store, lifecycle, install, activation, or write path.
- **Dependency choice**: `smol-toml` 1.7.0 is used as the maintained ESM TOML boundary; no TOML hand parser was added. An adoption-specific dependency rule prevents the application policy from importing lifecycle/state-writer paths.
- **Deviations**: none from the approved design. The existing foundation assertions remain accurate, so no foundation document changes were needed.

## Integrated verification

- `npm test` — passed: strict source/test typechecking, dependency boundaries (143 modules / 836 dependencies), 101 test files / 594 tests with no type errors, build, and compiled package import (378 exports).

## Review (2026-07-16)

**Verdict**: Approve with comments

**Blockers**: none
**Important**: multi-way source-conflict diagnostics report only the first conflicting pair while correctly omitting every conflicting declaration; parked as `idea-adoption-conflict-diagnostics` because authority remains fail-closed and operator impact is reporting-only.
**Nits**: defensive throwing-reader and present-without-marketplaces paths lack dedicated tests; `stableJson(undefined)` is theoretical because adoption provenance always carries a raw declaration; empty `CODEX_HOME` intentionally fails closed.
**Rejected**: no findings rejected. Accepted limitations include private host readers, bounded re-discovery on selection, and the maintained `smol-toml` boundary.

**Notes**: Substrate feature review at effective weight `standard` (project source), one cross-model balanced pass by Umans GLM 5.2. The pass traced fixed-file access, unsupported-semantics rejection, alias non-authority, deterministic reconciliation, freshness, project portability, registrar narrowing, public exports, dependency boundaries, and foundation alignment. No receiver-confirmed material current-cycle blocker remained, so standard closes after this single pass without re-review. Integrated verification remains `npm test`: 101 files / 594 tests, clean typecheck and boundaries, build, and 378-export compiled import.
