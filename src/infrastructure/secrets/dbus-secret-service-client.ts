import {
  createCipheriv,
  createDecipheriv,
  createHash,
  getDiffieHellman,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { SecretLocatorSchema, type SecretLocator } from "../../domain/configured-values.js";

const SERVICE = "org.freedesktop.secrets";
const SERVICE_PATH = "/org/freedesktop/secrets";
const DEFAULT_COLLECTION = "/org/freedesktop/secrets/aliases/default";
const SERVICE_INTERFACE = "org.freedesktop.Secret.Service";
const COLLECTION_INTERFACE = "org.freedesktop.Secret.Collection";
const ITEM_INTERFACE = "org.freedesktop.Secret.Item";
const SESSION_INTERFACE = "org.freedesktop.Secret.Session";
const ALGORITHM = "dh-ietf1024-sha256-aes128-cbc-pkcs7";
const CONTENT_TYPE = "application/octet-stream";
const ENVELOPE_MAGIC = new TextEncoder().encode("pi-plugin-host-secret-v1\0");
const OWNER_NONCE_BYTES = 32;

type SecretStruct = readonly [string, Uint8Array, Uint8Array, string];

export interface SecretServiceClient extends AsyncDisposable {
  createNoReplace(input: Readonly<{
    locator: SecretLocator;
    ownerNonce: Uint8Array;
    plaintext: Uint8Array;
  }>, signal: AbortSignal): Promise<
    | Readonly<{ kind: "created"; itemPath: string }>
    | Readonly<{ kind: "collision" }>
    | Readonly<{ kind: "prompt-required" }>
  >;
  read(locator: SecretLocator, signal: AbortSignal): Promise<
    | Readonly<{ kind: "found"; ownerNonce: Uint8Array; plaintext: Uint8Array }>
    | Readonly<{ kind: "missing" }>
    | Readonly<{ kind: "prompt-required" }>
  >;
  remove(locator: SecretLocator, signal: AbortSignal): Promise<"removed" | "missing" | "prompt-required">;
  /** Optional stronger primitive used for adapter-issued ownership evidence. */
  removeOwned?(
    input: Readonly<{ locator: SecretLocator; itemPath: string; ownerNonce: Uint8Array }>,
    signal: AbortSignal,
  ): Promise<"removed" | "missing" | "prompt-required" | "ownership-mismatch">;
}

export class SecretServiceError extends Error {
  readonly code:
    | "SECRET_SERVICE_UNAVAILABLE"
    | "SECRET_SERVICE_ENCRYPTION_REQUIRED"
    | "SECRET_SERVICE_PROTOCOL_ERROR";

  constructor(code: SecretServiceError["code"], cause?: unknown) {
    super(code === "SECRET_SERVICE_ENCRYPTION_REQUIRED"
      ? "encrypted Secret Service session is unavailable"
      : "Secret Service operation is unavailable", cause === undefined ? undefined : { cause });
    this.name = "SecretServiceError";
    this.code = code;
  }

  toJSON(): Readonly<{ code: string; message: string }> {
    return Object.freeze({ code: this.code, message: this.message });
  }
}

function zero(bytes: Uint8Array): void {
  bytes.fill(0);
}

function envelope(ownerNonce: Uint8Array, plaintext: Uint8Array): Uint8Array {
  if (ownerNonce.byteLength !== OWNER_NONCE_BYTES) throw new TypeError("secret owner nonce must be 32 bytes");
  const value = new Uint8Array(ENVELOPE_MAGIC.byteLength + OWNER_NONCE_BYTES + plaintext.byteLength);
  value.set(ENVELOPE_MAGIC, 0);
  value.set(ownerNonce, ENVELOPE_MAGIC.byteLength);
  value.set(plaintext, ENVELOPE_MAGIC.byteLength + OWNER_NONCE_BYTES);
  return value;
}

function parseEnvelope(value: Uint8Array): { ownerNonce: Uint8Array; plaintext: Uint8Array } {
  const minimum = ENVELOPE_MAGIC.byteLength + OWNER_NONCE_BYTES;
  if (value.byteLength < minimum || !timingSafeEqual(value.subarray(0, ENVELOPE_MAGIC.byteLength), ENVELOPE_MAGIC)) {
    throw new SecretServiceError("SECRET_SERVICE_PROTOCOL_ERROR");
  }
  return {
    ownerNonce: value.slice(ENVELOPE_MAGIC.byteLength, minimum),
    plaintext: value.slice(minimum),
  };
}

function attributes(locator: SecretLocator): Readonly<Record<string, string>> {
  return Object.freeze({
    application: "@nklisch/pi-plugin-host",
    locator: SecretLocatorSchema.parse(locator),
  });
}

function noPrompt(path: unknown): boolean {
  return path === "/" || path === "";
}

function asPaths(value: unknown): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
}

