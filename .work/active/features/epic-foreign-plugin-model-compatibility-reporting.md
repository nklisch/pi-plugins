---
id: epic-foreign-plugin-model-compatibility-reporting
kind: feature
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-12
---

# Complete-Bundle Compatibility Reporting

## Brief

Evaluate every normalized declaration in a plugin bundle and produce an inspectable compatibility report containing component-level verdicts, runtime requirements, warnings, source claims, and an activatable decision. The evaluator distinguishes supported behavior, harmless metadata-only declarations, conditional requirements, and incompatible runtime semantics across Agent Skills, command hooks, MCP servers, plugin configuration, paths, and unsupported host-native components.

Activatability is derived from the complete inventory: any incompatible runtime component or unavailable required capability prevents activation, with no partial-install mode. The report supplies precise diagnostic evidence for downstream inspection, trust, and lifecycle services, but it does not collect trust, activate resources, or own runtime adapter behavior.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: terminal capability consuming the fully normalized bundle and exposing the trusted understanding layer to downstream epics
- Design alignment: enforce honest complete-bundle compatibility and fail closed on unknown runtime behavior as fixed by the parent epic's `## Design decisions`

## Foundation references

- `docs/VISION.md` — Honest compatibility; Whole-plugin lifecycle; Compatibility boundary
- `docs/SPEC.md` — Component compatibility verdicts; Trust and security
- `docs/ARCHITECTURE.md` — Complete-bundle validation; Compatibility; Error model
- `docs/COMPATIBILITY.md` — Verdict terminology; Plugin manifests; Skills; Hook handlers and events; MCP server compatibility

## Discovery and UI alignment

- **Discovery posture**: Direct-read only, as required by the caller. The parent and predecessor feature, all foundation and compatibility documents, project rules, current domain/bundle contracts, readers, exports, and representative compatibility/ingestion tests were read locally. No nested agent or peer mechanism was used.
- **Existing single sources of truth**: `NormalizedPluginSchema` and `flattenComponents` define the complete normalized bundle; `ComponentVerdictRegistry`, `RuntimeRequirementStatusRegistry`, `deriveActivatable`, and `createCompatibilityReport` define report mechanics; component ids and provenance are already stable ingestion outputs. This feature adds policy and capability facts around those contracts rather than replacing them.
- **Current normalization constraint**: hook command semantics are split between normalized handler/event fields and retained metadata; MCP server declarations are intentionally opaque JSON; unsupported native/runtime declarations are `ForeignComponent`s. Compatibility policy must therefore be explicit and fail closed rather than inferring support from shape fragments.
- **UI**: No UI surface. This is a domain/application reporting boundary. Rendering, trust prompts, lifecycle commands, and plugin-manager UI remain downstream.

## Design decisions

