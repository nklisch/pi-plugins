---
id: epic-foreign-plugin-model-source-materialization
kind: feature
stage: implementing
tags: [security, infra]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-domain-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-12
---

# Secure Source Materialization

## Brief

Resolve and materialize every supported marketplace and plugin source form into inspectable local content with a canonical source identity and immutable revision. The capability covers GitHub shorthand, HTTPS and SSH Git, local Git checkouts, marketplace-relative paths, Git subdirectories, ref and SHA selection, and npm packages or selectors from HTTPS registries. Acquisition remains cancellable and isolated behind filesystem, Git, and npm ports.

Materialization fails closed on path traversal, escaping symlinks, ambiguous revisions, unknown source kinds, and unsafe npm behavior; npm lifecycle scripts never run. This feature produces secure immutable content and source metadata, but does not interpret marketplace or plugin manifests, derive compatibility, or manage installed lifecycle state and caches owned by the transactional-lifecycle epic.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: parallel producer after the canonical contracts; plugin-bundle ingestion consumes its materialized roots
- Design alignment: use canonical source forms, secure containment, immutable revisions, and standalone adapters as fixed by the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Marketplace sources; Marketplace entries; Trust and security; Performance and availability
- `docs/ARCHITECTURE.md` — Source acquisition; Source ports; Concurrency
- `docs/COMPATIBILITY.md` — Marketplace discovery; Plugin source forms

## Discovery and UI alignment

- **Discovery posture**: Direct-read only. The completed source/error contracts and their 119-test hardening record, current domain schemas, marketplace readers and path-syntax helpers, dependency-cruiser rules, and the drafting transactional-lifecycle boundary provide the concrete seams. No exploratory agent was needed or permitted.
- **Existing seams used**: `src/domain/source.ts` owns declared/resolved sources and canonical hashes; `src/domain/errors.ts` owns fatal boundary failures; `src/formats/marketplace-reader-support.ts` validates declaration syntax only; `src/formats/{claude,codex}/marketplace-reader.ts` emits unresolved source declarations.
- **UI**: No UI surface. Materialization is an application/infrastructure capability, so no mockup applies.

## Design decisions

- **Who owns staging and installed paths?**: The lifecycle caller allocates a new empty, private staging slot and passes it to the materializer. This feature may write only `<slot>/content` and `<slot>/.work`, removes `.work` before success, and removes every path it created on error or cancellation. It never chooses cache, marketplace, installed-revision, lock, journal, rollback, promotion, or garbage-collection paths. Those remain responsibilities of `epic-transactional-plugin-lifecycle`.
- **What is the handoff?**: Success returns the content root inside the supplied slot, the existing verified `ResolvedMarketplaceSource` or `ResolvedPluginSource`, and a deterministic `ContentManifest` whose root digest binds every retained file, directory, safe symlink, mode, and byte digest. Lifecycle can later verify this handoff before atomic promotion without knowing Git, npm, or archive details.
- **How are marketplace-relative sources contextualized?**: `SourceContext` is an explicit discriminated union. A `marketplace-path` request must carry the already materialized marketplace root, resolved marketplace source, and manifest root digest; external Git/npm requests must carry `{ kind: "external" }`. The coordinator rejects mismatches before filesystem access.
- **What threat is defended?**: The source tree and archive are malicious. The staging slot is a newly created mode-0700-equivalent directory not writable by an untrusted concurrent process, and a marketplace context is an immutable materializer result. The implementation defends against malicious names, links, archive metadata, and source-root escapes. It does not claim to defend against a local process that can mutate the private staging slot or immutable source root concurrently; lifecycle permissions and ownership provide that boundary. This avoids unsupported claims that portable Node code can emulate descriptor-relative `openat` traversal on every platform.
- **How are path/TOCTOU checks made meaningful?**: All writes go through one `SecureContentWriter` into an initially empty root. It performs lexical checks, collision checks, ancestor `lstat` checks, exclusive regular-file creation, and realpath containment before finalization; it creates validated symlinks only after regular files/directories and materializes hardlinks as file copies. Tree-copy sources must be immutable for the call. A post-extraction sweep is defense in depth, not the primary containment mechanism.
- **How are Git selectors resolved?**: A full `sha` field is authoritative and the optional `ref` is not queried. Without `sha`, a full 40-character ref is treated as a commit id; a qualified `refs/heads/*` or `refs/tags/*` is resolved exactly; an unqualified name is looked up as both branch and tag and fails if both exist, even if they currently peel to the same commit. Tags peel to commits, non-commit objects fail, and the lowercase resolved 40-character commit SHA is the trust identity. Default selection resolves remote `HEAD`. Submodules are unsupported: a selected tree containing `.gitmodules` fails rather than silently producing an incomplete bundle.
- **How is Git content produced?**: Adapters use argument-array subprocesses with `shell: false`, noninteractive credential helpers/SSH agent, and redacted diagnostics. A private bare scratch repository resolves the commit, then `git archive --format=tar <sha>` feeds the hardened archive path. Local checkouts are read through their Git object database, not copied from a mutable worktree. Output contains no `.git` directory.
- **How is npm acquired?**: No npm command, install, lifecycle script, or dependency installation runs. An injected registry client reads the packument, resolves an exact version from an exact selector, distribution tag, or semver range, requires canonical `sha512-` integrity, downloads the HTTPS tarball to bounded scratch, verifies SHA-512 before extraction, and extracts only the `package/` payload through the hardened writer. Registry credentials remain inside the infrastructure client and standard noninteractive npm configuration; they never enter domain/application values or logs.
- **What failures are stable application semantics?**: Cancellation rethrows the abort reason (or a standard `AbortError`) after cleanup and is never converted into a diagnostic. `SourceMaterializationError` extends `BoundaryError` using only existing codes and adds `classification: "security" | "permanent" | "transient"`: containment/archive-policy violations use `PATH_CONTAINMENT_FAILED` and `security`; missing/ambiguous refs, integrity mismatch, unsupported submodules, or malformed remote metadata use `SOURCE_RESOLUTION_FAILED` and `permanent`; network/remote availability failures use `SOURCE_RESOLUTION_FAILED` and `transient`; local process/filesystem adapter failures use `ADAPTER_FAILED`. New stable domain codes are deferred until a later consumer demonstrates a serialization requirement.
- **What are the source credentials and logging rules?**: HTTPS declarations still reject embedded credentials. Git uses configured noninteractive Git credential helpers and SSH agent/config; npm auth is resolved by its registry adapter. Command arguments, URLs, headers, stderr, and causes pass through a central redactor before structured logging or diagnostic details. Secrets are never returned by a port.
- **How are dependency boundaries enforced?**: Extend dependency-cruiser so `src/application/**` imports domain/application only and no Node built-ins or infrastructure/formats/runtime/Pi modules; `src/infrastructure/**` may depend inward on application/domain but not formats/runtime/Pi; existing format and domain boundaries remain. Committed regression fixtures prove each rule.

