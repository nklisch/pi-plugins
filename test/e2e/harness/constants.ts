import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const E2E_PI_VERSION = "0.80.8";
export const E2E_SEED = 0x504c5547;
export const E2E_GIT_PORT = Number.parseInt(process.env.PI_PLUGIN_HOST_E2E_GIT_PORT ?? "46180", 10);
export const E2E_CONTROL_REPORT = "plugin-host:control-report-v1";
export const E2E_SECRET_CANARY = "PI-PLUGIN-HOST-E2E-SECRET-CANARY";
export const E2E_CHECKOUT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const E2E_TIMEOUTS = Object.freeze({
  startup: 15_000,
  rpc: 15_000,
  read: 20_000,
  network: 30_000,
  lifecycle: 60_000,
  faultBoundary: 15_000,
  shutdown: 10_000,
  test: 120_000,
  conditionPoll: 25,
});

export function configuredGitPort(): number {
  if (!Number.isSafeInteger(E2E_GIT_PORT) || E2E_GIT_PORT < 1024 || E2E_GIT_PORT > 65_535) {
    throw new Error(`PI_PLUGIN_HOST_E2E_GIT_PORT must be an unprivileged TCP port, got ${String(E2E_GIT_PORT)}`);
  }
  return E2E_GIT_PORT;
}
