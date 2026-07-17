import type { SecretStore } from "../../application/ports/secret-store.js";
import {
  connectDbusSecretServiceClient,
  type SecretServiceClient,
} from "./dbus-secret-service-client.js";
import { createLinuxSecretServiceStore } from "./linux-secret-service-store.js";
import { createUnavailableSecretStore } from "./unavailable-secret-store.js";

export type PlatformSecretStoreResult = Readonly<{
  store: SecretStore;
  availability: Readonly<{
    status: "available" | "unavailable";
    provider: "linux-secret-service" | "unsupported-platform" | "missing-provider";
    explanation: string;
  }>;
  close(): Promise<void>;
}>;

export async function createPlatformSecretStore(input: Readonly<{
  connectLinux?: (signal: AbortSignal) => Promise<SecretServiceClient>;
  platform?: NodeJS.Platform;
  signal?: AbortSignal;
}> = {}): Promise<PlatformSecretStoreResult> {
  const platform = input.platform ?? process.platform;
  if (platform !== "linux") {
    return Object.freeze({
      store: createUnavailableSecretStore(),
      availability: Object.freeze({
        status: "unavailable",
        provider: "unsupported-platform",
        explanation: "no safe operating-system credential adapter is available on this platform",
      }),
      async close() {},
    });
  }
  const signal = input.signal ?? new AbortController().signal;
  try {
    const client = await (input.connectLinux ?? connectDbusSecretServiceClient)(signal);
    const store = createLinuxSecretServiceStore(client);
    return Object.freeze({
      store,
      availability: Object.freeze({
        status: "available",
        provider: "linux-secret-service",
        explanation: "encrypted Secret Service credential custody is available",
      }),
      async close() {
        await store[Symbol.asyncDispose]();
      },
    });
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    return Object.freeze({
      store: createUnavailableSecretStore(),
      availability: Object.freeze({
        status: "unavailable",
        provider: "missing-provider",
        explanation: "encrypted Secret Service credential custody is unavailable",
      }),
      async close() {},
    });
  }
}
