---
id: epic-foreign-plugin-model-domain-contracts
kind: feature
stage: review
tags: [compatibility, infra]
parent: epic-foreign-plugin-model
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-12
---

# Canonical Foreign Plugin Contracts

## Brief

Establish the TypeScript 7, ESM, Node.js 24 package and validation foundation together with the canonical vocabulary used throughout foreign-plugin ingestion. The capability covers stable marketplace and plugin identities, source declarations and resolved sources, normalized component inventories, source claims, configuration metadata, and typed boundary errors. Runtime schemas validate unknown external values while downstream types derive from the same authoritative definitions.

This feature gives every reader, materializer, and compatibility evaluator one host-independent contract with precise provenance. It does not parse a Claude or Codex catalog, acquire source content, inspect plugin files, or decide compatibility; those capabilities consume these contracts in later features.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: foundation capability — every other child feature depends directly or transitively on its canonical contracts
- Design alignment: preserve standalone operation, canonical `<plugin-name>@<marketplace-name>` identity, provenance-rich normalized claims, and fail-fast boundary validation from the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Runtime and distribution; Plugin identity; Component compatibility verdicts
- `docs/ARCHITECTURE.md` — Package shape; Domain model; Error model
- `docs/COMPATIBILITY.md` — Verdict terminology; Marketplace discovery; Plugin source forms

## Discovery and UI alignment

- **Discovery posture**: Direct-read only. The repository has no production package yet, and the foundation documents define the intended package boundaries; there was no existing implementation pattern for an exploratory agent to recover.
- **UI**: No UI surface. These are host-independent domain and package contracts, so no mockup is applicable.

## Design decisions

- **What is the contract source of truth?**: Zod 4 schemas are authoritative; exported TypeScript types use `z.infer` (and Zod brands where identity matters), and every external reader calls `safeParse`/`parse` at its boundary. No hand-maintained interface may mirror a schema-owned shape.
- **How is conditional support represented?**: Keep the three component verdicts from `SPEC.md` and `ARCHITECTURE.md`. A supported assessment may cite explicit `RuntimeRequirement` ids; an unavailable required capability makes the report non-activatable without inventing a fourth `conditional` verdict. `docs/COMPATIBILITY.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md` are rolled forward in this design commit.
- **Where does compatibility policy live?**: This feature owns the generic schemas, registries, report shape, and pure activatability derivation only. Rule instances such as which hook events or MCP capabilities Pi supports belong to `epic-foreign-plugin-model-compatibility-reporting`. Foreign-host-shaped schemas remain in `src/formats/{claude,codex}`.
- **How are declared and resolved sources separated?**: `MarketplaceSource` and `PluginSource` preserve user/foreign declarations. Materializers emit distinct `ResolvedMarketplaceSource` and `ResolvedPluginSource` values containing immutable revisions and canonical source identities; declaration selectors never masquerade as resolved revisions.
- **How are normalized values attributed?**: Use `Claimed<T>` on each normalized value, with one or more provenance records for equivalent merged declarations. A flat bundle-level claims list was rejected because consumers could not reliably associate a claim with the value it supports.
- **How are identities serialized and hashed?**: Constructors validate canonical grammar, `formatPluginKey`/`parsePluginKey` round-trip using the final `@` delimiter, and canonical source serialization uses tagged, length-prefixed `source-v1` fields. Malformed percent escapes are rejected before URL decoding. Git accepts HTTPS, `ssh://`, and common SCP-style SSH forms without changing the declaration consumed by acquisition adapters. SCP is remote-home-relative and has a distinct tagged `scp://` canonical identity from absolute `ssh://` paths; its host is lowercased while percent signs and path text remain literal. npm registries are HTTPS-only and HTTPS credentials are rejected. Source boundaries and canonical encoding reject lone UTF-16 surrogates. Hashes are branded `sha256:<64 lowercase hex>` values computed through an injected synchronous SHA-256 function, keeping Node crypto out of the domain. Resolved-source constructors recompute canonical bytes and hashes from explicit immutable fields.
- **How do readers report partial success?**: Entry-level failures return `ReadResult`/`CollectionReadResult` diagnostics with stable codes; successful `ReadResult` values carry warnings only, and failed values carry at least one error diagnostic. Readers throw a typed `BoundaryError` only when the enclosing boundary cannot be trusted or an adapter fails. Recoverable diagnostics and fatal exceptions are deliberately separate.
- **How are domain boundaries enforced?**: `dependency-cruiser` fails `npm run boundaries` when `src/domain/**` imports application, format, infrastructure, runtime, Pi, or `node:*` modules. A committed Vitest regression writes both illegal imports and asserts both rule names. Package scripts make boundary checking part of `npm test` and CI, rather than relying on convention.
- **What metadata is retained?**: Normalized, behavior-neutral metadata uses `RetainedMetadata` with JSON values and per-value provenance. Unknown runtime declarations become `RetainedForeignComponent` inventory entries for later policy assessment; readers do not label them incompatible themselves.

## Other agent review

