import { randomBytes as nodeRandomBytes } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  readlink,
  rename,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  ContentStoreIdentitySchema,
  createMarketplaceStoreIdentity,
  createPluginStoreIdentity,
  type ContentStoreIdentity,
} from "../../domain/content-store.js";
import {
  ContentDigestSchema,
  verifyContentManifest,
  type ContentDigest,
  type ContentManifest,
} from "../../domain/content-manifest.js";
import {
  assertVerifiedPromotionPlan,
  type VerifiedPromotionPlan,
} from "../../application/content-promotion.js";
import type { ContentStoreCapabilities } from "../../application/ports/content-store.js";
import type { ContentStorePlatform } from "../../application/ports/content-store-platform.js";
import { DomainContractError, ErrorCodeRegistry } from "../../domain/errors.js";
import type { Sha256 } from "../../domain/source.js";
import { verifyMaterializedContent } from "./secure-content-writer.js";
import type { StagingAllocator } from "./staging-allocator.js";
import {
  assertLayoutRoot,
  assertOwnedDirectory,
  type ContentStoreLayout,
} from "./content-store-layout.js";
import { removePreparedTree, type PreparedTreeIdentity } from "./prepared-tree-cleanup.js";

const READY_TEXT = "content-store-ready-v1\n";
const READY_TMP = "READY.tmp";
const READY = "READY";
const METADATA = "metadata.json";

const PublishedMetadataSchema = z.object({
  version: z.literal(1),
  identity: ContentStoreIdentitySchema,
  manifest: z.unknown(),
  binding: ContentDigestSchema,
}).strict().readonly();
type PublishedMetadata = z.infer<typeof PublishedMetadataSchema>;

export type PublishedRevision = Readonly<{
  root: string;
  identity: ContentStoreIdentity;
  manifest: ContentManifest;
  binding: ContentDigest;
}>;

export type ImmutableContentStore = Readonly<{
  capabilities(signal: AbortSignal): Promise<ContentStoreCapabilities>;
  promote(plan: VerifiedPromotionPlan, signal: AbortSignal): Promise<{
    kind: "promoted" | "already-present";
    identity: ContentStoreIdentity;
    root: string;
    manifest: ContentManifest;
  }>;
}>;

export type ImmutableContentStoreOptions = Readonly<{
  layout: ContentStoreLayout;
  allocator: StagingAllocator & { assertOwned(allocation: unknown, operation?: string): Promise<{ readonly root: string; readonly dev: number; readonly ino: number }> };
  platform: ContentStorePlatform;
  sha256: Sha256;
  randomBytes?: (size: number) => Uint8Array | Promise<Uint8Array>;
}>;

function storeError(
  code: "contentVerificationFailed" | "storeIdentityCollision" | "durabilityUnavailable" | "adapterFailed",
  operation: string,
  message: string,
  cause?: unknown,
  cleanup?: "incomplete",
): DomainContractError {
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

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function expectedContentRoot(slotRoot: string): string {
  return join(slotRoot, "content");
}

async function assertExactContentRoot(root: string): Promise<void> {
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("content root is not a real directory");
  if (await realpath(root) !== root) throw new Error("content root resolves through a symlink");
}

function preparedId(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 16) throw new Error("prepared-id source must return 16 bytes");
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type BeforeEffect = () => Promise<void>;

async function writeSyncedFile(
  path: string,
  contents: string,
  platform: ContentStorePlatform,
  beforeEffect?: BeforeEffect,
): Promise<void> {
  await beforeEffect?.();
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
    await beforeEffect?.();
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } finally {
    await handle?.close().catch(() => undefined);
  }
  await beforeEffect?.();
  await platform.syncFile(path);
}

