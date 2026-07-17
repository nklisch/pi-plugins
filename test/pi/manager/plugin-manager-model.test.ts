import { describe, expect, it } from "vitest";
import {
  createPluginManagerState,
  pluginManagerReducer,
  rowKeyIdentity,
  type PluginManagerRow,
} from "../../../src/pi/manager/plugin-manager-model.js";

const row = (key: string): PluginManagerRow => ({
  key: { subject: "installed", key, snapshotId: `snapshot-${key}`, detailId: `detail-${key}` },
  title: key,
  subtitle: "market · user",
  status: "ready",
  scope: "user",
  plugin: `${key}@market`,
  completion: { category: "plugin", value: `${key}@market`, safe: { text: key, escaped: false, truncated: false } },
  data: {},
});

describe("plugin manager reducer", () => {
  it("is request-number deterministic and rejects late pages", () => {
    let state = createPluginManagerState();
    state = pluginManagerReducer(state, { type: "page-loading", request: 2, append: false });
    state = pluginManagerReducer(state, { type: "page-loaded", request: 1, rows: [row("stale")], append: false });
    expect(state.page.loading).toBe(true);
    expect(state.page.rows).toEqual([]);
    state = pluginManagerReducer(state, { type: "page-loaded", request: 2, rows: [row("current")], next: "opaque", append: false });
    expect(state.page.rows.map((entry) => entry.title)).toEqual(["current"]);
    expect(state.page.next).toBe("opaque");
  });

  it("restores focus by semantic row identity and falls back to the nearest survivor", () => {
    let state = createPluginManagerState();
    state = pluginManagerReducer(state, { type: "page-loading", request: 1, append: false });
    state = pluginManagerReducer(state, { type: "page-loaded", request: 1, rows: [row("a"), row("b"), row("c")], append: false });
    state = pluginManagerReducer(state, { type: "select-row", row: row("b").key });
    state = pluginManagerReducer(state, { type: "page-loading", request: 2, append: false });
    state = pluginManagerReducer(state, { type: "page-loaded", request: 2, rows: [row("a"), row("b"), row("d")], append: false });
    expect(rowKeyIdentity(state.focus.row!)).toBe(rowKeyIdentity(row("b").key));
    state = pluginManagerReducer(state, { type: "page-loading", request: 3, append: false });
    state = pluginManagerReducer(state, { type: "page-loaded", request: 3, rows: [row("a"), row("d")], append: false });
    expect(state.focus.row?.key).toBe("d");
  });

  it("bounds appended pages and resets authority on view/search changes", () => {
    let state = createPluginManagerState();
    for (let request = 1; request <= 7; request += 1) {
      state = pluginManagerReducer(state, { type: "page-loading", request, append: request > 1 });
      state = pluginManagerReducer(state, { type: "page-loaded", request, rows: [row(String(request))], append: request > 1, next: String(request + 1) });
    }
    expect(state.page.pages).toBe(5);
    expect(state.page.rows.map((entry) => entry.title)).toEqual(["3", "4", "5", "6", "7"]);
    state = pluginManagerReducer(state, { type: "intent", intent: { type: "set-view", view: "browse" } });
    expect(state.view).toBe("browse");
    expect(state.page.rows).toEqual([]);
    expect(state.focus).toMatchObject({ pane: "tabs" });
  });

  it("keeps status, diagnostics, disclosure, operation frames, and resize as presentation state only", () => {
    let state = createPluginManagerState();
    state = pluginManagerReducer(state, { type: "update-counts", unread: 2, unresolved: 3 });
    state = pluginManagerReducer(state, { type: "toggle-disclosure", key: "diagnostics" });
    state = pluginManagerReducer(state, { type: "operation-started", action: "update" });
    state = pluginManagerReducer(state, { type: "resized", columns: 54, rows: 18 });
    expect(state.updateCounts).toEqual({ unread: 2, unresolved: 3 });
    expect(state.disclosure.has("diagnostics")).toBe(true);
    expect(state.operation).toMatchObject({ state: "running", action: "update" });
    state = pluginManagerReducer(state, { type: "operation-finished", envelope: {} as never });
    state = pluginManagerReducer(state, { type: "intent", intent: { type: "return-manager" } });
    expect(state.screen).toBe("manager");
    expect(state.operation.state).toBe("idle");
    expect(state.viewport).toEqual({ columns: 54, rows: 18 });
  });
});
