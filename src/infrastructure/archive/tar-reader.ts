import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import {
  ContentDigestSchema,
  normalizeContentLinkTarget,
  normalizeContentPath,
} from "../../domain/content-manifest.js";
import type {
  ContentEntry,
  MaterializationLimits,
  SecureContentSession,
} from "../../application/ports/source-acquisition.js";
import {
  DEFAULT_MATERIALIZATION_LIMITS,
} from "../../application/ports/source-acquisition.js";
import { SourceMaterializationError } from "../../application/source-materialization.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const BLOCK = 512;

export type TarReaderOptions = Readonly<{
  limits?: Partial<MaterializationLimits>;
  stripPrefix?: string;
  compression?: "none" | "gzip";
}>;

export interface TarReader {
  read(
    input: AsyncIterable<Uint8Array>,
    sink: SecureContentSession,
    signal: AbortSignal,
    options?: TarReaderOptions,
  ): Promise<void>;
  read(
    input: AsyncIterable<Uint8Array>,
    sink: SecureContentSession,
    options: TarReaderOptions,
    signal: AbortSignal,
  ): Promise<void>;
}

function policyError(message: string, path?: string): SourceMaterializationError {
  return new SourceMaterializationError({
    code: "PATH_CONTAINMENT_FAILED",
    classification: "security",
    operation: "extractSourceArchive",
    message,
    details: {
      operation: "extractSourceArchive",
      ...(path === undefined ? {} : { path }),
    },
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function limitsWithDefaults(input?: Partial<MaterializationLimits>): MaterializationLimits {
  const limits = { ...DEFAULT_MATERIALIZATION_LIMITS, ...(input ?? {}) };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`materialization limit ${name} must be positive`);
  }
  if (limits.maxExpansionRatio < 1) throw new TypeError("maxExpansionRatio must be at least one");
  return Object.freeze(limits);
}

function fieldText(header: Uint8Array, start: number, length: number, field: string): string {
  const bytes = header.slice(start, start + length);
  const end = bytes.indexOf(0);
  try { return decoder.decode(end === -1 ? bytes : bytes.slice(0, end)); }
  catch (error) { throw policyError(`tar ${field} is not valid UTF-8`); }
}

function octal(header: Uint8Array, start: number, length: number, field: string): number {
  const text = fieldText(header, start, length, field).replace(/^\s+|\s+$/g, "").replace(/\0/g, "");
  if (text.length === 0) return 0;
  if (!/^[0-7]+$/.test(text)) throw policyError(`tar ${field} is not valid octal`);
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value)) throw policyError(`tar ${field} is too large`);
  return value;
}

function validChecksum(header: Uint8Array): boolean {
  const expected = octal(header, 148, 8, "checksum");
  let actual = 0;
  for (let index = 0; index < BLOCK; index += 1) {
    actual += index >= 148 && index < 156 ? 0x20 : (header[index] ?? 0);
  }
  return actual === expected;
}

function allZero(block: Uint8Array): boolean {
  for (const byte of block) if (byte !== 0) return false;
  return true;
}

function safeArchiveName(name: string): string {
  const withoutTrailingSlash = name.replace(/\/+$/g, "");
  if (withoutTrailingSlash.length === 0) throw policyError("tar entry has an empty path");
  try { return normalizeContentPath(withoutTrailingSlash); }
  catch (error) { throw policyError("tar entry path is unsafe", withoutTrailingSlash); }
}

function relativeHardlinkTarget(path: string, target: string): string {
  const targetParts = target.split("/");
  const parent = path.split("/");
  parent.pop();
  let common = 0;
  while (common < parent.length && common < targetParts.length && parent[common] === targetParts[common]) common += 1;
  const result = [
    ...Array.from({ length: parent.length - common }, () => ".."),
    ...targetParts.slice(common),
  ].join("/");
  return result.length === 0 ? "." : result;
}

class ByteQueue {
  private readonly chunks: Uint8Array[] = [];
  private iterator: AsyncIterator<Uint8Array>;
  private current: Uint8Array | undefined;
  private offset = 0;
  private done = false;

  constructor(input: AsyncIterable<Uint8Array>) {
    this.iterator = input[Symbol.asyncIterator]();
  }

  private async fill(): Promise<boolean> {
    if (this.current !== undefined && this.offset < this.current.byteLength) return true;
    if (this.done) return false;
    const next = await this.iterator.next();
    if (next.done) {
      this.done = true;
      this.current = undefined;
      return false;
    }
    if (!(next.value instanceof Uint8Array)) throw policyError("archive stream yielded a non-byte value");
    this.current = next.value;
    this.offset = 0;
    return this.current.byteLength > 0 || await this.fill();
  }

