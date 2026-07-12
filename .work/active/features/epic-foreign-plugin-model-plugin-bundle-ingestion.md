---
id: epic-foreign-plugin-model-plugin-bundle-ingestion
kind: feature
stage: review
tags: [compatibility]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-source-materialization, epic-foreign-plugin-model-marketplace-ingestion]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-12
---

# Normalized Plugin Bundle Ingestion

## Brief

Inspect a materialized plugin selected from a normalized marketplace entry and produce one complete provenance-rich bundle. The capability reads Claude and Codex manifests, explicit and conventional component locations, marketplace-level declarations, supporting `userConfig`, Agent Skills layouts and frontmatter, command-hook declarations, MCP declarations, and unsupported native components without activating or executing any content.

For dual-format plugins, equivalent claims deduplicate, complementary metadata combines, and conflicts identify both source locations and make the normalized bundle invalid. Explicit paths and conventional discovery remain contained within the plugin root. This feature owns parsing, discovery, claim reconciliation, and structural validation; compatibility policy and runtime-capability decisions remain in the reporting feature.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: convergence capability consuming secure materialized content and normalized marketplace intent
- Design alignment: preserve dual-manifest conflict behavior, complete inventory, Agent Skills validation, provenance, and fail-closed unknown runtime declarations from the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Manifests; Supporting plugin configuration; Skills; Hooks; MCP servers
- `docs/ARCHITECTURE.md` — Format ingestion; Conventional discovery; Normalized bundle
- `docs/COMPATIBILITY.md` — Plugin manifests; Supporting plugin configuration; Skills; Hook handlers; MCP configuration shapes

## Discovery and UI alignment

- **Discovery posture**: Direct-read only, as explicitly required. The feature and parent, all foundation documents, project rules, completed domain/marketplace/materialization designs, current contracts under `src/{domain,application,formats,infrastructure}`, and representative tests were read locally. No nested agent or peer was dispatched.
- **Current seams**: `MaterializedPlugin` already supplies a verified resolved source, exact content root, bounded `ContentManifest`, and source/content binding. `NormalizedMarketplaceEntry` supplies identity, authority records, raw runtime declarations, and per-claim provenance. `NormalizedPlugin`, `PluginConfiguration`, `PluginComponents`, `Claimed<T>`, and `ReadResult<T>` are the target contracts; `ComponentId` currently has validation but no constructor or stable grammar.
- **Real fixture evidence**: `/home/nathan/dev/skills` at commit `8d312608113b2e64932f2a9cdb39a2995b2cb11c` contains paired Claude/Codex manifests for nine plugins. Claude manifests are metadata-only in the sampled plugins; Codex manifests explicitly point to `./skills/`, and `agile-workflow` points to `./hooks/hooks.json`. Its real hook file contains `SessionStart`, `UserPromptSubmit`, `PostCompact`, and `PostToolUse` command handlers with optional matchers and timeouts. Real `SKILL.md` files use bounded YAML frontmatter, folded descriptions, and supporting subtrees; Codex presentation files use `skills/<name>/agents/openai.yaml` with `interface` and `policy`. No real `.mcp.json` or `userConfig` fixture exists in that repository, so those contracts require independent adversarial fixtures rather than invented claims about the real bundle.
- **UI**: No UI surface. This is a host-independent ingestion boundary; no mockup applies.

## Design decisions

