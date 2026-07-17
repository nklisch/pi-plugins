import type { KeybindingsManager, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi, type Component } from "@earendil-works/pi-tui";
import { projectTerminalText } from "./pi-terminal-text.js";

export class ConfirmationOverlay implements Component {
  private readonly theme: Theme;
  private readonly keybindings: KeybindingsManager;
  private readonly title: string;
  private readonly lines: readonly string[];
  private readonly disclosure: readonly string[];
  private disclosed = false;
  private done: ((confirmed: boolean) => void) | undefined;
  private disposed = false;

  constructor(input: Readonly<{
    theme: Theme;
    keybindings: KeybindingsManager;
    title: string;
    lines: readonly string[];
    disclosure?: readonly string[];
    done(confirmed: boolean): void;
  }>) {
    this.theme = input.theme;
    this.keybindings = input.keybindings;
    this.title = projectTerminalText(input.title, 256).text;
    this.lines = Object.freeze(input.lines.map((line) => projectTerminalText(line, 2_048).text));
    this.disclosure = Object.freeze((input.disclosure ?? []).map((line) => projectTerminalText(line, 4_096).text));
    this.done = input.done;
  }

  handleInput(data: string): void {
    if (this.disposed) return;
    if (data === " " && this.disclosure.length > 0) this.disclosed = !this.disclosed;
    else if (this.keybindings.matches(data, "tui.select.confirm")) this.finish(true);
    else if (this.keybindings.matches(data, "tui.select.cancel") || this.keybindings.matches(data, "app.interrupt")) this.finish(false);
  }

  private finish(value: boolean): void {
    const done = this.done;
    if (done === undefined) return;
    this.done = undefined;
    this.disposed = true;
    done(value);
  }

  render(width: number): string[] {
    if (this.disposed) return [];
    return [
      this.theme.fg("warning", this.theme.bold(this.title)),
      ...this.lines,
      ...(this.disclosure.length === 0 ? [] : this.disclosed
        ? [this.theme.fg("accent", "Exact executable disclosure"), ...this.disclosure]
        : [this.theme.fg("muted", "Space: show exact skills, hook commands, MCP process/tools, and requirements")]),
      this.theme.fg("dim", "Enter confirm · Escape cancel"),
    ].flatMap((line) => wrapTextWithAnsi(line, Math.max(1, width)))
      .map((line) => truncateToWidth(line, Math.max(1, width), ""));
  }

  invalidate(): void {}
  dispose(): void { this.done = undefined; this.disposed = true; }
}
