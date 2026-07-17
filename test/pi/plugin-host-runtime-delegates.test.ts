import { describe, expect, it, vi } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createPluginHostRuntimeDelegates } from "../../src/pi/plugin-host-runtime-delegates.js";

describe("plugin host runtime delegates", () => {
  it("routes only after an exact session binding is installed and clears without unregister support", async () => {
    const actual = new Map<string, (event: never, context: ExtensionContext) => unknown>();
    const pi = { on: (name: string, handler: never) => actual.set(name, handler as never) } as unknown as ExtensionAPI;
    const delegates = createPluginHostRuntimeDelegates(pi);
    const target = vi.fn();
    delegates.pi.on("input", target);
    await actual.get("input")?.({} as never, {} as ExtensionContext);
    expect(target).not.toHaveBeenCalled();
    const assertContext = vi.fn();
    delegates.bindSession({ current: vi.fn(), assertContext, isProjectTrusted: vi.fn() });
    await actual.get("input")?.({} as never, {} as ExtensionContext);
    expect(assertContext).toHaveBeenCalledOnce();
    expect(target).toHaveBeenCalledOnce();
    delegates.clear();
    await actual.get("input")?.({} as never, {} as ExtensionContext);
    expect(target).toHaveBeenCalledOnce();
  });
});
