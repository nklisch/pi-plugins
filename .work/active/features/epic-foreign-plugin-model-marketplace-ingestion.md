---
id: epic-foreign-plugin-model-marketplace-ingestion
kind: feature
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-domain-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-12
---

# Claude and Codex Marketplace Ingestion

## Brief

Read `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` catalogs as untrusted input and emit canonical marketplace identities and normalized plugin entries with source claims. The capability handles each format's source declarations, versions, availability policy, entry-level component declarations, strictness semantics, and precise source-located validation errors while isolating malformed entries where marketplace identity remains trustworthy.

When both catalogs exist, overlapping identities and entries are validated together: equivalent declarations collapse, complementary metadata combines, and disagreement fails explicitly without host precedence. This feature normalizes catalog intent only; secure acquisition is supplied independently, while plugin manifests and complete compatibility are handled after content materialization.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: parallel producer after the canonical contracts; plugin-bundle ingestion consumes its normalized entry and provenance
- Design alignment: preserve dual-format consistency, authoritative marketplace-entry identity, and source-located failures from the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Marketplace sources; Marketplace entries; Plugin identity
- `docs/ARCHITECTURE.md` — Format ingestion; Reader isolation; Dual manifests
- `docs/COMPATIBILITY.md` — Marketplace discovery; Marketplace behavior; Plugin source forms

## Discovery and UI alignment

- **Discovery posture**: Direct-read only. The completed domain-contract feature, current `src/domain/**`, package export regression, both foreign-format research references, the adjacent real Claude catalog, and representative dual manifests provide the required boundaries and concrete shapes. No further exploratory delegation was needed or permitted.
- **Concrete evidence**: `/home/nathan/dev/skills/.claude-plugin/marketplace.json` declares root name `nklisch-skills`, string-path and `git-subdir` sources, Codex-style availability/authentication policy, categories/tags, and no root-level alias. `/home/nathan/dev/skills/docs/research/codex-plugin-format.md` records `.agents/plugins/marketplace.json` and Claude-compatible catalog discovery, required Codex `policy`, `local`/`git-subdir` forms, and manifest-oriented semantics. `/home/nathan/dev/skills/.agents/plugins/marketplace.json` is absent, so the real repository is a single Claude-path catalog intentionally consumed by both hosts rather than evidence for a second root identity.
- **UI**: No UI surface. This feature is a host-independent parsing and reconciliation boundary; no mockup applies.

## Design decisions

