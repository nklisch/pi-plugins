import type { SessionShutdownEvent } from "@earendil-works/pi-coding-agent";
import { NativeInspectionPageSchema } from "../../application/native-inspection-contract.js";
import {
  NativeControlMarketplaceCatalogResponseSchema,
  NativeControlMarketplaceListResponseSchema,
} from "../../application/native-control-safe-projection.js";
import {
  NativeUpdateNotificationPageSchema,
  NativeUpdateStatusSchema,
} from "../../application/native-update-contract.js";
import type { NativeControlDynamicCandidate } from "../../application/native-control-help.js";
import type { NativeControlExecutionReport } from "../../application/ports/native-control-execution.js";
import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import type { NativeControlFrame } from "../../application/native-control-progress.js";
import type { JsonValue } from "../../domain/schema.js";
import { detailCommand, pageCommand, updateStatusCommand } from "./plugin-manager-commands.js";
import {
  createPluginManagerState,
  pluginManagerReducer,
  rowKeyIdentity,
  type PluginManagerEvent,
  type PluginManagerIntent,
  type PluginManagerRow,
  type PluginManagerRowKey,
  type PluginManagerState,
} from "./plugin-manager-model.js";

type PluginManagerControllerActionResult = Readonly<{
  envelope: NativeControlEnvelope;
  presentation: "local" | "successor";
}>;

export type PluginManagerControlExecutor = (
  argv: readonly string[],
  signal: AbortSignal,
) => Promise<NativeControlExecutionReport>;

export interface PluginManagerController {
  state(): PluginManagerState;
  dispatch(intent: PluginManagerIntent): void;
  refresh(scope?: "view" | "detail" | "all"): Promise<void>;
  dynamicCompletions(): readonly NativeControlDynamicCandidate[];
  subscribe(listener: (state: PluginManagerState) => void): () => void;
  observe(event: Readonly<{ type: "frame"; frame: NativeControlFrame }> | Readonly<{ type: "operation-cancelling" }>): void;
  idle(): Promise<void>;
  close(reason: SessionShutdownEvent["reason"]): Promise<void>;
}

function safe(text: string) {
  return Object.freeze({ text, escaped: false, truncated: false });
}

function scopeKind(value: unknown): "user" | "project" | undefined {
  if (value !== null && typeof value === "object" && "kind" in value) {
    const kind = (value as { kind?: unknown }).kind;
    if (kind === "user" || kind === "project") return kind;
  }
  return undefined;
}

function installedRows(envelope: NativeControlEnvelope): readonly PluginManagerRow[] | undefined {
  const parsed = NativeInspectionPageSchema.safeParse(envelope.data);
  if (!parsed.success) return undefined;
  return Object.freeze(parsed.data.items.map((item) => {
    const scope = scopeKind(item.scope);
    return Object.freeze({
      key: Object.freeze({ subject: "installed" as const, key: `${scope ?? "unknown"}:${item.plugin}`, snapshotId: parsed.data.snapshotId, detailId: item.detailId }),
      title: item.name.text,
      subtitle: `${item.marketplace.text} · ${scope ?? "unknown scope"}`,
      status: item.condition,
      ...(scope === undefined ? {} : { scope }),
      plugin: item.plugin,
      completion: Object.freeze({ category: "plugin" as const, value: item.plugin, safe: item.name }),
      data: item as unknown as JsonValue,
    });
  }));
}

function browseRows(envelope: NativeControlEnvelope): readonly PluginManagerRow[] | undefined {
  const parsed = NativeControlMarketplaceCatalogResponseSchema.safeParse(envelope.data);
  if (!parsed.success) return undefined;
  return Object.freeze(parsed.data.candidates.map((item) => {
    const scope = scopeKind(item.scope);
    return Object.freeze({
      key: Object.freeze({ subject: "candidate" as const, key: item.id, snapshotId: item.snapshot }),
      title: item.name,
      subtitle: `${item.marketplace} · ${scope ?? "unknown scope"}`,
      status: item.availability,
      ...(scope === undefined ? {} : { scope }),
      plugin: item.plugin,
      completion: Object.freeze({ category: "candidate" as const, value: item.id, safe: safe(item.name) }),
      data: item as unknown as JsonValue,
    });
  }));
}

