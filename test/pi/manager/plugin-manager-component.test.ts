import { describe, expect, it, vi } from "vitest";
import { CURSOR_MARKER, Key, matchesKey } from "@earendil-works/pi-tui";
import { PluginManagerComponent } from "../../../src/pi/manager/plugin-manager-component.js";
import { createPluginManagerState, pluginManagerReducer, type PluginManagerIntent, type PluginManagerState } from "../../../src/pi/manager/plugin-manager-model.js";

function harness() {
  let state = createPluginManagerState();
  const listeners = new Set<(state: PluginManagerState) => void>();
  const intents: PluginManagerIntent[] = [];
  const controller = {
    state: () => state,
    dispatch(intent: PluginManagerIntent) {
      intents.push(intent);
      state = pluginManagerReducer(state, { type: "intent", intent });
      for (const listener of listeners) listener(state);
    },
    refresh: vi.fn(), dynamicCompletions: () => [], idle: async () => undefined, close: vi.fn(),
    subscribe(listener: (next: PluginManagerState) => void) { listeners.add(listener); return () => listeners.delete(listener); },
  } as any;
  const tui = { terminal: { rows: 20 }, requestRender: vi.fn() } as any;
  const theme = { fg: (_token: string, text: string) => text, bg: (_token: string, text: string) => text, bold: (text: string) => text } as any;
  const keybindings = {
    matches: (data: string, id: string) =>
      id === "tui.select.up" ? matchesKey(data, Key.up) :
      id === "tui.select.down" ? matchesKey(data, Key.down) :
      id === "tui.select.pageDown" ? matchesKey(data, Key.pageDown) :
      id === "tui.select.pageUp" ? matchesKey(data, Key.pageUp) :
      id === "tui.select.confirm" ? matchesKey(data, Key.enter) :
      id === "tui.select.cancel" || id === "app.interrupt" ? matchesKey(data, Key.escape) : false,
    getKeys: () => ["enter"],
  } as any;
  const done = vi.fn();
  const component = new PluginManagerComponent({ tui, theme, keybindings, controller, done });
  component.focused = true;
  return { component, controller, intents, tui, done, setState(next: PluginManagerState) { state = next; } };
}

describe("plugin manager component", () => {
  it("supports direct catalog navigation, configured keys, refresh, and close", () => {
    const h = harness();
    h.component.handleInput("\r");
    h.component.handleInput("/");
    h.component.handleInput("abc");
    h.component.handleInput("\r");
    h.component.handleInput("r");
    h.component.handleInput("?");
    h.component.handleInput("\u001b");
    expect(h.intents).toEqual(expect.arrayContaining([
      { type: "open-detail" },
      { type: "focus-query" },
      { type: "set-query", query: "abc" },
      { type: "submit-search" },
      { type: "refresh", scope: "all" },
      { type: "toggle-help" },
      { type: "close" },
    ]));
    expect(h.tui.requestRender).toHaveBeenCalled();
  });

  it("moves catalog selection by a page and scrolls detail without another layer", () => {
    const h = harness();
    h.setState({ ...createPluginManagerState(), focus: { pane: "list" } });
    h.component.handleInput("\u001b[6~");
    h.setState({ ...createPluginManagerState(), focus: { pane: "detail" } });
    h.component.handleInput("\u001b[6~");
    expect(h.intents).toContainEqual({ type: "move-selection", delta: 18 });
    expect(h.intents).toContainEqual({ type: "scroll", region: "detail", delta: 18 });
  });

  it("returns from detail and then closes", () => {
    const h = harness();
    h.setState({ ...createPluginManagerState(), focus: { pane: "detail", action: "inspect" } });
    h.component.handleInput("\u001b");
    h.component.handleInput("\u001b");
    expect(h.intents).toEqual(expect.arrayContaining([{ type: "detail-back" }, { type: "close" }]));
    expect(h.done).toHaveBeenCalledWith({ kind: "closed" });
  });

  it("emits the IME cursor marker only while the query owns focus", () => {
    const h = harness();
    h.component.handleInput("/");
    expect(h.component.render(70).join("\n")).toContain(CURSOR_MARKER);
    h.component.handleInput("\u001b");
    expect(h.component.render(70).join("\n")).not.toContain(CURSOR_MARKER);
  });

  it("offers direct Add onboarding without closing the catalog", () => {
    const h = harness();
    h.component.handleInput("A");
    expect(h.intents).toContainEqual({ type: "action", action: "browse-plugins" });
    expect(h.done).not.toHaveBeenCalled();
  });

  it("runs a mutating action without closing the manager surface", () => {
    const h = harness();
    h.setState({ ...createPluginManagerState(), focus: { pane: "detail", action: "install" } });
    h.component.handleInput("\r");
    expect(h.intents).toContainEqual({ type: "action", action: "install" });
    expect(h.done).not.toHaveBeenCalled();
  });

  it("returns from a finished inline operation to the catalog", () => {
    const h = harness();
    let finished = pluginManagerReducer(createPluginManagerState(), { type: "operation-started", action: "marketplace-add" });
    finished = pluginManagerReducer(finished, { type: "operation-finished", envelope: {} as never });
    h.setState(finished);
    h.component.handleInput("\u001b");
    expect(h.intents).toContainEqual({ type: "return-manager" });
    expect(h.done).not.toHaveBeenCalled();
  });

  it("makes repeated Escape a no-op while cancellation waits for owner truth", () => {
    const h = harness();
    let operation = pluginManagerReducer(createPluginManagerState(), { type: "operation-started", action: "enable" });
    h.setState(operation);
    h.component.handleInput("\u001b");
    operation = pluginManagerReducer(operation, { type: "operation-cancelling" });
    h.setState(operation);
    h.component.handleInput("\u001b");
    expect(h.intents.filter((intent) => intent.type === "cancel-operation")).toHaveLength(1);
    expect(h.done).not.toHaveBeenCalled();
  });

  it("handles resize/theme invalidation and idempotent disposal", () => {
    const h = harness();
    h.component.render(55);
    expect(h.intents).toContainEqual({ type: "resized", columns: 55, rows: 20 });
    h.component.invalidate();
    h.component.dispose();
    h.component.dispose();
    h.component.handleInput("r");
    expect(h.controller.close).not.toHaveBeenCalled();
  });
});
