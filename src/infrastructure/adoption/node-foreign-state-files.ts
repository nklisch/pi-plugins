import { open, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ForeignStateFileObservation } from "../../application/adoption-contract.js";
import type { ForeignStateFilesPort } from "../../application/ports/foreign-state-files.js";

export const ForeignStateLocationRegistry = {
  claudeKnownMarketplaces: {
    host: "claude",
    document: "claude-known-marketplaces",
    relativePath: ["plugins", "known_marketplaces.json"],
  },
  claudeUserSettings: {
    host: "claude",
    document: "claude-user-settings",
    relativePath: ["settings.json"],
  },
  codexUserConfig: {
    host: "codex",
    document: "codex-user-config",
    relativePath: ["config.toml"],
  },
} as const;

export type NodeForeignStateFilesOptions = Readonly<{
  userHome: string;
  claudeRoot?: string;
  codexHome?: string;
  maxDocumentBytes?: number;
}>;

const DEFAULT_MAX_DOCUMENT_BYTES = 1024 * 1024;
const READ_CHUNK_BYTES = 64 * 1024;

type ReadOutcome =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "present"; source: string }>
  | Readonly<{ kind: "unreadable"; code: "NOT_REGULAR" | "TOO_LARGE" | "INVALID_UTF8" | "IO_FAILED" }>;

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (typeof signal.throwIfAborted === "function") signal.throwIfAborted();
  const error = new Error("Foreign-state read was aborted");
  error.name = "AbortError";
  throw error;
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error &&
    ((error as { code?: unknown }).code === "ENOENT" || (error as { code?: unknown }).code === "ENOTDIR");
}

function validateOptions(options: NodeForeignStateFilesOptions): Required<Pick<NodeForeignStateFilesOptions, "userHome" | "maxDocumentBytes">> {
  if (typeof options.userHome !== "string" || options.userHome.length === 0) {
    throw new TypeError("userHome must be a non-empty path");
  }
  const maxDocumentBytes = options.maxDocumentBytes ?? DEFAULT_MAX_DOCUMENT_BYTES;
  if (!Number.isSafeInteger(maxDocumentBytes) || maxDocumentBytes <= 0) {
    throw new TypeError("maxDocumentBytes must be a positive safe integer");
  }
  return { userHome: options.userHome, maxDocumentBytes };
}

async function readBounded(
  path: string,
  maxDocumentBytes: number,
  signal: AbortSignal,
): Promise<ReadOutcome> {
  throwIfAborted(signal);
  let metadata: Awaited<ReturnType<typeof stat>>;
  try {
    metadata = await stat(path);
  } catch (error) {
    if (isMissing(error)) return { kind: "missing" };
    return { kind: "unreadable", code: "IO_FAILED" };
  }
  if (!metadata.isFile()) return { kind: "unreadable", code: "NOT_REGULAR" };
  if (metadata.size > maxDocumentBytes) return { kind: "unreadable", code: "TOO_LARGE" };

  let handle: Awaited<ReturnType<typeof open>> | undefined;
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    throwIfAborted(signal);
    handle = await open(path, "r");
    const openedMetadata = await handle.stat();
    if (!openedMetadata.isFile()) return { kind: "unreadable", code: "NOT_REGULAR" };
    if (openedMetadata.size > maxDocumentBytes) return { kind: "unreadable", code: "TOO_LARGE" };

    while (true) {
      throwIfAborted(signal);
      // Read one byte beyond the limit when exactly at the boundary. This
      // catches ordinary file growth without allocating an unbounded buffer.
      const size = Math.min(READ_CHUNK_BYTES, maxDocumentBytes - total + 1);
      const buffer = Buffer.allocUnsafe(size);
      const result = await handle.read(buffer, 0, size, null);
      if (result.bytesRead === 0) break;
      total += result.bytesRead;
      if (total > maxDocumentBytes) return { kind: "unreadable", code: "TOO_LARGE" };
      chunks.push(buffer.subarray(0, result.bytesRead));
    }
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    return { kind: "unreadable", code: "IO_FAILED" };
  } finally {
    if (handle !== undefined) await handle.close().catch(() => undefined);
  }

  try {
    return {
      kind: "present",
      source: new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, total)),
    };
  } catch {
    return { kind: "unreadable", code: "INVALID_UTF8" };
  }
}

function locationPath(
  options: Required<Pick<NodeForeignStateFilesOptions, "userHome">> & Readonly<{ claudeRoot: string; codexHome: string }>,
  location: (typeof ForeignStateLocationRegistry)[keyof typeof ForeignStateLocationRegistry],
): string {
  const root = location.host === "claude" ? options.claudeRoot : options.codexHome;
  return join(root, ...location.relativePath);
}

export function createNodeForeignStateFiles(
  options: NodeForeignStateFilesOptions,
): ForeignStateFilesPort {
  const validated = validateOptions(options);
  const roots = {
    userHome: validated.userHome,
    claudeRoot: options.claudeRoot ?? join(validated.userHome, ".claude"),
    codexHome: options.codexHome ?? process.env.CODEX_HOME ?? join(validated.userHome, ".codex"),
    maxDocumentBytes: validated.maxDocumentBytes,
  };
  for (const root of [roots.claudeRoot, roots.codexHome]) {
    if (typeof root !== "string" || root.length === 0) throw new TypeError("foreign-state roots must be non-empty paths");
  }

  return {
    async readAll(signal: AbortSignal): Promise<readonly ForeignStateFileObservation[]> {
      const observations: ForeignStateFileObservation[] = [];
      for (const location of Object.values(ForeignStateLocationRegistry)) {
        throwIfAborted(signal);
        const path = locationPath(roots, location);
        const result = await readBounded(path, roots.maxDocumentBytes, signal);
        if (result.kind === "present") {
          observations.push({ kind: result.kind, document: location.document, host: location.host, path, source: result.source });
        } else if (result.kind === "missing") {
          observations.push({ kind: result.kind, document: location.document, host: location.host, path });
        } else {
          observations.push({ kind: result.kind, document: location.document, host: location.host, path, code: result.code });
        }
      }
      return observations;
    },
  };
}