## Other agent review

- Invoked because: high-risk security/infrastructure design under active autopilot with no prior feature-level alignment.
- Scope: one caller-supplied Z.AI GLM 5.2 advisory pass; no further peer was run because the delegation forbids nested review.
- Reviewer (Phase 1 — advisory/completeness): GLM 5.2
  - Flagged staging/lifecycle ownership, marketplace context, cancellation cleanup, Git selector ambiguity, clean archive/submodule policy, direct verified npm acquisition, containment/TOCTOU, adversarial tar metadata, external credentials, failure classification, deterministic content digests, dependency boundaries, and hermetic adversarial tests.
- Accepted:
  - Caller-owned staging slot and result-only materialized-root/manifest handoff; lifecycle retains promotion, cache/state, locking, journaling, rollback, recovery, and collection.
  - Explicit `SourceContext`, abort/error cleanup, resolved Git SHA identity, argument-array Git commands, `.git`-free archives, and fail-closed submodule rejection.
  - Packument plus direct tarball acquisition, required SHA-512 verification before extraction, no npm install/scripts, centralized credential redaction, and explicit retry/security/cancellation semantics without expanding stable domain codes.
  - A malicious-content threat model, write-time containment plus final verification, hardened tar policy, deterministic content grammar, executable dependency rules, and hermetic/adversarial/cancellation fixtures.
- Rejected or narrowed:
  - Portable Node code will not claim to emulate `openat` or resist a privileged/concurrent local writer. The defensible boundary is a private staging slot and immutable source root; within it, exclusive creation, ancestor checks, and no-follow behavior where the platform exposes it prevent source-controlled link traversal.
  - Hardlinks are not preserved as filesystem hardlinks. They are validated and materialized as regular-file copies, eliminating link-order and later-target replacement hazards while preserving content.
  - A new error code for every cancellation/security/transient case is deferred. Existing stable boundary codes plus an application-only classification are sufficient until persistence or an external API requires finer codes.
- Phase 2 adversarial review: skipped by delegation boundary; the pre-mortem below supplies the local attack pass.

## Architectural choice

### Option A — policy-aware application coordinator plus one hardened content sink (chosen)

Define the lifecycle-facing request/result contract and source dispatch in the application layer. Git, npm, process, registry, and filesystem implementations stay in infrastructure, but every source writes through one `SecureContentWriter` and one manifest builder. This centralizes the security policy and makes Git/npm/marketplace-path behavior converge before bundle ingestion. The cost is a purposeful internal sink abstraction and strict adapter contract.

### Option B — independent materializer per source kind

Let Git, npm, and marketplace-copy adapters each extract/copy and hash independently. This is easy to start and permits parallel work, but duplicates path/link/limit policy in the highest-risk code and makes security drift likely. It is rejected.

### Option C — delegate acquisition to installed Git/npm/tar CLIs

Invoke host tools for clone, `npm pack`, and extraction. Git itself remains appropriate for object/ref semantics, but npm/tar delegation would make versions and security flags host-dependent, risk lifecycle scripts or credential leakage, and weaken deterministic archive validation. Only Git is used as a subprocess; npm and tar are handled through typed ports and libraries.

**Choice**: Option A. `SourceMaterializationService` is the application policy owner, infrastructure adapters acquire bytes/objects, and `SecureContentWriter` is the single write and manifest authority.

## Trickiest unit first