function marketplaceRows(envelope: NativeControlEnvelope): readonly PluginManagerRow[] | undefined {
  const parsed = NativeControlMarketplaceListResponseSchema.safeParse(envelope.data);
  if (!parsed.success) return undefined;
  return Object.freeze(parsed.data.registrations.map((item) => {
    const scope = scopeKind(item.scope);
    return Object.freeze({
      key: Object.freeze({ subject: "marketplace" as const, key: item.id }),
      title: item.marketplace,
      subtitle: `${scope ?? "unknown scope"} · ${item.source.kind}`,
      status: item.cache.kind,
      ...(scope === undefined ? {} : { scope }),
      completion: Object.freeze({ category: "marketplace" as const, value: item.id, safe: safe(item.marketplace) }),
      data: item as unknown as JsonValue,
    });
  }));
}

function noticeRows(envelope: NativeControlEnvelope): readonly PluginManagerRow[] | undefined {
  const parsed = NativeUpdateNotificationPageSchema.safeParse(envelope.data);
  if (!parsed.success) return undefined;
  return Object.freeze(parsed.data.notices.map((item) => {
    const scope = scopeKind(item.scope);
    return Object.freeze({
      key: Object.freeze({ subject: "notice" as const, key: item.id }),
      title: item.plugin,
      subtitle: `${item.installed} → ${item.available} · ${scope ?? "unknown scope"}`,
      status: `${item.disposition}${item.unresolved ? " · unresolved" : ""}`,
      ...(scope === undefined ? {} : { scope }),
      plugin: item.plugin,
      completion: Object.freeze({ category: "notice" as const, value: item.id, safe: safe(item.plugin) }),
      data: item as unknown as JsonValue,
    });
  }));
}

function rowsFor(view: PluginManagerState["view"], envelope: NativeControlEnvelope): readonly PluginManagerRow[] | undefined {
  if (view === "installed") return installedRows(envelope);
  if (view === "browse") return browseRows(envelope);
  if (view === "marketplaces") return marketplaceRows(envelope);
  return noticeRows(envelope);
}

function selectedRow(state: PluginManagerState): PluginManagerRow | undefined {
  const selected = state.focus.row;
  if (selected === undefined) return state.page.rows[0];
  return state.page.rows.find((row) => rowKeyIdentity(row.key) === rowKeyIdentity(selected));
}

function isAbort(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || error instanceof DOMException && error.name === "AbortError";
}

