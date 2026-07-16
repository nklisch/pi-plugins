import { describe, expect, it } from "vitest";
import type {
  SubagentExecutionIdentity,
  SubagentExecutionPath,
  SubagentLifecycleInterceptor,
  SubagentLifecycleRegistration,
} from "../../src/application/ports/subagent-lifecycle.js";
import type {
  SubagentExecutionTrace,
  SubagentLifecycleContractHarness,
} from "../support/fakes/subagent-lifecycle.js";

let nextRun = 1;

export function lifecycleIdentity(
  overrides: Partial<SubagentExecutionIdentity> = {},
): SubagentExecutionIdentity {
  return {
    schemaVersion: 1,
    agentId: "agent-contract",
    sessionId: "child-session-contract",
    runId: `run-contract-${nextRun++}`,
    agentType: "implementor",
    parentSessionId: "parent-session-contract",
    ...overrides,
  };
}

export function lifecyclePath(
  overrides: Partial<SubagentExecutionPath> = {},
): SubagentExecutionPath {
  return {
    phase: "initial",
    origin: "tool",
    mode: "foreground",
    admission: "immediate",
    ...overrides,
  };
}

async function register(
  harness: SubagentLifecycleContractHarness,
  interceptor: SubagentLifecycleInterceptor,
): Promise<SubagentLifecycleRegistration> {
  const signal = new AbortController().signal;
  const qualification = await harness.lifecycle.capabilities(signal);
  return harness.lifecycle.register({
    interceptor,
    expectedQualificationDigest: qualification.qualificationDigest,
    maxContinuationRounds: 3,
  }, signal);
}

function firstIndex(trace: SubagentExecutionTrace, checkpoint: string): number {
  return trace.checkpoints.indexOf(checkpoint as never);
}

