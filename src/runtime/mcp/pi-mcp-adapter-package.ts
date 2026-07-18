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
  version: "2.11.0-nklisch.0",
  registryIntegrity: "sha512-kkMQwrNbggAhSCJCJUxVLKKiMswKjYaEbOLNSZrZlYY2teoxrtKld2+3MQpvsHDJYFypi1PPHuAS2YC/0z+7tg==",
  installedTreeDigest: "sha256:4f427e1aae57a5b7738a07df7311f4a758e13c61b8b1d50924fd70599e3b3bf5",
  license: "MIT",
  licenseSha256: "2d20dfacd9742706e564470dc77438608a1e54b0ed46959f080709389209093c",
  releaseTag: "v2.11.0-nklisch.0@39c0c367db35ecb125b05ad0b9b639bc6b09b97d",
  releaseCommit: "1c1cd71fd069bc65cc06bf49399d83ff9e3d008b",
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
