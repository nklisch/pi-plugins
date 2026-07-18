import { NativeInspectionDetailResultSchema } from "../../application/native-inspection-contract.js";
import type { NativeControlDynamicCandidate } from "../../application/native-control-help.js";
import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import type { NativeControlFrame } from "../../application/native-control-progress.js";
import type { JsonValue } from "../../domain/schema.js";
import type { PluginManagerStatusTone } from "./plugin-manager-status.js";

export type PluginManagerView = "installed" | "browse" | "marketplaces" | "updates" | "health";
export type PluginManagerPane = "sections" | "query" | "list" | "detail" | "actions";
export type PluginManagerScrollRegion = "detail" | "operation";
export type PluginManagerScreen = "manager" | "install-inspect" | "install-configure" | "install-result" | "operation-result";

export const PluginManagerActionRegistry = Object.freeze({
  inspect: { label: "Inspect", description: "Load exact plugin details and executable inventory" },
  install: { label: "Add plugin", description: "Review trust and add the complete plugin" },
  enable: { label: "Enable", description: "Load this plugin's runtime components" },
  disable: { label: "Disable", description: "Stop loading runtime components but keep the plugin installed" },
  update: { label: "Review update", description: "Review available changes before replacing the active revision" },
  "uninstall-keep": { label: "Remove, keep data", description: "Uninstall the plugin and retain its persistent data" },
  "uninstall-delete": { label: "Remove and delete data", description: "Uninstall the plugin and erase its persistent data" },
  "marketplace-add": { label: "Add source", description: "Register another global marketplace source" },
  "marketplace-refresh": { label: "Refresh source", description: "Fetch the latest catalog from this source" },
  "marketplace-remove": { label: "Remove marketplace", description: "Unregister this source without inferring installed plugin state" },
  "notice-acknowledge": { label: "Acknowledge notice", description: "Mark this update notice as read" },
  "project-sync-apply": { label: "Project sync · apply intent", description: "Apply the project's declared plugin intent" },
  "project-sync-publish": { label: "Project sync · publish intent", description: "Publish current project plugin intent" },
  "project-sync-merge": { label: "Project sync · resolve merge", description: "Resolve competing project plugin intent" },
  "browse-plugins": { label: "Discover plugins", description: "Browse compatible plugins from configured sources" },
  "diagnose-host": { label: "Run diagnostics", description: "Inspect plugin host capabilities and blocked plugins" },
} as const);
export type PluginManagerActionId = keyof typeof PluginManagerActionRegistry;

export type PluginManagerRowKey = Readonly<{
  subject: "installed" | "candidate" | "marketplace" | "notice" | "health";
  key: string;
  snapshotId?: string;
  detailId?: string;
}>;

export type PluginManagerRow = Readonly<{
  key: PluginManagerRowKey;
  title: string;
  subtitle: string;
  status: string;
  statusTone?: PluginManagerStatusTone;
  scope?: "user" | "project";
  plugin?: string;
  completion: NativeControlDynamicCandidate;
  data: JsonValue;
}>;

export type PluginManagerDetailState = Readonly<{
  loading: boolean;
  request: number;
  row?: PluginManagerRowKey;
  envelope?: NativeControlEnvelope;
}>;

export type PluginManagerOperationState = Readonly<{
  state: "idle" | "running" | "cancelling" | "finished";
  action?: string;
  frames: readonly NativeControlFrame[];
  envelope?: NativeControlEnvelope;
}>;

export type PluginManagerState = Readonly<{
  screen: PluginManagerScreen;
  view: PluginManagerView;
  focus: Readonly<{ pane: PluginManagerPane; row?: PluginManagerRowKey; action?: string }>;
  query: string;
  page: Readonly<{
    rows: readonly PluginManagerRow[];
    next?: string;
    loading: boolean;
    request: number;
    pages: number;
    append: boolean;
    errorCode?: string;
  }>;
  detail: PluginManagerDetailState;
  installedCount: number;
  updateCounts: Readonly<{ unread: number; unresolved: number }>;
  operation: PluginManagerOperationState;
  viewport: Readonly<{ columns: number; rows: number }>;
  scroll: Readonly<Record<PluginManagerScrollRegion, number>>;
  help: boolean;
  closed: boolean;
}>;