- **What represents a catalog entry before source resolution and manifest discovery?**: Add schema-first `NormalizedMarketplace` and `NormalizedMarketplaceEntry` contracts in `src/domain/marketplace.ts`. Do not fabricate `NormalizedPlugin`: that contract requires a resolved source, complete configuration, and complete component inventory. Do not create separate Claude/Codex output types; both readers terminate at the shared domain contract.
- **What owns marketplace identity?**: The catalog-declared root `name` is authoritative in both supported formats. It is required and validated as `MarketplaceName`; no registration alias or caller label participates. There is no fallback because both verified formats provide root identity. Two catalogs with different root names make the enclosing marketplace untrustworthy and fail the merge as `MARKETPLACE_ROOT_INVALID` with both source locations.
- **How is Claude `strict` represented?**: Each entry carries authority metadata. Claude `strict: true` (including its synthesized default) means a manifest is required and catalog runtime declarations are supplemental; `strict: false` means a manifest is optional and catalog runtime declarations are authoritative. The reader records the raw `strict` declaration or the full entry that supplied the default. Bundle ingestion, not this reader, resolves catalog/manifest authority.
- **What are Codex authority semantics?**: Codex entries always emit `manifest: "required"` and `catalogRuntime: "supplemental"`; Codex has no Claude-style `strict: false` mode. Catalog source, availability, and presentation remain authoritative catalog claims, while runtime component pointers come from `.codex-plugin/plugin.json`. Synthesized authority values retain the entry's provenance.
- **Where is path safety enforced?**: Readers validate declaration syntax only: `./`-relative paths, no empty/`.`/`..` segments, no backslashes, no NUL, and no absolute forms. They may syntactically join Claude `metadata.pluginRoot` to a relative source. Filesystem realpath, symlink, and materialized-root containment belong to source materialization and plugin-bundle ingestion.
- **How are dual source declarations compared?**: Compare `serializePluginSource` output, not object serialization or display text. Selectors (`ref`, Git `sha`, npm `selector`) are part of canonical source bytes, so differing selectors conflict. Equivalent sources merge provenance in deterministic Claude-then-Codex order; no input-order or host-precedence behavior leaks into results.
- **How does partial success work?**: Raw JSON syntax failure, non-object root, invalid/missing root name, non-array `plugins`, invalid root `metadata.pluginRoot`, duplicate surviving entry names within one catalog, and conflicting dual root identities are root-fatal. A malformed entry, malformed nested runtime/dependency declaration, invalid source, or dual-entry conflict drops that entire entry and emits an error diagnostic; valid siblings survive. There is no partially normalized entry mode.
- **How precise is provenance?**: Every normalized or synthesized claim uses RFC 6901 JSON Pointer locations such as `/plugins/3/source/ref`; pointer segments escape `~` and `/`. `Provenance.declaration` preserves the exact raw scalar/object/array that supported the claim. A derived plugin identity carries provenance from both `/name` and `/plugins/<i>/name`; synthesized defaults point to the complete entry declaration so their origin remains auditable.
- **What happens to unsupported declarations?**: Known runtime-bearing catalog fields and plugin dependency declarations are retained as raw `MarketplaceEntryDeclaration` claims with host, category, field, and provenance. Readers do not assign compatibility verdicts. Unknown behavior-neutral fields are retained as host-qualified `RetainedMetadata`; later bundle ingestion and compatibility policy decide meaning.
- **How are format boundaries protected?**: `src/formats/**` imports only domain and sibling format modules, plus Zod where needed; it imports no `node:*`, filesystem, infrastructure, application, runtime, or Pi module. Extend dependency-cruiser and its committed violation fixture so this is executable architecture, not convention.

## Other agent review

- Invoked because: large, format-sensitive autopilot design with catalog identity, partial-success, authority, and merge semantics.
- Scope: one caller-supplied Z.AI GLM 5.2 advisory pass; no further peer was run because this delegated task forbids nested delegation.
- Reviewer (Phase 1 — advisory/completeness): GLM 5.2
  - Flagged the mismatch between resolved `NormalizedPlugin` and unresolved catalog entries; root-name ambiguity; loss of Claude strictness; filesystem leakage into readers; source equivalence and merge-order ambiguity; unspecified fatal/recoverable outcomes; weak provenance; partial-entry hazards; merger coupling; and loss of unsupported runtime/dependency declarations.
- Accepted:
  - Add public schema-derived marketplace contracts rather than placeholder plugins or host-local normalized types.
  - Require catalog-declared root identity, make dual root disagreement fatal, and exclude user aliases from identity.
  - Carry host authority metadata, define Codex manifest semantics, validate only path syntax, compare canonical source serialization including selectors, and normalize merge order.
  - Enumerate fatal/recoverable outcomes, map JSON parse errors, preserve JSON Pointer/raw declaration provenance, drop malformed entries atomically, separate marketplace/manifest mergers, enforce format boundaries, and retain runtime/dependency declarations without verdicts.
- Rejected:
  - A source-derived root-name fallback was not adopted because both verified catalog formats require `name`; accepting a fallback would hide a malformed authoritative root and create a second identity rule with no concrete need.
  - Strict rejection of every unknown entry field was not adopted. Unknown runtime-bearing fields cannot be safely classified by spelling alone, while behavior-neutral foreign metadata should remain inspectable; known runtime/dependency fields are explicitly retained and known schema fields remain strict in shape.
- Phase 2 adversarial review: skipped because nested review is prohibited; the pre-mortem below supplies the local attack pass.

## Architectural choice

### Option A — shared schema-first catalog domain plus isolated readers and merger (chosen)