- **What is authoritative for activatability?**: The existing `deriveActivatable` function remains the only activatability algorithm, and `createCompatibilityReport` remains the final schema/invariant gate. The evaluator supplies exactly one `ComponentAssessment` for every value returned by `flattenComponents`, plus deduplicated runtime requirement assessments; it never computes or mutates `activatable` independently.
- **Where does compatibility knowledge live?**: One typed `CompatibilityPolicyRegistry` in `src/domain/compatibility-policy.ts` owns supported hook events, hook fields, skill metadata, MCP transports/auth/features, foreign-component rejection, diagnostic codes, and runtime capability ids. Types, accepted tags, dispatch, requirement descriptions, and test cases derive from this registry. No parallel switch-local lists are allowed.
- **How is runtime availability learned?**: A thin application service asks an injected `RuntimeCapabilityProbe` for one immutable capability snapshot, validates it against the domain registry, and passes it to a pure evaluator. The domain never imports Pi, MCP, subagent, process, OS, or filesystem APIs. Abort propagates unchanged; probe/adapter failure throws `BoundaryError(ADAPTER_FAILED)` and never yields a deceptively incompatible report.
- **What does a capability mean?**: A capability is a host/runtime fact, not a fourth component verdict. Supported components cite deterministic requirement ids derived from registry capability ids and their component/provenance context. A missing required capability yields an `unavailable` requirement assessment and a `REQUIREMENT_UNAVAILABLE` diagnostic while the component verdict remains `supported`.
- **How are unknowns handled?**: Unknown hook events, handler semantics, behavior-bearing hook metadata, MCP transports/auth/features/keys, malformed policy-recognized declaration shapes, and every `ForeignComponent` are incompatible. There is no optimistic fallback. Known presentation metadata is warning-only. The strict policy is intentionally narrower than runtime parsing and can expand only by adding a grounded registry entry and tests.
- **How are configuration and marketplace policy treated?**: Structurally valid `PluginConfiguration` descriptors and an optional source-located `MarketplaceInstallationPolicy` produce report-level diagnostics for required input, sensitive handling, defaults, installability, and authentication hints. They do not become synthetic components or runtime requirements and do not override schema-derived `activatable`. Missing configured values, trust, source acquisition, project policy, and catalog availability are lifecycle concerns outside this report.
- **How is provenance preserved?**: Component diagnostics use the exact relevant claim provenance already on the normalized component. Requirement provenance is the stable union of the claims that caused the requirement. Report-level configuration/marketplace diagnostics use descriptor/policy provenance. Arrays are sorted by registry rank and stable identifiers, and diagnostic details include component id, native field/value, requirement id, policy rule id, and all source locations where applicable.
- **What is deliberately absent?**: No trust decisions, activation projections, runtime execution, source lifecycle, configuration value collection/substitution, secret access, filesystem checks, network calls, MCP validation calls, hook execution, UI, or partial-install behavior.
- **Foundation-doc timing**: No design-time foundation edit is required. `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY` already assert the intended three verdicts, separate runtime requirements, complete-bundle decision, and narrow adapter boundary. Implementation updates them only if exact public names or accepted semantics must change.

## Caller-supplied GLM advisory incorporated

The design incorporates the supplied advisory directly:

- registry-driven pure capability snapshot and evaluator policy;
- reuse of existing compatibility mechanics, with `deriveActivatable` and `createCompatibilityReport` as the single sources of truth;
- exactly one assessment per normalized component;
- explicit fail-closed hook, MCP, and foreign policies;
- runtime requirements represented separately from availability;
- a thin abort-aware capability-probe/application-service adapter boundary;
- deterministic provenance-rich output;
- configuration and marketplace concerns emitted as diagnostics without hijacking schema-derived activatability;
- no trust, activation, runtime execution, lifecycle ownership, or UI.

No additional advisory pass was run because the caller prohibited nested agents and peeragent. The local pre-mortem below is the adversarial design pass.

## Architectural choice

### Option A — pure registry-driven evaluator plus capability snapshot service (chosen)

A domain registry names every accepted semantic and required runtime capability. A pure evaluator consumes a validated `NormalizedPlugin`, optional marketplace policy context, and a complete capability snapshot. An application service obtains the snapshot through an abort-aware port and delegates to the evaluator. This preserves ports/adapters, makes compatibility deterministic and exhaustively testable, and keeps runtime availability separate from policy. Its cost is an explicit policy registry and adapter contract.

### Option B — ask runtime adapters to validate each component

Hook and MCP adapters could return per-component verdicts. That would let runtime packages define their own behavior, but it would distribute policy across adapters, make output depend on probe order and live state, couple the domain to later activation mechanics, and make complete deterministic reports difficult. Rejected.

### Option C — one schema-only compatibility parser

A large Zod schema could parse hook/MCP declarations and attach verdicts. It would centralize shape validation, but availability, provenance-rich diagnostics, per-field metadata classification, and registry-derived test coverage would become refinement side effects. It would also duplicate the existing report schema's responsibility. Rejected.

**Choice**: Option A. Policy remains pure data plus total evaluator functions; runtime adapters expose facts only.

## Trickiest unit first

MCP and hook policy evaluation is the riskiest unit because ingestion intentionally retains behavior-bearing details in opaque declarations or metadata. The evaluator must distinguish a known supported construct, a supported construct with a runtime requirement, harmless presentation metadata, and an unknown behavior without guessing. The registry therefore gives every rule:

```typescript
type CompatibilityPolicyRule = Readonly<{
  id: CompatibilityPolicyRuleId;
  surface: "skill" | "hook" | "mcp-server" | "foreign" | "configuration" | "marketplace";
  disposition: "supported" | "metadata-only" | "incompatible";
  requirementCapabilityIds: readonly RuntimeCapabilityId[];
  diagnosticCode?: ErrorCode;
  message: string;
}>;
```

