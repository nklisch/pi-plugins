import { randomBytes as nodeRandomBytes } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
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
import type { ContentStoreLayout } from "./content-store-layout.js";
import { projectionStagingPath } from "./content-store-layout.js";

const READY_TEXT = "content-store-ready-v1\n";
const READY = "READY";
const READY_TMP = "READY.tmp";
const METADATA = "metadata.json";

const ProjectionMetadataSchema = z.object({
  version: z.literal(1),
  projectionRef: ProjectionRootRefSchema,
  projectionDigest: ContentDigestSchema,
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
}).strict().readonly();

type ProjectionMetadata = z.infer<typeof ProjectionMetadataSchema>;
type ProjectionEntry = Readonly<{ kind: "directory" | "file" | "symlink"; path: string; mode: number; size?: number; digest?: ContentDigest; target?: string }>;

type ProjectionRecord = Readonly<{
  allocation: ProjectionRootAllocation;
  root: string;
}>;

export type RuntimeRootStore = Readonly<{
  ensureDataRoot(input: StableDataRootRequest, signal: AbortSignal): Promise<WritableDataRoot>;
  allocateProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ProjectionRootAllocation>;
  sealProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<ResolvedProjectionRoot>;
}>;

export type RuntimeRootStoreOptions = Readonly<{
  layout: ContentStoreLayout;
  platform: ContentStorePlatform;
  sha256: Sha256;
  randomBytes?: (size: number) => Uint8Array | Promise<Uint8Array>;
}>;

