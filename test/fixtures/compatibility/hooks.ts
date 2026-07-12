import { CompatibilityPolicyRegistry } from "../../../src/domain/compatibility-policy.js";
import { directPlugin, fixtureProvenance, claimFixture, componentId, type PolicyFixture } from "./common.js";

function hook(
  event: string,
  handler: { kind: "shell" | "exec"; command: string; args?: readonly string[] },
  metadata: readonly unknown[] = [],
  token = "1",
): unknown {
  const path = "hooks/hooks.json";
  const pointer = `/hooks/${event}`;
  return {
    kind: "hook" as const,
    id: componentId("hook", token),
    event: claimFixture(event, fixtureProvenance(path, pointer, "claude", "hooks")),
    handler: claimFixture(handler, fixtureProvenance(path, `${pointer}/0/hooks/0`, "claude", "hooks")),
    metadata,
  };
}

function metadata(key: string, value: unknown, pointer: string): unknown {
  return {
    key,
    claimed: claimFixture(value, fixtureProvenance("hooks/hooks.json", pointer, "claude", "hooks")),
  };
}

const shellHook = (token = "1") => hook("SessionStart", { kind: "shell", command: "echo ready" }, [], token);
const baseline = () => directPlugin({ components: { hooks: [shellHook()] } });

export const hookPolicyFixtures: readonly PolicyFixture[] = [
  {
    id: "hook-command",
    ruleId: "hook.command",
    positive: baseline,
    negative: () => directPlugin(),
    positiveVerdict: "supported",
  },
  {
    id: "hook-status-message",
    ruleId: "hook.status-message",
    positive: () => directPlugin({ components: { hooks: [hook("SessionStart", { kind: "shell", command: "echo ready" }, [
      metadata("claude.hook.statusMessage", "starting", "/hooks/SessionStart/0/statusMessage"),
    ], "2")] } }),
    negative: baseline,
    positiveVerdict: "supported",
    diagnosticRuleId: "hook.status-message",
  },
  {
    id: "hook-shell-bash",
    ruleId: "hook.shell.bash",
    positive: () => directPlugin({ components: { hooks: [shellHook("3")] } }),
    negative: () => directPlugin({ components: { hooks: [hook("SessionStart", { kind: "exec", command: "bash", args: [] }, [], "4")] } }),
    positiveVerdict: "supported",
  },
  {
    id: "hook-shell-powershell",
    ruleId: "hook.shell.powershell",
    positive: () => directPlugin({ components: { hooks: [hook("SessionStart", { kind: "shell", command: "Write-Output ready" }, [
      metadata("claude.hook.shell", "powershell", "/hooks/SessionStart/0/shell"),
    ], "5")] } }),
    negative: baseline,
    positiveVerdict: "supported",
  },
  {
    id: "hook-if-rule",
    ruleId: "hook.if-rule",
    positive: () => directPlugin({ components: { hooks: [hook("PreToolUse", { kind: "exec", command: "check", args: [] }, [
      metadata("claude.hook.if", { field: "tool_name", operator: "equals", value: "bash" }, "/hooks/PreToolUse/0/if"),
    ], "6")] } }),
    negative: () => directPlugin({ components: { hooks: [hook("PreToolUse", { kind: "exec", command: "check", args: [] }, [
      metadata("claude.hook.if", { field: "tool_name", operator: "unknown", value: "bash" }, "/hooks/PreToolUse/0/if"),
    ], "7")] } }),
    positiveVerdict: "supported",
  },
  {
    id: "hook-async",
    ruleId: "hook.async",
    positive: () => directPlugin({ components: { hooks: [
      hook("SessionStart", { kind: "shell", command: "echo ready" }, [
        metadata("claude.hook.async", true, "/hooks/SessionStart/0/async"),
      ], "8"),
      hook("SessionEnd", { kind: "shell", command: "echo ready" }, [
        metadata("claude.hook.asyncRewake", true, "/hooks/SessionEnd/0/asyncRewake"),
      ], "9"),
    ] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "hook.async",
  },
  {
    id: "hook-handler-unsupported",
    ruleId: "hook.handler.unsupported",
    positive: () => directPlugin({ components: { foreign: [{
      kind: "foreign",
      id: componentId("foreign", "9"),
      nativeHost: "claude",
      nativeKind: claimFixture("hook-handler", fixtureProvenance("hooks/hooks.json", "/hooks/SessionStart/0/hooks/0/type", "claude", "hooks")),
      declarationSubkey: "event:SessionStart/handler-type",
      declaration: claimFixture({ type: "http", url: "https://example.invalid/CANARY" }, fixtureProvenance("hooks/hooks.json", "/hooks/SessionStart/0/hooks/0", "claude", "hooks")),
    }] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "hook.handler.unsupported",
  },
  {
    id: "hook-event-supported",
    ruleId: "hook.event.supported",
    positive: () => directPlugin({ components: { hooks: CompatibilityPolicyRegistry.hookEvents.supported.map((event, index) =>
      hook(event, { kind: "exec", command: "check", args: [] }, [], `d${(index + 1).toString(16)}`),
    ) } }),
    negative: () => directPlugin({ components: { hooks: [hook("PermissionRequest", { kind: "exec", command: "check", args: [] }, [], "11")] } }),
    positiveVerdict: "supported",
  },
  {
    id: "hook-event-subagent",
    ruleId: "hook.event.subagent",
    positive: () => directPlugin({ components: { hooks: [hook("SubagentStart", { kind: "exec", command: "check", args: [] }, [], "12")] } }),
    negative: baseline,
    positiveVerdict: "supported",
  },
  {
    id: "hook-event-incompatible",
    ruleId: "hook.event.incompatible",
    positive: () => directPlugin({ components: { hooks: CompatibilityPolicyRegistry.hookEvents.incompatible.map((event, index) =>
      hook(event, { kind: "exec", command: "check", args: [] }, [], `a${(index + 1).toString(16)}`),
    ) } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "hook.event.incompatible",
  },
  {
    id: "hook-event-default-deny",
    ruleId: "hook.event.default-deny",
    positive: () => directPlugin({ components: { hooks: [hook("FutureLifecycleEvent", { kind: "exec", command: "check", args: [] }, [], "b")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "hook.event.default-deny",
  },
];

export const hookIngestionFixtures = {
  supported: {
    hooks: {
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: "echo start", timeout: 1, statusMessage: "starting" }] }],
      UserPromptSubmit: [{ hooks: [{ type: "exec", command: "check", args: ["prompt"] }] }],
      PreToolUse: [{ matcher: "Write|Edit", hooks: [{ type: "exec", command: "check", args: ["tool"], conditions: { field: "tool_name", operator: "equals", value: "write" } }] }],
      SubagentStart: [{ hooks: [{ type: "exec", command: "check", args: ["subagent"] }] }],
        SubagentStop: [{ hooks: [{ type: "exec", command: "check", args: ["subagent-stop"] }] }],
      },
    },
  },
  unknowns: {
    hooks: {
      hooks: {
        FutureLifecycleEvent: [{ hooks: [{ type: "command", command: "echo unknown" }] }],
        PermissionRequest: [{ hooks: [{ type: "command", command: "echo permission" }] }],
        SessionEnd: [{ hooks: [{ type: "http", url: "https://example.invalid/CANARY_HANDLER" }] }],
      },
    },
  },
} as const;
