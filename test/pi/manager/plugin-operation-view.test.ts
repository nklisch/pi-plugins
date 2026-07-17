import { describe, expect, it, vi } from "vitest";
import { visibleWidth } from "@earendil-works/pi-tui";
import { createNativeControlEnvelope } from "../../../src/application/native-control-contract.js";
import { PluginOperationView } from "../../../src/pi/manager/plugin-operation-view.js";

const executionId = "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" as never;
const theme = { fg: (_token: string, text: string) => text, bold: (text: string) => text } as any;
const keybindings = { matches: (data: string, id: string) => (id.includes("cancel") || id === "app.interrupt") && data === "\u001b" } as any;

describe("plugin operation view", () => {
  it("renders long exact progress/result output bounded and scrollable", () => {
    const cancel = vi.fn();
    const view = new PluginOperationView({ theme, keybindings, height: () => 12, cancel });
    for (let sequence = 1; sequence <= 60; sequence += 1) {
      view.push({ schemaVersion: 1, type: "progress", executionId, sequence, phase: `phase-${sequence}`, state: "started", safe: [] });
    }
    view.finish(createNativeControlEnvelope({ executionId, command: "status", status: "ok", human: [{ text: "界".repeat(100), escaped: false, truncated: false }] }));
    const lines = view.render(38);
    expect(lines.length).toBeLessThanOrEqual(12);
    expect(lines.every((line) => visibleWidth(line) <= 38)).toBe(true);
    expect(lines.join("\n")).toContain("status ok");
    view.handleInput("\u001b[A");
    expect(view.render(38)).not.toEqual(lines);
    view.handleInput("\u001b");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("disposes idempotently", () => {
    const view = new PluginOperationView({ theme, keybindings, height: () => 5, cancel: vi.fn() });
    view.dispose();
    view.dispose();
    expect(view.render(20)).toEqual([]);
  });
});
