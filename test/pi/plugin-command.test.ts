import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { NativePluginControlService } from "../../src/application/native-control-service.js";
import type { NativeControlExecutionReport } from "../../src/application/ports/native-control-execution.js";
import type { PackagedPluginHost } from "../../src/composition/packaged-plugin-host-contract.js";
import { createNativeControlEnvelope } from "../../src/application/native-control-contract.js";
import { createPluginCommandAdapter } from "../../src/pi/plugin-command.js";
import { createPiControlChannel } from "../../src/pi/pi-control-channel.js";

const executionId = "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" as never;

function report(command: "presentation" | "status" = "status"): NativeControlExecutionReport {
  return {
    envelope: createNativeControlEnvelope({ executionId, command, status: command === "presentation" ? "presentation-required" : "ok" }),
    delivery: "complete",
    deliveredThrough: -1,
  };
}

function harness(mode: ExtensionContext["mode"] = "tui") {
  const commands: Array<{ name: string; options: any }> = [];
  const entries: Array<{ type: string; data: unknown }> = [];
  const notifications: string[] = [];
  const pi = {
    registerCommand(name: string, options: any) { commands.push({ name, options }); },
    getCommands: () => [{
      name: "plugin:1",
      source: "extension",
      sourceInfo: { path: "/pkg/dist/pi/extension.js", source: "pkg", scope: "user", origin: "package" },
    }],
    appendEntry(type: string, data: unknown) { entries.push({ type, data }); },
  } as unknown as ExtensionAPI;
  const context = {
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    cwd: "/workspace",
    signal: undefined,
    waitForIdle: vi.fn(async () => undefined),
    ui: { notify: (message: string) => notifications.push(message) },
    sessionManager: { getSessionId: () => "session-1", getSessionFile: () => undefined },
  } as unknown as ExtensionCommandContext;
  return { pi, context, commands, entries, notifications };
}

function control(runText = vi.fn(async () => report())): NativePluginControlService {
  const parseText = vi.fn((text: string) => text.length === 0
    ? { kind: "parsed", command: { command: "presentation", request: {}, invocation: { grammarVersion: "plugin-control/v1", output: "human", nonInteractive: false, input: { kind: "none" } } } }
    : { kind: "parsed", command: { command: "status", request: {}, invocation: { grammarVersion: "plugin-control/v1", output: "human", nonInteractive: false, input: { kind: "none" } } } });
  return {
    grammarVersion: "plugin-control/v1",
    parseText,
    parseArgv: vi.fn(),
    help: vi.fn(),
    complete: vi.fn(() => ({ grammarVersion: "plugin-control/v1", candidates: [], incomplete: false })),
    execute: vi.fn(),
    runArgv: vi.fn(),
    runText,
    poll: vi.fn(),
    cancel: vi.fn(),
  } as unknown as NativePluginControlService;
}

function host(controlService: NativePluginControlService): PackagedPluginHost {
  return {
    current: () => ({ application: { control: controlService }, startup: {} as never, close: vi.fn() }),
    start: vi.fn(),
    dispose: vi.fn(),
    runWithPiOperationContext: vi.fn(async (_ctx, _signal, use) => use({ control: controlService })),
  };
}

