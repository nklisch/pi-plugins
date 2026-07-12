import type { ConfiguredValue } from "../domain/configured-values.js";

export interface ResolvedConfiguration {
  has(key: string): boolean;
  substitute(template: string): string;
  environment(prefix?: "CLAUDE_PLUGIN_OPTION_"): Readonly<Record<string, string>>;
  dispose(): void;
  toString(): "[REDACTED]";
  toJSON(): "[REDACTED]";
}

type ResolvedEntry = Readonly<{ key: string; value: ConfiguredValue }>;

function serialize(value: ConfiguredValue): string {
  switch (value.kind) {
    case "string":
    case "directory":
    case "file": return value.value;
    case "number": return String(value.value);
    case "boolean": return value.value ? "true" : "false";
    case "strings": return JSON.stringify(value.value);
    default: return assertNever(value);
  }
}

/** Create the callback-scoped facade without exposing its backing map. */
export function createResolvedConfiguration(entries: readonly ResolvedEntry[]): ResolvedConfiguration {
  const values = new Map(entries.map((entry) => [entry.key, entry.value]));
  let disposed = false;
  const assertLive = (): void => {
    if (disposed) throw new Error("resolved configuration is disposed");
  };
  const get = (key: string): string => {
    assertLive();
    const entry = values.get(key);
    if (entry === undefined) throw new Error("configuration key is unavailable");
    return serialize(entry);
  };
  return {
    has(key: string): boolean {
      assertLive();
      return values.has(key);
    },
    substitute(template: string): string {
      assertLive();
      if (typeof template !== "string") throw new TypeError("configuration template must be a string");
      return template.replace(/\$\{user_config\.([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, key: string) => get(key));
    },
    environment(prefix = "CLAUDE_PLUGIN_OPTION_"): Readonly<Record<string, string>> {
      assertLive();
      const result: Record<string, string> = {};
      for (const key of [...values.keys()].sort()) result[`${prefix}${key}`] = get(key);
      return Object.freeze(result);
    },
    dispose(): void {
      disposed = true;
      values.clear();
    },
    toString(): "[REDACTED]" {
      return "[REDACTED]";
    },
    toJSON(): "[REDACTED]" {
      return "[REDACTED]";
    },
  };
}

function assertNever(value: never): never {
  throw new Error(`unhandled resolved configuration value: ${String(value)}`);
}
