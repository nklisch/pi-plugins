# Pi Plugin Host Architecture

## System context

Pi Plugin Host is a Pi package and extension that consumes Claude Code and
OpenAI Codex plugin marketplaces as foreign package formats.

```text
┌───────────────────────────────┐
│ Git or npm sources            │
│                               │
│ Marketplace catalog           │
│ Plugin manifests              │
│ Skills / hooks / MCP config   │
└───────────────┬───────────────┘
                │ untrusted input
                ▼
┌───────────────────────────────┐
│ Pi Plugin Host                │
│                               │
│ Parse → normalize → validate  │
│ → trust → stage → activate    │
└───────┬──────────┬────────────┘
        │          │
        ▼          ▼
┌─────────────┐  ┌────────────────┐
│ Pi runtime  │  │ Local state     │
│             │  │                 │
│ Skills      │  │ Catalogs        │
│ Hooks       │  │ Revisions       │
│ MCP tools   │  │ Trust and data  │
└─────────────┘  └────────────────┘
```

Claude Code and Codex are specification sources and optional adoption sources.
They are not runtime collaborators.

## Architectural principles

### Ports and adapters

Domain and application code do not import Pi, filesystem, Git, npm, process, or
terminal APIs. They depend on typed ports implemented by infrastructure
adapters.

### Normalized contracts

Foreign marketplace and manifest formats terminate at reader boundaries. All
downstream behavior uses one normalized domain model.

### Complete-bundle validation

Compatibility is determined from the complete plugin inventory before any
component activates.

### Immutable revisions

Installed plugin content is immutable. Updates create new revisions and move an
active pointer only after validation and trust succeed.

### Derived runtime projections

Skills, hooks, and MCP activation are derived from authoritative plugin-host
state. Generated runtime configuration is replaceable and is never an
independent source of truth.

### Fail closed

Malformed paths, conflicting manifests, unsupported executable behavior, and
ambiguous identity prevent activation.

## Package shape

Source is TypeScript 7.0. The package builds ESM JavaScript for Node.js 24 and
publishes compiled entry points rather than relying on Pi's runtime TypeScript
loader. Zod 4 schemas are the runtime contract source of truth; public
TypeScript types are inferred from those schemas rather than maintained as
parallel interfaces.

```text
src/
├── domain/
│   ├── identity.ts
│   ├── source.ts
│   ├── provenance-location.ts
│   ├── provenance.ts
│   ├── schema.ts
│   ├── configuration.ts
│   ├── components.ts
│   ├── marketplace.ts
│   ├── plugin.ts
│   ├── compatibility.ts
│   ├── error-contract.ts
│   ├── domain-error.ts
│   └── errors.ts
├── application/
│   ├── ports.ts
│   ├── marketplace-service.ts
│   ├── inspection-service.ts
│   ├── installation-service.ts
│   ├── activation-service.ts
│   ├── update-service.ts
│   ├── adoption-service.ts
│   └── recovery-service.ts
├── formats/
│   ├── claude/
│   │   ├── marketplace-reader.ts
│   │   ├── manifest-reader.ts
│   │   └── hook-reader.ts
│   ├── codex/
│   │   ├── marketplace-reader.ts
│   │   ├── manifest-reader.ts
│   │   ├── hook-reader.ts
│   │   └── state-reader.ts
│   ├── agent-skills/
│   │   └── skill-reader.ts
│   ├── marketplace-reader-support.ts
│   ├── marketplace-merger.ts
│   └── manifest-merger.ts
├── infrastructure/
│   ├── filesystem/
│   ├── git/
│   ├── npm/
│   ├── state/
│   ├── trust/
│   ├── secrets/
│   ├── processes/
│   └── adoption/
├── runtime/
│   ├── skills/
│   ├── hooks/
│   ├── mcp/
│   └── subagents/
├── pi/
│   ├── extension.ts
│   ├── commands.ts
│   ├── plugin-manager-ui.ts
│   ├── trust-ui.ts
│   └── reload.ts
└── index.ts
```

Tests mirror these boundaries under `test/`, with external-format fixtures under
`test/fixtures/`.

## Domain model

### Identity

