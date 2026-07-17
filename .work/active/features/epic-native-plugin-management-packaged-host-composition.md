---
id: epic-native-plugin-management-packaged-host-composition
kind: feature
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Packaged Host Composition and Concrete Adapters

## Brief

Create the locally packageable Plugin Host kernel that assembles the completed ingestion, compatibility, lifecycle, recovery, skill/hook, and MCP participant contracts behind one application container. Supply the concrete Node/Pi adapters still missing from packaged operation: authoritative lifecycle state and inventory, configuration and secret custody, configuration paths and write IDs, transition/recovery artifacts, installed-revision loading, project-root and trust authority, and complete runtime reconciliation/reload observation.

The composition root accepts package-neutral runtime participants, so it can be implemented and verified before the maintained MCP and subagent forks are published. Missing optional production participants remain explicit unavailable capabilities; composition must never claim a complete plugin active from partial runtime evidence.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Position: local foundation for every management capability
- Owns concrete adapter lifetime, filesystem/database locations, startup/shutdown ordering, recovery bootstrap, and one host application container.
- Reuses the existing application ports and services; it does not redesign state schemas, transactions, recovery, foreign formats, skill/hook execution, MCP transport, or subagent interception.
- Does not own marketplace behavior, command grammar, Pi rendering, or external adapter package implementation.

## Existing seams to compose

- State, lifecycle, configuration, trust, recovery, projection, reload, and inventory contracts under `src/application/ports/` and the completed lifecycle services.
- Existing filesystem content/projection stores, SQLite transition/revision adapters, recovery scanner, and project-root authority composition.
- `SkillHookLifecycleParticipant`, MCP lifecycle participant, and `composeActivationObservation` package-neutral seams.
- Pi project trust and effective working-directory evidence must remain explicit rather than inferred from path spelling.

## Acceptance boundary

- A fresh process can open one user scope and the current project scope, recover incomplete transitions, load installed revisions, build exact desired runtime projections, reconcile all supplied participants, and expose a ready application container.
- Adapter results are typed, abort-aware, redacted, deterministic, and idempotently closable; secret plaintext and native causes do not enter state, logs, diagnostics, or projection caches.
- User and project scope locations cannot alias; concurrent writers use the existing lock/CAS/journal guarantees rather than a new authority.
- Package-neutral fakes prove complete-participant composition, missing-capability behavior, restart, recovery, and shutdown without Claude, Codex, `pi-mcp-adapter`, or `pi-subagents` installed.
- Concrete file names, schemas, and public factory signatures remain late-bound to feature design after an inventory of already implemented adapters.

## Mockup inheritance

No new UI is owned here. This feature supplies status and capability data to the selected split-inspector manager but does not render it. The parent mockups remain the presentation authority.

## Grounding and design decisions

