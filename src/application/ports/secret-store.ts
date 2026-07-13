import { z } from "zod";
import type { SecretLocator } from "../../domain/configured-values.js";
import { SensitiveValue } from "../sensitive-value.js";

export const SecretStoreGetResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("found"), value: z.custom<SensitiveValue>((value) => value instanceof SensitiveValue) }).strict(),
  z.object({ kind: z.literal("missing") }).strict(),
]).readonly();
export type SecretStoreGetResult = z.infer<typeof SecretStoreGetResultSchema>;
export const SecretStoreRemoveResultSchema = z.enum(["removed", "missing"]);
export type SecretStoreRemoveResult = z.infer<typeof SecretStoreRemoveResultSchema>;

/** Adapter-neutral OS credential boundary. No backend naming or plaintext API leaks inward. */
export interface SecretStore {
  put(locator: SecretLocator, value: SensitiveValue, signal: AbortSignal): Promise<void>;
  get(
    locator: SecretLocator,
    signal: AbortSignal,
  ): Promise<SecretStoreGetResult>;
  remove(locator: SecretLocator, signal: AbortSignal): Promise<SecretStoreRemoveResult>;
}
