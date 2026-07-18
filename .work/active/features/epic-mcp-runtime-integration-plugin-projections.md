---
id: epic-mcp-runtime-integration-plugin-projections
kind: feature
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration
depends_on: [epic-mcp-runtime-integration-config-source-bridge]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Plugin MCP Projections, Identity, and Aliases

## Brief

Translate the compatibility-approved MCP inventory in an exact `PluginRuntimeProjection` into a deterministic plugin-scoped MCP configuration source. The result preserves native declaration provenance, derives collision-free source/server identities from scope and plugin authority, carries unexpanded logical content/data/configuration references, and gives runtime inspection and removal the same stable keys used at registration.

The capability also derives faithful foreign MCP tool aliases where the selected runtime can expose them without collision, while leaving Pi-native discovery intact. Claude and Codex wrapper differences have already terminated at the foreign-model boundary: this feature consumes `McpServerComponent` and `CompatibilityReport`, and must derive from or mechanically cross-check `CompatibilityPolicyRegistry` rather than creating a second transport, authentication, field, or alias acceptance vocabulary.

This feature does not reread manifests or `.mcp.json`, alter foreign-format authority, access secrets, launch processes or remote connections, mutate lifecycle state, call reload, or render runtime status. It builds replaceable adapter inputs and safe provenance/status identities only.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: projection capability consuming the completed configuration-source bridge; it can proceed in parallel with launch-context delivery
- Depends on: `epic-mcp-runtime-integration-config-source-bridge`
- Design alignment: preserve the parent epic's foreign-model boundary, source identity, provenance, alias, secret-timing, and removal decisions

## Boundary guardrails

- Existing `McpServerComponent` values and their compatibility assessments are the only foreign declaration inputs; no reader, merger, catalog, or manifest responsibility moves here.
- Runtime source descriptors remain deterministic, scope-qualified, revision/projection-bound, and free of physical roots, expanded configured values, secret material, and live connection state.
- Plugin identity plus native server key drives server namespacing. Tool aliases are derived compatibility views and never authority for registration, status, or deletion.
- Provenance survives into safe inspection/status evidence so similarly named servers remain attributable to their exact plugin and declaration.
- Unknown or no-longer-supported runtime shapes fail projection rather than bypassing the complete-bundle compatibility decision.

## Simplification opportunity

- Consolidate server naming, source keys, foreign aliases, status attribution, and removal identity around the existing plugin/component authorities.
- Avoid separate Claude, Codex, Pi, status, and deletion registries for the same server set.
- Keep generated runtime source objects replaceable; do not persist them or introduce an MCP-specific active-state store.

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle; Honest compatibility
- `docs/SPEC.md` — MCP servers; Plugin identity; State contract
- `docs/ARCHITECTURE.md` — MCP adapter; Runtime projections; Derived runtime projections
- `docs/COMPATIBILITY.md` — MCP configuration shapes; MCP identity and tool names; Whole-plugin behavior

## Design decisions

