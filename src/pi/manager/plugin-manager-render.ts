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
import { PluginManagerActionRegistry, pluginManagerAvailableActions, rowKeyIdentity, type PluginManagerRow, type PluginManagerState, type PluginManagerView } from "./plugin-manager-model.js";
import { NativeControlStatusTone, pluginManagerStatusTone, type PluginManagerStatusTone } from "./plugin-manager-status.js";

const VIEW_LABELS: Readonly<Record<PluginManagerView, string>> = Object.freeze({
  installed: "My Plugins",
  browse: "Discover",
  marketplaces: "Sources",
  updates: "Updates",
  health: "Health",
});

function plain(value: unknown, limit = 2_048): string {
  return projectTerminalText(typeof value === "string" ? value : String(value ?? ""), limit).text;
}

function statusToken(tone: PluginManagerStatusTone): Readonly<{ color: "success" | "warning" | "error" | "muted"; sigil: string }> {
  if (tone === "success") return { color: "success", sigil: "✓" };
  if (tone === "warning") return { color: "warning", sigil: "△" };
  if (tone === "error") return { color: "error", sigil: "!" };
  return { color: "muted", sigil: "○" };
}

function styledStatus(theme: Theme, status: string, tone = pluginManagerStatusTone(status)): string {
  const value = plain(status, 128);
  const token = statusToken(tone);
  return theme.fg(token.color, `${token.sigil} ${value}`);
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

function window(lines: readonly string[], offset: number, height: number): readonly string[] {
  const boundedHeight = Math.max(1, height);
  const max = Math.max(0, lines.length - boundedHeight);
  const start = Math.max(0, Math.min(Math.floor(offset), max));
  return lines.slice(start, start + boundedHeight);
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
    `${theme.fg("accent", "Final owner result")} ${styledStatus(theme, envelope.status, NativeControlStatusTone[envelope.status])}`,
    `${theme.fg("muted", "exit")} ${plain(envelope.exit.classification)} (${envelope.exit.code})`,
  ];
  for (const field of envelope.human) lines.push(plain(field.text));
  for (const diagnostic of envelope.diagnostics) {
    lines.push(`${theme.fg(diagnostic.severity === "error" ? "error" : diagnostic.severity === "warning" ? "warning" : "muted", diagnostic.code)} · ${plain(diagnostic.action)}`);
  }
  return lines;
}

type DetailSegments = Readonly<{
  summary: readonly string[];
  disclosure: readonly string[];
  actions: readonly string[];
}>;

