import { randomBytes as nodeRandomBytes } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  ContentDigestSchema,
  hashContent,
  type ContentDigest,
} from "../../domain/content-manifest.js";
import { PluginKeySchema, type PluginKey } from "../../domain/identity.js";
import {
  derivePluginDataRef,
  deriveProjectionRootRef,
  PluginDataRefSchema,
  ProjectionRootRefSchema,
  type PluginDataRef,
  type ProjectionRootRef,
} from "../../domain/state/references.js";
import { ScopeReferenceSchema, type ScopeReference } from "../../domain/state/scope.js";
import { DomainContractError, ErrorCodeRegistry } from "../../domain/errors.js";
import type {
  ContentStoreCapabilities,
  ProjectionRootAllocation,
  ProjectionRootRequest,
  ResolvedProjectionRoot,
  StableDataRootRequest,
  WritableDataRoot,
} from "../../application/ports/content-store.js";
import type { ContentStorePlatform } from "../../application/ports/content-store-platform.js";
import type { Sha256 } from "../../domain/source.js";
import {
  assertLayoutRoot,
  assertOwnedDirectory,
  type ContentStoreLayout,
} from "./content-store-layout.js";
import { projectionStagingPath } from "./content-store-layout.js";
import { removePreparedTree, type PreparedTreeIdentity } from "./prepared-tree-cleanup.js";

const READY_TEXT = "content-store-ready-v1\n";
const READY = "READY";
const READY_TMP = "READY.tmp";
const METADATA = "metadata.json";

const ProjectionMetadataSchema = z.object({
  version: z.literal(1),
  projectionRef: ProjectionRootRefSchema,
  /** Complete logical lifecycle identity. */
  projectionDigest: ContentDigestSchema,
  /** Exact generated payload-tree integrity, independent of projectionDigest. */
  payloadDigest: ContentDigestSchema,
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
}).strict().readonly();

type ProjectionMetadata = z.infer<typeof ProjectionMetadataSchema>;
type ProjectionEntry = Readonly<{ kind: "directory" | "file" | "symlink"; path: string; mode: number; size?: number; digest?: ContentDigest; target?: string }>;

type ProjectionRecord = Readonly<{
  allocation: ProjectionRootAllocation;
  root: string;
  identity: PreparedTreeIdentity;
}>;

export type RuntimeRootStore = Readonly<{
  ensureDataRoot(input: StableDataRootRequest, signal: AbortSignal): Promise<WritableDataRoot>;
  allocateProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ProjectionRootAllocation>;
  sealProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<ResolvedProjectionRoot>;
  discardProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<void>;
  resolveProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ResolvedProjectionRoot>;
}>;

export type RuntimeRootStoreOptions = Readonly<{
  layout: ContentStoreLayout;
  platform: ContentStorePlatform;
  sha256: Sha256;
  randomBytes?: (size: number) => Uint8Array | Promise<Uint8Array>;
}>;