- **Where does orchestration live?**: `PluginInspectionService` lives in the application layer and depends on two inward-facing ports: `ContentReadPort` for bounded reads and `BundleReaderSet` for pure format interpretation. The Node composition root injects the filesystem adapter and the pure reader set. Application code does not import formats or Node, preserving the existing dependency rule.
- **What is the authority for discovery and containment?**: The supplied, verified `ContentManifest` is the only discovery index. The service never lists a directory and readers never receive a root path or filesystem handle. Every explicit or conventional path is normalized, matched to the manifest, checked for the required file/directory shape, and only then passed to `ContentReadPort` with its exact expected manifest entry. Symlinks are never followed for manifests, hook/MCP documents, or `SKILL.md` files.
- **What do format readers do?**: Claude/Codex manifest, hook, MCP, and Agent Skills readers are pure functions over `unknown`, strings, format context, and provenance. They parse only their own syntax, emit normalized claims/directives, and never inspect the filesystem, assign compatibility verdicts, activate content, or resolve secrets/configured values.
- **How are component ids made stable?**: Add one versioned constructor. `deriveComponentId` hashes an injective `component-id-v1` preimage containing the plugin key, component kind, and a kind-specific logical key and emits `component-v1:<kind>:<64 lowercase hex>`. The host and provenance are excluded, so equivalent Claude/Codex claims converge. Logical keys are: canonical skill root; normalized hook event+matcher+handler; native MCP server key; and native host+native kind+declaration key for foreign components. Any future incompatible identity rule gets a new version, never a silent change to v1.
- **What does authority change?**: Authority controls manifest requirement and which source enables implicit/conventional discovery; it does not create silent precedence. Claude strict/default and Codex require their manifest and treat catalog runtime claims as supplemental. Claude `strict: false` permits no manifest and treats catalog runtime claims as authoritative. All observed runtime claims are still reconciled: equivalent claims merge provenance, complementary claims combine, and contradictory claims invalidate the complete bundle.
- **How do dual manifests reconcile?**: Neither host wins. Manifest identity/version/description/configuration/directives and every realized component are compared by normalized logical key and value. Equivalent claims merge in deterministic Claude-then-Codex provenance order; complementary claims combine; any contradictory overlapping claim yields `CLAIM_CONFLICT` containing both safe claim snapshots and both source locations, and no `NormalizedPlugin` is returned.
- **How are unsupported declarations represented?**: Every recognized unsupported runtime-bearing declaration becomes a `ForeignComponent` with raw JSON, native host/kind, stable id, and provenance. Readers do not emit `supported`, `metadata-only`, `incompatible`, runtime requirements, or activatability. Unknown presentation fields remain host-qualified `RetainedMetadata`; unknown runtime-capable fields fail closed into foreign inventory rather than disappearing.
- **What is plugin configuration?**: `userConfig` produces descriptor-only `ConfigurationOption` values. It never reads configured values, environment variables, filesystem existence, or a secret store. Duplicate keys and malformed type/default/bound constraints invalidate the bundle; sensitive defaults remain prohibited by the existing schema.
- **How is YAML frontmatter bounded?**: Frontmatter extraction is bounded before parsing: 1 MiB maximum `SKILL.md`, 16 KiB/256-line frontmatter, 8 levels, 256 nodes, 8 KiB scalar, and no aliases, anchors, explicit tags, merge keys, duplicate keys, non-string mapping keys, or multi-document input. The `yaml` package is configured with the core schema and unique keys, then the result is recursively converted to JSON-safe data and parsed by a strict Agent Skills schema. Required `name` and `description` are non-empty strings; recognized invocation fields are structurally retained; unknown frontmatter is retained without runtime meaning.
- **What is fatal versus recoverable?**: Plugin inspection is all-or-nothing. Optional absent conventional paths are normal and unknown runtime declarations are valid inventory; every malformed present runtime/configuration document, malformed discovered skill, missing required manifest, unsafe/missing explicit target, or claim conflict returns a failed `ReadResult` and no bundle. Only an untrustworthy enclosing materialized handoff/content boundary or adapter failure throws `BoundaryError`.
- **Are foundation docs changed now?**: No. The current `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY` already state the intended reader isolation, complete-bundle validation, authority semantics, dual conflicts, config descriptors, Agent Skills, and unsupported-declaration behavior. Implementation should roll exact public signatures/limits forward only if it changes those assertions.

## Phase-1 GLM advisory incorporated

The caller supplied the Phase-1 GLM advisory and prohibited nested review. This design accepts all of its load-bearing recommendations:

- application inspection service over a content-read port;
- pure format readers with no filesystem imports;
- manifest-driven discovery and containment;
- stable versioned component ids;
- pure host manifest/hook/MCP/Agent Skills readers;
- schema-safe bounded frontmatter;
- authority-aware catalog/conventional/manifest reconciliation;
- complete-bundle invalidation for dual-manifest conflicts with both provenances;
- unsupported runtime declarations retained as `ForeignComponent` without verdicts;
- descriptor-only configuration;
- explicit fatality semantics and adversarial fixtures.

No Phase-2 agent review was run because the caller explicitly prohibited nested agents and peeragent. The pre-mortem below is the local adversarial pass.

## Architectural choice

### Option A — application orchestrator with injected content and pure-reader ports (chosen)

Build a manifest-indexed application service. It validates the materialized handoff, derives a finite discovery plan from catalog authority plus pure manifest outputs, reads exact manifest-listed files through `ContentReadPort`, invokes injected pure readers, reconciles claims, and constructs `NormalizedPlugin`. A composition root wires the Node filesystem adapter and format-reader functions. This preserves current application dependency boundaries and makes every parser independently testable. The cost is an explicit reader-set port and composition module.

### Option B — filesystem-aware format readers

Give each Claude/Codex reader the plugin root and let it discover/read its own files. This mirrors many plugin loaders, but duplicates path containment, makes conventional discovery depend on host filesystem behavior, violates the format boundary, and prevents deterministic tests over a content manifest. Rejected.

### Option C — one monolithic bundle parser in `src/formats`

Pass every document and path into one large pure parser. It avoids a reader port but couples authority, discovery, host schemas, reconciliation, and bundle construction. Fatality rules become implicit and future format drift risks changing unrelated paths. Rejected.

**Choice**: Option A. The application service owns orchestration and all-or-nothing outcome; pure format adapters own syntax; domain schemas own normalized contracts; the manifest-backed content adapter owns I/O verification.

## Trickiest unit first

Authority-aware discovery and reconciliation is the riskiest unit. The same component may be claimed by a catalog field, an explicit manifest path, a host convention, or both manifests. The design therefore separates three concepts:

1. `ComponentLocatorClaim` — a source-located request to inspect a file/directory or retain an inline declaration;
2. `DiscoveryPlan` — the deterministic set of exact manifest paths and inline declarations permitted by each host authority;
3. normalized components/configuration/metadata — realized claims reconciled by stable logical keys.

Authority determines requirements and whether conventions are enabled; it never suppresses a contradictory observed declaration. The merger processes claims in fixed source rank (`catalog`, `claude manifest`, `claude convention`, `codex manifest`, `codex convention`) while using equality, not rank, to decide whether values can merge. A conflict preserves both provenances and fails the complete bundle.

## Implementation units

### Unit 1: Inspection contracts, content index, and stable component identity

