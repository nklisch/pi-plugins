import { SensitiveValue, withSensitiveValue } from "../../src/application/sensitive-value.js";
import { SecretLocatorSchema } from "../../src/domain/configured-values.js";
import type { SecretStore } from "../../src/application/ports/secret-store.js";

/** Shared adapter-neutral contract; concrete OS adapters can reuse this suite. */
export async function assertSecretStoreContract(create: () => SecretStore): Promise<void> {
  const store = create();
  const locator = SecretLocatorSchema.parse(`secret-v1:sha256:${"1".repeat(64)}`);
  const signal = new AbortController().signal;
  expectResult(await store.get(locator, signal), "missing");
  const secret = SensitiveValue.fromUnknown("CANARY_SECRET");
  await store.put(locator, secret, signal);
  const found = await store.get(locator, signal);
  if (found.kind !== "found" || withSensitiveValue(found.value, (value) => value) !== "CANARY_SECRET") {
    throw new Error("secret store must round-trip through SensitiveValue");
  }
  if (JSON.stringify(found).includes("CANARY_SECRET")) throw new Error("secret store result leaked plaintext");
  if (await store.remove(locator, signal) !== "removed") throw new Error("secret store must remove existing value");
  if (await store.remove(locator, signal) !== "missing") throw new Error("secret store must distinguish missing removal");
}

function expectResult(value: unknown, kind: string): void {
  if (value === null || typeof value !== "object" || (value as { kind?: unknown }).kind !== kind) {
    throw new Error(`expected secret store result ${kind}`);
  }
}
