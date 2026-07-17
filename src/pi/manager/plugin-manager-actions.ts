import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import type { NativeControlFrame } from "../../application/native-control-progress.js";
import type { NativeControlInputPort } from "../../application/ports/native-control-input.js";
import type {
  NativeControlExecutionReport,
  NativeControlFrameSink,
} from "../../application/ports/native-control-execution.js";
import type {
  PiManagerHandoffTicket,
  PiManagerReloadHandoff,
  PluginManagerDestination,
} from "../pi-manager-reload-handoff.js";
import { nativeControlArgv } from "./plugin-manager-commands.js";
import { createPiManagerFrameSink } from "./pi-manager-frame-sink.js";
import type { PluginManagerRow } from "./plugin-manager-model.js";

export type PluginManagerActionIntent =
  | Readonly<{ action: "enable" | "disable" | "update"; row: PluginManagerRow }>
  | Readonly<{ action: "uninstall-keep" | "uninstall-delete"; row: PluginManagerRow }>
  | Readonly<{ action: "install-open" | "install-run"; row: PluginManagerRow; snapshotId: string; detailId: string }>
  | Readonly<{ action: "install-apply" | "install-recover"; token: string }>
  | Readonly<{ action: "marketplace-refresh" | "marketplace-remove"; row: PluginManagerRow }>
  | Readonly<{ action: "notice-acknowledge"; row: PluginManagerRow }>
  | Readonly<{ action: "project-sync"; mode: "apply-intent" | "publish-intent" | "merge" }>
  | Readonly<{ action: "operation-status" | "operation-cancel"; token: string }>;

export type PluginManagerMutationExecutionOptions = Readonly<{
  input?: NativeControlInputPort;
  sink: NativeControlFrameSink;
}>;
export type PluginManagerMutationExecutor = (
  argv: readonly string[],
  options: PluginManagerMutationExecutionOptions,
  signal: AbortSignal,
) => Promise<NativeControlExecutionReport>;

export type PluginManagerActionResult = Readonly<{
  envelope: NativeControlEnvelope;
  presentation: "local" | "successor";
}>;

export interface PluginManagerActionRunner {
  run(intent: PluginManagerActionIntent): Promise<PluginManagerActionResult>;
  cancel(): void;
  close(): void;
}

function exactRow(row: PluginManagerRow): Readonly<{ plugin: string; scope: "user" | "project"; snapshotId: string; detailId: string }> {
  if (row.plugin === undefined || row.scope === undefined || row.key.snapshotId === undefined || row.key.detailId === undefined) {
    throw new TypeError("manager action requires exact current facade evidence");
  }
  return { plugin: row.plugin, scope: row.scope, snapshotId: row.key.snapshotId, detailId: row.key.detailId };
}

function actionArgv(intent: PluginManagerActionIntent): readonly string[] {
  if (intent.action === "enable" || intent.action === "disable" || intent.action === "update") {
    const row = exactRow(intent.row);
    return nativeControlArgv(`lifecycle.${intent.action}`, [row.plugin], {
      scope: row.scope,
      snapshotId: row.snapshotId,
      detailId: row.detailId,
      confirmed: true,
    });
  }
  if (intent.action === "uninstall-keep" || intent.action === "uninstall-delete") {
    const row = exactRow(intent.row);
    return nativeControlArgv("lifecycle.uninstall", [row.plugin], {
      scope: row.scope,
      snapshotId: row.snapshotId,
      detailId: row.detailId,
      confirmed: true,
      [intent.action === "uninstall-delete" ? "deleteData" : "keepData"]: true,
    });
  }
  if (intent.action === "install-open" || intent.action === "install-run") {
    if (intent.row.plugin === undefined || intent.row.scope === undefined) throw new TypeError("install requires exact plugin scope");
    return nativeControlArgv(intent.action === "install-open" ? "install.open" : "install.run", [intent.row.plugin], {
      scope: intent.row.scope,
      snapshotId: intent.snapshotId,
      detailId: intent.detailId,
    });
  }
  if (intent.action === "install-apply" || intent.action === "install-recover") {
    return nativeControlArgv(intent.action === "install-apply" ? "install.apply" : "install.recover", [intent.token]);
  }
  if (intent.action === "marketplace-refresh") {
    return nativeControlArgv("marketplace.refresh", [intent.row.key.key], { scope: intent.row.scope ?? "all-current" });
  }
  if (intent.action === "marketplace-remove") {
    if (intent.row.scope === undefined) throw new TypeError("marketplace removal requires exact scope");
    return nativeControlArgv("marketplace.remove", [intent.row.key.key], { scope: intent.row.scope, confirmed: true });
  }
  if (intent.action === "notice-acknowledge") return nativeControlArgv("updates.notices.acknowledge", [intent.row.key.key]);
  if (intent.action === "project-sync") return nativeControlArgv("project.sync", [], { mode: intent.mode, confirmed: true });
  if (intent.action === "operation-status" || intent.action === "operation-cancel") {
    return nativeControlArgv(intent.action === "operation-status" ? "operation.status" : "operation.cancel", [intent.token]);
  }
  throw new TypeError("unsupported plugin manager action");
}