function detailSegments(state: PluginManagerState, theme: Theme): DetailSegments {
  const row = selectedRow(state);
  if (row === undefined) return {
    summary: [theme.fg("muted", `No ${VIEW_LABELS[state.view].toLowerCase()} details`)],
    disclosure: [],
    actions: [theme.fg("accent", "Actions"), ...pluginManagerAvailableActions(state).map((action) => `  ${PluginManagerActionRegistry[action].label}`)],
  };
  const summary: string[] = [
    theme.bold(plain(row.plugin ?? row.title)),
    styledStatus(theme, row.status, row.statusTone),
    "",
    ...(row.key.subject === "health" ? [] : [`${theme.fg("muted", "scope")} ${plain(scopeName(row))}`]),
  ];
  if (row.key.subject === "health" && row.data !== null && typeof row.data === "object") {
    const health = row.data as { local?: { recovery?: unknown; runtime?: unknown }; update?: { state?: unknown; unreadCount?: unknown; unresolvedCount?: unknown }; capabilities?: Record<string, { status?: unknown; explanation?: unknown }>; blocked?: readonly { plugin?: unknown; code?: unknown }[] };
    summary.push(
      `${theme.fg("muted", "recovery")} ${plain(health.local?.recovery)}`,
      `${theme.fg("muted", "runtime")} ${plain(health.local?.runtime)}`,
      `${theme.fg("muted", "updates")} ${plain(health.update?.state)} · ${plain(health.update?.unreadCount)} unread · ${plain(health.update?.unresolvedCount)} unresolved`,
      "",
      theme.fg("accent", "Capabilities"),
    );
    for (const [name, capability] of Object.entries(health.capabilities ?? {})) {
      summary.push(`  ${styledStatus(theme, `${name} · ${plain(capability.status)}`)}`, `    ${theme.fg("muted", plain(capability.explanation))}`);
    }
    if ((health.blocked?.length ?? 0) > 0) {
      summary.push("", theme.fg("error", "Blocked plugins"));
      for (const blocked of health.blocked ?? []) summary.push(`  ${plain(blocked.plugin)} · ${plain(blocked.code)}`);
    }
  }
  const disclosure: string[] = [];
  const parsed = NativeInspectionDetailResultSchema.safeParse(state.detail.envelope?.data);
  if (parsed.success && parsed.data.kind === "found") {
    const detail = parsed.data.detail;
    summary.push(
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
      summary.push("", theme.fg("accent", "Configuration"));
      for (const field of detail.configuration) {
        summary.push(`  ${plain(field.label.text)} · ${field.required ? "required" : "optional"} · ${plain(field.state)}${field.sensitive ? " · secret" : ""}`);
      }
    }
    const componentsFocused = state.focus.pane === "disclosure" && state.focus.disclosure === "components";
    disclosure.push("", componentsFocused ? theme.bg("selectedBg", "> Component inventory") : theme.fg("accent", "Component inventory"));
    if (state.disclosure.has("components")) {
      for (const component of [...detail.compatibility.components.skills, ...detail.compatibility.components.hooks, ...detail.compatibility.components.mcpServers, ...detail.compatibility.components.foreign]) {
        disclosure.push(`  ${plain(component.kind)} · ${plain(component.componentId)} · ${plain(component.verdict)}`);
      }
      if (disclosure.length === 2) disclosure.push("  No declared components");
    } else disclosure.push("  [Enter] expand complete executable inventory");

    const diagnosticsFocused = state.focus.pane === "disclosure" && state.focus.disclosure === "diagnostics";
    disclosure.push("", diagnosticsFocused ? theme.bg("selectedBg", "> Diagnostics") : theme.fg("accent", "Diagnostics"));
    if (state.disclosure.has("diagnostics")) {
      if (detail.diagnostics.length === 0) disclosure.push("  No diagnostics");
      for (const diagnostic of detail.diagnostics) disclosure.push(`  ${diagnostic.severity.toUpperCase()} ${plain(diagnostic.code)} · ${plain(diagnostic.summary.text)}`);
    } else disclosure.push(`  [Enter] expand all ${detail.diagnostics.length} diagnostics`);
  } else {
    summary.push(
      "",
      theme.fg("accent", "Runtime surface"),
      "  Select Inspect to load exact component counts and executable detail.",
      "",
      theme.fg("accent", "Compatibility / health"),
      `  ${styledStatus(theme, row.status, row.statusTone)}`,
      ...envelopeLines(state.detail.envelope, theme).map((line) => `  ${line}`),
    );
  }
  const actions: string[] = ["", theme.fg("accent", "Actions")];
  for (const action of pluginManagerAvailableActions(state)) {
    const label = PluginManagerActionRegistry[action].label;
    const focused = state.focus.pane === "actions" && state.focus.action === action;
    actions.push(focused ? theme.bg("selectedBg", `> ${label}`) : `  ${label}`);
  }
  return { summary, disclosure, actions };
}

function detailLines(state: PluginManagerState, theme: Theme): Readonly<{ lines: readonly string[]; offset: number }> {
  const segments = detailSegments(state, theme);
  const lines = [...segments.summary, ...segments.disclosure, ...segments.actions];
  if (state.focus.pane === "actions") {
    const row = selectedRow(state);
    const focusedIndex = pluginManagerAvailableActions(state).findIndex((action) => action === state.focus.action);
    // Keep the exact focused action visible even when a small terminal cannot
    // display the summary, disclosures, and full action list together.
    const focusOffset = focusedIndex < 0 ? 0 : focusedIndex;
    return { lines, offset: segments.summary.length + segments.disclosure.length + Math.max(state.scroll.actions, focusOffset) };
  }
  if (state.focus.pane === "disclosure") {
    let anchor = segments.summary.length;
    if (state.focus.disclosure === "diagnostics") {
      const index = segments.disclosure.findIndex((line) => plain(line).includes("Diagnostics"));
      if (index >= 0) anchor += index;
    }
    return { lines, offset: anchor + state.scroll.disclosure };
  }
  return { lines, offset: state.scroll.detail };
}

function listLines(state: PluginManagerState, theme: Theme, focused: boolean): string[] {
  const marker = focused && state.focus.pane === "query" ? CURSOR_MARKER : "";
  const query = plain(state.query, 256);
  const lines = [`${theme.fg(state.focus.pane === "query" ? "accent" : "muted", "/ filter")} ${query}${marker}${state.focus.pane === "query" ? "_" : ""}`];
  if (state.page.errorCode !== undefined) lines.push(theme.fg("error", `! ${plain(state.page.errorCode, 64)}`));
  if (state.page.rows.length === 0) {
    const empty = state.view === "installed"
      ? "No plugins added yet · press A to discover plugins"
      : state.view === "browse"
        ? "No plugins available · press A to add a source"
        : state.view === "marketplaces"
          ? "No sources configured · press A to add a GitHub marketplace"
          : state.view === "updates"
            ? "No pending plugin updates"
            : "Plugin host health is unavailable · press R to retry";
    lines.push(theme.fg("muted", empty));
  }
  for (const row of state.page.rows) {
    const selected = state.focus.row !== undefined && rowKeyIdentity(state.focus.row) === rowKeyIdentity(row.key);
    const title = `${selected ? ">" : " "} ${plain(row.title, 256)}  ${styledStatus(theme, row.status, row.statusTone)}`;
    lines.push(selected ? theme.bg("selectedBg", title) : title);
    lines.push(theme.fg("muted", `    ${plain(row.subtitle, 512)}`));
  }
  if (state.page.loading) lines.push(theme.fg("accent", "… loading authoritative snapshot"));
  if (state.page.next !== undefined) lines.push(theme.fg("muted", "Page down at list end: load next facade page"));
  return lines;
}

