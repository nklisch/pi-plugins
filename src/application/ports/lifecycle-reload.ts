import { z } from "zod";
import {
  ContentDigestSchema,
  type ContentDigest,
} from "../../domain/content-manifest.js";
import {
  PendingTransitionRefSchema,
  type PendingTransitionRef,
} from "../../domain/state/references.js";
import {
  PluginKeySchema,
  type PluginKey,
} from "../../domain/identity.js";
import {
  ScopeReferenceSchema,
  type ScopeReference,
} from "../../domain/state/scope.js";

export const ActivationObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("inactive"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
  }).strict().readonly(),
]);
export type ActivationObservation = z.infer<typeof ActivationObservationSchema>;

export const LifecycleReloadResultSchemaRegistry = {
  accepted: z.object({ kind: z.literal("accepted") }).strict().readonly(),
  failed: z.object({ kind: z.literal("failed"), code: z.string().min(1) }).strict().readonly(),
} as const;
const lifecycleReloadResultSchemas = Object.values(LifecycleReloadResultSchemaRegistry) as [
  (typeof LifecycleReloadResultSchemaRegistry)[keyof typeof LifecycleReloadResultSchemaRegistry],
  ...(typeof LifecycleReloadResultSchemaRegistry)[keyof typeof LifecycleReloadResultSchemaRegistry][],
];
export const LifecycleReloadResultSchema = z.discriminatedUnion("kind", lifecycleReloadResultSchemas);
export type LifecycleReloadResult = z.infer<typeof LifecycleReloadResultSchema>;

export const LifecycleReloadRequestSchema = z.object({
  scope: ScopeReferenceSchema,
  transition: PendingTransitionRefSchema,
}).strict().readonly();
export type LifecycleReloadRequest = z.infer<typeof LifecycleReloadRequestSchema>;

export const LifecycleObservationRequestSchema = z.object({
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
}).strict().readonly();
export type LifecycleObservationRequest = z.infer<typeof LifecycleObservationRequestSchema>;

/** Runtime reload remains an adapter seam; accepted is never activation proof. */
export interface LifecycleReloadPort {
  reload(request: LifecycleReloadRequest, signal: AbortSignal): Promise<LifecycleReloadResult>;
  observe(request: LifecycleObservationRequest, signal: AbortSignal): Promise<ActivationObservation>;
}

export function verifyActivationObservation(input: unknown): ActivationObservation {
  return ActivationObservationSchema.parse(input);
}

export type { ContentDigest, PendingTransitionRef, PluginKey, ScopeReference };