async function copyManifestTree(
  sourceRoot: string,
  destinationRoot: string,
  manifest: ContentManifest,
  beforeSourceRead?: BeforeEffect,
  beforeDestinationEffect?: BeforeEffect,
): Promise<void> {
  await beforeDestinationEffect?.();
  await mkdir(destinationRoot, { mode: 0o755 });
  const entries = [...manifest.entries].sort((left, right) => {
    const leftDepth = left.path.split("/").length;
    const rightDepth = right.path.split("/").length;
    if (leftDepth !== rightDepth) return leftDepth - rightDepth;
    return left.path.localeCompare(right.path);
  });
  for (const entry of entries) {
    const source = join(sourceRoot, ...entry.path.split("/"));
    const destination = join(destinationRoot, ...entry.path.split("/"));
    if (entry.kind === "directory") {
      await beforeDestinationEffect?.();
      await mkdir(destination, { mode: 0o755 });
      continue;
    }
    if (entry.kind === "file") {
      await beforeSourceRead?.();
      const stat = await lstat(source);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("source entry changed type");
      await beforeSourceRead?.();
      const bytes = await readFile(source);
      await beforeDestinationEffect?.();
      await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
      await beforeDestinationEffect?.();
      await chmod(destination, entry.mode);
      continue;
    }
    await beforeSourceRead?.();
    const target = await readlink(source);
    if (target !== entry.target) throw new Error("source link changed target");
    await beforeDestinationEffect?.();
    await symlink(target, destination);
  }
}

async function syncManifestTree(
  root: string,
  manifest: ContentManifest,
  platform: ContentStorePlatform,
  beforeEffect?: BeforeEffect,
): Promise<void> {
  const entries = [...manifest.entries].sort((left, right) => {
    const leftDepth = left.path.split("/").length;
    const rightDepth = right.path.split("/").length;
    return rightDepth - leftDepth || right.path.localeCompare(left.path);
  });
  for (const entry of entries) {
    const path = join(root, "content", ...entry.path.split("/"));
    await beforeEffect?.();
    if (entry.kind !== "directory") await platform.syncFile(path);
    else await platform.syncDirectory(path);
  }
  await beforeEffect?.();
  await platform.syncDirectory(join(root, "content"));
}

async function verifySealedModes(root: string, manifest: ContentManifest): Promise<void> {
  const contentRoot = join(root, "content");
  for (const entry of manifest.entries) {
    const path = join(contentRoot, ...entry.path.split("/"));
    const stat = await lstat(path);
    if (entry.kind === "directory") {
      if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o555) throw new Error("published directory mode is mutable");
    } else if (entry.kind === "file") {
      const expected = entry.mode === 0o755 ? 0o555 : 0o444;
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o777) !== expected) throw new Error("published file mode is mutable");
    } else if (!stat.isSymbolicLink()) {
      throw new Error("published link changed type");
    }
  }
  const rootStat = await lstat(contentRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || (rootStat.mode & 0o777) !== 0o555) throw new Error("published content root mode is mutable");
  const metadataStat = await lstat(join(root, METADATA));
  const readyStat = await lstat(join(root, READY));
  if (!metadataStat.isFile() || (metadataStat.mode & 0o777) !== 0o444 || !readyStat.isFile() || (readyStat.mode & 0o777) !== 0o444) {
    throw new Error("published metadata is mutable");
  }
  const revisionStat = await lstat(root);
  if (!revisionStat.isDirectory() || revisionStat.isSymbolicLink() || (revisionStat.mode & 0o777) !== 0o555) throw new Error("published revision root mode is mutable");
}

