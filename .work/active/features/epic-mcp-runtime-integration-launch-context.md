---
id: epic-mcp-runtime-integration-launch-context
kind: feature
stage: done
tags: [compatibility, infra, security]
parent: epic-mcp-runtime-integration
depends_on: [epic-mcp-runtime-integration-config-source-bridge]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Trusted MCP Launch Context and Secret Delivery

## Brief

Supply the MCP runtime with trusted, short-lived launch context for plugin servers. At the immediate standard-I/O process-launch or remote-connection boundary, resolve logical plugin content/data references to runtime roots, verify project scope and project-root trust, resolve the exact configuration document through the existing callback-scoped configuration service, and substitute supported plugin paths and `${user_config.KEY}` values into command, arguments, environment, working directory, URL, headers, and bearer-token references.

Sensitive configured values, bearer material, and environment-backed headers exist only inside the callback that the MCP runtime immediately consumes. They never enter generated projections, registered source descriptors, status, provenance, reload observations, diagnostics, logs, or caches; the resolved facade is disposed on success, failure, cancellation, and partial launch. Missing required credentials, trust loss, path drift, adapter failure, or abort fail closed with redacted evidence, while runtime-owned process/connection cleanup remains cancellable and explicit.

This feature does not implement MCP transports, OAuth, process supervision, HTTP clients, or tool discovery; those remain in the selected MCP runtime. It also does not create or compose state, credential, configuration-path, project-root, or recovery adapters, change trust policy, mutate authoritative state, coordinate lifecycle transitions, or render configuration prompts; concrete host composition remains in `epic-native-plugin-management`.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: trusted execution-context capability consuming the bridge's late-value boundary; it can proceed in parallel with plugin projection work
- Depends on: `epic-mcp-runtime-integration-config-source-bridge`
- Design alignment: preserve the parent epic's trust authority, secret timing, project boundary, cancellation, cleanup, and redaction decisions

## Boundary guardrails

- Reuse `withResolvedPluginConfiguration`, `ResolvedConfiguration`, content/data root resolution, `ProjectTrustPort`, and project-root authority; do not create MCP-specific secret storage or trust evaluation.
- Keep all registered/prepared source values unexpanded. Plaintext is resolved only when the runtime is about to consume it for one process launch or remote connection.
- Project-scoped launches require the exact trusted project identity/root; user-scope authority cannot substitute for project trust.
- Abort propagates through resolution and runtime handoff. Any started process/session or callback-held value is cleaned up or reported as an explicit ambiguous/cleanup failure, never silently leaked.
- Runtime errors remain safely attributable to plugin/server provenance without copying secret-bearing commands, URLs, headers, or environment values into diagnostics.

## Simplification opportunity

- Reuse one existing callback-scoped configuration and secret-custody path across hooks and MCP instead of creating a second expansion engine.
- Resolve logical content/data references at the adapter edge instead of persisting physical paths or generating per-machine MCP files.
- Keep process and remote-session lifecycle in the MCP runtime; Plugin Host supplies trusted context rather than wrapping or duplicating transport behavior.

## Foundation references

- `docs/VISION.md` — Explicit trust; Standalone operation
- `docs/SPEC.md` — Supporting plugin configuration; MCP servers; Trust and security; Enablement
- `docs/ARCHITECTURE.md` — Runtime projections; Trust flow; MCP adapter
- `docs/COMPATIBILITY.md` — Supporting plugin configuration; Plugin path environment; MCP server compatibility

## Design decisions