```typescript
type MarketplaceId = string;
type PluginName = string;
type PluginKey = `${PluginName}@${MarketplaceId}`;

interface PluginIdentity {
  key: PluginKey;
  marketplaceName: string;
  marketplaceEntryName: string;
  manifestName?: string;
}
```

The marketplace entry name is authoritative for installation lookup.
The manifest name remains available for component namespacing and diagnostics.

### Source

```typescript
type MarketplaceSource =
  | { kind: "github"; repository: string; ref?: string }
  | { kind: "git"; url: string; ref?: string }
  | { kind: "local-git"; path: string; ref?: string };

type PluginSource =
  | { kind: "marketplace-path"; path: string }
  | { kind: "git"; url: string; ref?: string; sha?: string }
  | { kind: "git-subdir"; url: string; path: string; ref?: string; sha?: string }
  | { kind: "npm"; package: string; selector?: string; registry?: string };
```

A canonical source representation provides stable equality, hashing, cache
identity, and trust identity. Domain source schemas are strict: Git accepts
HTTPS, `ssh://`, and common SCP-style `user@host:path` forms. SCP is
remote-home-relative and remains distinct from absolute `ssh://` paths: its
canonical value uses a tagged `scp://` form with lowercase hosts and literal
percent/path text, while explicit SSH port 22 is normalized away. npm registries
are HTTPS-only. Embedded HTTPS credentials, unsupported URL protocols, malformed
percent escapes in URI forms, unknown fields, lone UTF-16 surrogates, and
non-full Git SHA pins fail at the boundary. Canonical bytes use the injective
`source-v1|<kind>|<field>:<UTF-8-byte-length>:<value>` grammar; malformed
percent escapes are rejected rather than treated as literal text.

### Normalized marketplace

Catalog entries are unresolved declarations, not partial plugin bundles:

```typescript
interface NormalizedMarketplace {
  name: Claimed<MarketplaceName>;
  entries: NormalizedMarketplaceEntry[];
  metadata: RetainedMetadata[];
  sourceDocuments: Provenance[];
}

interface NormalizedMarketplaceEntry {
  identity: Claimed<PluginIdentity>;
  source: Claimed<PluginSource>;
  version?: Claimed<string>;
  description?: Claimed<string>;
  policy?: MarketplaceInstallationPolicy;
  authorities: MarketplaceAuthority[];
  declarations: MarketplaceEntryDeclaration[];
  metadata: RetainedMetadata[];
  rawDeclaration: Claimed<JsonValue>;
}
```

The catalog-declared root name is authoritative. Claude authority metadata
preserves explicit or default `strict`: strict entries require manifests and
treat catalog runtime fields as supplemental, while `strict: false` permits a
catalog-authoritative entry. Codex requires its plugin manifest and treats
catalog runtime declarations as supplemental. Bundle ingestion resolves those
authority records after materialization. Runtime-bearing and dependency
declarations remain raw, source-located data until compatibility policy assigns
meaning. Known nested declarations are structurally validated per field before
retention; malformed nested values omit only their complete entry. Presentation
fields such as category, tags, and host-specific interface values remain
host-qualified `RetainedMetadata` with their raw JSON Pointer claims.

### Normalized bundle

```typescript
interface Claimed<T> {
  value: T;
  provenance: readonly [Provenance, ...Provenance[]];
}

interface NormalizedPlugin {
  identity: PluginIdentity;
  version?: Claimed<string>;
  description?: Claimed<string>;
  source: ResolvedPluginSource;
  configuration: PluginConfiguration;
  components: PluginComponents;
  metadata: RetainedMetadata[];
}

interface PluginComponents {
  skills: SkillComponent[];
  hooks: HookComponent[];
  mcpServers: McpServerComponent[];
  foreign: ForeignComponent[];
}

interface ForeignComponent {
  kind: "foreign";
  id: ComponentId;
  nativeHost: "claude" | "codex";
  nativeKind: Claimed<string>;
  declaration: Claimed<JsonValue>;
}
```

Every normalized value carries its own source provenance. Equivalent declarations
may contribute multiple provenance records; conflicting values therefore identify
the exact declarations without relying on a separate flat claims list. Readers
retain unknown runtime declarations as foreign components. Compatibility policy,
not the format reader, assigns their verdict.