function rootError(code: "stagingAllocationInvalid" | "contentVerificationFailed" | "storeIdentityCollision" | "durabilityUnavailable" | "adapterFailed", operation: string, message: string, cause?: unknown): DomainContractError {
  return new DomainContractError({
    code: ErrorCodeRegistry[code],
    operation,
    message,
    details: { operation },
    ...(cause === undefined ? {} : { cause }),
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function idFromBytes(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 16) throw new Error("projection allocation id source must return 16 bytes");
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function projectionEntriesWithHash(root: string, sha256: Sha256, prefix = ""): Promise<ProjectionEntry[]> {
  const children = (await readdir(root, { withFileTypes: true })).sort((left, right) => comparePath(left.name, right.name));
  const entries: ProjectionEntry[] = [];
  for (const child of children) {
    if (child.name === READY || child.name === READY_TMP || child.name === METADATA) continue;
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
      const target = await readlink(absolute);
      entries.push({ kind: "symlink", path, mode: 0o777, target, digest: hashContent(new TextEncoder().encode(target.normalize("NFC")), sha256) });
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

async function sealProjectionTree(root: string, sha256: Sha256, platform: ContentStorePlatform): Promise<void> {
  const entries = await projectionEntriesWithHash(root, sha256);
  for (const entry of [...entries].sort((left, right) => right.path.split("/").length - left.path.split("/").length)) {
    const path = join(root, ...entry.path.split("/"));
    if (entry.kind === "directory") {
      await chmod(path, 0o555);
      await platform.syncDirectory(path);
    } else if (entry.kind === "file") {
      await chmod(path, entry.mode === 0o755 ? 0o555 : 0o444);
      await platform.syncFile(path);
    }
  }
  // Keep the staging directory writable until publication. It is invisible
  // under `.staging`; sealing the root itself after the atomic rename avoids
  // platform-specific rename permission differences for directory sources.
  await chmod(root, 0o700);
  await platform.syncDirectory(root);
}

async function makeWritable(root: string): Promise<void> {
  const stat = await lstat(root).catch(() => undefined);
  if (stat === undefined) return;
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    await chmod(root, 0o700);
    for (const child of await readdir(root)) await makeWritable(join(root, child));
  } else if (!stat.isSymbolicLink()) {
    await chmod(root, 0o600);
  }
}

export function createRuntimeRootStore(options: RuntimeRootStoreOptions): RuntimeRootStore {
  const projectionAllocations = new WeakMap<object, ProjectionRecord>();
  const randomBytes = options.randomBytes ?? ((size: number) => new Uint8Array(nodeRandomBytes(size)));
  let capabilitiesPromise: Promise<ContentStoreCapabilities> | undefined;
  const capabilities = (): Promise<ContentStoreCapabilities> => {
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
    try {
      await mkdir(root, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw rootError("adapterFailed", "ensureDataRoot", "persistent data root could not be created", error);
    }
    const stat = await lstat(root).catch((cause) => { throw rootError("contentVerificationFailed", "ensureDataRoot", "persistent data root is unavailable", cause); });
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw rootError("contentVerificationFailed", "ensureDataRoot", "persistent data root is not a private directory");
    await chmod(root, 0o700);
    return Object.freeze({ root, scope, plugin, dataRef });
  }

  async function allocateProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ProjectionRootAllocation> {
    throwIfAborted(signal);
    const scope = ScopeReferenceSchema.parse(input.scope);
    const plugin = PluginKeySchema.parse(input.plugin);
    const projectionDigest = ContentDigestSchema.parse(input.projectionDigest);
    const projectionRef = ProjectionRootRefSchema.parse(input.projectionRef);
    const expected = deriveProjectionRootRef({ scope, plugin, projectionDigest }, options.sha256);
    if (projectionRef !== expected) throw rootError("contentVerificationFailed", "allocateProjectionRoot", "projection reference does not match its identity");
    for (let attempt = 0; attempt < 32; attempt += 1) {
      throwIfAborted(signal);
      const id = idFromBytes(await randomBytes(16));
      const root = projectionStagingPath(options.layout, id);
      try {
        await mkdir(root, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw rootError("adapterFailed", "allocateProjectionRoot", "projection root allocation failed", error);
      }
      const allocation = Object.freeze({ root, scope, plugin, projectionDigest, projectionRef, allocationId: id });
      projectionAllocations.set(allocation, { allocation, root });
      return allocation;
    }
    throw rootError("adapterFailed", "allocateProjectionRoot", "projection allocation collision limit exceeded");
  }

  async function sealProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<ResolvedProjectionRoot> {
    throwIfAborted(signal);
    const record = input !== null && typeof input === "object" ? projectionAllocations.get(input) : undefined;
    if (record === undefined || record.allocation.root !== input.root || record.allocation.allocationId !== input.allocationId) {
      throw rootError("stagingAllocationInvalid", "sealProjectionRoot", "projection root allocation capability is invalid");
    }
    await capabilities();
    const expected = deriveProjectionRootRef({ scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest }, options.sha256);
    if (expected !== input.projectionRef) throw rootError("contentVerificationFailed", "sealProjectionRoot", "projection root identity changed");
    const digest = await hashProjectionRoot(record.root, options.sha256).catch((cause) => { throw rootError("contentVerificationFailed", "sealProjectionRoot", "projection payload could not be verified", cause); });
    if (digest !== input.projectionDigest) throw rootError("contentVerificationFailed", "sealProjectionRoot", "projection payload digest does not match its reference");
    const target = options.layout.projectionPath(input.projectionRef);
    let targetStat;
    try { targetStat = await lstat(target); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw rootError("adapterFailed", "sealProjectionRoot", "projection target could not be inspected", error);
    }
    if (targetStat !== undefined) {
      const existing = await inspectProjection(target, options.sha256);
      if (existing.projectionRef === input.projectionRef && existing.projectionDigest === input.projectionDigest) {
        await makeWritable(record.root);
        await rm(record.root, { recursive: true, force: true });
        return { root: join(target), scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest, projectionRef: input.projectionRef };
      }
      throw rootError("storeIdentityCollision", "sealProjectionRoot", "projection identity is already occupied by different content");
    }
    try {
      const metadata: ProjectionMetadata = { version: 1, projectionRef: input.projectionRef, projectionDigest: input.projectionDigest, scope: input.scope, plugin: input.plugin };
      await writeFile(join(record.root, METADATA), JSON.stringify(metadata), { flag: "wx", mode: 0o600 });
      await writeFile(join(record.root, READY_TMP), READY_TEXT, { flag: "wx", mode: 0o600 });
      await rename(join(record.root, READY_TMP), join(record.root, READY));
      await chmod(join(record.root, METADATA), 0o444);
      await chmod(join(record.root, READY), 0o444);
      for (const entry of await projectionEntriesWithHash(record.root, options.sha256)) {
        const path = join(record.root, ...entry.path.split("/"));
        if (entry.kind === "file") await options.platform.syncFile(path);
      }
      await options.platform.syncFile(join(record.root, METADATA));
      await options.platform.syncFile(join(record.root, READY));
      await sealProjectionTree(record.root, options.sha256, options.platform);
      throwIfAborted(signal);
      const destinationParent = await lstat(options.layout.generatedRoot);
      const sourceParent = await lstat(join(record.root, ".."));
      if (!destinationParent.isDirectory() || (destinationParent.mode & 0o700) !== 0o700) throw new Error("projection destination parent is not traversable");
      if (!sourceParent.isDirectory() || (sourceParent.mode & 0o700) !== 0o700) throw new Error("projection staging parent is not writable");
      const publication = await options.platform.renameNoReplace(record.root, target);
      if (publication === "exists") {
        const existing = await inspectProjection(target, options.sha256);
        if (existing.projectionRef !== input.projectionRef || existing.projectionDigest !== input.projectionDigest) throw rootError("storeIdentityCollision", "sealProjectionRoot", "concurrent projection publication collides with different content");
        return { root: target, scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest, projectionRef: input.projectionRef };
      }
      await chmod(target, 0o555);
      await options.platform.syncDirectory(target);
      await options.platform.syncDirectory(options.layout.generatedRoot);
      return { root: target, scope: input.scope, plugin: input.plugin, projectionDigest: input.projectionDigest, projectionRef: input.projectionRef };
    } catch (error) {
      if (error instanceof DomainContractError) throw error;
      throw rootError("adapterFailed", "sealProjectionRoot", "projection root publication failed", error);
    }
  }

  return Object.freeze({ ensureDataRoot, allocateProjectionRoot, sealProjectionRoot });
}

export async function inspectProjection(root: string, sha256: Sha256): Promise<ProjectionMetadata> {
  const marker = await readFile(join(root, READY), "utf8").catch(() => undefined);
  if (marker !== READY_TEXT) throw rootError("contentVerificationFailed", "resolveProjectionRoot", "projection root is not ready");
  const metadata = ProjectionMetadataSchema.parse(JSON.parse(await readFile(join(root, METADATA), "utf8")));
  const digest = await hashProjectionRoot(root, sha256);
  if (digest !== metadata.projectionDigest) throw rootError("contentVerificationFailed", "resolveProjectionRoot", "projection root digest does not match metadata");
  return metadata;
}