- **Discovery posture**: Direct-read only, as required. Grounding covered the parent epic and dependency DAG; `VISION`, `SPEC`, and `ARCHITECTURE`; project/global rules; completed state, locking, immutable-store, trust/configuration, lifecycle, recovery, adoption, and update features; all current application ports; existing Node factories; foreign readers/materializers; portable skill/hook and hardened MCP runtimes; capability probes; Pi 0.80.8 extension, package, reload, session, and SDK contracts; package exports; and representative integration/public-boundary tests. No question, nested agent, peer mechanism, or `.work/bin/work-view` invocation was used.
- **Manual DAG check**: The new child chain is acyclic by construction: contracts are the only root; durable/project adapters follow contracts; revision loading follows durable state; runtime selection follows revision/project adapters; hook and MCP composition are sibling consumers; reload/application convergence follows both; package hardening is the sole leaf. No child depends on this feature or a later sibling.
- **One construct-only root**: `createPackagedPluginHost()` performs pure option/path-shape validation, creates inert delegates, and registers only event delegates needed to receive explicit Pi startup/resource/shutdown and later hook boundaries. Those delegates have no target before `start()` and execute no hook. The factory opens no file, starts no process/timer, contacts no network/runtime, registers no command/tool, executes no hook, and performs no recovery. Every effectful adapter is created inside `start()` or an explicit later application operation.
- **Two lifetime tiers**: The construct-only `PackagedPluginHost` owns Pi bootstrap delegates and duplicate-composition registration. A `StartedPackagedPluginHost` owns one exact Pi session binding, opened adapters, runtime participants, services, leases, and background task handles. `session_shutdown` aborts session runtime immediately; application resources drain until in-flight lifecycle work is settled, then close in reverse construction order.
- **Exact Pi binding**: A binding is captured only from `session_start`'s `ExtensionContext`: `sessionManager.getSessionId()`, optional session file, `ctx.cwd`, `ctx.mode`, and initial `ctx.isProjectTrusted()` evidence. `PiSessionBindingPort.isProjectTrusted()` calls the still-bound current context at assessment time rather than treating the initial boolean as durable authority. Every later Pi context is checked against session id and cwd before it can invoke application work. Ambient `process.cwd()`, a caller-supplied project path, a session-file directory, or path spelling alone never selects project state or trust.
- **Project identity**: The Node/Pi resolver canonicalizes the actual `ctx.cwd` through `realpath` and `pathToFileURL(...).href` for `canonicalRoot`. A Git checkout gets a `repositoryFingerprint` by SHA-256 hashing a versioned encoding of the real Git common-directory device/inode identity; a non-Git directory remains explicit `path-only`. `createScopeContext` derives/verifies the root-bound `ProjectKey`. `createProjectRootAuthorityPort` remains the only capability issuer. `ProjectTrustPort` returns trusted only when the requested key is the exact current binding and Pi reports that binding trusted.
- **Path authority**: The default host root is `<getAgentDir()>/plugin-host`, resolved once without filesystem access during construction. No project path, plugin key, marketplace name, URL, or alias is interpolated into machine paths. New authoritative-state project filenames decode only the 64 lowercase hex digest from `ProjectKey`; user and project filenames use different fixed prefixes and startup rejects any resolved alias. Existing scope-lock and recovery codecs continue to receive only schema-verified `ProjectKey` values and retain their versioned on-disk spelling so already-written lock/journal evidence is not orphaned.
- **Authoritative state backend**: Add a dedicated SQLite lifecycle-state adapter, one database per scope. This is the state authority, not another lock or journal. It stores canonical document blobs plus one current pointer/generation in a short `BEGIN IMMEDIATE` transaction, validates/migrates every read through the existing registry/codecs, accepts only `VerifiedStateMutation`, and enforces expected-generation CAS itself. The existing SQLite `ScopeLockManager` still protects the adjacent promotion window; the state transaction remains the final CAS authority.
- **Clean defaults**: First user open creates generation zero with empty current host-config v2, installed-user v2, and trust v1 documents. First project open creates an empty current project-local v2 document bound to the exact project identity/key and a versioned digest for “portable intent not synchronized”; it never reads or silently adopts `.pi/plugins.json`. The subsequent marketplace/sync feature replaces that sentinel through normal verified synchronization.
- **State compatibility**: Reads retain the current six-family registry and pure migrations. A database never rewrites a readable older blob merely because it was read; the next committed mutation writes current schemas. The adapter retains the current and previous complete generations and never fabricates a snapshot from a partially migrated set. Recovery journals remain separate and continue to reference opaque pending refs, so adapter migration cannot reinterpret transition evidence.
- **Configuration custody**: Add one private rollback-journal SQLite configuration database under the host root. It implements exact ref/revision CAS and stores only `PluginConfigurationDocument`; it rejects any payload not accepted by the existing schema. Configuration write IDs, operation IDs, and refresh claim IDs use Node cryptographic randomness and existing schemas. A session-bound path adapter resolves user-relative paths against the exact current project root and project-relative paths only through `TrustedProjectRoot`; project paths cannot escape via lexical or realpath/symlink traversal.
- **Secret custody**: Production secret custody is explicitly unavailable on every platform. Review established that freedesktop Secret Service `CreateItem(..., replace=false)` does not provide atomic uniqueness for an attribute set, so a stable single winner and safe loser cleanup cannot be proven. The speculative D-Bus backend and `dbus-next` dependency were removed rather than publishing a false no-replace claim. There is no file, environment, Pi-settings, SQLite, CLI, or plain-D-Bus fallback; non-sensitive plugins continue and sensitive configuration remains unavailable until a backend can prove the full ownership contract.
- **Installed revision reconstruction**: The current `InstalledPluginLoader` cannot be implemented from lossy state plus `metadata.json` v1: state deliberately omits resolved sources and executable declarations, while store metadata currently retains only identity/manifest/binding. Plugin promotion therefore gains a strict version-2 immutable reconstruction descriptor containing the verified `LoadedInstalledPlugin` evidence used to create the installed record. The descriptor is stored in sealed store metadata, verified against content/source/binding and the installed summary on load, and never copied into lifecycle state or projection caches. Existing v1 roots still resolve as content but return `INSTALLED_DESCRIPTOR_UNAVAILABLE`; no source URL or catalog declaration is guessed.
- **Derived projections remain replaceable**: Startup uses the immutable reconstruction descriptor to re-assess current runtime capabilities and regenerate missing/corrupt projection caches. The stored compatibility report verifies the installed revision; a fresh report decides whether it can activate now. Adapter disappearance therefore blocks only the affected plugin and never mutates installed evidence or claims partial activity.
- **One runtime selection catalog**: A composition-owned immutable catalog binds each active projection to its installed revision, current compatibility report, exact trust candidate/records, configuration descriptors/ref, current project context, content/data roots, and component identities. It supplies both `HookExecutionActiveSelectionPort` and callback-pinned `McpLaunchActiveSelectionPort`; hook and MCP adapters do not reread ambient state or independently choose revisions.
- **Participant set**: Skills/resources and ordinary hooks are required built-in participants. MCP is a required observation participant for every plugin but can produce exact `none`/inactive evidence without a runtime when the projection declares no MCP servers. A plugin declaring MCP requires a supplied `McpRuntimePort`; a plugin declaring subagent hooks requires a qualified published `SubagentLifecyclePort`. Absence remains an unavailable capability, not a skipped participant. The growing participant names stay derived from the existing `RuntimeContributionParticipantSchema` rather than a second string registry.
- **Capability probe chain**: A new Node/Pi base probe supplies every non-MCP/non-subagent registry fact from exact composed adapters and local shell availability. Existing `createMcpRuntimeCapabilityProbe` and `createSubagentLifecycleCapabilityProbe` decorate it. Construction does not probe. Startup and compatibility operations probe on demand, validate complete snapshots, and distinguish absent optional adapters from malformed present evidence.
- **Hook/subagent composition**: Startup composes the existing snapshot loader, skill/hook participant, manifest skill verifier, resource discovery, planner, execution context, executable resolver, command runner, decision adapter, and Pi event delegates. Subagent registration occurs only after published qualification and uses one aggregate coordinator for the exact parent session. With no qualified lifecycle adapter, ordinary hooks still work and subagent-hook compatibility remains unavailable.
- **MCP composition**: Startup composes the existing MCP projection, lifecycle participant, launch-context/value, ambient-environment, active-selection, and revision-lease adapters. Environment custody resolves only requested names from a startup-captured environment view, is callback-scoped/redacted, and never persists values. Registration is local/offline; runtime contracts may not connect, authenticate, discover tools, or start processes until the runtime requests launch values for actual use.
- **One canonical complete-plugin reload adapter**: `createCompletePluginReloadPort` is the sole `LifecycleReloadPort`. It derives one complete desired set from authoritative user plus current trusted-project state, rebuilds projections, and quiesces new hook/MCP admission. It atomically installs a candidate selection epoch so participant-internal launch callbacks can resolve it, reconciles the full skill/hook set, verifies skill paths, reconciles exact MCP transitions, and returns `composeActivationObservation` only when every required contribution matches the same scope/plugin/revision/project evidence. Exact success commits the candidate and resumes admission. Failure keeps admission closed while the same participant path restores the retained previous epoch/set; if restoration cannot be observed exactly, the plugin remains blocked/recovery-required. Already-admitted callbacks retain their old epochs throughout.
- **Pi reload handoff**: Pi 0.80.8 exposes `ctx.reload()` only on `ExtensionCommandContext`, and documents that the old call frame continues after the old runtime shuts down. `runWithPiOperationContext(ctx, ...)` is therefore the only manual lifecycle entry window. It pins the old application resources, creates a process-global safe reload ticket, invokes `ctx.reload()` once, and then consumes exact observation published by the new extension instance after its `resources_discover` pass. The old frame uses no Pi object after `ctx.reload`; it only finalizes through still-pinned application adapters and the broker. The old host then closes. A background operation with no valid Pi command context gets `PI_RELOAD_CONTEXT_UNAVAILABLE`; unattended automatic activation is not claimed by this composition. This limitation is surfaced as a host capability for the later update-policy feature rather than hidden behind an internal slash command.
- **Startup recovery mode**: During explicit `start()`, the same reload adapter may reconcile locally without invoking Pi reload. Required recovery runs after adapters and project authority exist but before final desired-set publication. A fresh process has no candidate observation, so interrupted candidate activation conservatively follows the existing rollback path; a same-process reload sees the previous transition owner as live, leaves settlement to the pinned predecessor, and activates the authoritative pending candidate for exact handoff evidence.
- **Startup order**: bind session/project → initialize host/state/config/recovery/content adapters → open generation zero defaults → construct pure services/probes/participants → run bounded required recovery for user/current project → reread settled authority → rebuild exact selections/projections → acquire/replace the session revision lease → reconcile skill/hook and MCP participants → let Pi `resources_discover` consume the verified skill set → publish reload tickets/startup report → expose the application container. Marketplace refresh, scheduler timers, remote MCP work, hooks, and commands do not run in this local readiness path (except recovery’s explicit local reconciliation where required).
- **Reload ordering**: For a lifecycle transition, journal prepare and state commit remain owned by the existing service. The old instance opens a ticket before `ctx.reload`; the new instance defers live-owner recovery, reads pending state, reconciles the candidate/previous evidence named by the journal, emits resources, and publishes exact contribution evidence. The predecessor observes and finalizes/compensates. Missing/mismatched evidence remains `recovery-required`; callback acceptance never becomes proof.
- **Marketplace/update wiring**: The container composes the existing marketplace readers/merger, manifest content reader, marketplace inspection service, source materializers, compatibility service, a new concrete marketplace-plugin probe, refresh/policy/scheduler services, and the lifecycle service. The probe performs only materialize/inspect/compatibility/immutable comparison and always discards staging. The scheduler is returned inert; a later feature must call it explicitly after local readiness. Marketplace registration/adoption behavior remains owned by the next feature and is not fabricated here.
- **Application surface**: The started container exposes bound lifecycle, configuration, compatibility, inspection, recovery, collection, marketplace refresh/policy/scheduler, capability, and resource services. Raw state commits, transition mutation helpers, SQLite handles, path codecs, credential commands, runtime catalog mutation, and reload broker internals remain private. Subsequent native-management features extend the internal dependency bundle rather than creating per-command composition roots.
- **Disposal and partial failure**: Every effectful acquisition registers cleanup immediately. Shutdown aborts scheduler/runtime signals, rejects new work, unregisters subagent interception, drains/removes owned MCP sources, releases MCP and session revision leases, closes recovery/config/state SQLite handles, and releases duplicate/session/reload claims in reverse order. Cleanup is idempotent and aggregates safe codes; it never deletes initialized state/content roots. A reload predecessor may drain only its already-admitted operation; other shutdown reasons abort all work.
- **Duplicate composition**: A `globalThis[Symbol.for("@nklisch/pi-plugin-host/composition-v1")]` registry rejects two constructed roots for one Pi `ExtensionAPI` and two active roots for one session id. The only permitted overlap is one draining predecessor plus its exactly ticketed reload successor. Different Pi processes and different session ids remain allowed and rely on SQLite locks/CAS.
- **Production runtime late binding**: This feature adds no `pi-mcp-adapter` or `@gotgenes/pi-subagents` dependency and performs no dynamic package-name selection. `createPackagedPluginHost` accepts package-neutral optional ports. The local extension entry supplies neither and reports both unavailable. The production-runtime-acceptance feature may import published qualified adapters and pass them to the unchanged factory; before publication they remain unavailable.
- **Package boundary**: Keep the broad library at `@nklisch/pi-plugin-host`, add `@nklisch/pi-plugin-host/pi` for the composition factory/types, and compile a default `dist/pi/extension.js` listed in `package.json#pi.extensions`. Package metadata adds `keywords: ["pi-package"]`. Tests import packed bytes through package specifiers; no source-tree import or Pi TypeScript loader is required.
- **Foundation timing**: Code-first. Current foundation assertions already describe the intended packaged Node factory, local startup, state/lock/recovery authority, derived projections, exact runtime observation, and late-bound production adapters. Implementation updates a foundation assertion only if landed platform support or package entry names make it false; omission alone is not drift.