async function readMetadataWithHash(root: string, sha256: Sha256): Promise<Readonly<{ metadata: PublishedMetadata; manifest: ContentManifest }>> {
  let markerStat;
  let metadataStat;
  try {
    markerStat = await lstat(join(root, READY));
    metadataStat = await lstat(join(root, METADATA));
  } catch (cause) {
    throw storeError("contentVerificationFailed", "resolveContent", "published revision marker or metadata is unavailable", cause);
  }
  if (!markerStat.isFile() || markerStat.isSymbolicLink() || !metadataStat.isFile() || metadataStat.isSymbolicLink()) {
    throw storeError("contentVerificationFailed", "resolveContent", "published revision marker or metadata is invalid");
  }
  let marker: string;
  let metadata: PublishedMetadata;
  try {
    marker = await readFile(join(root, READY), "utf8");
    if (marker !== READY_TEXT) throw new Error("marker content mismatch");
    metadata = PublishedMetadataSchema.parse(JSON.parse(await readFile(join(root, METADATA), "utf8")));
  } catch (cause) {
    throw storeError("contentVerificationFailed", "resolveContent", "published revision marker or metadata is invalid", cause);
  }
  let manifest: ContentManifest;
  try {
    manifest = verifyContentManifest(metadata.manifest, sha256);
  } catch (cause) {
    throw storeError("contentVerificationFailed", "resolveContent", "published revision metadata manifest is invalid", cause);
  }
  if (metadata.binding !== metadata.identity.binding) {
    throw storeError("contentVerificationFailed", "resolveContent", "published revision metadata binding is invalid");
  }
  return { metadata, manifest };
}

export async function inspectPublishedRevision(root: string, sha256: Sha256): Promise<PublishedRevision> {
  const stat = await lstat(root).catch((cause) => { throw storeError("contentVerificationFailed", "resolveContent", "published revision is unavailable", cause); });
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root) throw storeError("contentVerificationFailed", "resolveContent", "published revision is not a real directory");
  const { metadata, manifest } = await readMetadataWithHash(root, sha256);
  const actual = await verifyMaterializedContent(join(root, "content"), manifest).catch((cause) => {
    throw storeError("contentVerificationFailed", "resolveContent", "published revision content verification failed", cause);
  });
  if (!sameJson(actual, manifest)) throw storeError("contentVerificationFailed", "resolveContent", "published revision content does not match metadata");
  await verifySealedModes(root, manifest).catch((cause) => {
    throw storeError("contentVerificationFailed", "resolveContent", "published revision is not read-only", cause);
  });
  return { root, identity: metadata.identity, manifest: actual, binding: metadata.binding };
}

