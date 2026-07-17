import type { CommandRunner } from "../application/ports/process-runner.js";
import type { ProjectRootAuthorityPort, ProjectRootResolutionPort } from "../application/ports/project-root-authority.js";
import type { CurrentProjectRuntimeContext, ProjectTrustPort } from "../application/ports/project-trust.js";
import type { PiSessionBindingPort } from "../composition/packaged-plugin-host-contract.js";
import { createProjectRootAuthorityPort } from "../composition/create-project-root-authority.js";
import { createScopeContext, type ScopeContext } from "../domain/state/scope.js";
import type { Sha256 } from "../domain/source.js";
import { createNodeProjectRootResolver } from "../infrastructure/project/node-project-root-resolver.js";

export type PiProjectContextAdapters = Readonly<{
  resolution: ProjectRootResolutionPort;
  authority: ProjectRootAuthorityPort;
  trust: ProjectTrustPort;
  scope: Extract<ScopeContext, { kind: "project" }>;
  current(): CurrentProjectRuntimeContext;
}>;

/** Build exact project identity and live Pi trust from one bound session. */
export async function createPiProjectContextAdapters(input: Readonly<{
  binding: PiSessionBindingPort;
  sha256: Sha256;
  git?: Pick<CommandRunner, "run">;
}>): Promise<PiProjectContextAdapters> {
  if (input === null || typeof input !== "object" || typeof input.sha256 !== "function") {
    throw new TypeError("Pi project context dependencies are required");
  }
  const cwd = input.binding.current().cwd;
  const resolution = createNodeProjectRootResolver({
    cwd,
    sha256: input.sha256,
    ...(input.git === undefined ? {} : { git: input.git }),
  });
  const resolved = createScopeContext(await resolution.resolve(new AbortController().signal), input.sha256);
  if (resolved.kind !== "project") throw new Error("project resolver returned user scope");
  const authority = createProjectRootAuthorityPort(resolution, input.sha256);
  const trust: ProjectTrustPort = Object.freeze({
    async assess(
      projectKey: Parameters<ProjectTrustPort["assess"]>[0],
      signal: AbortSignal,
    ) {
      signal.throwIfAborted();
      return projectKey === resolved.projectKey && input.binding.isProjectTrusted()
        ? { kind: "trusted" as const }
        : { kind: "untrusted" as const };
    },
  });
  return Object.freeze({
    resolution,
    authority,
    trust,
    scope: resolved,
    current(): CurrentProjectRuntimeContext {
      return Object.freeze({
        identity: resolved.identity,
        projectKey: resolved.projectKey,
        trust: input.binding.isProjectTrusted() ? { kind: "trusted" } : { kind: "untrusted" },
      });
    },
  });
}
