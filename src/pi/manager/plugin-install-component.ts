import type { KeybindingsManager, Theme } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, wrapTextWithAnsi, type Component } from "@earendil-works/pi-tui";
import type { TrustedInstallActivationResult } from "../../application/trusted-install-contract.js";
import { formatMcpEndpoint, projectTerminalText } from "./pi-terminal-text.js";
import type { PluginInstallEvent, PluginInstallFocus, PluginInstallState } from "./plugin-install-flow.js";

function safe(value: unknown, limit = 2_048): string {
  return projectTerminalText(typeof value === "string" ? value : String(value ?? ""), limit).text;
}

function focused(state: PluginInstallState, value: PluginInstallFocus): boolean {
  if (typeof value === "string" || typeof state.focus === "string") return state.focus === value;
  return state.focus.field === value.field;
}

function choice(state: PluginInstallState, value: PluginInstallFocus, text: string, theme: Theme): string {
  return focused(state, value) ? theme.bg("selectedBg", `> ${text}`) : `  ${text}`;
}

function progressLines(state: PluginInstallState, theme: Theme): string[] {
  if (state.frames.length === 0) return state.busy ? [theme.fg("warning", "Waiting for application.control acceptance…")] : [];
  const lines = [theme.fg("accent", "Live application.control progress")];
  for (const frame of state.frames) {
    if (frame.type === "accepted") lines.push(`#${frame.sequence} accepted ${safe(frame.command)}`);
    else if (frame.type === "progress") lines.push(`#${frame.sequence} ${safe(frame.phase)} ${safe(frame.state)}${frame.code === undefined ? "" : ` ${safe(frame.code)}`}`);
  }
  return lines;
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
    lines.push(
      `Recovery action: ${safe(result.action)}`,
      result.session === undefined ? "Host recovery remains authoritative; return to status after reload." : "Review the renewed owner session before retrying recovery.",
      "Committed owner evidence is retained; cancellation does not override it.",
    );
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

function candidateDisclosure(state: PluginInstallState, theme: Theme): string[] {
  const detail = state.candidate;
  const lines = [theme.fg("accent", "Complete component inventory")];
  for (const component of [...detail.compatibility.components.skills, ...detail.compatibility.components.hooks, ...detail.compatibility.components.mcpServers, ...detail.compatibility.components.foreign]) {
    lines.push(`${safe(component.kind)} · ${safe(component.componentId)} · ${safe(component.verdict)}`);
  }
  for (const requirement of detail.compatibility.requirements) {
    lines.push(`requirement ${safe(requirement.capability.text)} · ${safe(requirement.status)} · ${safe(requirement.explanation.text)}`);
  }
  if (lines.length === 1) lines.push("No declared executable components or requirements");
  return lines;
}

function executableDisclosure(state: PluginInstallState, theme: Theme): string[] {
  const session = state.session;
  if (session === undefined) return [];
  const lines = [theme.fg("warning", "Exact executable disclosure")];
  for (const skill of session.consent.components.skills) lines.push(`skill ${safe(skill.name.text)} · ${safe(skill.root.text)} · ${safe(skill.verdict)}`);
  for (const hook of session.consent.components.hooks) {
    lines.push(`hook ${safe(hook.event.text)} · ${safe(hook.handler.command.text)}${hook.handler.kind === "exec" ? ` ${hook.handler.args.map((arg) => safe(arg.text)).join(" ")}` : ""} · ${safe(hook.verdict)}`);
  }
  for (const mcp of session.consent.components.mcpServers) {
    lines.push(`MCP ${safe(mcp.nativeKey.text)} · ${safe(mcp.transport ?? "unavailable")} · ${safe(mcp.command?.text ?? (mcp.url === undefined ? "remote endpoint" : formatMcpEndpoint(mcp.url)))} · ${safe(mcp.verdict)}`);
    lines.push(`  tools: ${mcp.toolPolicy.allowed.map((tool) => safe(tool.text)).join(", ") || "runtime discovery"}`);
  }
  for (const component of session.consent.components.foreign) lines.push(`foreign ${safe(component.nativeHost)} ${safe(component.nativeKind.text)} · ${safe(component.verdict)}`);
  for (const requirement of session.consent.requirements) lines.push(`requirement ${safe(requirement.capability.text)} · ${safe(requirement.status)} · ${safe(requirement.explanation.text)}`);
  if (session.consent.configurationEnvironmentNames.length > 0) lines.push(`configuration environment names: ${session.consent.configurationEnvironmentNames.map((name) => safe(name.text)).join(", ")}`);
  lines.push(`persistent data access: ${session.consent.persistentData ? "declared" : "not declared"}`);
  lines.push(`limitations: subagent interception ${safe(session.consent.subagentInterception)} · remote MCP discovery ${safe(session.consent.remoteMcpDiscovery)}`);
  return lines;
}

type InstallContent = Readonly<{ before: readonly string[]; disclosure: readonly string[]; after: readonly string[] }>;

function installContent(state: PluginInstallState, theme: Theme): InstallContent {
  if (state.step === "choose-inspect") {
    const detail = state.candidate;
    return {
      before: [
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
        choice(state, "disclosure", state.disclosure.has("candidate-components") ? "Collapse complete inventory" : "Expand complete inventory", theme),
      ],
      disclosure: state.disclosure.has("candidate-components") ? candidateDisclosure(state, theme) : [],
      after: ["", ...progressLines(state, theme), ...(state.busy ? [""] : []), choice(state, "back", "Back to browse", theme), choice(state, "continue", state.busy ? "Opening current candidate…" : "Continue", theme)],
    };
  }
  if (state.step === "configure-trust" && state.session !== undefined) {
    const session = state.session;
    const before: string[] = [
      theme.fg("accent", theme.bold("Step 2/3 · Configure and trust")),
      "Required values and exact executable trust are reviewed together.",
      "",
      theme.fg("accent", "Plugin configuration"),
    ];
    for (const field of session.fields) {
      const value = state.values[field.key];
      const status = field.sensitive ? "secret (masked custody at apply)" : value === undefined ? safe(field.state) : `set: ${safe(value)}`;
      before.push(choice(state, { field: field.key }, `${safe(field.label.text)} · ${field.required ? "required" : "optional"} · ${status}`, theme));
    }
    before.push(
      "",
      theme.fg("accent", "Executable surface"),
      safe(session.consent.statement.text),
      `${session.consent.components.counts.skills} skills · ${session.consent.components.counts.hooks} command hooks · ${session.consent.components.counts.mcpServers} MCP servers · persistent data access`,
      choice(state, "disclosure", state.disclosure.has("executable") ? "Collapse exact executable disclosure" : "Expand exact executable disclosure", theme),
    );
    const reviewed = state.consentId === session.consent.consentId;
    return {
      before,
      disclosure: state.disclosure.has("executable") ? executableDisclosure(state, theme) : [],
      after: [
        "",
        ...progressLines(state, theme),
        ...(state.busy ? [""] : []),
        `Exact consent: ${safe(session.consent.consentId)}`,
        reviewed ? theme.fg("success", "✓ complete executable disclosure reviewed") : theme.fg("warning", "Review the expanded disclosure to its end before applying"),
        choice(state, "back", "Back", theme),
        choice(state, "continue", state.busy
          ? `${state.submission === "recover" ? "Recovering" : "Applying"} through application.control…`
          : state.submission === "recover" ? "Retry owner recovery" : "Install complete plugin", theme),
      ],
    };
  }
  const recoverySession = state.result?.kind === "recovery-required" && state.result.action !== "run-recovery"
    ? state.result.session
    : undefined;
  return {
    before: [theme.fg("accent", theme.bold("Step 3/3 · Activation result")), ...(state.result === undefined ? [theme.fg("warning", "Activation result unavailable")] : resultLines(state.result, theme))],
    disclosure: [],
    after: ["", choice(state, "continue", recoverySession === undefined ? "Return to installed plugins" : "Review recovery configuration", theme)],
  };
}

export function renderPluginInstall(input: Readonly<{
  state: PluginInstallState;
  width: number;
  height: number;
  theme: Theme;
}>): readonly string[] {
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const content = installContent(input.state, input.theme);
  const before = content.before.flatMap((line) => wrapTextWithAnsi(line, width));
  const disclosure = content.disclosure.flatMap((line) => wrapTextWithAnsi(line, width));
  const after = content.after.flatMap((line) => wrapTextWithAnsi(line, width));
  const all = [...before, ...disclosure, ...after].map((line) => truncateToWidth(line, width, ""));
  const base = input.state.focus === "disclosure" && disclosure.length > 0
    ? before.length + input.state.scroll.disclosure
    : input.state.scroll.content;
  const max = Math.max(0, all.length - height);
  const start = Math.max(0, Math.min(base, max));
  return Object.freeze(all.slice(start, start + height));
}

export type PluginInstallComponentAction =
  | Readonly<{ type: "continue" | "back" | "cancel" }>
  | Readonly<{ type: "edit-field"; key: string; sensitive: boolean }>;

export class PluginInstallComponent implements Component {
  private state: PluginInstallState;
  private readonly theme: Theme;
  private readonly keybindings: KeybindingsManager;
  private readonly onEvent: (event: PluginInstallEvent) => void;
  private readonly onAction: (action: PluginInstallComponentAction) => void;
  private readonly height: () => number;
  private disposed = false;
  private disclosureMax = 0;

  constructor(input: Readonly<{
    state: PluginInstallState;
    theme: Theme;
    keybindings: KeybindingsManager;
    height(): number;
    onEvent(event: PluginInstallEvent): void;
    onAction(action: PluginInstallComponentAction): void;
  }>) {
    this.state = input.state;
    this.theme = input.theme;
    this.keybindings = input.keybindings;
    this.height = input.height;
    this.onEvent = input.onEvent;
    this.onAction = input.onAction;
  }

  update(state: PluginInstallState): void { this.state = state; }
  render(width: number): string[] {
    if (this.disposed) return [];
    const content = installContent(this.state, this.theme);
    const disclosureLines = content.disclosure.flatMap((line) => wrapTextWithAnsi(line, Math.max(1, width))).length;
    this.disclosureMax = Math.max(0, disclosureLines - Math.max(1, this.height() - 4));
    return [...renderPluginInstall({ state: this.state, width, height: this.height(), theme: this.theme })];
  }

  private focusOrder(): readonly PluginInstallFocus[] {
    if (this.state.step === "choose-inspect") return ["disclosure", "back", "continue"];
    if (this.state.step === "activation-result") return ["continue"];
    return [
      ...(this.state.session?.fields.map((field) => Object.freeze({ field: field.key })) ?? []),
      "disclosure",
      "back",
      "continue",
    ];
  }

  private moveFocus(delta: number): void {
    const order = this.focusOrder();
    const current = order.findIndex((entry) => focused(this.state, entry));
    this.onEvent({ type: "focus", focus: order[(Math.max(0, current) + delta + order.length) % order.length]! });
  }

  private activate(): void {
    if (this.state.busy) return;
    const currentFocus = this.state.focus;
    if (typeof currentFocus !== "string") {
      const field = this.state.session?.fields.find((entry) => entry.key === currentFocus.field);
      if (field !== undefined) this.onAction({ type: "edit-field", key: field.key, sensitive: field.sensitive });
      return;
    }
    if (this.state.focus === "disclosure") {
      this.onEvent({ type: "toggle-disclosure", key: this.state.step === "choose-inspect" ? "candidate-components" : "executable" });
      return;
    }
    if (this.state.focus === "back") {
      this.onAction({ type: "back" });
      return;
    }
    if (this.state.step === "configure-trust" && this.state.session !== undefined) {
      if (!this.state.disclosure.has("executable") || this.state.scroll.disclosure < this.disclosureMax) return;
      this.onEvent({ type: "consent", consentId: this.state.session.consent.consentId });
    }
    this.onAction({ type: "continue" });
  }

  handleInput(data: string): void {
    if (this.disposed) return;
    const page = Math.max(1, this.height() - 4);
    if (matchesKey(data, Key.tab)) this.moveFocus(1);
    else if (matchesKey(data, Key.shift("tab"))) this.moveFocus(-1);
    else if (this.keybindings.matches(data, "tui.select.confirm")) this.activate();
    else if (this.keybindings.matches(data, "tui.select.cancel") || this.keybindings.matches(data, "app.interrupt")) this.onAction(this.state.busy ? { type: "cancel" } : { type: "back" });
    else if (this.keybindings.matches(data, "tui.select.up")) this.onEvent({ type: "scroll", region: this.state.focus === "disclosure" ? "disclosure" : "content", delta: -1 });
    else if (this.keybindings.matches(data, "tui.select.down")) this.onEvent({ type: "scroll", region: this.state.focus === "disclosure" ? "disclosure" : "content", delta: 1 });
    else if (this.keybindings.matches(data, "tui.select.pageUp")) this.onEvent({ type: "scroll", region: this.state.focus === "disclosure" ? "disclosure" : "content", delta: -page });
    else if (this.keybindings.matches(data, "tui.select.pageDown")) this.onEvent({ type: "scroll", region: this.state.focus === "disclosure" ? "disclosure" : "content", delta: page });
  }
  invalidate(): void {}
  dispose(): void { this.disposed = true; }
}