- **Delivery boundary**: Implement one package-neutral `McpLaunchValueProvider` backed by a callback-scoped launch-context port. `resolve` is called only by the bridge immediately before one standard-I/O launch or Streamable HTTP connection; `dispose` invalidates only the exact values object issued for that call. Nothing resolves during projection, source registration, validation, inspection, replacement, removal, or capability probing.
- **Portable closure versus production support**: This feature lands the canonical launch-template contract, active-selection/context ports, provider, fakes, and conformance/integration evidence against the completed bridge seam. It does not import or compose `pi-mcp-adapter`, does not satisfy the bridge production-adapter blocker, and does not claim that a real process can launch or a remote server can connect.
- **Invocation authority**: A callback-style `McpLaunchActiveSelectionPort.withSelection` supplies and pins the exact active projection/revision/server selection for the callback lifetime. Entry fails unless scope, plugin, revision, projection digest, component id, transport, content/data/configuration refs, trust candidate, and current project all agree. Replacement/removal must abort or wait for an in-flight selection lease; this feature defines that port contract but does not create lifecycle state.
- **Executable-surface revalidation**: `createMcpLaunchTemplate(component)` is the single canonical mapper for launch-bearing fields of the trusted `McpServerComponent`. Projection code stores that exact secret-free template; every invocation recreates it from the selected component and compares it to the registered source template. `withResolvedPluginConfiguration` then re-verifies the exact trust candidate/records and descriptor-bound configuration document. A trusted component cannot be paired with another command, URL, header, or environment template.
- **Root authority**: Resolve `PluginContentRef` through `ContentStorePort.resolvePlugin`, `PluginDataRef` through `ensureDataRoot`, and the current project through `ProjectRootAuthorityPort.acquire`. Project scope must match the acquired `ProjectKey`, identity, canonical root, and trusted assessment. User-scoped plugins still receive the current project root, but a user-scope record never substitutes for project-scope authority. Physical roots remain callback values and are never written back into projections or state.
- **Trust order**: Validate the active selection and authorize the exact candidate before creating/ensuring data roots or reading ambient environment values. Immediately before rendering plaintext, call `withResolvedPluginConfiguration`, which repeats current project/plugin trust, document, descriptor, secret, and path checks. The duplicate trust check is intentional: the first prevents effects for an unauthorized selection; the second closes the secret-delivery boundary.
- **Template grammar**: Support only exact `${CLAUDE_PLUGIN_ROOT}`, `${PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `${PLUGIN_DATA}`, `${CLAUDE_PROJECT_DIR}`, `${user_config.KEY}`, and portable ambient `${NAME}` tokens. Keys/names use the existing configuration/environment identifier grammar. Reject empty, nested, malformed, unknown-namespace, unclosed, NUL-bearing, or recursively constructed placeholders. Inserted values are never reparsed, so a secret containing `${OTHER}` cannot trigger another lookup. `$NAME`, `%NAME%`, shell substitutions, and command substitutions remain literal.
- **Ambient environment custody**: A new callback-only `McpLaunchEnvironmentPort` reads only the sorted set of names explicitly present in the trusted template. It returns a redacted, disposable facade with `has`, `substitute`, and `redact`, not a process-wide environment object. It is an adapter-neutral read seam, not a secret store; no environment variable is created, overwritten, persisted, or cached. `CLAUDE_PLUGIN_OPTION_<KEY>` references resolve from the current `ResolvedConfiguration` first and are never fetched from ambient process state.
- **Standard-I/O mapping**: Treat `command` and every argument as literal exec-form values; Plugin Host never invokes a shell. Resolve `cwd` only from the exact trusted declaration—arbitrary trusted absolute/relative cwd semantics are not narrowed here—but reject empty/NUL results and never accept a callback-supplied override. Output environment contains the five root values, all current `CLAUDE_PLUGIN_OPTION_*` values, and declared environment entries after substitution. It is an override map; host inheritance remains the MCP runtime's declared behavior.
- **Environment collision policy**: The existing strict JSON parser rejects duplicate raw object keys before normalization; source templates then represent environment entries as ordered arrays so aliases and programmatic inputs cannot hide semantic duplicates. At invocation, reject collisions across root variables, configured variables, and declared entries rather than applying precedence. POSIX compares exact ASCII names; Windows compares the portable ASCII identifier case-insensitively. Names containing `=`, NUL, or non-portable syntax fail. Maps are built with null prototypes and own-property checks, so `__proto__`, `constructor`, and similar placeholder/configuration names cannot mutate prototypes.
- **Streamable HTTP mapping**: Resolve and then parse the URL; allow only `http:`/`https:`, reject userinfo, NUL/control characters, and invalid URLs. The existing strict JSON parser rejects duplicate raw header keys; canonical templates additionally reject aliases that differ only by HTTP case. Header names use the HTTP token grammar and compare case-insensitively on every platform. Header values may be trusted static non-secret text, exact templates, or structured environment references, and final values reject CR/LF/NUL. Bearer selectors resolve either a configured `CLAUDE_PLUGIN_OPTION_<KEY>` or one explicitly named ambient variable; missing/empty/control/whitespace-bearing tokens fail. An explicit `Authorization` header and a separate bearer selector cannot coexist.
- **No secret-looking static credentials**: Existing static declaration support remains for non-secret headers and URL data. A shared sensitive-field classifier (reused by compatibility validation and infrastructure redaction) rejects literal credential material for authorization/token/password/credential-like headers and sensitive query keys; syntax such as the static `Bearer ` scheme may surround a supported logical placeholder, but the credential portion itself must resolve late. Thus activatable projections may retain trusted non-secret declaration text, but collected credential plaintext never enters a projection or source descriptor.
- **Cancellation and timeout**: The provider creates no competing timer. Startup timeout ownership stays in the MCP runtime, which must combine its deadline with caller/source-replacement cancellation in the signal passed to `resolve`. Pre-abort performs no selection/configuration/environment work. Abort during resolution propagates the exact reason unchanged. A final signal check after value issuance but before return disposes the issued lease and rejects; after return, the runtime owns exactly-once disposal. Timeout/cancellation status classification uses reason kind/code only and never copies reason messages.
- **Ownership and disposal**: Parse/copy the registered source at provider construction; parse/copy every active selection at invocation; create fresh frozen arrays/maps and a fresh accessor-backed `McpLaunchValues` lease per call. `dispose` accepts only an object issued by that provider, performs its invalidation once, and is idempotent for a duplicate cleanup call. Access after disposal throws a static safe error. JavaScript strings cannot be securely erased, so the contract explicitly forbids the runtime from retaining/destructuring plaintext beyond immediate launch/connect consumption; the bridge conformance suite tests this lifetime rather than claiming memory erasure.
- **Concurrent launches and revisions**: Each call gets independent selection, configuration, environment, output, and disposal state. Concurrent calls may observe different configuration CAS revisions because each reads authority at invocation; they never share a resolved map. A source/projection replacement before selection denies the old request. A change during a pinned callback aborts or waits through the active-selection port contract. No callback result is cached for a later launch.
- **Failure and status surface**: Add stable MCP launch codes to the common `ErrorCodeRegistry` for authority, configuration, environment, value validation, cancellation, timeout, and cleanup. `McpLaunchContextError`/status mapping allow only source identity, server key, component id, transport, code, and static message. Native causes, templates, command/args/cwd, URL, headers, bearer values, environment names/values, configuration keys/values, and abort messages are never diagnostic/status fields. `McpSourceStatus` continues to expose only its existing source/server allowlist plus the stable error code.
- **Projection sibling handoff**: `epic-mcp-runtime-integration-plugin-projections` owns source/server identity, non-secret options, aliases, provenance, and complete source construction. It must call this feature's canonical `createMcpLaunchTemplate`; it must not copy a second launch-field mapper. This feature accepts source fixtures directly and therefore remains implementable while that sibling is still drafting.
- **No lifecycle or transport ownership**: No state schema, MCP secret store, reload observer, process runner, HTTP client, auth implementation, session/process cleanup, or lifecycle transition is added. Runtime-owned startup/tool timeouts, process/connection cleanup, OAuth, tool discovery, and live health remain outside this feature.
- **UI alignment**: No screen, flow, modal, or visual component is introduced. Mockups are skipped. Safe status codes/provenance are later presentation inputs for `epic-native-plugin-management`.
- **Discovery posture**: Direct-read only, as required. Grounding covered all project rules/conventions, all foundation/compatibility documents, the parent and bridge feature, bridge port/fake/conformance, runtime projection/component/trust/configuration contracts and tests, content/data/project-root ports, and guarded hook context/template/secret-lifetime patterns. No interview, nested agent, peer mechanism, or `work-view` invocation was used.

## Architectural choice

### Option 1 — Callback-scoped provider over an exact active-selection lease (chosen)

Define canonical secret-free launch templates, obtain an exact callback-scoped active selection, re-resolve roots/trust/configuration/environment at every invocation, and issue one disposable `McpLaunchValues` lease. This keeps policy in Plugin Host, keeps transport ownership in the MCP runtime, observes current configuration/revocation, and can be proven against the package-neutral fake while the real adapter is blocked. The cost is a deliberate callback stack and a small active-selection port that native composition must later implement.

### Option 2 — Expand values while building or registering MCP sources

Projection could contain physical paths, process environment, expanded headers, or credentials and registration would become simple. It would also persist machine-local values, extend secret lifetime, miss credential/configuration changes, let status/inspection copy plaintext, and make a registered source an authority. Rejected.

### Option 3 — Let the selected MCP package read Plugin Host state/secrets directly

A package-specific callback could reopen state, credential stores, project trust, and declarations. That shortens one wrapper but couples the domain to an unresolved upstream/fork API, duplicates trust/configuration policy, and makes package behavior the security authority. Rejected.

The trickiest unit is the exact active-selection/context callback. It must prove the request still names the registered, trusted executable surface; acquire the current roots without persisting them; open configuration only after authority checks; and keep a revision/configuration change from racing plaintext delivery. The transport renderers are intentionally downstream of that unit.

## Exact contracts

### Canonical secret-free launch templates

**Files**:
- `src/domain/mcp-launch-template.ts`
- `src/runtime/plugin-launch-roots.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/infrastructure/logging/redaction.ts`

```typescript
export const McpEnvironmentNameSchema = z.string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

