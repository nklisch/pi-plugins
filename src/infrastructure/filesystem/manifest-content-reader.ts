import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";
import { BoundaryError, ErrorCodeRegistry } from "../../domain/errors.js";
import {
  ContentManifestEntrySchema,
  hashContent,
  normalizeContentPath,
  type ContentManifestEntry,
} from "../../domain/content-manifest.js";
import type { Sha256 } from "../../domain/source.js";
import type {
  ContentReadPort,
  ManifestFileRef,
} from "../../application/ports/content-read.js";

const OPERATION = "readManifestContentFile";
const CHUNK_SIZE = 64 * 1024;

function abortIfRequested(signal: AbortSignal): void {
  if (!signal.aborted) return;
  throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function pathBoundary(message: string, cause?: unknown): BoundaryError {
  return new BoundaryError({
    code: ErrorCodeRegistry.pathContainmentFailed,
    operation: OPERATION,
    message,
    details: { operation: OPERATION },
    cause,
  });
}

function adapterBoundary(cause?: unknown): BoundaryError {
  return new BoundaryError({
    code: ErrorCodeRegistry.adapterFailed,
    operation: OPERATION,
    message: "manifest-backed content adapter failed",
    details: { operation: OPERATION },
    cause,
  });
}

function safeLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError("content byte limit must be a positive safe integer");
  return value;
}

function assertRoot(root: string): string {
  if (typeof root !== "string" || root.length === 0 || !isAbsolute(root)) {
    throw pathBoundary("manifest-backed content root must be absolute");
  }
  return resolve(root);
}

function assertFileEntry(entry: ContentManifestEntry): Extract<ContentManifestEntry, { kind: "file" }> {
  const value = ContentManifestEntrySchema.parse(entry);
  if (value.kind !== "file") throw pathBoundary("manifest-backed content reader requires a regular file entry");
  return value;
}

function pathFor(root: string, entry: Extract<ContentManifestEntry, { kind: "file" }>): string {
  let normalized: string;
  try {
    normalized = normalizeContentPath(entry.path);
  } catch (error) {
    throw pathBoundary("manifest-backed content path is unsafe", error);
  }
  const rootPath = resolve(root);
  const candidate = resolve(rootPath, ...normalized.split("/"));
  const prefix = rootPath.endsWith(sep) ? rootPath : `${rootPath}${sep}`;
  if (candidate !== rootPath && !candidate.startsWith(prefix)) {
    throw pathBoundary("manifest-backed content path escapes its root");
  }
  return candidate;
}

async function assertNoSymlink(path: string, label: string): Promise<void> {
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    throw adapterBoundary(error);
  }
  if (stats.isSymbolicLink()) throw pathBoundary(`manifest-backed ${label} is a symlink`);
  if (label === "root" && !stats.isDirectory()) throw pathBoundary("manifest-backed root is not a directory");
}

async function assertPathComponents(root: string, target: string): Promise<void> {
  await assertNoSymlink(root, "root");
  const relative = target.slice(root.length).replace(/^[/\\]+/u, "");
  let current = root;
  for (const segment of relative.split(sep)) {
    if (segment.length === 0) continue;
    current = resolve(current, segment);
    await assertNoSymlink(current, "content path component");
  }
}

function asBoundary(error: unknown, signal: AbortSignal): never {
  if (signal.aborted) throw signal.reason ?? error;
  if (error instanceof BoundaryError) throw error;
  throw adapterBoundary(error);
}

/**
 * Node adapter for the exact content-read port. It deliberately has no list or
 * glob operation: every read is anchored to one previously verified manifest
 * entry, and every path component is lstat'ed before the file is opened.
 */
export function createManifestContentReader(sha256: Sha256): ContentReadPort {
  if (typeof sha256 !== "function") throw new TypeError("manifest content reader requires a SHA-256 function");

  return {
    async readFile(file: ManifestFileRef, limitBytes: number, signal: AbortSignal): Promise<Uint8Array> {
      abortIfRequested(signal);
      const limit = safeLimit(limitBytes);
      const entry = assertFileEntry(file.entry);
      if (entry.size > limit) throw adapterBoundary(new Error("manifest file exceeds configured byte limit"));
      let root: string;
      let target: string;
      try {
        root = assertRoot(file.root);
        target = pathFor(root, entry);
        await assertPathComponents(root, target);
      } catch (error) {
        return asBoundary(error, signal);
      }

      let handle;
      try {
        // O_NOFOLLOW closes the final-component race between lstat and open.
        handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
        abortIfRequested(signal);
        const stats = await handle.stat();
        if (!stats.isFile()) throw pathBoundary("manifest-backed target is not a regular file");
        if (stats.size !== entry.size) throw adapterBoundary(new Error("manifest file size does not match"));
        if (stats.size > limit) throw adapterBoundary(new Error("manifest file exceeds configured byte limit"));

        const bytes = new Uint8Array(entry.size);
        let offset = 0;
        while (offset < bytes.byteLength) {
          abortIfRequested(signal);
          const length = Math.min(CHUNK_SIZE, bytes.byteLength - offset);
          const result = await handle.read(bytes, offset, length, offset);
          if (result.bytesRead <= 0) throw adapterBoundary(new Error("manifest file ended before its declared size"));
          offset += result.bytesRead;
        }
        abortIfRequested(signal);
        if (hashContent(bytes, sha256) !== entry.digest) {
          throw adapterBoundary(new Error("manifest file digest does not match"));
        }
        return bytes;
      } catch (error) {
        return asBoundary(error, signal);
      } finally {
        if (handle !== undefined) {
          try {
            await handle.close();
          } catch (error) {
            if (!signal.aborted) throw adapterBoundary(error);
          }
        }
      }
    },
  };
}