- **Architecture**: Extract one registry-driven MCP compatibility plan from the existing evaluator, then let both compatibility reporting and runtime projection consume that plan. Projection never reparses a second acceptance vocabulary and never trusts a report without mechanically checking it against the exact inventory.
- **Portable bridge progression**: Preserve the feature-level dependency on `epic-mcp-runtime-integration-config-source-bridge`. That parent feature remains objectively blocked on its production adapter and is still required for production closure. Its portable source/status/capability contract, fake, and conformance suite are complete, however, so every child here targets only that package-neutral seam and is implementable/testable now. No child or acceptance statement claims production registration or MCP availability.
- **Projection input**: `createPluginMcpProjection` accepts one verified `PluginRuntimeProjection`, its exact `CompatibilityReport`, one complete `McpRuntimeCapabilities` snapshot, and injected SHA-256. It does not accept paths, foreign documents, state stores, secret/configuration values, runtime handles, or lifecycle callbacks.
- **No-MCP bundles**: A valid active complete-plugin projection with zero MCP servers returns a digest-bound `kind: "none"` projection. It does not fabricate an empty `McpConfigSource`, because the portable bridge deliberately rejects empty sources. Lifecycle reconciliation later decides whether an older exact source must be removed.
- **Source identity**: Reuse `McpSourceIdentitySchemaV1` exactly: `scope + plugin + revision + PluginRuntimeProjection.digest`. This is registration, replacement, inspection, and removal authority. The independently derived MCP contribution digest proves the exact MCP slice but never replaces source ownership.
- **Server identity**: The source-local runtime key is `mcp-server-v1:<component-id-digest>`, derived mechanically from the already verified `component-v1:mcp-server:<digest>`. The complete server identity is `source identity + runtime key`; therefore equal native keys across scopes or plugins cannot collide, while one server keeps a stable local key across plugin revisions.
- **Native key custody**: Preserve the native server key as safe descriptor/status metadata, never as a global map key, filesystem segment, process key, deletion key, or tool authority. No trimming, case folding, Unicode normalization, slugging, or path interpretation is allowed.
- **Launch references**: `launchTemplate` contains only the component id and the projection's logical `contentRef`, `dataRef`, and optional `configurationRef`. Command, arguments, environment, working directory, URL, headers, bearer material, configured values, and physical roots are absent. The launch-context sibling resolves the referenced component only inside the runtime's immediate launch/connect callback.
- **Runtime options**: The shared compatibility plan emits only canonical, non-secret structural behavior: transport, timeout policy, tool allow/deny policy, instructions/resources, feature flags, and authentication mode/flow without credentials. Synonymous foreign fields map through registry-owned definitions; ambiguous duplicate aliases, conflicting selectors, overlapping allow/deny entries, and unsupported shapes fail closed in compatibility and projection together.
- **Alias shape**: Claude alias templates retain the exact foreign namespace (`manifestName` when present, otherwise the authoritative marketplace entry name) and exact native server key. They are additive templates, not pre-expanded tool names. Codex/Pi-native discovery remains the runtime's native view.
- **Alias capability**: Add `features.pluginToolAliases` to the package-neutral `McpRuntimeCapabilities` contract and an optional strict `toolAliases` list to `McpSourceServer`. This capability is an optional derived view, not a component-compatibility requirement: `false` produces a safe omission decision while native discovery remains available. It does not make a missing production adapter available.
- **Alias collisions**: Native discovered tool names always win. Alias candidates compare as exact well-formed Unicode strings without normalization or case folding. If a candidate equals a native name, is not representable by the selected runtime, or has two or more distinct claimants, expose no alias for that candidate. Never choose by insertion order, suffix, or marketplace precedence. Exact duplicate claims collapse; all outcomes sort deterministically and retain safe source/server/component attribution.
- **Hostile names**: Opaque hashed registration keys accept native plugin/server names containing separators, path-like text, combining characters, or non-ASCII scalars without using them structurally. Lone surrogates fail the existing component-identity verification. Control/NUL-bearing or runtime-unrepresentable alias candidates are omitted rather than rewritten; native discovery and canonical identity remain intact.
- **Report/inventory mismatch**: Projection fails with a redacted `DomainContractError` when plugin identity differs, the report is not activatable, supported MCP component ids differ from the projection inventory, a report requirement is missing/unavailable, a component id does not verify against plugin/native key, the shared plan no longer supports the declaration, or plan-derived requirement ids differ from the report. Details contain only stable ids/codes, never declarations or values.
- **Provenance**: Descriptor and status provenance is the sorted, deduplicated set of `SourceLocation` values from native-key and declaration claims. Declaration payloads are stripped. Sorting is exact and deterministic over host/document/path/pointer/line/column; status and alias collision evidence contain no launch template, raw declaration, configured value, message, or native cause.
- **Ordering and serialization**: Server records sort by canonical runtime key; provenance and alias decisions sort by explicit tuple comparators; object serialization uses one package-internal canonical JSON encoder with well-formed strings and UTF-8 byte ordering. The MCP contribution digest is `hashContent("plugin-mcp-projection-v1\0" + canonical-json(without digest))` and is recomputed on verification.
- **Public surface**: Export the schema-derived projection/identity/options/alias contracts and pure projection creator/verifier through the explicit package barrel. Keep the post-discovery alias resolver and test fixtures package-internal. The production package adapter remains absent.
- **Error and side-effect boundary**: Creation and verification are synchronous pure functions. They do not read files, invoke providers, call `McpRuntimePort`, mutate the fake/runtime, launch/connect, inspect live status, persist generated objects, or call reload.
- **Ownership**: One cohesive feature owner carries all child checkpoints. Stories preserve dependency and acceptance evidence; they are not separate implementation-agent assignments.
- **Discovery/review posture**: Direct-read only, as required. Grounding covered project rules/conventions, all four foundation documents, the parent epic/feature, completed portable bridge stories/code/tests/fake/conformance, foreign MCP readers/model, compatibility registry/evaluator/report, runtime projection/cache/reload contracts, and identity/provenance/reference conventions. The caller prohibited nested agents and questions, so no advisory design pass was run.
- **UI alignment**: No UI surface. Mockups remain skipped; safe identities/provenance are typed inputs for the separately owned native manager.

