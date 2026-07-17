import { describe, expect, it } from "vitest";
import { SensitiveValue, withSensitiveValue } from "../../../src/application/sensitive-value.js";
import { SecretLocatorSchema } from "../../../src/domain/configured-values.js";
import type { SecretServiceClient } from "../../../src/infrastructure/secrets/dbus-secret-service-client.js";
import { createLinuxSecretServiceStore } from "../../../src/infrastructure/secrets/linux-secret-service-store.js";
import { createPlatformSecretStore } from "../../../src/infrastructure/secrets/create-platform-secret-store.js";
import { assertSecretStoreContract } from "../../contract/secret-store.contract.js";

type Item = { path: string; nonce: Uint8Array; plaintext: Uint8Array };

class FakeSecretServiceClient implements SecretServiceClient {
  readonly items = new Map<string, Item>();
  prompt = false;
  nextPath = 0;
  closed = false;

  async createNoReplace(input: { locator: string; ownerNonce: Uint8Array; plaintext: Uint8Array }) {
    if (this.prompt) return { kind: "prompt-required" as const };
    if (this.items.has(input.locator)) return { kind: "collision" as const };
    const item = {
      path: `/item/${this.nextPath++}`,
      nonce: Uint8Array.from(input.ownerNonce),
      plaintext: Uint8Array.from(input.plaintext),
    };
    this.items.set(input.locator, item);
    return { kind: "created" as const, itemPath: item.path };
  }
  async read(locator: string) {
    if (this.prompt) return { kind: "prompt-required" as const };
    const item = this.items.get(locator);
    return item === undefined
      ? { kind: "missing" as const }
      : { kind: "found" as const, ownerNonce: Uint8Array.from(item.nonce), plaintext: Uint8Array.from(item.plaintext) };
  }
  async remove(locator: string) {
    return this.items.delete(locator) ? "removed" as const : "missing" as const;
  }
  async removeOwned(input: { locator: string; itemPath: string; ownerNonce: Uint8Array }) {
    const item = this.items.get(input.locator);
    if (item === undefined || item.path !== input.itemPath) return "missing" as const;
    if (Buffer.compare(item.nonce, input.ownerNonce) !== 0) return "ownership-mismatch" as const;
    this.items.delete(input.locator);
    return "removed" as const;
  }
  async [Symbol.asyncDispose]() { this.closed = true; }
}

describe("Linux Secret Service store", () => {
  it("passes the secret-store contract through atomic ownership evidence", async () => {
    await assertSecretStoreContract(() => createLinuxSecretServiceStore(new FakeSecretServiceClient()));
  });

  it("isolates concurrent creation and prevents stale evidence deleting a replacement", async () => {
    const client = new FakeSecretServiceClient();
    const first = createLinuxSecretServiceStore(client);
    const second = createLinuxSecretServiceStore(client);
    const locator = SecretLocatorSchema.parse(`secret-v1:sha256:${"2".repeat(64)}`);
    const signal = new AbortController().signal;
    const [left, right] = await Promise.all([
      first.put(locator, SensitiveValue.fromUnknown("winner"), signal),
      second.put(locator, SensitiveValue.fromUnknown("loser"), signal),
    ]);
    expect([left.kind, right.kind].sort()).toEqual(["collision", "created"]);
    const winner = left.kind === "created" ? left : right.kind === "created" ? right : undefined;
    if (winner === undefined) throw new Error("missing winner");
    expect(withSensitiveValue((await first.get(locator, signal) as { kind: "found"; value: SensitiveValue }).value, (value) => value)).toBe("winner");
    await first.remove(locator, signal);
    const replacement = await second.put(locator, SensitiveValue.fromUnknown("replacement"), signal);
    expect(replacement.kind).toBe("created");
    await expect(first.removeOwned(winner.evidence, signal)).resolves.toBe("missing");
    const found = await second.get(locator, signal);
    expect(found.kind).toBe("found");
    if (found.kind === "found") expect(withSensitiveValue(found.value, (value) => value)).toBe("replacement");
  });

  it("fails closed for prompts, missing providers, and unsupported platforms", async () => {
    const prompt = new FakeSecretServiceClient();
    prompt.prompt = true;
    const platform = await createPlatformSecretStore({ platform: "linux", connectLinux: async () => prompt });
    const locator = SecretLocatorSchema.parse(`secret-v1:sha256:${"3".repeat(64)}`);
    const error = await platform.store.put(locator, SensitiveValue.fromUnknown("CANARY_SECRET"), new AbortController().signal).catch((value: unknown) => value);
    expect(error).toMatchObject({ code: "SECRET_STORE_UNAVAILABLE" });
    expect(JSON.stringify(error)).not.toContain("CANARY_SECRET");
    await platform.close();

    const missing = await createPlatformSecretStore({ platform: "linux", connectLinux: async () => { throw new Error("CANARY /run/user/1/bus"); } });
    expect(missing.availability).toMatchObject({ status: "unavailable", provider: "missing-provider" });
    expect(JSON.stringify(missing)).not.toContain("CANARY");
    const unsupported = await createPlatformSecretStore({ platform: "darwin" });
    expect(unsupported.availability.provider).toBe("unsupported-platform");
  });
});
