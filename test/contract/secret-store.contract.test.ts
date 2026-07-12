import { describe, it } from "vitest";
import { assertSecretStoreContract } from "./secret-store.contract.js";
import type { SecretStore } from "../../src/application/ports/secret-store.js";

class InMemorySecretStore implements SecretStore {
  private readonly values = new Map<string, import("../../src/application/sensitive-value.js").SensitiveValue>();
  async put(locator: string, value: import("../../src/application/sensitive-value.js").SensitiveValue): Promise<void> { this.values.set(locator, value); }
  async get(locator: string) { return this.values.has(locator) ? { kind: "found" as const, value: this.values.get(locator)! } : { kind: "missing" as const }; }
  async remove(locator: string) { return this.values.delete(locator) ? "removed" as const : "missing" as const; }
}

describe("secret store port contract", () => {
  it("distinguishes missing/found/removal without plaintext result shapes", async () => {
    await assertSecretStoreContract(() => new InMemorySecretStore());
  });
});