Add one unresolved marketplace domain contract, one reader per foreign host, shared pure reader utilities, and a dedicated marketplace merger. Readers normalize host syntax into claims; the merger compares domain values and never parses host JSON. This preserves Ports & Adapters, gives bundle ingestion one input type, and keeps format drift isolated. It adds a small domain surface and one explicit merge module.

### Option B — emit incomplete `NormalizedPlugin` values

Fill unavailable resolved-source, configuration, and inventory fields with placeholders so existing downstream types can be reused. This appears smaller but makes invalid states representable, confuses catalog discovery with bundle ingestion, and destroys fail-fast guarantees. It is rejected.

### Option C — preserve host-specific catalog ASTs until bundle ingestion

Return `ClaudeMarketplace` and `CodexMarketplace` types and reconcile them only after materialization. This mirrors foreign schemas closely, but every downstream consumer must understand both formats, authority semantics duplicate, and dual-catalog conflicts surface too late. It violates the normalized-boundary architecture and is rejected.

**Choice**: Option A. Zod schemas in the domain own the public contract; host schemas remain private reader details; a pure dedicated merger owns only cross-catalog reconciliation.

## Trickiest unit first

The dedicated marketplace merger is the highest-risk unit because it must reconcile identity, source selectors, authority, policy, metadata, and provenance while preserving valid siblings and never introducing host precedence. It will first canonicalize input order (`claude`, then `codex`), reject root disagreement before entry work, index each already-validated catalog by plugin entry name, compare source claims through `serializePluginSource`, merge equal claims, retain both authority records, and convert each entry conflict into a source-located `CLAIM_CONFLICT` diagnostic while omitting only that entry. The merger never invokes manifest reconciliation and never accesses a filesystem.

## Implementation units

### Unit 1: Marketplace domain contracts and explicit public API

**Story**: `epic-foreign-plugin-model-marketplace-ingestion-domain-contracts`

**Files**:
- `src/domain/marketplace.ts`
- `src/index.ts`
- `test/domain/marketplace.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

```typescript
// src/domain/marketplace.ts
import { z } from "zod";
import { RetainedMetadataSchema } from "./components.js";
import { DiagnosticSchema } from "./errors.js";
import { MarketplaceNameSchema, PluginIdentitySchema } from "./identity.js";
import { ClaimedSchema, NativeHostSchema, ProvenanceSchema } from "./provenance.js";
import { JsonValueSchema } from "./schema.js";
import { PluginSourceSchema } from "./source.js";

export const MarketplaceAvailabilityRegistry = {
  available: "available",
  installedByDefault: "installed-by-default",
  notAvailable: "not-available",
} as const;
export const MarketplaceAvailabilitySchema = z.enum([
  MarketplaceAvailabilityRegistry.available,
  MarketplaceAvailabilityRegistry.installedByDefault,
  MarketplaceAvailabilityRegistry.notAvailable,
]);
export type MarketplaceAvailability = z.infer<typeof MarketplaceAvailabilitySchema>;

export const MarketplaceInstallationPolicySchema = z.object({
  availability: ClaimedSchema(MarketplaceAvailabilitySchema),
  authentication: ClaimedSchema(z.string().min(1)).optional(),
  declaration: ClaimedSchema(JsonValueSchema),
}).strict().readonly();
export type MarketplaceInstallationPolicy = z.infer<typeof MarketplaceInstallationPolicySchema>;

export const MarketplaceAuthoritySchema = z.object({
  nativeHost: NativeHostSchema,
  strict: ClaimedSchema(z.boolean()).optional(),
  manifest: ClaimedSchema(z.enum(["required", "optional"])),
  catalogRuntime: ClaimedSchema(z.enum(["supplemental", "authoritative"])),
}).strict().readonly().superRefine((value, context) => {
  // Claude strict=true/default => required/supplemental; strict=false =>
  // optional/authoritative. Codex forbids strict and requires
  // required/supplemental.
});
export type MarketplaceAuthority = z.infer<typeof MarketplaceAuthoritySchema>;

