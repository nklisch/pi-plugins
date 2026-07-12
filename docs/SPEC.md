# Pi Plugin Host Specification

## Product boundary

Pi Plugin Host independently installs and runs compatible plugins published for
Claude Code or OpenAI Codex. Neither foreign host nor its CLI is required.

A plugin is compatible when every declared runtime component maps faithfully to
one of these supported surfaces:

1. Agent Skills
2. Command lifecycle hooks
3. MCP servers

Installation, enablement, updates, and removal operate on the complete plugin.
Individual components are not independently managed.

## Runtime and distribution

- Language: TypeScript 7.0
- Module system: ESM
- Runtime: Node.js 24 or newer
- Host: Pi coding agent
- Distribution: Pi package containing the plugin-host extension and its runtime
  dependencies
- Validation: runtime schemas at every external configuration boundary
- Tests: Vitest with isolated filesystem, Git, process, and Pi-host adapters

The package does not require Claude Code or OpenAI Codex to be installed.

## Marketplace sources

A marketplace can be registered from:

- GitHub shorthand such as `owner/repository`
- HTTPS Git URLs
- SSH Git URLs
- a local Git checkout
- an optional branch, tag, or commit selector

Git declarations accept HTTPS URLs, `ssh://` URLs, and common SCP-style
`user@host:path` syntax. SCP remains remote-home-relative while `ssh://` paths
remain absolute; their canonical identities use distinct tagged forms, and SCP
host names are lowercased while its percent signs and path text remain literal.
HTTP, FTP, file, data, and other protocols are rejected. HTTPS URLs cannot
contain embedded credentials; SSH may carry its normal user component but not
an embedded password.

A Git-backed marketplace contains either:

- `.agents/plugins/marketplace.json`
- `.claude-plugin/marketplace.json`

When both files exist, Pi validates both. Entries with the same plugin identity
must resolve consistently. A disagreement is a compatibility error rather than
an implicit precedence choice.

Raw remote `marketplace.json` URLs are not marketplace sources.

## Marketplace entries

Supported plugin source declarations include:

- a path relative to the marketplace root;
- a local-source object whose path remains inside the marketplace root;
- a Git repository root;
- a Git repository subdirectory;
- a Git source pinned by branch, tag, commit, or declared SHA;
- an npm package with an optional version or distribution tag and HTTPS
  registry.

Declared source objects are strict contracts: unknown fields fail validation.
Git `sha` values are full 40-character lowercase hexadecimal revisions, and
resolved npm integrity values are canonical `sha512-` strings containing the
64-byte digest in standard base64. Custom npm registries must use HTTPS and
must not contain embedded credentials. Malformed percent escapes are rejected;
encoded delimiters are normalized without aliasing distinct path segments.

Paths are canonicalized before use. A relative or subdirectory source cannot
escape its containing marketplace or materialized repository.

Unknown source types fail validation with their source location and type.
Resolved source contracts retain the immutable URL/path/package fields and
revision, derive a versioned canonical source from those fields, and verify its
injected SHA-256 hash before a materializer can treat the value as trusted.

## Plugin identity

The stable external identity is:

```text
<plugin-name>@<marketplace-name>
```

The marketplace entry name controls lookup and enablement. A differing internal
manifest name is retained as component-namespace metadata and reported to the
user.

An installed revision records:

- marketplace identity;
- plugin identity;
- source type and canonical source;
- resolved immutable source revision;
- declared plugin version when present;
- normalized component inventory;
- scope;
- compatibility verdict;
- trust record;
- active installation path.

## Manifests

Pi recognizes:

- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`

A plugin with both manifests is a dual-format plugin. Pi validates both and
combines non-conflicting metadata. Conflicting declarations of a supported
runtime component make the plugin incompatible.

Conventional component paths are recognized when the source format defines
them. Explicit manifest paths must:

- begin with `./`;
- resolve relative to the plugin root;
- remain inside the plugin root;
- reference an allowed file or directory shape.

## Supporting plugin configuration

Claude `userConfig` is supported when its values configure a supported skill,
hook, or MCP component. Supported values include strings, numbers, booleans,
directories, files, and declared string arrays. Required values, defaults,
bounds, and path constraints are validated before activation.

Sensitive values use an operating-system credential store through a dedicated
secret-storage adapter. They never appear in plugin-host state, generated MCP
configuration, logs, or compatibility reports.

Configured values are available through `${user_config.KEY}` substitution and
`CLAUDE_PLUGIN_OPTION_<KEY>` process environment variables.

## Component compatibility verdicts

Every discovered component receives one verdict:

- `supported`: Pi provides the required behavior;
- `metadata-only`: the field has no runtime effect and is safe to retain or
  ignore;
- `incompatible`: Pi cannot preserve the component's behavior.

A supported component may name explicit runtime requirements, such as a Pi
integration or platform capability. Requirement availability is assessed
separately; it is not a fourth component verdict. The plugin is activatable only
when all runtime components are supported and every requirement they cite is
available. Metadata-only fields do not prevent activation. There is no
partial-install mode.

The compatibility report lists every discovered component and its verdict
before installation changes active state.

## Domain diagnostics

The domain uses a stable error-code registry and `DomainContractError` for
serializable failures. `BoundaryError` is reserved for an untrusted enclosing
root, source-resolution failure, path-containment failure, or adapter failure.
`ClaimConflictError` is a `DomainContractError` and retains both conflicting
claims and their provenance in its diagnostic details; no declaration wins by
precedence. A successful `ReadResult` may contain warnings only. A failed
`ReadResult` must contain at least one error diagnostic. Native causes remain
available on thrown errors for logs but never appear in diagnostics.

## Skills

Supported skill forms are:

- `skills/<name>/SKILL.md`;
- manifest-declared skill directories;
- one root `SKILL.md` where the foreign format permits it;
- Claude's legacy flat command markdown when it can be represented as a Pi
  skill without changing invocation semantics.

Skills follow the Agent Skills standard. Pi retains supporting scripts,
references, and assets inside the immutable installed plugin revision.

Skill names are namespaced or disambiguated using Pi's normal collision
behavior. A collision never silently replaces a skill from another source.

Enabled plugin skill roots are contributed through Pi's
`resources_discover` lifecycle. Plugin lifecycle changes trigger Pi's normal
reload flow.

## Hooks

### Supported hook type

Only `type: "command"` hooks are supported.

HTTP, prompt, agent, MCP-tool, and unknown hook handler types are incompatible.
An asynchronous command mode that changes lifecycle ordering is also
incompatible.

### Supported events

The command-hook runtime supports events for which Pi provides a faithful
lifecycle boundary:

- `SessionStart`
- `SessionEnd`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PostToolUseFailure`
- `PreCompact`
- `PostCompact`
- `SubagentStart`
- `SubagentStop`
- `Stop`

Subagent events use the installed Pi subagent service. A plugin declaring those
events is incompatible when the required service is unavailable.

Events without a faithful Pi boundary, including `PermissionRequest`, are
incompatible.

### Hook execution

Hook commands:

- run with the Pi session working directory;
- receive one compatible JSON object on standard input;
- receive the configured timeout;
- run concurrently where the foreign event contract requires concurrency;
- capture standard output, standard error, exit status, timeout, and
  cancellation;
- receive the plugin root and persistent data environment variables.

The runtime defines equivalent values for:

```text
CLAUDE_PLUGIN_ROOT
CLAUDE_PLUGIN_DATA
PLUGIN_ROOT
PLUGIN_DATA
CLAUDE_PROJECT_DIR
```

Tool matchers recognize Pi names and foreign aliases. For example, a matcher for
`Write|Edit|apply_patch` matches the corresponding Pi file-mutation tools.

Hook outputs support blocking, allowed input rewriting, additional context, and
continuation only where Pi can preserve the documented behavior. Unsupported
output fields fail compatibility validation or produce an explicit hook error;
they are not accepted as no-ops.

