import type { NativeControlStatus } from "../../application/native-control-contract.js";

export type PluginManagerStatusTone = "success" | "warning" | "error" | "muted";

/**
 * Exact presentation mapping. Substring matching is unsafe here because values
 * such as unavailable/inactive/unsupported contain positive status words.
 */
export const PluginManagerStatusRegistry = Object.freeze({
  ready: "success",
  active: "success",
  current: "success",
  success: "success",
  succeeded: "success",
  supported: "success",
  available: "success",
  activatable: "success",
  applied: "success",
  enabled: "success",
  ok: "success",
  "no-change": "success",
  matching: "success",
  resolved: "success",
  blocked: "error",
  failed: "error",
  error: "error",
  incompatible: "error",
  unavailable: "error",
  "not-available": "error",
  unsupported: "error",
  rejected: "error",
  corrupt: "error",
  disposed: "error",
  "recovery-required": "error",
  warning: "warning",
  attention: "warning",
  stale: "warning",
  conflict: "warning",
  unresolved: "warning",
  manual: "warning",
  unknown: "warning",
  partial: "warning",
  cancelled: "warning",
  "input-required": "warning",
  "not-found": "warning",
  "presentation-required": "warning",
  inactive: "muted",
  disabled: "muted",
  standby: "muted",
  missing: "muted",
  pending: "muted",
} as const satisfies Readonly<Record<string, PluginManagerStatusTone>>);

export type PluginManagerKnownStatus = keyof typeof PluginManagerStatusRegistry;

export function pluginManagerStatusTone(status: string): PluginManagerStatusTone {
  return PluginManagerStatusRegistry[status.trim().toLowerCase() as PluginManagerKnownStatus] ?? "muted";
}

export const NativeControlStatusTone = Object.freeze({
  ok: "success",
  "no-change": "success",
  "input-required": "warning",
  "not-found": "warning",
  stale: "warning",
  conflict: "warning",
  unavailable: "error",
  rejected: "error",
  partial: "warning",
  "recovery-required": "error",
  cancelled: "warning",
  failed: "error",
  "presentation-required": "warning",
} as const satisfies Readonly<Record<NativeControlStatus, PluginManagerStatusTone>>);
