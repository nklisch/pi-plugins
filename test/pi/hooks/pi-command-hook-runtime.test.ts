import { describe, expect, it, vi } from "vitest";
import { registerPiCommandHookRuntime } from "../../../src/pi/hooks/pi-command-hook-runtime.js";
import { createPiHookEventAdapter } from "../../../src/pi/hooks/pi-hook-event-adapter.js";
import { createHookEventPlanner } from "../../../src/runtime/hooks/hook-event-planner.js";
import { createStopContinuationGuard } from "../../../src/runtime/hooks/stop-continuation-guard.js";
import { catalog, hook, project, session, snapshot } from "../../runtime/hooks/fixtures.js";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PiHookDecisionAdapter } from "../../../src/pi/hooks/pi-hook-decision-adapter.js";

function fakeApi() {
  const handlers = new Map<string, (event: unknown, ctx: ExtensionContext) => unknown>();
  const api = {
    on: vi.fn((name: string, handler: (event: unknown, ctx: ExtensionContext) => unknown) => handlers.set(name, handler)),
    sendMessage: vi.fn(),
    setSessionName: vi.fn(),
  } as unknown as ExtensionAPI;
  return { api, handlers };
}

const ctx = {
  cwd: "/workspace/project",
  signal: undefined,
  hasUI: false,
  mode: "print",
  isProjectTrusted: () => true,
  sessionManager: { getSessionId: () => "session-1", getSessionFile: () => "/sessions/session-1.jsonl", getBranch: () => [] },
} as unknown as ExtensionContext;

describe("Pi command-hook runtime registration", () => {
  it("registers only ordinary boundaries in the designed order", () => {
    const { api, handlers } = fakeApi();
    const planner = createHookEventPlanner({ catalog: catalog([]) });
    const events = createPiHookEventAdapter({ planner, currentProject: () => project });
    const decisions = {
      applyInput: vi.fn(), applyToolCall: vi.fn(), applyToolResult: vi.fn(), applyBeforeCompact: vi.fn(), applyLifecycle: vi.fn(), applyStop: vi.fn(),
    } as unknown as PiHookDecisionAdapter;
    registerPiCommandHookRuntime({
      pi: api,
      events,
      executor: { execute: vi.fn(async () => ({ kind: "completed", handlers: [] })) },
      decisions,
      continuation: createStopContinuationGuard(),
      currentProject: () => project,
      runtimeSignal: new AbortController().signal,
    });
    expect([...handlers.keys()]).toEqual(["session_start", "session_shutdown", "input", "tool_call", "tool_result", "session_before_compact", "session_compact", "agent_settled"]);
    expect(handlers.has("subagent_start")).toBe(false);
    expect(handlers.has("subagent_stop")).toBe(false);
  });

  it("executes planner plans at the callback position and returns native input handled", async () => {
    const { api, handlers } = fakeApi();
    const planner = createHookEventPlanner({ catalog: catalog([snapshot({ kind: "user" }, [hook("UserPromptSubmit", undefined, [], "a")])]) });
    const events = createPiHookEventAdapter({ planner, currentProject: () => project });
    const applyInput = vi.fn(async () => ({ action: "handled" as const }));
    const decisions = { applyInput, applyToolCall: vi.fn(), applyToolResult: vi.fn(), applyBeforeCompact: vi.fn(), applyLifecycle: vi.fn(), applyStop: vi.fn() } as unknown as PiHookDecisionAdapter;
    const execute = vi.fn(async () => ({ kind: "completed" as const, handlers: [] }));
    registerPiCommandHookRuntime({ pi: api, events, executor: { execute }, decisions, continuation: createStopContinuationGuard(), currentProject: () => project, runtimeSignal: new AbortController().signal });
    const result = await handlers.get("input")!({ type: "input", text: "hello", source: "interactive" }, ctx);
    expect(result).toEqual({ action: "handled" });
    expect(execute).toHaveBeenCalledOnce();
    expect(applyInput).toHaveBeenCalledOnce();
  });

  it("preserves compact plan order through sequential lifecycle application", async () => {
    const { api, handlers } = fakeApi();
    const planner = createHookEventPlanner({ catalog: catalog([snapshot({ kind: "user" }, [hook("PostCompact", "manual", [], "a"), hook("SessionStart", "compact", [], "b")])]) });
    const events = createPiHookEventAdapter({ planner, currentProject: () => project });
    const applied: string[] = [];
    const decisions = { applyInput: vi.fn(), applyToolCall: vi.fn(), applyToolResult: vi.fn(), applyBeforeCompact: vi.fn(), applyLifecycle: vi.fn(async (_ctx, value) => applied.push(value.event)), applyStop: vi.fn() } as unknown as PiHookDecisionAdapter;
    registerPiCommandHookRuntime({ pi: api, events, executor: { execute: vi.fn(async () => ({ kind: "completed" as const, handlers: [] })) }, decisions, continuation: createStopContinuationGuard(), currentProject: () => project, runtimeSignal: new AbortController().signal });
    await handlers.get("session_compact")!({ type: "session_compact", reason: "manual", willRetry: false, fromExtension: false }, ctx);
    expect(applied).toEqual(["PostCompact", "SessionStart"]);
  });
});