The hardened content sink is the riskiest unit because every acquisition route eventually presents attacker-controlled paths, links, metadata, sizes, and bytes. It is implemented first. The sink starts with an empty root, canonicalizes archive separators before path parsing, reserves names case-insensitively using NFC plus Unicode lowercase, rejects platform-dangerous names even on a different host, writes ordinary entries before symlinks, and finalizes only after realpath/manifest verification. Git and npm never receive a raw filesystem destination; they receive a sink session, which prevents a new adapter from bypassing the policy accidentally.

## Implementation units

### Unit 1: Materialization contract, deterministic manifest, and hardened content sink

**Story**: `epic-foreign-plugin-model-source-materialization-secure-content-contract`

**Files**:
- `src/domain/content-manifest.ts`
- `src/application/source-materialization.ts`
- `src/application/ports/source-acquisition.ts`
- `src/infrastructure/filesystem/secure-content-writer.ts`
- `src/infrastructure/archive/tar-reader.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/domain/content-manifest.test.ts`
- `test/application/source-materialization.test.ts`
- `test/infrastructure/filesystem/secure-content-writer.test.ts`
- `test/infrastructure/archive/tar-reader.test.ts`
- `test/tooling/boundaries.test.ts`
- `test/fixtures/materialization/archives/`

```typescript
// src/domain/content-manifest.ts
import { z } from "zod";
import type { Sha256 } from "./source.js";

export const ContentDigestSchema = z.string()
  .regex(/^sha256:[0-9a-f]{64}$/)
  .brand<"ContentDigest">();
export type ContentDigest = z.infer<typeof ContentDigestSchema>;

export const ContentManifestEntrySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("directory"),
    path: z.string().min(1),
    mode: z.literal(0o755),
  }).strict().readonly(),
  z.object({
    kind: z.literal("file"),
    path: z.string().min(1),
    mode: z.union([z.literal(0o644), z.literal(0o755)]),
    size: z.number().int().nonnegative(),
    digest: ContentDigestSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("symlink"),
    path: z.string().min(1),
    mode: z.literal(0o777),
    target: z.string().min(1),
    digest: ContentDigestSchema,
  }).strict().readonly(),
]);
export type ContentManifestEntry = z.infer<typeof ContentManifestEntrySchema>;

export const ContentManifestSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal("sha256"),
  entries: z.array(ContentManifestEntrySchema).readonly(),
  rootDigest: ContentDigestSchema,
}).strict().readonly().superRefine(/* unique normalized paths, canonical UTF-8 order */);
export type ContentManifest = z.infer<typeof ContentManifestSchema>;

export function hashContent(bytes: Uint8Array, sha256: Sha256): ContentDigest;
export function createContentManifest(
  entries: readonly ContentManifestEntry[],
  sha256: Sha256,
): ContentManifest;
export function verifyContentManifest(
  input: unknown,
  sha256: Sha256,
): ContentManifest;
```

Manifest entries use `/`-separated NFC paths relative to the result root. They are sorted by unsigned UTF-8 byte order. The root preimage is binary and versioned: ASCII `content-v1\0`, then for each entry one kind byte (`D`, `F`, `L`), an unsigned 32-bit big-endian path-byte length, path bytes, an unsigned 32-bit mode, an unsigned 64-bit size (`0` for directory/symlink), and 32 digest bytes (`0x00` for directories). Symlink digest is SHA-256 of the UTF-8 NFC target. File digest is SHA-256 of exact bytes. The root digest is SHA-256 of the complete preimage. Timestamps, uid/gid, archive order, and host separators are excluded. Empty directories are retained, so equal root digests mean equal materialized trees under this policy.

```typescript
// src/application/source-materialization.ts
import type {
  MarketplaceSource, PluginSource, ResolvedMarketplaceSource,
  ResolvedPluginSource, Sha256,
} from "../domain/source.js";
import type { ContentManifest, ContentDigest } from "../domain/content-manifest.js";
import { BoundaryError } from "../domain/errors.js";

export type StagingSlot = Readonly<{ root: string }>;
export type MaterializedMarketplace = Readonly<{
  root: string;
  source: ResolvedMarketplaceSource;
  content: ContentManifest;
}>;
export type MaterializedPlugin = Readonly<{
  root: string;
  source: ResolvedPluginSource;
  content: ContentManifest;
}>;
export type SourceContext =
  | Readonly<{ kind: "external" }>
  | Readonly<{
      kind: "marketplace";
      root: string;
      source: ResolvedMarketplaceSource;
      contentRootDigest: ContentDigest;
    }>;

export interface MarketplaceMaterializer {
  materialize(
    source: MarketplaceSource,
    destination: StagingSlot,
    signal: AbortSignal,
  ): Promise<MaterializedMarketplace>;
}
export interface PluginMaterializer {
  materialize(
    source: PluginSource,
    context: SourceContext,
    destination: StagingSlot,
    signal: AbortSignal,
  ): Promise<MaterializedPlugin>;
}

export type MaterializationFailureClassification =
  | "security" | "permanent" | "transient";
export class SourceMaterializationError extends BoundaryError {
  readonly classification: MaterializationFailureClassification;
  constructor(input: Readonly<{
    code: "PATH_CONTAINMENT_FAILED" | "SOURCE_RESOLUTION_FAILED" | "ADAPTER_FAILED";
    classification: MaterializationFailureClassification;
    operation: string;
    message: string;
    details?: import("../domain/schema.js").JsonValue;
    cause?: unknown;
  }>);
}

export type SourceMaterializationDependencies = Readonly<{
  git: GitSourceAcquirer;
  npm: NpmSourceAcquirer;
  content: SecureContentWriterFactory;
  sha256: Sha256;
}>;
export function createSourceMaterializers(
  dependencies: SourceMaterializationDependencies,
): Readonly<{
  marketplaces: MarketplaceMaterializer;
  plugins: PluginMaterializer;
}>;
```