export const MarketplaceDeclarationCategoryRegistry = {
  component: "component",
  dependency: "dependency",
  runtimeMetadata: "runtime-metadata",
} as const;
export const MarketplaceEntryDeclarationSchema = z.object({
  nativeHost: NativeHostSchema,
  category: z.enum([
    MarketplaceDeclarationCategoryRegistry.component,
    MarketplaceDeclarationCategoryRegistry.dependency,
    MarketplaceDeclarationCategoryRegistry.runtimeMetadata,
  ]),
  field: z.string().min(1),
  declaration: ClaimedSchema(JsonValueSchema),
}).strict().readonly();
export type MarketplaceEntryDeclaration = z.infer<typeof MarketplaceEntryDeclarationSchema>;

export const NormalizedMarketplaceEntrySchema = z.object({
  identity: ClaimedSchema(PluginIdentitySchema),
  source: ClaimedSchema(PluginSourceSchema),
  version: ClaimedSchema(z.string().min(1)).optional(),
  description: ClaimedSchema(z.string()).optional(),
  policy: MarketplaceInstallationPolicySchema.optional(),
  authorities: z.array(MarketplaceAuthoritySchema).nonempty().readonly(),
  declarations: z.array(MarketplaceEntryDeclarationSchema).readonly(),
  metadata: z.array(RetainedMetadataSchema).readonly(),
  rawDeclaration: ClaimedSchema(JsonValueSchema),
}).strict().readonly().superRefine((entry, context) => {
  // identity marketplaceEntryName/key agree, authority hosts are unique,
  // and retained metadata keys are unique.
});
export type NormalizedMarketplaceEntry = z.infer<typeof NormalizedMarketplaceEntrySchema>;

export const NormalizedMarketplaceSchema = z.object({
  name: ClaimedSchema(MarketplaceNameSchema),
  entries: z.array(NormalizedMarketplaceEntrySchema).readonly(),
  metadata: z.array(RetainedMetadataSchema).readonly(),
  sourceDocuments: z.array(ProvenanceSchema).nonempty().readonly(),
}).strict().readonly().superRefine((marketplace, context) => {
  // Entry keys are unique and every entry marketplaceName equals root name.
});
export type NormalizedMarketplace = z.infer<typeof NormalizedMarketplaceSchema>;

export const MarketplaceReadResultSchema = z.object({
  marketplace: NormalizedMarketplaceSchema,
  diagnostics: z.array(DiagnosticSchema).readonly(),
}).strict().readonly();
export type MarketplaceReadResult = z.infer<typeof MarketplaceReadResultSchema>;
```

The package barrel explicitly exports these schemas, registries, and inferred types. The runtime export allowlist is updated in this implementation story, not during design.

**Acceptance criteria**:
- [ ] No value satisfying `NormalizedMarketplaceEntry` can be mistaken for `NormalizedPlugin`; unresolved entries carry declared `PluginSource`, not `ResolvedPluginSource`.
- [ ] Authority schema rejects impossible Claude/Codex strict/manifest combinations and duplicate authority hosts.
- [ ] Marketplace schema rejects duplicate plugin keys and entries whose identity disagrees with the claimed root.
- [ ] Every public marketplace type is inferred from a public schema; exact runtime exports are covered by source and compiled-package allowlists.
- [ ] Domain contracts import no format, infrastructure, application, runtime, Pi, or Node module.

### Unit 2: Claude marketplace reader

**Story**: `epic-foreign-plugin-model-marketplace-ingestion-claude-reader`

**Files**:
- `src/formats/marketplace-reader-support.ts`
- `src/formats/claude/marketplace-reader.ts`
- `test/formats/claude/marketplace-reader.test.ts`
- `test/fixtures/marketplaces/claude-valid.json`
- `test/fixtures/marketplaces/claude-partial.json`

```typescript
// src/formats/claude/marketplace-reader.ts
import type { MarketplaceReadResult } from "../../domain/marketplace.js";

export const CLAUDE_MARKETPLACE_PATH = ".claude-plugin/marketplace.json";

export type MarketplaceReaderOptions = Readonly<{
  path?: string;
}>;