Exact hook mappings and limitations live in `COMPATIBILITY.md`.

## MCP servers

Plugin MCP declarations can define:

- local standard-I/O servers;
- Streamable HTTP servers;
- command arguments;
- working directory;
- environment variables;
- HTTP headers;
- bearer-token environment references;
- OAuth behavior supported by the selected Pi MCP runtime;
- startup and tool timeouts;
- enabled and disabled tool lists;
- tool approval policy where the runtime supports it.

The MCP integration preserves plugin provenance and namespaces servers by plugin
identity. Two plugins declaring the same local server key do not collide.

The host supplies expanded plugin root and data paths to the MCP runtime.
Transport management, authentication, elicitation, sampling, discovery, and
process lifecycle belong to the MCP implementation.

Pi Plugin Host integrates through a narrow plugin-scoped configuration-source
contract. The preferred implementation extends `pi-mcp-adapter`; a maintained
fork supplies the same contract when upstream does not.

A plugin is incompatible when its MCP behavior depends on a transport,
authentication mode, capability, or exact tool-name contract that the active
MCP implementation cannot preserve.

## Scopes

### User scope

User marketplace declarations, plugin state, trust, cache, and persistent data
live under:

```text
~/.pi/agent/plugin-host/
```

User-scoped plugins are available in every Pi project unless disabled.

### Project scope

Portable project declarations live in:

```text
.pi/plugins.json
```

This file contains:

- schema version;
- marketplace source declarations;
- requested plugin identities;
- source or version constraints;
- project enablement.

It does not contain absolute paths, cache locations, timestamps, credentials,
or trust decisions.

Materialized project-plugin state remains under the user's Pi agent directory,
keyed by canonical project identity. A trusted project with missing materialized
plugins requests synchronization before activation.

## State layout

```text
~/.pi/agent/plugin-host/
├── config.json
├── state.json
├── trust.json
├── marketplaces/
├── cache/
├── data/
├── projects/
└── staging/
```

- `config.json` stores user marketplace declarations and update preferences.
- `state.json` records installed user plugin revisions and activation state.
- `trust.json` records source and executable-surface approvals.
- `marketplaces/` stores materialized marketplace revisions.
- `cache/` stores immutable plugin revisions.
- `data/` stores persistent user-plugin data.
- `projects/` stores machine-local state for project declarations.
- `staging/` holds incomplete transactions and is safe to clean after recovery.

Every state file has an explicit schema version.

## Lifecycle operations

The public command surface includes:

```text
/plugin
/plugin marketplace add <source>
/plugin marketplace list
/plugin marketplace update [name]
/plugin marketplace remove <name>
/plugin list
/plugin inspect <plugin>@<marketplace>
/plugin install <plugin>@<marketplace> [--scope user|project]
/plugin enable <plugin>@<marketplace> [--scope user|project]
/plugin disable <plugin>@<marketplace> [--scope user|project]
/plugin update [<plugin>@<marketplace>]
/plugin uninstall <plugin>@<marketplace> [--scope user|project]
/plugin sync
/plugin adopt
```

`/plugin` without arguments opens a Pi-native marketplace and installed-plugin
manager. The command forms remain available for deterministic operation.

An operation affecting activation invokes Pi's reload lifecycle after its state
commits successfully.

## Install transaction

Installation and update follow one transaction:

1. Resolve the marketplace snapshot and plugin source.
2. Materialize the source into staging.
3. Determine the immutable source revision.
4. Parse all applicable manifests and conventional component locations.
5. Normalize and validate the complete component inventory.
6. Produce the compatibility report.
7. Collect required trust.
8. Prepare skills, hook, and MCP activation state.
9. Atomically promote the staged revision.
10. Atomically commit plugin-host state.
11. Reload Pi resources.
12. Confirm activation and retain or retire the prior revision.

