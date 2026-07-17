import type { KeybindingsManager, Theme } from "@earendil-works/pi-coding-agent";
import {
  CURSOR_MARKER,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { NativeInspectionDetailResultSchema } from "../../application/native-inspection-contract.js";
import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import { projectTerminalText } from "./pi-terminal-text.js";
import { PluginManagerActionRegistry, pluginManagerRowActions, rowKeyIdentity, type PluginManagerRow, type PluginManagerState, type PluginManagerView } from "./plugin-manager-model.js";

const VIEW_LABELS: Readonly<Record<PluginManagerView, string>> = Object.freeze({
  installed: "Installed",
  updates: "Updates",
  browse: "Browse",
  marketplaces: "Marketplaces",
});

function plain(value: unknown, limit = 2_048): string {
  return projectTerminalText(typeof value === "string" ? value : String(value ?? ""), limit).text;
}

function styledStatus(theme: Theme, status: string): string {
  const value = plain(status, 128);
  if (/ready|active|current|success|supported|available|applied/u.test(value)) return theme.fg("success", `✓ ${value}`);
  if (/blocked|failed|error|incompatible|recovery/u.test(value)) return theme.fg("error", `! ${value}`);
  if (/warning|attention|stale|unresolved|manual|unknown/u.test(value)) return theme.fg("warning", `△ ${value}`);
  return theme.fg("muted", `○ ${value}`);
}

function finish(line: string, width: number): string {
  return truncateToWidth(line, Math.max(1, width), "");
}

function wrap(line: string, width: number): readonly string[] {
  return wrapTextWithAnsi(line, Math.max(1, width)).map((entry) => finish(entry, width));
}

function pad(line: string, width: number): string {
  const clipped = finish(line, width);
  return `${clipped}${" ".repeat(Math.max(0, width - visibleWidth(clipped)))}`;
}

function selectedRow(state: PluginManagerState): PluginManagerRow | undefined {
  if (state.focus.row === undefined) return state.page.rows[0];
  return state.page.rows.find((row) => rowKeyIdentity(row.key) === rowKeyIdentity(state.focus.row!)) ?? state.page.rows[0];
}

function scopeName(row: PluginManagerRow): string {
  return row.scope ?? "unknown scope";
}

function sourceSummary(value: unknown): string {
  if (value === null || typeof value !== "object") return "unavailable";
  const source = value as Record<string, unknown>;
  const kind = plain(source.kind, 64);
  const location = source.location;
  if (location !== null && typeof location === "object" && "text" in location) {
    return `${kind}: ${plain((location as { text?: unknown }).text)}`;
  }
  if (source.package !== null && typeof source.package === "object" && "text" in source.package) {
    return `${kind}: ${plain((source.package as { text?: unknown }).text)}`;
  }
  return kind || "unavailable";
}

function envelopeLines(envelope: NativeControlEnvelope | undefined, theme: Theme): string[] {
  if (envelope === undefined) return [];
  const lines = [
    `${theme.fg("accent", "Result")} ${styledStatus(theme, envelope.status)}`,
    `${theme.fg("muted", "exit")} ${plain(envelope.exit.classification)} (${envelope.exit.code})`,
  ];
  for (const field of envelope.human.slice(0, 16)) lines.push(plain(field.text));
  for (const diagnostic of envelope.diagnostics.slice(0, 24)) {
    lines.push(`${theme.fg(diagnostic.severity === "error" ? "error" : diagnostic.severity === "warning" ? "warning" : "muted", diagnostic.code)} · ${plain(diagnostic.action)}`);
  }
  return lines;
}

function detailLines(state: PluginManagerState, theme: Theme): string[] {
  const row = selectedRow(state);
  if (row === undefined) return [theme.fg("muted", `No ${VIEW_LABELS[state.view].toLowerCase()} details`), "", theme.fg("accent", "Actions"), "  Refresh"];
  const lines: string[] = [
    theme.bold(plain(row.plugin ?? row.title)),
    styledStatus(theme, row.status),
    "",
    `${theme.fg("muted", "scope")} ${plain(scopeName(row))}`,
  ];
  const parsed = NativeInspectionDetailResultSchema.safeParse(state.detail.envelope?.data);
  if (parsed.success && parsed.data.kind === "found") {
    const detail = parsed.data.detail;
    lines.push(
      `${theme.fg("muted", "installed")} ${plain(detail.summary.revision.installed?.text ?? "not installed")}`,
      `${theme.fg("muted", "available")} ${plain(detail.summary.revision.available?.text ?? "not reported")}`,
      `${theme.fg("muted", "source")} ${sourceSummary(detail.source)}`,
      "",
      theme.fg("accent", "Runtime surface"),
      `  ${detail.compatibility.components.counts.skills} skills · ${detail.compatibility.components.counts.hooks} command hooks · ${detail.compatibility.components.counts.mcpServers} MCP servers`,
      `  ${detail.compatibility.components.counts.foreign} foreign / metadata components`,
      "",
      theme.fg("accent", "Compatibility / health"),
      `  ${styledStatus(theme, detail.compatibility.status)} · trust ${plain(detail.trust)}`,
      `  ${detail.compatibility.requirements.length} runtime requirements · ${detail.diagnostics.length} diagnostics`,
      `  lifecycle ${plain(detail.lifecycle.transition)} · update ${plain(detail.lifecycle.update)}`,
    );
    if (detail.configuration.length > 0) {
      lines.push("", theme.fg("accent", "Configuration"));
      for (const field of detail.configuration.slice(0, 16)) {
        lines.push(`  ${plain(field.label.text)} · ${field.required ? "required" : "optional"} · ${plain(field.state)}${field.sensitive ? " · secret" : ""}`);
      }
    }
    if (state.disclosure.has("components")) {
      lines.push("", theme.fg("accent", "Component inventory"));
      for (const component of [...detail.compatibility.components.skills, ...detail.compatibility.components.hooks, ...detail.compatibility.components.mcpServers, ...detail.compatibility.components.foreign].slice(0, 40)) {
        lines.push(`  ${plain(component.kind)} · ${plain(component.componentId)} · ${plain(component.verdict)}`);
      }
    } else lines.push("", "  [Enter] expand component inventory");
    if (detail.diagnostics.length > 0) {
      lines.push("", theme.fg("accent", "Diagnostics"));
      for (const diagnostic of detail.diagnostics.slice(0, 16)) lines.push(`  ${diagnostic.severity.toUpperCase()} ${plain(diagnostic.code)} · ${plain(diagnostic.summary.text)}`);
    }
  } else {
    lines.push(
      "",
      theme.fg("accent", "Runtime surface"),
      "  Select Inspect to load exact component counts and executable detail.",
      "",
      theme.fg("accent", "Compatibility / health"),
      `  ${styledStatus(theme, row.status)}`,
      ...envelopeLines(state.detail.envelope, theme).map((line) => `  ${line}`),
    );
  }
  lines.push("", theme.fg("accent", "Actions"));
  for (const action of pluginManagerRowActions(row)) {
    const label = PluginManagerActionRegistry[action].label;
    const focused = state.focus.pane === "actions" && state.focus.action === action;
    lines.push(focused ? theme.bg("selectedBg", `> ${label}`) : `  ${label}`);
  }
  return lines;
}

function listLines(state: PluginManagerState, theme: Theme, focused: boolean): string[] {
  const marker = focused && state.focus.pane === "query" ? CURSOR_MARKER : "";
  const query = plain(state.query, 256);
  const lines = [`${theme.fg(state.focus.pane === "query" ? "accent" : "muted", "/ filter")} ${query}${marker}${state.focus.pane === "query" ? "_" : ""}`];
  if (state.page.errorCode !== undefined) lines.push(theme.fg("error", `! ${plain(state.page.errorCode, 64)}`));
  if (state.page.rows.length === 0) lines.push(theme.fg("muted", `No ${VIEW_LABELS[state.view].toLowerCase()} plugins or records`));
  for (const row of state.page.rows) {
    const selected = state.focus.row !== undefined && rowKeyIdentity(state.focus.row) === rowKeyIdentity(row.key);
    const title = `${selected ? ">" : " "} ${plain(row.title, 256)}  ${styledStatus(theme, row.status)}`;
    lines.push(selected ? theme.bg("selectedBg", title) : title);
    lines.push(theme.fg("muted", `    ${plain(row.subtitle, 512)}`));
  }
  if (state.page.loading) lines.push(theme.fg("accent", "… loading authoritative snapshot"));
  if (state.page.next !== undefined) lines.push(theme.fg("muted", "Page down: load next facade page"));
  return lines;
}

function tabLine(state: PluginManagerState, theme: Theme): string {
  const tabs = (Object.keys(VIEW_LABELS) as PluginManagerView[]).map((view) => {
    const count = view === "updates" ? ` ${state.updateCounts.unresolved}` : view === "installed" ? ` ${state.page.rows.length}` : "";
    const label = `${VIEW_LABELS[view]}${count}`;
    return state.view === view ? theme.bg("selectedBg", theme.fg("accent", `[${label}]`)) : theme.fg("muted", label);
  });
  return `${theme.fg("accent", theme.bold("PI / PLUGINS"))}  ${tabs.join("  ")}`;
}

function footer(theme: Theme, keybindings: KeybindingsManager): string {
  const key = (id: Parameters<KeybindingsManager["getKeys"]>[0], fallback: string) => plain(keybindings.getKeys(id)[0] ?? fallback, 32);
  return theme.fg("dim", `${key("tui.select.up", "up")}/${key("tui.select.down", "down")} move · ${key("tui.select.confirm", "enter")} inspect/action · tab focus · / search · r refresh · ? help · ${key("app.interrupt", "escape")} back/close`);
}

function operationLines(state: PluginManagerState, theme: Theme): string[] {
  const lines = [theme.fg("accent", theme.bold(`Plugin operation · ${plain(state.operation.action ?? "result")}`)), styledStatus(theme, state.operation.state)];
  for (const frame of state.operation.frames) {
    if (frame.type === "accepted") lines.push(`#${frame.sequence} accepted ${plain(frame.command)}`);
    else if (frame.type === "progress") lines.push(`#${frame.sequence} ${plain(frame.phase)} ${plain(frame.state)}${frame.code === undefined ? "" : ` ${plain(frame.code)}`}`);
  }
  lines.push(...envelopeLines(state.operation.envelope, theme));
  return lines;
}

export function renderPluginManager(input: Readonly<{
  state: PluginManagerState;
  width: number;
  height: number;
  theme: Theme;
  keybindings: KeybindingsManager;
  focused?: boolean;
}>): readonly string[] {
  const width = Math.max(1, Math.floor(input.width));
  const height = Math.max(4, Math.floor(input.height));
  const title = finish(tabLine(input.state, input.theme), width);
  const bottom = finish(footer(input.theme, input.keybindings), width);
  const bodyHeight = Math.max(1, height - 2);
  let body: string[];
  if (input.state.screen === "operation-result" || input.state.operation.state !== "idle") {
    body = operationLines(input.state, input.theme).flatMap((line) => wrap(line, width)).slice(-bodyHeight);
  } else {
    const left = listLines(input.state, input.theme, input.focused === true).flatMap((line) => wrap(line, width));
    const right = detailLines(input.state, input.theme);
    if (width >= 92) {
      const leftWidth = Math.max(30, Math.floor(width * 0.34));
      const rightWidth = Math.max(1, width - leftWidth - 1);
      const leftWrapped = listLines(input.state, input.theme, input.focused === true).flatMap((line) => wrap(line, leftWidth));
      const rightWrapped = right.flatMap((line) => wrap(line, rightWidth));
      const count = Math.min(bodyHeight, Math.max(leftWrapped.length, rightWrapped.length));
      body = Array.from({ length: count }, (_, index) => `${pad(leftWrapped[index] ?? "", leftWidth)}${input.theme.fg("border", "│")}${finish(rightWrapped[index] ?? "", rightWidth)}`);
    } else {
      const showDetail = input.state.focus.pane === "detail" || input.state.focus.pane === "actions";
      const heading = input.theme.fg("borderAccent", showDetail ? "‹ Detail · escape returns to list" : "List · enter opens detail ›");
      body = [heading, ...(showDetail ? right.flatMap((line) => wrap(line, width)) : left)].slice(0, bodyHeight);
    }
  }
  if (input.state.help) {
    body = [input.theme.fg("warning", "Help: tab/shift-tab traverses every pane; Enter activates; mnemonics are optional."), ...body].slice(0, bodyHeight);
  }
  return Object.freeze([title, ...body.map((line) => finish(line, width)), bottom].slice(0, height));
}
