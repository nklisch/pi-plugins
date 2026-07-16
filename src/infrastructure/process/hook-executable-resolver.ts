import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type {
  HookExecutableIdentity,
  HookExecutableResolverPort,
  ResolvedHookExecutable,
} from "../../application/ports/hook-executable-resolver.js";
import type { CommandEnvironment } from "../../application/ports/process-runner.js";

export class HookExecutableResolutionError extends Error {
  constructor() {
    super("hook executable could not be resolved");
    this.name = "HookExecutableResolutionError";
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function environmentPath(environment: CommandEnvironment): string | undefined {
  if (Object.hasOwn(environment.values, "PATH")) return environment.values.PATH;
  if (environment.inherit === "host") return process.env.PATH;
  return undefined;
}

async function executable(path: string, signal: AbortSignal): Promise<boolean> {
  throwIfAborted(signal);
  try {
    await access(path, process.platform === "win32" ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function identity(command: string, cwd: string, path: string): HookExecutableIdentity {
  const digest = createHash("sha256").update(`hook-executable-v1\0${command}\0${cwd}\0${path}`).digest("hex");
  return `hook-executable-v1:sha256:${digest}` as HookExecutableIdentity;
}

async function findOnPath(command: string, cwd: string, environment: CommandEnvironment, signal: AbortSignal): Promise<ResolvedHookExecutable> {
  const pathValue = environmentPath(environment);
  const entries = (pathValue ?? "").split(process.platform === "win32" ? ";" : ":").filter((value) => value.length > 0);
  const candidates = process.platform === "win32" && !/\.[A-Za-z0-9]+$/.test(command)
    ? [command, `${command}.exe`, `${command}.cmd`, `${command}.bat`]
    : [command];
  for (const entry of entries) {
    for (const candidate of candidates) {
      throwIfAborted(signal);
      const value = resolve(entry, candidate);
      if (await executable(value, signal)) return {
        executable: value,
        resolution: "path",
        identity: identity(command, cwd, value),
      };
    }
  }
  throw new HookExecutableResolutionError();
}

export function createNodeHookExecutableResolver(): HookExecutableResolverPort {
  return Object.freeze({
    async resolve(
      request: Parameters<HookExecutableResolverPort["resolve"]>[0],
      signal: AbortSignal,
    ): Promise<ResolvedHookExecutable> {
      if (request === null || typeof request !== "object" || typeof request.command !== "string" ||
          request.command.length === 0 || request.command.includes("\0") || typeof request.cwd !== "string" ||
          request.cwd.length === 0) throw new HookExecutableResolutionError();
      throwIfAborted(signal);
      const command = request.command;
      if (isAbsolute(command)) {
        if (!(await executable(command, signal))) throw new HookExecutableResolutionError();
        return { executable: command, resolution: "absolute", identity: identity(command, request.cwd, command) };
      }
      if (command.includes("/") || command.includes("\\")) {
        const value = resolve(request.cwd, command);
        if (!(await executable(value, signal))) throw new HookExecutableResolutionError();
        return { executable: value, resolution: "cwd-relative", identity: identity(command, request.cwd, value) };
      }
      return findOnPath(command, request.cwd, request.environment, signal);
    },
  });
}

export type { HookExecutableIdentity, HookExecutableResolverPort, ResolvedHookExecutable } from "../../application/ports/hook-executable-resolver.js";