/** Shared package-independent behavior suite for every lifecycle adapter. */
export function defineSubagentLifecycleContract(
  name: string,
  create: () =>
    | SubagentLifecycleContractHarness
    | Promise<SubagentLifecycleContractHarness>,
): void {
  describe(`subagent lifecycle contract: ${name}`, () => {
    it("covers every execution path without changing no-interceptor order", async () => {
      const harness = await create();
      const variants = {
        phase: ["initial", "resume"],
        origin: ["tool", "service"],
        mode: ["foreground", "background"],
        admission: ["immediate", "queued"],
      } as const;
      for (const phase of variants.phase) {
        for (const origin of variants.origin) {
          for (const mode of variants.mode) {
            for (const admission of variants.admission) {
              const trace = await harness.execute({
                identity: lifecycleIdentity({
                  ...(origin === "service" ? { parentSessionId: undefined } : {}),
                }),
                execution: lifecyclePath({ phase, origin, mode, admission }),
                prompt: "EXACT_PROMPT_SECRET_CANARY",
                proposedResults: ["PROPOSED_RESULT_SECRET_CANARY"],
                signal: new AbortController().signal,
              });
              expect(trace.checkpoints).toEqual([
                "prompt",
                "proposed-result",
                "finalize",
                "completion-event",
              ]);
              expect(trace.terminal).toBe("completed");
              expect(JSON.stringify(trace)).not.toContain("SECRET_CANARY");
            }
          }
        }
      }
      await harness.shutdown();
    });

    it("awaits interceptors in registration order and pipes replacements", async () => {
      const harness = await create();
      const seen: string[] = [];
      await register(harness, {
        beforeStart: async (request) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          seen.push(`start-1:${request.prompt}`);
          return { action: "continue", prompt: `${request.prompt}:first` };
        },
        beforeComplete: async (request) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          seen.push(`complete-1:${request.proposedResult}`);
          return { action: "complete", result: `${request.proposedResult}:first` };
        },
      });
      await register(harness, {
        beforeStart: async (request) => {
          seen.push(`start-2:${request.prompt}`);
          return { action: "continue", prompt: `${request.prompt}:second` };
        },
        beforeComplete: async (request) => {
          seen.push(`complete-2:${request.proposedResult}`);
          return { action: "complete", result: `${request.proposedResult}:second` };
        },
      });

      const trace = await harness.execute({
        identity: lifecycleIdentity(),
        execution: lifecyclePath(),
        prompt: "prompt",
        proposedResults: ["result"],
        signal: new AbortController().signal,
      });
      expect(seen).toEqual([
        "start-1:prompt",
        "start-2:prompt:first",
        "complete-1:result",
        "complete-2:result:first",
      ]);
      expect(trace.checkpoints).toEqual([
        "start-interceptor",
        "start-interceptor",
        "prompt",
        "proposed-result",
        "completion-interceptor",
        "completion-interceptor",
        "finalize",
        "completion-event",
      ]);
      await harness.shutdown();
    });

    it("aborts start before prompt and propagates cancellation while awaiting start", async () => {
      const blocked = await create();
      await register(blocked, {
        beforeStart: async () => ({
          action: "abort",
          code: "hook-blocked",
          reason: "safe reason",
        }),
        beforeComplete: async (request) => ({ action: "complete", result: request.proposedResult }),
      });
      const blockedTrace = await blocked.execute({
        identity: lifecycleIdentity(),
        execution: lifecyclePath(),
        prompt: "secret prompt",
        proposedResults: ["secret result"],
        signal: new AbortController().signal,
      });
      expect(blockedTrace.terminal).toBe("aborted");
      expect(blockedTrace.checkpoints).toEqual(["start-interceptor"]);
      await blocked.shutdown();

      const cancelled = await create();
      let entered!: () => void;
      const didEnter = new Promise<void>((resolve) => { entered = resolve; });
      await register(cancelled, {
        beforeStart: async () => {
          entered();
          return new Promise(() => undefined);
        },
        beforeComplete: async (request) => ({ action: "complete", result: request.proposedResult }),
      });
      const controller = new AbortController();
      const reason = new Error("caller-owned cancellation");
      const execution = cancelled.execute({
        identity: lifecycleIdentity(),
        execution: lifecyclePath(),
        prompt: "secret prompt",
        proposedResults: ["secret result"],
        signal: controller.signal,
      });
      await didEnter;
      controller.abort(reason);
      await expect(execution).rejects.toBe(reason);
      await cancelled.shutdown();
    });

    it("intercepts completion before finalization and continues the same immutable run to the exact bound", async () => {
      const harness = await create();
      const identities: string[] = [];
      await register(harness, {
        beforeStart: async (request) => ({ action: "continue", prompt: request.prompt }),
        beforeComplete: async (request) => {
          identities.push(JSON.stringify({
            identity: request.identity,
            execution: request.execution,
            round: request.continuationRound,
          }));
          return { action: "continue", prompt: `round-${request.continuationRound}` };
        },
      });
      const trace = await harness.execute({
        identity: lifecycleIdentity(),
        execution: lifecyclePath({ phase: "resume", origin: "service", mode: "background", admission: "queued" }),
        prompt: "secret prompt",
        proposedResults: ["result-0", "result-1", "result-2", "result-3"],
        outcome: "steered",
        signal: new AbortController().signal,
      });

      expect(trace.terminal).toBe("aborted");
      expect(trace.continuationRounds).toBe(3);
      expect(trace.decisionKinds.at(-1)).toBe("completion:abort:continuation-limit");
      expect(trace.checkpoints.filter((value) => value === "continuation-prompt")).toHaveLength(3);
      expect(trace.checkpoints).not.toContain("finalize");
      expect(trace.checkpoints).not.toContain("completion-event");
      expect(new Set(identities.map((value) => JSON.parse(value).identity.runId)).size).toBe(1);
      expect(identities.map((value) => JSON.parse(value).round)).toEqual([0, 1, 2, 3]);
      await harness.shutdown();
    });

    it("keeps disposal idempotent and unregister affects future snapshots only", async () => {
      const harness = await create();
      let secondCalls = 0;
      let second!: SubagentLifecycleRegistration;
      await register(harness, {
        beforeStart: async (request) => {
          await second.dispose();
          return { action: "continue", prompt: request.prompt };
        },
        beforeComplete: async (request) => ({ action: "complete", result: request.proposedResult }),
      });
      second = await register(harness, {
        beforeStart: async (request) => {
          secondCalls += 1;
          return { action: "continue", prompt: request.prompt };
        },
        beforeComplete: async (request) => {
          secondCalls += 1;
          return { action: "complete", result: request.proposedResult };
        },
      });

      const first = await harness.execute({
        identity: lifecycleIdentity(),
        execution: lifecyclePath(),
        prompt: "prompt",
        proposedResults: ["result"],
        signal: new AbortController().signal,
      });
      expect(first.checkpoints.filter((value) => value === "start-interceptor")).toHaveLength(2);
      expect(secondCalls).toBe(1);
      await second.dispose();
      await harness.execute({
        identity: lifecycleIdentity(),
        execution: lifecyclePath(),
        prompt: "prompt",
        proposedResults: ["result"],
        signal: new AbortController().signal,
      });
      expect(secondCalls).toBe(1);
      await harness.shutdown();
    });

    it("rejects reused execution identity and disposes sessions exactly once", async () => {
      const harness = await create();
      const identity = lifecycleIdentity();
      const request = {
        identity,
        execution: lifecyclePath(),
        prompt: "secret prompt",
        proposedResults: ["secret result"],
        signal: new AbortController().signal,
      } as const;
      await harness.execute(request);
      await expect(harness.execute(request)).rejects.toThrow("run id was reused");
      await harness.disposeSession(identity.sessionId);
      await harness.disposeSession(identity.sessionId);
      await harness.shutdown();
    });

    it("never lets completion cancellation cross the finalization window", async () => {
      const harness = await create();
      let entered!: () => void;
      const didEnter = new Promise<void>((resolve) => { entered = resolve; });
      await register(harness, {
        beforeStart: async (request) => ({ action: "continue", prompt: request.prompt }),
        beforeComplete: async () => {
          entered();
          return new Promise(() => undefined);
        },
      });
      const controller = new AbortController();
      const reason = new Error("cancel completion");
      const execution = harness.execute({
        identity: lifecycleIdentity(),
        execution: lifecyclePath(),
        prompt: "secret prompt",
        proposedResults: ["secret result"],
        signal: controller.signal,
      });
      await didEnter;
      controller.abort(reason);
      await expect(execution).rejects.toBe(reason);
      await harness.shutdown();
    });
  });
}

/** Small receiver-side validator used by negative-harness tests. */
export function traceContractViolations(trace: SubagentExecutionTrace): readonly string[] {
  const violations: string[] = [];
  const prompt = firstIndex(trace, "prompt");
  const start = firstIndex(trace, "start-interceptor");
  const finalize = firstIndex(trace, "finalize");
  const completion = firstIndex(trace, "completion-interceptor");
  const completionEvent = firstIndex(trace, "completion-event");
  if (start >= 0 && (prompt < 0 || start > prompt)) violations.push("start-after-prompt");
  if (completion >= 0 && finalize >= 0 && completion > finalize) violations.push("completion-after-finalize");
  if (completionEvent >= 0 && finalize < 0) violations.push("event-without-finalize");
  if (trace.continuationRounds > 3) violations.push("unbounded-continuation");
  return Object.freeze(violations);
}