- Invoked because: foundational, high-risk autopilot design with no prior feature-level alignment.
- Scope: one read-only Z.AI GLM 5.2 completeness pass supplied by the caller; no additional agent was dispatched because delegation explicitly prohibited nested review.
- Reviewer (Phase 1 — advisory/completeness): GLM 5.2
  - Flagged the fourth-verdict mismatch, missing schema/type SSOT, incomplete source/provenance/configuration/assessment contracts, unbranded identity and revision values, unspecified serialization, absent partial-success envelope, policy leakage, unenforced dependency boundaries, and the flat-versus-per-value provenance choice.
- Accepted:
  - Three verdicts plus explicit runtime requirements; foundation docs rolled forward consistently.
  - Zod 4 schema → inferred type → boundary parse as the generated-contract mechanism.
  - Separate declared/resolved sources, branded identities/revisions/hashes, versioned canonical serialization, per-value claims, retained metadata, configuration descriptors, assessments, and stable partial-success diagnostics.
  - Registry mechanism here, policy instances in compatibility reporting, host-shaped schemas in format adapters, and an executable dependency boundary rule.
- Rejected:
  - No substantive recommendation was rejected. `Conditional` remains useful prose in compatibility explanations, but not as a fourth machine verdict; tables instead say “Supported; requires <capability>.”
- Phase 2 adversarial review: skipped because the delegated task forbids further subagent or peer calls; the pre-mortem below provides the required local attack pass.

## Architectural choice

### Option A — schema-first cohesive domain package (chosen)

Define Zod schemas next to small pure constructors and derive every exported data type from those schemas. Keep registries for growing variant sets, canonical serialization, report derivation, and error codes inside `src/domain`; keep all host-format and I/O details outside. This makes runtime validation and compile-time contracts agree and gives later features a stable public package surface. The cost is a deliberate Zod dependency in the domain and some schema-composition ceremony.

### Option B — TypeScript-first types plus handwritten validators

Write discriminated unions and separate validation functions. This minimizes dependencies and can produce excellent static types, but duplicates every field and variant across compile-time and runtime definitions. In a foreign-input system that duplication is a drift risk and violates the generated-contract requirement.

### Option C — generated JSON Schema contracts

Author JSON Schema and generate TypeScript plus validators. This offers language-neutral artifacts, but introduces a code-generation lifecycle before there is a cross-language consumer and makes branded constructors and pure domain behavior awkward. It is more machinery than this TypeScript-only package currently earns.

**Choice**: Option A. Zod 4 is the one runtime/type source of truth, registries own extensible variant vocabularies, and pure functions layer domain invariants over parsed values. JSON Schema emission can be added later from Zod if an actual external consumer appears.

## Trickiest unit first

The source identity unit is riskiest because cache and trust identity will eventually depend on byte-for-byte stability while local paths, Git selectors, npm selectors, and immutable revisions have different semantics. The design therefore separates declarations from resolutions, prohibits environment-dependent canonicalization in the domain, defines a versioned injective serialization grammar, and injects hashing. Materializers must supply already-resolved canonical URLs/checkout identities and revisions; the domain never calls filesystem, Git, npm, process, or time APIs.

## Implementation units

### Unit 1: Package, compiler, schema, and dependency-boundary foundation

**Story**: `epic-foreign-plugin-model-domain-contracts-package-schema-foundation`

**Files**:
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `.dependency-cruiser.cjs`
- `src/domain/schema.ts`
- `test/domain/schema.test.ts`

`package.json` is the package/build SSOT:

```json
{
  "name": "@nklisch/pi-plugin-host",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "clean": "node --run clean:dist",
    "clean:dist": "node -e \"import('node:fs/promises').then(fs => fs.rm('dist', { recursive: true, force: true }))\"",
    "build": "npm run clean && tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "boundaries": "depcruise src --config .dependency-cruiser.cjs",
    "test:unit": "vitest run",
    "test": "npm run typecheck && npm run boundaries && npm run test:unit"
  },
  "dependencies": { "zod": "^4.0.0" },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "dependency-cruiser": "^17.0.0",
    "typescript": ">=7.0.0 <8",
    "vitest": "^4.0.0"
  }
}
```

`tsconfig.json` uses `target: "ES2024"`, `module`/`moduleResolution: "NodeNext"`, `rootDir: "src"`, declaration and source maps, `outDir: "dist"`, `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`, and includes `src/**/*.ts`; tests are typechecked by a separate no-emit project override in `vitest.config.ts`/the test runner rather than emitted into `dist`.

```typescript
// src/domain/schema.ts
import { z } from "zod";

export const JsonValueSchema: z.ZodType<JsonValue>;
export type JsonValue =
  | null | boolean | number | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export function schemaValues<
  T extends Record<string, z.ZodTypeAny>,
>(registry: T): [T[keyof T], ...T[keyof T][]];

export function nonEmptyReadonly<T>(values: readonly T[]): readonly [T, ...T[]];
```

`schemaValues` throws when given an empty registry, making a broken discriminated-union registry fail at module initialization. `.dependency-cruiser.cjs` prohibits imports from `src/domain/**` to `src/{application,formats,infrastructure,runtime,pi}/**`, all `node:` built-ins, and undeclared package dependencies; it also reports circular imports.

**Acceptance criteria**:
- [ ] Node 24 can import the compiled ESM root and consumers receive declarations.
- [ ] `npm test` runs typecheck, architecture rules, and Vitest; package scripts contain no second test path that bypasses boundaries.
- [ ] A fixture import from `src/domain` to `node:fs` or `src/infrastructure` makes the dependency rule fail.
- [ ] A representative Zod schema infers its public type; no mirrored interface is used.

