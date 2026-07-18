import type {
  ExtensionCommandContext,
  ExtensionContext,
  SessionShutdownEvent,
} from "@earendil-works/pi-coding-agent";
import { NativeInspectionDetailResultSchema } from "../../application/native-inspection-contract.js";
import type { NativeControlDynamicCandidate } from "../../application/native-control-help.js";
import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import type { NativeControlExecutionReport, NativeControlFrameSink } from "../../application/ports/native-control-execution.js";
import type { NativeControlFrame } from "../../application/native-control-progress.js";
import {
  TrustedInstallActivationResultSchema,
  TrustedInstallOpenResultSchema,
} from "../../application/trusted-install-contract.js";
import type { PackagedPluginHost } from "../../composition/packaged-plugin-host-contract.js";
import type { PluginManagerLiveOperation, PluginManagerPresentation } from "../plugin-command.js";
import type { PiManagerReloadHandoff, PluginManagerDestination } from "../pi-manager-reload-handoff.js";
import { presentConfirmationSurface } from "./confirmation-surface.js";
import { createPiControlInputPort } from "./pi-control-input.js";
import { createPiManagerFrameSink } from "./pi-manager-frame-sink.js";
import { PluginInstallComponent, type PluginInstallComponentAction } from "./plugin-install-component.js";
import { createPluginInstallState, pluginInstallReducer, type PluginInstallEvent } from "./plugin-install-flow.js";
import {
  createPluginManagerActionRunner,
  type PluginManagerActionConfirmation,
  type PluginManagerActionIntent,
  type PluginManagerActionRunner,
} from "./plugin-manager-actions.js";
import { PluginManagerComponent, type PluginManagerCloseResult } from "./plugin-manager-component.js";
import { detailCommand } from "./plugin-manager-commands.js";
import { createPluginManagerController, type PluginManagerController } from "./plugin-manager-controller.js";
import { pluginManagerVisibleRows, rowKeyIdentity, type PluginManagerRow, type PluginManagerState } from "./plugin-manager-model.js";
import { PluginOperationView } from "./plugin-operation-view.js";

export interface PluginManagerSession extends PluginManagerPresentation {
  bind(context: ExtensionContext): void;
  presentHandoff(context: ExtensionContext, destination: PluginManagerDestination, envelope: NativeControlEnvelope): Promise<void>;
}

function selectedRow(state: PluginManagerState): PluginManagerRow | undefined {
  const rows = pluginManagerVisibleRows(state);
  if (state.focus.row === undefined) return rows[0];
  return rows.find((row) => rowKeyIdentity(row.key) === rowKeyIdentity(state.focus.row!)) ?? rows[0];
}

function actionIntent(action: string, state: PluginManagerState): PluginManagerActionIntent {
  const row = selectedRow(state);
  if (row === undefined) throw new TypeError("plugin manager action requires a selected row");
  if (action === "enable" || action === "disable" || action === "update") return { action, row };
  if (action === "uninstall-keep" || action === "uninstall-delete") return { action, row };
  if (action === "marketplace-refresh" || action === "marketplace-remove" || action === "notice-acknowledge") return { action, row };
  if (action === "project-sync-apply") return { action: "project-sync", mode: "apply-intent" };
  if (action === "project-sync-publish") return { action: "project-sync", mode: "publish-intent" };
  if (action === "project-sync-merge") return { action: "project-sync", mode: "merge" };
  if (action === "diagnose-host") return { action };
  throw new TypeError("plugin manager action is unavailable for this row");
}

