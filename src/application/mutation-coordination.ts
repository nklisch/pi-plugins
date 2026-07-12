import { z } from "zod";
import { PluginKeySchema, type PluginKey } from "../domain/identity.js";
import {
  ScopeReferenceSchema,
  type ScopeReference,
} from "../domain/state/scope.js";

/** One plugin mutation target, qualified by its user/project scope. */
export const MutationSubjectSchema = z
  .object({
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
  })
  .strict()
  .readonly();
export type MutationSubject = z.infer<typeof MutationSubjectSchema>;

/**
 * The explicit capability passed to a scheduler callback. Nested acquisition
 * is intentionally not ambient: callers must carry this context through their
 * own call graph, which keeps the portable application layer free of
 * AsyncLocalStorage and makes unsupported recursive entry visible.
 */
export interface MutationExecutionContext {
  runNested<T>(
    subjects: readonly MutationSubject[],
    work: (context: MutationExecutionContext) => Promise<T>,
    signal: AbortSignal,
  ): Promise<T>;
}

/** Serializes mutation callbacks by canonical scope-qualified plugin key. */
export interface KeyedMutationScheduler {
  run<T>(
    subjects: readonly MutationSubject[],
    work: (context: MutationExecutionContext) => Promise<T>,
    signal: AbortSignal,
  ): Promise<T>;
}

export type { PluginKey, ScopeReference };