export function createImmutableContentStore(options: ImmutableContentStoreOptions): ImmutableContentStore {
  let capabilityPromise: Promise<ContentStoreCapabilities> | undefined;
  const loadCapabilities = (): Promise<ContentStoreCapabilities> => {
    capabilityPromise ??= options.platform.probe(options.layout.hostRoot).then((capabilities) => {
    if (!capabilities.atomicNoReplaceDirectory || !capabilities.fileSync || !capabilities.directorySync || capabilities.readOnlyModeEnforcement !== "posix-mode") {
      throw storeError("durabilityUnavailable", "probeContentStore", "required immutable-store capabilities are unavailable");
    }
      return capabilities;
    });
    return capabilityPromise;
  };
  const randomBytes = options.randomBytes ?? ((size: number) => new Uint8Array(nodeRandomBytes(size)));

  async function capabilities(signal: AbortSignal): Promise<ContentStoreCapabilities> {
    throwIfAborted(signal);
    await assertLayoutRoot(options.layout, "hostRoot", "probeContentStore");
    return loadCapabilities();
  }

  async function inspectTarget(target: string, plan: VerifiedPromotionPlan, root: keyof ContentStoreLayout["rootCapabilities"]): Promise<"absent" | "ready-match" | "collision"> {
    await assertLayoutRoot(options.layout, root, "promoteContent");
    let stat;
    try {
      stat = await lstat(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "absent";
      throw storeError("adapterFailed", "promoteContent", "content store target could not be inspected", error);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) return "collision";
    try {
      await assertLayoutRoot(options.layout, root, "promoteContent");
      const inspected = await inspectPublishedRevision(target, options.sha256);
      if (!sameJson(inspected.identity, plan.identity) || inspected.binding !== plan.binding || !sameJson(inspected.manifest, plan.manifest)) return "collision";
      return "ready-match";
    } catch {
      // A target without a valid marker is inert but cannot be replaced under
      // the requested identity. Recovery/GC owns abandoned-target decisions.
      return "collision";
    }
  }

  async function promote(planInput: VerifiedPromotionPlan, signal: AbortSignal) {
    const plan = assertVerifiedPromotionPlan(planInput, options.sha256);
    await capabilities(signal);
    const record = await options.allocator.assertOwned(plan.allocation, "promoteContent");
    await assertLayoutRoot(options.layout, "stagingRoot", "promoteContent");
    await assertOwnedDirectory(record.root, "promoteContent", { dev: record.dev, ino: record.ino }, options.layout.rootCapabilities.stagingRoot);
    const contentRoot = expectedContentRoot(record.root);
    if (resolve(plan.root) !== resolve(contentRoot) || plan.root !== contentRoot) {
      throw storeError("contentVerificationFailed", "promoteContent", "materialized content root is not the owned staging root");
    }
    await assertLayoutRoot(options.layout, "stagingRoot", "promoteContent");
    const slotEntries = await readdir(record.root).catch((cause) => { throw storeError("contentVerificationFailed", "promoteContent", "staging allocation cannot be inspected", cause); });
    await assertOwnedDirectory(record.root, "promoteContent", { dev: record.dev, ino: record.ino }, options.layout.rootCapabilities.stagingRoot);
    if (slotEntries.length !== 1 || slotEntries[0] !== "content") {
      throw storeError("contentVerificationFailed", "promoteContent", "staging allocation contains unexpected entries");
    }
    throwIfAborted(signal);
    await assertLayoutRoot(options.layout, "stagingRoot", "promoteContent");
    await assertExactContentRoot(contentRoot).catch((cause) => {
      throw storeError("contentVerificationFailed", "promoteContent", "materialized content root is not a private real directory", cause);
    });
    await assertLayoutRoot(options.layout, "stagingRoot", "promoteContent");
    const sourceManifest = await verifyMaterializedContent(contentRoot, plan.manifest).catch((cause) => {
      throw storeError("contentVerificationFailed", "promoteContent", "materialized content failed the promotion rewalk", cause);
    });
    await assertOwnedDirectory(record.root, "promoteContent", { dev: record.dev, ino: record.ino }, options.layout.rootCapabilities.stagingRoot);
    if (!sameJson(sourceManifest, plan.manifest)) throw storeError("contentVerificationFailed", "promoteContent", "materialized content differs from its handoff manifest");
    const recomputedIdentity = plan.kind === "marketplace"
      ? createMarketplaceStoreIdentity(plan.source as import("../../domain/source.js").ResolvedMarketplaceSource, sourceManifest, plan.binding, options.sha256)
      : createPluginStoreIdentity(plan.source as import("../../domain/source.js").ResolvedPluginSource, sourceManifest, plan.binding, options.sha256);
    if (!sameJson(recomputedIdentity, plan.identity)) throw storeError("contentVerificationFailed", "promoteContent", "materialized source identity changed before publication");

    const targetRoot = plan.identity.kind === "marketplace" ? "marketplaceStoreRoot" : "pluginStoreRoot";
    const target = plan.identity.kind === "marketplace"
      ? options.layout.marketplacePath(plan.identity)
      : options.layout.pluginPath(plan.identity);
    const storeRoot = plan.identity.kind === "marketplace"
      ? options.layout.marketplaceStoreRoot
      : options.layout.pluginStoreRoot;
    const assertSourceBeforeEffect: BeforeEffect = async () => {
      await assertLayoutRoot(options.layout, "stagingRoot", "promoteContent");
      await assertOwnedDirectory(record.root, "promoteContent", { dev: record.dev, ino: record.ino }, options.layout.rootCapabilities.stagingRoot);
    };
    const initialTarget = await inspectTarget(target, plan, targetRoot);
    if (initialTarget === "ready-match") {
      await options.allocator.discardStaging(plan.allocation, signal);
      return { kind: "already-present" as const, identity: plan.identity, root: join(target, "content"), manifest: plan.manifest };
    }
    if (initialTarget === "collision") throw storeError("storeIdentityCollision", "promoteContent", "content store identity is already occupied by different content");

    const prepared = join(storeRoot, `.pending-${preparedId(await randomBytes(16))}`);
    await assertLayoutRoot(options.layout, targetRoot, "promoteContent");
    let published = false;
    let preparedCreated = false;
    let preparedIdentity: PreparedTreeIdentity | undefined;
    const assertStoreBeforeEffect: BeforeEffect = async () => {
      await assertLayoutRoot(options.layout, targetRoot, "promoteContent");
    };
    const assertPreparedBeforeEffect: BeforeEffect = async () => {
      await assertStoreBeforeEffect();
      if (preparedIdentity === undefined) throw new Error("prepared revision identity is unavailable");
      await assertOwnedDirectory(prepared, "promoteContent", preparedIdentity, options.layout.rootCapabilities[targetRoot]);
    };
    let cleanupAttempted = false;
    let cleanupFailure: unknown;
    const tryCleanupPrepared = async (): Promise<unknown> => {
      if (cleanupAttempted || !preparedCreated) return cleanupFailure;
      cleanupAttempted = true;
      if (preparedIdentity === undefined) {
        cleanupFailure = new Error("prepared cleanup identity is unavailable");
        return cleanupFailure;
      }
      try {
        await removePreparedTree(prepared, preparedIdentity, options.layout.rootCapabilities[targetRoot]);
      } catch (cause) {
        cleanupFailure = cause;
      }
      return cleanupFailure;
    };
    const cleanupError = (primary: unknown): DomainContractError => storeError(
      "adapterFailed",
      "promoteContent",
      "immutable content promotion failed and prepared content cleanup was incomplete",
      new AggregateError([primary, cleanupFailure], "promotion cleanup failed"),
      "incomplete",
    );
    try {
      await assertStoreBeforeEffect();
      await mkdir(prepared, { mode: 0o700 });
      preparedCreated = true;
      await assertStoreBeforeEffect();
      const preparedStat = await lstat(prepared);
      if (!preparedStat.isDirectory() || preparedStat.isSymbolicLink()) throw new Error("prepared revision is not a real directory");
      preparedIdentity = { dev: preparedStat.dev, ino: preparedStat.ino };
      await assertPreparedBeforeEffect();
      await copyManifestTree(contentRoot, join(prepared, "content"), plan.manifest, assertSourceBeforeEffect, assertPreparedBeforeEffect);
      // Rewalk the source after copying: a handoff mutation during the copy is
      // rejected instead of being smuggled into a sealed revision.
      await assertSourceBeforeEffect();
      const afterCopy = await verifyMaterializedContent(contentRoot, plan.manifest).catch((cause) => {
        throw storeError("contentVerificationFailed", "promoteContent", "materialized content changed during promotion", cause);
      });
      if (!sameJson(afterCopy, plan.manifest)) throw storeError("contentVerificationFailed", "promoteContent", "materialized content changed during promotion");
      await assertPreparedBeforeEffect();
      const preparedManifest = await verifyMaterializedContent(join(prepared, "content"), plan.manifest).catch((cause) => {
        throw storeError("contentVerificationFailed", "promoteContent", "prepared content failed verification", cause);
      });
      if (!sameJson(preparedManifest, plan.manifest)) throw storeError("contentVerificationFailed", "promoteContent", "prepared content differs from the handoff");
      const metadata = JSON.stringify({ version: 1, identity: plan.identity, manifest: plan.manifest, binding: plan.binding });
      await writeSyncedFile(join(prepared, METADATA), metadata, options.platform, assertPreparedBeforeEffect);
      await assertPreparedBeforeEffect();
      await chmod(join(prepared, METADATA), 0o444);
      await assertPreparedBeforeEffect();
      await options.platform.syncFile(join(prepared, METADATA));
      await writeSyncedFile(join(prepared, READY_TMP), READY_TEXT, options.platform, assertPreparedBeforeEffect);
      await assertPreparedBeforeEffect();
      await rename(join(prepared, READY_TMP), join(prepared, READY));
      await assertPreparedBeforeEffect();
      await chmod(join(prepared, READY), 0o444);
      await syncManifestTree(prepared, plan.manifest, options.platform, assertPreparedBeforeEffect);
      await assertPreparedBeforeEffect();
      await options.platform.syncFile(join(prepared, METADATA));
      await assertPreparedBeforeEffect();
      await options.platform.syncFile(join(prepared, READY));
      await assertPreparedBeforeEffect();
      await options.platform.sealReadOnly(prepared, plan.manifest);
      await assertPreparedBeforeEffect();
      await syncManifestTree(prepared, plan.manifest, options.platform, assertPreparedBeforeEffect);
      await assertPreparedBeforeEffect();
      await options.platform.syncFile(join(prepared, METADATA));
      await assertPreparedBeforeEffect();
      await options.platform.syncFile(join(prepared, READY));
      await assertPreparedBeforeEffect();
      const sealed = await verifyMaterializedContent(join(prepared, "content"), plan.manifest).catch((cause) => {
        throw storeError("contentVerificationFailed", "promoteContent", "sealed content failed verification", cause);
      });
      if (!sameJson(sealed, plan.manifest)) throw storeError("contentVerificationFailed", "promoteContent", "sealed content differs from the handoff");
      await assertPreparedBeforeEffect();
      await verifySealedModes(prepared, plan.manifest);
      await assertPreparedBeforeEffect();
      await options.platform.syncDirectory(prepared);
      throwIfAborted(signal);
      await assertPreparedBeforeEffect();
      await assertStoreBeforeEffect();
      const publication = await options.platform.renameNoReplace(prepared, target);
      if (publication === "exists") {
        const winner = await inspectTarget(target, plan, targetRoot);
        if (winner !== "ready-match") throw storeError("storeIdentityCollision", "promoteContent", "concurrent content store publication collides with different content");
        if (await tryCleanupPrepared() !== undefined) throw cleanupError(new Error("identical promotion lost publication race"));
        await options.allocator.discardStaging(plan.allocation, new AbortController().signal);
        await assertStoreBeforeEffect();
        return { kind: "already-present" as const, identity: plan.identity, root: join(target, "content"), manifest: plan.manifest };
      }
      published = true;
      await assertStoreBeforeEffect();
      await options.platform.syncDirectory(storeRoot).catch((cause) => {
        throw storeError("durabilityUnavailable", "promoteContent", "published content could not be made durable", cause);
      });
      await assertStoreBeforeEffect();
      await assertSourceBeforeEffect();
      await options.allocator.discardStaging(plan.allocation, new AbortController().signal);
      await assertStoreBeforeEffect();
      return { kind: "promoted" as const, identity: plan.identity, root: join(target, "content"), manifest: plan.manifest };
    } catch (error) {
      if (!published && await tryCleanupPrepared() !== undefined) {
        if (isIncompleteCleanup(error)) throw error;
        throw cleanupError(error);
      }
      if (signal.aborted) throw error;
      if (error instanceof DomainContractError) throw error;
      throw storeError("adapterFailed", "promoteContent", "immutable content promotion failed", error);
    }
  }

  return Object.freeze({ capabilities, promote });
}

// Keep the metadata schema available to neighboring adapters without making it
// part of the package's public API.
export { PublishedMetadataSchema };
