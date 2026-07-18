import { describe, expect, it, vi } from "vitest";
import { Key, matchesKey, visibleWidth } from "@earendil-works/pi-tui";
import { ConfirmationSurface } from "../../../src/pi/manager/confirmation-surface.js";

const theme = {
  fg: (_token: string, text: string) => text,
  bold: (text: string) => text,
} as any;
const keybindings = {
  matches: (data: string, id: string) =>
    id === "tui.select.confirm" ? matchesKey(data, Key.enter) :
      id === "tui.select.cancel" || id === "app.interrupt" ? matchesKey(data, Key.escape) :
        id === "tui.select.up" ? matchesKey(data, Key.up) :
          id === "tui.select.down" ? matchesKey(data, Key.down) :
            id === "tui.select.pageUp" ? matchesKey(data, Key.pageUp) :
              id === "tui.select.pageDown" ? matchesKey(data, Key.pageDown) : false,
} as any;

describe("confirmation surface", () => {
  it("requires the complete executable disclosure to be reachable before confirmation", () => {
    const done = vi.fn();
    const overlay = new ConfirmationSurface({
      theme,
      keybindings,
      title: "Confirm exact trust",
      lines: ["plugin: demo@market", "scope: user"],
      disclosure: Array.from({ length: 30 }, (_, index) => `executable-${index}`),
      height: () => 6,
      done,
    });

    overlay.handleInput(" ");
    overlay.render(36);
    overlay.handleInput("\r");
    expect(done).not.toHaveBeenCalled();

    for (let index = 0; index < 20; index += 1) {
      overlay.handleInput("\u001b[6~");
      overlay.render(36);
    }
    const tail = overlay.render(36);
    expect(tail.join("\n")).toContain("executable-29");
    expect(tail.every((line) => visibleWidth(line) <= 36)).toBe(true);
    overlay.handleInput("\r");
    expect(done).toHaveBeenCalledWith(true);
  });

  it("cancels a fresh confirmation without approval", () => {
    const done = vi.fn();
    const overlay = new ConfirmationSurface({ theme, keybindings, title: "Delete data", lines: ["plugin: demo"], done });
    overlay.handleInput("\u001b");
    overlay.handleInput("\r");
    expect(done).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledWith(false);
  });
});
