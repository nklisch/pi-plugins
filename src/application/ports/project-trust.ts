import { z } from "zod";
import type { ProjectKey } from "../../domain/state/scope.js";

export const ProjectTrustAssessmentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("trusted") }).strict(),
  z.object({ kind: z.literal("untrusted") }).strict(),
]).readonly();
export type ProjectTrustAssessment = z.infer<typeof ProjectTrustAssessmentSchema>;

/**
 * Application-facing project trust seam. The adapter owns Pi's project trust
 * policy; lifecycle policy only asks about this exact, already-derived key.
 */
export interface ProjectTrustPort {
  assess(
    projectKey: ProjectKey,
    signal: AbortSignal,
  ): Promise<ProjectTrustAssessment>;
}