## Architectural choice

### Option A — one eager asynchronous extension factory

The Pi extension could open databases, recover state, register runtimes, and start update checks before returning. It is superficially simple, but Pi invokes extension factories in modes that may never start a session, and its own documentation forbids background resources there. It also couples construction to filesystem/network availability and makes partial disposal and tests unreliable. Rejected.

### Option B — construct-only host with explicit session startup, immutable application container, and optional package-neutral participants (chosen)

One pure root owns inert Pi delegates and produces one started application container for an exact session. Startup initializes real Node adapters, recovery, projections, participant composition, and capability evidence in a fixed order. Runtime ports are optional inputs whose absence is represented in compatibility and startup status. A reload broker permits the documented old/new Pi runtime overlap without treating stale Pi objects as usable. This adds explicit lifetime state, but each concept corresponds to an unavoidable host boundary.

### Option C — per-command factories plus a service locator

Each command could open whichever stores and runtimes it needs and discover adapters from a mutable registry. That avoids a large startup graph, but duplicates singleton state, leaks handles, makes reload/observation incoherent, and lets commands bypass the canonical lifecycle/recovery path. Rejected.

**Choice**: Option B. It is the only approach that is both inert at package discovery and explicit about Pi session replacement, process concurrency, participant absence, and disposal.

## Trickiest unit first

The complete-plugin reload bridge is the highest-risk unit. Pi’s `ctx.reload()` tears down the old extension, starts a new instance, fires `session_start`, then `resources_discover`, while the old command call frame resumes afterward. The existing lifecycle service, however, must observe the new runtime and perform a second state commit. Calling `ctx.reload()` and continuing against unpinned old services would use disposed resources; letting the new instance run ordinary recovery would race the still-live transition owner.

The design pins only the old application adapters for the admitted lifecycle operation, aborts its runtime-facing handlers, and hands the exact transition through a process-global safe ticket. The successor validates the same session/cwd and journal record, defers live-owner settlement, reconciles the authoritative pending state, waits through its own resource contribution, and publishes schema-validated observation. The predecessor consumes only that observation, finalizes through state/journal CAS, and drains. If successor startup, resources, participant evidence, or identity does not match, no observation is fabricated and lifecycle remains recovery-required. The fallback for a Pi version without this exact event ordering is capability unavailability, not a direct in-memory “reload succeeded” result.

## Implementation units

### Unit 1: Construct-only host contract, path plan, and exact Pi session binding

**Story**: `epic-native-plugin-management-packaged-host-composition-host-contract-session-layout`

**Files**:
- `src/composition/packaged-plugin-host-contract.ts`
- `src/composition/plugin-host-paths.ts`
- `src/pi/pi-session-binding.ts`
- `src/pi/plugin-host-bootstrap.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/pi/pi-session-binding.test.ts`

```typescript
export type PackagedPluginHostRuntimeParticipants = Readonly<{
  mcp?: McpRuntimePort;
  subagents?: SubagentLifecyclePort;
}>;

export type PackagedPluginHostOptions = Readonly<{
  pi: ExtensionAPI;
  agentDir?: string;
  source?: NodeSourceMaterializerOptions;
  runtime?: PackagedPluginHostRuntimeParticipants;
}>;

export type PiSessionBinding = Readonly<{
  sessionId: string;
  sessionFile?: string;
  cwd: string;
  mode: ExtensionContext["mode"];
  projectTrusted: boolean;
}>;

export interface PiSessionBindingPort {
  current(): PiSessionBinding;
  assertContext(context: ExtensionContext): void;
  isProjectTrusted(): boolean;
}

export interface PackagedPluginHost {
  start(event: SessionStartEvent, context: ExtensionContext): Promise<StartedPackagedPluginHost>;
  current(): StartedPackagedPluginHost | undefined;
  runWithPiOperationContext<T>(
    context: ExtensionCommandContext,
    signal: AbortSignal,
    use: (application: PackagedPluginHostApplication) => Promise<T>,
  ): Promise<T>;
  dispose(reason: SessionShutdownEvent["reason"]): Promise<void>;
}

export function createPackagedPluginHost(options: PackagedPluginHostOptions): PackagedPluginHost;
```

`PluginHostPathPlan` is a pure value. It fixes the following layout before any path is opened:

| Authority | Relative layout under `hostRoot` | Compatibility rule |
|---|---|---|
| Lifecycle state | `state/v1/user.sqlite`, `state/v1/project-<64-hex-digest>.sqlite` | New adapter; document schema migrations are in-memory until the next verified commit |
| Scope locks | `locks/v1/<existing scope codec>.sqlite` | Reuse `createSqliteScopeLockManager`; do not rename an existing lock database |
| Configuration | `configuration/v1/configuration.sqlite` | New adapter; one private store with ref/revision CAS |
| Immutable content/projections/data | Existing `staging/v1`, `stores/v1`, `data/v1`, `generated/v1` layout | Reuse `createContentStoreLayout`; metadata v1 remains readable and v2 adds only verified reconstruction evidence |
| Transition journal | Existing `recovery/journal/v1/<existing scope codec>.sqlite` | Reuse `createLocalRecoveryFilesystem`; do not rename or reinterpret pending evidence |
| Leases/retention | Existing `recovery/leases/v1/leases.sqlite`, `recovery/retention/v1/retention.sqlite` | Reuse Node recovery adapters and protocols unchanged |

`hostRoot` is the existing content/recovery host root; `stateRoot`, `lockRoot`, and `configurationRoot` are dedicated private descendants. Startup passes only schema-verified scope values into legacy versioned codecs and decodes new state project filenames only from verified keys. The bootstrap registers delegates in fixed order so state/runtime initialization precedes the same `session_start` hook event and `resources_discover` finishes contribution publication.

**Acceptance criteria**:
- [x] Factory construction performs no filesystem/network/process/timer/runtime/credential/recovery/tool/command effect; spies observe only inert Pi event delegate registration, and no delegate can execute a hook before startup.
- [x] Session id, cwd, trust, and mode come only from one Pi context and every later context mismatch is rejected.
- [x] User/project paths are fixed/digest-derived, cannot alias, and contain no plugin/source/project spelling.
- [x] Duplicate construction and illegal active-session overlap fail before an effect; an exact reload predecessor/successor is the only overlap.
- [x] Start/dispose are idempotent/coalesced, and a failed start becomes terminal after reverse cleanup.

### Unit 2: Durable lifecycle state, inventory, configuration, clocks, and identifiers

**Story**: `epic-native-plugin-management-packaged-host-composition-durable-state-configuration`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-host-contract-session-layout`

**Files**:
- `src/infrastructure/state/sqlite-lifecycle-state-store.ts`
- `src/infrastructure/state/sqlite-lifecycle-state-inventory.ts`
- `src/infrastructure/state/lifecycle-state-defaults.ts`
- `src/infrastructure/configuration/sqlite-plugin-configuration-store.ts`
- `src/infrastructure/configuration/node-configuration-path.ts`
- `src/infrastructure/node/node-identifiers.ts`
- `src/infrastructure/node/node-lifecycle-clock.ts`
- `test/infrastructure/state/sqlite-lifecycle-state-store.test.ts`
- `test/infrastructure/configuration/sqlite-plugin-configuration-store.test.ts`
- `test/integration/packaged-state-concurrency.test.ts`

```typescript
export type NodeLifecycleStateAdapters = Readonly<{
  state: LifecycleStateStore;
  inventory: LifecycleStateInventoryPort;
  close(): Promise<void>;
}>;

export async function createNodeLifecycleStateAdapters(input: Readonly<{
  paths: PluginHostPathPlan;
  currentProject: Extract<ScopeContext, { kind: "project" }>;
  sha256: Sha256;
  verifyLocalFilesystem?: (root: string) => Promise<void>;
}>): Promise<NodeLifecycleStateAdapters>;

export async function createSqlitePluginConfigurationStore(input: Readonly<{
  root: string;
  verifyLocalFilesystem?: (root: string) => Promise<void>;
}>): Promise<PluginConfigurationStore & AsyncDisposable>;

