import { open as openFile } from "node:fs/promises";
import { chmod, lstat, rename as renamePath } from "node:fs/promises";
import { join } from "node:path";
import { DomainContractError, ErrorCodeRegistry } from "../../domain/errors.js";
import type { ContentManifest } from "../../domain/content-manifest.js";
import type { ContentStoreCapabilities } from "../../application/ports/content-store.js";
import type { ContentStorePlatform } from "../../application/ports/content-store-platform.js";

export type RenameNoReplace = (source: string, destination: string) => Promise<"published" | "exists">;

export type NodeContentStorePlatformOptions = Readonly<{
  /** A platform-specific no-replace primitive. Plain rename is never used as a fallback. */
  renameNoReplace?: RenameNoReplace;
}>;

function unavailable(operation: string, cause?: unknown): DomainContractError {
  return new DomainContractError({
    code: ErrorCodeRegistry.durabilityUnavailable,
    operation,
    message: "immutable content store durability capability is unavailable",
    details: { operation, capability: "atomic-no-replace-directory" },
    ...(cause === undefined ? {} : { cause }),
  });
}

async function syncHandle(path: string, operation: string): Promise<void> {
  let handle;
  try {
    handle = await openFile(path, "r");
    await handle.sync();
  } catch (error) {
    throw unavailable(operation, error);
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function sealEntry(root: string, entry: ContentManifest["entries"][number]): Promise<void> {
  const target = join(root, "content", ...entry.path.split("/"));
  const stat = await lstat(target);
  if (entry.kind === "directory") {
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw unavailable("sealReadOnly");
    await chmod(target, 0o555);
    return;
  }
  if (entry.kind === "file") {
    if (!stat.isFile() || stat.isSymbolicLink()) throw unavailable("sealReadOnly");
    await chmod(target, entry.mode === 0o755 ? 0o555 : 0o444);
    return;
  }
  if (!stat.isSymbolicLink()) throw unavailable("sealReadOnly");
  // chmod on a symlink follows the link on several supported platforms. The
  // link text is immutable by publication and is intentionally left untouched.
}

/**
 * Node's public fs API does not expose renameat2/rename-with-no-replace. The
 * production adapter therefore refuses to claim atomic publication unless a
 * platform-specific implementation is supplied. Sync and mode operations are
 * still implemented here because they have stable Node primitives.
 */
export function createNodeContentStorePlatform(
  options: NodeContentStorePlatformOptions = {},
): ContentStorePlatform {
  const renameNoReplace = options.renameNoReplace;
  return Object.freeze({
    async probe(_root: string): Promise<ContentStoreCapabilities> {
      if (process.platform === "win32" || renameNoReplace === undefined) {
        throw unavailable("probe");
      }
      return {
        atomicNoReplaceDirectory: true,
        fileSync: true,
        directorySync: true,
        readOnlyModeEnforcement: "posix-mode",
      };
    },
    async renameNoReplace(source: string, destination: string): Promise<"published" | "exists"> {
      if (renameNoReplace === undefined) throw unavailable("renameNoReplace");
      return renameNoReplace(source, destination);
    },
    async syncFile(path: string): Promise<void> {
      await syncHandle(path, "syncFile");
    },
    async syncDirectory(path: string): Promise<void> {
      // O_DIRECTORY is advisory on platforms where directory handles are
      // supported; opening and syncing the handle is the durability boundary.
      if (process.platform === "win32") throw unavailable("syncDirectory");
      await syncHandle(path, "syncDirectory");
    },
    async sealReadOnly(root: string, manifest: ContentManifest): Promise<void> {
      for (const entry of [...manifest.entries].sort((left, right) => right.path.split("/").length - left.path.split("/").length)) {
        await sealEntry(root, entry);
      }
      await chmod(join(root, "content"), 0o555);
      await chmod(root, 0o555);
    },
  });
}

/** Internal helper for tests and platform adapters that need a strict no-replace race. */
export async function renameNoReplaceByProbe(source: string, destination: string): Promise<"published" | "exists"> {
  try {
    await lstat(destination);
    return "exists";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  // This helper is intentionally not used by production composition: the
  // check-then-rename sequence is not atomic and would violate the contract.
  await renamePath(source, destination);
  return "published";
}
