import {
  SubagentExecutionIdentitySchemaV1,
  SubagentExecutionPathSchemaV1,
  type SubagentCompletionDecision,
  type SubagentCompletionRequest,
  type SubagentLifecycleInterceptor,
  type SubagentStartDecision,
  type SubagentStartRequest,
} from "../../application/ports/subagent-lifecycle.js";
import { aggregateHookDecisions } from "../hooks/hook-decision-aggregator.js";
import {
  HookSessionEvidenceSchema,
  type HookEventPlan,
} from "../hooks/event-contract.js";
import type { GuardedCommandHookExecutor } from "../hooks/guarded-command-executor.js";
import type { SubagentHookEventPlanner } from "../hooks/hook-event-planner.js";
import type { SubagentHookSessionContextPort } from "./subagent-hook-session-context.js";

const START_BLOCK_REASON = "Subagent start was blocked by a configured hook";
const HOOK_FAILURE_REASON = "Subagent hook execution could not be accepted";
const RUNTIME_DISPOSED_REASON = "Subagent hook runtime is disposed";
const CONTINUATION_LIMIT_REASON = "Subagent hook continuation limit is exhausted";
export const SUBAGENT_STOP_CONTINUATION_FALLBACK =
  "Continue working in this same session and address the hook feedback before completing.";

export interface SubagentHookCoordinator extends SubagentLifecycleInterceptor {
  dispose(): Promise<void>;
}

function runtimeAbortDecision(
  boundary: "start" | "completion",
): SubagentStartDecision | SubagentCompletionDecision {
  return boundary === "start"
    ? {
        action: "abort",
        code: "runtime-disposed",
        reason: RUNTIME_DISPOSED_REASON,
      }
    : {
        action: "abort",
        code: "runtime-disposed",
        reason: RUNTIME_DISPOSED_REASON,
      };
}

function hookFailureDecision(
  boundary: "start" | "completion",
): SubagentStartDecision | SubagentCompletionDecision {
  return boundary === "start"
    ? { action: "abort", code: "hook-failed", reason: HOOK_FAILURE_REASON }
    : { action: "abort", code: "hook-failed", reason: HOOK_FAILURE_REASON };
}

function cancellationReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function sameSessionEvidence(
  planned: ReturnType<typeof HookSessionEvidenceSchema.parse>,
  current: ReturnType<typeof HookSessionEvidenceSchema.parse>,
): boolean {
  return planned.sessionId === current.sessionId &&
    planned.transcriptPath === current.transcriptPath &&
    planned.cwd === current.cwd &&
    planned.piProjectTrusted === current.piProjectTrusted &&
    JSON.stringify(planned.currentProject) === JSON.stringify(current.currentProject);
}

function exactStartContinuation(prompt: string, contexts: readonly string[]): string {
  const accepted = contexts.filter((context) => context.length > 0);
  return accepted.length === 0 ? prompt : `${prompt}\n\n${accepted.join("\n\n")}`;
}

function exactStopContinuation(
  contexts: readonly string[],
  reason: string | undefined,
): string {
  const parts = contexts.filter((context) => context.length > 0);
  if (reason !== undefined && reason.length > 0) parts.push(reason);
  return parts.length === 0
    ? SUBAGENT_STOP_CONTINUATION_FALLBACK
    : parts.join("\n\n");
}

/**
 * One aggregate interceptor over the existing planner/executor/aggregator.
 * It owns no child session, turn loop, process runner, configuration resolver,
 * or package behavior.
 */