**Story**: `epic-foreign-plugin-model-plugin-bundle-ingestion-inspection-contracts`

**Files**:
- `src/domain/component-identity.ts`
- `src/domain/bundle-ingestion.ts`
- `src/domain/components.ts`
- `src/application/inspection-contract.ts`
- `src/application/ports/content-read.ts`
- `src/application/ports/bundle-readers.ts`
- `src/application/content-index.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/domain/component-identity.test.ts`
- `test/domain/bundle-ingestion.test.ts`
- `test/application/content-index.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`

```typescript
// src/domain/component-identity.ts
export const ComponentIdVersionRegistry = {
  v1: "component-v1",
} as const;

export type ComponentLogicalIdentity =
  | Readonly<{ kind: "skill"; root: string }>
  | Readonly<{ kind: "hook"; event: string; matcher?: string; handler: HookHandler }>
  | Readonly<{ kind: "mcp-server"; nativeKey: string }>
  | Readonly<{ kind: "foreign"; nativeHost: NativeHost; nativeKind: string; declarationKey: string }>;

export function deriveComponentId(
  plugin: PluginKey,
  identity: ComponentLogicalIdentity,
  sha256: Sha256,
): ComponentId;
export function verifyComponentId(
  value: unknown,
  plugin: PluginKey,
  identity: ComponentLogicalIdentity,
  sha256: Sha256,
): ComponentId;
```

The preimage is binary length-prefixed UTF-8: `component-id-v1\0`, plugin key, kind, then registry-ordered logical fields. Hook handler objects use a canonical field order and distinguish absent matcher from an empty matcher. Output is `component-v1:<kind>:<hex>`. `ComponentIdSchema` is tightened to this grammar; no reader constructs ids ad hoc.

```typescript
// src/domain/bundle-ingestion.ts
export type ComponentLocatorClaim = Readonly<{
  nativeHost: NativeHost;
  componentKind: "skill" | "hook" | "mcp-server" | "foreign";
  authority: "authoritative" | "supplemental" | "conventional";
  source: "catalog" | "manifest" | "convention";
  target: Readonly<
    | { kind: "file"; path: string }
    | { kind: "directory"; path: string }
    | { kind: "inline"; declaration: JsonValue }
  >;
  provenance: readonly [Provenance, ...Provenance[]];
}>;
```

```typescript
// src/application/inspection-contract.ts
export const BundleDocumentLimits = Object.freeze({
  manifestBytes: 256 * 1024,
  hooksBytes: 1024 * 1024,
  mcpBytes: 1024 * 1024,
  skillBytes: 1024 * 1024,
  frontmatterBytes: 16 * 1024,
  frontmatterLines: 256,
  frontmatterDepth: 8,
  frontmatterNodes: 256,
  frontmatterScalarBytes: 8 * 1024,
});

export type BundleInspectionInput = Readonly<{
  entry: NormalizedMarketplaceEntry;
  materialized: MaterializedPlugin;
}>;
export type BundleInspectionResult = ReadResult<NormalizedPlugin>;
```

The application contract may compose the existing materialization and marketplace types; `src/domain/bundle-ingestion.ts` remains application-independent and contains only normalized locator/declaration vocabulary.

```typescript
// src/application/ports/content-read.ts
export type ManifestFileRef = Readonly<{
  root: string;
  entry: Extract<ContentManifestEntry, { kind: "file" }>;
}>;

export interface ContentReadPort {
  readFile(
    file: ManifestFileRef,
    limitBytes: number,
    signal: AbortSignal,
  ): Promise<Uint8Array>;
}
```

The port must read exactly the supplied manifest path beneath the supplied root without following a final or ancestor symlink, enforce the byte cap while reading, and verify size plus SHA-256 against `entry` before returning. It does not list paths. Adapter mismatch throws `BoundaryError(PATH_CONTAINMENT_FAILED)`; ordinary I/O failure throws `BoundaryError(ADAPTER_FAILED)`.

```typescript
// src/application/content-index.ts
export interface ContentIndex {
  readonly manifest: ContentManifest;
  get(path: string): ContentManifestEntry | undefined;
  requireFile(path: string, provenance: Provenance): Extract<ContentManifestEntry, { kind: "file" }>;
  requireDirectory(path: string, provenance: Provenance): Extract<ContentManifestEntry, { kind: "directory" }>;
  filesBelow(directory: string, basename?: string): readonly Extract<ContentManifestEntry, { kind: "file" }>[];
}
export function createContentIndex(manifest: ContentManifest): ContentIndex;
```

`createContentIndex` validates the bounded manifest once and indexes normalized manifest paths. `filesBelow` iterates this finite map only; it never infers paths from the filesystem. Explicit locators reject symlink entries and wrong target shapes. Conventional absent paths return no locator; explicit absent paths produce an error diagnostic.

```typescript
// src/application/ports/bundle-readers.ts
export interface BundleReaderSet {
  readonly claudeManifest: PluginManifestReader;
  readonly codexManifest: PluginManifestReader;
  readonly claudeHooks: HookDocumentReader;
  readonly codexHooks: HookDocumentReader;
  readonly claudeMcp: McpDocumentReader;
  readonly codexMcp: McpDocumentReader;
  readonly agentSkill: AgentSkillReader;
}
```

The function-type details use shared domain ingestion inputs/results; this is a port so `src/application/**` continues to import no format module.

