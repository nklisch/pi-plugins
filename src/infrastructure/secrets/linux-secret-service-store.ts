import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  SecretStoreCreateResultSchema,
  SecretStoreGetResultSchema,
  SecretStoreRemoveResultSchema,
  type SecretCreationEvidence,
  type SecretStore,
} from "../../application/ports/secret-store.js";
import { SensitiveValue, withSensitiveValue } from "../../application/sensitive-value.js";
import { SecretLocatorSchema, type SecretLocator } from "../../domain/configured-values.js";
import type { SecretServiceClient } from "./dbus-secret-service-client.js";

export class LinuxSecretStoreError extends Error {
  readonly code: "SECRET_STORE_UNAVAILABLE" | "SECRET_OWNERSHIP_INVALID";

  constructor(code: LinuxSecretStoreError["code"], cause?: unknown) {
    super(code === "SECRET_OWNERSHIP_INVALID"
      ? "secret creation evidence is invalid"
      : "operating-system credential storage is unavailable", cause === undefined ? undefined : { cause });
    this.name = "LinuxSecretStoreError";
    this.code = code;
  }

  toJSON(): Readonly<{ code: string; message: string }> {
    return Object.freeze({ code: this.code, message: this.message });
  }
}

type OwnedSecret = Readonly<{
  locator: SecretLocator;
  itemPath: string;
  ownerNonce: Uint8Array;
}>;

function zero(bytes: Uint8Array): void {
  bytes.fill(0);
}

export function createLinuxSecretServiceStore(client: SecretServiceClient): SecretStore & AsyncDisposable {
  if (client === null || typeof client !== "object" || typeof client.createNoReplace !== "function") {
    throw new TypeError("Secret Service client is required");
  }
  const ownership = new WeakMap<object, OwnedSecret>();
  let closed = false;

  function available(): void {
    if (closed) throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE");
  }

  async function close(): Promise<void> {
    if (closed) return;
    closed = true;
    await client[Symbol.asyncDispose]();
  }

  const store: SecretStore & AsyncDisposable = {
    async put(locatorInput, value, signal) {
      signal.throwIfAborted();
      available();
      const locator = SecretLocatorSchema.parse(locatorInput);
      if (!(value instanceof SensitiveValue)) throw new TypeError("SensitiveValue is required");
      const ownerNonce = randomBytes(32);
      const plaintext = withSensitiveValue(value, (secret) => new TextEncoder().encode(secret));
      try {
        const result = await client.createNoReplace({ locator, ownerNonce, plaintext }, signal);
        if (result.kind === "collision") return SecretStoreCreateResultSchema.parse({ kind: "collision" });
        if (result.kind === "prompt-required") throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE");
        const verified = await client.read(locator, signal);
        if (verified.kind !== "found") throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE");
        try {
          if (verified.ownerNonce.byteLength !== ownerNonce.byteLength ||
              !timingSafeEqual(verified.ownerNonce, ownerNonce)) {
            throw new LinuxSecretStoreError("SECRET_OWNERSHIP_INVALID");
          }
        } finally {
          zero(verified.ownerNonce);
          zero(verified.plaintext);
        }
        const evidence = Object.freeze({}) as SecretCreationEvidence;
        ownership.set(evidence, { locator, itemPath: result.itemPath, ownerNonce: Uint8Array.from(ownerNonce) });
        return SecretStoreCreateResultSchema.parse({ kind: "created", locator, evidence });
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        if (error instanceof LinuxSecretStoreError) throw error;
        throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE", error);
      } finally {
        zero(ownerNonce);
        zero(plaintext);
      }
    },

    async get(locatorInput, signal) {
      signal.throwIfAborted();
      available();
      const locator = SecretLocatorSchema.parse(locatorInput);
      try {
        const result = await client.read(locator, signal);
        if (result.kind === "missing") return SecretStoreGetResultSchema.parse({ kind: "missing" });
        if (result.kind === "prompt-required") throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE");
        try {
          const plaintext = new TextDecoder("utf-8", { fatal: true }).decode(result.plaintext);
          return SecretStoreGetResultSchema.parse({ kind: "found", value: SensitiveValue.fromUnknown(plaintext) });
        } finally {
          zero(result.ownerNonce);
          zero(result.plaintext);
        }
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        if (error instanceof LinuxSecretStoreError) throw error;
        throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE", error);
      }
    },

    async remove(locatorInput, signal) {
      signal.throwIfAborted();
      available();
      try {
        const result = await client.remove(SecretLocatorSchema.parse(locatorInput), signal);
        if (result === "prompt-required") throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE");
        return SecretStoreRemoveResultSchema.parse(result);
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        if (error instanceof LinuxSecretStoreError) throw error;
        throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE", error);
      }
    },

    async removeOwned(evidence, signal) {
      signal.throwIfAborted();
      available();
      const owned = typeof evidence === "object" && evidence !== null ? ownership.get(evidence) : undefined;
      if (owned === undefined) throw new LinuxSecretStoreError("SECRET_OWNERSHIP_INVALID");
      if (client.removeOwned === undefined) {
        // Never weaken ownership evidence to locator-only deletion.
        throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE");
      }
      try {
        const result = await client.removeOwned({
          locator: owned.locator,
          itemPath: owned.itemPath,
          ownerNonce: owned.ownerNonce,
        }, signal);
        if (result === "prompt-required") throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE");
        if (result === "ownership-mismatch") throw new LinuxSecretStoreError("SECRET_OWNERSHIP_INVALID");
        ownership.delete(evidence);
        zero(owned.ownerNonce);
        return SecretStoreRemoveResultSchema.parse(result);
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        if (error instanceof LinuxSecretStoreError) throw error;
        throw new LinuxSecretStoreError("SECRET_STORE_UNAVAILABLE", error);
      }
    },

    [Symbol.asyncDispose]: close,
  };
  return Object.freeze(store);
}