export const McpHeaderNameSchema = z.string()
  .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/);

export const McpLaunchTemplateSchemaV1 = z.discriminatedUnion("transport", [
  z.object({
    schemaVersion: z.literal(1),
    transport: z.literal("stdio"),
    command: z.string().min(1),
    args: z.array(z.string()).readonly(),
    cwd: z.string().optional(),
    env: z.array(z.object({
      name: McpEnvironmentNameSchema,
      value: z.string(),
    }).strict().readonly()).readonly(),
  }).strict().readonly(),
  z.object({
    schemaVersion: z.literal(1),
    transport: z.literal("streamable-http"),
    url: z.string().min(1),
    headers: z.array(z.object({
      name: McpHeaderNameSchema,
      value: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("template"), template: z.string() }).strict(),
        z.object({ kind: z.literal("environment"), name: McpEnvironmentNameSchema }).strict(),
      ]),
    }).strict().readonly()).readonly(),
    bearerToken: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("template"), template: z.string() }).strict(),
      z.object({ kind: z.literal("environment"), name: McpEnvironmentNameSchema }).strict(),
    ]).optional(),
  }).strict().readonly(),
]);
export type McpLaunchTemplate = z.infer<typeof McpLaunchTemplateSchemaV1>;

export function createMcpLaunchTemplate(
  component: McpServerComponent,
): McpLaunchTemplate;