### Compatibility

```typescript
type ComponentVerdict =
  | { kind: "supported" }
  | { kind: "metadata-only"; reason: string }
  | { kind: "incompatible"; reason: string };

interface ComponentAssessment {
  componentId: ComponentId;
  verdict: ComponentVerdict;
  requirementIds: RuntimeRequirementId[];
  diagnostics: Diagnostic[];
}

interface RuntimeRequirementAssessment {
  requirement: RuntimeRequirement;
  status: "available" | "unavailable";
  explanation: string;
}

interface CompatibilityReport {
  plugin: PluginIdentity;
  activatable: boolean;
  components: ComponentAssessment[];
  requirements: RuntimeRequirementAssessment[];
  diagnostics: Diagnostic[];
}
```

`activatable` is derived: it is true only when no runtime component is
incompatible and every requirement cited by a supported component is available.
Conditional support is represented by a supported verdict plus an explicit
runtime requirement, not by a fourth verdict. This domain defines report
mechanics; compatibility rule instances live in the compatibility evaluator.

## Format ingestion

### Reader isolation

Each format reader:

1. Parses unknown input with a runtime schema.
2. Resolves only syntax and semantics belonging to that format.
3. Emits normalized claims with provenance.
4. Does not access state or activate resources.

Format modules import only domain and sibling format modules, never Node,
filesystem, application, runtime, or Pi APIs. Marketplace readers validate path
syntax only; materialized containment is a later boundary. Every claim uses an
RFC 6901 JSON Pointer (the empty pointer denotes the document root) and preserves
its raw declaration. Repository subdirectories normalize `plugin` and
`./plugin` to one domain path while retaining the foreign spelling in
provenance. A malformed nested runtime-bearing field invalidates the complete
entry rather than producing a partial entry.

Raw JSON errors and untrustworthy catalog roots throw `BoundaryError`; malformed
entries return diagnostics beside valid siblings. The dedicated marketplace
merger orders provenance Claude then Codex, compares sources through canonical
source serialization (selectors included), treats root identity disagreement as
fatal, and isolates entry conflicts. It is separate from manifest merging
because the two boundaries have different authority and fatality rules. The
merger also verifies that each caller-supplied native-host label agrees with
all source documents, diagnostics, authorities, entries, and claim provenance
before reconciliation.

The reader reports unknown runtime fields rather than discarding them.

### Dual manifests

When both manifests exist, the merger compares their normalized claims.

Equivalent declarations collapse into one component. Complementary
metadata combines. Conflicting identity, path, hook, or MCP declarations
produce a compatibility error containing both source locations.

No host receives unconditional precedence.

### Conventional discovery

Manifest readers emit explicit component roots. A separate conventional
discovery pass adds format-defined default paths only when the relevant
manifest rules allow them.

This keeps path convention separate from JSON parsing and makes it testable
against each host's documented behavior.

## Source acquisition

Source materialization is a staging producer, not a store or transaction manager. The lifecycle caller allocates a new empty private staging slot. A materializer writes only `content/` and temporary `.work/` children inside that slot, removes temporary work before success, and returns the content root, verified resolved source, and deterministic content manifest. Error or cancellation returns no partial handoff and cleans materializer-owned writes. Lifecycle code separately owns cache and marketplace paths, atomic promotion, state, locks, fsync/journaling, rollback, recovery, retention, and garbage collection.

The source tree and archive are treated as malicious. The security boundary assumes lifecycle created a private staging slot and that an already-materialized marketplace root is immutable for the duration of a marketplace-relative copy. It does not claim portable resistance to a privileged local process that can concurrently mutate those private roots.

### Marketplace store

A marketplace is materialized by canonical source and immutable Git revision.

```text
marketplaces/<marketplace-source-hash>/<git-revision>/
```

A small active-pointer record selects the revision used for catalog browsing.
Refreshing a marketplace creates another immutable snapshot.

### Plugin store

Plugin content is stored by canonical source, immutable revision, and plugin
subpath.

```text
cache/<plugin-source-hash>/<revision>/<plugin-path-hash>/
```

Marketplace-relative plugins are copied from the immutable marketplace snapshot.
External Git and npm plugins are materialized independently.