function linkedAbort(parent: AbortSignal | undefined): Readonly<{ controller: AbortController; dispose(): void }> {
  const controller = new AbortController();
  if (parent === undefined) return Object.freeze({ controller, dispose() {} });
  const abort = () => controller.abort(parent.reason);
  if (parent.aborted) abort(); else parent.addEventListener("abort", abort, { once: true });
  return Object.freeze({ controller, dispose: () => parent.removeEventListener("abort", abort) });
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
  let activeOperationAbort: AbortController | undefined;
  let activeOperationReloadSafe = false;
  let presentationDetached = false;
  let closingReason: SessionShutdownEvent["reason"] | undefined;
  let completions: readonly NativeControlDynamicCandidate[] = Object.freeze([]);
  let closed = false;

  function execute(context: ExtensionCommandContext, argv: readonly string[], options: Readonly<{ sink: NativeControlFrameSink; input?: ReturnType<typeof createPiControlInputPort> }>, signal: AbortSignal): Promise<NativeControlExecutionReport> {
    return input.host.runWithPiOperationContext(context, signal, (application) =>
      application.control.runArgv(argv, { mode: "tui", output: "json", sink: options.sink, ...(options.input === undefined ? {} : { input: options.input }) }, signal));
  }

  function freshRunner(context: ExtensionCommandContext, options: Readonly<{
    input?: ReturnType<typeof createPiControlInputPort>;
    onFrame?(frame: NativeControlFrame): void;
    confirm?: boolean;
  }> = {}): PluginManagerActionRunner {
    const runner = createPluginManagerActionRunner({
      execute: (argv, executionOptions, signal) => execute(context, argv, { sink: executionOptions.sink, ...(executionOptions.input === undefined ? {} : { input: executionOptions.input as ReturnType<typeof createPiControlInputPort> }) }, signal),
      ...(options.input === undefined ? {} : { input: options.input }),
      handoff: input.handoff,
      session: { sessionId: context.sessionManager.getSessionId(), cwd: context.cwd },
      ...(options.onFrame === undefined ? {} : { onFrame: options.onFrame }),
      ...(options.confirm === true ? {
        confirm: (confirmation: PluginManagerActionConfirmation, signal: AbortSignal) => presentConfirmationSurface(context, {
          title: confirmation.title,
          lines: confirmation.lines,
        }, signal),
      } : {}),
    });
    activeRunner = runner;
    return runner;
  }

  async function replaceActive(reason: SessionShutdownEvent["reason"] = "new"): Promise<void> {
    activeClose?.();
    activeClose = undefined;
    if (activeController !== undefined) {
      completions = activeController.dynamicCompletions();
      await activeController.close(reason);
      activeController = undefined;
    }
    activeRunner?.close(reason);
    activeRunner = undefined;
    if (activeOperationAbort !== undefined && !(reason === "reload" && activeOperationReloadSafe)) {
      activeOperationAbort.abort(new DOMException("plugin presentation replaced", "AbortError"));
    }
  }

  async function runInstallFlow(context: ExtensionCommandContext, managerState: PluginManagerState): Promise<Readonly<{ kind: "cancelled" | "handled"; presentation?: "local" | "successor" }>> {
    let row = selectedRow(managerState);
    let detail = NativeInspectionDetailResultSchema.safeParse(managerState.detail.envelope?.data);
    if (row === undefined || !detail.success || detail.data.kind !== "found") return Object.freeze({ kind: "cancelled" });
    if (row.availableScopes !== undefined && row.availableScopes.length > 1) {
      const selected = await context.ui.select("Add plugin to", row.availableScopes.map((scope) => scope === "project" ? "Current project" : "User account"));
      if (selected === undefined) return Object.freeze({ kind: "cancelled" });
      const scope = selected === "Current project" ? "project" as const : "user" as const;
      if (scope !== row.scope) {
        const scopedRow = Object.freeze({ ...row, scope });
        const argv = detailCommand(scopedRow);
        if (argv === undefined) return Object.freeze({ kind: "cancelled" });
        const signal = new AbortController().signal;
        const report = await input.host.runWithPiOperationContext(context, signal, (application) =>
          application.control.runArgv(argv, { mode: "tui", output: "json" }, signal));
        detail = NativeInspectionDetailResultSchema.safeParse(report.envelope.data);
        if (!detail.success || detail.data.kind !== "found") return Object.freeze({ kind: "cancelled" });
        row = scopedRow;
      }
    }
    const candidateDetail = detail.data.detail;
    let state = createPluginInstallState(candidateDetail);
    let component: PluginInstallComponent | undefined;
    let currentRunner: PluginManagerActionRunner | undefined;
    let result: Readonly<{ kind: "cancelled" | "handled"; presentation?: "local" | "successor" }> = Object.freeze({ kind: "cancelled" });

    await context.ui.custom<void>((tui, theme, keybindings, done) => {
      const apply = (event: PluginInstallEvent): void => {
        state = pluginInstallReducer(state, event);
        component?.update(state);
        tui.requestRender();
      };

      const runPhase = async (phase: "open" | "apply" | "recover"): Promise<void> => {
        if (state.busy) return;
        apply({ type: "busy", value: true });
        const port = phase === "open"
          ? undefined
          : createPiControlInputPort({ context, mode: "tui", preset: { nonSensitive: state.values, ...(state.consentId === undefined ? {} : { consentId: state.consentId }) } });
        const runner = freshRunner(context, {
          ...(port === undefined ? {} : { input: port }),
          onFrame: (frame) => {
            if (!presentationDetached) apply({ type: "frame", frame });
          },
        });
        currentRunner = runner;
        try {
          if (phase === "open") {
            const phaseResult = await runner.run({
              action: "install-open",
              row,
              snapshotId: candidateDetail.snapshotId,
              detailId: candidateDetail.summary.detailId,
            });
            if (phaseResult.kind === "cancelled") {
              apply({ type: "busy", value: false });
              return;
            }
            const opened = TrustedInstallOpenResultSchema.safeParse(phaseResult.envelope.data);
            if (!opened.success || opened.data.kind !== "opened") {
              apply({ type: "authority-stale" });
              context.ui.notify("Install candidate evidence changed; review the refreshed candidate before continuing.", "warning");
              return;
            }
            apply({ type: "session-opened", session: opened.data.session });
            return;
          }

          const session = state.session;
          if (session === undefined || state.consentId !== session.consent.consentId) {
            apply({ type: "busy", value: false });
            return;
          }
          const phaseResult = await runner.run({ action: phase === "recover" ? "install-recover" : "install-apply", token: session.token });
          if (phaseResult.kind === "cancelled") {
            apply({ type: "busy", value: false });
            return;
          }
          if (phaseResult.presentation === "successor") {
            result = Object.freeze({ kind: "handled", presentation: "successor" });
            // Reload teardown already closed the predecessor custom component.
            // Calling its done callback here would reuse stale Pi/TUI state.
            return;
          }
          const activation = TrustedInstallActivationResultSchema.safeParse(phaseResult.envelope.data);
          if (!activation.success) {
            apply({ type: "busy", value: false });
            const diagnostic = phaseResult.envelope.diagnostics[0]?.code;
            context.ui.notify(`Install result did not match the public facade contract (${phaseResult.envelope.status}${diagnostic === undefined ? "" : ` · ${diagnostic}`}).`, "error");
            return;
          }
          if (activation.data.kind === "needs-input") {
            apply({ type: "session-opened", session: activation.data.session, submission: phase === "recover" ? "recover" : "apply" });
            context.ui.notify("Configuration or exact consent needs renewed input.", "warning");
            return;
          }
          apply({ type: "activation-result", result: activation.data });
        } catch (error) {
          if (closingReason === "reload" || closed) return;
          apply({ type: "busy", value: false });
          context.ui.notify(error instanceof DOMException && error.name === "AbortError" ? "Install cancellation is waiting for owner truth." : "Install flow could not complete.", "warning");
        } finally {
          port?.dispose();
          runner.close(closingReason ?? "quit");
          if (currentRunner === runner) currentRunner = undefined;
          if (activeRunner === runner) activeRunner = undefined;
        }
      };

      const action = (event: PluginInstallComponentAction): void => {
        if (event.type === "cancel") {
          currentRunner?.cancel();
          return;
        }
        if (event.type === "edit-field") {
          if (event.sensitive) {
            context.ui.notify("Sensitive values stay out of flow state and are collected in masked custody only when Apply begins.", "info");
            return;
          }
          const field = state.session?.fields.find((entry) => entry.key === event.key);
          if (field === undefined) return;
          void context.ui.input(field.label.text, field.description?.text).then((value) => {
            if (value !== undefined && !closed) apply({ type: "set-value", key: field.key, value });
          });
          return;
        }
        if (event.type === "back") {
          if (state.busy) return;
          if (state.step === "choose-inspect") {
            result = Object.freeze({ kind: "cancelled" });
            done();
          } else if (state.step === "activation-result") {
            result = Object.freeze({ kind: "handled", presentation: "local" });
            done();
          } else apply({ type: "back" });
          return;
        }
        if (state.step === "activation-result") {
          const activation = state.result;
          if (activation?.kind === "recovery-required" && activation.action !== "run-recovery" && activation.session !== undefined) {
            apply({ type: "session-opened", session: activation.session, submission: "recover" });
            return;
          }
          result = Object.freeze({ kind: "handled", presentation: "local" });
          done();
        } else void runPhase(state.step === "choose-inspect" ? "open" : state.submission);
      };

      component = new PluginInstallComponent({ state, theme, keybindings, height: () => tui.terminal.rows, onEvent: apply, onAction: action });
      activeClose = () => done();
      return component;
    });
    activeClose = undefined;
    currentRunner?.close(closingReason ?? "quit");
    return result;
  }

  async function open(context: ExtensionCommandContext): Promise<void> {
    if (closed) return;
    await replaceActive("new");
    let controller!: PluginManagerController;
    const read = (argv: readonly string[], signal: AbortSignal) => input.host.runWithPiOperationContext(context, signal, (application) =>
      application.control.runArgv(argv, { mode: "tui", output: "json" }, signal));
    const actions = {
      async run(action: string, state: PluginManagerState) {
        if (action === "install") return runInstallFlow(context, state);
        let resolvedIntent: PluginManagerActionIntent;
        if (action === "marketplace-add") {
          const sourceType = await context.ui.select("Source type", ["GitHub repository", "Git URL", "Local Git checkout"]);
          if (sourceType === undefined) return Object.freeze({ kind: "cancelled" as const, presentation: "local" as const });
          const sourceKind = sourceType === "Git URL" ? "git" as const : sourceType === "Local Git checkout" ? "local-git" as const : "github" as const;
          const placeholder = sourceKind === "github" ? "owner/repository" : sourceKind === "git" ? "https://example.com/plugins.git" : "/path/to/plugins";
          const source = await context.ui.input("Source location", placeholder);
          if (source === undefined || source.trim().length === 0) return Object.freeze({ kind: "cancelled" as const, presentation: "local" as const });
          const ref = await context.ui.input("Git ref (optional)", "branch, tag, or commit; leave empty for default");
          if (ref === undefined) return Object.freeze({ kind: "cancelled" as const, presentation: "local" as const });
          resolvedIntent = { action: "marketplace-add", source: source.trim(), sourceKind, ...(ref.trim().length === 0 ? {} : { ref: ref.trim() }) };
        } else resolvedIntent = actionIntent(action, state);
        const port = createPiControlInputPort({ context, mode: "tui" });
        const runner = freshRunner(context, {
          input: port,
          confirm: true,
          onFrame: (frame) => {
            if (!presentationDetached) controller.observe({ type: "frame", frame });
          },
        });
        try { return await runner.run(resolvedIntent); }
        finally {
          port.dispose();
          runner.close(closingReason ?? "quit");
          if (activeRunner === runner) activeRunner = undefined;
        }
      },
      cancel(): void { activeRunner?.cancel(); },
    };
    controller = createPluginManagerController({ execute: read, actions });
    activeController = controller;
    // Mount first: facade reads may touch several local stores and should never
    // leave a command invocation looking frozen. The reducer publishes loading
    // state synchronously and authoritative results replace it in place.
    void controller.refresh("all");
    try {
      await context.ui.custom<PluginManagerCloseResult>((tui, theme, keybindings, done) => {
        const component = new PluginManagerComponent({ tui, theme, keybindings, controller, done });
        activeClose = () => component.requestClose();
        return component;
      });
      activeClose = undefined;
    } catch {
      if (!presentationDetached) context.ui.notify("Plugin manager terminal rendering failed; facade state is unchanged.", "error");
    } finally {
      if (activeController === controller) {
        completions = controller.dynamicCompletions();
        await controller.close(closingReason ?? "quit");
        activeController = undefined;
      }
      activeClose = undefined;
    }
  }

  async function presentStaticOperation(context: ExtensionContext, envelope: NativeControlEnvelope, frames: readonly NativeControlFrame[], title = "Plugin operation"): Promise<void> {
    if (context.mode !== "tui" || closed) return;
    await replaceActive("new");
    try {
      await context.ui.custom<void>((tui, theme, keybindings, done) => {
        const view = new PluginOperationView({ theme, keybindings, height: () => tui.terminal.rows, title, cancel: () => {}, close: () => done() });
        for (const frame of frames) view.push(frame);
        view.finish(envelope);
        activeClose = () => done();
        return view;
      });
    } catch {
      if (!presentationDetached) context.ui.notify(`Plugin operation ${envelope.status}; custom renderer unavailable.`, envelope.exit.code === 0 ? "info" : "error");
    } finally {
      activeClose = undefined;
    }
  }

  async function presentOperation(context: ExtensionCommandContext, operation: PluginManagerLiveOperation): Promise<void> {
    if (closed) return;
    await replaceActive("new");
    const linked = linkedAbort(operation.signal);
    activeOperationAbort = linked.controller;
    activeOperationReloadSafe = operation.reloadSafe;
    presentationDetached = false;
    let task: Promise<void> | undefined;
    let failure: unknown;
    try {
      await context.ui.custom<void>((tui, theme, keybindings, done) => {
        const view = new PluginOperationView({
          theme,
          keybindings,
          height: () => tui.terminal.rows,
          cancel: () => linked.controller.abort(new DOMException("plugin command cancelled", "AbortError")),
          close: () => done(),
        });
        activeClose = () => done();
        task = Promise.resolve().then(async () => {
          const sink = createPiManagerFrameSink({
            onFrame: (frame) => {
              if (presentationDetached) return;
              view.push(frame);
              tui.requestRender();
            },
          });
          try {
            const report = await operation.run(sink, linked.controller.signal);
            const presentation = operation.settle(report);
            if (presentationDetached || presentation === "successor") {
              // session_shutdown already closed the predecessor view. No Pi/TUI
              // callback remains valid once the successor owns presentation.
              return;
            }
            view.finish(report.envelope);
            tui.requestRender();
          } catch (error) {
            failure = error;
            done();
          }
        });
        return view;
      });
      await task;
      if (failure !== undefined) throw failure;
    } finally {
      linked.dispose();
      if (activeOperationAbort === linked.controller) activeOperationAbort = undefined;
      activeOperationReloadSafe = false;
      activeClose = undefined;
    }
  }

  const session: PluginManagerSession = {
    bind(context): void {
      closed = false;
      closingReason = undefined;
      presentationDetached = false;
      bound = Object.freeze({ sessionId: context.sessionManager.getSessionId(), cwd: context.cwd });
    },
    open,
    presentOperation,
    async presentReport(context: ExtensionCommandContext, report: NativeControlExecutionReport, frames: readonly NativeControlFrame[]): Promise<void> {
      await presentStaticOperation(context, report.envelope, frames);
    },
    async presentHandoff(context, destination, envelope): Promise<void> {
      const current = bound;
      if (current === undefined || current.sessionId !== context.sessionManager.getSessionId() || current.cwd !== context.cwd) return;
      await presentStaticOperation(context, envelope, Object.freeze([]), destination === "install-result" ? "Step 3/3 · Activation result" : "Plugin operation · successor result");
    },
    dynamicCompletions(): readonly NativeControlDynamicCandidate[] {
      return activeController?.dynamicCompletions() ?? completions;
    },
    async close(reason: SessionShutdownEvent["reason"]): Promise<void> {
      if (closed && activeController === undefined && activeClose === undefined) return;
      closed = true;
      closingReason = reason;
      presentationDetached = true;
      activeClose?.();
      activeRunner?.close(reason);
      if (activeOperationAbort !== undefined && !(reason === "reload" && activeOperationReloadSafe)) {
        activeOperationAbort.abort(new DOMException("plugin presentation closed", "AbortError"));
      }
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
