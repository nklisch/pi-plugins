import type { KeybindingsManager, Theme } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, wrapTextWithAnsi, type Component } from "@earendil-works/pi-tui";
import type { NativeControlEnvelope } from "../../application/native-control-contract.js";
import { NativeControlFrameSchema, type NativeControlFrame } from "../../application/native-control-progress.js";
import { projectTerminalText } from "./pi-terminal-text.js";

function safe(value: unknown, limit = 2_048): string {
  return projectTerminalText(typeof value === "string" ? value : String(value ?? ""), limit).text;
}

export class PluginOperationView implements Component {
  private readonly theme: Theme;
  private readonly keybindings: KeybindingsManager;
  private readonly height: () => number;
  private cancel: (() => void) | undefined;
  private frames: NativeControlFrame[] = [];
  private envelope: NativeControlEnvelope | undefined;
  private offset = 0;
  private disposed = false;

  constructor(input: Readonly<{ theme: Theme; keybindings: KeybindingsManager; height(): number; cancel(): void }>) {
    this.theme = input.theme;
    this.keybindings = input.keybindings;
    this.height = input.height;
    this.cancel = input.cancel;
  }

  push(frameInput: NativeControlFrame): void {
    if (this.disposed) return;
    const frame = NativeControlFrameSchema.parse(frameInput);
    this.frames.push(frame);
    if (this.frames.length > 200) this.frames.splice(0, this.frames.length - 200);
    if (frame.type === "result") this.envelope = frame.result;
    this.offset = 0;
  }

  finish(envelope: NativeControlEnvelope): void {
    if (this.disposed) return;
    this.envelope = envelope;
    this.offset = 0;
  }

  private content(): string[] {
    const lines = [this.theme.fg("accent", this.theme.bold("Plugin operation"))];
    for (const frame of this.frames) {
      if (frame.type === "accepted") lines.push(`#${frame.sequence} accepted ${safe(frame.command)}`);
      else if (frame.type === "progress") lines.push(`#${frame.sequence} ${safe(frame.phase)} ${safe(frame.state)}${frame.code === undefined ? "" : ` ${safe(frame.code)}`}`);
    }
    if (this.envelope !== undefined) {
      lines.push(`${safe(this.envelope.command.id)} ${safe(this.envelope.status)} · ${safe(this.envelope.exit.classification)} (${this.envelope.exit.code})`);
      for (const field of this.envelope.human) lines.push(safe(field.text));
      for (const diagnostic of this.envelope.diagnostics) lines.push(`${safe(diagnostic.severity)} ${safe(diagnostic.code)} · ${safe(diagnostic.action)}`);
    }
    lines.push(this.theme.fg("dim", "Up/down scroll · Escape cancels once and waits for owner result"));
    return lines;
  }

  handleInput(data: string): void {
    if (this.disposed) return;
    if (this.keybindings.matches(data, "tui.select.cancel") || this.keybindings.matches(data, "app.interrupt")) {
      this.cancel?.();
    } else if (this.keybindings.matches(data, "tui.select.up") || matchesKey(data, Key.up)) this.offset += 1;
    else if (this.keybindings.matches(data, "tui.select.down") || matchesKey(data, Key.down)) this.offset = Math.max(0, this.offset - 1);
    else if (this.keybindings.matches(data, "tui.select.pageUp") || matchesKey(data, Key.pageUp)) this.offset += Math.max(1, this.height() - 2);
    else if (this.keybindings.matches(data, "tui.select.pageDown") || matchesKey(data, Key.pageDown)) this.offset = Math.max(0, this.offset - Math.max(1, this.height() - 2));
  }

  render(width: number): string[] {
    if (this.disposed) return [];
    const wrapped = this.content().flatMap((line) => wrapTextWithAnsi(line, Math.max(1, width)))
      .map((line) => truncateToWidth(line, Math.max(1, width), ""));
    const height = Math.max(1, this.height());
    const end = Math.max(0, wrapped.length - this.offset);
    return wrapped.slice(Math.max(0, end - height), end);
  }

  invalidate(): void {}
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel = undefined;
    this.frames = [];
    this.envelope = undefined;
  }
}
