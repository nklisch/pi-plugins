import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** A response body exposed as bytes only; callers must consume it exactly once. */
export type BoundedFetchResponse = Readonly<{
  status: number;
  headers: Headers;
  url: string;
  body: AsyncIterable<Uint8Array>;
}>;

export type BoundedFetchRequest = Readonly<{
  url: string;
  maxBytes: number;
  signal: AbortSignal;
  /** Internal adapter override; never included in a response or source result. */
  credentials?: NpmCredentialProvider;
}>;

export interface BoundedFetch {
  request(request: BoundedFetchRequest): Promise<BoundedFetchResponse>;
}

/**
 * Credentials are applied to a private Headers object owned by the HTTP
 * adapter. The provider deliberately has no return value, so a token cannot
 * accidentally become part of a resolved source or an application result.
 */
export type NpmCredentialProvider = Readonly<{
  apply(url: URL, headers: Headers, signal: AbortSignal): void | Promise<void>;
}> | ((url: URL, headers: Headers, signal: AbortSignal) => void | Promise<void>);

export type BoundedFetchOptions = Readonly<{
  fetch: typeof globalThis.fetch;
  credentials: NpmCredentialProvider;
  maxRedirects?: number;
}>;

export type BoundedFetchErrorKind = "network" | "credential" | "redirect" | "response" | "limit";

/** Errors contain only safe classification data; the requested URL is not retained. */
export class BoundedFetchError extends Error {
  readonly kind: BoundedFetchErrorKind;
  readonly status?: number;

  constructor(input: Readonly<{
    kind: BoundedFetchErrorKind;
    message: string;
    status?: number;
    cause?: unknown;
  }>) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "BoundedFetchError";
    this.kind = input.kind;
    if (input.status !== undefined) this.status = input.status;
  }
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError(signal);
}

function applyCredentials(
  provider: NpmCredentialProvider,
  url: URL,
  headers: Headers,
  signal: AbortSignal,
): Promise<void> {
  if (typeof provider === "function") return Promise.resolve(provider(url, headers, signal));
  if (typeof provider.apply !== "function") throw new TypeError("npm credential provider must apply credentials");
  return Promise.resolve(provider.apply(url, headers, signal));
}

function bodyFromResponse(response: Response, maxBytes: number, signal: AbortSignal): AsyncIterable<Uint8Array> {
  if (response.body === null) {
    return (async function* empty(): AsyncGenerator<Uint8Array> {
      throwIfAborted(signal);
    })();
  }

  return (async function* stream(): AsyncGenerator<Uint8Array> {
    const reader = response.body!.getReader();
    let total = 0;
    try {
      while (true) {
        throwIfAborted(signal);
        let next: ReadableStreamReadResult<Uint8Array>;
        try {
          next = await reader.read();
        } catch (error) {
          if (signal.aborted) throw abortError(signal);
          throw new BoundedFetchError({ kind: "network", message: "HTTP response stream failed", cause: error });
        }
        if (next.done) return;
        const chunk = next.value;
        if (!(chunk instanceof Uint8Array)) {
          throw new BoundedFetchError({ kind: "response", message: "HTTP response body was not bytes" });
        }
        total += chunk.byteLength;
        if (total > maxBytes) {
          throw new BoundedFetchError({ kind: "limit", message: "HTTP response exceeded its byte limit" });
        }
        if (chunk.byteLength > 0) yield new Uint8Array(chunk);
      }
    } finally {
      // Cancellation and parser failures must stop a slow or hostile server
      // even when the consumer does not finish iterating the body.
      await reader.cancel().catch(() => undefined);
    }
  })();
}

function location(response: Response): string | undefined {
  const value = response.headers.get("location");
  return value === null || value.length === 0 ? undefined : value;
}

function safeUrl(input: string): URL {
  let value: URL;
  try {
    value = new URL(input);
  } catch (error) {
    throw new BoundedFetchError({ kind: "redirect", message: "HTTP URL is invalid", cause: error });
  }
  if (value.protocol !== "https:") {
    throw new BoundedFetchError({ kind: "redirect", message: "HTTP URL must use HTTPS" });
  }
  if (value.username !== "" || value.password !== "") {
    throw new BoundedFetchError({ kind: "redirect", message: "HTTP URL contains credentials" });
  }
  return value;
}

async function discard(response: Response, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  try {
    await response.body?.cancel();
  } catch {
    // The redirect target is authoritative; a body that is already closed does
    // not change the redirect decision.
  }
}