export const PluginLaunchRootRegistry = {
  CLAUDE_PLUGIN_ROOT: true,
  PLUGIN_ROOT: true,
  CLAUDE_PLUGIN_DATA: true,
  PLUGIN_DATA: true,
  CLAUDE_PROJECT_DIR: true,
} as const;
```

`createMcpLaunchTemplate` is deterministic and canonicalizes transport/type aliases, `cwd`/`workingDirectory`, auth aliases, header variants, and declaration object order from the same `CompatibilityPolicyRegistry` tables used by compatibility evaluation. Conflicting aliases, duplicate canonical fields, unsupported selectors, or a secret-looking static credential throw a safe template error. Projection and invocation both call this function; there is no second field mapper.

### Active selection and callback-scoped context

**File**: `src/application/ports/mcp-launch-context.ts`

```typescript
export const McpLaunchBindingSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  source: McpSourceIdentitySchemaV1,
  serverKey: z.string().min(1),
  componentId: ComponentIdSchema,
  transport: McpBridgeTransportSchema,
}).strict().readonly();
export type McpLaunchBinding = z.infer<typeof McpLaunchBindingSchemaV1>;

export type McpLaunchActiveSelection = Readonly<{
  expectation: Extract<ProjectionExpectation, { kind: "active" }>;
  revision: InstalledRevisionRecord;
  component: McpServerComponent;
  currentProject: CurrentProjectRuntimeContext;
  candidate: TrustCandidate;
  trustRecords: readonly TrustStateRecord[];
  descriptors: PluginConfiguration;
  pathContext: ConfigurationPathContext;
}>;

export interface McpLaunchActiveSelectionPort {
  withSelection(
    binding: McpLaunchBinding,
    signal: AbortSignal,
    use: (selection: McpLaunchActiveSelection) => Promise<void>,
  ): Promise<void>;
}

export type ResolvedMcpLaunchContext = Readonly<{
  binding: McpLaunchBinding;
  pluginRoot: string;
  pluginDataRoot: string;
  projectRoot: string;
  configuration: ResolvedConfiguration;
}>;

export interface McpLaunchContextPort {
  withContext(
    binding: McpLaunchBinding,
    signal: AbortSignal,
    use: (context: ResolvedMcpLaunchContext) => Promise<void>,
  ): Promise<void>;
}
```

The two callback completion values are discarded. The active port must hold a revision/selection lease or abort the signal if authority is withdrawn; it exposes no get-and-cache API. `ResolvedMcpLaunchContext` exists only inside both the active-selection callback and `withResolvedPluginConfiguration` callback.

### Ambient environment facade

**File**: `src/application/ports/mcp-launch-environment.ts`

```typescript
export interface ResolvedMcpLaunchEnvironment {
  has(name: string): boolean;
  substitute(template: string): string;
  redact(text: string): string;
  toString(): "[REDACTED]";
  toJSON(): "[REDACTED]";
}

export interface McpLaunchEnvironmentPort {
  withResolved(
    names: readonly string[],
    signal: AbortSignal,
    use: (environment: ResolvedMcpLaunchEnvironment) => Promise<void>,
  ): Promise<void>;
}
```

The port reads no unrequested key, invokes `use` at most once, discards its completion, and disposes the facade in `finally`. Missing differs from adapter failure. Names are parsed, deduplicated, platform-checked, and sorted before the port is invoked. A later native composition may read `process.env`; this feature supplies only a fake/conformance contract and performs no environment mutation.

### Context factory and provider

**Files**:
- `src/application/mcp-launch-context.ts`
- `src/runtime/mcp/launch-value-provider.ts`
- `src/runtime/mcp/launch-error.ts`

```typescript
export function createMcpLaunchContextPort(dependencies: Readonly<{
  active: McpLaunchActiveSelectionPort;
  content: Pick<ContentStorePort, "resolvePlugin" | "ensureDataRoot">;
  projectRoots: ProjectRootAuthorityPort;
  projectTrust: ProjectTrustPort;
  configuration: Readonly<{
    withResolvedPluginConfiguration: typeof withResolvedPluginConfiguration;
    dependencies: Parameters<typeof withResolvedPluginConfiguration>[1];
  }>;
  sha256: Sha256;
}>): McpLaunchContextPort;

export const McpProcessEnvironmentPlatformSchema = z.enum(["posix", "windows"]);
export type McpProcessEnvironmentPlatform = z.infer<
  typeof McpProcessEnvironmentPlatformSchema
>;

export function createTrustedMcpLaunchValueProvider(input: Readonly<{
  source: McpConfigSource;
  context: McpLaunchContextPort;
  environment: McpLaunchEnvironmentPort;
  platform: McpProcessEnvironmentPlatform;
}>): McpLaunchValueProvider;
```

The context factory validates canonical projection/revision evidence with existing verifiers, compares the binding to the active component and source identity, verifies the candidate surface contains the exact MCP id/native key/declaration, authorizes trust, acquires roots, and invokes the existing configuration resolver. The provider recreates/compares the canonical launch template, resolves only its collected tokens, renders one transport union, and returns a fresh provider-owned lease.

### Safe launch failures and status mapping

**Files**:
- `src/domain/error-contract.ts`
- `src/runtime/mcp/launch-error.ts`
- `src/application/ports/mcp-runtime.ts`

```typescript
// Added to ErrorCodeRegistry; values remain the single source for schemas/status.
export const McpLaunchErrorCodes = {
  authorityRejected: "MCP_LAUNCH_AUTHORITY_REJECTED",
  configurationFailed: "MCP_LAUNCH_CONFIGURATION_FAILED",
  environmentFailed: "MCP_LAUNCH_ENVIRONMENT_FAILED",
  valueInvalid: "MCP_LAUNCH_VALUE_INVALID",
  cancelled: "MCP_LAUNCH_CANCELLED",
  timeout: "MCP_LAUNCH_TIMEOUT",
  cleanupFailed: "MCP_LAUNCH_CLEANUP_FAILED",
} as const;

