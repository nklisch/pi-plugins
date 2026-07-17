import type {
  ExtensionCommandContext,
  ExtensionContext,
  SessionShutdownEvent,
} from "@earendil-works/pi-coding-agent";
import { NativeInspectionDetailResultSchema } from "../../application/native-inspection-contract.js";
import type { NativeControlDynamicCandidate } from "../../application/native-control-help.js";
import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import type { NativeControlExecutionReport } from "../../application/ports/native-control-execution.js";
import type { NativeControlFrame } from "../../application/native-control-progress.js";
import type { PackagedPluginHost } from "../../composition/packaged-plugin-host-contract.js";
import type { PluginManagerPresentation } from "../plugin-command.js";
import type { PiManagerReloadHandoff, PluginManagerDestination } from "../pi-manager-reload-handoff.js";
import { createPiControlInputPort } from "./pi-control-input.js";
import { createPluginManagerActionRunner, type PluginManagerActionIntent, type PluginManagerActionRunner } from "./plugin-manager-actions.js";
import { PluginManagerComponent } from "./plugin-manager-component.js";
import { createPluginManagerController, type PluginManagerController } from "./plugin-manager-controller.js";
import { rowKeyIdentity, type PluginManagerRow, type PluginManagerState } from "./plugin-manager-model.js";
import { PluginOperationView } from "./plugin-operation-view.js";

export interface PluginManagerSession extends PluginManagerPresentation {
  bind(context: ExtensionContext): void;
  presentHandoff(context: ExtensionContext, destination: PluginManagerDestination, envelope: NativeControlEnvelope): Promise<void>;
}

function selectedRow(state: PluginManagerState): PluginManagerRow | undefined {
  if (state.focus.row === undefined) return state.page.rows[0];
  return state.page.rows.find((row) => rowKeyIdentity(row.key) === rowKeyIdentity(state.focus.row!)) ?? state.page.rows[0];
}

function actionIntent(action: string, state: PluginManagerState): PluginManagerActionIntent {
  const row = selectedRow(state);
  if (row === undefined) throw new TypeError("plugin manager action requires a selected row");
  if (action === "enable" || action === "disable" || action === "update") return { action, row };
  if (action === "uninstall-keep" || action === "uninstall-delete") return { action, row };
  if (action === "marketplace-refresh" || action === "marketplace-remove" || action === "notice-acknowledge") return { action, row };
  if (action === "install") {
    const detail = NativeInspectionDetailResultSchema.safeParse(state.detail.envelope?.data);
    if (!detail.success || detail.data.kind !== "found") throw new TypeError("install requires a current inspected candidate");
    return { action: "install-run", row, snapshotId: detail.data.detail.snapshotId, detailId: detail.data.detail.summary.detailId };
  }
  throw new TypeError("plugin manager action is unavailable for this row");
}

