import type { KeybindingsManager, Theme } from "@earendil-works/pi-coding-agent";
import { CURSOR_MARKER, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { NativeInspectionDetailResultSchema } from "../../application/native-inspection-contract.js";
import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import { projectTerminalText } from "./pi-terminal-text.js";
import {
  PluginManagerActionRegistry,
  pluginManagerMenuActions,
  rowKeyIdentity,
  type PluginManagerRow,
  type PluginManagerState,
  type PluginManagerView,
} from "./plugin-manager-model.js";
import { NativeControlStatusTone, pluginManagerStatusTone, type PluginManagerStatusTone } from "./plugin-manager-status.js";

const VIEW_LABELS: Readonly<Record<PluginManagerView, string>> = Object.freeze({
  installed: "My Plugins",
  browse: "Discover",
  marketplaces: "Sources",
  updates: "Updates",
  health: "Health",
});

const VIEW_DESCRIPTIONS: Readonly<Record<PluginManagerView, string>> = Object.freeze({
  installed: "Plugins added for your user account or the current project.",
  browse: "Compatible plugins available from configured marketplace sources.",
  marketplaces: "Global catalog sources. Plugin scope is chosen when a plugin is added.",
  updates: "Available plugin revisions and notices that need attention.",
  health: "Runtime capabilities, recovery state, and blocked plugins.",
});

const VIEWS: readonly PluginManagerView[] = ["installed", "browse", "marketplaces", "updates", "health"];

function plain(value: unknown, limit = 2_048): string {
  return projectTerminalText(typeof value === "string" ? value : String(value ?? ""), limit).text;
}

function finish(line: string, width: number): string {
  return truncateToWidth(line, Math.max(1, width), "");
}

function wrap(line: string, width: number): readonly string[] {
  return wrapTextWithAnsi(line, Math.max(1, width)).map((entry) => finish(entry, width));
}

function frame(theme: Theme, width: number): string {
  return theme.fg("borderAccent", "─".repeat(Math.max(1, width)));
}

function statusToken(tone: PluginManagerStatusTone): Readonly<{ color: "success" | "warning" | "error" | "muted"; sigil: string }> {
  if (tone === "success") return { color: "success", sigil: "✓" };
  if (tone === "warning") return { color: "warning", sigil: "△" };
  if (tone === "error") return { color: "error", sigil: "!" };
  return { color: "muted", sigil: "○" };
}

function styledStatus(theme: Theme, status: string, tone = pluginManagerStatusTone(status)): string {
  const token = statusToken(tone);
  return theme.fg(token.color, `${token.sigil} ${plain(status, 128)}`);
}

function selectedRow(state: PluginManagerState): PluginManagerRow | undefined {
  if (state.focus.row === undefined) return state.page.rows[0];
  return state.page.rows.find((row) => rowKeyIdentity(row.key) === rowKeyIdentity(state.focus.row!)) ?? state.page.rows[0];
}

function selectedIndex(state: PluginManagerState): number {
  const row = selectedRow(state);
  return row === undefined ? -1 : state.page.rows.findIndex((candidate) => rowKeyIdentity(candidate.key) === rowKeyIdentity(row.key));
}

function boundedWindow(lines: readonly string[], selected: number, height: number): readonly string[] {
  const size = Math.max(1, height);
  const start = Math.max(0, Math.min(selected - Math.floor(size / 2), Math.max(0, lines.length - size)));
  return lines.slice(start, start + size);
}

function homeLines(state: PluginManagerState, theme: Theme, bodyHeight: number): readonly string[] {
  const sourceCount = state.view === "marketplaces" ? state.page.rows.length : undefined;
  const values: Readonly<Record<PluginManagerView, string>> = {
    installed: `${state.installedCount} installed`,
    browse: "browse compatible plugins",
    marketplaces: sourceCount === undefined ? "manage global sources" : `${sourceCount} configured`,
    updates: state.updateCounts.unresolved === 0 ? "none pending" : `${state.updateCounts.unresolved} need attention`,
    health: "runtime and capabilities",
  };
  const rows = VIEWS.map((view) => {
    const selected = view === state.view;
    const line = `${selected ? "→" : " "} ${VIEW_LABELS[view].padEnd(14)}  ${values[view]}`;
    return selected ? theme.bg("selectedBg", theme.fg("accent", line)) : line;
  });
  const title = theme.fg("accent", theme.bold("Plugin Manager"));
  if (bodyHeight <= 5) return [title, rows[VIEWS.indexOf(state.view)]!];
  return [title, "", ...rows, "", theme.fg("muted", VIEW_DESCRIPTIONS[state.view])];
}

function emptyMessage(view: PluginManagerView): string {
  if (view === "installed") return "No plugins added yet · press A to discover plugins";
  if (view === "browse") return "No plugins available · press A to add a source";
  if (view === "marketplaces") return "No sources configured · press A to add a GitHub marketplace";
  if (view === "updates") return "No pending plugin updates";
  return "Plugin host health is unavailable · press R to retry";
}

function queryLine(state: PluginManagerState, theme: Theme, focused: boolean): string {
  const active = state.focus.pane === "query";
  const marker = active && focused ? CURSOR_MARKER : "";
  return `${theme.fg(active ? "accent" : "muted", "/ search")}  ${plain(state.query, 256)}${marker}${active ? "_" : ""}`;
}

function listLines(state: PluginManagerState, theme: Theme, focused: boolean, bodyHeight: number): readonly string[] {
  const heading = `${theme.fg("accent", theme.bold("Plugin Manager"))} ${theme.fg("muted", `/ ${VIEW_LABELS[state.view]}`)}`;
  const rows = state.page.rows.map((row) => {
    const selected = selectedRow(state) !== undefined && rowKeyIdentity(selectedRow(state)!.key) === rowKeyIdentity(row.key);
    const line = `${selected ? "→" : " "} ${plain(row.title, 256)}  ${styledStatus(theme, row.status, row.statusTone)}`;
    return selected ? theme.bg("selectedBg", line) : line;
  });
  const available = Math.max(1, bodyHeight - 8);
  const visible = boundedWindow(rows, Math.max(0, selectedIndex(state)), available);
  if (bodyHeight <= 5) return [
    heading,
    ...(state.page.errorCode === undefined ? [] : [theme.fg("error", `! ${plain(state.page.errorCode, 64)}`)]),
    ...boundedWindow(rows, Math.max(0, selectedIndex(state)), Math.max(1, bodyHeight - 1)),
  ];
  const row = selectedRow(state);
  const description = row === undefined
    ? emptyMessage(state.view)
    : `${plain(row.subtitle, 512)}${row.scope === undefined ? "" : ` · ${row.scope}`}`;
  return [
    heading,
    "",
    queryLine(state, theme, focused),
    "",
    ...(state.page.errorCode === undefined ? [] : [theme.fg("error", `! ${plain(state.page.errorCode, 64)}`)]),
    ...visible,
    ...(state.page.loading ? [theme.fg("accent", "… loading current state")] : []),
    ...(state.page.next === undefined ? [] : [theme.fg("muted", "Page Down loads more")]),
    "",
    theme.fg("muted", description),
  ];
}

function sourceSummary(value: unknown): string {
  if (value === null || typeof value !== "object") return "unavailable";
  const source = value as Record<string, unknown>;
  const kind = plain(source.kind, 64);
  for (const key of ["location", "package"] as const) {
    const field = source[key];
    if (field !== null && typeof field === "object" && "text" in field) return `${kind}: ${plain((field as { text?: unknown }).text)}`;
  }
  return kind || "unavailable";
}

function detailLines(state: PluginManagerState, theme: Theme): readonly string[] {
  const row = selectedRow(state);
  const heading = `${theme.fg("accent", theme.bold("Plugin Manager"))} ${theme.fg("muted", `/ ${VIEW_LABELS[state.view]} / ${plain(row?.title ?? "Detail", 128)}`)}`;
  if (row === undefined) return [heading, "", theme.fg("muted", "No item selected")];
  if (state.detail.loading) return [heading, "", theme.fg("accent", "… loading exact details")];
  const lines: string[] = [heading, "", theme.bold(plain(row.plugin ?? row.title)), styledStatus(theme, row.status, row.statusTone), ""];
  if (row.key.subject === "health" && row.data !== null && typeof row.data === "object") {
    const health = row.data as { local?: { recovery?: unknown; runtime?: unknown }; update?: { state?: unknown; unresolvedCount?: unknown }; capabilities?: Record<string, { status?: unknown; explanation?: unknown }>; blocked?: readonly { plugin?: unknown; code?: unknown }[] };
    lines.push(`Recovery      ${plain(health.local?.recovery)}`, `Runtime       ${plain(health.local?.runtime)}`, `Updates       ${plain(health.update?.state)} · ${plain(health.update?.unresolvedCount)} unresolved`, "", theme.fg("accent", "Capabilities"));
    for (const [name, capability] of Object.entries(health.capabilities ?? {})) lines.push(`  ${styledStatus(theme, `${name} · ${plain(capability.status)}`)}`, `    ${theme.fg("muted", plain(capability.explanation))}`);
    for (const blocked of health.blocked ?? []) lines.push(theme.fg("error", `  ${plain(blocked.plugin)} · ${plain(blocked.code)}`));
  } else {
    const parsed = NativeInspectionDetailResultSchema.safeParse(state.detail.envelope?.data);
    if (parsed.success && parsed.data.kind === "found") {
      const detail = parsed.data.detail;
      lines.push(
        `Scope         ${row.scope ?? "unknown"}`,
        `Installed     ${plain(detail.summary.revision.installed?.text ?? "not installed")}`,
        `Available     ${plain(detail.summary.revision.available?.text ?? "not reported")}`,
        `Source        ${sourceSummary(detail.source)}`,
        "",
        theme.fg("accent", "Runtime surface"),
        `  ${detail.compatibility.components.counts.skills} skills · ${detail.compatibility.components.counts.hooks} command hooks · ${detail.compatibility.components.counts.mcpServers} MCP servers`,
        "",
        theme.fg("accent", "Compatibility / health"),
        `  ${styledStatus(theme, detail.compatibility.status)} · trust ${plain(detail.trust)}`,
        `  ${detail.compatibility.requirements.length} requirements · ${detail.diagnostics.length} diagnostics`,
      );
    } else {
      lines.push(`Scope         ${row.scope ?? "unknown"}`, `Source        ${plain(row.subtitle)}`, "", theme.fg("warning", "Exact detail is unavailable. Press R to retry."));
    }
  }
  const actions = pluginManagerMenuActions(state);
  if (actions.length > 0) lines.push("", theme.bg("selectedBg", theme.fg("accent", `→ Actions…     ${actions.length} available`)));
  return lines;
}

function actionLines(state: PluginManagerState, theme: Theme, bodyHeight: number): readonly string[] {
  const row = selectedRow(state);
  const actions = pluginManagerMenuActions(state);
  const selected = Math.max(0, actions.findIndex((action) => action === state.focus.action));
  const rows = actions.map((action, index) => {
    const line = `${index === selected ? "→" : " "} ${PluginManagerActionRegistry[action].label}`;
    return index === selected ? theme.bg("selectedBg", theme.fg("accent", line)) : line;
  });
  const action = actions[selected];
  return [
    `${theme.fg("accent", theme.bold("Plugin Manager"))} ${theme.fg("muted", `/ ${VIEW_LABELS[state.view]} / ${plain(row?.title ?? "Item")} / Actions`)}`,
    "",
    ...boundedWindow(rows, selected, Math.max(1, bodyHeight - 4)),
    "",
    theme.fg("muted", action === undefined ? "No actions available" : PluginManagerActionRegistry[action].description),
  ];
}

function envelopeLines(envelope: NativeControlEnvelope | undefined, theme: Theme): readonly string[] {
  if (envelope === undefined) return [];
  const lines = [`${styledStatus(theme, envelope.status, NativeControlStatusTone[envelope.status])} · exit ${envelope.exit.classification} (${envelope.exit.code})`];
  for (const field of envelope.human) lines.push(plain(field.text));
  for (const diagnostic of envelope.diagnostics) lines.push(theme.fg(diagnostic.severity === "error" ? "error" : diagnostic.severity === "warning" ? "warning" : "muted", `${diagnostic.code} · ${plain(diagnostic.action)}`));
  return lines;
}

function operationLines(state: PluginManagerState, theme: Theme): readonly string[] {
  const lines = [theme.fg("accent", theme.bold(`Plugin operation / ${plain(state.operation.action ?? "result")}`)), "", styledStatus(theme, state.operation.state)];
  for (const item of state.operation.frames) {
    if (item.type === "accepted") lines.push(`#${item.sequence} accepted ${plain(item.command)}`);
    else if (item.type === "progress") lines.push(`#${item.sequence} ${plain(item.phase)} ${plain(item.state)}${item.code === undefined ? "" : ` ${plain(item.code)}`}`);
  }
  lines.push(...envelopeLines(state.operation.envelope, theme));
  if (state.operation.state === "cancelling") lines.push(theme.fg("warning", "Cancellation requested; waiting for the owner result."));
  return lines;
}

function footer(state: PluginManagerState, theme: Theme, keybindings: KeybindingsManager): string {
  const key = (id: Parameters<KeybindingsManager["getKeys"]>[0], fallback: string) => plain(keybindings.getKeys(id)[0] ?? fallback, 32);
  const move = `${key("tui.select.up", "up")}/${key("tui.select.down", "down")} navigate`;
  if (state.operation.state !== "idle" || state.screen === "operation-result") return theme.fg("dim", `${move} · ${key("app.interrupt", "escape")} cancel/back`);
  if (state.focus.pane === "sections") return theme.fg("dim", `${move} · ${key("tui.select.confirm", "enter")} open · R refresh · ${key("app.interrupt", "escape")} close`);
  if (state.focus.pane === "actions") return theme.fg("dim", `${move} · ${key("tui.select.confirm", "enter")} run · ${key("app.interrupt", "escape")} back`);
  if (state.focus.pane === "detail") {
    const actionHint = pluginManagerMenuActions(state).length === 0 ? "" : `${key("tui.select.confirm", "enter")} actions · `;
    return theme.fg("dim", `${actionHint}R refresh · ${key("app.interrupt", "escape")} back`);
  }
  return theme.fg("dim", `${move} · ${key("tui.select.confirm", "enter")} inspect · / search · A add · R refresh · ${key("app.interrupt", "escape")} back`);
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
  const bodyHeight = Math.max(1, height - 3);
  let content: readonly string[];
  if (input.state.screen === "operation-result" || input.state.operation.state !== "idle") content = operationLines(input.state, input.theme);
  else if (input.state.focus.pane === "sections") content = homeLines(input.state, input.theme, bodyHeight);
  else if (input.state.focus.pane === "detail") content = detailLines(input.state, input.theme);
  else if (input.state.focus.pane === "actions") content = actionLines(input.state, input.theme, bodyHeight);
  else content = listLines(input.state, input.theme, input.focused === true, bodyHeight);
  const wrapped = content.flatMap((line) => wrap(line, width));
  const offset = input.state.operation.state !== "idle" || input.state.screen === "operation-result" ? input.state.scroll.operation : input.state.focus.pane === "detail" ? input.state.scroll.detail : 0;
  const body = wrapped.slice(offset, offset + bodyHeight);
  if (input.state.help) body.unshift(input.theme.fg("warning", "One list at a time: Enter opens · Escape returns one level · A adds · R refreshes."));
  return Object.freeze([
    frame(input.theme, width),
    ...body.slice(0, bodyHeight).map((line) => finish(line, width)),
    finish(footer(input.state, input.theme, input.keybindings), width),
    frame(input.theme, width),
  ].slice(0, height));
}