export class McpLaunchContextError extends DomainContractError {
  // Static message and allowlisted identity details only.
}

export function classifyMcpLaunchFailure(
  error: unknown,
  signal: AbortSignal,
): ErrorCode;
```

Provider aborts still throw the original reason. Classification is for the runtime's redacted `McpSourceServerStatus.errorCode`; it uses only safe class/code/name checks and never reason text. `McpLaunchContextError.toDiagnostic()` contains only operation, plugin, component/source identity, server key, transport, stable code, and static message.

## Implementation units

### Unit 1: Canonical launch-template and placeholder contract

**Story**: `epic-mcp-runtime-integration-launch-context-portable-contracts`

**Files**:
- `src/domain/mcp-launch-template.ts`
- `src/runtime/plugin-launch-roots.ts`
- `src/runtime/hooks/hook-launch-contract.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/infrastructure/logging/redaction.ts`
- `src/application/ports/mcp-launch-context.ts`
- `src/application/ports/mcp-launch-environment.ts`
- `src/domain/error-contract.ts`
- `test/domain/mcp-launch-template.test.ts`
- `test/runtime/hooks/hook-launch-contract.test.ts`
- `test/application/mcp-launch-contract.test.ts`

**Implementation notes**:
- Derive serializable types from strict Zod schemas and canonicalize from `CompatibilityPolicyRegistry`; do not reread foreign files or assign compatibility verdicts here.
- Move only the five root names/classification into the shared root registry. Preserve existing hook shell/unknown-placeholder behavior while MCP uses strict, non-recursive resolution.
- Reuse one sensitive-name classifier between compatibility and structured redaction. It identifies fields that cannot safely contain literal credentials; it does not redact arbitrary trusted non-secret declarations.
- Build all maps with null prototypes/own checks. Harden `ResolvedConfiguration.environment()` in the same unit so hostile but schema-valid keys cannot mutate a prototype.

**Acceptance criteria**:
- [ ] One component declaration produces one deterministic template regardless of object insertion order or foreign aliases.
- [ ] Unsupported/conflicting transport/auth/cwd aliases and static secret-looking credential fields fail safely and mechanically agree with compatibility policy.
- [ ] Malicious `${user_config.__proto__}`, `${__proto__}`, nested, recursive, unknown-namespace, unclosed, NUL, and missing tokens cannot access object prototypes or trigger a second lookup.
- [ ] Existing hook root substitution behavior remains unchanged after sharing the root registry.
- [ ] Public/source status/configuration/projection JSON contains templates and logical names only, never resolved canaries.

### Unit 2: Exact active-selection and trusted root/configuration context

**Story**: `epic-mcp-runtime-integration-launch-context-trusted-context`

**Files**:
- `src/application/mcp-launch-context.ts`
- `src/application/ports/mcp-launch-context.ts`
- `src/application/ports/mcp-launch-environment.ts`
- `test/application/mcp-launch-context.test.ts`
- `test/support/fakes/mcp-launch-context.ts`

**Implementation notes**:
- Mirror the guarded-hook callback custody pattern, but compare MCP source identity/server/component/transport instead of hook source order.
- Verify `ProjectionExpectation`, `InstalledRevisionRecord`, content/data/config refs, trust candidate surface, current project, and exact MCP component before any secret/environment read.
- Authorize once before roots/effects, then call `withResolvedPluginConfiguration` immediately around the consumer so current trust/config/path evidence is rechecked.
- `withSelection` must pin authority or cancel; this service neither stores nor observes lifecycle transitions itself.

**Acceptance criteria**:
- [ ] Wrong scope/plugin/revision/projection/server/component/transport/root/ref/current-project evidence fails before configuration, secret, ambient-environment, or callback invocation.
- [ ] Project scope requires the exact acquired trusted project identity/key/root; user-scope authority cannot launch a project source.
- [ ] Content and data roots are resolved from exact logical refs per invocation and never persist in source/projection/status evidence.
- [ ] Trust revocation, executable declaration drift, configuration descriptor/document revision drift, path drift, and required-secret loss fail closed at invocation.
- [ ] Context/facades are callback-scoped and disposed on success, safe failure, and abort; callback completion cannot return plaintext.

### Unit 3: Immediate standard-I/O and Streamable HTTP value delivery

**Story**: `epic-mcp-runtime-integration-launch-context-transport-delivery`

**Files**:
- `src/runtime/mcp/launch-value-provider.ts`
- `src/runtime/mcp/launch-error.ts`
- `src/application/resolved-configuration.ts`
- `test/runtime/mcp/launch-value-provider.test.ts`
- `test/application/resolved-configuration.test.ts`

**Implementation notes**:
- Parse/copy the source once, compare the invocation request exactly, recreate the canonical component template inside trusted context, and collect only required ambient names.
- Standard I/O returns literal command/args/cwd plus a fresh null-prototype environment map. No shell, executable resolution, process start, host-environment mutation, or process cleanup occurs.
- Streamable HTTP returns only URL, headers, and optional raw bearer token. OAuth configuration and connection behavior remain runtime-owned.
- Implement accessor-backed redacted leases with provider identity/once-state in WeakMaps. Valid disposal has no external effect and therefore cannot fail; wrong-provider/foreign access fails safely.

**Acceptance criteria**:
- [ ] Stdio command/args are independently substituted and remain literal; cwd comes only from trusted template; roots/configured environment are delivered exactly once at callback time.
- [ ] POSIX exact and Windows case-insensitive environment collisions—including reserved/configured/declared layers—fail rather than overwrite; exact/case-insensitive duplicate headers always fail.
- [ ] URL protocol/userinfo/control validation, header CRLF/NUL validation, authorization/bearer ambiguity, and missing/empty/control/whitespace token cases fail with stable redacted codes.
- [ ] Every resolve returns independent arrays/maps/lease identity; source/template/selection mutation after registration cannot alter output.
- [ ] JSON/string/error/status inspection of issued values is `[REDACTED]`; after disposal, every accessor fails and disposal work has run once.

### Unit 4: Race, conformance, and leak evidence

**Story**: `epic-mcp-runtime-integration-launch-context-conformance`

**Files**:
- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-launch-context.test.ts`
- `test/application/mcp-runtime-contract.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`

