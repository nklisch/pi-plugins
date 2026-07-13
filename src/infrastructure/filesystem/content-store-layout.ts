import { lstat, mkdir, chmod, realpath } from "node:fs/promises";
import { isAbsolute, join, parse, resolve } from "node:path";
import {
  contentStoreKeyDigest,
  ContentStoreIdentitySchema,
  type ContentStoreIdentity,
} from "../../domain/content-store.js";
import {
  PluginDataRefSchema,
  ProjectionRootRefSchema,
  type PluginDataRef,
  type ProjectionRootRef,
} from "../../domain/state/references.js";
import { DomainContractError, ErrorCodeRegistry } from "../../domain/errors.js";

const PRIVATE_DIRECTORY_MODE = 0o700;
const STAGING_VERSION = "v1";
const STORE_VERSION = "v1";
const DATA_VERSION = "v1";
const GENERATED_VERSION = "v1";

export type ContentStoreLayout = Readonly<{
  hostRoot: string;
  stagingRoot: string;
  storesRoot: string;
  marketplaceStoreRoot: string;
  pluginStoreRoot: string;
  dataRoot: string;
  generatedRoot: string;
  projectionStagingRoot: string;
  marketplacePath(identity: ContentStoreIdentity): string;
  pluginPath(identity: ContentStoreIdentity): string;
  dataPath(dataRef: PluginDataRef): string;
  projectionPath(projectionRef: ProjectionRootRef): string;
}>;

function layoutError(message: string, cause?: unknown): DomainContractError {
  return new DomainContractError({
    code: ErrorCodeRegistry.stagingAllocationInvalid,
    operation: "bootstrapContentStoreLayout",
    message,
    details: { operation: "bootstrapContentStoreLayout" },
    ...(cause === undefined ? {} : { cause }),
  });
}

function assertAbsoluteHostRoot(hostRoot: string): string {
  if (typeof hostRoot !== "string" || hostRoot.length === 0 || !isAbsolute(hostRoot)) {
    throw layoutError("content store host root must be absolute");
  }
  const resolved = resolve(hostRoot);
  if (resolved !== parse(resolved).root && resolved.endsWith("/")) {
    // `resolve` normally strips the trailing slash. This branch documents that
    // a root is a directory identity, not a path segment supplied by callers.
    return resolved.slice(0, -1);
  }
  return resolved;
}