## Architectural choice

### Option 1 — Shared compatibility plan plus pure MCP projection (chosen)

Extract the evaluator's MCP interpretation into one strict, registry-driven plan and consume it from both report generation and a pure complete-plugin projection creator. Extend the already-complete portable source seam only for exact native-key/alias descriptors and one optional alias capability. This optimizes for one policy authority, deterministic offline tests, redaction, and package independence while keeping production availability honestly blocked.

### Option 2 — Reinterpret opaque declarations inside the runtime projector

Leave the evaluator untouched and write a second parser that translates accepted declarations. This is locally smaller, but compatibility and activation can drift as soon as one side adds an alias, auth form, field, or transport rule. Mechanical cross-checks would still compare two vocabularies rather than remove the duplication. Rejected.

### Option 3 — Pass raw declarations through `McpConfigSource.options`

Treat the MCP package as another foreign-format reader and let it infer behavior. This leaks Claude/Codex authority past the normalized boundary, places launch values and likely secrets in generated source objects, and makes package choice observable in application behavior. Rejected.

The trickiest unit is the shared compatibility plan. It must preserve every existing verdict and safe diagnostic while also producing enough canonical, secret-free structure for runtime projection. Designing it first removes the otherwise unavoidable policy duplication from every later unit.

## Exact contracts

### Shared compatibility plan

**File**: `src/domain/mcp-compatibility-plan.ts`

```typescript
export const McpCanonicalTransportSchema = z.enum(["stdio", "streamable-http"]);

export const McpCanonicalAuthSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict().readonly(),
  z.object({ kind: z.literal("bearer-environment") }).strict().readonly(),
  z.object({
    kind: z.literal("oauth"),
    flow: z.enum(["authorization-code", "client-credentials"]),
  }).strict().readonly(),
]);

export const McpCanonicalOptionsSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  startupTimeoutMs: z.number().int().positive().optional(),
  toolTimeoutMs: z.number().int().positive().optional(),
  allowedTools: z.array(z.string().min(1)).readonly().optional(),
  deniedTools: z.array(z.string().min(1)).readonly().optional(),
  instructions: z.string().optional(),
  resources: z.union([z.boolean(), z.array(z.string()).readonly()]).optional(),
  toolApproval: z.boolean().optional(),
  sampling: z.boolean().optional(),
  elicitation: z.object({
    form: z.boolean(),
    url: z.boolean(),
  }).strict().readonly().optional(),
  auth: McpCanonicalAuthSchema,
}).strict().readonly();

export const McpCompatibilityPlanSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  componentId: ComponentIdSchema,
  transport: McpCanonicalTransportSchema,
  options: McpCanonicalOptionsSchemaV1,
  requirementCapabilityIds: z.array(RuntimeCapabilityIdSchema).readonly(),
  provenance: z.array(SourceLocationSchema).nonempty().readonly(),
}).strict().readonly();

export type McpCompatibilityAnalysis =
  | Readonly<{ kind: "supported"; plan: McpCompatibilityPlan }>
  | Readonly<{ kind: "incompatible"; diagnostics: readonly Diagnostic[] }>;

export function analyzeMcpCompatibility(input: Readonly<{
  plugin: PluginKey;
  component: McpServerComponent;
}>): McpCompatibilityAnalysis;
```

`CompatibilityPolicyRegistry.mcp.keys` gains canonical field-group metadata (canonical target, units, aliases, allowed transport, and collision rule). `evaluateCompatibility` delegates its MCP branch to this function and derives requirement uses from `plan.requirementCapabilityIds`. The projector calls the same function and checks those capabilities against report requirement ids; it never independently recognizes a field.

Canonical alias groups are exact:

| Canonical target | Accepted fields | Collision behavior |
|---|---|---|
| transport | `transport`, `type`; `http` → `streamable-http` | selectors must canonicalize equally |
| working directory launch value | `cwd`, `workingDirectory` | equal values collapse; unequal values incompatible |
| startup timeout ms | `startupTimeout`, `timeoutMs` | equal values collapse; unequal values incompatible |
| tool timeout ms | `toolTimeout`, `timeout` | equal values collapse; unequal values incompatible |
| allow list | `allowTools`, `allowedTools`, `tools.allow` | equal sets collapse after exact sort/dedupe; unequal sets incompatible |
| deny list | `denyTools`, `disabledTools`, `tools.deny` | equal sets collapse after exact sort/dedupe; unequal sets incompatible |
| auth declaration | `auth`, `oauth`, `authentication`, `bearerTokenEnv` | one coherent mode/flow only; bearer and OAuth cannot coexist |
| feature declaration | top-level aliases and `features.*` | duplicate semantic slot incompatible, even across spellings |

Allow and deny lists that contain the same exact tool name are incompatible rather than relying on undocumented precedence. Static launch-bearing values are validated by the shared plan but deliberately absent from its output.

### Package-neutral source and alias contract alignment

**File**: `src/application/ports/mcp-runtime.ts`

```typescript
export const McpRuntimeServerKeySchemaV1 = z
  .string()
  .regex(/^mcp-server-v1:[0-9a-f]{64}$/)
  .brand<"McpRuntimeServerKey">();

export const McpToolAliasSegmentSchema = z.string()
  .min(1)
  .max(1024)
  .superRefine(/* well-formed Unicode scalars; no C0/C1 controls or NUL */);

export const McpToolAliasTemplateSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("claude-plugin"),
  pluginName: McpToolAliasSegmentSchema,
  nativeServerKey: McpToolAliasSegmentSchema,
  collisionPolicy: z.literal("omit-all"),
  preserveNativeDiscovery: z.literal(true),
}).strict().readonly();

export const McpSourceServerSchemaV1 = z.object({
  componentId: ComponentIdSchema,
  nativeKey: z.string().min(1),
  transport: McpBridgeTransportSchema,
  options: z.record(z.string().min(1), JsonValueSchema).readonly(),
  launchTemplate: z.record(z.string().min(1), JsonValueSchema).readonly(),
  toolAliases: z.array(McpToolAliasTemplateSchemaV1).max(1).readonly(),
  provenance: z.array(SourceLocationSchema).nonempty().readonly(),
}).strict().readonly();

// Added to McpRuntimeCapabilitiesSchemaV1.features:
pluginToolAliases: z.boolean();

// Added to McpSourceServerStatusSchema:
nativeKey: z.string().min(1);
```

This is a backward-incompatible schema-v1 development change before release, not a compatibility shim. Contract tests, the fake, and conformance fixtures update in the same checkpoint. `pluginToolAliases: false` remains a qualifying source runtime and does not alter `pi.mcp.runtime`; it means aliases are omitted while native discovery remains authoritative.

### Exact plugin MCP projection

**File**: `src/application/mcp-plugin-projection.ts`

```typescript
export const PluginMcpLaunchTemplateSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  componentId: ComponentIdSchema,
  contentRef: PluginContentRefSchema,
  dataRef: PluginDataRefSchema,
  configurationRef: PluginConfigurationRefSchema.optional(),
}).strict().readonly();

export const PluginMcpAliasOmissionCodeSchema = z.enum([
  "RUNTIME_ALIAS_UNAVAILABLE",
  "UNREPRESENTABLE_ALIAS_SEGMENT",
]);

export const PluginMcpAliasOmissionSchema = z.object({
  componentId: ComponentIdSchema,
  serverKey: McpRuntimeServerKeySchemaV1,
  code: PluginMcpAliasOmissionCodeSchema,
}).strict().readonly();

const PluginMcpProjectionNoneSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("none"),
  identity: McpSourceIdentitySchemaV1,
  aliasOmissions: z.tuple([]),
  digest: ContentDigestSchema,
}).strict().readonly();

const PluginMcpProjectionSourceSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("source"),
  source: McpConfigSourceSchemaV1,
  aliasOmissions: z.array(PluginMcpAliasOmissionSchema).readonly(),
  digest: ContentDigestSchema,
}).strict().readonly();

export const PluginMcpProjectionSchemaV1 = z.discriminatedUnion("kind", [
  PluginMcpProjectionNoneSchemaV1,
  PluginMcpProjectionSourceSchemaV1,
]);

export function deriveMcpRuntimeServerKey(
  componentId: ComponentId,
): McpRuntimeServerKey;

export function createPluginMcpProjection(input: Readonly<{
  projection: PluginRuntimeProjection;
  compatibility: CompatibilityReport;
  runtimeCapabilities: McpRuntimeCapabilities;
  sha256: Sha256;
  digest?: ContentDigest;
}>): PluginMcpProjection;

export function verifyPluginMcpProjection(
  input: unknown,
  sha256: Sha256,
): PluginMcpProjection;
```

