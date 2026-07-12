import type { ProjectKey } from "../../domain/state/scope.js";

/**
 * Application-facing project trust seam. The adapter owns Pi's project trust
 * policy; lifecycle policy only asks about this exact, already-derived key.
 */
export interface ProjectTrustPort {
  assess(
    projectKey: ProjectKey,
    signal: AbortSignal,
  ): Promise<
    | Readonly<{ kind: "trusted" }>
    | Readonly<{ kind: "untrusted" }>
  >;
}