### Unit 2: Identity and canonical source contracts

**Story**: `epic-foreign-plugin-model-domain-contracts-identity-source-contracts`

**Files**:
- `src/domain/identity.ts`
- `src/domain/source.ts`
- `test/domain/identity.test.ts`
- `test/domain/source.test.ts`

```typescript
// src/domain/identity.ts
import { z } from "zod";

export const MarketplaceNameSchema = z.string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
  .brand<"MarketplaceName">();
export type MarketplaceName = z.infer<typeof MarketplaceNameSchema>;

export const PluginNameSchema = z.string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
  .brand<"PluginName">();
export type PluginName = z.infer<typeof PluginNameSchema>;

export const PluginKeySchema = z.string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$/)
  .brand<"PluginKey">();
export type PluginKey = z.infer<typeof PluginKeySchema>;

export const PluginIdentitySchema = z.object({
  key: PluginKeySchema,
  marketplaceName: MarketplaceNameSchema,
  marketplaceEntryName: PluginNameSchema,
  manifestName: z.string().min(1).optional(),
}).readonly().superRefine((value, context) => {
  // value.key must equal formatPluginKey(entry, marketplace)
});
export type PluginIdentity = z.infer<typeof PluginIdentitySchema>;

export function formatPluginKey(
  plugin: PluginName,
  marketplace: MarketplaceName,
): PluginKey;
export function parsePluginKey(input: unknown): {
  plugin: PluginName;
  marketplace: MarketplaceName;
};
export function createPluginIdentity(input: unknown): PluginIdentity;
```

Names are case-sensitive and canonical as written. Whitespace, `@`, separators, and Unicode confusables are rejected at this identity boundary rather than silently normalized. `parsePluginKey` splits at the final `@` and then validates both sides; the restricted grammar keeps formatting injective.

```typescript
// src/domain/source.ts
import { z } from "zod";
```

The source registries use strict schemas. Git URL fields accept HTTPS, `ssh://`,
and common SCP-style `user@host:path` syntax. SCP declarations retain their
remote-home-relative semantics in a distinct canonical form; npm registry
fields accept HTTPS only and reject embedded credentials. Git pins use full
40-character lowercase SHA values and npm integrity uses canonical SHA-512
base64. Unknown source fields fail parsing.

Resolved source variants retain explicit immutable identity fields (including
Git URL and subdirectory where applicable) alongside the canonical bytes and
hash. The schema checks that the canonical kind and fields agree. Constructors
and verifiers are the only domain entry points for materializer results:

```typescript
export function createResolvedMarketplaceSource(
  input: unknown, sha256: Sha256,
): ResolvedMarketplaceSource;
export function verifyResolvedMarketplaceSource(
  input: unknown, sha256: Sha256,
): ResolvedMarketplaceSource;
export function createResolvedPluginSource(
  input: unknown, sha256: Sha256,
): ResolvedPluginSource;
export function verifyResolvedPluginSource(
  input: unknown, sha256: Sha256,
): ResolvedPluginSource;
```

`createResolved*` derives canonical bytes from immutable fields and computes the
hash through the injected port; `verifyResolved*` recomputes the hash. Neither
function performs filesystem, Git, npm, process, or network resolution.

Canonical serialization is `source-v1|<kind>|<field-name>:<UTF-8-byte-length>:<field-value>...` with fields in the registry-defined order, absent optionals omitted, URL scheme/host lowercased, default HTTPS port removed, and path segments percent-encoded. Canonical validation accepts only known kinds and the exact ordered field signatures emitted by the package, with positive canonical decimal lengths and non-empty values. Malformed percent escapes are rejected before URL decoding, so encoded delimiters cannot alias distinct values. Git schemas accept HTTPS, `ssh://`, and common SCP-style `user@host:path` forms; SCP is represented distinctly as a remote-home-relative tagged `scp://` identity with literal percent/path semantics and a lowercased host, while `ssh://` remains absolute. npm registries are HTTPS-only and embedded HTTPS credentials are rejected. Declared source objects are strict and preserve their acquisition-facing values. It does not resolve refs, filesystem paths, symlinks, semver, or redirects. Resolved schemas require the materializer's immutable result; their `canonical` value serializes explicit resolved identity fields and immutable revisions, not the original selector. `createResolved*` and `verifyResolved*` recompute canonical bytes and an injected SHA-256 hash, rejecting kind/canonical/hash mismatches. `hashCanonicalSource` rejects hash functions that do not return exactly 32 bytes.

**Acceptance criteria**:
- [ ] Identity constructors reject malformed/non-canonical names and inconsistent `PluginIdentity.key` values.
- [ ] `parsePluginKey(formatPluginKey(p, m))` round-trips every valid generated identity.
- [ ] Every declared and resolved source variant parses through one registry-derived union and receives exhaustive type narrowing.
- [ ] Serialization golden vectors prove field-boundary ambiguity, key order, omitted optionals, Unicode byte lengths, URL normalization, and source variants cannot collide.
- [ ] Declaration selectors and immutable revisions are distinct branded fields; a declaration cannot typecheck where a resolved source is required.
- [ ] Hash golden vectors include an injected test SHA-256 and reject non-32-byte output without importing `node:crypto` in domain code.