function destination(intent: PluginManagerActionIntent): PluginManagerDestination {
  return intent.action === "install-apply" || intent.action === "install-recover" || intent.action === "install-run" ? "install-result" : "operation-result";
}

function activating(intent: PluginManagerActionIntent): boolean {
  return ["enable", "disable", "update", "uninstall-keep", "uninstall-delete", "install-run", "install-apply", "install-recover", "project-sync"].includes(intent.action);
}

/** One foreground facade mutation with exact frame, abort, stale, and reload semantics. */
export function createPluginManagerActionRunner(input: Readonly<{
  execute: PluginManagerMutationExecutor;
  input?: NativeControlInputPort;
  sink?: NativeControlFrameSink;
  handoff?: Pick<PiManagerReloadHandoff, "open" | "publish" | "fail">;
  session?: Readonly<{ sessionId: string; cwd: string }>;
  onFrame?(frame: NativeControlFrame): void;
  onStale?(envelope: NativeControlEnvelope): void;
}>): PluginManagerActionRunner {
  let active: AbortController | undefined;
  let activeInput: (NativeControlInputPort & { cancel?: () => void }) | undefined;
  let closed = false;

  const runner: PluginManagerActionRunner = {
    async run(intent): Promise<PluginManagerActionResult> {
      if (closed) throw new Error("plugin manager action runner is closed");
      if (active !== undefined) throw new Error("a plugin manager mutation is already running");
      const controller = new AbortController();
      active = controller;
      activeInput = input.input;
      let ticket: PiManagerHandoffTicket | undefined;
      if (activating(intent) && input.handoff !== undefined && input.session !== undefined) {
        ticket = input.handoff.open({ ...input.session, destination: destination(intent) });
      }
      try {
        const report = await input.execute(actionArgv(intent), {
          sink: createPiManagerFrameSink({ ...(input.onFrame === undefined ? {} : { onFrame: input.onFrame }), ...(input.sink === undefined ? {} : { delegate: input.sink }) }),
          ...(input.input === undefined ? {} : { input: input.input }),
        }, controller.signal);
        if (report.envelope.status === "stale" || report.envelope.status === "conflict") input.onStale?.(report.envelope);
        const presentation = ticket === undefined || input.handoff === undefined
          ? "local" as const
          : input.handoff.publish(ticket, report.envelope);
        return Object.freeze({ envelope: report.envelope, presentation });
      } catch (error) {
        if (ticket !== undefined && input.handoff !== undefined) {
          try { input.handoff.fail(ticket, error); } catch { /* preserve facade/owner failure */ }
        }
        throw error;
      } finally {
        if (active === controller) active = undefined;
        activeInput = undefined;
      }
    },
    cancel(): void {
      if (active === undefined || active.signal.aborted) return;
      activeInput?.cancel?.();
      active.abort(new DOMException("manager operation cancelled", "AbortError"));
    },
    close(): void {
      if (closed) return;
      closed = true;
      runner.cancel();
    },
  };
  return Object.freeze(runner);
}