export function createBoundedFetch(options: BoundedFetchOptions): BoundedFetch {
  if (typeof options?.fetch !== "function") throw new TypeError("bounded fetch requires fetch");
  if (options.credentials === null || options.credentials === undefined) {
    throw new TypeError("bounded fetch requires a credential provider");
  }
  const maxRedirects = options.maxRedirects ?? 5;
  if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0) {
    throw new TypeError("maxRedirects must be a nonnegative safe integer");
  }

  return {
    async request(input) {
      if (input === null || typeof input !== "object") throw new TypeError("bounded fetch request is required");
      if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes <= 0) {
        throw new TypeError("bounded fetch maxBytes must be positive");
      }
      if (typeof input.signal?.aborted !== "boolean") throw new TypeError("bounded fetch requires an AbortSignal");
      throwIfAborted(input.signal);

      let current = safeUrl(input.url);
      for (let redirects = 0; ; redirects += 1) {
        throwIfAborted(input.signal);
        const headers = new Headers({ accept: "application/json, application/octet-stream" });
        try {
          await applyCredentials(input.credentials ?? options.credentials, current, headers, input.signal);
        } catch (error) {
          if (input.signal.aborted) throw abortError(input.signal);
          throw new BoundedFetchError({ kind: "credential", message: "HTTP credential adapter failed", cause: error });
        }
        let response: Response;
        try {
          response = await options.fetch(current, {
            method: "GET",
            headers,
            redirect: "manual",
            signal: input.signal,
          });
        } catch (error) {
          if (input.signal.aborted) throw abortError(input.signal);
          throw new BoundedFetchError({ kind: "network", message: "HTTP request failed", cause: error });
        }

        if (REDIRECT_STATUSES.has(response.status)) {
          const target = location(response);
          await discard(response, input.signal);
          if (target === undefined) {
            throw new BoundedFetchError({ kind: "redirect", message: "HTTP redirect has no location" });
          }
          if (redirects >= maxRedirects) {
            throw new BoundedFetchError({ kind: "redirect", message: "HTTP redirect limit exceeded" });
          }
          let next: URL;
          try {
            next = new URL(target, current);
          } catch (error) {
            throw new BoundedFetchError({ kind: "redirect", message: "HTTP redirect location is invalid", cause: error });
          }
          // Rebuilding the request on every hop means Authorization is never
          // forwarded implicitly. The provider may elect to authorize the new
          // origin, but application code never sees those headers.
          current = safeUrl(next.toString());
          continue;
        }

        return {
          status: response.status,
          headers: response.headers,
          url: current.toString(),
          body: bodyFromResponse(response, input.maxBytes, input.signal),
        };
      }
    },
  };
}

type NpmConfigCredential = Readonly<{
  scope: string;
  token?: string;
  basic?: string;
}>;

function parseNpmrc(text: string): NpmConfigCredential[] {
  const result: NpmConfigCredential[] = [];
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith(";")) continue;
    const equals = line.indexOf("=");
    if (equals <= 0) continue;
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim();
    if (value.length === 0) continue;
    const tokenMatch = /^(?:(\/\/[^/]+\/):)?_authToken$/u.exec(key);
    if (tokenMatch !== null) {
      // Keep the authority (including a non-default port) as part of the
      // credential scope. A token for :4873 must never match the same host on
      // :443 or an unrelated redirect origin.
      result.push({ scope: tokenMatch[1] ?? "//registry.npmjs.org/", token: value });
      continue;
    }
    if (key === "_auth") result.push({ scope: "//registry.npmjs.org/", basic: value });
  }
  return result;
}

function credentialApplies(scope: string, url: URL): boolean {
  if (scope.length === 0) return true;
  try {
    const scoped = new URL(`https:${scope}`);
    return scoped.hostname.toLowerCase() === url.hostname.toLowerCase()
      && (scoped.port || "443") === (url.port || "443")
      && url.pathname.startsWith(scoped.pathname);
  } catch {
    return false;
  }
}

/**
 * Minimal npmrc reader for the standard token/basic auth forms. It is kept in
 * the HTTP adapter so parsed credentials never cross into source contracts.
 */
export function createNpmCredentialProvider(options: Readonly<{
  configPath?: string;
  configText?: string;
  home?: string;
}> = {}): NpmCredentialProvider {
  let loaded: Promise<readonly NpmConfigCredential[]> | undefined;
  const readConfig = async (): Promise<readonly NpmConfigCredential[]> => {
    if (options.configText !== undefined) return parseNpmrc(options.configText);
    const path = options.configPath ?? process.env.NPM_CONFIG_USERCONFIG ?? join(options.home ?? homedir(), ".npmrc");
    try {
      return parseNpmrc(await readFile(path, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      // An unreadable credential file is not equivalent to an empty one: the
      // caller must be able to distinguish configuration failure from a
      // genuinely anonymous request. Keep the path and contents out of the
      // error; the cause remains adapter-local.
      throw new BoundedFetchError({ kind: "credential", message: "npm credential configuration could not be read", cause: error });
    }
  };
  return {
    async apply(url, headers, signal) {
      throwIfAborted(signal);
      loaded ??= readConfig();
      const credentials = await loaded;
      const match = credentials.find((entry) => credentialApplies(entry.scope, url));
      if (match?.token !== undefined) headers.set("authorization", `Bearer ${match.token}`);
      else if (match?.basic !== undefined) headers.set("authorization", `Basic ${match.basic}`);
    },
  };
}

export const createDefaultNpmCredentialProvider = createNpmCredentialProvider;

/** A byte collector used by adapters that need bounded JSON rather than a stream. */
export async function collectBoundedBytes(
  body: AsyncIterable<Uint8Array>,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new TypeError("maxBytes must be positive");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of body) {
    throwIfAborted(signal);
    if (!(chunk instanceof Uint8Array)) throw new BoundedFetchError({ kind: "response", message: "HTTP response body was not bytes" });
    length += chunk.byteLength;
    if (length > maxBytes) throw new BoundedFetchError({ kind: "limit", message: "HTTP response exceeded its byte limit" });
    chunks.push(chunk);
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new BoundedFetchError({ kind: "response", message: "HTTP response was not valid UTF-8", cause: error });
  }
}