```typescript
// src/application/ports/source-acquisition.ts
export const DEFAULT_MATERIALIZATION_LIMITS = Object.freeze({
  maxEntries: 20_000,
  maxPathBytes: 1_024,
  maxSegmentBytes: 255,
  maxFileBytes: 64 * 1024 * 1024,
  maxExpandedBytes: 512 * 1024 * 1024,
  maxArchiveBytes: 128 * 1024 * 1024,
  maxExpansionRatio: 100,
  maxPackumentBytes: 10 * 1024 * 1024,
  maxRedirects: 5,
});
export type MaterializationLimits = Readonly<typeof DEFAULT_MATERIALIZATION_LIMITS>;

export type ContentEntry =
  | Readonly<{ kind: "directory"; path: string; mode: number }>
  | Readonly<{ kind: "file"; path: string; mode: number; body: AsyncIterable<Uint8Array> }>
  | Readonly<{ kind: "symlink"; path: string; mode: number; target: string }>
  | Readonly<{ kind: "hardlink"; path: string; mode: number; target: string }>;

export interface SecureContentSession {
  add(entry: ContentEntry, signal: AbortSignal): Promise<void>;
  finalize(signal: AbortSignal): Promise<Readonly<{ root: string; content: ContentManifest }>>;
  abort(cause?: unknown): Promise<void>;
}
export interface SecureContentWriterFactory {
  open(slot: StagingSlot, limits?: Partial<MaterializationLimits>): Promise<SecureContentSession>;
}

export interface GitSourceAcquirer {
  materializeMarketplace(source: MarketplaceSource, sink: SecureContentSession, signal: AbortSignal): Promise<ResolvedMarketplaceSource>;
  materializePlugin(source: Extract<PluginSource, { kind: "git" | "git-subdir" }>, sink: SecureContentSession, signal: AbortSignal): Promise<ResolvedPluginSource>;
}
export interface NpmSourceAcquirer {
  materialize(source: Extract<PluginSource, { kind: "npm" }>, sink: SecureContentSession, signal: AbortSignal): Promise<ResolvedPluginSource>;
}
```

The coordinator opens the sink, validates source/context compatibility, dispatches by the schema-owned source `kind`, and finalizes only after the adapter returns a verified resolved source. `marketplace-path` copies from `context.root/<declared path>` after checking the supplied digest matches the marketplace result and realpath stays within the root. Unknown/mismatched source kinds fail before writes. Every catch path awaits `session.abort`; cleanup failure throws `ADAPTER_FAILED` with the original failure as cause and a redacted cleanup cause in an `AggregateError`. No partial object is returned.

The secure writer owns `<slot>/content` and `<slot>/.work`, requires the slot to exist, be a directory, and contain no entries, and refuses symlinked slot roots. It normalizes `\\` only for rejection (backslashes are never accepted as separators), rejects absolute/UNC/drive paths, NUL, empty/`.`/`..` segments, control characters, colon, trailing dots/spaces, Windows device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, including extensions), and the reserved `.git` path segment. NFC normalization must not change a previously reserved path. Collision keys are NFC plus Unicode lowercase for every platform, so case-only or normalization-only collisions fail consistently.

The tar reader is streaming and does not write. It rejects absolute/drive/backslash/traversal names, PAX/GNU path indirection that violates the final path policy, sparse files, duplicate/colliding paths, block/character devices, FIFO, socket, unknown types, setuid/setgid/sticky bits, uid/gid-dependent behavior, and exceeded entry/file/archive/expanded/ratio limits. The expansion ratio is checked once at least 1 MiB compressed has been consumed and at completion. Modes normalize to `0755` for directories, `0755` for files with any executable bit, `0644` otherwise, and `0777` for symlinks. Link targets must be relative, use `/`, normalize inside the root from the link's parent, and name a retained entry. Symlinks are created after ordinary files/directories; hardlinks are copied from a completed regular-file target and appear as regular files in the manifest.

**Acceptance criteria**:
- [ ] Application/domain modules import no Node, format, infrastructure, runtime, or Pi modules; dependency-cruiser and a generated violation regression enforce the boundaries.
- [ ] The coordinator writes only inside a caller-provided empty slot, returns exactly `<slot>/content`, and leaves no `.work` on success.
- [ ] Abort before open, during copy/extraction, during finalization, and after adapter resolution returns no result and removes owned writes; cleanup failure is explicit.
- [ ] Manifest golden vectors are independent of host, archive order, uid/gid/time, and caller object order; a byte, mode, path, or link-target change changes the root digest.
- [ ] Adversarial archives cover traversal, absolute/drive/backslash paths, symlink and hardlink escape/order, case/NFC collisions, Windows reserved names, special files, setuid/gid, oversized counts/files/totals, and expansion bombs.
- [ ] Marketplace-relative copying cannot escape through lexical paths or symlinks and rejects a context/root-digest mismatch before returning content.

