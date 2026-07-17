import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi, type Component } from "@earendil-works/pi-tui";
import type { TrustedInstallActivationResult } from "../../application/trusted-install-contract.js";
import { projectTerminalText } from "./pi-terminal-text.js";
import type { PluginInstallEvent, PluginInstallState } from "./plugin-install-flow.js";

function safe(value: unknown, limit = 2_048): string {
  return projectTerminalText(typeof value === "string" ? value : String(value ?? ""), limit).text;
}

function finish(lines: readonly string[], width: number, height: number): readonly string[] {
  return Object.freeze(lines.flatMap((line) => wrapTextWithAnsi(line, Math.max(1, width)))
    .map((line) => truncateToWidth(line, Math.max(1, width), ""))
    .slice(0, Math.max(1, height)));
}

function resultLines(result: TrustedInstallActivationResult, theme: Theme): string[] {
  const lines = [theme.fg(
    result.kind === "succeeded" || result.kind === "current-state" ? "success" :
      result.kind === "cancelled" || result.kind === "stale" || result.kind === "conflict" ? "warning" : "error",
    result.kind,
  )];
  if (result.kind === "succeeded") {
    lines.push(
      `${safe(result.plugin)} · ${safe(result.scope.kind)} · ${safe(result.revision)}`,
      `${result.components.skills} discoverable skills`,
      `${result.components.hooks} registered hooks`,
      `${result.components.mcpServers} MCP servers ready`,
      "Pi reload and activation observation completed after commit.",
    );
  } else if (result.kind === "current-state") {
    lines.push(`${safe(result.plugin)} already ${safe(result.activation)} · ${safe(result.reason)}`);
  } else if (result.kind === "recovery-required") {
    lines.push(`Recovery action: ${safe(result.action)}`, "Committed owner evidence is retained; cancellation does not override it.");
  } else if (result.kind === "rolled-back") {
    lines.push(`Rollback: ${safe(result.failure)} · ${result.restored ? "restored" : "restore incomplete"}`);
  } else if (result.kind === "rejected" || result.kind === "failed") {
    lines.push(`Code: ${safe(result.code)}`);
  } else if (result.kind === "cancelled") {
    lines.push(`Cancelled before effect at ${safe(result.phase)}`);
  } else if (result.kind === "stale" || result.kind === "conflict") {
    lines.push(`Authority changed: ${safe(result.reason)} · refresh and explicitly retry`);
  } else if (result.kind === "needs-input") {
    lines.push(...result.issues.map((issue) => `${safe(issue.code)}${issue.key === undefined ? "" : ` · ${safe(issue.key)}`}`));
  }
  if ("progress" in result) {
    lines.push("", theme.fg("accent", "Activation evidence"));
    for (const event of result.progress) lines.push(`#${event.sequence} ${safe(event.phase)} ${safe(event.state)}${event.code === undefined ? "" : ` ${safe(event.code)}`}`);
  }
  return lines;
}

