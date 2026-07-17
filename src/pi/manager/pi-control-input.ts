import type { ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type {
  NativeControlInputPort,
  NativeControlInputRequest,
  NativeControlInputResult,
} from "../../application/ports/native-control-input.js";
import type { SensitiveValue } from "../../application/sensitive-value.js";
import { ConfirmationOverlay } from "./confirmation-overlay.js";
import { MaskedInputOverlay, type MaskedInputResult } from "./masked-input-overlay.js";
import { projectTerminalText } from "./pi-terminal-text.js";

export interface PiControlInputPort extends NativeControlInputPort {
  cancel(): void;
  dispose(): void;
}

function safe(value: unknown, limit = 512): string {
  return projectTerminalText(typeof value === "string" ? value : String(value ?? ""), limit).text;
}

function unavailable(code: Extract<NativeControlInputResult, { kind: "unavailable" }>["code"]): NativeControlInputResult {
  return Object.freeze({ kind: "unavailable" as const, code });
}

/** UI custody adapter. Configuration/trust validation stays in application.control. */
export function createPiControlInputPort(input: Readonly<{
  context: ExtensionCommandContext;
  mode: ExtensionContext["mode"];
}>): PiControlInputPort {
  let terminal = false;
  let cancelled = false;
  let collecting = false;
  let cancelActive: (() => void) | undefined;

  async function masked(label: string, signal: AbortSignal): Promise<MaskedInputResult> {
    let settle: ((value: MaskedInputResult) => void) | undefined;
    const abort = () => settle?.(Object.freeze({ kind: "cancelled" }));
    signal.addEventListener("abort", abort, { once: true });
    cancelActive = abort;
    try {
      return await input.context.ui.custom<MaskedInputResult>((_tui, theme, keybindings, done) => {
        settle = done;
        return new MaskedInputOverlay({ theme, keybindings, label, done });
      }, { overlay: true, overlayOptions: { anchor: "center", width: "60%", minWidth: 36, maxHeight: 7, margin: 1 } });
    } finally {
      signal.removeEventListener("abort", abort);
      if (cancelActive === abort) cancelActive = undefined;
      settle = undefined;
    }
  }

  async function confirm(request: NativeControlInputRequest, signal: AbortSignal): Promise<boolean> {
    const lines = [
      `purpose: ${safe(request.purpose)}`,
      ...(request.expected.plugin === undefined ? [] : [`plugin: ${safe(request.expected.plugin)}`]),
      ...(request.expected.scope === undefined ? [] : [`scope: ${safe(request.expected.scope.kind)}`]),
      ...(request.expected.immutableRevision === undefined ? [] : [`revision: ${safe(request.expected.immutableRevision)}`]),
      ...(request.consent === undefined ? [] : [
        safe(request.consent.statement.text),
        `runtime: ${request.consent.components.counts.skills} skills · ${request.consent.components.counts.hooks} hooks · ${request.consent.components.counts.mcpServers} MCP servers · persistent data`,
        `limitations: subagents ${safe(request.consent.subagentInterception)} · remote MCP discovery ${safe(request.consent.remoteMcpDiscovery)}`,
      ]),
    ];
    const disclosure = request.consent === undefined ? [] : [
      ...request.consent.components.skills.map((skill) => `skill ${safe(skill.name.text)} · ${safe(skill.root.text)}`),
      ...request.consent.components.hooks.map((hook) => `hook ${safe(hook.event.text)} · ${safe(hook.handler.command.text)}${hook.handler.kind === "exec" ? ` ${hook.handler.args.map((arg) => safe(arg.text)).join(" ")}` : ""}`),
      ...request.consent.components.mcpServers.map((mcp) => `MCP ${safe(mcp.nativeKey.text)} · ${safe(mcp.transport ?? "unavailable")} · ${safe(mcp.command?.text ?? mcp.url?.host.text ?? "remote")} · tools ${mcp.toolPolicy.allowed.map((tool) => safe(tool.text)).join(", ") || "runtime discovery"}`),
      ...request.consent.components.foreign.map((component) => `foreign ${safe(component.nativeHost)} ${safe(component.nativeKind.text)} · ${safe(component.verdict)}`),
      ...request.consent.requirements.map((requirement) => `requirement ${safe(requirement.capability.text)} · ${safe(requirement.status)} · ${safe(requirement.explanation.text)}`),
      ...(request.consent.configurationEnvironmentNames.length === 0 ? [] : [`configuration environment names: ${request.consent.configurationEnvironmentNames.map((name) => safe(name.text)).join(", ")}`]),
    ];
    if (input.mode === "rpc") return input.context.ui.confirm("Plugin trust / action", [...lines, ...disclosure].join(" · "), { signal });
    let settle: ((confirmed: boolean) => void) | undefined;
    const abort = () => settle?.(false);
    signal.addEventListener("abort", abort, { once: true });
    cancelActive = abort;
    try {
      return await input.context.ui.custom<boolean>((_tui, theme, keybindings, done) => {
        settle = done;
        return new ConfirmationOverlay({ theme, keybindings, title: "Confirm exact plugin action", lines, disclosure, done });
      }, { overlay: true, overlayOptions: { anchor: "center", width: "70%", minWidth: 40, maxHeight: "70%", margin: 1 } });
    } finally {
      signal.removeEventListener("abort", abort);
      if (cancelActive === abort) cancelActive = undefined;
      settle = undefined;
    }
  }

  const port: PiControlInputPort = {
    async collect(request: NativeControlInputRequest, signal: AbortSignal): Promise<NativeControlInputResult> {
      if (terminal || cancelled) return Object.freeze({ kind: "cancelled" as const });
      if (collecting) return unavailable("CHANNEL_UNSUPPORTED");
      if (input.mode === "json" || input.mode === "print") return unavailable("NO_TTY");
      if (request.channel.kind !== "none" && request.channel.kind !== "provided") return unavailable("CHANNEL_UNSUPPORTED");
      if (request.fields.some((field) => field.sensitive) && input.mode !== "tui") return unavailable("SECRET_PROMPT_UNAVAILABLE");
      if (request.purpose === "project-sync-resolution") return unavailable("CHANNEL_UNSUPPORTED");
      signal.throwIfAborted();
      collecting = true;
      const nonSensitive: Array<Readonly<{ key: string; value: unknown }>> = [];
      const sensitive: Array<Readonly<{ key: string; value: SensitiveValue }>> = [];
      try {
        for (const field of request.fields) {
          if (field.state === "configured" || field.state === "defaulted") continue;
          if (field.sensitive) {
            const result = await masked(field.label.text, signal);
            if (result.kind === "cancelled") return Object.freeze({ kind: "cancelled" as const });
            sensitive.push(Object.freeze({ key: field.key, value: result.value }));
          } else {
            const value = await input.context.ui.input(field.label.text, field.description?.text, { signal });
            if (value === undefined) return Object.freeze({ kind: "cancelled" as const });
            nonSensitive.push(Object.freeze({ key: field.key, value }));
          }
        }
        const consentId = request.consent?.consentId ?? request.expected.consentId;
        if (request.purpose === "uninstall") return unavailable("CHANNEL_UNSUPPORTED");
        const approved = await confirm(request, signal);
        if (!approved) {
          return consentId === undefined
            ? Object.freeze({ kind: "cancelled" as const })
            : Object.freeze({ kind: "supplied" as const, nonSensitive: Object.freeze(nonSensitive), sensitive: Object.freeze(sensitive), decision: Object.freeze({ kind: "deny" as const, consentId }) });
        }
        return Object.freeze({
          kind: "supplied" as const,
          nonSensitive: Object.freeze(nonSensitive),
          sensitive: Object.freeze(sensitive),
          decision: consentId === undefined
            ? Object.freeze({ kind: "confirm" as const })
            : Object.freeze({ kind: "grant" as const, consentId }),
        });
      } catch (error) {
        if (signal.aborted || cancelled || error instanceof DOMException && error.name === "AbortError") {
          return Object.freeze({ kind: "cancelled" as const });
        }
        return unavailable(input.mode === "tui" ? "NO_TTY" : "CHANNEL_UNSUPPORTED");
      } finally {
        collecting = false;
        cancelActive = undefined;
      }
    },
    cancel(): void {
      cancelled = true;
      cancelActive?.();
    },
    dispose(): void {
      if (terminal) return;
      terminal = true;
      cancelled = true;
      cancelActive?.();
      cancelActive = undefined;
    },
  };
  return Object.freeze(port);
}
