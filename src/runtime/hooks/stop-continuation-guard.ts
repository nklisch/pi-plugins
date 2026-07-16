import { HOOK_STOP_CONTINUATION_BUDGET } from "../../domain/hook-runtime-limits.js";

export interface StopContinuationGuard {
  state(): Readonly<{ stopHookActive: boolean; used: number; remaining: number }>;
  request(): "allowed" | "exhausted";
  settleWithoutContinuation(): void;
  reset(reason: "user-input" | "shutdown" | "session-replacement" | "reload"): void;
}

export function createStopContinuationGuard(
  budget = HOOK_STOP_CONTINUATION_BUDGET,
): StopContinuationGuard {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new TypeError("stop continuation budget must be nonnegative");
  let active = false;
  let used = 0;
  let generation = 0;
  const state = () => Object.freeze({ stopHookActive: active, used, remaining: Math.max(0, budget - used) });
  return Object.freeze({
    state,
    request(): "allowed" | "exhausted" {
      if (used >= budget) return "exhausted";
      used += 1;
      active = true;
      return "allowed";
    },
    settleWithoutContinuation(): void {
      active = false;
      used = 0;
      generation += 1;
      void generation;
    },
    reset(_reason: "user-input" | "shutdown" | "session-replacement" | "reload"): void {
      active = false;
      used = 0;
      generation += 1;
      void generation;
    },
  });
}