describe("Pi /plugin command adapter", () => {
  it("registers exactly one command and preserves raw argv text byte-for-byte", async () => {
    const h = harness();
    const runText = vi.fn(async () => report("status"));
    const service = control(runText);
    const manager = { open: vi.fn(), presentReport: vi.fn(), dynamicCompletions: () => [] as const, close: vi.fn() };
    const adapter = createPluginCommandAdapter({ pi: h.pi, host: host(service), manager, channel: createPiControlChannel({ pi: h.pi }) });

    adapter.register();
    expect(h.commands.map((entry) => entry.name)).toEqual(["plugin"]);
    const raw = "browse  'α beta'\t--scope=all-current";
    await h.commands[0]!.options.handler(raw, h.context);
    expect(runText).toHaveBeenCalledWith(raw, expect.objectContaining({ mode: "tui" }), expect.any(AbortSignal));
    expect(manager.open).not.toHaveBeenCalled();
  });

  it("opens only the TUI manager for empty text and keeps headless empty dispatch on the facade", async () => {
    const tui = harness("tui");
    const tuiControl = control();
    const manager = { open: vi.fn(async () => undefined), presentReport: vi.fn(), dynamicCompletions: () => [] as const, close: vi.fn() };
    const adapter = createPluginCommandAdapter({ pi: tui.pi, host: host(tuiControl), manager, channel: createPiControlChannel({ pi: tui.pi }) });
    adapter.register();
    await tui.commands[0]!.options.handler("", tui.context);
    expect(tui.context.waitForIdle).toHaveBeenCalledOnce();
    expect(manager.open).toHaveBeenCalledOnce();
    expect(tuiControl.runText).not.toHaveBeenCalled();

    const rpc = harness("rpc");
    const rpcRun = vi.fn(async () => report("presentation"));
    const rpcControl = control(rpcRun);
    createPluginCommandAdapter({ pi: rpc.pi, host: host(rpcControl), manager, channel: createPiControlChannel({ pi: rpc.pi }) }).register();
    await rpc.commands[0]!.options.handler("", rpc.context);
    expect(manager.open).toHaveBeenCalledOnce();
    expect(rpcRun).toHaveBeenCalledWith("", expect.objectContaining({ mode: "rpc" }), expect.any(AbortSignal));
    expect(rpc.entries.at(-1)).toMatchObject({ type: "plugin-host:control-report-v1" });
  });

  it("reports Pi-assigned command suffixes without overriding the collision", () => {
    const h = harness();
    const adapter = createPluginCommandAdapter({
      pi: h.pi,
      host: host(control()),
      manager: { open: vi.fn(), presentReport: vi.fn(), dynamicCompletions: () => [] as const, close: vi.fn() },
      channel: createPiControlChannel({ pi: h.pi }),
    });
    adapter.register();
    adapter.bindSession(h.context);
    expect(h.notifications).toEqual([expect.stringContaining("/plugin:1")]);
    expect(h.commands).toHaveLength(1);
  });

  it("hands reload-causing subcommand results to the successor without touching predecessor UI", async () => {
    const h = harness("tui");
    const envelope = createNativeControlEnvelope({ executionId, command: "lifecycle.enable", status: "ok" });
    const service = control(vi.fn(async () => ({ envelope, delivery: "complete", deliveredThrough: -1 })));
    vi.mocked(service.parseText).mockReturnValue({
      kind: "parsed",
      command: { command: "lifecycle.enable", request: {} as never, invocation: { grammarVersion: "plugin-control/v1", output: "human", nonInteractive: false, input: { kind: "none" } } },
      warnings: [],
    });
    const manager = { open: vi.fn(), presentReport: vi.fn(), dynamicCompletions: () => [] as const, close: vi.fn() };
    const handoff = { open: vi.fn(() => ({ id: "ticket" })), publish: vi.fn(() => "successor"), fail: vi.fn() } as any;
    createPluginCommandAdapter({ pi: h.pi, host: host(service), manager, channel: createPiControlChannel({ pi: h.pi }), handoff }).register();
    await h.commands[0]!.options.handler("enable demo@market --scope user --yes", h.context);
    expect(handoff.open).toHaveBeenCalledWith({ sessionId: "session-1", cwd: "/workspace", destination: "operation-result" });
    expect(handoff.publish).toHaveBeenCalledWith({ id: "ticket" }, envelope);
    expect(manager.presentReport).not.toHaveBeenCalled();
    expect(h.notifications).toEqual([]);
  });

  it("derives completion from the facade and safe cached dynamic candidates", () => {
    const h = harness();
    const service = control();
    vi.mocked(service.complete).mockReturnValue({
      grammarVersion: "plugin-control/v1",
      candidates: [{ value: "demo@market", kind: "dynamic", canonical: true, safe: { text: "demo", escaped: false, truncated: false } }],
      incomplete: false,
    });
    const adapter = createPluginCommandAdapter({
      pi: h.pi,
      host: host(service),
      manager: { open: vi.fn(), presentReport: vi.fn(), dynamicCompletions: () => [{ category: "plugin", value: "demo@market", safe: { text: "demo", escaped: false, truncated: false } }] as const, close: vi.fn() },
      channel: createPiControlChannel({ pi: h.pi }),
    });
    adapter.register();
    expect(h.commands[0]!.options.getArgumentCompletions("show d")).toEqual([{ value: "demo@market", label: "demo" }]);
    expect(service.complete).toHaveBeenCalledWith(expect.objectContaining({ text: "show d", dynamic: expect.any(Array) }));
  });

  it("writes bounded facade-derived print frames and no ANSI", async () => {
    let bytes = "";
    const output = new Writable({ write(chunk, _encoding, callback) { bytes += String(chunk); callback(); } });
    const h = harness("print");
    const channel = createPiControlChannel({ pi: h.pi, output });
    const sink = channel.createSink(h.context, "print");
    await sink.write({ schemaVersion: 1, type: "accepted", executionId, sequence: 0, command: "status" }, new AbortController().signal);
    await sink.write({ schemaVersion: 1, type: "progress", executionId, sequence: 1, phase: "loading", state: "started", safe: [] }, new AbortController().signal);
    await sink.write({ schemaVersion: 1, type: "result", executionId, sequence: 2, result: report("status").envelope }, new AbortController().signal);
    expect(bytes).toContain("loading started");
    expect(bytes).not.toContain("\u001b");
    expect(h.entries).toEqual([]);
  });
});