**Implementation notes**:
- Extend the fake launch hook to consume values inside one callback, record only safe failure codes/status, and prove disposal on consumer success, throw, cancellation, timeout, and transport mismatch.
- Add negative conformance harnesses for retained/eager values, copied disposal identity, double disposal effects, unsafe failure serialization, and status carrying templates/plaintext.
- Exercise concurrent launches with independent configuration/environment revisions and source replacement before/during resolution.
- Keep production-package timing/file-isolation/process/connection tests in the blocked bridge production story; this suite proves only portable semantics.

**Acceptance criteria**:
- [ ] Pre-abort calls no dependency; abort/timeout during selection/root/config/environment/render propagate the exact reason and leak no values.
- [ ] Abort after issuance but before return disposes locally once; abort after return is disposed by the runtime once; success and consumer failure also dispose once.
- [ ] Concurrent launches never share maps/facades/disposal state and may safely observe distinct authoritative configuration revisions.
- [ ] Source replacement/removal before selection denies old launch; change during a pinned selection aborts or waits according to the lease contract without using a stale cache.
- [ ] Canary plaintext is absent from source/projection/config/status/evidence/diagnostics/errors/log-spies/cache-like fixtures and compiled/public surfaces.
- [ ] The fake and intentionally broken harnesses prove the reusable contract catches eager resolution, value retention, unsafe status, imprecise selection, and missing disposal.

## Implementation order and child-story DAG

1. `epic-mcp-runtime-integration-launch-context-portable-contracts` — no sibling dependencies.
2. `epic-mcp-runtime-integration-launch-context-trusted-context` — depends on portable contracts.
3. `epic-mcp-runtime-integration-launch-context-transport-delivery` — depends on trusted context.
4. `epic-mcp-runtime-integration-launch-context-conformance` — depends on transport delivery.

The feature is intentionally one cohesive implementation/review bundle. Stories are durable security/acceptance checkpoints, not separate transport workers. No child depends on the externally blocked bridge production adapter; none may claim production MCP activation.

## Testing

- **Stable boundary contracts**: strict schema/type tests protect canonical templates, active-selection/context/environment ports, stable launch codes, and the existing `McpLaunchValueProvider` union without exporting plaintext helpers.
- **Authority regression matrix**: independently drift every source/projection/revision/component/ref/trust/project field and assert denial before secrets/environment/callback.
- **Template and injection matrix**: roots, config, ambient names, repeated values, no recursive expansion, malformed/nested/prototype-like placeholders, NUL/control characters, exec literalness, and hostile object keys.
- **Stdio platform matrix**: POSIX versus Windows name equality, reserved/configured/declared collisions, null-prototype maps, command/argument/cwd boundaries, and deterministic key order.
- **HTTP matrix**: URL schemes/userinfo/query placeholders, static versus environment/config headers, case collisions, CRLF, bearer ambiguity, missing tokens, and non-secret static allowlists.
- **Lifetime/race matrix**: success, provider failure before issuance, consumer failure after issuance, pre/during/post-resolution abort, timeout reason, disposal failure contract violation, concurrent callbacks, source replacement, and configuration CAS changes.
- **Leak canaries**: serialize/stringify/inspect every source, status, diagnostic, error, fake observation, public export, and compiled declaration. Plaintext is allowed only while configuration/environment facades and the one issued runtime lease are live.
- **Test economy**: one parameterized placeholder/collision matrix, one authority matrix, one reusable bridge conformance suite, and focused integration tests. Do not duplicate every matrix once per transport when the shared resolver is the behavior under test. No existing useful test is scheduled for removal.