**Acceptance criteria**:
- [ ] Component ids are deterministic, host/order/provenance independent for equivalent logical components, kind-separated, plugin-separated, versioned, and hash-verified.
- [ ] Content discovery uses only `ContentManifest.entries`; no directory listing or path inference exists in application or format code.
- [ ] Explicit missing, symlink, and wrong-kind targets produce source-located errors; absent optional conventional targets are normal.
- [ ] `ContentReadPort` takes an exact manifest file entry and has no arbitrary/list/glob read method.
- [ ] Domain/application/format dependency rules remain executable, and public/compiled allowlists expose only intended lifecycle-facing contracts.

### Unit 2: Pure host manifest readers and authority reconciliation

**Story**: `epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation`
**Depends on**: `epic-foreign-plugin-model-plugin-bundle-ingestion-inspection-contracts`

**Files**:
- `src/formats/plugin-manifest.ts`
- `src/formats/claude/manifest-reader.ts`
- `src/formats/codex/manifest-reader.ts`
- `src/formats/manifest-merger.ts`
- `src/application/discovery-plan.ts`
- `test/formats/claude/manifest-reader.test.ts`
- `test/formats/codex/manifest-reader.test.ts`
- `test/formats/manifest-merger.test.ts`
- `test/application/discovery-plan.test.ts`
- `test/fixtures/plugins/manifests/`

```typescript
// src/formats/plugin-manifest.ts
export const CLAUDE_PLUGIN_MANIFEST_PATH = ".claude-plugin/plugin.json";
export const CODEX_PLUGIN_MANIFEST_PATH = ".codex-plugin/plugin.json";

export type PluginManifestClaims = Readonly<{
  nativeHost: NativeHost;
  document: Provenance;
  name?: Claimed<string>;
  version?: Claimed<string>;
  description?: Claimed<string>;
  locators: readonly ComponentLocatorClaim[];
  configuration: readonly ConfigurationOption[];
  foreign: readonly ForeignComponentDeclaration[];
  metadata: readonly RetainedMetadata[];
}>;

export type PluginManifestReader = (
  input: unknown,
  context: Readonly<{ path: string; plugin: PluginKey }>,
) => ReadResult<PluginManifestClaims>;
```

`readClaudePluginManifest` and `readCodexPluginManifest` parse strict known nested shapes while retaining unknown presentation metadata. Known unsupported runtime fields—Claude agents, LSP, output styles, themes, channels, dependencies and Codex apps/connectors or future runtime sections—emit foreign declarations. Manifest component fields accept only documented inline/path forms. JSON parsing remains outside these functions in the service's bounded JSON helper so both functions receive `unknown` and stay pure.

```typescript
// src/formats/manifest-merger.ts
export function mergePluginManifestClaims(
  claims: readonly PluginManifestClaims[],
  sha256: Sha256,
): ReadResult<Readonly<{
  manifestName?: Claimed<string>;
  version?: Claimed<string>;
  description?: Claimed<string>;
  locators: readonly ComponentLocatorClaim[];
  configuration: readonly ConfigurationOption[];
  foreign: readonly ForeignComponentDeclaration[];
  metadata: readonly RetainedMetadata[];
}>>;
```

The merger canonicalizes input to Claude then Codex, merges equivalent claims, combines complementary claims, and returns failure on every overlapping contradiction. Conflict diagnostics include safe snapshots and complete provenance from both sides. It is separate from `marketplace-merger.ts`; dual catalog conflicts remain entry-recoverable, while dual manifest conflicts invalidate the one complete bundle.

```typescript
// src/application/discovery-plan.ts
export function createDiscoveryPlan(input: Readonly<{
  entry: NormalizedMarketplaceEntry;
  content: ContentIndex;
  claudeManifest?: PluginManifestClaims;
  codexManifest?: PluginManifestClaims;
}>): ReadResult<Readonly<{
  manifests: readonly ManifestPresence[];
  locators: readonly ComponentLocatorClaim[];
  catalogForeign: readonly ForeignComponentDeclaration[];
}>>;
```

Authority/convention matrix:

| Host authority | Manifest | Catalog runtime claims | Conventional discovery |
|---|---|---|---|
| Claude strict omitted/true | required | supplemental, always reconciled | enabled after a valid manifest: `skills/`, root `SKILL.md`, `hooks/hooks.json`, `.mcp.json` where not replaced by an explicit locator |
| Claude strict false | optional | authoritative, always reconciled | enabled from catalog authority; an optional present manifest is still parsed and reconciled |
| Codex | required | supplemental, always reconciled | manifest-oriented: only manifest-declared roots plus Agent Skills content under those roots; no synthetic root `SKILL.md` |

An explicit locator suppresses only the equivalent default locator, not other complementary components. A conventional path and explicit path naming the same target merge provenance. Catalog declarations are converted to typed locators or foreign declarations before planning; malformed known declaration shape is a bundle error. Authority does not allow conflicting claims to be ignored.

**Acceptance criteria**:
- [ ] Claude/Codex manifest functions are deterministic pure readers and import no Node, filesystem, application, infrastructure, runtime, or Pi modules.
- [ ] Required/optional manifest behavior matches the exact authority matrix; a present optional manifest is never skipped.
- [ ] Equivalent dual manifests merge both provenances; complementary values combine; identity/path/config/component conflicts fail the entire result with both locations.
- [ ] Real paired `nklisch/skills` manifests normalize metadata and Codex skill/hook locators without inventing runtime content from Claude metadata-only manifests.
- [ ] Unsupported native runtime fields become foreign declarations without compatibility verdicts.

