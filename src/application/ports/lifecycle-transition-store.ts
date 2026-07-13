import { z } from "zod";
import {
  GenerationSchema,
  type Generation,
} from "../../domain/state/config-state.js";
import {
  PendingTransitionRefSchema,
  type PendingTransitionRef,
} from "../../domain/state/references.js";
import {
  ScopeReferenceSchema,
  type ScopeReference,
} from "../../domain/state/scope.js";
import { PluginKeySchema, type PluginKey } from "../../domain/identity.js";
import {
  LifecycleOperationSchema,
  LifecycleOriginSchema,
  LifecyclePluginStateSchema,
  LifecycleRetainedDataSchema,
  deriveLifecyclePendingTransitionRef,
  type LifecycleOperation,
  type LifecycleOrigin,
  type LifecyclePluginState,
  type LifecycleRetainedData,
} from "../plugin-lifecycle-contract.js";
import {
  ProjectionExpectationSchema,
  type ProjectionExpectation,
} from "./runtime-projection.js";

export const LifecycleTransitionRecordSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  reference: PendingTransitionRefSchema,
  operationId: z.string().uuid(),
  operation: LifecycleOperationSchema,
  origin: LifecycleOriginSchema,
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  startingGeneration: GenerationSchema,
  previous: LifecyclePluginStateSchema.nullable(),
  candidate: LifecyclePluginStateSchema.nullable(),
  final: LifecyclePluginStateSchema.nullable(),
  projection: ProjectionExpectationSchema,
  retainedData: LifecycleRetainedDataSchema,
}).strict().readonly();
export type LifecycleTransitionRecord = z.infer<typeof LifecycleTransitionRecordSchemaV1>;

export const LifecycleTransitionPrepareResultSchema = z.enum(["stored", "already-present"]);
export type LifecycleTransitionPrepareResult = z.infer<typeof LifecycleTransitionPrepareResultSchema>;

export const LifecycleTransitionOutcomeSchema = z.enum([
  "completed",
  "rolled-back",
  "recovery-required",
]);
export type LifecycleTransitionOutcome = z.infer<typeof LifecycleTransitionOutcomeSchema>;

export const LifecycleTransitionSettleRequestSchema = z.object({
  reference: PendingTransitionRefSchema,
  outcome: LifecycleTransitionOutcomeSchema,
  generation: GenerationSchema.optional(),
}).strict().readonly();
export type LifecycleTransitionSettleRequest = z.infer<typeof LifecycleTransitionSettleRequestSchema>;

export interface LifecycleTransitionStore {
  prepare(record: LifecycleTransitionRecord, signal: AbortSignal): Promise<LifecycleTransitionPrepareResult>;
  settle(request: LifecycleTransitionSettleRequest, signal: AbortSignal): Promise<void>;
}

/** Construct a transition record and prove its precomputed opaque reference. */
export function createLifecycleTransitionRecord(
  input: Readonly<{
    operationId: string;
    operation: LifecycleOperation;
    origin: LifecycleOrigin;
    scope: ScopeReference;
    plugin: string;
    startingGeneration: Generation;
    previous: LifecyclePluginState | null;
    candidate: LifecyclePluginState | null;
    final: LifecyclePluginState | null;
    projection: ProjectionExpectation;
    retainedData: LifecycleRetainedData;
    reference?: PendingTransitionRef;
    sha256: (bytes: Uint8Array) => Uint8Array;
  }>,
): LifecycleTransitionRecord {
  const value = LifecycleTransitionRecordSchemaV1.parse({
    schemaVersion: 1,
    reference: input.reference ?? "pending-transition-v1:sha256:" + "0".repeat(64),
    operationId: input.operationId,
    operation: input.operation,
    origin: input.origin,
    scope: input.scope,
    plugin: input.plugin,
    startingGeneration: input.startingGeneration,
    previous: input.previous,
    candidate: input.candidate,
    final: input.final,
    projection: input.projection,
    retainedData: input.retainedData,
  });
  const expected = deriveLifecyclePendingTransitionRef({
    operationId: value.operationId,
    scope: value.scope,
    plugin: value.plugin,
    startingGeneration: value.startingGeneration,
  }, input.sha256);
  if (input.reference !== undefined && input.reference !== expected) {
    throw new Error("lifecycle transition reference does not match its identity");
  }
  return LifecycleTransitionRecordSchemaV1.parse({ ...value, reference: expected });
}

export type {
  Generation,
  LifecycleOperation,
  LifecycleOrigin,
  LifecyclePluginState,
  LifecycleRetainedData,
  PluginKey,
  PendingTransitionRef,
  ProjectionExpectation,
  ScopeReference,
};