## Simplification

- One canonical launch-template mapper is shared by projection and invocation; no Claude/Codex/runtime-specific expansion tables.
- One existing configuration resolver remains trust/configuration/secret authority; no MCP credential store or eager map.
- One active-selection callback plus existing content/data/project-root ports replaces MCP-specific state and root caches.
- One five-name root registry is shared with guarded hooks without changing hook semantics.
- One provider renders both transports and one fake/conformance suite qualifies future upstream/fork adapters.
- No file/settings mutation, process-global environment mutation, transport/auth implementation, lifecycle state, reload logic, or package conditional is introduced.

## Risks and rollback

- **External adapter may cache or clone values**: the portable provider cannot force a future package to honor immediate consumption. Conformance and package tests are the gate; until a qualifying package passes, production support remains unavailable. Rollback is to omit the provider from composition, not weaken lifetime guarantees.
- **Active-selection lease is not yet composed**: native lifecycle integration must supply pin-or-abort semantics from existing active projection/revision authority. A get-only adapter is non-conforming. Until composed, portable tests use a deterministic callback fake.
- **JavaScript cannot erase copied strings**: accessor invalidation limits accidental reuse but cannot revoke a string already copied by a consumer. The trust boundary is the immediate MCP runtime callback and its conformance behavior; no memory-erasure claim is made.
- **Projection and launch parsing could drift**: both must call `createMcpLaunchTemplate`; canonical comparison at invocation fails closed. If the compatibility vocabulary grows, registry/table tests fail until mapping is added.
- **Ambient environment semantics differ by platform**: portable ASCII names, explicit platform equality, requested-name-only reads, and no mutation avoid most divergence. Unsupported names fail rather than being normalized differently.
- **Static secret classifier can be too narrow or broad**: reuse the structured redaction classifier and test known auth/token/query families. Trusted static non-secret headers remain supported; uncertain credential-like literals route to configuration/environment rather than projection.
- **Cancellation can race value ownership transfer**: the final signal check defines the ownership point. Before successful return the provider disposes; after successful return the runtime disposes. Tests force both sides of the race.
- **Configuration changes between concurrent launches**: this is intended late-binding, not inconsistency. Each launch is internally coherent under its own callback; no cross-launch snapshot is promised.
- **Where confidence is lowest**: the future real adapter's exact consumption/disposal timing and source-replacement cancellation. These remain explicit production qualification tests in the blocked bridge story, not assertions from fake evidence.

## Pre-mortem

The design fails if a registered callback launches a different revision/component than the trusted one, reads a revoked/missing configuration, lets a root or hostile placeholder redirect authority, overwrites an environment/header key by platform aliasing, leaks a URL/header/token through an error, or loses ownership during cancellation. Exact selection leases, canonical template recreation, double trust/config revalidation, root capabilities, strict non-recursive templates, collision rejection, redacted code-only failures, and a single ownership-transfer point directly address those cases.

If the active-selection lease cannot be implemented without adding lifecycle state here, native composition must adapt its existing active projection/revision authority; this feature does not absorb it. If the real MCP package cannot consume and dispose values immediately, MCP remains unavailable or the maintained fork must implement the bridge contract. There is no eager-expansion fallback.

## Portable completion boundary

All four child stories are implementable against the completed package-neutral bridge contract, fake, and conformance seam. Green completion proves trusted portable launch-value delivery and contract behavior only. Production launch/connect, source registration, process/session cleanup, runtime status integration, and parent-epic closure still require the externally blocked `epic-mcp-runtime-integration-config-source-bridge-production-adapter` plus the later lifecycle-composition feature.

## UI alignment

No UI surface and no mockups. Configuration/trust collection and status rendering belong to `epic-native-plugin-management`.

## Implementation summary

Implemented the four security checkpoints as one cohesive xhigh owner in dependency order:

1. **Portable contracts** — one strict schema-derived canonical launch template, shared root registry, shared structured sensitive-field classifier, callback-only selection/context/environment ports, null-prototype configured environments, and stable error-code registry entries.
2. **Trusted context** — one exact active-selection lease that recomputes projection/revision/reference evidence, compares the selected component to projection and executable trust, authorizes before root effects, reacquires and verifies project/content/data roots, and invokes the existing configuration resolver as the final trust/document/path/secret check.
3. **Transport delivery** — one source-bound provider with strict non-recursive template rendering, requested-name-only ambient reads, literal standard-I/O values, strict Streamable HTTP values, platform-aware collision rejection, redacted accessor leases, and a single cancellation ownership-transfer point.
4. **Conformance** — an immediate-consumption fake/runtime contract with safe status codes and disposal on every outcome, negative broken harnesses, concurrent configuration-revision evidence, trust-revocation evidence, public/compiled allowlists, and end-to-end integration through the real resolver.

The context callback carries the freshly canonicalized non-secret template alongside roots/configuration so the provider can compare it to the registered source without reopening lifecycle state. This is a small contract elaboration over the design sketch, not a new authority. Static credential-looking standard-I/O environment values were also rejected unless late-bound, extending the design's header/query rule to preserve the stated canonical secret-free invariant.