### Unit 3: Agent Skills and descriptor-only `userConfig`

**Story**: `epic-foreign-plugin-model-plugin-bundle-ingestion-skills-configuration`
**Depends on**: `epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation`

**Files**:
- `src/formats/agent-skills/frontmatter-reader.ts`
- `src/formats/agent-skills/skill-reader.ts`
- `src/formats/claude/user-config-reader.ts`
- `test/formats/agent-skills/frontmatter-reader.test.ts`
- `test/formats/agent-skills/skill-reader.test.ts`
- `test/formats/claude/user-config-reader.test.ts`
- `test/fixtures/plugins/real-nklisch-skills/`
- `test/fixtures/plugins/adversarial-skills/`
- `package.json`
- `package-lock.json`

```typescript
// src/formats/agent-skills/frontmatter-reader.ts
export type FrontmatterLimits = Readonly<{
  maxDocumentBytes: number;
  maxFrontmatterBytes: number;
  maxFrontmatterLines: number;
  maxDepth: number;
  maxNodes: number;
  maxScalarBytes: number;
}>;

export function readBoundedFrontmatter(
  markdown: string,
  provenance: Provenance,
  limits?: Partial<FrontmatterLimits>,
): ReadResult<Readonly<{ attributes: JsonValue; body: string }>>;
```

The reader finds one opening and closing `---` delimiter at line boundaries, rejects BOM ambiguity and multi-document markers in the frontmatter, checks byte/line caps before YAML parsing, and uses `yaml` core schema with duplicate-key enforcement and aliases disabled. A post-parse walk rejects anchors, aliases, tags, merge keys, non-string keys, non-JSON values, depth/node/scalar overflow, and prototype-polluting keys (`__proto__`, `prototype`, `constructor`). It returns only a null-prototype JSON-safe tree.

```typescript
// src/formats/agent-skills/skill-reader.ts
export type AgentSkillReader = (
  markdown: string,
  context: Readonly<{
    plugin: PluginKey;
    root: string;
    documentPath: string;
    provenance: Provenance;
    presentation?: JsonValue;
  }>,
) => ReadResult<SkillComponent>;

export function readAgentSkill(
  markdown: string,
  context: Parameters<AgentSkillReader>[1],
  sha256: Sha256,
): ReadResult<SkillComponent>;
```

The Agent Skills schema requires non-empty `name` and `description`; validates known `license`, `compatibility`, `metadata`, `allowed-tools`, and `disable-model-invocation` shapes; retains unknown fields as `agent-skills.<field>` metadata; and never interprets invocation policy as a compatibility verdict. The service discovers exactly one `SKILL.md` for each explicit/conventional skill root from the content index. Supporting `scripts/`, `references/`, `assets/`, and `agents/openai.yaml` remain in the immutable root; only the latter is optionally parsed as bounded presentation metadata. Nested skill roots or duplicate canonical roots fail rather than shadow.

```typescript
// src/formats/claude/user-config-reader.ts
export function readClaudeUserConfig(
  input: unknown,
  context: Readonly<{ plugin: PluginKey; path: string; pointer: string }>,
): ReadResult<PluginConfiguration>;
```

The reader maps supported foreign descriptor types to existing `ConfigurationValue` variants, preserving labels, descriptions, required/sensitive flags, defaults, bounds, patterns, `multiple`, file/directory semantics, and provenance. It emits no configured value. Duplicate keys, unknown descriptor types, sensitive defaults, invalid regular expressions, default/type mismatch, `min > max`, and array-bound violations fail the whole bundle through existing schema validation.

Real fixture snapshots copy, without rewriting, the paired agile-workflow manifests, `hooks/hooks.json`, representative folded-frontmatter `SKILL.md`, and `agents/openai.yaml` from `/home/nathan/dev/skills` commit `8d312608113b2e64932f2a9cdb39a2995b2cb11c`; a fixture README records source paths and commit. Tests never depend on that adjacent checkout at runtime.

**Acceptance criteria**:
- [ ] Real `nklisch/skills` frontmatter, folded descriptions, supporting files, and Codex presentation YAML parse deterministically from committed snapshots.
- [ ] YAML aliases/anchors/tags/merge keys, duplicate or prototype-polluting keys, multi-doc input, excessive bytes/lines/depth/nodes/scalars, invalid UTF-8, and unterminated frontmatter fail without partial components.
- [ ] Skill discovery is manifest-indexed and cannot follow symlinked `SKILL.md`, escape a declared root, or discover undeclared nested roots.
- [ ] `userConfig` emits descriptors only; configured values, resolved paths, substituted strings, environment, and secrets are absent.
- [ ] Duplicate skill roots/names and duplicate config keys invalidate the complete bundle with source-located diagnostics.

### Unit 4: Pure hook, MCP, and foreign-declaration readers

**Story**: `epic-foreign-plugin-model-plugin-bundle-ingestion-hooks-mcp-foreign`
**Depends on**: `epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation`