export function createNodeConfigurationPathPort(input: Readonly<{
  binding: PiSessionBindingPort;
  projectRoots: ProjectRootAuthorityPort;
}>): ConfigurationPathPort;

export function createNodeHostIdentifiers(): Readonly<{
  operationIds: LifecycleOperationIdPort;
  configurationWriteIds: ConfigurationWriteIdPort;
  refreshClaimIds: RefreshClaimIdPort;
}>;
```

The state database protocol has strict `protocol`, `state_blobs`, and singleton `current_pointer` tables. Blob bytes are canonical and digest/ref checked. Initialization writes a complete generation zero transaction. Commit verifies scope, expected generation, every document generation, current schema, and expected-plus-one result before acknowledgment. Inventory lists only strict state database names, opens each through the state adapter, and reports `complete: false` if any candidate is unreadable.

**Acceptance criteria**:
- [x] Fresh user/project snapshots are valid current-schema generation zero values and do not read/adopt foreign or project intent.
- [x] Older supported documents migrate in memory and commit as one current generation; unknown future/corrupt pointer evidence fails closed without partial snapshot.
- [x] Two processes committing one expected generation produce exactly one commit and one stale result; outer `ScopeLockManager` remains separately exercised around promotion.
- [x] Configuration CAS is process-safe, current-schema-only, secret-free, and reconciles a lost response by authoritative read.
- [x] IDs satisfy existing schemas, are unpredictable/process-safe, and abort before issuance; clocks expose wall and monotonic values through one singleton.
- [x] All database handles close idempotently; initialized files remain durable and are never deleted by disposal.

### Unit 3: Project authority, path containment, and OS secret custody

**Story**: `epic-native-plugin-management-packaged-host-composition-project-secret-identity-adapters`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-host-contract-session-layout`

**Files**:
- `src/pi/pi-project-context.ts`
- `src/infrastructure/project/node-project-root-resolver.ts`
- `src/infrastructure/secrets/create-platform-secret-store.ts`
- `src/infrastructure/secrets/unavailable-secret-store.ts`
- `test/pi/pi-project-context.test.ts`
- `test/infrastructure/secrets/platform-secret-store.test.ts`

```typescript
export type PiProjectContextAdapters = Readonly<{
  resolution: ProjectRootResolutionPort;
  authority: ProjectRootAuthorityPort;
  trust: ProjectTrustPort;
  current(): CurrentProjectRuntimeContext;
}>;

export async function createPiProjectContextAdapters(input: Readonly<{
  binding: PiSessionBindingPort;
  sha256: Sha256;
  git?: Pick<CommandRunner, "run">;
}>): Promise<PiProjectContextAdapters>;

export type PlatformSecretStoreResult = Readonly<{
  store: SecretStore;
  availability: Readonly<{
    status: "unavailable";
    provider: "unsupported-platform" | "missing-provider";
    explanation: string;
  }>;
  close(): Promise<void>;
}>;

export async function createPlatformSecretStore(input?: Readonly<{
  platform?: NodeJS.Platform;
  signal?: AbortSignal;
}>): Promise<PlatformSecretStoreResult>;
```

**Acceptance criteria**:
- [x] Canonical current project and trust remain exact across all service/hook/MCP calls; a different cwd, session, key, repository replacement, or copied root capability fails.
- [x] Project configuration paths cannot escape the trusted root lexically or through symlinks; user paths use the exact bound base and canonical file URLs.
- [x] Linux fails closed because Secret Service cannot prove atomic no-replace ownership; production never calls a speculative provider.
- [x] Missing and unsupported credential services remain explicit unavailable adapters; no file/plain-session fallback exists and non-sensitive host startup continues.
- [x] Safe capability reports contain no paths, locators, PIDs, service messages, or values.

### Unit 4: Immutable reconstruction metadata and installed-revision loader

**Story**: `epic-native-plugin-management-packaged-host-composition-installed-revision-loader`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-durable-state-configuration`

**Files**:
- `src/application/installed-revision-descriptor.ts`
- `src/application/content-promotion.ts`
- `src/application/plugin-candidate-preparation.ts`
- `src/infrastructure/filesystem/immutable-content-store.ts`
- `src/infrastructure/filesystem/content-root-resolver.ts`
- `src/infrastructure/filesystem/installed-plugin-loader.ts`
- `src/infrastructure/filesystem/create-content-store.ts`
- `test/application/installed-revision-descriptor.test.ts`
- `test/infrastructure/filesystem/installed-plugin-loader.test.ts`
- `test/integration/installed-revision-restart.test.ts`

```typescript
export const InstalledRevisionDescriptorSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  loaded: LoadedInstalledPluginSchema,
  digest: ContentDigestSchema,
}).strict().readonly();
export type InstalledRevisionDescriptor = z.infer<typeof InstalledRevisionDescriptorSchemaV1>;

export function createInstalledRevisionDescriptor(input: Readonly<{
  loaded: LoadedInstalledPlugin;
  revision: InstalledRevisionRecord;
  sha256: Sha256;
}>): InstalledRevisionDescriptor;

export type NodeContentInfrastructure = Readonly<{
  content: ContentStorePort;
  installed: InstalledPluginLoader;
}>;

export async function createNodeContentInfrastructure(
  options: NodeContentStoreOptions,
): Promise<NodeContentInfrastructure>;
```

Plugin `VerifiedPromotionPlan` carries the verified descriptor; marketplace plans cannot. Published metadata v2 binds identity, manifest, binding, and descriptor digest. Resolver and loader rewalk content, parse metadata, verify all source/content/plugin/report/reference fingerprints, and return a deep-frozen value. Low-level metadata readers remain private.

**Acceptance criteria**:
- [x] Restart loading reconstructs the exact normalized plugin, stored report, marketplace source, manifest, and binding and reproduces the installed record.
- [x] Any descriptor/source/report/content/reference tamper, cross-scope request, or wrong revision fails before runtime projection or secret access.
- [x] v1 store metadata still resolves immutable content but loader returns a stable unavailable result/error and never guesses declarations from current catalogs or paths.
- [x] Missing/corrupt replaceable projection cache is rebuilt from the descriptor; descriptor disappearance blocks the plugin and leaves state/content unchanged.
- [x] Descriptor values never enter lifecycle state, diagnostics, logs, projection caches, or public low-level APIs.

### Unit 5: Runtime selection catalog and complete capability chain

**Story**: `epic-native-plugin-management-packaged-host-composition-runtime-selection-capabilities`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-project-secret-identity-adapters`, `epic-native-plugin-management-packaged-host-composition-installed-revision-loader`

**Files**:
- `src/composition/runtime-selection-catalog.ts`
- `src/composition/runtime-desired-state.ts`
- `src/composition/create-host-configuration.ts`
- `src/composition/node-pi-runtime-capability-probe.ts`
- `src/infrastructure/environment/node-mcp-launch-environment.ts`
- `test/composition/runtime-selection-catalog.test.ts`
- `test/composition/runtime-desired-state.test.ts`
- `test/composition/create-host-configuration.test.ts`
- `test/composition/node-pi-runtime-capability-probe.test.ts`