async function ensurePrivateDirectory(path: string, operation: string): Promise<string> {
  try {
    let stat;
    try {
      stat = await lstat(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(path, { mode: PRIVATE_DIRECTORY_MODE });
      stat = await lstat(path);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("content store path component is not a real directory");
    }
    await chmod(path, PRIVATE_DIRECTORY_MODE);
    const verified = await lstat(path);
    if (!verified.isDirectory() || verified.isSymbolicLink() || (verified.mode & 0o077) !== 0) {
      throw new Error("content store directory is not private");
    }
    return await realpath(path);
  } catch (error) {
    if (error instanceof DomainContractError) throw error;
    throw new DomainContractError({
      code: ErrorCodeRegistry.stagingAllocationInvalid,
      operation,
      message: "content store root is unavailable or not private",
      details: { operation },
      cause: error,
    });
  }
}

/** Create every parent below an adapter-owned absolute root without following symlinks. */
async function bootstrapRoot(hostRoot: string): Promise<string> {
  const absolute = assertAbsoluteHostRoot(hostRoot);
  const parsed = parse(absolute);
  let current = parsed.root;
  const segments = absolute.slice(parsed.root.length).split(/[\\/]+/u).filter(Boolean);
  for (const segment of segments) {
    current = join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw layoutError("content store host root cannot be inspected", error);
      await mkdir(current, { mode: PRIVATE_DIRECTORY_MODE });
      stat = await lstat(current);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw layoutError("content store host root contains a symlink or non-directory");
  }
  return ensurePrivateDirectory(absolute, "bootstrapContentStoreLayout");
}

function digestSegment(value: string, schema: { parse(input: unknown): string }, prefix: string): string {
  const parsed = schema.parse(value);
  if (!parsed.startsWith(prefix)) throw layoutError("logical reference has the wrong kind");
  const digest = parsed.slice(prefix.length);
  if (!/^[0-9a-f]{64}$/u.test(digest)) throw layoutError("logical reference digest is invalid");
  return digest;
}

function storePath(layout: ContentStoreLayout, identity: ContentStoreIdentity): string {
  const value = ContentStoreIdentitySchema.parse(identity);
  const digest = contentStoreKeyDigest(value);
  return join(value.kind === "marketplace" ? layout.marketplaceStoreRoot : layout.pluginStoreRoot, digest);
}

/**
 * Bootstrap and return the path codec. Only validated digest/reference values
 * can become a path segment; source URLs, aliases, plugin names, and project
 * roots never reach this module's joins.
 */
export async function createContentStoreLayout(hostRoot: string): Promise<ContentStoreLayout> {
  const root = await bootstrapRoot(hostRoot);
  const stagingParent = await ensurePrivateDirectory(join(root, "staging"), "bootstrapContentStoreLayout");
  const stagingRoot = await ensurePrivateDirectory(join(stagingParent, STAGING_VERSION), "bootstrapContentStoreLayout");
  const storesParent = await ensurePrivateDirectory(join(root, "stores"), "bootstrapContentStoreLayout");
  const storesRoot = await ensurePrivateDirectory(join(storesParent, STORE_VERSION), "bootstrapContentStoreLayout");
  const marketplaceParent = await ensurePrivateDirectory(join(storesRoot, "marketplaces"), "bootstrapContentStoreLayout");
  const marketplaceStoreRoot = await ensurePrivateDirectory(marketplaceParent, "bootstrapContentStoreLayout");
  const pluginParent = await ensurePrivateDirectory(join(storesRoot, "plugins"), "bootstrapContentStoreLayout");
  const pluginStoreRoot = await ensurePrivateDirectory(pluginParent, "bootstrapContentStoreLayout");
  const dataParent = await ensurePrivateDirectory(join(root, "data"), "bootstrapContentStoreLayout");
  const dataRoot = await ensurePrivateDirectory(join(dataParent, DATA_VERSION), "bootstrapContentStoreLayout");
  const generatedParent = await ensurePrivateDirectory(join(root, "generated"), "bootstrapContentStoreLayout");
  const generatedRoot = await ensurePrivateDirectory(join(generatedParent, GENERATED_VERSION), "bootstrapContentStoreLayout");
  const projectionStagingRoot = await ensurePrivateDirectory(join(generatedRoot, ".staging"), "bootstrapContentStoreLayout");

  const layout: ContentStoreLayout = {
    hostRoot: root,
    stagingRoot,
    storesRoot,
    marketplaceStoreRoot,
    pluginStoreRoot,
    dataRoot,
    generatedRoot,
    projectionStagingRoot,
    marketplacePath(identity) {
      const value = ContentStoreIdentitySchema.parse(identity);
      if (value.kind !== "marketplace") throw layoutError("marketplace path requires a marketplace identity");
      return storePath(layout, value);
    },
    pluginPath(identity) {
      const value = ContentStoreIdentitySchema.parse(identity);
      if (value.kind !== "plugin") throw layoutError("plugin path requires a plugin identity");
      return storePath(layout, value);
    },
    dataPath(dataRef) {
      return join(layout.dataRoot, digestSegment(dataRef, PluginDataRefSchema, "plugin-data-v1:sha256:"));
    },
    projectionPath(projectionRef) {
      return join(layout.generatedRoot, digestSegment(projectionRef, ProjectionRootRefSchema, "runtime-projection-v1:sha256:"));
    },
  };
  return Object.freeze(layout);
}

export function stagingAllocationPath(layout: ContentStoreLayout, allocationId: string): string {
  if (typeof allocationId !== "string" || !/^[0-9a-f]{32}$/u.test(allocationId)) {
    throw layoutError("staging allocation id is invalid");
  }
  return join(layout.stagingRoot, allocationId);
}

export function projectionStagingPath(layout: ContentStoreLayout, allocationId: string): string {
  if (typeof allocationId !== "string" || !/^[0-9a-f]{32}$/u.test(allocationId)) {
    throw layoutError("projection allocation id is invalid");
  }
  return join(layout.projectionStagingRoot, allocationId);
}

export async function assertOwnedDirectory(path: string, operation: string): Promise<{ readonly realpath: string; readonly dev: number; readonly ino: number }> {
  const stat = await lstat(path).catch((cause) => {
    throw new DomainContractError({
      code: ErrorCodeRegistry.stagingAllocationInvalid,
      operation,
      message: "owned directory is unavailable",
      details: { operation },
      cause,
    });
  });
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new DomainContractError({
      code: ErrorCodeRegistry.stagingAllocationInvalid,
      operation,
      message: "owned path is not a real directory",
      details: { operation },
    });
  }
  const canonical = await realpath(path).catch((cause) => {
    throw new DomainContractError({
      code: ErrorCodeRegistry.stagingAllocationInvalid,
      operation,
      message: "owned directory cannot be canonicalized",
      details: { operation },
      cause,
    });
  });
  if (canonical !== path) {
    throw new DomainContractError({
      code: ErrorCodeRegistry.stagingAllocationInvalid,
      operation,
      message: "owned path changed identity",
      details: { operation },
    });
  }
  return { realpath: canonical, dev: stat.dev, ino: stat.ino };
}