  async take(count: number): Promise<Uint8Array> {
    if (!Number.isSafeInteger(count) || count < 0) throw new TypeError("queue take count must be nonnegative");
    const output = new Uint8Array(count);
    let written = 0;
    while (written < count) {
      if (!await this.fill()) throw policyError("tar archive ended before the declared entry size");
      const current = this.current;
      if (current === undefined) throw policyError("tar archive stream ended unexpectedly");
      const available = Math.min(count - written, current.byteLength - this.offset);
      output.set(current.subarray(this.offset, this.offset + available), written);
      this.offset += available;
      written += available;
    }
    return output;
  }

  async takeChunk(count: number): Promise<Uint8Array | undefined> {
    if (count === 0) return new Uint8Array();
    if (!await this.fill()) return undefined;
    const current = this.current;
    if (current === undefined) return undefined;
    const available = Math.min(count, current.byteLength - this.offset);
    const result = current.slice(this.offset, this.offset + available);
    this.offset += available;
    return result;
  }

  async drainAndRequireZero(): Promise<void> {
    while (await this.fill()) {
      const current = this.current;
      if (current === undefined) return;
      for (const byte of current.subarray(this.offset)) {
        if (byte !== 0) throw policyError("tar archive contains nonzero trailing data");
      }
      this.offset = current.byteLength;
    }
  }
}

async function* countedInput(
  input: AsyncIterable<Uint8Array>,
  limits: MaterializationLimits,
  state: { archiveBytes: number },
): AsyncGenerator<Uint8Array> {
  for await (const chunk of input) {
    if (!(chunk instanceof Uint8Array)) throw policyError("archive stream yielded a non-byte value");
    state.archiveBytes += chunk.byteLength;
    if (state.archiveBytes > limits.maxArchiveBytes) throw policyError("archive byte limit exceeded");
    yield chunk;
  }
}

async function* gunzipped(input: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  const stream = Readable.from(input).pipe(createGunzip());
  for await (const chunk of stream) {
    if (!(chunk instanceof Uint8Array)) throw policyError("gzip stream yielded a non-byte value");
    yield chunk;
  }
}

