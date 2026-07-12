import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PluginSourceSchema,
  createResolvedPluginSource,
  type PluginSource,
  type ResolvedPluginSource,
  type Sha256,
} from "../../domain/source.js";
import {
  DEFAULT_MATERIALIZATION_LIMITS,
  type MaterializationLimits,
  type NpmSourceAcquirer,
  type SecureContentSession,
} from "../../application/ports/source-acquisition.js";
import { SourceMaterializationError } from "../../application/source-materialization.js";
import type { TarReader } from "../archive/tar-reader.js";
import type { NpmRegistryClient } from "./npm-registry-client.js";

export type NpmSourceAcquirerOptions = Readonly<{
  registry: NpmRegistryClient;
  archive: TarReader;
  sha256: Sha256;
  limits?: Partial<MaterializationLimits>;
}>;

function failure(
  code: "SOURCE_RESOLUTION_FAILED" | "PATH_CONTAINMENT_FAILED" | "ADAPTER_FAILED",
  classification: "security" | "permanent" | "transient",
  operation: string,
  message: string,
  cause?: unknown,
): SourceMaterializationError {
  return new SourceMaterializationError({
    code,
    classification,
    operation,
    message,
    details: { operation },
    cause,
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function effectiveLimits(input?: Partial<MaterializationLimits>): MaterializationLimits {
  const limits = { ...DEFAULT_MATERIALIZATION_LIMITS, ...(input ?? {}) };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`materialization limit ${name} must be positive`);
  }
  if (limits.maxExpansionRatio < 1) throw new TypeError("maxExpansionRatio must be at least one");
  return Object.freeze(limits);
}

async function scratchDirectory(signal: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  let root: string | undefined;
  try {
    root = await mkdtemp(join(tmpdir(), "pi-npm-materialization-"));
    await mkdir(join(root, ".work"), { mode: 0o700 });
    return root;
  } catch (error) {
    if (root !== undefined) await rm(root, { recursive: true, force: true }).catch(() => undefined);
    throw failure("ADAPTER_FAILED", "permanent", "resolveNpmSource", "failed to create npm scratch data", error);
  }
}

async function cleanupScratch(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}

async function archiveTarball(
  archive: TarReader,
  tarball: string,
  sink: SecureContentSession,
  limits: MaterializationLimits,
  signal: AbortSignal,
): Promise<void> {
  const input = createReadStream(tarball, { signal }) as unknown as AsyncIterable<Uint8Array>;
  try {
    await archive.read(input, sink, signal, {
      compression: "gzip",
      stripPrefix: "package",
      requireRetainedEntries: true,
      limits,
    });
  } catch (error) {
    if (signal.aborted) throw signal.reason ?? error;
    if (error instanceof SourceMaterializationError) throw error;
    throw failure("ADAPTER_FAILED", "permanent", "extractSourceArchive", "npm tarball extraction failed", error);
  }
}

async function acquire(
  options: NpmSourceAcquirerOptions,
  source: Extract<PluginSource, { kind: "npm" }>,
  sink: SecureContentSession,
  signal: AbortSignal,
): Promise<ResolvedPluginSource> {
  const limits = effectiveLimits(options.limits);
  const scratch = await scratchDirectory(signal);
  let failureValue: unknown;
  let result: ResolvedPluginSource | undefined;
  try {
    const resolved = await options.registry.resolve(source, signal);
    throwIfAborted(signal);
    const tarball = join(scratch, ".work", "package.tgz");
    await options.registry.downloadVerified(resolved.selected, tarball, limits, signal);
    throwIfAborted(signal);
    await archiveTarball(options.archive, tarball, sink, limits, signal);
    throwIfAborted(signal);
    try {
      result = createResolvedPluginSource({
        kind: "npm",
        package: resolved.package,
        version: resolved.selected.version,
        integrity: resolved.selected.integrity,
        registry: resolved.registry,
      }, options.sha256);
    } catch (error) {
      throw failure("ADAPTER_FAILED", "permanent", "resolveNpmSource", "resolved npm source contract could not be constructed", error);
    }
  } catch (error) {
    failureValue = error;
  }

  try {
    await cleanupScratch(scratch);
  } catch (error) {
    throw failure("ADAPTER_FAILED", "permanent", "abortMaterialization", "failed to remove npm scratch data", error);
  }
  if (failureValue !== undefined) {
    if (signal.aborted) throw signal.reason ?? failureValue;
    if (failureValue instanceof SourceMaterializationError) throw failureValue;
    throw failure("ADAPTER_FAILED", "permanent", "resolveNpmSource", "npm source adapter failed", failureValue);
  }
  if (result === undefined) throw failure("ADAPTER_FAILED", "permanent", "resolveNpmSource", "npm source adapter returned no result");
  return result;
}

export function createNpmSourceAcquirer(options: NpmSourceAcquirerOptions): NpmSourceAcquirer {
  if (options === null || typeof options !== "object") throw new TypeError("npm source acquirer options are required");
  if (typeof options.registry?.resolve !== "function" || typeof options.registry?.downloadVerified !== "function") {
    throw new TypeError("npm source acquirer requires a registry client");
  }
  if (typeof options.archive?.read !== "function") throw new TypeError("npm source acquirer requires a tar reader");
  if (typeof options.sha256 !== "function") throw new TypeError("npm source acquirer requires SHA-256");

  return {
    async materialize(input, sink, signal) {
      let source: Extract<PluginSource, { kind: "npm" }>;
      try {
        const parsed = PluginSourceSchema.parse(input);
        if (parsed.kind !== "npm") throw new Error("source is not npm");
        source = parsed;
      } catch (error) {
        throw failure("SOURCE_RESOLUTION_FAILED", "permanent", "resolveNpmSource", "npm source declaration is invalid", error);
      }
      if (sink === null || typeof sink?.add !== "function") throw new TypeError("npm source acquirer requires a content sink");
      if (typeof signal?.aborted !== "boolean") throw new TypeError("npm source acquirer requires an AbortSignal");
      return acquire(options, source, sink, signal);
    },
  };
}