### Unit 2: Deterministic Git resolution and archive materialization

**Story**: `epic-foreign-plugin-model-source-materialization-git-acquisition`

**Files**:
- `src/infrastructure/process/command-runner.ts`
- `src/infrastructure/git/git-source-acquirer.ts`
- `src/infrastructure/logging/redaction.ts`
- `test/infrastructure/process/command-runner.test.ts`
- `test/infrastructure/git/git-source-acquirer.test.ts`
- `test/fixtures/materialization/git/`

```typescript
// src/infrastructure/process/command-runner.ts
export type CommandRequest = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: Readonly<Record<string, string | undefined>>;
  stdin?: AsyncIterable<Uint8Array>;
  stdout: "capture" | "stream";
  maxCapturedBytes: number;
}>;
export type CommandResult = Readonly<{
  exitCode: number;
  stdout: Uint8Array | AsyncIterable<Uint8Array>;
  stderr: Uint8Array;
}>;
export interface CommandRunner {
  run(request: CommandRequest, signal: AbortSignal): Promise<CommandResult>;
}
export function createNodeCommandRunner(options?: Readonly<{
  killGraceMs?: number;
}>): CommandRunner;
```

The Node runner always calls `spawn(executable, args, { shell: false, ... })`, listens for abort, sends the platform-appropriate graceful termination, escalates after 5 seconds, drains pipes, and never includes environment values or raw stderr in a diagnostic. Argument arrays are retained only after URL/credential redaction. No helper builds a shell command string.

```typescript
// src/infrastructure/git/git-source-acquirer.ts
export type GitSourceAcquirerOptions = Readonly<{
  gitExecutable?: string;
  command: CommandRunner;
  archive: TarReader;
  sha256: Sha256;
  limits?: Partial<MaterializationLimits>;
}>;
export function createGitSourceAcquirer(
  options: GitSourceAcquirerOptions,
): GitSourceAcquirer;
```

Resolution uses a private bare repository under the sink scratch area. Remote Git sets `GIT_TERMINAL_PROMPT=0`, `GCM_INTERACTIVE=Never`, and does not disable configured credential helpers or SSH agent/config. SSH is forced noninteractive (`BatchMode=yes`) without logging the composed environment. HTTPS and SSH redirects/protocol behavior remain constrained by the already parsed source contract.

Resolution table:

| Declaration | Resolution |
|---|---|
| plugin `sha` present | fetch/verify that exact object; do not query `ref`; require `git cat-file -t`/peel to `commit` and exact lowercase SHA equality |
| no `sha`, ref is 40 lowercase hex | fetch/verify exact commit |
| `refs/heads/x` | fetch only that branch ref and peel to commit |
| `refs/tags/x` | fetch only that tag ref and peel annotated/lightweight tag to commit |
| unqualified `x` | query/fetch `refs/heads/x` and `refs/tags/x`; zero is missing, two is ambiguous and permanent failure, one peels to commit |
| no ref | resolve remote `HEAD`; local Git resolves its current `HEAD` |

GitHub shorthand first maps to its canonical HTTPS repository URL. A local-Git path is verified as a Git worktree/bare repository and accessed through object commands. After resolution, `.gitmodules` at the selected tree is a permanent unsupported-source failure. `git archive --format=tar <sha>` streams to `TarReader`; for `git-subdir`, archive pathspec is the validated subdirectory and the reader strips that one exact prefix. Empty/missing subdirectories fail. The sink prohibits `.git`, and archive output is checked to contain no Git metadata.

Git exit mapping is explicit: abort is cancellation; missing/ambiguous/non-commit refs, inaccessible local paths, submodules, and authentication/authorization are permanent resolution failures; DNS/connectivity/timeouts and remote 5xx-like transport failures are transient when Git output can identify them without exposing secrets; spawn/protocol/pipe failures are adapter failures. Unknown exit text defaults to permanent, not retry loops. Every returned source is constructed with `createResolvedMarketplaceSource` or `createResolvedPluginSource`; the resolved commit SHA is the immutable trust identity.

**Acceptance criteria**:
- [ ] Hermetic local remotes cover default HEAD, qualified branch/tag, lightweight and annotated tags, branch/tag ambiguity, missing refs, full SHA, `sha` plus conflicting `ref` precedence, non-commit objects, and moving refs.
- [ ] GitHub, HTTPS, SCP SSH, `ssh://`, local Git, plugin Git, and Git-subdirectory routes return schema-verified resolved sources with the selected commit SHA.
- [ ] Materialized output has no `.git`, rejects `.gitmodules`, strips only the requested subdirectory, and produces the same content root digest for equivalent archived trees.
- [ ] Every subprocess invocation uses `shell: false` and argument arrays; cancellation terminates the process and the coordinator cleans scratch/content.
- [ ] Credential-bearing URLs, headers, environment, and stderr are redacted in logs/errors; tests inject recognizable secrets and assert absence.

### Unit 3: Verified npm packument and tarball acquisition

**Story**: `epic-foreign-plugin-model-source-materialization-npm-acquisition`