For `kind: "source"`, each `source.servers[serverKey]` has:

```typescript
{
  componentId,
  nativeKey,
  transport: plan.transport,
  options: plan.options,
  launchTemplate: {
    schemaVersion: 1,
    componentId,
    contentRef: projection.contentRef,
    dataRef: projection.dataRef,
    ...(projection.configurationRef === undefined
      ? {}
      : { configurationRef: projection.configurationRef }),
  },
  toolAliases: runtimeCapabilities.features.pluginToolAliases && claudeProvenance
    ? [{
        schemaVersion: 1,
        kind: "claude-plugin",
        pluginName: compatibility.plugin.manifestName
          ?? compatibility.plugin.marketplaceEntryName,
        nativeServerKey: nativeKey,
        collisionPolicy: "omit-all",
        preserveNativeDiscovery: true,
      }]
    : [],
  provenance: strippedSortedLocations,
}
```

Alias segments are retained exactly only when they are well-formed Unicode scalar strings without NUL/control characters; otherwise the template is omitted with `UNREPRESENTABLE_ALIAS_SEGMENT`. Path-like text remains legal identity input because it is never interpreted as a path, but it receives no rewritten alias.

### Post-discovery alias collision resolver

**File**: `src/application/mcp-tool-aliases.ts` (package-internal)

```typescript
export const McpToolAliasClaimSchemaV1 = z.object({
  source: McpSourceIdentitySchemaV1,
  serverKey: McpRuntimeServerKeySchemaV1,
  componentId: ComponentIdSchema,
  nativeToolName: z.string().min(1),
  alias: z.string().min(1),
}).strict().readonly();

export type McpToolAliasResolution = Readonly<{
  exposed: readonly McpToolAliasClaim[];
  omitted: readonly Readonly<{
    claim: McpToolAliasClaim;
    code: "NATIVE_NAME_COLLISION" | "ALIAS_CLAIM_COLLISION" | "UNREPRESENTABLE_ALIAS";
  }>[];
}>;

export function formatMcpToolAlias(
  template: McpToolAliasTemplate,
  nativeToolName: string,
): string;

export function resolveMcpToolAliases(input: Readonly<{
  nativeToolNames: readonly string[];
  claims: readonly McpToolAliasClaim[];
  isRepresentable(name: string): boolean;
}>): McpToolAliasResolution;
```

`formatMcpToolAlias` performs the exact foreign concatenation
`mcp__plugin_${pluginName}_${nativeServerKey}__${nativeToolName}`. It does not
escape, normalize, case-fold, or slug any segment; representability and final
name collisions therefore decide whether the alias can be exposed faithfully.
The runtime remains responsible for discovery and registration. This pure helper
only resolves a complete snapshot of names: exact duplicate claims collapse;
native names reserve their spelling; all multi-owner alias claims are omitted;
output is independent of input order. It never removes or renames the native
tool.

## Implementation units

### Unit 1: Extract the registry-driven MCP compatibility plan