### Unit 3: Provenance, configuration, and normalized inventory contracts

**Story**: `epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts`

**Files**:
- `src/domain/provenance.ts`
- `src/domain/configuration.ts`
- `src/domain/components.ts`
- `src/domain/plugin.ts`
- `test/domain/provenance.test.ts`
- `test/domain/configuration.test.ts`
- `test/domain/components.test.ts`
- `test/domain/plugin.test.ts`

```typescript
// src/domain/provenance.ts
import { z } from "zod";
import { JsonValueSchema } from "./schema.js";

export const NativeHostSchema = z.enum(["claude", "codex"]);
export const SourceDocumentKindSchema = z.enum([
  "marketplace", "manifest", "hooks", "mcp", "skill", "convention",
]);
export const SourceLocationSchema = z.object({
  host: NativeHostSchema,
  documentKind: SourceDocumentKindSchema,
  path: z.string().min(1),
  pointer: z.string().startsWith("/").optional(),
  line: z.number().int().positive().optional(),
  column: z.number().int().positive().optional(),
}).readonly();
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const ProvenanceSchema = z.object({
  location: SourceLocationSchema,
  declaration: JsonValueSchema.optional(),
}).readonly();
export type Provenance = z.infer<typeof ProvenanceSchema>;

export function ClaimedSchema<T extends z.ZodTypeAny>(value: T): z.ZodObject<{
  value: T;
  provenance: z.ZodReadonly<z.ZodArray<typeof ProvenanceSchema>>;
}>;
export type Claimed<T> = Readonly<{
  value: T;
  provenance: readonly [Provenance, ...Provenance[]];
}>;
export function claim<T>(value: T, provenance: Provenance): Claimed<T>;
export function mergeEquivalentClaims<T>(
  left: Claimed<T>, right: Claimed<T>, equals?: (a: T, b: T) => boolean,
): Claimed<T>;
```

`ClaimedSchema` enforces non-empty provenance. `mergeEquivalentClaims` throws `ClaimConflictError` when values differ; it deduplicates identical source locations in first-seen order. `ClaimConflictError` extends the common `DomainContractError` through a dependency-neutral error module, keeps both typed claims, and projects safe snapshots of both into diagnostic details.

```typescript
// src/domain/configuration.ts
export const ConfigurationValueKindRegistry = {
  string: { tag: "string" }, number: { tag: "number" }, boolean: { tag: "boolean" },
  directory: { tag: "directory" }, file: { tag: "file" }, strings: { tag: "strings" },
} as const;

export const ConfigurationOptionSchema = z.object({
  key: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  label: ClaimedSchema(z.string().min(1)),
  description: ClaimedSchema(z.string()).optional(),
  value: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("string"), default: z.string().optional(), pattern: z.string().optional() }),
    z.object({ kind: z.literal("number"), default: z.number().finite().optional(), min: z.number().finite().optional(), max: z.number().finite().optional() }),
    z.object({ kind: z.literal("boolean"), default: z.boolean().optional() }),
    z.object({ kind: z.literal("directory"), default: z.string().optional(), mustExist: z.boolean().default(true) }),
    z.object({ kind: z.literal("file"), default: z.string().optional(), mustExist: z.boolean().default(true) }),
    z.object({ kind: z.literal("strings"), default: z.array(z.string()).readonly().optional(), minItems: z.number().int().nonnegative().optional(), maxItems: z.number().int().nonnegative().optional() }),
  ]),
  required: z.boolean(),
  sensitive: z.boolean(),
  provenance: z.array(ProvenanceSchema).nonempty().readonly(),
}).readonly().superRefine(/* min <= max, defaults satisfy declared scalar bounds */);
export type ConfigurationOption = z.infer<typeof ConfigurationOptionSchema>;
export const PluginConfigurationSchema = z.object({
  options: z.array(ConfigurationOptionSchema).readonly(),
}).readonly().superRefine(/* unique keys */);
export type PluginConfiguration = z.infer<typeof PluginConfigurationSchema>;
```

Configuration describes accepted values only; it never stores configured or secret values. Filesystem existence checks occur later through an application port.