**Files**:
- `src/infrastructure/npm/npm-registry-client.ts`
- `src/infrastructure/npm/npm-source-acquirer.ts`
- `src/infrastructure/http/bounded-fetch.ts`
- `test/infrastructure/npm/npm-registry-client.test.ts`
- `test/infrastructure/npm/npm-source-acquirer.test.ts`
- `test/infrastructure/http/bounded-fetch.test.ts`
- `test/fixtures/materialization/npm/`
- `package.json`
- `package-lock.json`

```typescript
// src/infrastructure/npm/npm-registry-client.ts
export type NpmVersionRecord = Readonly<{
  version: string;
  tarball: string;
  integrity: NpmIntegrity;
}>;
export interface NpmRegistryClient {
  resolve(
    source: Extract<PluginSource, { kind: "npm" }>,
    signal: AbortSignal,
  ): Promise<Readonly<{
    package: string;
    registry: string;
    selected: NpmVersionRecord;
  }>>;
  downloadVerified(
    record: NpmVersionRecord,
    destinationFile: string,
    limits: MaterializationLimits,
    signal: AbortSignal,
  ): Promise<void>;
}
export function createNpmRegistryClient(options: Readonly<{
  fetch: BoundedFetch;
  credentials: NpmCredentialProvider;
}>): NpmRegistryClient;
```

`NpmCredentialProvider` applies standard user npm configuration inside the HTTP adapter and never returns headers or tokens to application/domain code. The default registry is `https://registry.npmjs.org/`; custom registries are the already validated credential-free HTTPS declaration. Package names are validated and encoded as one registry document key (scoped `/` encoded as `%2f`). Packuments are bounded to 10 MiB and parsed from `unknown` through a strict local schema containing only the selected fields.

Selector rules are deterministic: absent selector means dist-tag `latest`; an exact version selects that exact key; an exact dist-tag name selects its mapped exact version; otherwise a valid semver range selects the highest satisfying stable version, including a prerelease only when the range explicitly permits it. Unknown/ambiguous/invalid selectors fail permanently. The selected record must have matching canonical version text, an HTTPS credential-free tarball URL, and canonical SHA-512 integrity. The implementation uses the `semver` package for range semantics rather than maintaining a partial resolver.

`downloadVerified` follows at most five redirects, requires HTTPS at every hop, drops authorization on cross-origin redirects and lets the credential provider re-authorize the new origin, enforces the compressed-byte limit while streaming, and writes only to `.work`. It computes SHA-512 over exact downloaded bytes, compares with constant-time digest equality, and only then opens the file for gzip/tar extraction. Integrity absence/mismatch is permanent and the tarball is deleted. Tar extraction requires every retained entry under exactly `package/`, strips that prefix, rejects a rootless or empty package, and uses Unit 1 limits/policy. No package manifest is interpreted here.

```typescript
// src/infrastructure/npm/npm-source-acquirer.ts
export function createNpmSourceAcquirer(options: Readonly<{
  registry: NpmRegistryClient;
  archive: TarReader;
  sha256: Sha256;
  limits?: Partial<MaterializationLimits>;
}>): NpmSourceAcquirer;
```

The resulting source is built with `createResolvedPluginSource({ kind: "npm", package, version, integrity, registry }, sha256)`. Registry and tarball logging uses origin plus redacted path; query strings, fragments, auth headers, and response bodies never enter diagnostics. HTTP 408/429/5xx and network interruption are transient (respecting cancellation); 401/403, 404, malformed metadata, selector failure, integrity failure, and archive-policy violations are permanent/security as applicable.

**Acceptance criteria**:
- [ ] A hermetic HTTPS registry fixture covers default `latest`, exact version, dist-tag, range maximum, explicit prerelease, missing selector, malformed packument, and packument-size limits.
- [ ] Every accepted tarball has required canonical SHA-512 integrity verified before extraction; mismatch/absence leaves no content and no tarball.
- [ ] Redirects remain HTTPS, are bounded, and never forward credentials cross-origin; recognizable auth values never appear in logs/errors/results.
- [ ] npm subprocesses, `npm install`, dependency installation, and lifecycle scripts are absent; a fixture package with `preinstall`/`postinstall` proves no marker executes.
- [ ] `package/` stripping, traversal/link attacks, special files, collisions, limits, gzip bombs, cancellation, and cleanup all pass through the Unit 1 policy.

### Unit 4: Public composition, lifecycle handoff, and end-to-end hardening

**Story**: `epic-foreign-plugin-model-source-materialization-integration-hardening`

**Files**:
- `src/infrastructure/source/create-source-materializers.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/source-materialization.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPATIBILITY.md`

```typescript
// src/infrastructure/source/create-source-materializers.ts
export type NodeSourceMaterializerOptions = Readonly<{
  gitExecutable?: string;
  fetch?: typeof globalThis.fetch;
  credentialProvider?: NpmCredentialProvider;
  limits?: Partial<MaterializationLimits>;
}>;
export function createNodeSourceMaterializers(
  options?: NodeSourceMaterializerOptions,
): Readonly<{
  marketplaces: MarketplaceMaterializer;
  plugins: PluginMaterializer;
}>;
```