**Files**:
- `src/formats/hook-reader-support.ts`
- `src/formats/claude/hook-reader.ts`
- `src/formats/codex/hook-reader.ts`
- `src/formats/mcp-reader-support.ts`
- `src/formats/claude/mcp-reader.ts`
- `src/formats/codex/mcp-reader.ts`
- `src/formats/foreign-declaration.ts`
- `test/formats/claude/hook-reader.test.ts`
- `test/formats/codex/hook-reader.test.ts`
- `test/formats/claude/mcp-reader.test.ts`
- `test/formats/codex/mcp-reader.test.ts`
- `test/formats/foreign-declaration.test.ts`
- `test/fixtures/plugins/hooks/`
- `test/fixtures/plugins/mcp/`

```typescript
// src/formats/hook-reader-support.ts
export type HookDocumentReader = (
  input: unknown,
  context: Readonly<{ plugin: PluginKey; nativeHost: NativeHost; provenance: Provenance }>,
) => ReadResult<readonly (HookComponent | ForeignComponent)[]>;
```

Hook readers validate document/event/matcher/handler structure and normalize only structural command forms into the existing shell/exec `HookHandler`. Event names, matcher strings, command text, args, timeout, status text, async flags, conditions, and unknown handler types retain provenance. Any handler not structurally representable as the normalized command shape becomes a `ForeignComponent`; whether an event, shell, async mode, or output behavior is compatible belongs to reporting. Malformed known fields fail rather than being converted to an opaque foreign value. Identical handlers within or across documents deduplicate through the v1 hook logical key and merge provenance.

```typescript
// src/formats/mcp-reader-support.ts
export type McpDocumentReader = (
  input: unknown,
  context: Readonly<{ plugin: PluginKey; nativeHost: NativeHost; provenance: Provenance }>,
) => ReadResult<readonly McpServerComponent[]>;
```

MCP readers accept Claude wrapped `mcpServers`, Codex wrapped `mcp_servers`, documented direct server maps, and inline manifest server maps. They structurally validate that each server value is a JSON object, preserve the complete declaration and native key, and retain host shape metadata. They do not classify transport/auth/capabilities, expand placeholders, resolve environment, contact a server, or produce runtime projections. Same native key plus equivalent normalized JSON merges provenance; same key with differing declarations conflicts and invalidates the bundle.

`createForeignComponentDeclaration` validates raw JSON, native host/kind, a deterministic declaration key (manifest/catalog field pointer or keyed declaration), and provenance, then the bundle merger derives its id. Foreign components receive no diagnostic solely for being unsupported: they are valid complete inventory for the reporting feature.

**Acceptance criteria**:
- [ ] The real agile-workflow hook fixture produces four event groups and exact command/matcher/timeout claims without executing commands or assigning verdicts.
- [ ] Shell/exec command structure normalizes; unknown handler kinds and runtime declarations survive as foreign inventory; malformed known shapes fail.
- [ ] All supported MCP wrapper/direct/inline shapes retain exact JSON and provenance; no transport/auth/runtime policy occurs in readers.
- [ ] Equivalent hook/MCP declarations deduplicate deterministically; conflicting same-identity declarations fail with both provenances.
- [ ] Format readers import no filesystem, Node, application, infrastructure, runtime, or Pi module.

### Unit 5: Inspection service, manifest-backed adapter, reconciliation, and adversarial hardening

**Story**: `epic-foreign-plugin-model-plugin-bundle-ingestion-service-hardening`
**Depends on**: `epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation`, `epic-foreign-plugin-model-plugin-bundle-ingestion-skills-configuration`, `epic-foreign-plugin-model-plugin-bundle-ingestion-hooks-mcp-foreign`

**Files**:
- `src/application/inspection-service.ts`
- `src/application/bundle-reconciler.ts`
- `src/infrastructure/filesystem/manifest-content-reader.ts`
- `src/composition/create-plugin-inspector.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/application/inspection-service.test.ts`
- `test/application/bundle-reconciler.test.ts`
- `test/infrastructure/filesystem/manifest-content-reader.test.ts`
- `test/integration/plugin-bundle-ingestion.test.ts`
- `test/fixtures/plugins/dual-equivalent/`
- `test/fixtures/plugins/dual-conflicting/`
- `test/fixtures/plugins/adversarial-bundles/`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`

```typescript
// src/application/inspection-service.ts
export interface PluginInspectionService {
  inspect(
    input: BundleInspectionInput,
    signal: AbortSignal,
  ): Promise<BundleInspectionResult>;
}

export type PluginInspectionDependencies = Readonly<{
  content: ContentReadPort;
  readers: BundleReaderSet;
  sha256: Sha256;
}>;

