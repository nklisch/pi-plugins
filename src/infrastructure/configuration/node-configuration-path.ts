import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ConfigurationPathResultSchema,
  type ConfigurationPathPort,
} from "../../application/ports/configuration-path.js";
import type { ProjectRootAuthorityPort } from "../../application/ports/project-root-authority.js";

function contained(base: string, candidate: string): boolean {
  const rel = relative(base, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

async function pathHasSymlink(base: string, candidate: string): Promise<boolean> {
  const rel = relative(base, candidate);
  let current = base;
  for (const segment of rel.split(sep).filter(Boolean)) {
    current = resolve(current, segment);
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink()) return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }
  return false;
}

type BoundConfigurationSession = Readonly<{
  current(): Readonly<{ cwd: string }>;
}>;

/** Session-bound path adapter; no caller-selected project root is accepted. */
export function createNodeConfigurationPathPort(input: Readonly<{
  binding: BoundConfigurationSession;
  projectRoots: ProjectRootAuthorityPort;
}>): ConfigurationPathPort {
  if (input === null || typeof input !== "object") throw new TypeError("configuration path dependencies are required");
  return Object.freeze({
    async normalizeAndInspect(
      request: Parameters<ConfigurationPathPort["normalizeAndInspect"]>[0],
      signal: AbortSignal,
    ) {
      signal.throwIfAborted();
      try {
        const scope = request.context.scope;
        let base: string;
        if (scope.kind === "project") {
          const capability = request.context.trustedProjectRoot;
          if (input.projectRoots.revalidate !== undefined) {
            await input.projectRoots.revalidate(capability, scope, signal);
          } else {
            input.projectRoots.verify(capability, scope);
          }
          base = fileURLToPath(capability!.canonicalRoot);
        } else {
          base = input.binding.current().cwd;
          if (request.context.trustedBaseDirectory !== undefined &&
              resolve(request.context.trustedBaseDirectory) !== base) {
            return ConfigurationPathResultSchema.parse({ kind: "invalid" });
          }
        }
        const canonicalBase = await realpath(base);
        if (canonicalBase !== resolve(base)) return ConfigurationPathResultSchema.parse({ kind: "invalid" });
        const candidate = resolve(canonicalBase, request.value);
        if (!contained(canonicalBase, candidate) || await pathHasSymlink(canonicalBase, candidate)) {
          return ConfigurationPathResultSchema.parse({ kind: "invalid" });
        }
        let stats;
        try {
          stats = await lstat(candidate);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          return request.mustExist
            ? ConfigurationPathResultSchema.parse({ kind: "missing" })
            : ConfigurationPathResultSchema.parse({ kind: "valid", canonicalPath: pathToFileURL(candidate).href });
        }
        if (stats.isSymbolicLink()) return ConfigurationPathResultSchema.parse({ kind: "invalid" });
        const canonicalCandidate = await realpath(candidate);
        if (!contained(canonicalBase, canonicalCandidate) || canonicalCandidate !== candidate) {
          return ConfigurationPathResultSchema.parse({ kind: "invalid" });
        }
        const rightKind = request.expected === "file" ? stats.isFile() : stats.isDirectory();
        if (!rightKind) return ConfigurationPathResultSchema.parse({ kind: "wrong-kind" });
        signal.throwIfAborted();
        return ConfigurationPathResultSchema.parse({
          kind: "valid",
          canonicalPath: pathToFileURL(canonicalCandidate).href,
        });
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        return ConfigurationPathResultSchema.parse({ kind: "invalid" });
      }
    },
  });
}