```typescript
// src/domain/components.ts
export const ComponentKindRegistry = {
  skill: { tag: "skill", label: "Skill" },
  hook: { tag: "hook", label: "Hook" },
  mcpServer: { tag: "mcp-server", label: "MCP server" },
  foreign: { tag: "foreign", label: "Foreign component" },
} as const;
export const ComponentIdSchema = z.string().min(1).brand<"ComponentId">();
export type ComponentId = z.infer<typeof ComponentIdSchema>;

export const RetainedMetadataSchema = z.object({
  key: z.string().min(1),
  claimed: ClaimedSchema(JsonValueSchema),
}).readonly();
export type RetainedMetadata = z.infer<typeof RetainedMetadataSchema>;

export const SkillComponentSchema = z.object({ kind: z.literal("skill"), id: ComponentIdSchema,
  name: ClaimedSchema(z.string().min(1)), root: ClaimedSchema(z.string().min(1)),
  metadata: z.array(RetainedMetadataSchema).readonly() });
export const HookComponentSchema = z.object({ kind: z.literal("hook"), id: ComponentIdSchema,
  event: ClaimedSchema(z.string().min(1)), matcher: ClaimedSchema(z.string()).optional(),
  handler: ClaimedSchema(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("shell"), command: z.string().min(1), timeoutMs: z.number().int().positive().optional() }),
    z.object({ kind: z.literal("exec"), command: z.string().min(1), args: z.array(z.string()).readonly(), timeoutMs: z.number().int().positive().optional() }),
  ])), metadata: z.array(RetainedMetadataSchema).readonly() });
export const McpServerComponentSchema = z.object({ kind: z.literal("mcp-server"), id: ComponentIdSchema,
  nativeKey: ClaimedSchema(z.string().min(1)), declaration: ClaimedSchema(JsonValueSchema),
  metadata: z.array(RetainedMetadataSchema).readonly() });
export const ForeignComponentSchema = z.object({ kind: z.literal("foreign"), id: ComponentIdSchema,
  nativeHost: NativeHostSchema, nativeKind: ClaimedSchema(z.string().min(1)),
  declaration: ClaimedSchema(JsonValueSchema) });
export const ComponentSchema = z.discriminatedUnion("kind", [
  SkillComponentSchema, HookComponentSchema, McpServerComponentSchema, ForeignComponentSchema,
]);
export type Component = z.infer<typeof ComponentSchema>;

export const PluginComponentsSchema = z.object({
  skills: z.array(SkillComponentSchema).readonly(),
  hooks: z.array(HookComponentSchema).readonly(),
  mcpServers: z.array(McpServerComponentSchema).readonly(),
  foreign: z.array(ForeignComponentSchema).readonly(),
}).readonly().superRefine(/* ComponentId uniqueness across all arrays */);
export type PluginComponents = z.infer<typeof PluginComponentsSchema>;
export function flattenComponents(components: PluginComponents): readonly Component[];
```

MCP declarations intentionally remain normalized JSON claims at this layer; transport/capability policy and runtime projections are designed by compatibility reporting and MCP integration. Format-specific aliases and raw field names remain in readers.

```typescript
// src/domain/plugin.ts
export const NormalizedPluginSchema = z.object({
  identity: PluginIdentitySchema,
  version: ClaimedSchema(z.string().min(1)).optional(),
  description: ClaimedSchema(z.string()).optional(),
  source: ResolvedPluginSourceSchema,
  configuration: PluginConfigurationSchema,
  components: PluginComponentsSchema,
  metadata: z.array(RetainedMetadataSchema).readonly(),
}).readonly();
export type NormalizedPlugin = z.infer<typeof NormalizedPluginSchema>;
```

**Acceptance criteria**:
- [ ] Every normalized scalar or retained declaration can identify at least one source document and field/location; merged equivalent values retain both provenances.
- [ ] Conflicting claimed values fail explicitly rather than silently choosing Claude or Codex.
- [ ] Configuration rejects duplicate keys, invalid bounds/defaults, empty provenance, and secret/configured values outside the descriptor contract.
- [ ] Component ids are unique bundle-wide and variant lists/types derive from the registries/schemas.
- [ ] Unknown native runtime declarations remain inspectable as `foreign` components without a reader assigning a compatibility verdict.
- [ ] `NormalizedPluginSchema.parse` demonstrates runtime parsing and its exported type is `z.infer`-derived.

### Unit 4: Compatibility mechanism, diagnostics, and public API

**Story**: `epic-foreign-plugin-model-domain-contracts-compatibility-errors-api`

**Files**:
- `src/domain/compatibility.ts`
- `src/domain/errors.ts`
- `src/index.ts`
- `test/domain/compatibility.test.ts`
- `test/domain/errors.test.ts`
- `test/public-api.test.ts`

```typescript
// src/domain/compatibility.ts
export const ComponentVerdictRegistry = {
  supported: { tag: "supported", label: "Supported", blocksActivation: false },
  metadataOnly: { tag: "metadata-only", label: "Metadata only", blocksActivation: false },
  incompatible: { tag: "incompatible", label: "Incompatible", blocksActivation: true },
} as const;
export const RuntimeRequirementStatusRegistry = {
  available: { tag: "available", blocksActivation: false },
  unavailable: { tag: "unavailable", blocksActivation: true },
} as const;

export const RuntimeRequirementIdSchema = z.string().min(1).brand<"RuntimeRequirementId">();
export const RuntimeRequirementSchema = z.object({
  id: RuntimeRequirementIdSchema,
  capability: z.string().min(1),
  description: z.string().min(1),
  provenance: z.array(ProvenanceSchema).readonly(),
}).readonly();
export type RuntimeRequirement = z.infer<typeof RuntimeRequirementSchema>;

export const RuntimeRequirementAssessmentSchema = z.object({
  requirement: RuntimeRequirementSchema,
  status: z.enum(["available", "unavailable"]),
  explanation: z.string().min(1),
}).readonly();
export type RuntimeRequirementAssessment = z.infer<typeof RuntimeRequirementAssessmentSchema>;

export const ComponentVerdictSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("supported") }),
  z.object({ kind: z.literal("metadata-only"), reason: z.string().min(1) }),
  z.object({ kind: z.literal("incompatible"), reason: z.string().min(1) }),
]);
export type ComponentVerdict = z.infer<typeof ComponentVerdictSchema>;

export const ComponentAssessmentSchema = z.object({
  componentId: ComponentIdSchema,
  verdict: ComponentVerdictSchema,
  requirementIds: z.array(RuntimeRequirementIdSchema).readonly(),
  diagnostics: z.array(z.lazy(() => DiagnosticSchema)).readonly(),
}).readonly();
export type ComponentAssessment = z.infer<typeof ComponentAssessmentSchema>;

export const CompatibilityReportSchema = z.object({
  plugin: PluginIdentitySchema,
  activatable: z.boolean(),
  components: z.array(ComponentAssessmentSchema).readonly(),
  requirements: z.array(RuntimeRequirementAssessmentSchema).readonly(),
  diagnostics: z.array(z.lazy(() => DiagnosticSchema)).readonly(),
}).readonly().superRefine(/* unique ids, valid refs, activatable equals deriveActivatable */);
export type CompatibilityReport = z.infer<typeof CompatibilityReportSchema>;

export function deriveActivatable(input: Readonly<{
  components: readonly ComponentAssessment[];
  requirements: readonly RuntimeRequirementAssessment[];
}>): boolean;
export function createCompatibilityReport(input: unknown): CompatibilityReport;
```