### Secure copying

Every acquisition adapter writes through one hardened content sink into an initially empty root. The sink:

- rejects traversal, absolute/drive/UNC/backslash paths, dangerous platform names, case or Unicode-normalization collisions, and escaping links before creating the affected entry;
- uses exclusive regular-file creation, validates every ancestor, creates safe internal symlinks only after ordinary entries, and materializes hardlinks as regular-file copies;
- enforces entry, path, file, total decompressed-stream, compressed-byte, and expansion-ratio limits; tar framing, padding, and PAX/GNU metadata count toward the decompressed budget;
- rejects special files, sparse/unknown archive forms, setuid/setgid metadata, escaping symlinks/hardlinks, and `.git` content;
- performs a disk-backed final rewalk and rehash before returning, and exposes the same verification operation for lifecycle handoff; a returned root must be exactly `<slot>/content`;
- emits a versioned SHA-256 manifest over normalized relative paths, content/link digests, normalized executable modes, and empty directories; public verification applies bounded per-path, aggregate-path, and entry limits with one normalized path map.

Git resolution uses argument-array subprocesses and clean `git archive` output. A full declared SHA is authoritative over a ref. Otherwise qualified branch/tag names resolve exactly; an unqualified name that exists as both branch and tag is rejected as ambiguous. Tags peel to commits, and the resolved full commit SHA is trust identity. Selected trees containing `.gitmodules` are rejected because submodule materialization is not supported.

npm acquisition reads packuments and downloads tarballs directly through bounded HTTPS adapters. It requires canonical SHA-512 integrity, hashes bytes confirmed written and rehashes the closed scratch file before extraction, and never runs npm installation, dependency installation, or lifecycle scripts. Git archives are consumed through a live bounded stream with incremental file hashing. Git and npm scratch is created only below the caller's `<slot>/.work`; no OS temporary directory is selected by a materializer. A source handoff binds the verified source hash to the manifest root digest.

### Source ports

```typescript
interface MarketplaceMaterializer {
  materialize(
    source: MarketplaceSource,
    destination: StagingSlot,
    signal: AbortSignal,
  ): Promise<MaterializedMarketplace>;
}

interface PluginMaterializer {
  materialize(
    source: PluginSource,
    context: SourceContext,
    destination: StagingSlot,
    signal: AbortSignal,
  ): Promise<MaterializedPlugin>;
}

type SourceContext =
  | { kind: "external" }
  | {
      kind: "marketplace";
      root: string;
      source: ResolvedMarketplaceSource;
      contentRootDigest: ContentDigest;
      content: ContentManifest;
      binding: ContentDigest;
    };

interface MaterializedPlugin {
  root: string;
  source: ResolvedPluginSource;
  content: ContentManifest;
  binding: ContentDigest;
}
```

Marketplace-relative sources require a verified marketplace handoff carrying the complete manifest and source/content binding; the copier rewalks the exact `<slot>/content` root before copying. External Git/npm sources reject marketplace context. The lifecycle can call `verifyMaterializedContent` to rewalk and rehash a completed handoff before promotion. Git subprocess and npm/HTTP/filesystem details remain inside infrastructure adapters. The Node composition root wires those adapters behind the application ports and exports only the lifecycle-facing materializers; command, tar, HTTP, filesystem, and credential adapters are not package API. Credentials come from existing noninteractive Git/SSH/npm configuration, never source declarations or materializer results. Cancellation propagates through every port and is rethrown after cleanup rather than converted to a domain diagnostic. Cleanup failure is reported as an adapter failure with no materialization handoff.

## Authoritative state

The current state boundary is schema-first and adapter-neutral. Six
independently versioned families define host configuration, installed user
state, trust evidence, project-local state, portable project intent, and
generation pointers. A single `StateDocumentRegistry` owns their current
schemas, migrations, routing, and isolation policy.

`.pi/plugins.json` is declarative and portable. It identifies desired
marketplaces and plugins but does not claim that they are materialized or
trusted on every machine. Machine-local project context uses a `ProjectKey`
derived from a canonical root and repository fingerprint when available; a
path-only identity is explicit and does not masquerade as repository identity.