export function renderPluginInstall(input: Readonly<{
  state: PluginInstallState;
  width: number;
  height: number;
  theme: Theme;
}>): readonly string[] {
  const { state, theme } = input;
  const lines: string[] = [];
  if (state.step === "choose-inspect") {
    const detail = state.candidate;
    lines.push(
      theme.fg("accent", theme.bold("Step 1/3 · Choose and inspect")),
      "Browse and inspect the complete declared surface before continuing.",
      "",
      theme.bold(safe(detail.summary.plugin)),
      `${safe(detail.summary.marketplace.text)} · ${safe(detail.summary.scope.kind)}`,
      `Source: ${safe(detail.source.kind)} · Revision: ${safe(detail.summary.revision.available?.text ?? detail.summary.revision.immutable ?? "unresolved")}`,
      theme.fg(detail.compatibility.status === "activatable" ? "success" : "error", detail.compatibility.status),
      "",
      theme.fg("accent", "Compatibility inventory"),
      `${detail.compatibility.components.counts.skills} skills · ${detail.compatibility.components.counts.hooks} hooks · ${detail.compatibility.components.counts.mcpServers} MCP servers`,
      `${detail.compatibility.components.counts.foreign} metadata/foreign components · ${detail.compatibility.requirements.length} requirements`,
      "",
      "Back to browse                         Continue",
    );
  } else if (state.step === "configure-trust" && state.session !== undefined) {
    const session = state.session;
    lines.push(
      theme.fg("accent", theme.bold("Step 2/3 · Configure and trust")),
      "Required values and exact executable trust are reviewed together.",
      "",
      theme.fg("accent", "Plugin configuration"),
    );
    for (const field of session.fields) {
      lines.push(`${safe(field.label.text)} · ${field.required ? "required" : "optional"} · ${field.sensitive ? "secret (masked input only)" : safe(field.kind)} · ${safe(field.state)}`);
    }
    lines.push(
      "",
      theme.fg("accent", "Executable surface"),
      safe(session.consent.statement.text),
      `${session.consent.components.counts.skills} skills · ${session.consent.components.counts.hooks} command hooks · ${session.consent.components.counts.mcpServers} MCP servers · persistent data access`,
    );
    if (!state.disclosure.has("executable")) {
      lines.push("Expand once to review exact hook commands, MCP process/endpoints/tools, skills, and limitations.");
    } else {
      lines.push(theme.fg("warning", "Exact executable disclosure"));
      for (const skill of session.consent.components.skills) lines.push(`skill ${safe(skill.name.text)} · ${safe(skill.root.text)}`);
      for (const hook of session.consent.components.hooks) {
        lines.push(`hook ${safe(hook.event.text)} · ${safe(hook.handler.command.text)}${hook.handler.kind === "exec" ? ` ${hook.handler.args.map((arg) => safe(arg.text)).join(" ")}` : ""}`);
      }
      for (const mcp of session.consent.components.mcpServers) {
        lines.push(`MCP ${safe(mcp.nativeKey.text)} · ${safe(mcp.transport ?? "unavailable")} · ${safe(mcp.command?.text ?? "remote endpoint")}`);
        if (mcp.toolPolicy.allowed.length > 0) lines.push(`  tools: ${mcp.toolPolicy.allowed.map((tool) => safe(tool.text)).join(", ")}`);
      }
      for (const requirement of session.consent.requirements) lines.push(`requirement ${safe(requirement.capability.text)} · ${safe(requirement.status)}`);
    }
    lines.push("", `Exact consent: ${safe(session.consent.consentId)}`, "Back                         Install complete plugin");
  } else {
    lines.push(theme.fg("accent", theme.bold("Step 3/3 · Activation result")));
    if (state.result === undefined) lines.push(theme.fg("warning", "Activation result unavailable"));
    else lines.push(...resultLines(state.result, theme));
    lines.push("", "Return to installed plugins");
  }
  return finish(lines, input.width, input.height);
}

export class PluginInstallComponent implements Component {
  private state: PluginInstallState;
  private readonly theme: Theme;
  private readonly onEvent: (event: PluginInstallEvent) => void;
  private readonly height: () => number;
  private disposed = false;

  constructor(input: Readonly<{ state: PluginInstallState; theme: Theme; height(): number; onEvent(event: PluginInstallEvent): void }>) {
    this.state = input.state;
    this.theme = input.theme;
    this.height = input.height;
    this.onEvent = input.onEvent;
  }

  update(state: PluginInstallState): void { this.state = state; }
  render(width: number): string[] { return this.disposed ? [] : [...renderPluginInstall({ state: this.state, width, height: this.height(), theme: this.theme })]; }
  handleInput(data: string): void {
    if (this.disposed) return;
    if (data === " ") this.onEvent({ type: "toggle-disclosure", key: "executable" });
    else if (data === "\u001b") this.onEvent({ type: "back" });
  }
  invalidate(): void {}
  dispose(): void { this.disposed = true; }
}