export type PluginManagerIntent =
  | Readonly<{ type: "set-view"; view: PluginManagerView }>
  | Readonly<{ type: "set-query"; query: string }>
  | Readonly<{ type: "submit-search" }>
  | Readonly<{ type: "move-selection"; delta: number }>
  | Readonly<{ type: "move-action"; delta: number }>
  | Readonly<{ type: "scroll"; region: PluginManagerScrollRegion; delta: number }>
  | Readonly<{ type: "select-row"; row: PluginManagerRowKey }>
  | Readonly<{ type: "open-section" }>
  | Readonly<{ type: "return-sections" }>
  | Readonly<{ type: "open-detail" }>
  | Readonly<{ type: "open-actions" }>
  | Readonly<{ type: "return-detail" }>
  | Readonly<{ type: "detail-back" }>
  | Readonly<{ type: "focus-query" }>
  | Readonly<{ type: "next-page" }>
  | Readonly<{ type: "refresh"; scope?: "view" | "detail" | "all" }>
  | Readonly<{ type: "toggle-help" }>
  | Readonly<{ type: "resized"; columns: number; rows: number }>
  | Readonly<{ type: "action"; action: string }>
  | Readonly<{ type: "cancel-operation" }>
  | Readonly<{ type: "return-manager" }>
  | Readonly<{ type: "close" }>;

export type PluginManagerEvent =
  | Readonly<{ type: "intent"; intent: PluginManagerIntent }>
  | Readonly<{ type: "page-loading"; request: number; append: boolean }>
  | Readonly<{ type: "page-loaded"; request: number; rows: readonly PluginManagerRow[]; next?: string; append: boolean }>
  | Readonly<{ type: "page-failed"; request: number; code: string }>
  | Readonly<{ type: "detail-loading"; request: number; row: PluginManagerRowKey }>
  | Readonly<{ type: "detail-loaded"; request: number; row: PluginManagerRowKey; envelope: NativeControlEnvelope }>
  | Readonly<{ type: "select-row"; row: PluginManagerRowKey }>
  | Readonly<{ type: "focus"; pane: PluginManagerPane; action?: string }>
  | Readonly<{ type: "update-counts"; unread: number; unresolved: number }>
  | Readonly<{ type: "frame"; frame: NativeControlFrame }>
  | Readonly<{ type: "operation-started"; action: string }>
  | Readonly<{ type: "operation-cancelling" }>
  | Readonly<{ type: "operation-abandoned" }>
  | Readonly<{ type: "operation-finished"; envelope: NativeControlEnvelope }>
  | Readonly<{ type: "screen"; screen: PluginManagerScreen }>
  | Readonly<{ type: "resized"; columns: number; rows: number }>
  | Readonly<{ type: "reset-from-authority" }>
  | Readonly<{ type: "closed" }>;

const EMPTY_OPERATION: PluginManagerOperationState = Object.freeze({ state: "idle", frames: Object.freeze([]) });

export function createPluginManagerState(): PluginManagerState {
  return Object.freeze({
    screen: "manager",
    view: "installed",
    focus: Object.freeze({ pane: "sections" }),
    query: "",
    page: Object.freeze({ rows: Object.freeze([]), loading: false, request: 0, pages: 0, append: false }),
    detail: Object.freeze({ loading: false, request: 0 }),
    installedCount: 0,
    updateCounts: Object.freeze({ unread: 0, unresolved: 0 }),
    operation: EMPTY_OPERATION,
    viewport: Object.freeze({ columns: 100, rows: 24 }),
    scroll: Object.freeze({ detail: 0, operation: 0 }),
    help: false,
    closed: false,
  });
}

export function rowKeyIdentity(key: PluginManagerRowKey): string {
  return `${key.subject}\0${key.key}\0${key.snapshotId ?? ""}\0${key.detailId ?? ""}`;
}