The composition root wires Node crypto, filesystem, child-process, Git, bounded HTTPS, registry credentials, tar/gzip parsing, and redaction into the inward-facing application interfaces. Application tests use fakes; infrastructure tests use temporary directories, local Git remotes, and hermetic HTTPS servers. `src/index.ts` exports the lifecycle-facing contracts, manifest schemas/functions, defaults, errors, and Node factory deliberately; internal sink, command, tar, HTTP, and credential details remain private. The compiled export allowlist is updated exactly.

Integration fixtures run all source variants into caller-created empty slots and assert a common handoff. Failure injection occurs before acquisition, mid-stream, after content write, during manifest verification, and during abort cleanup. Tests verify no write escapes the slot, no result is returned before complete verification, and retry classification is stable. Marketplace-relative integration uses an actual materialized marketplace result and proves the context digest/containment seam. Git and npm tests run offline and never use the developer's real credentials/config.

Foundation docs are rolled forward to the stable seam only: materializers produce verified staging content plus manifest; lifecycle owns allocation, promotion, state/locks/journal/rollback/GC; source content is malicious; npm is direct-integrity-verified and script-free; Git ref ambiguity/submodule behavior is explicit. They do not predesign lifecycle cache schemas or transitions.

**Acceptance criteria**:
- [ ] Public source and compiled-package imports expose the exact documented materializer/result/manifest/error/factory surface and no raw filesystem/process/credential adapter.
- [ ] `npm test` runs typecheck, domain/application/format/infrastructure boundaries, adversarial unit/integration tests, build, and exact compiled export checks.
- [ ] Every supported marketplace and plugin source form returns a verified resolved source, materialized root, and deterministic manifest from an offline hermetic fixture.
- [ ] Cancellation and every injected failure leave no materializer-owned path; a cleanup failure is surfaced and never misreported as success.
- [ ] The lifecycle handoff can verify `content.rootDigest` without knowing source-specific acquisition details, and no code chooses cache/promotion/state paths or implements locking/journaling/rollback/GC.

## Implementation order

1. `epic-foreign-plugin-model-source-materialization-secure-content-contract`
2. In parallel after Unit 1:
   - `epic-foreign-plugin-model-source-materialization-git-acquisition`
   - `epic-foreign-plugin-model-source-materialization-npm-acquisition`
3. `epic-foreign-plugin-model-source-materialization-integration-hardening`

The sink/manifest contract must stabilize first because both source adapters depend on its safety and handoff. Git and npm then have independent file ownership and hermetic fixtures. Composition follows both so it tests real adapters rather than mocks. Marketplace-relative copy is included in Unit 1 because it is the direct secure-copy use case, not a separate acquisition protocol.

## Error and cancellation mapping

| Condition | Domain code | Application classification | Retry |
|---|---|---|---|
| caller abort | none; throw abort reason/`AbortError` | cancellation | caller decides |
| traversal, escaping link, collision, special file, archive limit | `PATH_CONTAINMENT_FAILED` | `security` | no |
| missing/ambiguous/non-commit Git ref, SHA mismatch, submodule | `SOURCE_RESOLUTION_FAILED` | `permanent` | no |
| npm selector/metadata/integrity/package-prefix failure | `SOURCE_RESOLUTION_FAILED` | `permanent` | no |
| DNS/connectivity/timeout/HTTP 408, 429, 5xx | `SOURCE_RESOLUTION_FAILED` | `transient` | policy outside this feature |
| process spawn, pipe, local filesystem, cleanup failure | `ADAPTER_FAILED` | `permanent` unless adapter proves transient | no automatic retry here |

Operations are stable strings: `materializeMarketplace`, `materializePlugin`, `copyMarketplacePath`, `resolveGitSource`, `archiveGitSource`, `resolveNpmSource`, `downloadNpmTarball`, `extractSourceArchive`, and `finalizeContentManifest`. Details include only safe source kind, origin/host, selector category, limit name, and normalized relative path. Native causes remain attached for local logs after redaction but never enter diagnostics or manifest data.

## Testing

- **Pure manifest tests**: binary golden vectors, UTF-8 ordering, NFC/case uniqueness, empty directories, file/symlink digests, mode normalization, forged root digest, and injected non-32-byte SHA-256 output.
- **Adversarial writer/archive tests**: generated tar streams and committed small fixtures cover every prohibited path/link/type/mode/collision plus thresholds immediately below/above each default limit. Tests assert write-time rejection, not only final sweeps.
- **Git integration**: temporary bare repositories and worktrees create branches, annotated/lightweight tags, ambiguity, moving refs, SHA pins, subdirectories, `.gitmodules`, executable files, links, cancellation, and process failures. No network or user Git config is required.
- **npm integration**: a local HTTPS registry/tarball fixture with a test CA supplies packuments, redirects, auth challenges, ranges/tags/prereleases, valid/tampered archives, scripts, and slow streams. No public registry or real npm config is used.
- **Cross-platform vectors**: path-policy tests always run Windows and POSIX danger cases regardless of host; platform-specific symlink creation tests skip only when the OS denies test setup and retain pure-policy coverage. Modes are normalized in manifest assertions rather than expecting Windows chmod semantics.
- **Cancellation matrix**: pre-aborted, lookup, process, download, archive entry, file stream, final hash, and cleanup phases. Each asserts process/stream termination, no partial return, and slot cleanup.
- **Architecture/package seams**: dependency-cruiser generated violations cover domain→Node, application→Node/infrastructure, formats→infrastructure/Node, and infrastructure→formats/runtime/Pi. Public source imports and compiled ESM enforce the exact allowlist.