Dispatch is exhaustive over `ComponentKindRegistry`. A hook/MCP sub-policy accepts only fields enumerated in its registry and rejects any unknown behavior-bearing key. The policy does not reinterpret a malformed bundle; it validates the relevant declaration again at this trust boundary and reports incompatibility rather than throwing for foreign semantics.

## Implementation units

### Unit 1: Registry, capability snapshot, and deterministic evaluator

**Story**: `epic-foreign-plugin-model-compatibility-reporting-policy-evaluator`

**Files**:
- `src/domain/compatibility.ts`
- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/index.ts`
- `test/domain/compatibility.test.ts`
- `test/domain/compatibility-policy.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

```typescript
// src/domain/compatibility-policy.ts
export const RuntimeCapabilityRegistry = {
  skillToolRestrictions: { id: "pi.skill.allowed-tools", description: "Pi preserves skill tool restrictions" },
  commandHooks: { id: "pi.hooks.command", description: "Pi command-hook adapter is available" },
  bash: { id: "platform.shell.bash", description: "Bash is available" },
  powershell: { id: "platform.shell.powershell", description: "PowerShell is available on Windows" },
  subagentInterception: { id: "pi.subagents.lifecycle-interception", description: "Subagent pre-start and pre-stop interception is available" },
  mcpRuntime: { id: "pi.mcp.runtime", description: "Plugin-scoped MCP runtime is available" },
  mcpOAuthAuthorizationCode: { id: "pi.mcp.oauth.authorization-code", description: "MCP authorization-code OAuth is available" },
  mcpOAuthClientCredentials: { id: "pi.mcp.oauth.client-credentials", description: "MCP client-credentials OAuth is available" },
  mcpToolApproval: { id: "pi.mcp.tool-approval", description: "MCP tool approval policy is available" },
  mcpSampling: { id: "pi.mcp.sampling", description: "MCP sampling is available" },
  mcpElicitationForm: { id: "pi.mcp.elicitation.form", description: "Interactive form elicitation is available" },
  mcpElicitationUrl: { id: "pi.mcp.elicitation.url", description: "Interactive URL elicitation is available" },
} as const;

export type RuntimeCapabilityId =
  (typeof RuntimeCapabilityRegistry)[keyof typeof RuntimeCapabilityRegistry]["id"];

export const RuntimeCapabilitySnapshotSchema = z.object({
  capabilities: z.record(RuntimeCapabilityIdSchema, RuntimeCapabilityAvailabilitySchema),
  capturedBy: z.string().min(1),
}).strict().readonly().superRefine(requireEveryRegistryCapabilityExactlyOnce);

export type RuntimeCapabilityAvailability = Readonly<{
  status: "available" | "unavailable";
  explanation: string;
}>;

export const CompatibilityPolicyRegistry = {
  // Registry sections are typed and consumed by evaluator dispatch and table tests.
  skills: { /* frontmatter metadata and requirement mappings */ },
  hookHandlers: { /* command/shell/exec semantics and metadata keys */ },
  hookEvents: { /* exact COMPATIBILITY event matrix */ },
  mcp: { /* exact transport/auth/feature/key matrix */ },
  foreign: { defaultDisposition: "incompatible" },
  configuration: { /* report-level diagnostic rules */ },
  marketplace: { /* report-level diagnostic rules */ },
} as const;
```

The snapshot is complete rather than sparse: absence is invalid input, not implicit unavailability. Capability status metadata derives from `RuntimeRequirementStatusRegistry`. Runtime requirement ids use a versioned deterministic grammar such as `requirement-v1:<capability-id>:<component-id>`; repeated capability use by the same component deduplicates, while separate components retain separate provenance-rich requirement records.

```typescript
// src/domain/compatibility-evaluator.ts
export type CompatibilityEvaluationInput = Readonly<{
  plugin: NormalizedPlugin;
  capabilities: RuntimeCapabilitySnapshot;
  marketplacePolicy?: MarketplaceInstallationPolicy;
}>;

export function evaluateCompatibility(
  input: CompatibilityEvaluationInput,
): CompatibilityReport;
```

Algorithm:

1. Parse `NormalizedPlugin`, capability snapshot, and optional policy through their schemas.
2. Flatten and sort the complete component inventory by kind registry rank then component id.
3. Dispatch each component exactly once through its registry policy; assert output component id equals input id and no id is omitted/duplicated.
4. Collect and deduplicate requirements by deterministic id; availability comes only from the snapshot.
5. Add configuration/marketplace report diagnostics without creating components or requirements.
6. Sort component diagnostics, requirement assessments, and report diagnostics by stable severity/code/operation/location/detail keys.
7. Call `deriveActivatable({ components, requirements })` once.
8. Call `createCompatibilityReport` once with that derived value and return its validated output.

No evaluator branch writes `activatable` directly, accepts a caller-supplied value, probes a runtime, or catches schema/programming errors as compatibility findings.

**Acceptance criteria**:
- [ ] The registry is the sole list of runtime capabilities and accepted skill/hook/MCP semantics; schema enums, dispatch metadata, requirement descriptions, and table tests derive from it.
- [ ] Every flattened component produces exactly one assessment with the same id, including incompatible foreign components; no metadata/config/policy pseudo-component is created.
- [ ] Runtime availability changes only requirement assessments and derived activatability; it never changes a supported verdict to incompatible.
- [ ] Output is byte-for-byte deterministic across component/provenance/capability-map insertion-order permutations after schema normalization.
- [ ] `deriveActivatable` and `createCompatibilityReport` remain the only graph/activatability validation mechanics and existing compatibility tests stay authoritative.

### Unit 2: Capability probe port and reporting service

**Story**: `epic-foreign-plugin-model-compatibility-reporting-capability-service`
**Depends on**: `epic-foreign-plugin-model-compatibility-reporting-policy-evaluator`

**Files**:
- `src/application/ports/runtime-capability-probe.ts`
- `src/application/compatibility-service.ts`
- `src/index.ts`
- `test/application/compatibility-service.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `.dependency-cruiser.cjs`

```typescript
// src/application/ports/runtime-capability-probe.ts
export interface RuntimeCapabilityProbe {
  snapshot(signal: AbortSignal): Promise<RuntimeCapabilitySnapshot>;
}

// src/application/compatibility-service.ts
export type CompatibilityAssessmentRequest = Readonly<{
  plugin: NormalizedPlugin;
  marketplacePolicy?: MarketplaceInstallationPolicy;
}>;

export interface CompatibilityService {
  assess(
    request: CompatibilityAssessmentRequest,
    signal: AbortSignal,
  ): Promise<CompatibilityReport>;
}

export function createCompatibilityService(
  probe: RuntimeCapabilityProbe,
): CompatibilityService;
```

The service checks `signal.throwIfAborted()` before and after the probe, calls the probe exactly once, validates the returned complete snapshot, and invokes the pure evaluator. Caller abort/abort rejection is rethrown unchanged. Any non-abort probe exception or invalid adapter snapshot becomes `BoundaryError({ code: ADAPTER_FAILED, operation: "probeRuntimeCapabilities", cause })`; it does not produce a report. Domain incompatibility remains a successful report, never an exception.

This feature defines no concrete Pi/MCP/subagent/OS adapter. A later composition/lifecycle feature maps installed integration facts to the registry snapshot behind this port. This avoids claiming current process reachability or performing an MCP handshake during inspection.

**Acceptance criteria**:
- [ ] The application service imports only domain contracts and its port; domain files import no application/runtime/Pi/Node modules.
- [ ] Probe is called exactly once per assessment and its complete immutable snapshot is the only availability input.
- [ ] Pre-abort, mid-probe abort, invalid snapshot, adapter rejection, and successful incompatible report have distinct tested outcomes.
- [ ] No partial report is returned on adapter failure, and native causes remain attached only to the thrown boundary error.
- [ ] Dependency-cruiser and public/compiled export allowlists enforce the narrow boundary.

### Unit 3: Complete policy fixtures, row grounding, and integration hardening

**Story**: `epic-foreign-plugin-model-compatibility-reporting-contract-hardening`
**Depends on**: `epic-foreign-plugin-model-compatibility-reporting-policy-evaluator`, `epic-foreign-plugin-model-compatibility-reporting-capability-service`

**Files**:
- `test/fixtures/compatibility/skills.ts`
- `test/fixtures/compatibility/hooks.ts`
- `test/fixtures/compatibility/mcp.ts`
- `test/fixtures/compatibility/foreign.ts`
- `test/fixtures/compatibility/configuration-marketplace.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/domain/compatibility-table-contract.test.ts`
- `test/tooling/boundaries.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `docs/COMPATIBILITY.md` only if implementation proves an existing row cannot be represented faithfully

