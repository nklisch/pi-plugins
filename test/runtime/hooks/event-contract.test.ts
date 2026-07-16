import { describe, expect, it } from "vitest";
import { ForeignHookInputSchema, HookCancellationSchema, HookEventPlanSchema, HookSessionEvidenceSchema } from "../../../src/runtime/hooks/event-contract.js";
import { buildCompactSessionStartInput, buildPostCompactInput, buildSessionStartInput, buildStopInput } from "../../../src/runtime/hooks/event-input.js";
import { session } from "./fixtures.js";

describe("hook event contracts", () => {
  it("keeps strict foreign fields and omits ephemeral transcript paths", () => {
    const evidence = session({ transcriptPath: undefined });
    expect(HookSessionEvidenceSchema.parse(evidence)).not.toHaveProperty("transcript_path");
    const input = buildSessionStartInput(evidence, "resume");
    expect(input).toEqual(expect.objectContaining({ session_id: "session-1", cwd: "/workspace/project", hook_event_name: "SessionStart", source: "resume" }));
    expect(input).not.toHaveProperty("transcript_path");
    expect(() => ForeignHookInputSchema.parse({ ...input, permission_mode: "default" })).toThrow();
    expect(() => ForeignHookInputSchema.parse({ ...input, nativeCause: new Error("secret") })).toThrow();
  });

  it.each([
    ["startup", "startup"], ["reload", "startup"], ["new", "clear"], ["resume", "resume"], ["fork", "startup"],
  ])("maps session reason %s to %s", (reason, source) => {
    expect(buildSessionStartInput(session(), reason as never).source).toBe(source);
  });

  it("emits compact post before compact session start", () => {
    const post = buildPostCompactInput(session(), "overflow", true, false);
    const start = buildCompactSessionStartInput(session(), "overflow", true, false);
    expect(post).toEqual(expect.objectContaining({ hook_event_name: "PostCompact", trigger: "auto" }));
    expect(start).toEqual(expect.objectContaining({ hook_event_name: "SessionStart", source: "compact" }));
    expect(post.pi).toEqual(expect.objectContaining({ compact: { reason: "overflow", willRetry: true, fromExtension: false } }));
  });

  it("keeps Stop settled-only and omits unavailable assistant text", () => {
    const input = buildStopInput(session(), undefined, false);
    expect(input).toEqual(expect.objectContaining({ hook_event_name: "Stop", stop_hook_active: false }));
    expect(input).not.toHaveProperty("last_assistant_message");
    expect(HookEventPlanSchema.safeParse({ schemaVersion: 1, event: "Stop", input, cancellation: { kind: "unavailable", reason: "idle-boundary" }, hooks: [] }).success).toBe(true);
    expect(HookCancellationSchema.safeParse({ kind: "unavailable", reason: "idle-boundary" }).success).toBe(true);
  });
});