Before state commit, failure removes staging and leaves the current installation
unchanged. Activation failure restores the prior active revision and reports the
failed candidate.

Uninstall removes activation first, then cached revisions. Persistent plugin
data is deleted only after explicit confirmation.

## Enablement

Enable and disable operations apply to the complete plugin.

Disabling a plugin removes its skills, hooks, and MCP servers from active
runtime state but preserves its installed revision, persistent data, and trust
record.

Project enablement participates in Pi's project trust boundary. Untrusted
project declarations do not activate executable components.

## Updates

An installed revision is identified by both its declared version and immutable
source revision.

Version resolution follows:

1. plugin manifest version;
2. marketplace entry version;
3. resolved Git revision;
4. resolved npm package version.

A matching declared version does not override a changed immutable source
revision in the installation record.

Explicit update checks are always available. Pi also performs rate-limited,
non-blocking update-availability checks for every configured remote marketplace
and notifies the user when an installed plugin has a newer revision. Availability
notifications do not depend on whether automatic activation is enabled and are
shown once per discovered revision.

Per-marketplace automatic updates are configurable and disabled by default for
third-party sources. Enabling automatic updates authorizes Pi to acquire,
validate, and activate compatible new revisions from the same trusted
marketplace and plugin source, including revisions that change hook or MCP
execution definitions. Source-identity changes still require explicit approval.

Network failure, validation failure, or activation failure never blocks Pi
startup or disables the active revision.

## Trust and security

Marketplace and plugin content is untrusted input.

Before activation, Pi displays:

- canonical marketplace and plugin source;
- immutable revision;
- supported component inventory;
- hook commands;
- MCP process or remote-server declarations;
- persistent-data access;
- compatibility limitations;
- changes from the active revision.

Trust is bound to source identity, immutable revision, and normalized executable
component definitions. Credentials are never stored in plugin-host state.

Project declarations require Pi project trust. Path traversal, symlink escape,
malformed schemas, ambiguous identity, and conflicting manifests fail closed.

Install and update operations never run npm lifecycle scripts. Runtime
dependencies required by a plugin are installed only through an explicitly
declared and trusted plugin operation.

## Foreign-state adoption

Adoption reads marketplace declarations from available Claude Code and Codex
user state.

Adoption:

- is optional;
- copies selected marketplace source declarations only;
- does not reuse foreign plugin caches;
- does not import foreign trust decisions;
- does not require either foreign CLI;
- installs selected plugins through Pi's normal validation and trust pipeline.

Foreign state is never modified.

## Performance and availability

- Startup does not require network access.
- Installed plugin discovery uses local state.
- Marketplace refresh and source acquisition are cancellable.
- Long-running Git, npm, and validation operations run without blocking Pi's
  interactive loop.
- Resource reload happens only after committed lifecycle changes.
- Corrupt marketplace or plugin state is isolated and reported without
  preventing unrelated plugins from loading.

## Acceptance criteria

The system is accepted when automated tests demonstrate:

1. A clean Pi environment with no Claude or Codex installation can add a
   Git-backed marketplace.
2. Claude-native, Codex-native, and dual-manifest plugins normalize correctly.
3. A compatible plugin activates skills, command hooks, and MCP servers as one
   unit.
4. User and project scopes remain independent.
5. Project declarations contain no machine-specific paths.
6. Enable, disable, update, and uninstall affect all plugin components.
7. Failed installation and activation preserve the working revision.
8. Unsupported runtime components produce precise incompatibility reports.
9. Hook aliases, path variables, blocking, rewriting, and context injection
   behave according to the compatibility contract.
10. MCP server identity and lifecycle remain isolated between plugins.
11. Update checks do not make startup network-dependent.
12. Claude and Codex marketplace declarations can be adopted read-only.
13. Representative plugins from `nklisch/skills` install unchanged.
14. Independent third-party fixtures verify both successful compatibility and
    rejection of unsupported behavior.
15. Removal leaves no active skill, hook, or MCP configuration behind.
