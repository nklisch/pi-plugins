import { z } from "zod";
import {
  ContentDigestSchema,
  type ContentDigest,
} from "../../domain/content-manifest.js";
import { ComponentIdSchema } from "../../domain/components.js";
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
import {
  CurrentProjectRuntimeContextSchema,
  type CurrentProjectRuntimeContext,
} from "./project-trust.js";
import {
  ProjectionExpectationSchema,
  type ProjectionExpectation,
} from "./runtime-projection.js";

export const ActivationObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("inactive"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
  }).strict().readonly(),
]);
export type ActivationObservation = z.infer<typeof ActivationObservationSchema>;

export const RuntimeContributionParticipantSchema = z.enum(["skills-hooks", "mcp"]);
export type RuntimeContributionParticipant = z.infer<typeof RuntimeContributionParticipantSchema>;

export const RuntimeContributionObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    participant: RuntimeContributionParticipantSchema,
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
  }).strict().readonly(),
  z.object({
    kind: z.literal("inactive"),
    participant: RuntimeContributionParticipantSchema,
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
  }).strict().readonly(),
]);
export type RuntimeContributionObservation = z.infer<typeof RuntimeContributionObservationSchema>;

export const SkillHookContributionObservationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("active"),
    participant: z.literal("skills-hooks"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
    skillComponentIds: z.array(ComponentIdSchema).readonly(),
    hookComponentIds: z.array(ComponentIdSchema).readonly(),
  }).strict().readonly(),
  z.object({
    kind: z.literal("inactive"),
    participant: z.literal("skills-hooks"),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    projectionDigest: ContentDigestSchema,
    currentProject: CurrentProjectRuntimeContextSchema,
    contributionDigest: ContentDigestSchema,
    skillComponentIds: z.tuple([]),
    hookComponentIds: z.tuple([]),
  }).strict().readonly(),
]);
export type SkillHookContributionObservation = z.infer<typeof SkillHookContributionObservationSchema>;

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

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]));
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function contributionBase(value: unknown, participant: RuntimeContributionParticipant): RuntimeContributionObservation {
  let parsed: SkillHookContributionObservation | RuntimeContributionObservation;
  if (participant === "skills-hooks") {
    try {
      parsed = SkillHookContributionObservationSchema.parse(value);
    } catch {
      parsed = RuntimeContributionObservationSchema.parse(value);
    }
  } else {
    parsed = RuntimeContributionObservationSchema.parse(value);
  }
  if (parsed.participant !== participant) throw new Error("runtime contribution participant is unexpected");
  const { skillComponentIds: _skills, hookComponentIds: _hooks, ...base } = parsed as SkillHookContributionObservation & RuntimeContributionObservation;
  return RuntimeContributionObservationSchema.parse({ ...base, participant });
}

function expectedContributionMatches(
  observation: RuntimeContributionObservation,
  expectation: ProjectionExpectation,
): boolean {
  if (expectation.kind === "active") {
    return observation.kind === "active" &&
      sameJson(observation.scope, expectation.projection.scope) &&
      observation.plugin === expectation.projection.plugin &&
      observation.revision === expectation.projection.revision &&
      observation.projectionDigest === expectation.projection.digest;
  }
  return observation.kind === "inactive" &&
    sameJson(observation.scope, expectation.scope) &&
    observation.plugin === expectation.plugin &&
    observation.projectionDigest === expectation.digest;
}

function currentProjectMatches(left: CurrentProjectRuntimeContext, right: CurrentProjectRuntimeContext): boolean {
  return sameJson(left, right);
}

function projectEvidenceIsUsable(observation: RuntimeContributionObservation): boolean {
  if (observation.scope.kind !== "project") return true;
  return observation.currentProject.projectKey === observation.scope.projectKey && observation.currentProject.trust.kind === "trusted";
}

export function composeActivationObservation(input: Readonly<{
  expectation: ProjectionExpectation;
  skillsHooks: RuntimeContributionObservation | SkillHookContributionObservation;
  mcp: RuntimeContributionObservation;
}>): ActivationObservation {
  const expectation = ProjectionExpectationSchema.parse(input.expectation);
  const skillsHooks = contributionBase(input.skillsHooks, "skills-hooks");
  const mcp = contributionBase(input.mcp, "mcp");
  if (skillsHooks.participant === mcp.participant || !expectedContributionMatches(skillsHooks, expectation) || !expectedContributionMatches(mcp, expectation)) {
    throw new Error("runtime contribution evidence does not match the expected projection");
  }
  if (skillsHooks.kind !== mcp.kind || !currentProjectMatches(skillsHooks.currentProject, mcp.currentProject) || !projectEvidenceIsUsable(skillsHooks) || !projectEvidenceIsUsable(mcp)) {
    throw new Error("runtime contribution evidence disagrees");
  }
  if (expectation.kind === "active") {
    if (skillsHooks.kind !== "active" || mcp.kind !== "active") throw new Error("active contribution evidence is incomplete");
    return ActivationObservationSchema.parse({
      kind: "active",
      scope: expectation.projection.scope,
      plugin: expectation.projection.plugin,
      revision: expectation.projection.revision,
      projectionDigest: expectation.projection.digest,
      currentProject: skillsHooks.currentProject,
    });
  }
  return ActivationObservationSchema.parse({
    kind: "inactive",
    scope: expectation.scope,
    plugin: expectation.plugin,
    projectionDigest: expectation.digest,
    currentProject: skillsHooks.currentProject,
  });
}

/** Runtime reload remains an adapter seam; accepted is never activation proof. */
export interface LifecycleReloadPort {
  reload(request: LifecycleReloadRequest, signal: AbortSignal): Promise<LifecycleReloadResult>;
  observe(request: LifecycleObservationRequest, signal: AbortSignal): Promise<ActivationObservation>;
}

export function verifyActivationObservation(input: unknown): ActivationObservation {
  return ActivationObservationSchema.parse(input);
}

export type {
  ContentDigest,
  CurrentProjectRuntimeContext,
  PendingTransitionRef,
  PluginKey,
  ScopeReference,
};