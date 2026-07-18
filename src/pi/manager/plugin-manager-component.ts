import type { KeybindingsManager, Theme } from "@earendil-works/pi-coding-agent";
import {
  Key,
  matchesKey,
  type Component,
  type Focusable,
  type TUI,
} from "@earendil-works/pi-tui";
import type { PluginManagerController } from "./plugin-manager-controller.js";
import { projectTerminalText } from "./pi-terminal-text.js";
import { renderPluginManager } from "./plugin-manager-render.js";
import { pluginManagerAvailableActions, rowKeyIdentity, type PluginManagerScrollRegion, type PluginManagerView } from "./plugin-manager-model.js";

export type PluginManagerCloseResult = Readonly<{ kind: "closed" | "action"; action?: string }>;

const VIEWS: readonly PluginManagerView[] = ["installed", "browse", "marketplaces", "updates", "health"];

function safePrintable(data: string): string | undefined {
  if (data.length === 0 || data.includes("\n") || data.includes("\r")) return undefined;
  const projected = projectTerminalText(data, 256);
  return projected.escaped ? undefined : projected.text;
}

export class PluginManagerComponent implements Component, Focusable {
  focused = false;
  private readonly tui: TUI;
  private readonly theme: Theme;
  private readonly keybindings: KeybindingsManager;
  private readonly controller: PluginManagerController;
  private done: ((result: PluginManagerCloseResult) => void) | undefined;
  private unsubscribe: (() => void) | undefined;
  private disposed = false;
  private cachedWidth: number | undefined;
  private cachedRows: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(input: Readonly<{
    tui: TUI;
    theme: Theme;
    keybindings: KeybindingsManager;
    controller: PluginManagerController;
    done(result: PluginManagerCloseResult): void;
  }>) {
    this.tui = input.tui;
    this.theme = input.theme;
    this.keybindings = input.keybindings;
    this.controller = input.controller;
    this.done = input.done;
    this.unsubscribe = input.controller.subscribe((state) => {
      this.invalidate();
      this.tui.requestRender();
      if (state.closed) this.finish({ kind: "closed" });
    });
  }

  private finish(result: PluginManagerCloseResult): void {
    const done = this.done;
    if (done === undefined) return;
    this.done = undefined;
    done(result);
  }

  requestClose(): void {
    if (this.disposed) return;
    this.controller.dispatch({ type: "close" });
    this.finish({ kind: "closed" });
  }

  render(width: number): string[] {
    if (this.disposed) return [];
    const rows = Math.max(4, this.tui.terminal.rows);
    const state = this.controller.state();
    if (state.viewport.columns !== width || state.viewport.rows !== rows) {
      this.controller.dispatch({ type: "resized", columns: width, rows });
    }
    if (this.cachedLines !== undefined && this.cachedWidth === width && this.cachedRows === rows) return this.cachedLines;
    this.cachedWidth = width;
    this.cachedRows = rows;
    this.cachedLines = [...renderPluginManager({ state: this.controller.state(), width, height: rows, theme: this.theme, keybindings: this.keybindings, focused: this.focused })];
    return this.cachedLines;
  }

  private switchView(delta: number): void {
    const current = VIEWS.indexOf(this.controller.state().view);
    const view = VIEWS[(current + delta + VIEWS.length) % VIEWS.length]!;
    this.controller.dispatch({ type: "set-view", view });
  }

  private escape(): void {
    const state = this.controller.state();
    if (state.operation.state === "running") {
      this.controller.dispatch({ type: "cancel-operation" });
      return;
    }
    if (state.operation.state === "cancelling") return;
    if (state.screen !== "manager") {
      this.controller.dispatch({ type: "return-manager" });
      return;
    }
    if (state.focus.pane === "actions") {
      this.controller.dispatch({ type: "return-detail" });
      return;
    }
    if (state.focus.pane === "detail" || state.focus.pane === "query") {
      this.controller.dispatch({ type: "detail-back" });
      return;
    }
    if (state.focus.pane === "list") {
      this.controller.dispatch({ type: "return-sections" });
      return;
    }
    this.requestClose();
  }

