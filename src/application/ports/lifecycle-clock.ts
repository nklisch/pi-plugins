import { z } from "zod";

/** Wall-clock evidence is persisted; monotonic time is only a local budget. */
export const EpochMillisecondsSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export type EpochMilliseconds = z.infer<typeof EpochMillisecondsSchema>;

export interface LifecycleClock {
  nowEpochMilliseconds(): EpochMilliseconds;
  monotonicMilliseconds(): number;
}