```typescript
export interface RuntimeSelectionCatalog
  extends HookExecutionActiveSelectionPort, McpLaunchActiveSelectionPort {
  snapshot(): Readonly<{
    currentProject: CurrentProjectRuntimeContext;
    selections: readonly RuntimeSelection[];
  }>;
  replace(next: readonly RuntimeSelection[], currentProject: CurrentProjectRuntimeContext): Promise<void>;
  close(): Promise<void>;
}

export type RuntimeDesiredState = Readonly<{
  currentProject: CurrentProjectRuntimeContext;
  selections: readonly RuntimeSelection[];
  skillHook: SkillHookRuntimeSetRequest;
  mcp: readonly Readonly<{ from: McpLifecycleState; to: McpLifecycleState }>[];
  blocked: readonly HostBlockedPlugin[];
}>;

export async function buildRuntimeDesiredState(input: Readonly<{
  scopes: readonly GenerationSnapshot[];
  installed: InstalledPluginLoader;
  compatibility: CompatibilityService;
  projections: RuntimeProjectionCachePort;
  project: PiProjectContextAdapters;
  mcp?: McpRuntimePort;
  state: LifecycleStateStore;
  sha256: Sha256;
}> , signal: AbortSignal): Promise<RuntimeDesiredState>;

export type BoundPluginConfigurationService = Readonly<{
  save(
    request: SavePluginConfigurationRequest,
    signal: AbortSignal,
  ): Promise<ConfigurationSaveResult>;
  remove(
    request: RemovePluginConfigurationRequest,
    signal: AbortSignal,
  ): Promise<ConfigurationRemovalResult>;
}>;

export type HostConfigurationDependencies = Readonly<{
  withResolvedPluginConfiguration: typeof withResolvedPluginConfiguration;
  dependencies: Parameters<typeof withResolvedPluginConfiguration>[1];
}>;

export function createHostConfigurationServices(input: Readonly<{
  configurations: PluginConfigurationStore;
  secrets: SecretStore;
  paths: ConfigurationPathPort;
  projectRoots: ProjectRootAuthorityPort;
  projectTrust: ProjectTrustPort;
  writeIds: ConfigurationWriteIdPort;
  sha256: Sha256;
}>): Readonly<{
  application: BoundPluginConfigurationService;
  execution: HostConfigurationDependencies;
}>;

export function createNodePiRuntimeCapabilityProbe(input: Readonly<{
  commandHooks: true;
  skillToolRestrictions: true;
  executables: HookExecutableResolverPort;
  mcp?: McpRuntimePort;
  subagents?: SubagentLifecyclePort;
  nodeVersion: string;
  piVersion: string;
}>): RuntimeCapabilityProbe;
```

`RuntimeSelectionCatalog.replace` atomically publishes a new immutable epoch. MCP callbacks already admitted retain their old frozen selection until completion, while new callbacks see only the new epoch; old Pi hook callbacks are aborted before replacement. Retired epochs are reference-counted and reclaimed when their final callback releases, and `close()` rejects new callbacks then drains them. Desired-state loading always rereads authoritative user/current project state; untrusted current-project state is excluded and reported. Every active plugin is re-assessed against the current capability snapshot before projection generation. `createHostConfigurationServices` is the sole composition of the existing save/remove operations and callback-scoped resolver dependencies: the application side exposes safe write/remove results, while hook/MCP internals receive only the existing callback resolver plus its private store/secret/path/trust dependencies.

**Acceptance criteria**:
- [x] Catalog lookup requires exact complete binding and project evidence; replacement cannot expose mixed old/new selections.
- [x] MCP callback pins retain their immutable retired epoch across replacement; new callbacks cannot observe it, and cancellation/close rejects new callbacks and drains existing ones.
- [x] Capability snapshots contain every registry id exactly once, distinguish absent adapters from malformed evidence, and never infer production qualification from test ports.
- [x] Adapter disappearance blocks only affected MCP/subagent plugins; skills/ordinary hooks and unrelated plugins remain activatable.
- [x] Requested-only ambient MCP environment values are callback-scoped/redacted and disposed on success, failure, and abort.

### Unit 6: Skills, ordinary hooks, and optional subagent lifecycle composition

**Story**: `epic-native-plugin-management-packaged-host-composition-hook-subagent-composition`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-runtime-selection-capabilities`

**Files**:
- `src/composition/create-skill-hook-runtime.ts`
- `src/pi/pi-subagent-session-context.ts`
- `src/pi/plugin-host-runtime-delegates.ts`
- `src/infrastructure/recovery/create-node-recovery-adapters.ts`
- `test/composition/create-skill-hook-runtime.test.ts`
- `test/pi/plugin-host-runtime-delegates.test.ts`
- `test/integration/packaged-hook-subagent-runtime.test.ts`

```typescript
export type ComposedSkillHookRuntime = Readonly<{
  participant: SkillResourceDiscoveryRuntime["participant"];
  resources: SkillResourceDiscoveryPort;
  hooks: GuardedCommandHookExecutor;
  catalog: SkillHookRuntimeCatalog;
  subagent?: RegisteredSubagentHookRuntime;
  replaceSessionLease(selections: readonly RuntimeSelection[], signal: AbortSignal): Promise<void>;
  close(): Promise<void>;
}>;

export async function createComposedSkillHookRuntime(input: Readonly<{
  pi: ExtensionAPI;
  binding: PiSessionBindingPort;
  content: NodeContentInfrastructure;
  selection: RuntimeSelectionCatalog;
  project: PiProjectContextAdapters;
  configuration: HostConfigurationDependencies;
  leases: RevisionLeaseStore;
  clock: LifecycleClock;
  subagents?: SubagentLifecyclePort;
  sha256: Sha256;
}>): Promise<ComposedSkillHookRuntime>;
```

The runtime reuses all existing planner/executor/decision/resource/subagent factories. Inert Pi delegates are installed at construction and receive a target only after explicit startup. The subagent parent-session resolver accepts exactly the current Plugin Host session id/evidence.

**Acceptance criteria**:
- [x] Required skill/hook components reconcile as one complete set, resource paths are verified before contribution, and Pi receives one deterministic path list.
- [x] Hook process execution begins only from a real Pi event after startup and always uses exact session cwd/project/trust/configuration roots.
- [x] Session revision leases pin every active skill/hook plugin and projection; reload replaces the lease only after the next full set exists, shutdown releases it.
- [x] Qualified subagent lifecycle registers one aggregate interceptor with matching qualification evidence; absent/unqualified lifecycle registers nothing and reports unavailable.
- [x] Partial startup/registration failure disposes coordinator/registration/leases exactly once and leaves no active delegate target.

### Unit 7: Optional MCP participant, launch providers, and exact cleanup

**Story**: `epic-native-plugin-management-packaged-host-composition-mcp-composition`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-runtime-selection-capabilities`

**Files**:
- `src/composition/create-mcp-runtime.ts`
- `src/composition/mcp-runtime-state.ts`
- `src/runtime/mcp/revision-lease-provider.ts`
- `test/composition/create-mcp-runtime.test.ts`
- `test/integration/packaged-mcp-runtime.test.ts`

```typescript
export type ComposedMcpRuntime = Readonly<{
  participant: McpLifecycleParticipant;
  project(selection: RuntimeSelection, capabilities: McpRuntimeCapabilities): McpLifecycleState;
  reconcileAll(transitions: readonly McpLifecycleTransitionRequest[], signal: AbortSignal): Promise<readonly McpLifecycleReconcileResult[]>;
  observe(selection: RuntimeSelection, signal: AbortSignal): Promise<McpLifecycleObservationResult>;
  close(): Promise<void>;
}>;

export function createComposedMcpRuntime(input: Readonly<{
  runtime?: McpRuntimePort;
  selections: RuntimeSelectionCatalog;
  content: ContentStorePort;
  project: PiProjectContextAdapters;
  configuration: HostConfigurationDependencies;
  environment: McpLaunchEnvironmentPort;
  leases: RevisionLeaseStore;
  clock: LifecycleClock;
  sessionId: string;
  sha256: Sha256;
}>): ComposedMcpRuntime;
```

`launchValues(registration)` uses `createMcpLaunchContextPort` and `createTrustedMcpLaunchValueProvider`; `runtimeLeases(registration)` uses `createMcpRevisionLeaseProvider`. Cleanup uses the exact previous source identity/registration evidence and independently inspects absence.

**Acceptance criteria**:
- [x] No-runtime plus no-MCP projection produces exact `none`/inactive contribution; a source projection produces `RUNTIME_UNAVAILABLE` and never partial success.
- [x] Registration/replace/remove/observation preserve exact source identity, digest, server inventory, project trust, and complete-plugin projection evidence.
- [x] Construction and local capability probing create no connection/process/tool; launch values and leases are requested only by the runtime at actual start/connect.
- [x] Every launch value/configuration facade and revision lease disposes after use; source removal proves provider/process/cache/lease cleanup or remains ambiguous.
- [x] Shutdown removes only sources owned by this composition; adapter disappearance/failure leaves safe recovery evidence and no false inactive observation.

### Unit 8: Canonical reload/recovery and full application container