function sameRow(left: PluginManagerRowKey | undefined, right: PluginManagerRowKey | undefined): boolean {
  return left !== undefined && right !== undefined && rowKeyIdentity(left) === rowKeyIdentity(right);
}

export function pluginManagerRowActions(row: PluginManagerRow | undefined): readonly PluginManagerActionId[] {
  if (row === undefined || row.key.subject === "health") return Object.freeze([]);
  if (row.key.subject === "candidate") return Object.freeze(["inspect", "install"]);
  if (row.key.subject === "marketplace") return Object.freeze(["marketplace-refresh", "marketplace-remove"]);
  if (row.key.subject === "notice") return Object.freeze(["inspect", "notice-acknowledge"]);
  return Object.freeze(["inspect", "uninstall-keep", "uninstall-delete"]);
}

/** Derive actions from the selected authoritative detail rather than offering contradictory lifecycle verbs. */
export function pluginManagerAvailableActions(state: PluginManagerState): readonly PluginManagerActionId[] {
  const row = state.focus.row === undefined
    ? state.page.rows[0]
    : state.page.rows.find((candidate) => rowKeyIdentity(candidate.key) === rowKeyIdentity(state.focus.row!));
  if (state.view === "marketplaces") return Object.freeze(["marketplace-add", ...pluginManagerRowActions(row)]);
  if (state.view === "health") return Object.freeze(["diagnose-host"]);
  if (row === undefined) {
    if (state.view === "installed") return Object.freeze(["browse-plugins", "marketplace-add"]);
    if (state.view === "browse") return Object.freeze(["marketplace-add"]);
    return Object.freeze([]);
  }
  if (row.key.subject !== "installed") return pluginManagerRowActions(row);
  const detail = NativeInspectionDetailResultSchema.safeParse(
    state.detail.row !== undefined && rowKeyIdentity(state.detail.row) === rowKeyIdentity(row.key)
      ? state.detail.envelope?.data
      : undefined,
  );
  if (!detail.success || detail.data.kind !== "found") return Object.freeze(["inspect"]);
  const lifecycle = detail.data.detail.lifecycle;
  const actions: PluginManagerActionId[] = ["inspect"];
  if (lifecycle?.activationIntent === "enabled") actions.push("disable");
  else if (lifecycle?.activationIntent === "disabled") actions.push("enable");
  if (lifecycle?.update !== undefined && !["current", "not-applicable", "unknown"].includes(lifecycle.update)) actions.push("update");
  actions.push("uninstall-keep", "uninstall-delete");
  if (row.scope === "project") actions.push("project-sync-apply", "project-sync-publish", "project-sync-merge");
  return Object.freeze(actions);
}

/** Actions shown after detail is already open; Inspect is navigation, not a user operation. */
export function pluginManagerMenuActions(state: PluginManagerState): readonly PluginManagerActionId[] {
  return Object.freeze(pluginManagerAvailableActions(state).filter((action) => action !== "inspect"));
}

function selectedIndex(state: PluginManagerState): number {
  const selected = state.focus.row;
  if (selected === undefined) return state.page.rows.length === 0 ? -1 : 0;
  return state.page.rows.findIndex((row) => sameRow(row.key, selected));
}

function resetPage(state: PluginManagerState, view: PluginManagerView, query = state.query): PluginManagerState {
  return Object.freeze({
    ...state,
    view,
    query,
    focus: Object.freeze({ pane: "sections" }),
    page: Object.freeze({ rows: Object.freeze([]), loading: false, request: state.page.request, pages: 0, append: false }),
    detail: Object.freeze({ loading: false, request: state.detail.request }),
    scroll: Object.freeze({ ...state.scroll, detail: 0 }),
  });
}