export function createTarReader(defaultOptions: TarReaderOptions = {}): TarReader {
  const defaultLimits = limitsWithDefaults(defaultOptions.limits);
  return {
    async read(input, sink, signalOrOptions, optionsOrSignal = {}) {
      const firstIsSignal = typeof signalOrOptions === "object" && signalOrOptions !== null && "aborted" in signalOrOptions;
      const signal = (firstIsSignal ? signalOrOptions : optionsOrSignal) as AbortSignal;
      if (typeof signal?.aborted !== "boolean") throw new TypeError("tar reader requires an AbortSignal");
      const callOptions = (firstIsSignal ? optionsOrSignal : signalOrOptions) as TarReaderOptions;
      throwIfAborted(signal);
      const limits = limitsWithDefaults({ ...defaultLimits, ...(callOptions.limits ?? {}) });
      const stripPrefix = callOptions.stripPrefix ?? defaultOptions.stripPrefix;
      const compression = callOptions.compression ?? defaultOptions.compression ?? "none";
      const normalizedPrefix = stripPrefix === undefined ? undefined : safeArchiveName(stripPrefix);
      const state = { archiveBytes: 0 };
      const counted = countedInput(input, limits, state);
      const bytes = compression === "gzip" ? gunzipped(counted) : counted;
      const queue = new ByteQueue(bytes);
      const seen = new Set<string>();
      let entries = 0;
      let expandedBytes = 0;
      let zeroBlock = false;

      try {
        while (!zeroBlock) {
          throwIfAborted(signal);
          const header = await queue.take(BLOCK);
          if (allZero(header)) {
            const trailer = await queue.take(BLOCK);
            if (!allZero(trailer)) throw policyError("tar archive is missing its zero trailer");
            zeroBlock = true;
            await queue.drainAndRequireZero();
            break;
          }
          if (!validChecksum(header)) throw policyError("tar header checksum is invalid");
          entries += 1;
          if (entries > limits.maxEntries) throw policyError("archive entry count limit exceeded");
          const name = fieldText(header, 0, 100, "name");
          const prefix = fieldText(header, 345, 155, "prefix");
          const archivePath = safeArchiveName(prefix.length === 0 ? name : `${prefix}/${name}`);
          const type = String.fromCharCode(header[156] ?? 0);
          if (["x", "g", "X", "L", "K"].includes(type)) throw policyError("tar extended path metadata is unsupported", archivePath);
          if (["3", "4", "6", "7", "A"].includes(type)) throw policyError("tar special file type is unsupported", archivePath);
          const mode = octal(header, 100, 8, "mode");
          if ((mode & 0o7000) !== 0) throw policyError("tar special permission bits are unsupported", archivePath);
          const size = octal(header, 124, 12, "size");
          if (size > limits.maxFileBytes && (type === "0" || type === "\0")) throw policyError("tar file size limit exceeded", archivePath);
          const linkName = fieldText(header, 157, 100, "linkname");
          const retained = normalizedPrefix === undefined
            ? archivePath
            : archivePath === normalizedPrefix
              ? undefined
              : archivePath.startsWith(`${normalizedPrefix}/`)
                ? archivePath.slice(normalizedPrefix.length + 1)
                : (() => { throw policyError("tar entry is outside the required archive prefix", archivePath); })();

          if (type === "5") {
            if (size !== 0) throw policyError("tar directory has nonzero payload", archivePath);
            if (retained !== undefined) {
              const key = retained.normalize("NFC").toLowerCase();
              if (seen.has(key)) throw policyError("archive contains duplicate or colliding paths", retained);
              seen.add(key);
              await sink.add({ kind: "directory", path: retained, mode }, signal);
            }
          } else if (type === "2" || type === "1") {
            if (size !== 0) throw policyError("tar link has a payload", archivePath);
            if (retained !== undefined) {
              const key = retained.normalize("NFC").toLowerCase();
              if (seen.has(key)) throw policyError("archive contains duplicate or colliding paths", retained);
              seen.add(key);
              if (linkName.length === 0) throw policyError("tar link has an empty target", retained);
              if (type === "1") {
                const targetPath = safeArchiveName(linkName);
                if (normalizedPrefix !== undefined && !targetPath.startsWith(`${normalizedPrefix}/`) && targetPath !== normalizedPrefix) {
                  throw policyError("tar hardlink target is outside the required archive prefix", retained);
                }
                const strippedTarget = normalizedPrefix === undefined
                  ? targetPath
                  : targetPath === normalizedPrefix ? undefined : targetPath.slice(normalizedPrefix.length + 1);
                if (strippedTarget === undefined) throw policyError("tar hardlink target names an archive root", retained);
                const target = relativeHardlinkTarget(retained, strippedTarget);
                normalizeContentLinkTarget(retained, target);
                await sink.add({ kind: "hardlink", path: retained, mode, target }, signal);
              } else {
                normalizeContentLinkTarget(retained, linkName);
                await sink.add({ kind: "symlink", path: retained, mode, target: linkName }, signal);
              }
            }
          } else if (type === "0" || type === "\0") {
            expandedBytes += size;
            if (expandedBytes > limits.maxExpandedBytes) throw policyError("expanded content limit exceeded", archivePath);
            if (retained !== undefined) {
              const key = retained.normalize("NFC").toLowerCase();
              if (seen.has(key)) throw policyError("archive contains duplicate or colliding paths", retained);
              seen.add(key);
              const body = async function* (): AsyncGenerator<Uint8Array> {
                let remaining = size;
                while (remaining > 0) {
                  throwIfAborted(signal);
                  const chunk = await queue.takeChunk(Math.min(64 * 1024, remaining));
                  if (chunk === undefined) throw policyError("tar file payload ended unexpectedly", retained);
                  remaining -= chunk.byteLength;
                  yield chunk;
                }
              }();
              await sink.add({ kind: "file", path: retained, mode, body }, signal);
            } else {
              await queue.take(size);
            }
            const padding = (BLOCK - (size % BLOCK)) % BLOCK;
            if (padding > 0) await queue.take(padding);
          } else {
            throw policyError("tar entry type is unsupported", archivePath);
          }

          if (state.archiveBytes >= 1024 * 1024 && expandedBytes > state.archiveBytes * limits.maxExpansionRatio) {
            throw policyError("archive expansion ratio limit exceeded", archivePath);
          }
        }
        if (state.archiveBytes === 0) throw policyError("archive is empty");
        if (expandedBytes > state.archiveBytes * limits.maxExpansionRatio) throw policyError("archive expansion ratio limit exceeded");
        throwIfAborted(signal);
      } catch (error) {
        if (signal.aborted) throw signal.reason ?? error;
        if (error instanceof SourceMaterializationError) throw error;
        throw policyError("archive extraction failed");
      }
    },
  };
}

/** Alias retained for callers that prefer the format name over the factory name. */
export const createStreamingTarReader = createTarReader;