The contract table test is data-driven from `CompatibilityPolicyRegistry` and contains an explicit fixture id for every row below. It fails when a registry row has no positive/negative fixture or when a compatibility document row has no named grounding case. Integration fixtures are constructed through the existing normalized bundle schemas/readers where possible, not hand-forged reports.

**Acceptance criteria**:
- [ ] Every row in the compatibility grounding tables below maps to a named registry rule and test fixture.
- [ ] Complete mixed bundles prove no partial-install behavior: one incompatible component or one unavailable cited capability makes the whole report non-activatable while all assessments remain present.
- [ ] Provenance tests assert exact host/document/path/pointer for hook events/fields, MCP keys/features, foreign declarations, configuration diagnostics, and marketplace diagnostics.
- [ ] Golden reports prove stable ordering and safe JSON serialization without native causes, secrets, configured values, absolute runtime paths, timestamps, or environment data.
- [ ] `npm test` covers typecheck, dependency boundaries, pure/unit/integration tables, build, and exact compiled exports.

## Compatibility table grounding

Each row names the policy rule id and required assertion. A policy implementation is incomplete unless all rows are executable table cases.

### Verdict and complete-bundle mechanics

| COMPATIBILITY contract | Policy rule / assertion |
|---|---|
| Exactly `supported`, `metadata-only`, `incompatible` | `verdict.registry`: reject any fourth verdict through the existing schema |
| Supported component may cite requirements | `requirement.separate-status`: verdict remains supported for available and unavailable snapshots |
| Metadata-only does not block | `verdict.metadata-only`: warning-only, no requirement ids |
| Incompatible blocks complete plugin | `verdict.incompatible`: all assessments still emitted; derived activatable false |
| Unknown runtime declaration incompatible | `foreign.default-deny`: one incompatible assessment per foreign component |
| Unknown presentation metadata retained | `metadata.known-presentation`: deterministic warning with source claim, no synthetic component |

### Skills

| COMPATIBILITY row | Rule / expected result |
|---|---|
| Agent Skills `name`, `description` | `skill.core`: supported; ingestion already validates required shape |
| `license`, `compatibility`, `metadata` | `skill.presentation`: supported skill plus metadata-only warning diagnostics |
| `disable-model-invocation` | `skill.disable-model-invocation`: supported |
| Codex `agents/openai.yaml` presentation | `skill.codex-presentation`: metadata-only warning diagnostics |
| Codex implicit invocation policy | `skill.codex-invocation-policy`: supported only for registry-known representable values; otherwise incompatible |
| `allowed-tools` | `skill.allowed-tools`: supported plus `pi.skill.allowed-tools` requirement |
| Skill-scoped hooks | `skill.scoped-hooks`: incompatible unless ingestion later emits a normalized supported lifecycle contract; current foreign declaration fails closed |
| Unknown skill frontmatter | `skill.unknown-frontmatter`: incompatible when not registry-proven presentation metadata; never silently gains runtime meaning |

The layouts, roots, supporting files, names, and collisions are ingestion/runtime concerns already represented or deferred. Compatibility evaluates the normalized skill component; collision availability is not fabricated without a capability fact and remains downstream activation validation.

### Hook handler and event policy