`deriveActivatable` returns false for any incompatible component or unavailable requirement referenced by a supported component. Metadata-only components cannot cite runtime requirements. The registry supplies labels and blocking behavior; later policy code supplies the actual assessments and requirement capability keys.

```typescript
// src/domain/errors.ts
export const ErrorCodeRegistry = {
  schemaInvalid: "SCHEMA_INVALID",
  entryInvalid: "ENTRY_INVALID",
  identityInvalid: "IDENTITY_INVALID",
  sourceInvalid: "SOURCE_INVALID",
  claimConflict: "CLAIM_CONFLICT",
  unsupportedDeclaration: "UNSUPPORTED_DECLARATION",
  requirementUnavailable: "REQUIREMENT_UNAVAILABLE",
  marketplaceRootInvalid: "MARKETPLACE_ROOT_INVALID",
  manifestRootInvalid: "MANIFEST_ROOT_INVALID",
  sourceResolutionFailed: "SOURCE_RESOLUTION_FAILED",
  pathContainmentFailed: "PATH_CONTAINMENT_FAILED",
  adapterFailed: "ADAPTER_FAILED",
} as const;
export const ErrorCodeSchema = z.enum([
  ErrorCodeRegistry.schemaInvalid, ErrorCodeRegistry.entryInvalid,
  ErrorCodeRegistry.identityInvalid, ErrorCodeRegistry.sourceInvalid,
  ErrorCodeRegistry.claimConflict, ErrorCodeRegistry.unsupportedDeclaration,
  ErrorCodeRegistry.requirementUnavailable, ErrorCodeRegistry.marketplaceRootInvalid,
  ErrorCodeRegistry.manifestRootInvalid, ErrorCodeRegistry.sourceResolutionFailed,
  ErrorCodeRegistry.pathContainmentFailed, ErrorCodeRegistry.adapterFailed,
]);
export const FatalBoundaryCodeSchema = z.enum([
  ErrorCodeRegistry.marketplaceRootInvalid,
  ErrorCodeRegistry.manifestRootInvalid,
  ErrorCodeRegistry.sourceResolutionFailed,
  ErrorCodeRegistry.pathContainmentFailed,
  ErrorCodeRegistry.adapterFailed,
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type FatalBoundaryCode = z.infer<typeof FatalBoundaryCodeSchema>;

export const DiagnosticSchema = z.object({
  code: ErrorCodeSchema,
  severity: z.enum(["warning", "error"]),
  operation: z.string().min(1),
  message: z.string().min(1),
  location: SourceLocationSchema.optional(),
  plugin: PluginKeySchema.optional(),
  details: JsonValueSchema.optional(),
}).readonly();
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

export const ReadResultSchema = <T extends z.ZodTypeAny>(value: T) => z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value, diagnostics: z.array(DiagnosticSchema).readonly() }),
  z.object({ ok: z.literal(false), diagnostics: z.array(DiagnosticSchema).min(1).readonly() }),
]);
export type ReadResult<T> =
  | Readonly<{ ok: true; value: T; diagnostics: readonly Diagnostic[] }>
  | Readonly<{ ok: false; diagnostics: readonly [Diagnostic, ...Diagnostic[]] }>;
export type CollectionReadResult<T> = Readonly<{
  items: readonly T[];
  diagnostics: readonly Diagnostic[];
}>;

export class DomainContractError extends Error {
  readonly code: ErrorCode;
  readonly operation: string;
  readonly location?: SourceLocation;
  readonly plugin?: PluginKey;
  readonly details?: JsonValue;
  constructor(input: Readonly<{
    code: ErrorCode;
    operation: string;
    message: string;
    location?: SourceLocation;
    plugin?: PluginKey;
    details?: JsonValue;
    cause?: unknown;
  }>);
  toDiagnostic(): Diagnostic;
}
export class BoundaryError extends DomainContractError {
  constructor(input: Readonly<{
    code: FatalBoundaryCode;
    operation: string;
    message: string;
    location?: SourceLocation;
    plugin?: PluginKey;
    details?: JsonValue;
    cause?: unknown;
  }>);
}
export class ClaimConflictError<T = unknown> extends DomainContractError {
  readonly left: Claimed<T>;
  readonly right: Claimed<T>;
  constructor(left: Claimed<T>, right: Claimed<T>);
}
export function diagnosticFromZodError(
  error: z.ZodError,
  context: Readonly<{ operation: string; location?: SourceLocation; plugin?: PluginKey }>,
): Diagnostic;
```