A user pointer selects exactly the host-config, installed-user, and trust
families for one generation. A project pointer selects only project-local
state. Pointer and document references are logical versioned hashes, never
physical paths. Valid records may be quarantined independently after a trusted
envelope; invalid pointers, scope bindings, generations, digests, and unknown
future versions fail the enclosing snapshot without exposing a partial value.

The public store port is intentionally small:

```typescript
interface LifecycleStateStore {
  read(scope: ScopeContext, signal: AbortSignal): Promise<StateLoadResult>;
  commit(mutation: StateMutation, signal: AbortSignal): Promise<StateCommitResult>;
}
```

Reads and writes are schema-validated. Structural mutation schemas are
unverified input contracts; `parseStateMutation(input, sha256)` is the only
verifier factory and returns an opaque mutation accepted by the store port. It
recomputes canonical evidence, logical references, scope, and generation
bindings before branding that value. Mutations replace one or more documents
against an expected generation and return a typed stale-generation result
rather than overwriting newer state. The port does not prescribe storage,
paths, locks, transaction callbacks, fsync/rename, secret storage, trust
policy, promotion, generated projections, operations, or recovery. Those are
late-bound seams for later features and adapters. No current state schema
contains secret values, expanded environment, absolute installed/data paths,
projection contents, timestamps in portable intent, or native error causes.

## Installation transaction

```text
resolve
  → materialize staging
  → parse
  → normalize
  → validate compatibility
  → inspect trust
  → prepare runtime projections
  → acquire scope-qualified plugin keys
  → acquire the SQLite scope lock
  → read and verify expected generation
  → run the prepared promotion callback
  → commit the verified mutation
  → write pending transition
  → reload
  → verify activation
  → finalize transition
```

Long-running network, source materialization, inspection, compatibility, trust,
and projection preparation happen before coordination. `createKeyedMutationScheduler`
and `createGenerationMutationCoordinator` then compose scope-qualified FIFO
ownership with the application `ScopeLockManager`. The SQLite adapter holds its
rollback-journal `BEGIN IMMEDIATE` transaction only for the short guarded window;
its private root is capability-probed for local filesystem locking and unknown or
network filesystems fail closed. SQLite busy code 5 is retried with caller
cancellation and bounded application jitter. Locks do not expire, claim fairness,
or fall back to process-local safety; process death releases the OS lock, while a
paused live owner remains held. `LifecycleStateStore.commit` remains the final
compare-and-swap authority, and an uncertain cleanup after a committed result is
reported with committed evidence rather than replayed blindly.

A pending transition records:

- candidate revision;
- previous active revision;
- expected state generation;
- prepared projection hashes;
- operation identifier;
- recovery status.

On successful reload, the new extension instance verifies the projections and
marks the transition active. On failed or interrupted activation, recovery
restores the previous revision.

## Revision retention and recovery

Updating does not immediately delete the prior revision. Existing Pi sessions
may still execute hooks or MCP processes from its path.

Inactive revisions enter a grace period before garbage collection. Persistent
plugin data remains outside revision directories and survives updates.

At startup, recovery:

1. removes abandoned staging directories;
2. inspects pending transitions;
3. finalizes verified activations;
4. restores previous revisions for failed activations;
5. reports state corruption without disabling unrelated plugins;
6. removes expired inactive revisions only when no active state references them.

## Runtime activation

### Skills adapter

The extension handles `resources_discover` and returns skill paths for every
enabled, trusted plugin in the current user and project scope.

Skill state is not copied into Pi settings. Reloading recomputes the complete
path set from plugin-host state.

### Hook adapter

The hook adapter owns foreign command-hook execution. It does not copy hooks
into Pi settings.

```text
Pi event
  → normalized hook event
  → matcher evaluation
  → compatible stdin payload
  → command execution
  → output validation
  → Pi event decision/result
```

The adapter provides:

- event-specific input builders;
- case-aware tool-name aliases;
- plugin root and data environment variables;
- cancellation and timeout propagation;
- concurrent handler execution where required;
- deterministic decision aggregation;
- explicit rejection of unsupported outputs;
- recursion guards for Stop continuation.