**Story**: `epic-native-plugin-management-packaged-host-composition-reload-recovery-application-container`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-durable-state-configuration`, `epic-native-plugin-management-packaged-host-composition-installed-revision-loader`, `epic-native-plugin-management-packaged-host-composition-hook-subagent-composition`, `epic-native-plugin-management-packaged-host-composition-mcp-composition`

**Files**:
- `src/composition/complete-plugin-reload.ts`
- `src/pi/pi-reload-broker.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/application/marketplace-plugin-probe.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/lifecycle-transition-reconciler.ts`
- `src/infrastructure/recovery/create-node-recovery-adapters.ts`
- `test/composition/complete-plugin-reload.test.ts`
- `test/pi/pi-reload-broker.test.ts`
- `test/integration/packaged-host-startup-recovery.test.ts`

```typescript
export type PackagedPluginHostApplication = Readonly<{
  lifecycle: PluginLifecycleService;
  compatibility: CompatibilityService;
  inspection: PluginInspectionService;
  configuration: BoundPluginConfigurationService;
  recovery: LifecycleRecoveryService;
  collection: ReturnType<typeof createRevisionCollectionService>;
  marketplace: Readonly<{
    inspection: MarketplaceInspectionService;
    refresh: MarketplaceRefreshService;
    policy: MarketplaceUpdatePolicyService;
    scheduler: MarketplaceUpdateScheduler;
  }>;
  capabilities: RuntimeCapabilityProbe;
  resources: SkillResourceDiscoveryPort;
}>;

export type StartedPackagedPluginHost = Readonly<{
  application: PackagedPluginHostApplication;
  startup: HostStartupResult;
  close(): Promise<void>;
}>;

export function createCompletePluginReloadPort(input: Readonly<{
  binding: PiSessionBindingPort;
  operationContext: PiOperationContextPort;
  broker: PiReloadBroker;
  desired: RuntimeDesiredStateLoader;
  skillHook: ComposedSkillHookRuntime;
  mcp: ComposedMcpRuntime;
  transitions(scope: ScopeReference): LifecycleTransitionStore;
  sha256: Sha256;
}>): LifecycleReloadPort;