  private queryInput(data: string): boolean {
    const state = this.controller.state();
    if (state.focus.pane !== "query") return false;
    if (matchesKey(data, Key.enter) || this.keybindings.matches(data, "tui.select.confirm")) {
      this.controller.dispatch({ type: "submit-search" });
      return true;
    }
    if (matchesKey(data, Key.backspace) || matchesKey(data, Key.delete)) {
      const scalars = Array.from(state.query);
      scalars.pop();
      this.controller.dispatch({ type: "set-query", query: scalars.join("") });
      return true;
    }
    const printable = safePrintable(data);
    if (printable !== undefined) {
      this.controller.dispatch({ type: "set-query", query: `${state.query}${printable}`.slice(0, 256) });
      return true;
    }
    return false;
  }

  private scrollRegion(): PluginManagerScrollRegion {
    return this.controller.state().operation.state !== "idle" ? "operation" : "detail";
  }

  private activateAction(action: string): void {
    if (action === "inspect") this.controller.dispatch({ type: "action", action });
    else this.finish({ kind: "action", action });
  }

  private page(delta: number): void {
    const state = this.controller.state();
    const amount = Math.max(1, state.viewport.rows - 6) * delta;
    if (state.focus.pane === "list" || state.focus.pane === "query") {
      const selected = state.focus.row === undefined ? 0 : state.page.rows.findIndex((row) => rowKeyIdentity(row.key) === rowKeyIdentity(state.focus.row!));
      if (delta > 0 && state.page.next !== undefined && selected >= state.page.rows.length - 1) {
        this.controller.dispatch({ type: "next-page" });
      } else this.controller.dispatch({ type: "move-selection", delta: amount });
      return;
    }
    if (state.focus.pane === "actions") {
      this.controller.dispatch({ type: "move-action", delta: amount });
      return;
    }
    this.controller.dispatch({ type: "scroll", region: this.scrollRegion(), delta: amount });
  }

  handleInput(data: string): void {
    if (this.disposed) return;
    if (this.keybindings.matches(data, "tui.select.cancel") || this.keybindings.matches(data, "app.interrupt")) {
      this.escape();
      this.invalidate();
      this.tui.requestRender();
      return;
    }
    if (this.queryInput(data)) return;
    const state = this.controller.state();
    const pane = state.focus.pane;
    if (this.keybindings.matches(data, "tui.select.up")) {
      if (pane === "sections") this.switchView(-1);
      else this.controller.dispatch(pane === "actions" ? { type: "move-action", delta: -1 } : pane === "detail" || state.operation.state !== "idle" ? { type: "scroll", region: this.scrollRegion(), delta: -1 } : { type: "move-selection", delta: -1 });
    } else if (this.keybindings.matches(data, "tui.select.down")) {
      if (pane === "sections") this.switchView(1);
      else this.controller.dispatch(pane === "actions" ? { type: "move-action", delta: 1 } : pane === "detail" || state.operation.state !== "idle" ? { type: "scroll", region: this.scrollRegion(), delta: 1 } : { type: "move-selection", delta: 1 });
    } else if (this.keybindings.matches(data, "tui.select.pageUp")) this.page(-1);
    else if (this.keybindings.matches(data, "tui.select.pageDown")) this.page(1);
    else if (this.keybindings.matches(data, "tui.select.confirm")) {
      if (pane === "sections") this.controller.dispatch({ type: "open-section" });
      else if (pane === "actions") this.activateAction(state.focus.action ?? "inspect");
      else if (pane === "detail") this.controller.dispatch({ type: "open-actions" });
      else this.controller.dispatch({ type: "open-detail" });
    } else if (data === "/" && pane === "list") this.controller.dispatch({ type: "focus-query" });
    else if (data.toLowerCase() === "a" && pane !== "sections") {
      const actions = pluginManagerAvailableActions(state);
      if (actions.includes("install")) this.activateAction("install");
      else if (actions.includes("browse-plugins")) this.activateAction("browse-plugins");
      else if (actions.includes("marketplace-add")) this.activateAction("marketplace-add");
    } else if (data.toLowerCase() === "r") this.controller.dispatch({ type: "refresh", scope: "all" });
    else if (data === "?") this.controller.dispatch({ type: "toggle-help" });
    this.invalidate();
    this.tui.requestRender();
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedRows = undefined;
    this.cachedLines = undefined;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.done = undefined;
    this.invalidate();
  }
}