function tabLine(state: PluginManagerState, theme: Theme): string {
  const tabs = (["installed", "browse", "marketplaces", "updates", "health"] as const).map((view) => {
    const count = view === "updates" ? ` ${state.updateCounts.unresolved}` : view === "installed" ? ` ${state.installedCount}` : "";
    const label = `${VIEW_LABELS[view]}${count}`;
    return state.view === view ? theme.bg("selectedBg", theme.fg("accent", `[${label}]`)) : theme.fg("muted", label);
  });
  return `${theme.fg("accent", theme.bold("PI / PLUGINS"))}  ${tabs.join("  ")}`;
}

function footer(theme: Theme, keybindings: KeybindingsManager): string {
  const key = (id: Parameters<KeybindingsManager["getKeys"]>[0], fallback: string) => plain(keybindings.getKeys(id)[0] ?? fallback, 32);
  return theme.fg("dim", `${key("tui.select.up", "up")}/${key("tui.select.down", "down")} move · ${key("tui.select.confirm", "enter")} open/action · tab focus · A add · / search · r refresh · ? help · ${key("app.interrupt", "escape")} back/close`);
}

function operationLines(state: PluginManagerState, theme: Theme): string[] {
  const lines = [theme.fg("accent", theme.bold(`Plugin operation · ${plain(state.operation.action ?? "result")}`)), styledStatus(theme, state.operation.state)];
  for (const frame of state.operation.frames) {
    if (frame.type === "accepted") lines.push(`#${frame.sequence} accepted ${plain(frame.command)}`);
    else if (frame.type === "progress") lines.push(`#${frame.sequence} ${plain(frame.phase)} ${plain(frame.state)}${frame.code === undefined ? "" : ` ${plain(frame.code)}`}`);
  }
  lines.push(...envelopeLines(state.operation.envelope, theme));
  if (state.operation.state === "cancelling") lines.push(theme.fg("warning", "Cancellation requested once; waiting for the owner result."));
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
    const operation = operationLines(input.state, input.theme).flatMap((line) => wrap(line, width));
    body = [...window(operation, input.state.scroll.operation, bodyHeight)];
  } else {
    const list = listLines(input.state, input.theme, input.focused === true).flatMap((line) => wrap(line, width));
    const detail = detailLines(input.state, input.theme);
    if (width >= 92) {
      const leftWidth = Math.max(30, Math.floor(width * 0.34));
      const rightWidth = Math.max(1, width - leftWidth - 1);
      const leftWrapped = listLines(input.state, input.theme, input.focused === true).flatMap((line) => wrap(line, leftWidth));
      const rightWrapped = detail.lines.flatMap((line) => wrap(line, rightWidth));
      const leftWindow = window(leftWrapped, input.state.scroll.list * 2, bodyHeight);
      const rightWindow = window(rightWrapped, detail.offset, bodyHeight);
      body = Array.from({ length: bodyHeight }, (_, index) => `${pad(leftWindow[index] ?? "", leftWidth)}${input.theme.fg("border", "│")}${finish(rightWindow[index] ?? "", rightWidth)}`);
    } else {
      const showDetail = input.state.focus.pane === "detail" || input.state.focus.pane === "disclosure" || input.state.focus.pane === "actions";
      const heading = input.theme.fg("borderAccent", showDetail ? "‹ Detail · escape returns to list" : "List · enter opens detail ›");
      const content = showDetail
        ? detail.lines.flatMap((line) => wrap(line, width))
        : list;
      const offset = showDetail ? detail.offset : input.state.scroll.list * 2;
      body = [heading, ...window(content, offset, Math.max(1, bodyHeight - 1))];
    }
  }
  if (input.state.help) {
    body = [input.theme.fg("warning", "Help: ←/→ section · tab/shift-tab focus · ↑/↓ move · Enter activate · A add · R refresh · Escape back."), ...body].slice(0, bodyHeight);
  }
  return Object.freeze([title, ...body.map((line) => finish(line, width)), bottom].slice(0, height));
}