**Files**:
- `src/domain/mcp-compatibility-plan.ts`
- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/index.ts`
- `test/domain/mcp-compatibility-plan.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/domain/compatibility-table-contract.test.ts`

**Story**: `epic-mcp-runtime-integration-plugin-projections-policy-plan`

**Implementation notes**:
- Move, do not copy, the evaluator's MCP transport/auth/feature/field logic into `analyzeMcpCompatibility`.
- Keep diagnostics redacted and source-located; the plan may contain only canonical non-secret structural values.
- Derive requirement capability ids from registry rules, and derive report requirement ids through the existing evaluator path.
- Verify component ids against `plugin + { kind: "mcp-server", nativeKey }` with injected SHA-256 at the application projection boundary; format readers remain synchronous and unchanged.

**Acceptance criteria**:
- [ ] All existing compatibility MCP fixtures retain their intended verdicts, requirements, safe diagnostics, and ordering.
- [ ] Every accepted field/alias is represented by registry-owned metadata; deleting a registry mapping makes both report and projection reject the shape.
- [ ] Conflicting aliases/selectors, allow/deny overlap, unknown fields, SSE, WebSocket, credential-bearing URLs, and unsupported auth fail closed.
- [ ] Plan serialization contains no command, args, cwd, env value, URL, header value, bearer environment name, OAuth client value, raw declaration, or native cause.

### Unit 2: Align aliases with the portable bridge contract

**Files**:
- `src/application/ports/mcp-runtime.ts`
- `src/application/mcp-tool-aliases.ts`
- `src/index.ts`
- `test/application/mcp-runtime-contract.test.ts`
- `test/application/mcp-tool-aliases.test.ts`
- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-runtime-port.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

**Story**: `epic-mcp-runtime-integration-plugin-projections-alias-contract`

**Implementation notes**:
- Extend the package-neutral schema/fake/conformance in place; do not import or name `pi-mcp-adapter`.
- The fake validates, copies, inspects, and redacts native keys/alias templates but does not discover or register tools.
- `pluginToolAliases` is a complete runtime fact only; it does not add a compatibility rule or change aggregate runtime availability.
- Keep `resolveMcpToolAliases` pure and order-independent. Production adapter integration remains blocked elsewhere.

**Acceptance criteria**:
- [ ] Strict source schemas reject malformed server keys, unknown alias fields, more than one alias template, and alias templates that could disable native discovery or select another collision policy.
- [ ] Fake and conformance status preserve `nativeKey`, component id, exact source identity, and source locations without exposing options/launch templates.
- [ ] Native-name collisions and two-source alias collisions omit every alias claimant, while exact duplicate claims collapse and native names survive.
- [ ] Capability false is representable and does not make `pi.mcp.runtime` unavailable; no test claims a production runtime exists.

### Unit 3: Build the deterministic complete-plugin MCP projection

**Files**:
- `src/application/mcp-plugin-projection.ts`
- `src/index.ts`
- `test/application/mcp-plugin-projection.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

**Story**: `epic-mcp-runtime-integration-plugin-projections-source-projection`

**Implementation notes**:
- Verify the complete projection digest with `createActiveProjectionExpectation` before deriving any MCP source.
- Compare report identity, supported MCP ids, plan requirements, and available report requirements exactly before output.
- Build all server records privately, sort them, parse the complete source once, then derive and verify the contribution digest.
- Return `kind: "none"` for zero MCP servers; never call `McpConfigSourceSchemaV1` with an empty map.

**Acceptance criteria**:
- [ ] Reordered equivalent inventory/provenance/report input produces byte-identical canonical output and digest.
- [ ] Same native key in different plugin/scope sources has a distinct complete identity; revision changes preserve the local server key but change exact source/removal identity.
- [ ] No-MCP input returns deterministic `none`; unsupported/missing/extra/mismatched report inventory fails before source creation.
- [ ] Source JSON contains logical refs and structural options only, with no physical root, expanded placeholder, command/URL/header/env value, secret canary, live state, or declaration payload.
- [ ] Unicode normalization pairs, separators, path-like names, very long names within existing limits, and control/lone-surrogate cases follow the exact key/alias rules without identity rewriting.

### Unit 4: Prove projection-to-port behavior through the package-neutral fake

**Files**:
- `test/integration/mcp-plugin-projection.test.ts`
- `test/fixtures/compatibility/mcp.ts`

**Story**: `epic-mcp-runtime-integration-plugin-projections-projection-conformance`

**Implementation notes**:
- Feed only `kind: "source"` output to `FakeMcpRuntime.validateSource`/`replaceSource`; `kind: "none"` makes no runtime call.
- Exercise duplicate native keys across user/project scopes and plugins, report/inventory mismatch, deterministic replacement keys, exact removal/inspection, status provenance, and capability-on/off alias templates.
- Assert provider call counts remain zero: launch-context ownership is deliberately not implemented here.

**Acceptance criteria**:
- [ ] Every generated non-empty source passes the unchanged package-neutral runtime validation and replacement path.
- [ ] Exact inspection/removal uses generated source identity and runtime keys; display/native/alias names cannot remove another source.
- [ ] Status/result/error serialization remains redacted under declaration, path, header, environment, and secret canaries.
- [ ] No-MCP, alias-disabled, collision, stale replacement, and unsupported-shape vectors remain offline and side-effect-free.
- [ ] Full verification records that no production dependency, runtime adapter, launch/connect, lifecycle mutation, reload, or projection persistence was added.