export function readClaudeMarketplace(
  input: unknown,
  options?: MarketplaceReaderOptions,
): MarketplaceReadResult;

export function readClaudeMarketplaceJson(
  json: string,
  options?: MarketplaceReaderOptions,
): MarketplaceReadResult;
```

`readClaudeMarketplaceJson` maps `JSON.parse` `SyntaxError` to a thrown `BoundaryError` with code `MARKETPLACE_ROOT_INVALID`, operation `readClaudeMarketplaceJson`, and the catalog path; native cause remains attached and never enters diagnostics. `readClaudeMarketplace` validates the enclosing root first, then entries independently.

Private Zod schemas recognize Claude root `name`, `owner`, `metadata.pluginRoot`, and `plugins`; entry schemas recognize `name`, source, version, description, category/tags, policy, `strict`, manifest-like component fields, and dependency fields. Known nested objects and source variants are strict. Root and entry objects use controlled passthrough so unrecognized behavior-neutral fields can be retained rather than silently discarded. Source mapping is:

```text
"./path"                                      -> { kind: "marketplace-path", path }
{ source: "github", repo, ref? }             -> { kind: "git", url: "https://github.com/<repo>.git", ref? }
{ source: "url", url, ref?, sha? }            -> { kind: "git", url, ref?, sha? }
{ source: "git-subdir", url, path, ref?, sha? } -> { kind: "git-subdir", url, path, ref?, sha? }
{ source: "npm", package, version?, registry? } -> { kind: "npm", package, selector: version, registry? }
```

`metadata.pluginRoot` is syntactically joined before mapping relative string sources. `validateCatalogRelativePath(path: unknown, pointer: string): string` and `jsonPointer(...segments): string` live in `src/formats/marketplace-reader-support.ts`; they are pure string helpers and use RFC 6901 escaping. The reader stores exact foreign source objects in provenance even when normalization synthesizes a GitHub URL or maps `version` to `selector`.

Malformed known nested runtime or dependency declarations invalidate the complete entry. Unknown behavior-neutral fields become `claude.<field>` retained metadata. Known runtime fields (`skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`, `settings`, `outputStyles`) and dependency fields (`dependencies`, `plugins`) become raw declarations without verdicts.

**Acceptance criteria**:
- [ ] The adjacent `nklisch-skills` catalog shape normalizes all valid entries, including string paths, `git-subdir`, policy, tags, and default `strict: true` authority.
- [ ] `strict: false` produces optional-manifest/catalog-authoritative metadata without fabricating a plugin bundle; explicit/default strict claims are distinguishable by provenance.
- [ ] JSON syntax and root identity/schema failures throw `MARKETPLACE_ROOT_INVALID`; malformed entries return error diagnostics and valid siblings.
- [ ] Invalid relative syntax, source objects, nested runtime/dependency declarations, or duplicate surviving names never produce partial entries.
- [ ] Every claim pointer identifies the exact root/entry/nested field and preserves the raw declaration.

### Unit 3: Codex marketplace reader

**Story**: `epic-foreign-plugin-model-marketplace-ingestion-codex-reader`

**Files**:
- `src/formats/codex/marketplace-reader.ts`
- `test/formats/codex/marketplace-reader.test.ts`
- `test/fixtures/marketplaces/codex-valid.json`
- `test/fixtures/marketplaces/codex-partial.json`

```typescript
// src/formats/codex/marketplace-reader.ts
import type { MarketplaceReadResult } from "../../domain/marketplace.js";
import type { MarketplaceReaderOptions } from "../claude/marketplace-reader.js";

export const CODEX_MARKETPLACE_PATH = ".agents/plugins/marketplace.json";

export function readCodexMarketplace(
  input: unknown,
  options?: MarketplaceReaderOptions,
): MarketplaceReadResult;