function rootError(code: "stagingAllocationInvalid" | "contentVerificationFailed" | "storeIdentityCollision" | "durabilityUnavailable" | "adapterFailed", operation: string, message: string, cause?: unknown, cleanup?: "incomplete"): DomainContractError {
  return new DomainContractError({
    code: ErrorCodeRegistry[code],
    operation,
    message,
    details: { operation, ...(cleanup === undefined ? {} : { cleanup }) },
    ...(cause === undefined ? {} : { cause }),
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function isIncompleteCleanup(error: unknown): boolean {
  if (!(error instanceof DomainContractError)) return false;
  const details = error.details;
  return details !== null && typeof details === "object" && !Array.isArray(details) && "cleanup" in details && details.cleanup === "incomplete";
}

function idFromBytes(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 16) throw new Error("projection allocation id source must return 16 bytes");
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function projectionMetadataMatches(
  metadata: ProjectionMetadata,
  identity: Readonly<{ scope: ScopeReference; plugin: PluginKey; projectionDigest: ContentDigest; payloadDigest: ContentDigest; projectionRef: ProjectionRootRef }>,
  sha256: Sha256,
): boolean {
  const expectedRef = deriveProjectionRootRef({
    scope: identity.scope,
    plugin: identity.plugin,
    projectionDigest: identity.projectionDigest,
  }, sha256);
  return metadata.version === 1 &&
    metadata.projectionRef === identity.projectionRef &&
    metadata.projectionDigest === identity.projectionDigest &&
    metadata.payloadDigest === identity.payloadDigest &&
    metadata.projectionRef === expectedRef &&
    sameJson(metadata.scope, identity.scope) &&
    metadata.plugin === identity.plugin;
}

async function assertProjectionAllocation(
  record: ProjectionRecord,
  layout: ContentStoreLayout,
  operation: string,
): Promise<void> {
  try {
    await assertLayoutRoot(layout, "projectionStagingRoot", operation);
    await assertLayoutRoot(layout, "generatedRoot", operation);
    await assertOwnedDirectory(record.root, operation, record.identity, layout.rootCapabilities.projectionStagingRoot);
  } catch (cause) {
    if (cause instanceof DomainContractError) throw cause;
    throw rootError("stagingAllocationInvalid", operation, "projection allocation identity changed", cause);
  }
}

async function projectionEntriesWithHash(root: string, sha256: Sha256, prefix = ""): Promise<ProjectionEntry[]> {
  const children = (await readdir(root, { withFileTypes: true })).sort((left, right) => comparePath(left.name, right.name));
  const entries: ProjectionEntry[] = [];
  for (const child of children) {
    // READY and metadata are publication controls only at the allocation
    // root. Nested entries with those names are projection payload and must be
    // hashed, sealed, and verified like every other entry.
    if (prefix.length === 0 && (child.name === READY || child.name === READY_TMP || child.name === METADATA)) continue;
    const path = prefix.length === 0 ? child.name : `${prefix}/${child.name}`;
    const absolute = join(root, child.name);
    const stat = await lstat(absolute);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      entries.push({ kind: "directory", path, mode: 0o755 });
      entries.push(...await projectionEntriesWithHash(absolute, sha256, path));
    } else if (stat.isFile() && !stat.isSymbolicLink()) {
      const bytes = await readFile(absolute);
      entries.push({ kind: "file", path, mode: stat.mode & 0o111 ? 0o755 : 0o644, size: bytes.byteLength, digest: hashContent(bytes, sha256) });
    } else if (stat.isSymbolicLink()) {
      throw new Error("projection root contains a symlink");
    } else {
      throw new Error("projection root contains a special file");
    }
  }
  return entries;
}

/** Stable digest for generated projection payloads, excluding publication metadata. */
export async function hashProjectionRoot(root: string, sha256: Sha256): Promise<ContentDigest> {
  const entries = await projectionEntriesWithHash(root, sha256);
  return hashContent(new TextEncoder().encode(`projection-root-v1\0${JSON.stringify(entries)}`), sha256);
}

type BeforeEffect = () => Promise<void>;

async function sealProjectionTree(
  root: string,
  sha256: Sha256,
  platform: ContentStorePlatform,
  beforeEffect?: BeforeEffect,
): Promise<void> {
  await beforeEffect?.();
  const entries = await projectionEntriesWithHash(root, sha256);
  await beforeEffect?.();
  for (const entry of [...entries].sort((left, right) => right.path.split("/").length - left.path.split("/").length)) {
    const path = join(root, ...entry.path.split("/"));
    if (entry.kind === "directory") {
      await beforeEffect?.();
      await chmod(path, 0o555);
      await beforeEffect?.();
      await platform.syncDirectory(path);
    } else if (entry.kind === "file") {
      await beforeEffect?.();
      await chmod(path, entry.mode === 0o755 ? 0o555 : 0o444);
      await beforeEffect?.();
      await platform.syncFile(path);
    }
  }
  // Keep the allocation root writable until publication. The caller performs
  // the final identity-checked chmod after the no-replace rename so the
  // staging parent remains writable for that rename.
  await beforeEffect?.();
  await platform.syncDirectory(root);
}

export function createRuntimeRootStore(options: RuntimeRootStoreOptions): RuntimeRootStore {
  const projectionAllocations = new WeakMap<object, ProjectionRecord>();
  const randomBytes = options.randomBytes ?? ((size: number) => new Uint8Array(nodeRandomBytes(size)));
  let capabilitiesPromise: Promise<ContentStoreCapabilities> | undefined;
  const capabilities = async (): Promise<ContentStoreCapabilities> => {
    await assertLayoutRoot(options.layout, "hostRoot", "probeRuntimeRoots");
    capabilitiesPromise ??= options.platform.probe(options.layout.hostRoot).then((value) => {
      if (!value.atomicNoReplaceDirectory || !value.fileSync || !value.directorySync || value.readOnlyModeEnforcement !== "posix-mode") {
        throw rootError("durabilityUnavailable", "probeRuntimeRoots", "runtime root durability is unavailable");
      }
      return value;
    });
    return capabilitiesPromise;
  };

  async function ensureDataRoot(input: StableDataRootRequest, signal: AbortSignal): Promise<WritableDataRoot> {
    throwIfAborted(signal);
    const scope = ScopeReferenceSchema.parse(input.scope);
    const plugin = PluginKeySchema.parse(input.plugin);
    const dataRef = PluginDataRefSchema.parse(input.dataRef);
    const expected = derivePluginDataRef({ scope, plugin, purpose: "persistent-plugin-data" }, options.sha256);
    if (dataRef !== expected) throw rootError("contentVerificationFailed", "ensureDataRoot", "persistent data reference is not stable for its scope and plugin");
    const root = options.layout.dataPath(dataRef);
    await assertLayoutRoot(options.layout, "dataRoot", "ensureDataRoot");
    try {
      await mkdir(root, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw rootError("adapterFailed", "ensureDataRoot", "persistent data root could not be created", error);
    }
    await assertLayoutRoot(options.layout, "dataRoot", "ensureDataRoot");
    const stat = await lstat(root).catch((cause) => { throw rootError("contentVerificationFailed", "ensureDataRoot", "persistent data root is unavailable", cause); });
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw rootError("contentVerificationFailed", "ensureDataRoot", "persistent data root is not a private directory");
    const identity = { dev: stat.dev, ino: stat.ino };
    await assertOwnedDirectory(root, "ensureDataRoot", identity, options.layout.rootCapabilities.dataRoot);
    await assertLayoutRoot(options.layout, "dataRoot", "ensureDataRoot");
    await chmod(root, 0o700);
    await assertOwnedDirectory(root, "ensureDataRoot", identity, options.layout.rootCapabilities.dataRoot);
    await assertLayoutRoot(options.layout, "dataRoot", "ensureDataRoot");
    return Object.freeze({ root, scope, plugin, dataRef });
  }

  async function allocateProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ProjectionRootAllocation> {
    throwIfAborted(signal);
    const scope = ScopeReferenceSchema.parse(input.scope);
    const plugin = PluginKeySchema.parse(input.plugin);
    const projectionDigest = ContentDigestSchema.parse(input.projectionDigest);
    // Older lifecycle-only callers did not carry a payload digest. Keep their
    // request shape readable while ensuring every published v1 root stores the
    // two identities separately once a cache supplies the exact payload hash.
    const payloadDigest = ContentDigestSchema.parse(input.payloadDigest ?? projectionDigest);
    const projectionRef = ProjectionRootRefSchema.parse(input.projectionRef);
    const expected = deriveProjectionRootRef({ scope, plugin, projectionDigest }, options.sha256);
    if (projectionRef !== expected) throw rootError("contentVerificationFailed", "allocateProjectionRoot", "projection reference does not match its identity");
    for (let attempt = 0; attempt < 32; attempt += 1) {
      throwIfAborted(signal);
      const id = idFromBytes(await randomBytes(16));
      const root = projectionStagingPath(options.layout, id);
      await assertLayoutRoot(options.layout, "projectionStagingRoot", "allocateProjectionRoot");
      let allocationIdentity: PreparedTreeIdentity | undefined;
      try {
        await mkdir(root, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw rootError("adapterFailed", "allocateProjectionRoot", "projection root allocation failed", error);
      }
      try {
        await assertLayoutRoot(options.layout, "projectionStagingRoot", "allocateProjectionRoot");
        const stat = await lstat(root);
        allocationIdentity = { dev: stat.dev, ino: stat.ino };
        const canonical = await realpath(root);
        if (!stat.isDirectory() || stat.isSymbolicLink() || canonical !== root || (stat.mode & 0o077) !== 0) {
          throw new Error("projection root allocation is not a private real directory");
        }
        await assertOwnedDirectory(root, "allocateProjectionRoot", allocationIdentity, options.layout.rootCapabilities.projectionStagingRoot);
        const allocation = Object.freeze({ root, scope, plugin, projectionDigest, payloadDigest, projectionRef, allocationId: id });
        projectionAllocations.set(allocation, { allocation, root, identity: { dev: stat.dev, ino: stat.ino } });
        return allocation;
      } catch (error) {
        let cleanupFailure: unknown;
        try {
          if (allocationIdentity !== undefined) await removePreparedTree(root, allocationIdentity, options.layout.rootCapabilities.projectionStagingRoot);
        } catch (cause) { cleanupFailure = cause; }
        if (cleanupFailure !== undefined) {
          throw rootError(
            "adapterFailed",
            "allocateProjectionRoot",
            "projection root allocation could not be verified and cleanup was incomplete",
            new AggregateError([error, cleanupFailure], "projection allocation cleanup failed"),
            "incomplete",
          );
        }
        throw rootError("adapterFailed", "allocateProjectionRoot", "projection root allocation could not be verified", error);
      }
    }
    throw rootError("adapterFailed", "allocateProjectionRoot", "projection allocation collision limit exceeded");
  }

  async function sealProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<ResolvedProjectionRoot> {
    throwIfAborted(signal);
    const record = input !== null && typeof input === "object" ? projectionAllocations.get(input) : undefined;
    if (record === undefined || record.allocation.root !== input.root || record.allocation.allocationId !== input.allocationId) {
      throw rootError("stagingAllocationInvalid", "sealProjectionRoot", "projection root allocation capability is invalid");
    }
    // Check the capability before hashing or creating publication controls. A
    // replaced allocation must not turn metadata writes into foreign writes.
    await assertProjectionAllocation(record, options.layout, "sealProjectionRoot");
    await capabilities();
    await assertProjectionAllocation(record, options.layout, "sealProjectionRoot");
    const expected = deriveProjectionRootRef({ scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest }, options.sha256);
    if (expected !== input.projectionRef) throw rootError("contentVerificationFailed", "sealProjectionRoot", "projection root identity changed");
    const payloadDigest = await hashProjectionRoot(record.root, options.sha256).catch((cause) => { throw rootError("contentVerificationFailed", "sealProjectionRoot", "projection payload could not be verified", cause); });
    await assertProjectionAllocation(record, options.layout, "sealProjectionRoot");
    if (payloadDigest !== input.payloadDigest) throw rootError("contentVerificationFailed", "sealProjectionRoot", "projection payload digest does not match its integrity reference");
    const target = options.layout.projectionPath(input.projectionRef);
    await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
    let targetStat;
    try { targetStat = await lstat(target); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw rootError("adapterFailed", "sealProjectionRoot", "projection target could not be inspected", error);
    }
    if (targetStat !== undefined) {
      await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
      const existing = await inspectProjection(target, options.sha256);
      if (projectionMetadataMatches(existing, input, options.sha256)) {
        try {
          await removePreparedTree(record.root, record.identity, options.layout.rootCapabilities.projectionStagingRoot);
          await assertLayoutRoot(options.layout, "projectionStagingRoot", "sealProjectionRoot");
        } catch (cause) {
          throw rootError("adapterFailed", "sealProjectionRoot", "projection allocation cleanup was incomplete", cause, "incomplete");
        }
        return { root: join(target), scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest, payloadDigest: input.payloadDigest, projectionRef: input.projectionRef };
      }
      throw rootError("storeIdentityCollision", "sealProjectionRoot", "projection identity is already occupied by different content");
    }
    let published = false;
    let cleanupAttempted = false;
    let cleanupFailure: unknown;
    const tryCleanup = async (): Promise<unknown> => {
      if (cleanupAttempted) return cleanupFailure;
      cleanupAttempted = true;
      try {
        await removePreparedTree(record.root, record.identity, options.layout.rootCapabilities.projectionStagingRoot);
        await assertLayoutRoot(options.layout, "projectionStagingRoot", "sealProjectionRoot");
      } catch (cause) {
        cleanupFailure = cause;
      }
      return cleanupFailure;
    };
    const assertProjectionBeforeEffect: BeforeEffect = async () => {
      await assertProjectionAllocation(record, options.layout, "sealProjectionRoot");
    };
    const cleanupError = (primary: unknown): DomainContractError => rootError(
      "adapterFailed",
      "sealProjectionRoot",
      "projection publication failed and cleanup was incomplete",
      new AggregateError([primary, cleanupFailure], "projection cleanup failed"),
      "incomplete",
    );
    try {
      await assertProjectionBeforeEffect();
      const metadata: ProjectionMetadata = { version: 1, projectionRef: input.projectionRef, projectionDigest: input.projectionDigest, payloadDigest: input.payloadDigest, scope: input.scope, plugin: input.plugin };
      await assertProjectionBeforeEffect();
      await writeFile(join(record.root, METADATA), JSON.stringify(metadata), { flag: "wx", mode: 0o600 });
      await assertProjectionBeforeEffect();
      await writeFile(join(record.root, READY_TMP), READY_TEXT, { flag: "wx", mode: 0o600 });
      await assertProjectionBeforeEffect();
      await rename(join(record.root, READY_TMP), join(record.root, READY));
      await assertProjectionBeforeEffect();
      await chmod(join(record.root, METADATA), 0o444);
      await assertProjectionBeforeEffect();
      await chmod(join(record.root, READY), 0o444);
      await assertProjectionBeforeEffect();
      for (const entry of await projectionEntriesWithHash(record.root, options.sha256)) {
        const path = join(record.root, ...entry.path.split("/"));
        if (entry.kind === "file") {
          await assertProjectionBeforeEffect();
          await options.platform.syncFile(path);
        }
      }
      await assertProjectionBeforeEffect();
      await options.platform.syncFile(join(record.root, METADATA));
      await assertProjectionBeforeEffect();
      await options.platform.syncFile(join(record.root, READY));
      await assertProjectionBeforeEffect();
      await sealProjectionTree(record.root, options.sha256, options.platform, assertProjectionBeforeEffect);
      await assertProjectionBeforeEffect();
      throwIfAborted(signal);
      await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
      const destinationParent = await lstat(options.layout.generatedRoot);
      const sourceParent = await lstat(join(record.root, ".."));
      if (!destinationParent.isDirectory() || destinationParent.isSymbolicLink() || (destinationParent.mode & 0o700) !== 0o700) throw new Error("projection destination parent is not traversable");
      if (!sourceParent.isDirectory() || sourceParent.isSymbolicLink() || (sourceParent.mode & 0o700) !== 0o700) throw new Error("projection staging parent is not writable");
      await assertProjectionBeforeEffect();
      const publication = await options.platform.renameNoReplace(record.root, target);
      if (publication === "exists") {
        await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
        const existing = await inspectProjection(target, options.sha256);
        if (!projectionMetadataMatches(existing, input, options.sha256)) {
          throw rootError("storeIdentityCollision", "sealProjectionRoot", "concurrent projection publication collides with different content");
        }
        if (await tryCleanup() !== undefined) throw cleanupError(new Error("identical projection lost publication race"));
        return { root: target, scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest, payloadDigest: input.payloadDigest, projectionRef: input.projectionRef };
      }
      published = true;
      await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
      const targetIdentity = await lstat(target);
      if (!targetIdentity.isDirectory() || targetIdentity.isSymbolicLink()) throw new Error("published projection root is not a real directory");
      await assertOwnedDirectory(target, "sealProjectionRoot", { dev: targetIdentity.dev, ino: targetIdentity.ino }, options.layout.rootCapabilities.generatedRoot);
      await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
      await chmod(target, 0o555);
      await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
      await options.platform.syncDirectory(target);
      await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
      await options.platform.syncDirectory(options.layout.generatedRoot);
      await assertLayoutRoot(options.layout, "generatedRoot", "sealProjectionRoot");
      return { root: target, scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest, payloadDigest: input.payloadDigest, projectionRef: input.projectionRef };
    } catch (error) {
      if (!published && await tryCleanup() !== undefined) {
        if (isIncompleteCleanup(error)) throw error;
        throw cleanupError(error);
      }
      if (signal.aborted) throw error;
      if (error instanceof DomainContractError) throw error;
      throw rootError("adapterFailed", "sealProjectionRoot", "projection root publication failed", error);
    }
  }

  async function discardProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    const record = input !== null && typeof input === "object" ? projectionAllocations.get(input) : undefined;
    if (record === undefined || record.allocation.root !== input.root || record.allocation.allocationId !== input.allocationId) {
      throw rootError("stagingAllocationInvalid", "discardProjectionRoot", "projection root allocation capability is invalid");
    }
    await assertProjectionAllocation(record, options.layout, "discardProjectionRoot");
    try {
      await removePreparedTree(record.root, record.identity, options.layout.rootCapabilities.projectionStagingRoot);
      await assertLayoutRoot(options.layout, "projectionStagingRoot", "discardProjectionRoot");
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") return;
      throw rootError("adapterFailed", "discardProjectionRoot", "projection root allocation could not be discarded", cause);
    }
  }

  async function resolveProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ResolvedProjectionRoot> {
    throwIfAborted(signal);
    const scope = ScopeReferenceSchema.parse(input.scope);
    const plugin = PluginKeySchema.parse(input.plugin);
    const projectionDigest = ContentDigestSchema.parse(input.projectionDigest);
    const projectionRef = ProjectionRootRefSchema.parse(input.projectionRef);
    const expectedRef = deriveProjectionRootRef({ scope, plugin, projectionDigest }, options.sha256);
    if (projectionRef !== expectedRef) throw rootError("contentVerificationFailed", "resolveProjectionRoot", "projection reference does not match its identity");
    await assertLayoutRoot(options.layout, "generatedRoot", "resolveProjectionRoot");
    const root = options.layout.projectionPath(projectionRef);
    const metadata = await inspectProjection(root, options.sha256);
    if (!projectionMetadataMatches(metadata, {
      scope,
      plugin,
      projectionDigest,
      payloadDigest: metadata.payloadDigest,
      projectionRef,
    }, options.sha256) || (input.payloadDigest !== undefined && metadata.payloadDigest !== input.payloadDigest)) {
      throw rootError("contentVerificationFailed", "resolveProjectionRoot", "projection root evidence does not match its identity");
    }
    await assertLayoutRoot(options.layout, "generatedRoot", "resolveProjectionRoot");
    return {
      root,
      scope,
      plugin,
      projectionDigest,
      payloadDigest: metadata.payloadDigest,
      projectionRef,
    };
  }

  return Object.freeze({ ensureDataRoot, allocateProjectionRoot, sealProjectionRoot, discardProjectionRoot, resolveProjectionRoot });
}

export async function inspectProjection(root: string, sha256: Sha256): Promise<ProjectionMetadata> {
  try {
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || await realpath(root) !== root) {
      throw new Error("projection root is not a real directory");
    }
    const markerStat = await lstat(join(root, READY));
    const metadataStat = await lstat(join(root, METADATA));
    if (!markerStat.isFile() || markerStat.isSymbolicLink() || !metadataStat.isFile() || metadataStat.isSymbolicLink()) {
      throw new Error("publication controls are not regular files");
    }
    const marker = await readFile(join(root, READY), "utf8");
    if (marker !== READY_TEXT) throw new Error("ready marker content mismatch");
    const metadata = ProjectionMetadataSchema.parse(JSON.parse(await readFile(join(root, METADATA), "utf8")));
    if ((markerStat.mode & 0o777) !== 0o444 || (metadataStat.mode & 0o777) !== 0o444) {
      throw new Error("publication controls are mutable");
    }
    if ((rootStat.mode & 0o777) !== 0o555) {
      throw new Error("projection root is not read-only");
    }
    const payloadDigest = await hashProjectionRoot(root, sha256);
    if (payloadDigest !== metadata.payloadDigest) throw new Error("projection root payload digest does not match metadata");
    const expectedRef = deriveProjectionRootRef({
      scope: metadata.scope,
      plugin: metadata.plugin,
      projectionDigest: metadata.projectionDigest,
    }, sha256);
    if (metadata.projectionRef !== expectedRef) throw new Error("projection metadata identity is not self-bound");
    return metadata;
  } catch (cause) {
    if (cause instanceof DomainContractError) throw cause;
    throw rootError("contentVerificationFailed", "resolveProjectionRoot", "projection marker or metadata verification failed", cause);
  }
}