Hook definitions are parsed and validated during installation. Runtime execution
does not reinterpret raw manifest JSON.

### Subagent adapter

The subagent adapter integrates with `@gotgenes/pi-subagents`; Plugin Host does
not implement its own subagent runtime. Faithful `SubagentStart` and
`SubagentStop` hooks require lifecycle interception before the child prompt and
before final completion so hooks can inject context or continue the child.
Observational completion events alone are insufficient.

The integration therefore depends on a typed subagent lifecycle-hook contract.
If upstream exposes that contract, the package consumes it. Otherwise, a
narrowly maintained fork implements the same port. A plugin declaring subagent
hooks is incompatible when the required interception contract is unavailable.

### MCP adapter

The MCP boundary is:

```typescript
interface McpRuntimePort {
  validate(servers: PluginMcpProjection[]): Promise<McpValidationResult>;
  activate(source: McpConfigSource): Promise<void>;
  inspect(): Promise<McpRuntimeStatus>;
}
```

The default adapter uses `pi-mcp-adapter`. The integration supplies
plugin-scoped configuration sources before MCP tool registration and preserves
provenance for status and removal.

If upstream exposes the required registration/config-source API, the package
depends on it. Otherwise, a maintained fork implements the same port. The
domain and lifecycle layers do not depend on either implementation.

MCP server names derive from plugin identity and the native server key.
Compatibility aliases preserve foreign tool references where the MCP runtime
can expose them without collision.

## Runtime projections

Activation produces immutable projections:

```typescript
interface PluginRuntimeProjection {
  plugin: PluginKey;
  revision: string;
  skillRoots: string[];
  hooks: NormalizedHook[];
  mcpServers: NormalizedMcpServer[];
  hash: string;
}
```

Projection files under `generated/` are caches. They can be deleted and rebuilt
from authoritative installed state.

A projection hash participates in pending-transition verification and trust
comparison.

## Trust

### Trust subject

Trust binds to:

- canonical marketplace source;
- canonical plugin source;
- immutable revision;
- normalized skill inventory;
- normalized hook definitions;
- normalized MCP process and remote endpoint definitions.

### Trust flow

The presentation adapter shows the compatibility report, executable surface,
and required plugin configuration before initial activation. It collects
non-sensitive values and passes sensitive values directly to the `SecretStore`.
The application layer receives a `TrustGrant`; it never prompts directly.

Automatic updates are configurable per marketplace and disabled by default for
third-party sources. Enabling automatic updates authorizes Pi to acquire,
validate, and activate compatible revisions from the same trusted marketplace
and plugin source, including revisions that change hook or MCP execution
definitions.

Automatic-update trust does not cross a source-identity change. A changed
repository, registry, package identity, marketplace ownership, or plugin source
requires explicit approval.

Compatibility, validation, and activation failures preserve the active revision
regardless of update policy.

## Update discovery and notifications

Pi performs rate-limited, non-blocking update-availability checks for every
configured remote marketplace. This behavior is independent of automatic-update
settings.

When an installed plugin has a newer revision, Pi notifies the user once for
that revision. The notification identifies the plugin, installed version,
available version or source revision, and whether Pi applied the update
automatically or requires `/plugin update`.

Update checks run outside the startup-critical path. Offline operation and
network failure preserve the active revision and do not block Pi startup.

## Pi integration

### Extension lifecycle

The extension factory registers:

- `/plugin`;
- lifecycle event handlers;
- the hook adapter;
- the MCP integration;
- resource discovery;
- recovery and status reporting.

`session_start` loads local state and performs recovery without blocking on
network access. It also schedules update-availability checks after the local
runtime is ready.

`resources_discover` contributes active skill roots.

Lifecycle commands execute application services and invoke `ctx.reload()` only
after a committed change requires resource replacement.

### Presentation

The Pi adapter contains no installation rules. It renders domain results and
sends typed commands to application services.

`/plugin` uses native Pi selection, confirmation, input, notification, and
status components. Command subcommands call the same application services as
the interactive manager.

Non-interactive modes return explicit text or structured errors instead of
attempting terminal-only UI.

## Error model

The domain exposes one common typed contract:

- `DomainContractError` carries the stable code, operation, optional identity and
  location, JSON-safe details, and a native `cause` for logs;