export function createMarketplacePluginProbe(input: Readonly<{
  state: LifecycleStateStore;
  content: ContentStorePort;
  materializer: PluginMaterializer;
  inspector: PluginInspectionService;
  compatibility: CompatibilityService;
  sha256: Sha256;
}>): MarketplacePluginProbePort;
```

Lifecycle and reconciler calls are tightened to always include `scope` in transition settlement, allowing the scoped journal router to remain restart-safe rather than relying on an in-memory ref map. `createNodeRecoveryAdapters` gains a scoped transition facade and `close()` that releases owned lease/database resources.

**Acceptance criteria**:
- [x] Startup follows the declared recovery/desired-state/participant/resource order and returns ready only after exact local contribution evidence; blocked plugins remain explicit and unrelated plugins continue.
- [x] Reload quiesces new event/launch admission, exposes candidate selection only to participant-internal callbacks, commits/resumes only after complete evidence, and restores or leaves recovery-required on failure.
- [x] One lifecycle transition across `ctx.reload()` yields observation from the successor instance, then exact predecessor finalization; failed successor evidence remains recovery-required.
- [x] Recovery and ordinary lifecycle share the existing reconciler; no command replay, second state writer, or component-specific activation path appears.
- [x] Marketplace readers/materializers/inspection/probe/update services and lifecycle use one state/content/capability graph; construction and local startup perform no network/timer.
- [x] A background update without Pi reload context cannot claim activation; refresh/notification evidence remains usable and the active revision is preserved.
- [x] Transition settlement routes by explicit scope across restart, and recovery adapters close/release owned resources without pruning durable evidence.

### Unit 9: Package entry, public boundary, disposal matrix, and consumer integration

**Story**: `epic-native-plugin-management-packaged-host-composition-package-integration-hardening`
**Depends on**: `epic-native-plugin-management-packaged-host-composition-reload-recovery-application-container`

**Files**:
- `src/pi/extension.ts`
- `src/pi/index.ts`
- `src/index.ts`
- `package.json`
- `.dependency-cruiser.cjs`
- `test/integration/packaged-host-clean-environment.test.ts`
- `test/integration/packaged-host-reload.test.ts`
- `test/integration/packaged-host-disposal.test.ts`
- `test/compiled-package-import.mjs`
- `test/compiled-pi-package-import.mjs`
- `test/public-api.test.ts`
- `test/tooling/boundaries.test.ts`

The default extension calls only `createPackagedPluginHost({ pi })`; it supplies no unpublished production runtime. The `pi` manifest points to compiled JavaScript. `@nklisch/pi-plugin-host/pi` exports the factory and safe host/application/status types, not the raw Pi session binding (cwd/session file/id), adapter internals, or native causes. The library root retains existing contracts and intentionally exported Node leaf factories.

**Acceptance criteria**:
- [x] `npm pack` bytes install into an empty consumer and Pi discovers `dist/pi/extension.js` through package metadata with no source-tree import.
- [x] Clean startup succeeds without Claude/Codex homes or MCP/subagent packages, reports those runtime capabilities unavailable, and activates compatible skill/ordinary-hook-only fixtures offline.
- [x] Duplicate roots, concurrent sessions/processes, restart, interrupted startup, adapter disappearance, partial construction, reload overlap, and shutdown all have deterministic integration evidence.
- [x] Source/compiled export allowlists expose the intended composition surface and no raw Pi binding/session path/id, SQLite handle, path codec, broker ticket, credential backend/client, selection mutator, raw state commit, or fake participant.
- [x] Dependency rules keep application/domain independent, infrastructure free of Pi, and Pi/composition as the only host wiring layers.
- [x] Full `npm test` passes strict source/test typechecking, boundaries, unit/integration/child-process tests, build, root import, Pi subpath import, and packed consumer discovery.

## Startup, ownership, and scope invariants

1. **One authority**: `LifecycleStateStore` remains the only selected-revision/config/trust state authority; runtime catalogs, projection caches, journal status, update memory, and Pi session data cannot select an active revision.
2. **One current project**: the project scope is exactly the canonical identity of the active Pi binding. Other materialized project scopes may be inventoried for GC but never activated into this session.
3. **Trust is conjunctive**: project runtime use requires exact `ProjectKey` equality and current Pi trust; plugin execution also requires the exact persisted trust subject and configuration evidence.
4. **No partial plugin**: active observation requires skills/hooks and MCP contributions for the same projection. A candidate catalog epoch is never externally admissible until complete participant evidence commits it; failed reconciliation restores the previous complete set or remains recovery-required. Subagent hooks are rejected at compatibility when interception is unavailable.
5. **Local first**: construction is pure; startup performs local state/recovery/reconciliation only; network refresh and timer loops are separate explicit calls.
6. **Short locks**: materialization, parsing, compatibility, secret/path resolution, Pi reload, participant reconcile, and observation never run under the SQLite scope lock. Existing coordinator windows remain promotion plus verified state CAS only.
7. **Process safety**: state/config/journal databases use their own short SQLite transactions and local-filesystem/root-identity checks. Same-scope lifecycle mutation also uses the existing cross-process scope lock and generation CAS.
8. **Secret boundary**: plaintext exists only in `SensitiveValue`, credential adapter, and execution/connection callbacks. It never enters host status, state, projection, descriptor metadata, journal, broker, logs, or errors.
9. **Session leases**: skill/hook session lifetime and each MCP execution pin exact plugin/projection artifacts. Live/unknown leases retain; shutdown releases owned evidence before database close.
10. **Late production binding**: optional package-neutral ports are absent by default. A test fake proves composition mechanics, never published-package qualification.
11. **Close once**: every resource has one owner and one idempotent reverse-order close. Cleanup uncertainty is reported safely and never turns a committed operation into a replay.
12. **No stale Pi use**: after `ctx.reload()` the predecessor uses only its pinned application adapters and the broker; it never calls old `pi`, `ctx`, UI, session manager, resource, or runtime objects.

## Implementation completion

All nine child stories are implemented and marked done. The packaged composition now has one construct-only Pi root, exact session/project/path authority, durable state/configuration/secret/revision adapters, immutable runtime selection, complete skill/hook/subagent and MCP composition, one recovery/reload convergence path, and a compiled `./pi` package boundary with optional production participants truthfully absent by default.

Final verification passed: 204 test files / 1,046 tests, strict typechecking, dependency boundaries (275 modules / 1,739 dependencies), compiled root and Pi imports, and isolated packed-extension startup. The standard review blockers are fixed and the feature is complete.

## Failure matrix

| Phase | Failure | Required result | State/runtime/disposal invariant |
|---|---|---|---|
| Construct | Invalid/relative agent dir or malformed runtime option | Synchronous typed failure | No handler claim/effect remains |
| Construct | Duplicate Pi composition | `HOST_DUPLICATE_COMPOSITION` | Existing host untouched |
| Startup binding | Session/cwd changes or forged context | `HOST_SESSION_MISMATCH` | No project state opened |
| Host root | Symlink, weak permission, replacement, unsupported filesystem | Redacted adapter failure | No process-local/unsafe fallback |
| State open | Missing clean DB | Atomic generation-zero initialization | User/project files remain distinct |
| State open | Corrupt/future pointer/blob/protocol | Scope blocked with safe corruption | No partial snapshot/default overwrite |
| State commit | Busy/abort/stale/lost response | Abort, typed stale, or reconciled exact commit | Never overwrite or blind retry |
| Configuration | Stale CAS/lost response | Existing reconciliation outcome | Active locators never removed by loser |
| Credentials | Provider absent/locked/collision | Explicit unavailable/collision | No plaintext fallback or overwrite |
| Project | Untrusted/moved/replaced root | Exact unavailable/mismatch | User state may load; project executable state does not |
| Descriptor load | v1/missing/corrupt/tampered descriptor | Plugin blocked, stable unavailable code | State/content retained; no catalog/path guess |
| Projection | Cache absent/corrupt | Rebuild from descriptor | Cache remains derived; state unchanged |
| Capability | Optional adapter absent | Unavailable facts | Components requiring it are not activatable |
| Capability | Present adapter malformed/throws | Adapter failure | Never downgraded to honest absence |
| Subagent | Qualification/registration mismatch | No registration, unavailable/error | Ordinary hook runtime remains isolated |
| MCP | No runtime and projection has no servers | Exact none/inactive evidence | Plugin may be complete |
| MCP | No runtime/adapter disappears with servers | `RUNTIME_UNAVAILABLE` | No partial active observation |
| Recovery | Live predecessor owns transition | Deferred | Successor may reconcile pending candidate but never settle it |
| Recovery | Fresh process lacks candidate observation | Conservative shared compensation | Previous must be observed before rollback claim |
| Reload | No valid operation context | `PI_RELOAD_CONTEXT_UNAVAILABLE` | No state mutation claim of activation |
| Reload | `ctx.reload()` rejects/successor never claims ticket | Failed reload/recovery-required | Predecessor drains safely; no fabricated observation |
| Reload | Successor contribution mismatch | Observation failure | Pending evidence remains or verified compensation runs |
| Marketplace | Network/catalog/probe failure | Per-marketplace/plugin typed result | Startup/active revision unaffected |
| Scheduler | Constructed but not explicitly run | No timer/network | Container remains local/offline |
| Shutdown | During ordinary hook/MCP callback | Abort then drain/release | No new callback admitted; leases retain until safe |
| Shutdown | During reload operation | Runtime closes, application predecessor pins only admitted operation | Successor is sole active host |
| Partial start | Failure after any adapter acquisition | Reverse idempotent cleanup with safe aggregate | Initialized durable roots retained; claims released |
| Concurrent process | Same scope/plugin mutation | Existing lock/FIFO/CAS outcomes | Exactly one generation winner |
| Concurrent session | Same immutable artifacts | Independent catalogs/leases, shared state CAS | No process/session object sharing |

## Integration with subsequent features

- `epic-native-plugin-management-marketplace-discovery-adoption` adds normal marketplace registration/adoption services to the internal application dependency bundle; it reuses this state, content, project, refresh, and source graph and does not open another host.
- `epic-native-plugin-management-inspection-diagnostics` reads safe startup/capability/blocked-plugin/runtime status from this container and existing inspectors; it does not inspect SQLite/runtime internals.
- `epic-native-plugin-management-trusted-installation` uses `runWithPiOperationContext` plus bound configuration/trust/lifecycle services; secret and project-root decisions never cross presentation DTOs.
- `epic-native-plugin-management-lifecycle-sync-operations` invokes this one lifecycle service and canonical reload adapter for every manual mutation.
- `epic-native-plugin-management-update-policy-offline-startup` explicitly starts refresh scheduling after local readiness. With Pi 0.80.8 it must not claim unattended activation without a valid reload operation context; it may still discover and notify offline-safely.
- `epic-native-plugin-management-deterministic-control-facade` wraps this application container rather than exporting state/port shortcuts. Exact command grammar remains its design.
- `epic-native-plugin-management-pi-extension-manager` supplies valid command contexts and renders results; this feature registers no `/plugin` command or TUI.
- `epic-native-plugin-management-clean-environment-core-e2e` packs the default no-production-runtime entry and may inject package-neutral conforming doubles only to test composition, never production qualification.
- `epic-native-plugin-management-production-runtime-acceptance` imports published, pinned MCP/subagent adapters and passes their unchanged package-neutral ports into `createPackagedPluginHost`; it alone changes production availability claims.

## Implementation order

1. `epic-native-plugin-management-packaged-host-composition-host-contract-session-layout`
2. In parallel:
   - `epic-native-plugin-management-packaged-host-composition-durable-state-configuration`
   - `epic-native-plugin-management-packaged-host-composition-project-secret-identity-adapters`
3. `epic-native-plugin-management-packaged-host-composition-installed-revision-loader`
4. `epic-native-plugin-management-packaged-host-composition-runtime-selection-capabilities`
5. In parallel:
   - `epic-native-plugin-management-packaged-host-composition-hook-subagent-composition`
   - `epic-native-plugin-management-packaged-host-composition-mcp-composition`
6. `epic-native-plugin-management-packaged-host-composition-reload-recovery-application-container`
7. `epic-native-plugin-management-packaged-host-composition-package-integration-hardening`

The feature remains one cohesive implementation and review bundle. Stories are correctness checkpoints, not one-agent assignments.

## Simplification

- Reuse all current materializers, readers, inspectors, lifecycle/recovery/update services, participants, probes, project-root authority, process runner, content/recovery factories, and schemas. Do not create a second domain model, state registry, lock, journal, projection, lifecycle facade, or runtime registry.
- Replace ad hoc direct factory use with one application container; retain existing leaf factories as testable adapters rather than wrapping each in a provider class.
- Add only the missing durable/host adapters and the runtime selection/reload concepts forced by existing ports. Do not add dependency injection frameworks, generic service locators, plugin systems for adapters, workflow DSLs, or background task managers.
- Extend immutable plugin metadata because exact installed reconstruction is otherwise impossible; do not widen authoritative state or preserve current catalog declarations there.
- Keep the default package free of unpublished production dependencies. Do not add dynamic imports, package probing, or name-based fork selection.
- No existing tests are obvious removal candidates. New tests should protect composition effects, durable contracts, reload handoff, and package boundaries rather than repeat reader, transaction, or runtime unit matrices.

## Testing

- **Construct-only contract**: spy on filesystem APIs, `fetch`, `spawn`, timer creation, runtime methods, credential methods, Pi tool/command registration, and hook executor. Only inert Pi event delegate registration is allowed before `start`; no delegate has an executable target.
- **State/config adapter contracts**: clean initialization, v1→current migration, corruption/future version, user/project alias attempts, stale CAS, lost responses, two real processes, path/root replacement, abort, and close/reopen.
- **Project/secret contracts**: exact session/cwd/trust changes, Git/path-only identity, repository replacement, project containment/symlinks, leak canaries, fail-closed Linux custody, and unsupported platforms.
- **Installed reconstruction**: real promoted fixture restart, regenerated projection, stored/current capability distinction, descriptor/content/source/report tamper, v1 descriptor absence, and cross-scope/revision swaps.
- **Runtime selection/capabilities**: atomic replacement, pinned MCP callback, stale hook binding, current-project mismatch, complete registry snapshots, shell absence, malformed optional adapter, MCP none/source, and subagent qualification evidence.
- **Reload bridge**: fake Pi old/new runtime sequence exactly mirrors `session_shutdown → session_start(reload) → resources_discover`; tests cover ticket claim, successor failure, mismatched session/cwd/transition, predecessor drain, rollback reload, concurrent reload serialization, and abort without timers.
- **Startup/recovery**: crash points from existing journal fixtures composed through real state/content/recovery adapters; fresh-process conservative rollback, live predecessor deferral, unrelated-plugin continuation, blocked descriptor/capability, and exact ready report.
- **Lease/disposal**: session skill lease replacement, per-MCP-execution lease, callback during reload/shutdown, subagent unregister, MCP source removal ambiguity, scheduler abort, SQLite close, partial start at every acquisition, repeated close, and no durable-root deletion.
- **Marketplace/application composition**: one local marketplace/plugin fixture proves readers → materializers → inspection → compatibility → refresh probe → lifecycle using one graph. Explicit refresh is allowed; construction/startup/scheduler-not-run produce no network.
- **Package/public boundaries**: exact root and `./pi` source/compiled exports, dependency-cruiser canaries, `npm pack` consumer, Pi manifest discovery, default no-fork dependencies, no source TypeScript loading, and no private adapter/reload/credential/state surface.
- **Avoid duplication**: detailed source traversal, SQLite lock races, lifecycle rollback, recovery mark/sweep, hook event semantics, MCP lifecycle semantics, and foreign reader matrices remain in their owning suites; composition adds one seam-level success/failure case for each.

## Risks and pre-mortem

- **Riskiest assumption — Pi reload handoff can safely overlap one draining application predecessor with the successor**: Pi documents the event order and old-frame continuation, but not Plugin Host’s broker. Mitigation: no stale Pi object use, exact session/transition tickets, application leases, one reload at a time, and packed integration against Pi 0.80.8. Fallback: report reload unavailable and keep lifecycle recovery-required; never use direct participant callback as false Pi activation proof.
- **Installed reconstruction metadata becomes load-bearing physical evidence**: state is intentionally lossy. Mitigation: seal/digest it with immutable content, validate against state on every load, and keep it versioned. Fallback: missing old metadata blocks enable/startup for that plugin; do not consult a changed catalog or write guessed state.
- **Credential support is unavailable**: Secret Service cannot prove this host's atomic no-replace ownership contract. Mitigation: the production factory always returns an explicit unavailable store and has no fallback. Non-sensitive plugins work; sensitive configuration remains unavailable until a backend can prove stable winner selection and stale-safe deletion.
- **SQLite adapters multiply private roots/handles**: state, config, locks, journal, leases, and retention have distinct ownership. Mitigation: one path plan, shared local-filesystem/root-identity conventions, short transactions, reverse close, and no cross-database transaction claim. Fallback: partial failure retains durable files and blocks only the affected capability/scope.
- **Startup capability changes can invalidate an installed plugin**: a previously available runtime can disappear. Mitigation: stored report verifies installation, fresh report governs activation, and participant evidence remains all-or-nothing. Fallback: leave installed state intact and report blocked/unavailable.
- **Resource discovery occurs after `session_start`**: startup hooks need the catalog before Pi asks for resources, while reload evidence needs resource contribution afterward. Mitigation: ordered inert delegates, source catalog publication during bootstrap, resource evidence publication during the following event, and direct resource verification only inside recovery’s explicit local reload mode.
- **Unattended automatic updates lack a public host-level Pi reload API**: capturing command contexts for later use is unsafe. Mitigation: composition returns the scheduler inert and rejects reload without a current operation context. Fallback: discovery/notifications continue; activation remains manual until a supported Pi reload trigger or a separately designed queued operation exists.
- **Same-process duplicate package copies may not share module statics**: a normal module singleton is insufficient. Mitigation: a versioned `globalThis` symbol with WeakMap/session claims and exact successor rules. Fallback: fail duplicate startup before runtime registration/state operation.
- **Least certainty — full MCP source cleanup when a concrete adapter disappears during reload**: package-neutral status may be unavailable. Mitigation: exact previous/journal evidence, lease retention, and ambiguous outcomes. Fallback: retain state/artifacts and require recovery; never report inactive from missing inspection.

This design fails if construction writes or connects, two roots choose different state paths, project trust is inferred from cwd text, secrets fall back to files, installed revisions cannot rebuild after restart, runtime participants independently select revisions, partial evidence becomes active, recovery races a live predecessor, or shutdown closes adapters while the old lifecycle frame still finalizes. The construct/start split, fixed digest layout, exact Pi binding, unavailable credential/runtime capabilities, sealed reconstruction descriptor, one selection catalog, composed observations, ticketed reload overlap, and application-resource drain directly counter those failures.

## Standard review record

- **Mode and weight**: feature-level integrated review, `standard` (project default).
- **Independent pass count**: 1 — the sole packaged-host pass already completed. Per the standard closure policy and operator instruction, fixes were verified without re-review. No nested agent or peer pass ran during remediation.
- **Initial verdict**: request changes — 2 critical and 7 high material blockers.
- **Final disposition**: all 9 blockers accepted and fixed; 0 unresolved blockers, 0 rejected findings, 0 nits. Four explicitly deferred ideas were parked unbound and were not implemented.

### Findings and fixes

1. **Reload operation lifetime (critical)** — Added admitted-operation leasing. `session_shutdown` closes runtime admission/resources first but keeps predecessor state, configuration, and recovery adapters pinned until the old application operation settles. The operation frame consumes its Pi reload context exactly once; after `ctx.reload()` only the broker and pinned application adapters remain usable. Exact shutdown → successor start/discover → predecessor settlement and durable-cleanup ordering is covered.
2. **Fresh-process recovery (critical)** — Added startup-only local complete-participant reconciliation/observation, conservative rollback including pending install, post-recovery authority reread, explicit startup blocking for unresolved recovery, and pending-record exclusion from ordinary desired-state publication. A subprocess-written dead-owner SQLite/journal crash state proves fresh-process rollback; existing whole-bundle crash matrices cover update/disable/uninstall participant outcomes.
3. **Owned SessionEnd chain (high)** — Removed independent runtime lifecycle handlers. Bootstrap now owns one ordered session boundary chain and dispatches `SessionEnd` once before quiesce, abort, and disposal for Pi shutdown reasons.
4. **Lifecycle SQLite snapshots (high)** — Reads now hold a transaction across pointer/blob decoding. Writers use bounded abort-aware busy retry, validate the exact expected+1 snapshot before commit, and acknowledge that exact generation rather than rereading a later writer. Continuous multiprocess readers/writers prove complete monotonic snapshots.
5. **First-use process safety (high)** — Added exclusive, retryable, process-identity-bound SQLite initialization for lifecycle state, process leases, and retention. Recovery-root marker publication is single-winner. Two clean host processes starting together prove the state/lease/retention path.
6. **Secret Service claim (high)** — Determined that D-Bus `CreateItem(replace=false)` cannot prove attribute uniqueness, stable winner selection, and loser cleanup. Removed the speculative provider and `dbus-next`; production secret custody now fails closed as unavailable with no fallback or false atomicity claim.
7. **Project identity revalidation (high)** — Re-resolve canonical root and Git common-directory fingerprint at desired-state, trust, configuration/path, hook, and MCP boundaries. Repository replacement advances the authority epoch and invalidates every old root capability before protected access.
8. **Runtime qualification (high)** — Added one startup qualification decision consumed by capability reporting, registration, desired state, and startup. It uses the actual Pi `VERSION`, Pi API shape, host and provider Node/Pi ranges, complete MCP lifecycle facts, and published-provider evidence; mere ports, test evidence, malformed facts, and contradictions are consistently unavailable.
9. **Independent integration evidence (high)** — The packed test now performs an isolated offline npm installation with no checkout dependency symlinks, imports the manifest extension, and executes session startup/resource/shutdown. Added real process concurrency, dead-owner crash recovery, root replacement, operation leasing, broker reload-once, and complete runtime qualification evidence that would fail the reviewed commit.

### Commits

- `6cf0972` — lifecycle, recovery, qualification, identity, SQLite, project, and fail-closed secret fixes.
- `af817a6` — adversarial process, crash, reload, qualification, and isolated package evidence.
- `c86ae3f` — bounded busy retry while opening an identity-bound database during an active writer.
- `7d6b038`, `875e33a`, `75c8cf9`, `52d9e2f` — the four requested unbound backlog captures.

### Verification

- Focused adversarial suites: reload broker/context consumption, operation lease/disposal, fresh-process crash recovery, MCP lifecycle recovery, runtime qualification/desired state, project replacement, lifecycle SQLite, multiprocess startup/read-write concurrency, and fail-closed secret custody — green.
- Full `npm test` — green.
- Vitest: **204 files / 1,046 tests**, 0 failures, 0 type errors.
- Dependency boundaries: **275 modules / 1,739 dependencies**, 0 violations.
- Package checks: **522 root exports**, **3 `./pi` exports**, isolated packed Pi extension startup passed.
- All nine child stories remain `done`; this feature advanced `review → done` after blocker verification.