| COMPATIBILITY row | Rule / expected result |
|---|---|
| command shell-form / exec-form, timeout | `hook.command`: supported plus `pi.hooks.command`; shell form also cites `platform.shell.bash` unless normalized metadata explicitly selects PowerShell |
| status message | `hook.status-message`: known presentation metadata; warning only |
| `shell: bash` | `hook.shell.bash`: supported plus Bash requirement |
| `shell: powershell` | `hook.shell.powershell`: supported plus PowerShell requirement |
| tool-event `if` rules | `hook.if-rule`: supported only for the registry-known normalized rule grammar; unknown syntax incompatible |
| `async`, `asyncRewake` | `hook.async`: incompatible when true/present with ordering semantics |
| handler type HTTP/prompt/agent/MCP-tool/unknown | `hook.handler.unsupported`: incompatible foreign component |
| supported lifecycle events | `hook.event.supported`: `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PreCompact`, `PostCompact`, `Stop` supported |
| subagent events | `hook.event.subagent`: supported plus `pi.subagents.lifecycle-interception` requirement |
| every event listed incompatible in `docs/COMPATIBILITY.md` | `hook.event.incompatible`: exact registry set rejects `PermissionRequest`, `PermissionDenied`, `Setup`, `UserPromptExpansion`, `PostToolBatch`, `Notification`, `MessageDisplay`, `TaskCreated`, `TaskCompleted`, `StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `Elicitation`, `ElicitationResult` |
| unknown event | `hook.event.default-deny`: incompatible with exact event provenance |

Hook matcher aliases, input/output behavior, process execution, concurrency, and path environment are runtime adapter contracts. This feature does not execute them. The evaluator only confirms that the normalized declaration falls within the documented command/event policy. If the current bundle representation cannot distinguish a documented shell/condition semantic from a generic foreign field, the safe result is incompatible and the integration fixture documents the normalization gap; compatibility must not guess support.

### MCP server policy

| COMPATIBILITY row | Rule / expected result |
|---|---|
| stdio command, args, env, cwd | `mcp.transport.stdio`: supported plus `pi.mcp.runtime` |
| Streamable HTTP URL, static/env headers, bearer env | `mcp.transport.streamable-http`: supported plus `pi.mcp.runtime` |
| OAuth authorization code | `mcp.oauth.authorization-code`: supported plus MCP runtime and OAuth authorization-code requirements |
| OAuth client credentials | `mcp.oauth.client-credentials`: supported plus MCP runtime and client-credentials requirements |
| startup/tool timeout, allow/deny lists, instructions, resources | `mcp.features.core`: supported plus MCP runtime requirement |
| tool approval | `mcp.feature.tool-approval`: additionally cites `pi.mcp.tool-approval` |
| sampling | `mcp.feature.sampling`: additionally cites `pi.mcp.sampling` |
| form elicitation | `mcp.feature.elicitation-form`: additionally cites `pi.mcp.elicitation.form` |
| URL elicitation | `mcp.feature.elicitation-url`: additionally cites `pi.mcp.elicitation.url` |
| explicit legacy SSE | `mcp.transport.sse`: incompatible until a distinct registry capability and faithful contract are deliberately added |
| WebSocket | `mcp.transport.websocket`: incompatible |
| dynamic headers helper | `mcp.headers-helper`: incompatible |
| Claude channels | `mcp.channels`: incompatible |
| unknown transport, auth mode, behavior-bearing key, or malformed recognized combination | `mcp.default-deny`: incompatible; exact field/value provenance in diagnostic details |

MCP declarations are parsed from opaque normalized JSON by a strict, registry-derived policy schema. Exactly one transport is required; conflicting command/URL/transport forms, embedded credentials, literal bearer secrets, and unsupported substitution forms are incompatible. Static header values are not copied into diagnostics. Requirement availability is read only from the snapshot; no MCP server is contacted.

### Unsupported manifest, configuration, and marketplace declarations

| COMPATIBILITY row | Rule / expected result |
|---|---|
| Claude agents; Codex apps/connectors; LSP; monitors; themes/output styles; channels; plugin dependencies | `foreign.default-deny`: each normalized foreign component receives one incompatible assessment |
| Cross-marketplace dependencies, dependency graph/semver, enterprise runtime policy | `foreign.default-deny` when present in inventory; no host precedence or omission |
| Owner, description, category, tags, interface, visibility metadata | `metadata.known-presentation`: warning diagnostic only when retained on plugin; no pseudo-component |
| Valid `userConfig` descriptor | `configuration.descriptor`: report warning describes required/default/sensitive/path constraints from provenance; no value is read |
| Required configuration without default | `configuration.required-input`: diagnostic states input is required downstream; does not change activatable |
| Sensitive configuration | `configuration.sensitive`: diagnostic never includes default/value/secret; does not probe secret storage |
| Available / installed-by-default / not-available marketplace policy | `marketplace.availability.*`: provenance-rich report diagnostic; none changes schema activatable |
| Marketplace authentication/installation policy metadata | `marketplace.policy`: diagnostic only; actual authorization/installability remains lifecycle policy |

## Exact outcome and error matrix

| Condition | Outcome | Stable evidence |
|---|---|---|
| caller abort before probe | throw abort reason / `AbortError`; probe not called | application service test |
| caller abort during/after probe | rethrow abort unchanged; no report | application service test |
| probe rejects or returns invalid/incomplete/unknown capability snapshot | throw `BoundaryError(ADAPTER_FAILED)` with native cause only on error | `probeRuntimeCapabilities` |
| invalid normalized plugin or optional marketplace policy | fail fast with schema error; no report | generated boundary schema |
| duplicate/missing component assessment caused by evaluator bug | internal assertion/schema failure; no report | completeness invariant test |
| unknown hook event/behavior field | successful non-activatable report | `UNSUPPORTED_DECLARATION`, exact component/location/rule details |
| unsupported hook handler represented as foreign | successful non-activatable report | one foreign assessment; `UNSUPPORTED_DECLARATION` |
| malformed/ambiguous MCP declaration at policy boundary | successful non-activatable report | `UNSUPPORTED_DECLARATION`; safe field/path details |
| unsupported MCP transport/auth/feature | successful non-activatable report | `UNSUPPORTED_DECLARATION` |
| unavailable capability cited by supported component | successful report; component remains supported; activatable false | requirement status unavailable plus `REQUIREMENT_UNAVAILABLE` |
| unavailable capability not cited by any component | successful report; no effect on activatable | no synthetic requirement |
| foreign component of any native kind | successful non-activatable report | one incompatible assessment; `UNSUPPORTED_DECLARATION` |
| known presentation metadata | successful report | warning diagnostic; metadata-only rule id |
| valid required/sensitive/path configuration descriptor | successful report | report diagnostic only; no values/secrets/paths resolved |
| marketplace `not-available` or installed-by-default | successful report | report diagnostic only; activatable remains compatibility-derived |
| incorrect evaluator-computed activatable or dangling/duplicate requirement graph | rejected by existing `createCompatibilityReport` / `deriveActivatable` mechanics | no report |

Compatibility findings are data, not thrown failures. Only invalid caller contracts, programming invariant violations, abort, or the capability adapter boundary prevent a report.

## Implementation order

1. `epic-foreign-plugin-model-compatibility-reporting-policy-evaluator`
2. `epic-foreign-plugin-model-compatibility-reporting-capability-service`
3. `epic-foreign-plugin-model-compatibility-reporting-contract-hardening`

The first story stabilizes the registry and pure decision contract. The second owns the sole application port/service boundary. The third closes the full documented matrix and integration/provenance/export surfaces after both contracts exist. The sequence follows dependency and write ownership rather than item count; one implementation owner per story is appropriate.

## Testing

- **Existing mechanics**: preserve and extend `test/domain/compatibility.test.ts` for verdict vocabulary, graph invariants, requirement references, and caller-supplied activatable rejection.
- **Registry contract**: every capability/rule has a unique stable id, deterministic rank, description, disposition, diagnostic mapping, positive fixture, and default-deny neighbor. Compile-time exhaustiveness covers all `ComponentKindRegistry` kinds.
- **Evaluator unit tables**: one-component fixtures for every row above, then mixed complete bundles. Assert verdict, requirement ids/status, activatable, code, operation, safe details, and exact provenance.
- **Determinism**: permute component arrays, metadata arrays, provenance order, capability insertion order, MCP object key order, and optional policy context. Compare canonical JSON reports byte-for-byte.
- **Fail-closed fuzz/property cases**: unknown hook event/metadata keys, unknown MCP transport/auth/features, conflicting transport selectors, malformed recognized combinations, and arbitrary foreign native kinds always yield explicit incompatible assessments rather than exceptions or omission.
- **Capability seam**: fake probe covers complete available/unavailable snapshots, one-call behavior, pre/mid abort, invalid snapshot, and native adapter failure.
- **Diagnostics safety**: prove report JSON contains no secret/configured value, environment value, absolute runtime path, native cause, timestamp, live adapter object, command output, or authorization token. Header diagnostics identify field names without echoing values.
- **Integration**: feed representative normalized bundles from existing ingestion fixtures to the service. Cover skills-only, command hooks, subagent hooks with both availability states, stdio/HTTP MCP, every optional MCP capability, configuration/policy diagnostics, multiple foreign components, and one mixed all-or-nothing bundle.
- **Boundary/public package**: dependency-cruiser tests prove domain purity and application-port direction; public API and compiled import tests assert only intended schemas/types/evaluator/service factory are exported.

## Risks

- **Riskiest assumption — opaque MCP JSON can be classified without format-specific runtime reinterpretation**: the evaluator must understand documented aliases while remaining pure. Mitigation: strict registry-derived canonicalization with exact fixtures from both readers and default-deny unknowns. Fallback: reject an unrepresentable shape as incompatible; do not guess or move policy into the adapter.
- **Current hook normalization may not preserve every supported semantic distinctly**: `shell`, conditions, or future fields may appear as foreign inventory. Mitigation: report the normalized truth and fail closed. Fallback: file a separate ingestion-contract feature if a documented row cannot be represented; do not special-case provenance pointers or silently mark it supported.
- **Capability registry drift**: a runtime adapter may add support without updating policy, or policy may claim a capability an adapter cannot report. Mitigation: complete snapshot validation and registry-derived adapter contract tests. Unknown capability ids fail the adapter boundary.
- **Requirement identity could become persistent**: downstream inspection/trust may compare reports. Mitigation: versioned deterministic ids and golden vectors; add `requirement-v2` rather than mutate v1.
- **Diagnostics could leak sensitive MCP/header/config declarations**: raw normalized declarations may contain secret-looking values. Mitigation: safe rule-specific details whitelist names/types/locations only; never serialize whole MCP/config declaration into report diagnostics.
- **Marketplace diagnostics may be mistaken for install authorization**: activatable intentionally ignores them. Mitigation: stable messages explicitly say catalog policy is advisory context and lifecycle must enforce installability/trust separately.

## Pre-mortem

This design fails if one normalized component disappears from the report, a runtime outage changes a component verdict, unknown hook/MCP behavior is accepted, a probe error becomes a false incompatibility report, or diagnostics echo raw secrets. The countermeasures are the one-assessment-per-flattened-component assertion, separate complete capability snapshot, registry default-deny rules, a thrown adapter boundary, and safe detail builders tested with canary secrets.

The least recoverable error would be duplicating activatability logic outside `deriveActivatable` and allowing it to drift. The evaluator therefore derives once and immediately validates through `createCompatibilityReport`. If any policy shape cannot be grounded in the normalized bundle, the safe fallback is an explicit incompatible verdict plus a separately tracked ingestion-contract change—not optimistic support and not lifecycle probing.

## Implementation summary

All three child stories are done:

- `epic-foreign-plugin-model-compatibility-reporting-policy-evaluator`
- `epic-foreign-plugin-model-compatibility-reporting-capability-service`
- `epic-foreign-plugin-model-compatibility-reporting-contract-hardening`

The implementation delivers registry-driven capability and policy semantics, exhaustive one-assessment-per-component evaluation, fail-closed hook/MCP/foreign handling, deterministic requirement availability and safe diagnostics, a narrow capability probe/service boundary, and executable fixtures for every documented compatibility row. It does not own trust, activation, runtime adapters, lifecycle, configuration collection, or UI.

Integrated verification: `npm test` passes 347 tests plus clean typecheck and dependency boundaries, build, and exact 131-export package import.

## Other agent review

- Phase 1 completeness: Z.AI GLM 5.2 xhigh approved the broad registry, graph, report, and service surface.
- Phase 2 contract quality: GPT-5.6 Sol high reproduced fail-open arbitrary hook conditions, ambiguous OAuth flows, malformed MCP feature flags, and a negative-fixture contract that asserted only identity.
- Accepted: all blocker and important findings because malformed executable declarations could be reported compatible. Tracked by `epic-foreign-plugin-model-compatibility-reporting-review-hardening`.

## Review findings

The feature returns to `stage: implementing` until recognized hook-condition grammar, coherent MCP nested shapes, and complete positive/negative fixture expectations enforce the documented default-deny policy.