/** Own one fresh controller/component/input set per command presentation. */
export function createPluginManagerSession(input: Readonly<{
  host: PackagedPluginHost;
  handoff: PiManagerReloadHandoff;
}>): PluginManagerSession {
  let bound: Readonly<{ sessionId: string; cwd: string }> | undefined;
  let activeController: PluginManagerController | undefined;
  let activeRunner: PluginManagerActionRunner | undefined;
  let activeClose: (() => void) | undefined;
  let completions: readonly NativeControlDynamicCandidate[] = Object.freeze([]);
  let closed = false;

  async function replaceActive(): Promise<void> {
    activeClose?.();
    activeClose = undefined;
    if (activeController !== undefined) {
      completions = activeController.dynamicCompletions();
      await activeController.close("reload");
      activeController = undefined;
    }
    activeRunner?.close();
    activeRunner = undefined;
  }

  async function open(context: ExtensionCommandContext): Promise<void> {
    if (closed) return;
    await replaceActive();
    let controller!: PluginManagerController;
    const read = (argv: readonly string[], signal: AbortSignal) => input.host.runWithPiOperationContext(context, signal, (application) =>
      application.control.runArgv(argv, { mode: "tui", output: "json" }, signal));
    const actions = {
      async run(action: string, state: PluginManagerState) {
        const port = createPiControlInputPort({ context, mode: "tui" });
        const runner = createPluginManagerActionRunner({
          execute: (argv, options, signal) => input.host.runWithPiOperationContext(context, signal, (application) =>
            application.control.runArgv(argv, { mode: "tui", output: "json", sink: options.sink, ...(options.input === undefined ? {} : { input: options.input }) }, signal)),
          input: port,
          handoff: input.handoff,
          session: { sessionId: context.sessionManager.getSessionId(), cwd: context.cwd },
          onFrame: (frame) => controller.observe({ type: "frame", frame }),
        });
        activeRunner = runner;
        try { return await runner.run(actionIntent(action, state)); }
        finally {
          port.dispose();
          runner.close();
          if (activeRunner === runner) activeRunner = undefined;
        }
      },
      cancel(): void { activeRunner?.cancel(); },
    };
    controller = createPluginManagerController({ execute: read, actions });
    activeController = controller;
    await controller.refresh("all");
    if (closed || activeController !== controller) return;
    try {
      await context.ui.custom((tui, theme, keybindings, done) => {
        const component = new PluginManagerComponent({ tui, theme, keybindings, controller, done });
        activeClose = () => component.requestClose();
        return component;
      });
    } catch {
      context.ui.notify("Plugin manager terminal rendering failed; facade state is unchanged.", "error");
    } finally {
      if (activeController === controller) {
        completions = controller.dynamicCompletions();
        await controller.close("quit");
        activeController = undefined;
      }
      activeClose = undefined;
    }
  }

  async function presentOperation(context: ExtensionContext, envelope: NativeControlEnvelope, frames: readonly NativeControlFrame[]): Promise<void> {
    if (context.mode !== "tui" || closed) return;
    await replaceActive();
    try {
      await context.ui.custom<void>((tui, theme, keybindings, done) => {
        const view = new PluginOperationView({ theme, keybindings, height: () => tui.terminal.rows, cancel: () => done() });
        for (const frame of frames) view.push(frame);
        view.finish(envelope);
        activeClose = () => done();
        return view;
      });
    } catch {
      context.ui.notify(`Plugin operation ${envelope.status}; custom renderer unavailable.`, envelope.exit.code === 0 ? "info" : "error");
    } finally {
      activeClose = undefined;
    }
  }

  const session: PluginManagerSession = {
    bind(context): void {
      closed = false;
      bound = Object.freeze({ sessionId: context.sessionManager.getSessionId(), cwd: context.cwd });
    },
    open,
    async presentReport(context: ExtensionCommandContext, report: NativeControlExecutionReport, frames: readonly NativeControlFrame[]): Promise<void> {
      await presentOperation(context, report.envelope, frames);
    },
    async presentHandoff(context, _destination, envelope): Promise<void> {
      const current = bound;
      if (current === undefined || current.sessionId !== context.sessionManager.getSessionId() || current.cwd !== context.cwd) return;
      // session_start has no command-capable operation context in Pi 0.80.8.
      // Show only the transferred safe result; the next manager command creates
      // a fresh controller and refreshes authoritative snapshots.
      await presentOperation(context, envelope, Object.freeze([]));
    },
    dynamicCompletions(): readonly NativeControlDynamicCandidate[] {
      return activeController?.dynamicCompletions() ?? completions;
    },
    async close(reason: SessionShutdownEvent["reason"]): Promise<void> {
      if (closed && activeController === undefined && activeClose === undefined) return;
      closed = true;
      activeClose?.();
      activeRunner?.close();
      if (activeController !== undefined) {
        completions = reason === "reload" ? activeController.dynamicCompletions() : Object.freeze([]);
        await activeController.close(reason);
      }
      activeController = undefined;
      activeRunner = undefined;
      activeClose = undefined;
      bound = undefined;
      if (reason !== "reload") completions = Object.freeze([]);
    },
  };
  return Object.freeze(session);
}