## Risks

- **Riskiest assumption — portable containment without descriptor-relative filesystem APIs**: Node's cross-platform filesystem surface cannot promise resistance to an attacker who can concurrently mutate the destination. Mitigation: caller-created private staging, immutable source context, one writer, exclusive files, ancestor checks, deferred links, final realpath verification, and an explicit threat boundary. Fallback: if lifecycle cannot guarantee private slots, add a platform-specific native secure-filesystem adapter before enabling untrusted materialization; do not weaken the stated guarantee.
- **Git server ref behavior differs**: servers may deny direct SHA fetches or advertise tags differently. Mitigation: hermetic command traces, exact qualified refspecs, fail-closed ambiguity, and no fallback to a different ref. Fallback: report permanent resolution failure and require a reachable branch/tag or supported server; never silently change the selected commit.
- **npm metadata is mutable**: tags/ranges and even packuments can change. Mitigation: selected exact version plus required SHA-512 becomes resolved trust identity, and tarball bytes are verified before extraction. Fallback: a registry lacking SHA-512 is unsupported rather than accepted via SHA-1 or TLS alone.
- **Archive parser/library drift**: tar/PAX edge cases are a deep attack surface. Mitigation: keep parser output behind `TarReader`, pin dependencies, use malformed/adversarial fixtures, and reject unknown extensions/types. Fallback: replace the adapter without changing sink/application contracts.
- **Limits reject an unusually large legitimate plugin**: conservative defaults may be too low. Mitigation: limits are one frozen registry and injectable only by trusted composition, with the effective values recorded in safe logs. Fallback: raise a measured limit centrally; never bypass path/link/integrity policy.
- **Credential redaction misses a new helper format**: Git/npm errors can contain remote/user data. Mitigation: diagnostics never include raw stderr, response bodies, headers, environment, queries, or fragments; structured safe fields are rebuilt rather than scrubbed wholesale. Redaction is defense in depth.
- **Least certainty — preserving internal symlinks across Windows**: symlink creation may require privileges and semantics differ. Mitigation: safe links are validated in the manifest contract; an unavailable platform capability fails materialization explicitly rather than dereferencing or changing content. Hardlinks are always copied as regular files.

## Pre-mortem

This feature fails catastrophically if an archive writes outside staging, a moving/ambiguous Git name is recorded as immutable identity, npm bytes are extracted before their required integrity passes, or lifecycle promotes bytes that differ from the inspected tree. The design makes one sink own every write, treats resolved Git SHA and npm version+SHA-512 as identity, verifies npm before extraction, and returns a deterministic tree digest for promotion-time verification. It also fails operationally if cancellation leaves attacker-controlled partial content that recovery mistakes for complete; therefore success is the only path that removes scratch and returns a manifest, while every other path cleans the slot and returns no handoff.

## Implementation summary

All four child stories are done:

- `epic-foreign-plugin-model-source-materialization-secure-content-contract`
- `epic-foreign-plugin-model-source-materialization-git-acquisition`
- `epic-foreign-plugin-model-source-materialization-npm-acquisition`
- `epic-foreign-plugin-model-source-materialization-integration-hardening`

The implementation delivers the deterministic content-manifest and lifecycle handoff, one hardened write/extraction policy, deterministic archive-only Git acquisition, direct integrity-verified npm acquisition with no scripts, and a Node composition root covering every source form. Lifecycle cache, state, promotion, locking, journaling, rollback, recovery, and collection remain outside this feature.

Integrated verification: `npm test` passes 176 tests plus typecheck, 152 dependency edges with no violations, build, and exact 91-export compiled package import.

## Other agent review

- Invoked because: completed security-boundary feature requires deep two-model review.
- Phase 1 — completeness: Z.AI GLM 5.2 xhigh, three-pass convergence. Approved criteria but identified out-of-slot scratch, buffered stream mode, whole-file memory, and cancellation/cleanup semantics.
- Phase 2 — adversarial: fresh-context GPT-5.6 Sol high, five-pass convergence. Reproduced decompressed-metadata limit bypass, unbound declaration/context/result/tree handoff, crash-unrecoverable OS scratch, ignored short writes, and the Phase 1 memory/cancellation findings; additionally challenged credential scope, process-tree termination, manifest complexity, and adversarial coverage.
- Accepted: all blockers and important findings because they violate security, durability, or explicit foundation guarantees. Tracked by `epic-foreign-plugin-model-source-materialization-review-hardening`.
- Rejected/deferred: empty Git trees, ignored harmless global PAX metadata, and user-controlled `GIT_SSH_COMMAND` are intentional or non-impacting within the stated threat model.

## Review findings

The feature is bounced once to `stage: implementing` for `epic-foreign-plugin-model-source-materialization-review-hardening`. Approval requires cryptographic end-to-end binding, total decompression accounting, slot-owned scratch, write-all persistence, live streaming/incremental hashing, explicit combined failure semantics, bounded manifest verification, exact credential claims, and executable adversarial regressions.