export function readCodexMarketplaceJson(
  json: string,
  options?: MarketplaceReaderOptions,
): MarketplaceReadResult;
```

Move `MarketplaceReaderOptions` to `marketplace-reader-support.ts` if importing the Claude reader creates an avoidable host dependency; the final readers must share support, not import one another. Codex source mapping is:

```text
"./path"                                      -> { kind: "marketplace-path", path } (Claude-compatible catalog path)
{ source: "local", path }                    -> { kind: "marketplace-path", path }
{ source: "git-subdir", url, path, ref?, sha? } -> { kind: "git-subdir", url, path, ref?, sha? }
```

Private schemas require Codex `policy.installation` and map `AVAILABLE`, `INSTALLED_BY_DEFAULT`, and `NOT_AVAILABLE` to the domain availability registry. Known source and policy objects are strict; root/entry objects use controlled passthrough for retained metadata. `authentication` remains a claimed string because compatibility policy, not ingestion, decides its effect. Codex authority is synthesized as manifest-required/catalog-supplemental from the whole entry declaration. Codex interface/category/tags are retained host-qualified metadata. Known entry-level runtime/dependency declarations are retained raw and malformed nested declarations drop the entry.

`readCodexMarketplaceJson` uses the same root-fatal mapping and pointer utility as Claude. It does not read `.codex/config.toml`; foreign user-state adoption is a later lifecycle feature and is not catalog ingestion.

**Acceptance criteria**:
- [ ] Native `local` and `git-subdir` declarations plus the documented Claude-compatible string path normalize into shared domain entries.
- [ ] All three installation states map exactly; missing/unknown installation policy drops only the entry.
- [ ] Codex entries always carry manifest-required/catalog-supplemental authority and cannot carry Claude strictness.
- [ ] Runtime/dependency declarations and presentation metadata remain auditable without receiving compatibility verdicts.
- [ ] Raw JSON, root, entry isolation, path syntax, and JSON Pointer behavior match Claude reader semantics.

### Unit 4: Deterministic dual-catalog merger and architecture boundary

**Story**: `epic-foreign-plugin-model-marketplace-ingestion-dual-catalog-merge`

**Files**:
- `src/formats/marketplace-merger.ts`
- `.dependency-cruiser.cjs`
- `test/formats/marketplace-merger.test.ts`
- `test/tooling/boundaries.test.ts`
- `test/fixtures/marketplaces/dual-equivalent/`
- `test/fixtures/marketplaces/dual-conflicting/`

```typescript
// src/formats/marketplace-merger.ts
import type {
  MarketplaceReadResult,
  NormalizedMarketplace,
  NormalizedMarketplaceEntry,
} from "../domain/marketplace.js";

export type MarketplaceCatalogInput = Readonly<{
  nativeHost: "claude" | "codex";
  result: MarketplaceReadResult;
}>;

export function mergeMarketplaces(
  inputs: readonly [MarketplaceCatalogInput, ...MarketplaceCatalogInput[]],
): MarketplaceReadResult;