function reduceIntent(state: PluginManagerState, intent: PluginManagerIntent): PluginManagerState {
  if (intent.type === "set-view") return intent.view === state.view ? state : resetPage(state, intent.view);
  if (intent.type === "set-query") return Object.freeze({ ...state, query: intent.query });
  if (intent.type === "submit-search") return Object.freeze({ ...state, focus: Object.freeze({ pane: "list", ...(state.focus.row === undefined ? {} : { row: state.focus.row }) }) });
  if (intent.type === "select-row") return Object.freeze({ ...state, focus: Object.freeze({ pane: "list", row: intent.row }) });
  if (intent.type === "move-selection") {
    if (state.page.rows.length === 0) return state;
    const current = Math.max(0, selectedIndex(state));
    const index = Math.max(0, Math.min(state.page.rows.length - 1, current + intent.delta));
    return Object.freeze({ ...state, focus: Object.freeze({ pane: "list", row: state.page.rows[index]!.key }) });
  }
  if (intent.type === "move-action") {
    const row = state.page.rows[Math.max(0, selectedIndex(state))];
    const actions = pluginManagerMenuActions(state);
    if (actions.length === 0) return state;
    const current = Math.max(0, actions.indexOf(state.focus.action as PluginManagerActionId));
    const action = actions[(current + intent.delta + actions.length) % actions.length]!;
    return Object.freeze({ ...state, focus: Object.freeze({ pane: "actions", ...(row === undefined ? {} : { row: row.key }), action }) });
  }
  if (intent.type === "scroll") {
    return Object.freeze({ ...state, scroll: Object.freeze({ ...state.scroll, [intent.region]: Math.max(0, state.scroll[intent.region] + intent.delta) }) });
  }
  if (intent.type === "open-section") {
    const row = state.page.rows[Math.max(0, selectedIndex(state))];
    return Object.freeze({ ...state, focus: Object.freeze({ pane: "list", ...(row === undefined ? {} : { row: row.key }) }) });
  }
  if (intent.type === "return-sections") return Object.freeze({ ...state, focus: Object.freeze({ pane: "sections" }) });
  if (intent.type === "open-detail") {
    const index = Math.max(0, selectedIndex(state));
    const row = state.page.rows[index];
    return row === undefined ? state : Object.freeze({ ...state, focus: Object.freeze({ pane: "detail", row: row.key }) });
  }
  if (intent.type === "open-actions") {
    const row = state.page.rows[Math.max(0, selectedIndex(state))];
    const action = pluginManagerMenuActions(state)[0];
    return action === undefined ? state : Object.freeze({ ...state, focus: Object.freeze({ pane: "actions", ...(row === undefined ? {} : { row: row.key }), action }) });
  }
  if (intent.type === "return-detail") return Object.freeze({ ...state, focus: Object.freeze({ pane: "detail", ...(state.focus.row === undefined ? {} : { row: state.focus.row }) }) });
  if (intent.type === "detail-back") return Object.freeze({ ...state, focus: Object.freeze({ pane: "list", ...(state.focus.row === undefined ? {} : { row: state.focus.row }) }) });
  if (intent.type === "focus-query") return Object.freeze({ ...state, focus: Object.freeze({ pane: "query" }) });
  if (intent.type === "toggle-help") return Object.freeze({ ...state, help: !state.help });
  if (intent.type === "resized") return Object.freeze({ ...state, viewport: Object.freeze({ columns: Math.max(1, intent.columns), rows: Math.max(1, intent.rows) }) });
  if (intent.type === "cancel-operation" && state.operation.state === "running") {
    return Object.freeze({ ...state, operation: Object.freeze({ ...state.operation, state: "cancelling" }) });
  }
  if (intent.type === "return-manager") return Object.freeze({ ...state, screen: "manager", operation: EMPTY_OPERATION, focus: Object.freeze({ pane: "list", ...(state.focus.row === undefined ? {} : { row: state.focus.row }) }) });
  if (intent.type === "close") return Object.freeze({ ...state, closed: true });
  return state;
}

function boundedAppend(previous: readonly PluginManagerRow[], next: readonly PluginManagerRow[], pages: number): readonly PluginManagerRow[] {
  const merged = [...previous];
  const known = new Set(merged.map((row) => rowKeyIdentity(row.key)));
  for (const row of next) {
    if (!known.has(rowKeyIdentity(row.key))) merged.push(row);
  }
  if (pages <= 5) return Object.freeze(merged);
  const pageSize = Math.max(1, next.length);
  return Object.freeze(merged.slice(Math.min(pageSize, merged.length)));
}