## Implementation order and dependency DAG

1. `epic-mcp-runtime-integration-plugin-projections-policy-plan` — no sibling dependencies.
2. `epic-mcp-runtime-integration-plugin-projections-alias-contract` — depends on policy plan so alias descriptors use the canonical native/transport model.
3. `epic-mcp-runtime-integration-plugin-projections-source-projection` — depends on policy plan and alias contract.
4. `epic-mcp-runtime-integration-plugin-projections-projection-conformance` — depends on source projection.

The caller prohibited `.work/bin/work-view`, so the new sibling chain was checked manually: every edge points from a later checkpoint to an earlier checkpoint and none targets the parent or itself. The feature-level dependency remains unchanged for eventual closure; portable child progression does not mean the production bridge exists.

## Testing

- **Policy interface**: existing evaluator/table fixtures plus focused canonical-plan tests protect the single acceptance vocabulary and safe report behavior.
- **Projection interface**: schema/type/digest tests protect exact source identity, no-MCP output, report cross-checking, canonical ordering, and logical-only launch references.
- **Identity regressions**: table vectors cover equal native keys across plugins/scopes/revisions; `a_b`/`a + b_c`-style alias ambiguity; composed/decomposed Unicode; slash/backslash/dot path forms; NUL/control; lone surrogates; and insertion-order permutations.
- **Alias behavior**: pure resolver tests protect native-first, omit-all collisions, no suffixing/precedence, exact duplicate collapse, representability failure, and stable ordering.
- **Portable integration**: fake runtime tests protect source validation, exact replacement/removal/inspection keys, provenance/status redaction, and zero launch-provider calls.
- **Public contract**: package barrel/type tests and compiled export allowlist intentionally account for new schema-derived public contracts.
- **Useful-test economy**: use table-driven vectors and one fake integration matrix. Do not duplicate foreign reader tests, the parent bridge conformance suite, or production adapter qualification tests.

## Simplification

- The evaluator's existing MCP parser becomes the single reusable compatibility plan instead of gaining a second runtime parser.
- Existing plugin/component/source identities drive registration, status, aliases, and removal; no parallel identity registry or MCP state store is introduced.
- One strict source schema and one pure alias collision resolver replace host-specific naming branches.
- Raw launch fields remain in the authoritative complete projection and are referenced by component/logical refs, so generated MCP sources do not duplicate executable values.
- No existing behavior or guarantee is intentionally removed; newly explicit alias/field collisions fail closed rather than choosing undocumented precedence.

## Risks and rollback

- **Shared-plan extraction changes verdicts accidentally**: preserve current table fixtures before moving logic, then add only explicit collision vectors. Rollback is to stop before the projector consumes the plan; do not retain two parsers.
- **Portable contract extension outruns a future package**: `pluginToolAliases: false` remains valid and native discovery still works. A future package must pass the parent conformance suite plus alias-specific tests before claiming alias capability.
- **Aliases cannot be known before discovery**: source registration carries templates only; the pure complete-snapshot resolver runs after native discovery. If faithful alias registration is unavailable, omit aliases rather than delaying source registration or hiding native tools.
- **Contribution digest is mistaken for ownership**: schemas and tests keep source identity as replace/remove/inspect authority; contribution digest is observation evidence only.
- **No-MCP update leaves an older source**: this feature emits `none` and does not mutate runtime state. The lifecycle-reconciliation feature must use the prior exact identity to remove the old source; pretending an empty source is removal is forbidden.
- **Hostile names leak into paths or deletion keys**: only opaque source/component-derived keys reach authority positions. Raw names are values for inspection/alias derivation and are never path-interpreted.
- **Report and inventory were produced at different revisions**: exact component/requirement/digest checks fail closed with safe ids. The caller must regenerate the complete projection/report pair.
- **Where confidence is lowest**: the eventual selected runtime's post-discovery alias registration semantics. That uncertainty is represented as an explicit optional capability and collision contract, not a production claim.

## UI alignment

No UI surface and no mockups. Safe MCP source/server/provenance/alias evidence is data for the native manager owned by `epic-native-plugin-management`.

## Implementation summary