- `BoundaryError` narrows the code set for an unusable marketplace/manifest root,
  source resolution failure, containment failure, or adapter failure;
- `ClaimConflictError` extends `DomainContractError`, retains both typed claims,
  and includes safe snapshots of both claims in its diagnostic details.

Application and runtime adapters may add boundary-specific errors such as
`ActivationError`, `McpRuntimeError`, or `HookExecutionError`, but domain code
never imports those adapters. Every serialized diagnostic contains an operation,
stable code, severity, and actionable message; causes are intentionally omitted
from the JSON projection. A successful `ReadResult` carries warning diagnostics
only, while a failed result carries at least one error diagnostic.

Readers return stable-code diagnostics for malformed entries and may preserve
valid siblings in a partial-success collection result. They throw typed boundary
errors only when the enclosing marketplace or manifest root cannot be trusted,
or when an external adapter fails. One malformed plugin entry therefore does not
invalidate an otherwise valid marketplace. A malformed marketplace root prevents
registration because its identity cannot be trusted.

## Concurrency

- `KeyedMutationScheduler` serializes scope-qualified plugin mutations in FIFO order; canonical multi-key acquisition prevents order cycles.
- `ScopeLockManager` protects one complete user or project scope across processes.
- `createGenerationMutationCoordinator` checks generation before its callback and lets `LifecycleStateStore.commit` perform the final compare-and-swap.
- Different plugin sources may download concurrently, and long-running preparation never runs under the scope lock.
- SQLite uses one rollback-journal database per scope, a zero native busy timeout, and cancellable application-level retries; local capability failure is fatal.
- State commits remain short and serialized; cleanup failure after commit carries committed evidence.
- Hook handler concurrency follows the normalized foreign event contract.
- MCP process lifecycle belongs to the MCP runtime.
- Abort signals propagate through Git, npm, hook, MCP, scheduler waits, and lock acquisition.

## Testing strategy

### Unit tests

- schemas and format readers;
- dual-manifest reconciliation;
- path containment and symlink behavior;
- compatibility verdict derivation;
- identity and source canonicalization, including malformed-percent and encoded-delimiter vectors;
- strict source protocols, credential rejection, immutable revision/integrity shapes, and resolved-source hash binding;
- hook matcher and output mapping;
- state migration and transaction logic.

### Contract fixtures

Fixtures represent:

- Claude-native marketplaces and plugins;
- Codex-native marketplaces and plugins;
- dual-format plugins;
- every supported source form;
- supported command hooks;
- unsupported hook types and events;
- standard-I/O and HTTP MCP servers;
- unsupported runtime components;
- conflicting manifests.

### Integration tests

Integration tests use temporary Git repositories, npm archives, agent homes, and
project roots. They verify complete lifecycle operations and crash recovery.
The committed tooling tests also prove dependency-cruiser rejects domain imports
from Node built-ins and outer layers, and that the built ESM package exposes only
its explicit runtime export allowlist.

### Pi adapter tests

A fake Pi API verifies command registration, event mapping, resource discovery,
reload behavior, project trust, and non-interactive degradation.

### End-to-end tests

A packaged extension runs against a clean Pi environment with:

- neither Claude Code nor Codex installed;
- representative `nklisch/skills` plugins;
- independent third-party fixtures;
- multiple concurrent Pi processes;
- interrupted installs and updates;
- offline startup.

## Alternatives rejected

### Calling Claude or Codex

This makes foreign installations runtime dependencies and violates standalone
operation.

### Requiring Pi manifests in plugins

This preserves the packaging burden the project removes.

### Loading foreign caches directly

Foreign hosts own and garbage-collect those paths. Their undocumented state
cannot be an availability dependency.

### Writing skills and hooks into Pi settings

This creates competing writers and makes generated activation state appear
authoritative. Runtime adapters derive both surfaces directly from plugin-host
state instead.

### Reimplementing MCP

Transport, authentication, discovery, elicitation, and process management
already belong to a dedicated MCP implementation. Plugin Host integrates
through a port.

### Partial installation

A plugin is a behavioral bundle. Omitting declared runtime components changes
its contract and produces false compatibility.
