import { BoundaryError, ErrorCodeRegistry } from "../domain/errors.js";
import { createScopeContext, ScopeContextSchema, type ScopeContext } from "../domain/state/scope.js";
import type { Sha256 } from "../domain/source.js";
import type {
  ProjectRootAuthorityPort,
  ProjectRootResolutionPort,
  TrustedProjectRoot,
} from "../application/ports/project-root-authority.js";

function sameProjectIdentity(
  root: TrustedProjectRoot,
  scope: Extract<ScopeContext, { kind: "project" }>,
): boolean {
  return root.projectKey === scope.projectKey &&
    root.canonicalRoot === scope.identity.canonicalRoot &&
    root.identity.kind === scope.identity.kind &&
    (root.identity.kind === "path-only" || (
      scope.identity.kind === "repository" &&
      root.identity.repositoryFingerprint === scope.identity.repositoryFingerprint
    ));
}

function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}

function rootAdapterFailure(operation: "acquireProjectRoot" | "verifyProjectRoot"): BoundaryError {
  return new BoundaryError({
    code: ErrorCodeRegistry.adapterFailed,
    operation,
    message: operation === "verifyProjectRoot"
      ? "trusted project root capability is invalid"
      : "project root authority operation failed",
  });
}

function rethrowAbort(signal: AbortSignal, error: unknown): never {
  if (signal.aborted) throw signal.reason;
  if (isAbortRejection(error)) throw error;
  throw rootAdapterFailure("acquireProjectRoot");
}

/**
 * Build the project-root authority at a trusted composition root. This module
 * is intentionally not exported by the package barrel: application code gets
 * only the port, while this composition helper is the sole issuance path.
 */
export function createProjectRootAuthorityPort(
  resolver: ProjectRootResolutionPort,
  sha256: Sha256,
): ProjectRootAuthorityPort {
  if (resolver === null || typeof resolver !== "object" || typeof resolver.resolve !== "function") {
    throw new TypeError("project root resolver is invalid");
  }
  if (typeof sha256 !== "function") throw new TypeError("project root authority requires SHA-256");
  const issuedRoots = new WeakSet<object>();

  return {
    async acquire(signal): Promise<TrustedProjectRoot> {
      try {
        signal.throwIfAborted();
        const resolved = await resolver.resolve(signal);
        const scope = createScopeContext(ScopeContextSchema.parse(resolved), sha256);
        if (scope.kind !== "project") throw new Error("project root adapter must resolve project scope");
        // The nominal brand is intentionally created only in this composition
        // module. Runtime membership prevents forged structural/serialized copies.
        const capability = Object.freeze({
          kind: "trusted-project-root-v1" as const,
          identity: scope.identity,
          projectKey: scope.projectKey,
          canonicalRoot: scope.identity.canonicalRoot,
        }) as TrustedProjectRoot;
        issuedRoots.add(capability);
        return capability;
      } catch (error) {
        rethrowAbort(signal, error);
      }
    },

    verify(capability, input): ScopeContext {
      try {
        const scope = createScopeContext(input, sha256);
        if (
          scope.kind !== "project" ||
          typeof capability !== "object" ||
          capability === null ||
          !issuedRoots.has(capability)
        ) {
          throw new Error("trusted project root capability is invalid");
        }
        if (!sameProjectIdentity(capability as TrustedProjectRoot, scope)) {
          throw new Error("trusted project root capability does not match project identity");
        }
        return scope;
      } catch (error) {
        if (isAbortRejection(error)) throw error;
        throw rootAdapterFailure("verifyProjectRoot");
      }
    },
  };
}
