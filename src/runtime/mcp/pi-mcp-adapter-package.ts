import type { McpAdapterInstance, McpAdapterOptions } from "@nklisch/pi-mcp-adapter/programmatic";
import {
  probePublishedPackage,
  type PublishedPackageReceipt,
} from "../published-package-receipt.js";
import {
  createPiMcpRuntime,
  type PiMcpRuntimeAdapter,
} from "./pi-mcp-adapter-runtime.js";

export const PI_MCP_ADAPTER_RECEIPT: PublishedPackageReceipt = Object.freeze({
  packageName: "@nklisch/pi-mcp-adapter",
  version: "2.11.0-nklisch.2",
  registryIntegrity: "sha512-ocrvhYsBSnIu/M9kW9U6qCscCQWrQ9uUZdF/T4/e6x/666DTgowP8gh5jbPHjLk7MnzWiwIjXUgSQB4aWHm8Pg==",
  installedTreeDigest: "sha256:a8326e59befb9584a6eadecc8ecf1f631bb0913f25ad0afbe31159dd0b810bde",
  license: "MIT",
  licenseSha256: "2d20dfacd9742706e564470dc77438608a1e54b0ed46959f080709389209093c",
  releaseTag: "v2.11.0-nklisch.2@ff2d099cc12ca3b2fd768497e8325b7db18d8993",
  releaseCommit: "706c163935eb9f2c0e77f2335623651acb633e91",
  upstreamBaseCommit: "82724dccc13a49310530898f922bafff12b7f3fe",
  nodeEngine: ">=22.19.0",
  piPeerRange: ">=0.79.1 <1",
  requiredExports: [".", "./programmatic"],
  piExtensions: ["./index.ts"],
});

type ProgrammaticModule = Readonly<{
  createMcpAdapter(options: McpAdapterOptions): McpAdapterInstance;
}>;

function programmaticModule(value: unknown): ProgrammaticModule | undefined {
  if (value === null || typeof value !== "object" ||
      typeof (value as { createMcpAdapter?: unknown }).createMcpAdapter !== "function") return undefined;
  return value as ProgrammaticModule;
}

/** Verify exact local bytes before evaluating the documented programmatic export. */
export async function createVerifiedPiMcpRuntimeCandidate(
  signal: AbortSignal = new AbortController().signal,
): Promise<PiMcpRuntimeAdapter | undefined> {
  const probe = await probePublishedPackage({
    entrySpecifier: "@nklisch/pi-mcp-adapter/programmatic",
    receipt: PI_MCP_ADAPTER_RECEIPT,
    signal,
  });
  if (probe.kind !== "verified") return undefined;
  signal.throwIfAborted();
  try {
    const module = programmaticModule(await import(probe.entry));
    if (module === undefined) return undefined;
    return createPiMcpRuntime({
      packageFactory: module.createMcpAdapter,
      initialSources: [],
      fileDiscovery: "disabled",
    });
  } catch {
    if (signal.aborted) throw signal.reason;
    return undefined;
  }
}
