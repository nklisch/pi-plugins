import { valid } from "semver";
import { createMcpRuntimeCapabilityProbe } from "../application/mcp-runtime-capability-probe.js";
import { createSubagentLifecycleCapabilityProbe } from "../application/subagent-lifecycle-capability-probe.js";
import type { HookExecutableResolverPort } from "../application/ports/hook-executable-resolver.js";
import type { McpRuntimePort } from "../application/ports/mcp-runtime.js";
import type { RuntimeCapabilityProbe } from "../application/ports/runtime-capability-probe.js";
import type { SubagentLifecyclePort } from "../application/ports/subagent-lifecycle.js";
import {
  RuntimeCapabilityRegistry,
  RuntimeCapabilitySnapshotSchema,
  type RuntimeCapabilityAvailability,
} from "../domain/compatibility-policy.js";

async function executableAvailable(
  resolver: HookExecutableResolverPort,
  commands: readonly string[],
  signal: AbortSignal,
): Promise<boolean> {
  for (const command of commands) {
    try {
      await resolver.resolve({
        command,
        cwd: "/",
        environment: { inherit: "host", values: {} },
      }, signal);
      return true;
    } catch {
      if (signal.aborted) throw signal.reason;
    }
  }
  return false;
}

function fact(available: boolean, yes: string, no: string): RuntimeCapabilityAvailability {
  return Object.freeze({ status: available ? "available" : "unavailable", explanation: available ? yes : no });
}

/** Complete capability chain; optional participants remain truthful absence. */
export function createNodePiRuntimeCapabilityProbe(input: Readonly<{
  commandHooks: true;
  skillToolRestrictions: true;
  executables: HookExecutableResolverPort;
  mcp?: McpRuntimePort;
  subagents?: SubagentLifecyclePort;
  nodeVersion: string;
  piVersion: string;
}>): RuntimeCapabilityProbe {
  if (input.commandHooks !== true || input.skillToolRestrictions !== true ||
      valid(input.nodeVersion) === null || valid(input.piVersion) === null ||
      input.executables === null || typeof input.executables !== "object") {
    throw new TypeError("Node/Pi capability probe dependencies are invalid");
  }
  const base: RuntimeCapabilityProbe = Object.freeze({
    async snapshot(signal: AbortSignal) {
      signal.throwIfAborted();
      const [bash, powershell] = await Promise.all([
        executableAvailable(input.executables, ["bash"], signal),
        executableAvailable(input.executables, ["pwsh", "powershell"], signal),
      ]);
      const unavailable = "capability is supplied only by an optional runtime participant";
      const capabilities = Object.fromEntries(
        Object.values(RuntimeCapabilityRegistry).map((entry) => [entry.id, fact(false, unavailable, unavailable)]),
      );
      Object.assign(capabilities, {
        [RuntimeCapabilityRegistry.skillToolRestrictions.id]: fact(true, "Pi skill tool restrictions are composed", unavailable),
        [RuntimeCapabilityRegistry.commandHooks.id]: fact(true, "Pi command-hook runtime is composed", unavailable),
        [RuntimeCapabilityRegistry.bash.id]: fact(bash, "Bash is locally available", "Bash is not locally available"),
        [RuntimeCapabilityRegistry.powershell.id]: fact(powershell, "PowerShell is locally available", "PowerShell is not locally available"),
      });
      return RuntimeCapabilitySnapshotSchema.parse({ capabilities, capturedBy: "node-pi-base-v1" });
    },
  });
  const mcp = createMcpRuntimeCapabilityProbe({
    base,
    ...(input.mcp === undefined ? {} : { runtime: input.mcp }),
    capturedBy: "node-pi-mcp-v1",
  });
  return createSubagentLifecycleCapabilityProbe({
    base: mcp,
    ...(input.subagents === undefined ? {} : { lifecycle: input.subagents }),
    capturedBy: "node-pi-runtime-v1",
    runtime: { nodeVersion: input.nodeVersion, piVersion: input.piVersion },
  });
}