/**
 * Connect to the freedesktop Secret Service over an encrypted D-Bus session.
 * The plain algorithm is deliberately never attempted.
 */
export async function connectDbusSecretServiceClient(signal: AbortSignal): Promise<SecretServiceClient> {
  signal.throwIfAborted();
  let dbus: any;
  try {
    const dynamicImport = Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
    dbus = await dynamicImport("dbus-next");
  } catch (cause) {
    throw new SecretServiceError("SECRET_SERVICE_UNAVAILABLE", cause);
  }
  let bus: any;
  try {
    bus = dbus.sessionBus();
    const serviceObject = await bus.getProxyObject(SERVICE, SERVICE_PATH);
    const service = serviceObject.getInterface(SERVICE_INTERFACE);
    const Variant = dbus.Variant;
    const exchange = getDiffieHellman("modp2");
    exchange.generateKeys();
    const publicKey = new Uint8Array(exchange.getPublicKey());
    const [remoteVariant, sessionPath] = await service.OpenSession(
      ALGORITHM,
      new Variant("ay", Buffer.from(publicKey)),
    );
    zero(publicKey);
    if (typeof sessionPath !== "string" || sessionPath === "/" || remoteVariant?.signature !== "ay") {
      throw new SecretServiceError("SECRET_SERVICE_ENCRYPTION_REQUIRED");
    }
    const remote = new Uint8Array(remoteVariant.value);
    let shared: Uint8Array;
    try {
      shared = new Uint8Array(exchange.computeSecret(remote));
    } catch (cause) {
      zero(remote);
      throw new SecretServiceError("SECRET_SERVICE_ENCRYPTION_REQUIRED", cause);
    }
    zero(remote);
    const keyDigest = new Uint8Array(createHash("sha256").update(shared).digest());
    zero(shared);
    const key = keyDigest.slice(0, 16);
    zero(keyDigest);
    let closed = false;

    async function serviceSearch(locator: SecretLocator): Promise<{ unlocked: string[]; locked: string[] }> {
      const [unlocked, locked] = await service.SearchItems(attributes(locator));
      return { unlocked: asPaths(unlocked), locked: asPaths(locked) };
    }

    async function encryptedSecret(value: Uint8Array): Promise<SecretStruct> {
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-128-cbc", key, iv);
      const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
      return [sessionPath, new Uint8Array(iv), new Uint8Array(ciphertext), CONTENT_TYPE];
    }

    async function readItem(path: string): Promise<{ ownerNonce: Uint8Array; plaintext: Uint8Array }> {
      const object = await bus.getProxyObject(SERVICE, path);
      const item = object.getInterface(ITEM_INTERFACE);
      const secret = await item.GetSecret(sessionPath) as SecretStruct;
      if (!Array.isArray(secret) || secret[0] !== sessionPath || secret[3] !== CONTENT_TYPE) {
        throw new SecretServiceError("SECRET_SERVICE_PROTOCOL_ERROR");
      }
      const iv = new Uint8Array(secret[1]);
      const ciphertext = new Uint8Array(secret[2]);
      let plaintext: Uint8Array | undefined;
      try {
        const decipher = createDecipheriv("aes-128-cbc", key, iv);
        plaintext = new Uint8Array(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
        return parseEnvelope(plaintext);
      } catch (cause) {
        if (cause instanceof SecretServiceError) throw cause;
        throw new SecretServiceError("SECRET_SERVICE_PROTOCOL_ERROR", cause);
      } finally {
        zero(iv);
        zero(ciphertext);
        if (plaintext !== undefined) zero(plaintext);
      }
    }

    async function deleteItem(path: string): Promise<"removed" | "prompt-required"> {
      const object = await bus.getProxyObject(SERVICE, path);
      const item = object.getInterface(ITEM_INTERFACE);
      const prompt = await item.Delete();
      return noPrompt(prompt) ? "removed" : "prompt-required";
    }

    const client: SecretServiceClient = {
      async createNoReplace(input, operationSignal) {
        operationSignal.throwIfAborted();
        const locator = SecretLocatorSchema.parse(input.locator);
        if (!(input.ownerNonce instanceof Uint8Array) || !(input.plaintext instanceof Uint8Array)) {
          throw new TypeError("secret bytes are required");
        }
        const before = await serviceSearch(locator);
        if (before.locked.length > 0) return { kind: "prompt-required" };
        if (before.unlocked.length > 0) return { kind: "collision" };
        const collectionObject = await bus.getProxyObject(SERVICE, DEFAULT_COLLECTION);
        const collection = collectionObject.getInterface(COLLECTION_INTERFACE);
        const packed = envelope(input.ownerNonce, input.plaintext);
        const secret = await encryptedSecret(packed);
        zero(packed);
        try {
          const properties = {
            "org.freedesktop.Secret.Item.Label": new Variant("s", "Pi Plugin Host credential"),
            "org.freedesktop.Secret.Item.Attributes": new Variant("a{ss}", attributes(locator)),
          };
          const [itemPath, promptPath] = await collection.CreateItem(properties, secret, false);
          if (!noPrompt(promptPath)) return { kind: "prompt-required" };
          if (typeof itemPath !== "string" || itemPath === "/") {
            throw new SecretServiceError("SECRET_SERVICE_PROTOCOL_ERROR");
          }
          const created = await readItem(itemPath);
          try {
            if (!timingSafeEqual(created.ownerNonce, input.ownerNonce)) {
              throw new SecretServiceError("SECRET_SERVICE_PROTOCOL_ERROR");
            }
          } finally {
            zero(created.ownerNonce);
            zero(created.plaintext);
          }
          const after = await serviceSearch(locator);
          if (after.locked.length > 0) return { kind: "prompt-required" };
          const winner = [...after.unlocked].sort()[0];
          if (winner !== itemPath) {
            await deleteItem(itemPath);
            return { kind: "collision" };
          }
          return { kind: "created", itemPath };
        } finally {
          zero(secret[1]);
          zero(secret[2]);
        }
      },

      async read(locatorInput, operationSignal) {
        operationSignal.throwIfAborted();
        const locator = SecretLocatorSchema.parse(locatorInput);
        const found = await serviceSearch(locator);
        if (found.locked.length > 0) return { kind: "prompt-required" };
        const path = [...found.unlocked].sort()[0];
        if (path === undefined) return { kind: "missing" };
        const value = await readItem(path);
        return { kind: "found", ownerNonce: value.ownerNonce, plaintext: value.plaintext };
      },

      async remove(locatorInput, operationSignal) {
        operationSignal.throwIfAborted();
        const locator = SecretLocatorSchema.parse(locatorInput);
        const found = await serviceSearch(locator);
        if (found.locked.length > 0) return "prompt-required";
        if (found.unlocked.length === 0) return "missing";
        for (const path of found.unlocked) {
          if (await deleteItem(path) === "prompt-required") return "prompt-required";
        }
        return "removed";
      },

      async removeOwned(input, operationSignal) {
        operationSignal.throwIfAborted();
        const locator = SecretLocatorSchema.parse(input.locator);
        const found = await serviceSearch(locator);
        if (found.locked.length > 0) return "prompt-required";
        if (!found.unlocked.includes(input.itemPath)) return "missing";
        const current = await readItem(input.itemPath);
        try {
          if (current.ownerNonce.byteLength !== input.ownerNonce.byteLength ||
              !timingSafeEqual(current.ownerNonce, input.ownerNonce)) return "ownership-mismatch";
        } finally {
          zero(current.ownerNonce);
          zero(current.plaintext);
        }
        return await deleteItem(input.itemPath);
      },

      async [Symbol.asyncDispose]() {
        if (closed) return;
        closed = true;
        zero(key);
        try {
          const object = await bus.getProxyObject(SERVICE, sessionPath);
          await object.getInterface(SESSION_INTERFACE).Close();
        } catch {
          // Bus teardown is best effort after key erasure.
        }
        bus.disconnect();
      },
    };
    return Object.freeze(client);
  } catch (cause) {
    try { bus?.disconnect(); } catch { /* preserve connection failure */ }
    if (cause instanceof SecretServiceError) throw cause;
    throw new SecretServiceError("SECRET_SERVICE_UNAVAILABLE", cause);
  }
}