- **Ownership and waves**: one cohesive high-effort feature owner implemented the four dependency-ordered checkpoints sequentially: policy plan → alias contract → source projection → portable conformance. Shared domain/application/test write sets made one owner safer than story fan-out; no nested agent, peer, worktree split, or launch-context edit was used.
- **Single policy authority**: compatibility reporting and projection now consume one registry-driven MCP analysis. Existing non-MCP evaluator paths remain unchanged, while ambiguous aliases/selectors, unsupported shapes, credential-bearing URLs, and capability/report drift fail closed with redacted evidence.
- **Projection architecture**: a pure schema-derived `none | source` projection binds source authority to scope/plugin/revision/complete-projection digest and local server authority to opaque component-derived keys. Canonical structural options and logical refs are deterministic; native names, aliases, and provenance are non-authoritative views.
- **Alias architecture**: strict package-neutral templates preserve native discovery. The internal complete-snapshot resolver gives native names precedence, collapses exact duplicates, omits every contested claimant, and never normalizes, rewrites, suffixes, or grants authority to aliases.
- **Portable boundary**: fake/conformance/public tests remain package-neutral. No `pi-mcp-adapter` dependency or production claim, runtime adapter, launch/connect/provider invocation, lifecycle mutation, reload, projection persistence, generated settings/file source, or launch-context change was introduced.
- **Dispatch/review posture**: caller-required direct cohesive ownership was used at high effort. Effective review weight is project-default `standard`, but the caller explicitly set the lifecycle boundary at feature `review`; no feature review or transition to `done` was performed in this run.

## Verification

Full `npm test` passed after focused risky-seam suites:

- TypeScript typecheck: passed with no errors.
- Dependency boundaries: 219 modules and 1,326 dependencies cruised; zero violations.
- Vitest: 158 test files, 819 tests passed; no type errors.
- Build/package/public exports: ESM build passed and compiled package import passed with 478 exports.
- One unrelated concurrent recovery-process test failed once with an existing journal race symptom, then passed immediately in the focused rerun; the required final full pipeline passed cleanly without code or test changes in that area.

## Review (2026-07-16)

**Verdict**: Approve

**Blockers**: Four receiver-accepted high findings from the sole standard review pass were fixed in `93a0e76`:

1. Restored pre-extraction MCP compatibility for positive fractional timeouts, direct `tools` arrays, independent OAuth/header claims, duplicate-header diagnostics, and transport/feature-specific requirement rules and provenance. Differential pre-extraction vectors now protect those forms.
2. Made `CompatibilityPolicyRegistry.mcp.keys.fieldGroups` authoritative for recognized paths, aliases, canonical targets, transport applicability, and collisions. The evaluator and projector share the analyzer, and a mutable registry-fixture test proves alias addition/removal changes both paths together.
3. Bound every complete runtime projection to the full plugin identity (including `manifestName`) and a canonical digest of the complete compatibility report and supported skill/hook/MCP inventory. Alias templates now derive only from that bound identity; manifest-only and non-MCP-inventory substitutions fail closed.
4. Canonicalized set-like source/component provenance and JSON object order with explicit UTF-8 tuple comparators before complete projection hashing. Reordered/duplicated equivalent evidence now has byte-identical complete/MCP serialization, source identity, and contribution digest, while composed/decomposed Unicode remains distinct.

**Important**: Optional malformed digest parsing outside the redacting guard was parked unbound at `.work/backlog/idea-redact-malformed-projection-digests.md` in `c3687ec`.

**Nits**: none

**Rejected**: none

**Notes**: Substrate feature review at effective project-default weight `standard`; exactly one independent review pass ran before this adjudication. Closure used fix verification only, with no second review. Child stories remained `done`. Minimality audit found no production adapter, package coupling/claim, launch-context, lifecycle, persistence, or non-MCP behavior change beyond updating three handcrafted projection-schema test fixtures for the newly bound evidence fields.

### Review verification

- Focused MCP policy/evaluator/projection/conformance suite: 6 files, 43 tests passed.
- Drifted skill-resource/contribution fixtures plus the previously flaky recovery vector: 11 focused tests passed (3 unrelated tests filtered out).
- Final `npm test`: typecheck passed; dependency-cruiser passed with 226 modules and 1,359 dependencies, zero violations; Vitest passed 166 files and 873 tests with no type errors; package build/import passed with 494 exports.
- `git diff --check`: passed.