export function createPluginInspectionService(
  dependencies: PluginInspectionDependencies,
): PluginInspectionService;
```

The service validates `entry`, resolved source equality, materialization binding, and content manifest before any read. It creates one content index, locates present manifest files, enforces authority requirements, reads bounded UTF-8/JSON documents, creates the discovery plan, reads realized skills/hooks/MCP files exactly once by canonical path, folds catalog/manifest/convention claims through the reconciler, and parses the final object with `NormalizedPluginSchema`. Abort propagates and is never converted to a diagnostic.

```typescript
// src/application/bundle-reconciler.ts
export function reconcilePluginBundle(input: Readonly<{
  entry: NormalizedMarketplaceEntry;
  source: ResolvedPluginSource;
  manifestClaims: readonly PluginManifestClaims[];
  configuration: readonly PluginConfiguration[];
  components: readonly Component[];
  metadata: readonly RetainedMetadata[];
  sha256: Sha256;
}>): ReadResult<NormalizedPlugin>;
```

The reconciler checks the marketplace identity remains authoritative, retains differing manifest name as `identity.manifestName`, merges equal version/description claims, compares config keys/component logical identities, derives/verifies every component id, sorts inventory deterministically (kind then id), and rejects duplicate/conflicting claims. It never imports compatibility contracts.

```typescript
// src/composition/create-plugin-inspector.ts
export type NodePluginInspectorOptions = Readonly<{
  limits?: Partial<typeof BundleDocumentLimits>;
}>;
export function createNodePluginInspector(
  options?: NodePluginInspectorOptions,
): PluginInspectionService;
```

The composition layer is the only module importing application, formats, and infrastructure together. Dependency-cruiser gives `src/composition/**` this explicit role while continuing to forbid application→formats/infrastructure and formats→Node/outer imports. The filesystem adapter performs exact manifest-backed reads with no listing and no symlink following.

**Acceptance criteria**:
- [ ] Claude-native, Codex-native, and dual-format materialized fixtures produce complete deterministic `NormalizedPlugin` values with every discovered component and provenance.
- [ ] Dual conflicts, malformed present documents/components, missing required manifests, explicit path failures, and duplicate ids/config keys return failed results with no partial bundle.
- [ ] Invalid materialized binding/manifest/content digest/containment and adapter failures throw typed boundary errors; abort remains abort.
- [ ] Unsupported runtime declarations produce valid foreign inventory and no verdict, runtime requirement, activatability, activation, or lifecycle state.
- [ ] `npm test` runs all pure/unit/integration/adversarial tests, dependency boundaries, build, and exact compiled export checks.

## Exact fatality matrix

| Condition | Outcome | Code / evidence |
|---|---|---|
| caller abort before/during inspection | throw abort reason/`AbortError`; no result | never converted to diagnostic |
| malformed/unverified resolved source, content manifest, or source/content binding | throw `BoundaryError` | `SOURCE_RESOLUTION_FAILED` or `PATH_CONTAINMENT_FAILED` |
| content adapter read/digest/containment failure | throw `BoundaryError` | `ADAPTER_FAILED` or `PATH_CONTAINMENT_FAILED`; native cause not serialized |
| present manifest/hook/MCP JSON syntax failure or unusable enclosing root | failed `ReadResult`; no bundle | `MANIFEST_ROOT_INVALID`, exact document provenance |
| required Claude/Codex manifest absent | failed `ReadResult`; no bundle | `MANIFEST_ROOT_INVALID`, expected path plus authority provenance |
| optional Claude strict-false manifest absent | continue | no diagnostic |
| optional conventional path absent | continue | no diagnostic |
| explicit target absent, escaping, symlinked, or wrong file/directory shape | failed `ReadResult`; no bundle | `PATH_CONTAINMENT_FAILED`, locator provenance and path |
| malformed known manifest/config/hook/MCP/skill field | failed `ReadResult`; no bundle | `SCHEMA_INVALID`, source pointer/line where available |
| malformed discovered `SKILL.md` or unsafe/oversized YAML | failed `ReadResult`; no bundle | `SCHEMA_INVALID`, skill path and bounded parser issue |
| equivalent duplicate claim | merge | one value, all distinct provenances |
| complementary claims | combine | deterministic source order |
| same logical component/config/metadata key with contradictory value | failed `ReadResult`; no bundle | `CLAIM_CONFLICT`, both safe claims and provenances |
| dual manifest conflict | failed `ReadResult`; no bundle | `CLAIM_CONFLICT`, both manifest locations; neither host wins |
| unsupported/unknown runtime-bearing declaration with valid JSON shape | successful inventory input | `ForeignComponent`; no verdict/diagnostic merely for unsupported status |
| unknown presentation metadata with valid JSON shape | retain | host-qualified `RetainedMetadata`; no verdict |
| final `NormalizedPluginSchema` invariant failure | failed `ReadResult`; no bundle | `SCHEMA_INVALID`; never return partial inventory |

Present JSON syntax/root failures are value-level bundle failures rather than thrown adapter failures because the content boundary remains trustworthy and the caller needs one serializable inspection result. Thrown `BoundaryError` is reserved for inability to trust/read the enclosing materialized handoff.

## Implementation order

1. `epic-foreign-plugin-model-plugin-bundle-ingestion-inspection-contracts`
2. `epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation`
3. In parallel after manifest contracts stabilize:
   - `epic-foreign-plugin-model-plugin-bundle-ingestion-skills-configuration`
   - `epic-foreign-plugin-model-plugin-bundle-ingestion-hooks-mcp-foreign`
4. `epic-foreign-plugin-model-plugin-bundle-ingestion-service-hardening`

The first two stories stabilize identity, ports, manifest outputs, and authority semantics. Skills/configuration and hooks/MCP then have independent format ownership. The final story owns the only outer composition and cross-surface integration, so implementation fan-out follows write ownership and dependency layers rather than raw item count.

## Testing

- **Contract tests**: component-id golden vectors, schema/type agreement, content-index membership/shape rules, reader-port fakes, final normalized schema, and exact public exports.
- **Pure reader tables**: each manifest, hook, MCP, config, and Agent Skills shape receives minimal/full/equivalent/conflicting/malformed cases with exact provenance assertions. No test in `test/formats/**` touches a filesystem.
- **Real fixtures**: committed snapshots from `/home/nathan/dev/skills` commit `8d312608113b2e64932f2a9cdb39a2995b2cb11c` cover paired manifests, explicit skill/hook paths, real command hooks, folded frontmatter, supporting files, and Codex presentation YAML. A fixture-source manifest records origin and hash so updates are deliberate.
- **Independent fixtures**: because the real repository has no MCP or `userConfig`, purpose-built fixtures cover every accepted MCP wrapper/direct/inline shape and descriptor kind without claiming they came from `nklisch/skills`.
- **Adversarial bundles**: traversal/absolute/backslash/NUL paths; manifest-listed symlinks; missing/wrong-kind targets; forged digest/size/binding; JSON duplicate/poison keys; oversized JSON; YAML aliases/anchors/tags/merge/multi-doc/duplicate/prototype keys; deep/wide/large scalars; invalid UTF-8; nested skill roots; duplicate skill names; config bound/default failures; malformed hook nesting; same-key MCP conflicts; dual manifest identity/version/path/config/component conflicts; catalog-vs-manifest authority conflicts; and caller-order permutations.
- **Determinism**: permutations of manifest order, catalog declaration order, content-manifest entry order (after validation), and equivalent source provenance produce byte-for-byte equal normalized bundles and ids.
- **Boundary tests**: generated dependency-cruiser violations prove application cannot import formats/Node/infrastructure, formats cannot import Node/application/infrastructure, and only composition may wire all three. Filesystem adapter tests prove exact manifest-entry reads and no listing/symlink following.
- **Scope guard tests**: compile-time/source grep and import assertions ensure ingestion does not import `domain/compatibility.ts`, runtime, Pi, activation, lifecycle, state, trust, secret, process, MCP runtime, or hook runtime modules.

## Risks

- **Riskiest assumption — foreign authority semantics remain representable as one matrix**: Codex and Claude may evolve independent discovery rules. Mitigation: authority and locator claims remain explicit data, host readers stay isolated, and conventions are a registry-backed planner rather than scattered conditionals. Fallback: add a versioned host discovery rule without changing content or normalized bundle ports.
- **Manifest membership is containment, not freshness**: a malicious process that can mutate the private materialized root after handoff could race a read. Mitigation: `ContentReadPort` verifies exact size/digest and forbids symlink traversal on every file. Lifecycle must retain the private immutable-root threat boundary already documented by materialization.
- **Component identity could churn**: changing normalized hook form or logical-key fields changes ids and therefore later trust diffs. Mitigation: versioned binary grammar and golden vectors. Fallback: introduce `component-v2` with explicit migration; never alter v1 bytes.
- **YAML parser complexity**: YAML has aliases, tags, merge keys, and implementation-specific coercion. Mitigation: pre-parse limits, core schema, disabled aliases, strict post-parse JSON walk, and adversarial fixtures. Fallback: replace the pure frontmatter adapter with a narrower parser while preserving `AgentSkillReader`.
- **Unknown runtime fields can be misclassified as presentation**: silently retaining executable behavior as metadata would create a false complete inventory. Mitigation: host registries enumerate known presentation keys; every other unknown manifest/catalog field defaults to foreign runtime declaration unless the format reader proves it behavior-neutral.
- **All-or-nothing failures can reject otherwise usable skills**: this is intentional whole-plugin semantics. The reporting feature can explain unsupported components, but ingestion must not return a partial bundle that downstream code might activate.
- **Least certainty — MCP native equivalence beyond server key**: two host declarations may spell semantically equal transport configuration differently. This feature compares canonical JSON structure only and preserves raw declarations. Compatibility reporting may add a policy-aware projection later; ingestion must not guess equivalence and will fail closed on different same-key declarations.

## Pre-mortem

This design fails if a reader discovers a file that is not in the verified manifest, a dual conflict is converted into host precedence, YAML constructs allocate before limits apply, or an unknown runtime declaration disappears as metadata. The countermeasures are a manifest-only finite index, no-list content port, equality-based reconciliation, pre-parse byte/line limits plus post-parse structural budgets, and fail-closed foreign-declaration classification.

The least recoverable mistake would be an unstable component-id grammar reaching trust/state. Implementation must land golden vectors before readers use ids. If semantic hook/MCP equivalence cannot be defined without compatibility policy, the safe fallback is conservative conflict—not a guessed merge and not a verdict. No implementation unit may activate content, derive compatibility, inspect runtime capabilities, substitute user configuration, or manage lifecycle state.

## Implementation summary

All five child stories are done:

- `epic-foreign-plugin-model-plugin-bundle-ingestion-inspection-contracts`
- `epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation`
- `epic-foreign-plugin-model-plugin-bundle-ingestion-skills-configuration`
- `epic-foreign-plugin-model-plugin-bundle-ingestion-hooks-mcp-foreign`
- `epic-foreign-plugin-model-plugin-bundle-ingestion-service-hardening`

The implementation delivers versioned component identities, a manifest-backed finite content index, pure host manifest/skill/config/hook/MCP readers, authority-aware reconciliation, opaque unsupported inventory, bounded YAML handling, an all-or-nothing inspection service, an exact Node content reader, and an explicit composition root. It does not evaluate compatibility or activate content.

Integrated verification: `npm test` passes 300 tests plus typecheck, dependency boundaries with no violations, build, and exact 114-export compiled package import.