export function createSubagentHookCoordinator(input: Readonly<{
  planner: SubagentHookEventPlanner;
  executor: GuardedCommandHookExecutor;
  sessions: SubagentHookSessionContextPort;
  runtimeSignal: AbortSignal;
  continuationBudget: number;
}>): SubagentHookCoordinator {
  if (
    input === null ||
    typeof input !== "object" ||
    input.planner === null ||
    typeof input.planner !== "object" ||
    typeof input.planner.plan !== "function" ||
    typeof input.planner.hasMatchingSubagentHooks !== "function" ||
    input.executor === null ||
    typeof input.executor !== "object" ||
    typeof input.executor.execute !== "function" ||
    input.sessions === null ||
    typeof input.sessions !== "object" ||
    typeof input.sessions.resolve !== "function" ||
    !(input.runtimeSignal instanceof AbortSignal) ||
    !Number.isInteger(input.continuationBudget) ||
    input.continuationBudget <= 0
  ) {
    throw new TypeError("subagent hook coordinator dependencies are invalid");
  }

  const disposed = new AbortController();
  let disposePromise: Promise<void> | undefined;

  function runtimeUnavailable(): boolean {
    return input.runtimeSignal.aborted || disposed.signal.aborted;
  }

  function noOpStart(request: SubagentStartRequest): SubagentStartDecision {
    return { action: "continue", prompt: request.prompt };
  }

  function noOpCompletion(
    request: SubagentCompletionRequest,
  ): SubagentCompletionDecision {
    return { action: "complete", result: request.proposedResult };
  }

  type SelectedPlan = Readonly<{
    plan: HookEventPlan;
    session: ReturnType<typeof HookSessionEvidenceSchema.parse>;
  }>;

  async function selectedPlan(
    boundary: "start" | "completion",
    request: SubagentStartRequest | SubagentCompletionRequest,
    signal: AbortSignal,
  ): Promise<SelectedPlan | SubagentStartDecision | SubagentCompletionDecision | undefined> {
    const event = boundary === "start" ? "SubagentStart" : "SubagentStop";
    try {
      if (!input.planner.hasMatchingSubagentHooks(event, request.identity.agentType)) {
        return undefined;
      }
    } catch {
      return hookFailureDecision(boundary);
    }
    const parentSessionId = request.identity.parentSessionId;
    if (parentSessionId === undefined) return undefined;

    let session;
    try {
      session = await input.sessions.resolve(parentSessionId, signal);
    } catch {
      if (request.signal.aborted) throw cancellationReason(request.signal);
      if (runtimeUnavailable()) return runtimeAbortDecision(boundary);
      return hookFailureDecision(boundary);
    }
    if (request.signal.aborted) throw cancellationReason(request.signal);
    if (runtimeUnavailable()) return runtimeAbortDecision(boundary);
    if (session === undefined) return hookFailureDecision(boundary);

    try {
      const parsedSession = HookSessionEvidenceSchema.parse(session);
      if (parsedSession.sessionId !== parentSessionId) {
        return hookFailureDecision(boundary);
      }
      const result = boundary === "start"
        ? input.planner.plan({
            kind: "subagent-start",
            session: parsedSession,
            identity: request.identity,
            execution: request.execution,
            signal,
          })
        : input.planner.plan({
            kind: "subagent-stop",
            session: parsedSession,
            identity: request.identity,
            execution: request.execution,
            proposedResult: (request as SubagentCompletionRequest).proposedResult,
            outcome: (request as SubagentCompletionRequest).outcome,
            continuationRound: (request as SubagentCompletionRequest).continuationRound,
            maxContinuationRounds: (request as SubagentCompletionRequest).maxContinuationRounds,
            signal,
          });
      if (result.kind !== "ready" || result.plans.length !== 1) {
        return hookFailureDecision(boundary);
      }
      return Object.freeze({ plan: result.plans[0]!, session: parsedSession });
    } catch {
      return hookFailureDecision(boundary);
    }
  }

  async function executePlan(
    boundary: "start" | "completion",
    request: SubagentStartRequest | SubagentCompletionRequest,
    selected: SelectedPlan,
    signal: AbortSignal,
  ) {
    const { plan } = selected;
    if (plan.hooks.length === 0) return aggregateHookDecisions({
      event: plan.event,
      originalInput: plan.input,
      decisions: [],
    });
    let result;
    try {
      const currentSession = HookSessionEvidenceSchema.parse(
        await input.sessions.resolve(request.identity.parentSessionId!, signal),
      );
      if (!sameSessionEvidence(selected.session, currentSession)) {
        return hookFailureDecision(boundary);
      }
      result = await input.executor.execute(plan, {
        currentProject: currentSession.currentProject,
        runtimeSignal: signal,
      });
    } catch {
      if (request.signal.aborted) throw cancellationReason(request.signal);
      if (runtimeUnavailable()) return runtimeAbortDecision(boundary);
      return hookFailureDecision(boundary);
    }
    if (request.signal.aborted) throw cancellationReason(request.signal);
    if (runtimeUnavailable()) return runtimeAbortDecision(boundary);
    if (result.kind !== "completed") return hookFailureDecision(boundary);
    const aggregate = aggregateHookDecisions({
      event: plan.event,
      originalInput: plan.input,
      decisions: result.handlers,
    });
    return aggregate.diagnostics.length === 0
      ? aggregate
      : hookFailureDecision(boundary);
  }

  async function beforeStart(
    requestInput: SubagentStartRequest,
  ): Promise<SubagentStartDecision> {
    requestInput.signal.throwIfAborted();
    if (runtimeUnavailable()) return runtimeAbortDecision("start") as SubagentStartDecision;
    let request: SubagentStartRequest;
    try {
      request = Object.freeze({
        identity: SubagentExecutionIdentitySchemaV1.parse(requestInput.identity),
        execution: SubagentExecutionPathSchemaV1.parse(requestInput.execution),
        prompt: typeof requestInput.prompt === "string"
          ? requestInput.prompt
          : (() => { throw new TypeError("prompt is required"); })(),
        signal: requestInput.signal,
      });
    } catch {
      return hookFailureDecision("start") as SubagentStartDecision;
    }
    if (request.identity.parentSessionId === undefined) return noOpStart(request);
    const signal = AbortSignal.any([
      request.signal,
      input.runtimeSignal,
      disposed.signal,
    ]);
    const selected = await selectedPlan("start", request, signal);
    if (selected === undefined) return noOpStart(request);
    if (!("plan" in selected)) return selected as SubagentStartDecision;
    const result = await executePlan("start", request, selected, signal);
    if ("action" in result) return result as SubagentStartDecision;
    if (result.block !== undefined || result.stop !== undefined || result.continuation !== undefined) {
      return { action: "abort", code: "hook-blocked", reason: START_BLOCK_REASON };
    }
    return {
      action: "continue",
      prompt: exactStartContinuation(request.prompt, result.contexts),
    };
  }

  async function beforeComplete(
    requestInput: SubagentCompletionRequest,
  ): Promise<SubagentCompletionDecision> {
    requestInput.signal.throwIfAborted();
    if (runtimeUnavailable()) return runtimeAbortDecision("completion") as SubagentCompletionDecision;
    let request: SubagentCompletionRequest;
    try {
      if (
        typeof requestInput.proposedResult !== "string" ||
        !Number.isInteger(requestInput.continuationRound) ||
        requestInput.continuationRound < 0 ||
        requestInput.maxContinuationRounds !== input.continuationBudget
      ) throw new TypeError("completion request is invalid");
      request = Object.freeze({
        identity: SubagentExecutionIdentitySchemaV1.parse(requestInput.identity),
        execution: SubagentExecutionPathSchemaV1.parse(requestInput.execution),
        proposedResult: requestInput.proposedResult,
        outcome: requestInput.outcome,
        continuationRound: requestInput.continuationRound,
        maxContinuationRounds: requestInput.maxContinuationRounds,
        signal: requestInput.signal,
      });
    } catch {
      return hookFailureDecision("completion") as SubagentCompletionDecision;
    }
    if (request.identity.parentSessionId === undefined) return noOpCompletion(request);
    const signal = AbortSignal.any([
      request.signal,
      input.runtimeSignal,
      disposed.signal,
    ]);
    const selected = await selectedPlan("completion", request, signal);
    if (selected === undefined) return noOpCompletion(request);
    if (!("plan" in selected)) return selected as SubagentCompletionDecision;
    const result = await executePlan("completion", request, selected, signal);
    if ("action" in result) return result as SubagentCompletionDecision;
    if (result.block !== undefined || result.stop !== undefined) {
      return { action: "abort", code: "hook-failed", reason: HOOK_FAILURE_REASON };
    }
    if (result.continuation === undefined) return noOpCompletion(request);
    if (request.continuationRound >= input.continuationBudget) {
      return {
        action: "abort",
        code: "continuation-limit",
        reason: CONTINUATION_LIMIT_REASON,
      };
    }
    return {
      action: "continue",
      prompt: exactStopContinuation(result.contexts, result.continuation.reason),
    };
  }

  function dispose(): Promise<void> {
    disposePromise ??= Promise.resolve().then(() => {
      if (!disposed.signal.aborted) {
        disposed.abort(new DOMException(RUNTIME_DISPOSED_REASON, "AbortError"));
      }
    });
    return disposePromise;
  }

  return Object.freeze({ beforeStart, beforeComplete, dispose });
}
