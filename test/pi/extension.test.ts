import { describe, expect, it, vi } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import extension from "../../src/pi/extension.js";

describe("packaged Pi extension factory", () => {
  it("constructs one host, one /plugin command, and presentation lifecycle without side effects", () => {
    const events: string[] = [];
    const commands: string[] = [];
    const pi = {
      on(name: string, _handler: Function) { events.push(name); },
      registerCommand(name: string) { commands.push(name); },
      registerTool: vi.fn(),
      registerShortcut: vi.fn(),
      appendEntry: vi.fn(),
      getCommands: () => [],
      sendMessage: vi.fn(),
      setSessionName: vi.fn(),
    } as unknown as ExtensionAPI;
    extension(pi);
    expect(commands).toEqual(["plugin"]);
    expect((pi as any).registerTool).not.toHaveBeenCalled();
    expect((pi as any).registerShortcut).not.toHaveBeenCalled();
    expect(events.filter((name) => name === "session_start")).toHaveLength(2);
    expect(events.filter((name) => name === "session_shutdown")).toHaveLength(2);
    expect(events.filter((name) => name === "resources_discover")).toHaveLength(1);
  });
});