No production MCP runtime, `pi-mcp-adapter` import/composition, process launch, HTTP connection, OAuth/auth implementation, environment/file/settings mutation, lifecycle/reload logic, secret store, cache, or projection-feature implementation was added. The fake remains test-only and exports no production capability.

## Implementation run notes

- Ownership: GPT-5.6 Sol, xhigh, direct host implementation. One sequential feature owner was retained because all stories share the same trust/value-lifetime invariants and overlapping contracts; nested agents and peer mechanisms were explicitly prohibited.
- Review weight: standard by project default, but the caller explicitly set the lifecycle boundary at **feature `review` after full green verification** and prohibited nested agents. No independent review was run in this implementation stride.
- Child checkpoints advanced directly `implementing → done`: portable-contracts, trusted-context, transport-delivery, conformance.
- Rebased story commits:
  - `f620d10` — portable contracts
  - `407067b` — trusted context
  - `6f1bb4b` — transport delivery
  - `5b2701b` — conformance/integration/public surface

## Mainline integration

The rebase onto the plugin-projection work preserved one registry-driven MCP compatibility plan as policy authority. `createMcpLaunchTemplate` now consumes that shared analysis instead of restoring the deleted evaluator parser, and `createPluginMcpProjection` emits both exact logical projection binding and the canonical unexpanded launch template. The runtime source schema verifies component and transport agreement across bridge, projection, aliases, and launch contracts; the trusted context recreates and checks both projection binding and template before any plaintext delivery.

Projection feature stage and review findings remain unchanged. Launch child stories remain `done`, this feature remains at `review`, and no production adapter or capability claim was added.

## Integrated verification

Full `npm test` pipeline passed after mainline integration:

- typecheck: no errors;
- dependency boundaries: **233 modules / 1,401 dependencies**, no violations;
- unit/integration/contracts: **173 files / 926 tests passed**, 0 failed, no type errors;
- compiled package import: **508 exports**.

The combined projection, launch, compatibility, and bridge focused run passed **149/149 tests**.

## Portable completion status

The feature's portable completion boundary is satisfied. Production launch/connect remains unavailable by design until `epic-mcp-runtime-integration-config-source-bridge-production-adapter` and later lifecycle composition qualify a real package against these contracts; that external production dependency does not block portable completion.

## Review (2026-07-16)

**Verdict**: Approve

**Effective weight**: standard (project default and caller instruction)
**Independent passes**: 1; the sole review was completed before this fix stride, and the accepted blockers were closed by verification without re-review.

**Blockers**: six accepted findings, all resolved:

1. Public source schemas now use canonical `McpCanonicalOptionsSchemaV1` options and enforce canonical, secret-free late-value templates directly at the schema boundary. Direct validation and replacement reject durable option/template canaries before storage without reflecting plaintext.
2. The shared sensitive-field/query classifier now covers cookies, signatures (including `X-Amz-Signature` and `sig`), sessions, and JWT-style carriers. Equivalent late-bound template and structured-environment forms remain supported; static credentials are incompatible and non-serializing.
3. `deriveMcpRuntimeServerKey` is the single component-id derivation authority. Source and launch-binding schemas enforce it before active selection, root, configuration, or environment dependencies can run.
4. Top-level and nested header aliases resolve through the registry-owned field group. Only exact-equivalent duplicates collapse; conflicts fail independently of declaration object order, and compatibility/template construction consume the same resolution.
5. Structured environment selectors use an explicit configured-option-or-ambient path. A structured `PLUGIN_ROOT` reads that ambient name while template `${PLUGIN_ROOT}` still resolves the trusted plugin root.
6. Cancellation or timeout triggered inside environment facade `has`/`substitute` propagates the identical signal reason, issues no lease, disposes callback custody before rejection, and wins safe status classification even when cleanup also fails.

**Important**: portable conformance cannot prove that a real production runtime does not copy plaintext before lease disposal. Parked for maintained-fork qualification as `idea-verify-mcp-runtime-plaintext-non-retention` (`e1da9ec`).

**Nits**: none.
**Rejected**: none.

**Fix commit**: `d1dbf28` (`fix: harden trusted MCP launch boundaries`).

**Verification**:

- Focused projection, launch, compatibility, bridge, and structured-redaction suites: **24 files / 184 tests passed**, 0 failed, no type errors.
- Full `npm test`: typecheck green; dependency boundaries **235 modules / 1,417 dependencies**, no violations; **173 files / 954 tests passed**, 0 failed, no type errors; compiled package import **508 exports**.
- The first full run encountered one transient, unrelated multi-process recovery-journal failure; its isolated rerun passed **4/4**, and the complete rerun passed **954/954**. No unrelated production or test code was changed.

**Notes**: All projection-review fixes, registry authority, canonical provenance, logical-only source evidence, and the no-production-support boundary remain intact. No production MCP package, process launch, HTTP connection, adapter composition, or capability claim was added. Standard review closes after accepted-blocker fixes and green verification; no second review was run, as explicitly required.