export function mergeMarketplaceEntries(
  marketplaceName: string,
  left: NormalizedMarketplaceEntry,
  right: NormalizedMarketplaceEntry,
): NormalizedMarketplaceEntry;
```

`mergeMarketplaces` rejects duplicate host inputs, sorts by fixed host rank (`claude`, `codex`), and validates each result. Root-name disagreement throws `BoundaryError(MARKETPLACE_ROOT_INVALID)` with both claimed values and provenance in JSON-safe details. Entries are indexed by `marketplaceEntryName`; single-sided entries pass through, while overlapping entries call `mergeMarketplaceEntries`.

`mergeMarketplaceEntries` requires matching identity and canonical `serializePluginSource` bytes. It merges equivalent source/version/description/policy claims and raw provenance; combines unique authority records, declarations, and host-qualified metadata in host/pointer order; and re-parses the result with `NormalizedMarketplaceEntrySchema`. Any conflict becomes an error diagnostic containing both source locations and drops the conflicting entry while siblings remain. Existing reader diagnostics precede merge diagnostics in canonical host order. Final entries sort by `identity.value.marketplaceEntryName` so output does not depend on catalog array or caller order.

The dedicated module must not be reused for dual manifests. Bundle ingestion will own a separate `manifest-merger.ts` because catalog identity/source/policy authority and manifest component reconciliation have different fatality and precedence rules.

Dependency-cruiser adds `formats-no-outer-or-node-imports`: `src/formats/**` may import `src/domain/**` and sibling formats only, but not `src/{application,infrastructure,runtime,pi}/**` or Node built-ins. The tooling test writes representative illegal format imports and verifies the rule names.

**Acceptance criteria**:
- [ ] Equivalent dual catalogs produce byte-for-byte equal output regardless of caller or entry order, with provenance ordered Claude then Codex.
- [ ] Different root names are root-fatal; source selector/ref/SHA differences and conflicting normalized entry claims drop only the overlapping entry and preserve siblings.
- [ ] Canonically equivalent source declarations collapse even when raw JSON shapes differ; raw declarations from both remain inspectable.
- [ ] Marketplace and manifest merger names/surfaces are separate and no merger imports infrastructure or Node.
- [ ] `npm test` runs format-boundary regression, all reader/merger tests, build, and the updated exact compiled export allowlist.

## Implementation order

1. `epic-foreign-plugin-model-marketplace-ingestion-domain-contracts`
2. In parallel after Unit 1:
   - `epic-foreign-plugin-model-marketplace-ingestion-claude-reader`
   - `epic-foreign-plugin-model-marketplace-ingestion-codex-reader`
3. `epic-foreign-plugin-model-marketplace-ingestion-dual-catalog-merge`

The two host readers have independent write ownership after the shared domain/support contract is fixed. The merger depends on both concrete outputs and integration fixtures. This yields a safe three-wave implementation rather than splitting by generic layers or padding with a test-only story.

## Error mapping

- Raw JSON `SyntaxError`, non-object root, missing/invalid root `name`, non-array `plugins`, invalid root `metadata.pluginRoot`, and duplicate surviving names throw `BoundaryError` with `MARKETPLACE_ROOT_INVALID`.
- Invalid entry shape or malformed nested runtime/dependency declarations emit `ENTRY_INVALID`; invalid entry names emit `IDENTITY_INVALID`; invalid source/path declarations emit `SOURCE_INVALID`.
- Dual root-name disagreement throws `BoundaryError(MARKETPLACE_ROOT_INVALID)` with both claims in `details`; dual entry disagreement emits `CLAIM_CONFLICT` with both claims/provenance and omits that entry.
- Reader operations are stable strings: `readClaudeMarketplaceJson`, `readClaudeMarketplace`, `readCodexMarketplaceJson`, and `readCodexMarketplace`; merger operations are `mergeMarketplaces` and `mergeMarketplaceEntries`.
- Root exceptions retain native `cause` for logs. Diagnostics are parsed through `DiagnosticSchema`, are JSON-safe, and never serialize `cause`.

## Testing

- **Domain contract tests**: schema/type agreement, authority invariants, unique identities/hosts/metadata keys, unresolved-versus-resolved source separation, and exact public exports.
- **Reader fixture tables**: valid minimal/full roots, every source shape, strict default/false, every availability state, metadata, runtime/dependency retention, malformed raw JSON, malformed root, malformed entry, nested malformed declaration, path traversal syntax, duplicate names, and valid siblings around failures.
- **Provenance golden assertions**: escaped pointer segments, source selector pointers, synthesized default provenance, exact raw declaration payloads, and derived identity provenance from root plus entry name.
- **Merger tests**: caller/array-order permutation, canonical source equivalence, selector conflict, root conflict, version/description/policy conflict, complementary metadata/declarations, single-sided entries, diagnostic ordering, and sibling survival.
- **Boundary seam**: dependency-cruiser and committed generated violation fixtures prove format code cannot import `node:fs`, infrastructure, application, runtime, or Pi.
- **Package seam**: source-level imports plus built ESM exact allowlist prove only intended marketplace domain contracts are public; host-private schemas and helpers remain internal.

## Risks

- **Riskiest assumption — verified foreign schemas remain stable**: Codex's format is young and Claude's marketplace fields evolve. Mitigation: host-private strict schemas, committed real-shaped fixtures, retained raw declarations, and one shared stable output. Fallback: update only the affected reader and add a fixture; do not widen domain contracts to raw host unions.
- **Authority could be applied too early**: Treating `strict: false` as permission to construct a bundle during catalog reading would bypass complete inventory validation. Mitigation: authority is data only; no `NormalizedPlugin` or compatibility verdict can be emitted here.
- **Canonical equivalence may erase meaningful selector intent**: If source equality ignores selectors, two catalogs can resolve different content. Mitigation: existing `serializePluginSource` includes `ref`, `sha`, and npm selector. Any discovered omission must be fixed in the source contract before merger release.
- **Partial success can hide a broken plugin**: Consumers might ignore diagnostics and show only surviving entries. Mitigation: `MarketplaceReadResult` always carries diagnostics alongside the marketplace, conflicting/malformed entries are absent, and application presentation must expose diagnostics. There is intentionally no partial entry.
- **Path syntax can be mistaken for containment proof**: Lexical `./` checks do not defeat symlink escape. Mitigation: name the helper `validateCatalogRelativePath`, document it as syntax-only, and reserve realpath/containment for materialization and bundle ingestion.
- **Least certainty — unknown catalog fields**: A future unknown field may be runtime-bearing. Mitigation: known runtime/dependency registries are explicit and raw declarations survive; unknown fields remain host-qualified and auditable rather than discarded. Compatibility may conservatively reclassify them after format verification.

## Pre-mortem

This feature fails in production if two catalogs with different selectors merge, a malformed nested runtime declaration leaks through as a seemingly valid partial plugin, caller aliases change installed identity, or `strict: false` silently bypasses manifest/catalog conflict checks. The design prevents those outcomes with canonical source comparison, atomic entry parsing, root-declared identity only, and deferred authority resolution. If actual Codex catalog fixtures contradict the documented required policy or source set, implementation should add a verified reader variant and fixture while preserving the normalized contract; it must not weaken root identity, provenance, or no-partial-entry guarantees.

## Implementation summary

All four child stories are done:

- `epic-foreign-plugin-model-marketplace-ingestion-domain-contracts`
- `epic-foreign-plugin-model-marketplace-ingestion-claude-reader`
- `epic-foreign-plugin-model-marketplace-ingestion-codex-reader`
- `epic-foreign-plugin-model-marketplace-ingestion-dual-catalog-merge`

The implementation adds unresolved marketplace domain contracts, isolated Claude and Codex catalog readers, shared provenance/path support, deterministic dual-catalog reconciliation, and executable format-boundary rules. The only noted adjustment accepts both documented `plugin` and `./plugin` Git-subdirectory paths because the verified `nklisch-skills` catalog uses the former.

Integrated verification: `npm test` passes 174 tests plus typecheck, dependency boundaries, build, and exact 90-export compiled package import.

## Other agent review

- Invoked because: completed format-boundary feature requires deep two-model review.
- Phase 1 — completeness: Z.AI GLM 5.2 xhigh, five-pass convergence. Verified all stated criteria and identified committed fixtures that were not exercised.
- Phase 2 — adversarial: fresh-context GPT-5.6 Sol high, five-pass convergence. Reproduced shallow nested-declaration validation, subdirectory alias conflict, invalid root pointer semantics, dropped metadata, loose GitHub shorthand, shifted duplicate locations, mislabeled merger inputs, and the dead-fixture gap.
- Accepted: every blocker and important finding; they affect documented compatibility, provenance, and deterministic reconciliation and are tracked by `epic-foreign-plugin-model-marketplace-ingestion-review-hardening`.
- Rejected/deferred: comment wording, redundant set entries, function ordering, and cosmetic diagnostic asymmetry have no contract impact.

## Review findings

The first four hardening stories close reader, declaration, RFC 6901, host, grammar, pointer-identity, and direct-merge findings. Certification then reproduced incomplete provenance for paths derived from `metadata.pluginRoot` and silent loss of conflicting declarations at one location. They are tracked by `epic-foreign-plugin-model-marketplace-ingestion-review-hardening-5`; the feature remains at `stage: implementing` until both close.
