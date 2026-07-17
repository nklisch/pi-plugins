import { describe, expect, it } from "vitest";
import { visibleWidth } from "@earendil-works/pi-tui";
import { createNativeControlEnvelope } from "../../../src/application/native-control-contract.js";
import { createPluginManagerState, pluginManagerReducer, type PluginManagerRow } from "../../../src/pi/manager/plugin-manager-model.js";
import { renderPluginManager } from "../../../src/pi/manager/plugin-manager-render.js";
import { trustedInstallFlowFixture } from "../../fixtures/trusted-install/plugin-install-flow.js";

const theme = {
  fg: (_token: string, text: string) => `\u001b[31m${text}\u001b[39m`,
  bg: (_token: string, text: string) => `\u001b[44m${text}\u001b[49m`,
  bold: (text: string) => `\u001b[1m${text}\u001b[22m`,
} as any;
const keybindings = {
  getKeys: (id: string) => id.includes("cancel") || id === "app.interrupt" ? ["escape"] : id.includes("confirm") ? ["enter"] : id.includes("page") ? ["pageDown"] : ["up"],
} as any;
const executionId = "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" as never;
const row: PluginManagerRow = {
  key: { subject: "installed", key: "user:demo@market", snapshotId: "snapshot", detailId: "detail" },
  title: "界 demo\u001b]52;c;bad\u0007",
  subtitle: "market · user",
  status: "ready",
  scope: "user",
  plugin: "demo@market",
  completion: { category: "plugin", value: "demo@market", safe: { text: "demo", escaped: false, truncated: false } },
  data: {},
};

function state() {
  let value = createPluginManagerState();
  value = pluginManagerReducer(value, { type: "page-loading", request: 1, append: false });
  value = pluginManagerReducer(value, { type: "page-loaded", request: 1, rows: [row], append: false });
  value = pluginManagerReducer(value, { type: "update-counts", unread: 2, unresolved: 3 });
  return value;
}

describe("plugin manager renderer", () => {
  it.each([120, 80, 42])("renders responsive topology within %i columns", (width) => {
    const lines = renderPluginManager({ state: state(), width, height: 24, theme, keybindings, focused: true });
    expect(lines.length).toBeLessThanOrEqual(24);
    expect(lines.every((line) => visibleWidth(line) <= width)).toBe(true);
    expect(lines.join("\n")).toContain("PI / PLUGINS");
    expect(lines.join("\n")).toContain("Installed");
    expect(lines.join("\n")).toContain("Updates 3");
    expect(lines.join("\n")).not.toContain("bad\u0007");
  });

  it("keeps long-list selection and the focused tail action visible in small terminals", () => {
    const rows = Array.from({ length: 50 }, (_, index): PluginManagerRow => ({
      ...row,
      key: { ...row.key, key: `user:demo-${index}@market`, detailId: `detail-${index}` },
      title: `demo-${index}`,
      plugin: `demo-${index}@market`,
    }));
    let value = createPluginManagerState();
    value = pluginManagerReducer(value, { type: "page-loading", request: 1, append: false });
    value = pluginManagerReducer(value, { type: "page-loaded", request: 1, rows, append: false });
    value = pluginManagerReducer(value, { type: "resized", columns: 70, rows: 8 });
    value = pluginManagerReducer(value, { type: "intent", intent: { type: "move-selection", delta: 49 } });
    expect(renderPluginManager({ state: value, width: 70, height: 8, theme, keybindings, focused: true }).join("\n")).toContain("demo-49");

    const selected = rows[49]!;
    value = pluginManagerReducer(value, { type: "detail-loading", request: 1, row: selected.key });
    value = pluginManagerReducer(value, {
      type: "detail-loaded",
      request: 1,
      row: selected.key,
      envelope: createNativeControlEnvelope({ executionId, command: "inspection.show", status: "ok", data: { kind: "found", detail: trustedInstallFlowFixture.chooseInspect } as never }),
    });
    value = pluginManagerReducer(value, { type: "focus", pane: "actions", action: "uninstall-delete" });
    const actionView = renderPluginManager({ state: value, width: 70, height: 8, theme, keybindings, focused: true }).join("\n");
    expect(actionView).toContain("Uninstall, delete data");
  });

  it("preserves signed information groups and explicit empty/degraded state", () => {
    const rendered = renderPluginManager({ state: state(), width: 120, height: 30, theme, keybindings, focused: true }).join("\n");
    expect(rendered).toContain("Runtime surface");
    expect(rendered).toContain("Compatibility / health");
    expect(rendered).toContain("Actions");

    let empty = createPluginManagerState();
    empty = pluginManagerReducer(empty, { type: "page-loading", request: 1, append: false });
    empty = pluginManagerReducer(empty, { type: "page-failed", request: 1, code: "HOST_BLOCKED" });
    const error = renderPluginManager({ state: empty, width: 60, height: 16, theme, keybindings, focused: true }).join("\n");
    expect(error).toContain("HOST_BLOCKED");
    expect(error).toContain("No installed plugins");
  });
});
