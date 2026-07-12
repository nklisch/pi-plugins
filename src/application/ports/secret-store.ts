import type { SecretLocator } from "../../domain/configured-values.js";
import type { SensitiveValue } from "../sensitive-value.js";

/** Adapter-neutral OS credential boundary. No backend naming or plaintext API leaks inward. */
export interface SecretStore {
  put(locator: SecretLocator, value: SensitiveValue, signal: AbortSignal): Promise<void>;
  get(
    locator: SecretLocator,
    signal: AbortSignal,
  ): Promise<
    | Readonly<{ kind: "found"; value: SensitiveValue }>
    | Readonly<{ kind: "missing" }>
  >;
  remove(locator: SecretLocator, signal: AbortSignal): Promise<"removed" | "missing">;
}