The thrown error retains `cause` for logs through native `ErrorOptions` but serializable diagnostics omit it. `CollectionReadResult` permits valid siblings plus diagnostics; a reader throws only if its enclosing root identity/schema cannot be trusted or an infrastructure adapter failed. `ReadResultSchema` enforces warning-only diagnostics for successful values and at least one error diagnostic for failures. `src/index.ts` explicitly re-exports public schemas, inferred types, registries, constructors, serializers, and result/error contracts; a compiled-package regression test enforces the exact runtime export allowlist.

**Acceptance criteria**:
- [ ] Exactly `supported`, `metadata-only`, and `incompatible` parse as component verdicts; `conditional` is rejected.
- [ ] A supported component with an unavailable referenced requirement makes the report non-activatable, while an unreferenced unavailable optional capability does not.
- [ ] Missing requirement references, duplicate ids, metadata-only requirements, or a caller-supplied incorrect `activatable` value fail report construction.
- [ ] Partial collection results preserve valid siblings and stable source-located diagnostics; fatal root failures are typed thrown errors with `cause` omitted from serialization.
- [ ] Error/diagnostic codes derive from one registry and unknown codes fail runtime parsing.
- [ ] A test imports every intended public symbol from `src/index.ts`; no format, filesystem, Git, npm, Pi, process, or time type leaks through the public domain API.

## Implementation order

1. `epic-foreign-plugin-model-domain-contracts-package-schema-foundation`
2. `epic-foreign-plugin-model-domain-contracts-identity-source-contracts`
3. `epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts`
4. `epic-foreign-plugin-model-domain-contracts-compatibility-errors-api`

The sequence is intentionally narrow. Package/schema tooling must exist before domain code; provenance and inventory use identity/source contracts; compatibility assessments and the public barrel require the complete inventory. This is multi-session foundational work with real dependency edges, so four stories provide safer resume and review boundaries than one large implementation stride.

## Testing

- **Unit tests** mirror `src/domain` under `test/domain` and use table-driven valid/invalid values plus property-style loops over every registry variant. No filesystem, Git, npm, Pi, clock, process, or network fixture belongs in these tests.
- **Golden vectors** lock identity parse/format, canonical source bytes, and source hashes. Include delimiter-like values, UTF-8, reordered object input, omitted optionals, URL case/default ports, every source kind, and resolved revision forms.
- **Schema/type agreement** uses runtime parse assertions and compile-time `expectTypeOf` checks. Tests import inferred exported types rather than declaring mirror fixture interfaces.
- **Error seams** exercise recoverable entry diagnostics separately from fatal root `BoundaryError`; tests prove causes stay available to logs but never appear in diagnostic JSON.
- **Architecture seam** runs dependency-cruiser in `npm test`; its rule fixtures prove domain-to-infrastructure and domain-to-Node imports fail while domain-to-Zod imports pass.
- **Public seam** imports only from `src/index.ts`, validates explicit exports, and builds/loads `dist/index.js` under Node 24.

## Risks

- **Riskiest assumption — source canonicalization is stable enough for trust/cache identity**: URL and path normalization can accidentally alias distinct sources or distinguish equivalents. Mitigation: versioned length-prefixed grammar, golden vectors, no environment-dependent realpath/ref/semver work in domain, and immutable resolved-source schemas. Fallback: increment the serialization tag (for example `source-v2`) and migrate stored identities explicitly; never silently change `source-v1` bytes.
- **Zod/TypeScript 7 compatibility**: TypeScript 7 may expose dependency typing issues. Mitigation: pin supported major ranges in the lockfile, compile a representative branded/discriminated schema first, and keep schema helpers narrow. Fallback: pin the latest compatible Zod 4 minor; do not fork or duplicate contracts.
- **Over-normalizing before policy exists**: Hook and MCP fields could lose semantics compatibility reporting needs. Mitigation: normalized common fields retain full JSON declarations with per-value provenance, and foreign shapes stay isolated in format readers. Later policy can add a domain-neutral projection without changing raw reader schemas.
- **Claim verbosity and memory**: Per-value provenance is larger than a flat list. This is intentional for precise conflicts and trust presentation. Deduplicate source locations during merges; optimize only after measurement.
- **Error taxonomy drift**: Later features will need additional stable codes. Registries make additions centralized, but codes become persistence/API commitments. Review additions as public contract changes and never repurpose an existing code.
- **Least certainty — plugin-name grammar**: A future foreign marketplace may allow names outside the conservative ASCII grammar. Readers must surface `IDENTITY_INVALID`, not sanitize. If verified formats require broader names, introduce an escaped `plugin-key-v2` identity rather than making current parsing ambiguous.

## Pre-mortem

