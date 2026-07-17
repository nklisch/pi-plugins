import type { JsonValue } from "../domain/schema.js";
import { SensitiveValue } from "./sensitive-value.js";

const omittedKeys = new Set([
  "cause", "stack", "message", "locator", "inputDocument", "submission",
  "plaintext", "secretValue", "authorization", "headers", "environmentValues",
]);
const redactedKeys = new Set(["path", "root", "cwd", "file", "sessionFile"]);

function hasUnsafeScalar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) return true;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

function project(value: unknown, seen: Set<object>): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return typeof value === "string" && hasUnsafeScalar(value) ? "[REDACTED]" : value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("native control output contains a non-finite number");
    return value;
  }
  if (typeof value === "undefined" || typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    throw new TypeError("native control output is not JSON-safe");
  }
  if (value instanceof SensitiveValue) throw new TypeError("native control output contains sensitive custody");
  if (typeof value !== "object") throw new TypeError("native control output is not JSON-safe");
  if (seen.has(value)) throw new TypeError("native control output contains a cycle");
  seen.add(value);
  try {
    if (Array.isArray(value)) return Object.freeze(value.map((entry) => project(entry, seen)));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("native control output contains a class instance");
    const output: Record<string, JsonValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined || omittedKeys.has(key)) continue;
      output[key] = redactedKeys.has(key) ? "[REDACTED]" : project(entry, seen);
    }
    return Object.freeze(output);
  } finally {
    seen.delete(value);
  }
}

/** Convert an owner DTO into a plain, finite, redacted JSON value. */
export function projectNativeControlJson(value: unknown): JsonValue {
  return project(value, new Set());
}

export function assertNativeControlJsonSafe(value: unknown): asserts value is JsonValue {
  void projectNativeControlJson(value);
}

/** Scan every structural output channel; useful at adapter boundaries and tests. */
export function nativeControlContainsForbiddenValue(value: unknown): boolean {
  try {
    projectNativeControlJson(value);
    return false;
  } catch {
    return true;
  }
}
