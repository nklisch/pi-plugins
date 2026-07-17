import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PiSessionBindingPort } from "../composition/packaged-plugin-host-contract.js";

export type PluginHostRuntimeDelegates = Readonly<{
  pi: ExtensionAPI;
  bindSession(binding: PiSessionBindingPort): void;
  clear(): void;
}>;

/**
 * Register ordinary hook delegates during construct-only composition. Their
 * proxy has no target until explicit startup wires the existing Pi adapter.
 */
export function createPluginHostRuntimeDelegates(pi: ExtensionAPI): PluginHostRuntimeDelegates {
  if (pi === null || typeof pi !== "object" || typeof pi.on !== "function") throw new TypeError("Pi ExtensionAPI is required");
  const handlers = new Map<string, (event: unknown, context: ExtensionContext) => unknown>();
  let binding: PiSessionBindingPort | undefined;
  const names = [
    "input",
    "tool_call",
    "tool_result",
    "session_before_compact",
    "session_compact",
    "agent_settled",
  ] as const;
  for (const name of names) {
    // ExtensionAPI overloads cannot be indexed by their event union. This is
    // the one host-bound registration cast; event payloads remain Pi-owned.
    (pi.on as (event: string, handler: (event: unknown, context: ExtensionContext) => unknown) => void)(name, (event, context) => {
      const target = handlers.get(name);
      if (target === undefined || binding === undefined) return undefined;
      binding.assertContext(context);
      return target(event, context);
    });
  }
  // Session boundaries are already registered by bootstrap. Runtime handlers
  // are still routed here so ordinary SessionStart/SessionEnd hooks can share
  // the same inert-before-start guarantee when the bootstrap forwards them.
  for (const name of ["session_start", "session_shutdown"] as const) {
    (pi.on as (event: string, handler: (event: unknown, context: ExtensionContext) => unknown) => void)(name, (event, context) => {
      const target = handlers.get(name);
      if (target === undefined || binding === undefined) return undefined;
      binding.assertContext(context);
      return target(event, context);
    });
  }
  const proxy = new Proxy(pi as object, {
    get(target, property, receiver) {
      if (property === "on") {
        return (event: string, handler: (event: unknown, context: ExtensionContext) => unknown): void => {
          if (handlers.has(event)) throw new Error(`runtime delegate already bound for ${event}`);
          handlers.set(event, handler);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as ExtensionAPI;
  return Object.freeze({
    pi: proxy,
    bindSession(next): void {
      if (binding !== undefined && binding !== next) throw new Error("runtime delegates are already session-bound");
      binding = next;
    },
    clear(): void {
      binding = undefined;
      handlers.clear();
    },
  });
}