This design fails in production if two source declarations hash together despite different acquisition semantics, a reader discards a runtime-bearing unknown field, or compatibility code treats an unavailable runtime requirement as merely informational. The implementation guards those failure modes with injective serialization vectors, retained foreign declarations, referential report validation, and a derived—not caller-trusted—activatability value. If the source unit cannot satisfy golden-vector stability, implementation must stop before downstream source materialization and revise the serialization version; cache/trust identity must not be built on an unsettled encoding.

## Implementation summary

All four child stories are complete:

- `epic-foreign-plugin-model-domain-contracts-package-schema-foundation` — done
- `epic-foreign-plugin-model-domain-contracts-identity-source-contracts` — done
- `epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts` — done
- `epic-foreign-plugin-model-domain-contracts-compatibility-errors-api` — done

The integrated implementation delivers the TypeScript 7/Zod package foundation, enforced domain boundaries, branded identity and canonical source contracts, provenance-rich configuration and component inventories, compatibility and diagnostic mechanics, and an explicit package API. The hardening pass adds the dependency-neutral `domain-error.ts`, `error-contract.ts`, and `provenance-location.ts` modules so `ClaimConflictError` can share the common diagnostic contract without a circular import.

Verification after the implementation and hardening waves: `npm test` passed with 116 tests plus test typechecking, dependency-boundary checks, the boundary-violation regression, build, and compiled package import; `npm run build` also passed independently.

## Other agent review

- Invoked because: completed foundational feature requires deep two-phase review.
- Reviewer Phase 1 — completeness: Z.AI GLM 5.2 xhigh, four-pass convergence.
  - Confirmed a canonical malformed-percent collision, inconsistent `ClaimConflictError` hierarchy, credential retention, missing committed boundary/package probes, and stale architecture error taxonomy.
- Reviewer Phase 2 — adversarial: fresh-context GPT-5.6 Sol high, three-pass convergence.
  - Reproduced Phase 1 findings and additionally identified permissive protocols/unknown fields, weak immutable identifier validation, insufficient resolved-source consistency, and contradictory read-result severities.
- Accepted: all blocker and important findings above; they affect the trust identity and public contract and are tracked by `epic-foreign-plugin-model-domain-contracts-review-hardening`.
- Rejected or deferred: style-only observations about hex formatting, redundant parsing, and readonly ergonomics — no behavioral or contract impact at this stage.

## Review hardening implementation notes

The accepted review findings are implemented by
`epic-foreign-plugin-model-domain-contracts-review-hardening`:

- source schemas are strict and constrain Git to HTTPS/SSH (including
  distinct remote-home-relative SCP syntax), npm registries to credential-free
  HTTPS, Git pins to full 40-character lowercase revisions, and npm integrity
  to canonical SHA-512 base64;
- canonical URL normalization rejects malformed percent escapes, preserving
  injectivity for `%zz` versus `%25zz` and encoded path delimiters;
- resolved-source constructors and verifiers derive canonical bytes and hashes
  from explicit immutable fields, and schemas reject kind/canonical mismatches;
- `ClaimConflictError` now extends `DomainContractError` through a
  dependency-neutral module and safely reports both claims;
- `ReadResultSchema` enforces warning-only success and error-bearing failure;
- dependency-boundary and compiled-package import checks are committed and run
  by `npm test`, with the package runtime export allowlist checked exactly.

The foundation documents and this design now describe the hardened contract.

## Review findings

The feature was bounced once for `epic-foreign-plugin-model-domain-contracts-review-hardening`. That story is now done: canonical-source injectivity, source-security constraints, resolved-identity verification, diagnostic consistency, committed regression checks, and rolling-foundation alignment were corrected.

Post-hardening verification: `npm test` passes 116 tests plus typecheck, dependency-boundary regressions, build, compiled package import, and an exact 72-export runtime allowlist. The feature is ready for its second deep review pass.

## Adversarial review corrections

The second adversarial review identified four remaining source-contract blockers. This review-fix keeps declarations unchanged for acquisition adapters while correcting the trust identity boundary:

- SCP `user@host:path` now serializes to a distinct tagged `scp://user@host/path` canonical value. The tag preserves SCP's remote-home-relative meaning versus absolute `ssh://` paths; SCP hosts are lowercased and SCP percent signs/path text are literal.
- Source schemas and canonical parsing reject lone high or low UTF-16 surrogate code units, including defensively before UTF-8 canonical encoding, so invalid strings cannot converge through replacement characters.
- `CanonicalSourceSchema` now accepts only known kinds and exact package-produced ordered field signatures. It rejects unknown names, reordered fields, duplicate fields, empty values, zero/leading-zero lengths, non-canonical paths and URLs, and invalid immutable values.
- `SPEC.md`, `ARCHITECTURE.md`, `COMPATIBILITY.md`, and this feature's source-v1 design prose now state the SCP/SSH identity distinction and literal SCP semantics.

Mandatory regressions cover SCP-versus-SSH identity, literal malformed-percent SCP paths, high/low surrogate rejection across source fields, and invalid canonical signatures, ordering, and lengths. Review-fix verification passes: `npm test` (119 tests, typecheck, dependency boundaries, build, and compiled import), plus independent `npm run build && node test/compiled-package-import.mjs` (72-export allowlist).