/** Latest-intent-wins controller over the one control facade executor. */
export function createPluginManagerController(input: Readonly<{
  execute: PluginManagerControlExecutor;
  actions?: Readonly<{
    run(action: string, state: PluginManagerState): Promise<PluginManagerControllerActionResult>;
    cancel(): void;
  }>;
}>): PluginManagerController {
  let model = createPluginManagerState();
  let request = 0;
  let detailRequest = 0;
  let pageAbort: AbortController | undefined;
  let detailAbort: AbortController | undefined;
  let closed = false;
  let pending: Promise<void> = Promise.resolve();
  const listeners = new Set<(state: PluginManagerState) => void>();

  function apply(event: PluginManagerEvent): void {
    const next = pluginManagerReducer(model, event);
    if (next === model) return;
    model = next;
    for (const listener of listeners) listener(model);
  }

  async function loadStatus(): Promise<void> {
    const controller = new AbortController();
    try {
      const result = await input.execute(updateStatusCommand(), controller.signal);
      const status = NativeUpdateStatusSchema.safeParse(result.envelope.data);
      if (status.success) apply({ type: "update-counts", unread: status.data.unreadCount, unresolved: status.data.unresolvedCount });
    } catch (error) {
      if (!isAbort(error, controller.signal)) {
        // Counts remain at the last authoritative snapshot; no inferred fallback.
      }
    }
  }

  async function loadPage(append: boolean): Promise<void> {
    if (closed) return;
    pageAbort?.abort(new DOMException("superseded", "AbortError"));
    const controller = new AbortController();
    pageAbort = controller;
    request += 1;
    const owned = request;
    const captured = model;
    apply({ type: "page-loading", request: owned, append });
    try {
      const result = await input.execute(pageCommand({
        view: captured.view,
        query: captured.query,
        ...(append && captured.page.next !== undefined ? { next: captured.page.next } : {}),
      }), controller.signal);
      if (controller.signal.aborted || owned !== request || closed) return;
      const rows = rowsFor(captured.view, result.envelope);
      if (rows === undefined) {
        apply({ type: "page-failed", request: owned, code: result.envelope.diagnostics[0]?.code ?? `CONTROL_${result.envelope.status.toUpperCase().replaceAll("-", "_")}` });
        return;
      }
      apply({
        type: "page-loaded",
        request: owned,
        rows,
        append,
        ...(result.envelope.page?.next === undefined ? {} : { next: result.envelope.page.next }),
      });
    } catch (error) {
      if (!isAbort(error, controller.signal) && owned === request && !closed) {
        apply({ type: "page-failed", request: owned, code: "CONTROL_READ_FAILED" });
      }
    } finally {
      if (pageAbort === controller) pageAbort = undefined;
    }
  }

  async function loadDetail(): Promise<void> {
    if (closed) return;
    const row = selectedRow(model);
    if (row === undefined) return;
    const argv = detailCommand(row);
    if (argv === undefined) return;
    detailAbort?.abort(new DOMException("superseded", "AbortError"));
    const controller = new AbortController();
    detailAbort = controller;
    detailRequest += 1;
    const owned = detailRequest;
    apply({ type: "detail-loading", request: owned, row: row.key });
    try {
      const result = await input.execute(argv, controller.signal);
      if (controller.signal.aborted || owned !== detailRequest || closed) return;
      apply({ type: "detail-loaded", request: owned, row: row.key, envelope: result.envelope });
      if (result.envelope.status === "stale" || result.envelope.status === "conflict") await loadPage(false);
    } catch (error) {
      if (!isAbort(error, controller.signal)) {
        // The page remains usable; detail loading has no independent authority.
      }
    } finally {
      if (detailAbort === controller) detailAbort = undefined;
    }
  }

  async function refresh(scope: "view" | "detail" | "all" = "all"): Promise<void> {
    if (closed) return;
    if (scope === "detail") return loadDetail();
    const tasks: Promise<void>[] = [loadPage(false)];
    if (scope === "all") tasks.push(loadStatus());
    await Promise.all(tasks);
  }

  function schedule(task: () => Promise<void>): void {
    pending = task().catch(() => undefined);
  }

  const controller: PluginManagerController = {
    state: () => model,
    dispatch(intent): void {
      if (closed) return;
      apply({ type: "intent", intent });
      if (intent.type === "set-view" || intent.type === "submit-search") schedule(() => refresh("all"));
      else if (intent.type === "next-page" && model.page.next !== undefined && !model.page.loading) schedule(() => loadPage(true));
      else if (intent.type === "open-detail" || intent.type === "select-row" || intent.type === "action" && intent.action === "inspect") schedule(loadDetail);
      else if (intent.type === "refresh") schedule(() => refresh(intent.scope));
      else if (intent.type === "cancel-operation") {
        input.actions?.cancel();
        apply({ type: "operation-cancelling" });
      } else if (intent.type === "action" && input.actions !== undefined) {
        const actionState = model;
        apply({ type: "operation-started", action: intent.action });
        schedule(async () => {
          const result = await input.actions!.run(intent.action, actionState);
          if (result.presentation === "successor" || closed) return;
          apply({ type: "operation-finished", envelope: result.envelope });
          if (result.envelope.status === "stale" || result.envelope.status === "conflict") await refresh("all");
        });
      }
    },
    refresh,
    dynamicCompletions(): readonly NativeControlDynamicCandidate[] {
      const candidates: NativeControlDynamicCandidate[] = [];
      const seen = new Set<string>();
      for (const row of model.page.rows) {
        const key = `${row.completion.category}\0${row.completion.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(row.completion);
        if (candidates.length === 512) break;
      }
      return Object.freeze(candidates);
    },
    subscribe(listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    observe(event): void { if (!closed) apply(event); },
    idle: () => pending,
    async close(_reason): Promise<void> {
      if (closed) return;
      closed = true;
      pageAbort?.abort(new DOMException("manager closed", "AbortError"));
      detailAbort?.abort(new DOMException("manager closed", "AbortError"));
      input.actions?.cancel();
      await pending.catch(() => undefined);
      listeners.clear();
      model = createPluginManagerState();
    },
  };
  return Object.freeze(controller);
}