/** Pure presentation reducer. Authoritative state remains in facade envelopes. */
export function pluginManagerReducer(state: PluginManagerState, event: PluginManagerEvent): PluginManagerState {
  if (event.type === "intent") return reduceIntent(state, event.intent);
  if (event.type === "select-row") return reduceIntent(state, { type: "select-row", row: event.row });
  if (event.type === "focus") return Object.freeze({ ...state, focus: Object.freeze({ pane: event.pane, ...(event.action === undefined ? {} : { action: event.action }), ...(state.focus.row === undefined ? {} : { row: state.focus.row }) }) });
  if (event.type === "page-loading") {
    const { errorCode: _errorCode, ...page } = state.page;
    return Object.freeze({ ...state, page: Object.freeze({ ...page, request: event.request, loading: true, append: event.append }) });
  }
  if (event.type === "page-loaded") {
    if (event.request !== state.page.request) return state;
    const priorIndex = Math.max(0, selectedIndex(state));
    const pages = event.append ? state.page.pages + 1 : 1;
    const rows = event.append ? boundedAppend(state.page.rows, event.rows, pages) : Object.freeze([...event.rows]);
    const existing = state.focus.row === undefined ? undefined : rows.find((row) => sameRow(row.key, state.focus.row));
    const fallback = rows[Math.min(priorIndex, Math.max(0, rows.length - 1))];
    const row = existing?.key ?? fallback?.key;
    return Object.freeze({
      ...state,
      focus: Object.freeze({ pane: state.focus.pane, ...(row === undefined ? {} : { row }), ...(state.focus.action === undefined ? {} : { action: state.focus.action }) }),
      installedCount: state.view === "installed" ? rows.length : state.installedCount,
      page: Object.freeze({ rows, loading: false, request: event.request, pages: Math.min(5, pages), append: event.append, ...(event.next === undefined ? {} : { next: event.next }) }),
    });
  }
  if (event.type === "page-failed") {
    if (event.request !== state.page.request) return state;
    return Object.freeze({ ...state, page: Object.freeze({ ...state.page, loading: false, errorCode: event.code }) });
  }
  if (event.type === "detail-loading") return Object.freeze({ ...state, detail: Object.freeze({ loading: true, request: event.request, row: event.row }) });
  if (event.type === "detail-loaded") {
    if (event.request !== state.detail.request || !sameRow(event.row, state.detail.row)) return state;
    return Object.freeze({ ...state, detail: Object.freeze({ loading: false, request: event.request, row: event.row, envelope: event.envelope }) });
  }
  if (event.type === "update-counts") return Object.freeze({ ...state, updateCounts: Object.freeze({ unread: event.unread, unresolved: event.unresolved }) });
  if (event.type === "operation-started") return Object.freeze({ ...state, operation: Object.freeze({ state: "running", action: event.action, frames: Object.freeze([]) }) });
  if (event.type === "operation-cancelling") {
    if (state.operation.state !== "running") return state;
    return Object.freeze({ ...state, operation: Object.freeze({ ...state.operation, state: "cancelling" }) });
  }
  if (event.type === "operation-abandoned") return Object.freeze({ ...state, screen: "manager", operation: EMPTY_OPERATION });
  if (event.type === "frame") return Object.freeze({ ...state, operation: Object.freeze({ ...state.operation, frames: Object.freeze([...state.operation.frames.slice(-199), event.frame]) }), scroll: Object.freeze({ ...state.scroll, operation: 0 }) });
  if (event.type === "operation-finished") return Object.freeze({ ...state, screen: "operation-result", operation: Object.freeze({ ...state.operation, state: "finished", envelope: event.envelope }) });
  if (event.type === "screen") return Object.freeze({ ...state, screen: event.screen });
  if (event.type === "resized") return Object.freeze({ ...state, viewport: Object.freeze({ columns: Math.max(1, event.columns), rows: Math.max(1, event.rows) }) });
  if (event.type === "reset-from-authority") return resetPage(state, state.view);
  if (event.type === "closed") return createPluginManagerState();
  return state;
}
