import { describe, expect, it } from "vitest";
import {
  assertMcpRuntimeContract,
  type McpRuntimeContractHarness as Harness,
} from "./mcp-runtime.contract.js";
import {
  McpLaunchValueRequestSchema,
  McpSourceStatusSchema,
  type McpRuntimePort,
} from "../../src/application/ports/mcp-runtime.js";
import { FakeMcpRuntime } from "../support/fakes/mcp-runtime.js";

function delegated(
  base: FakeMcpRuntime,
  overrides: Partial<McpRuntimePort> = {},
): McpRuntimePort {
  return {
    capabilities: (signal) => base.capabilities(signal),
    validateSource: (source, signal) => base.validateSource(source, signal),
    replaceSource: (request, signal) => base.replaceSource(request, signal),
    removeSource: (identity, signal) => base.removeSource(identity, signal),
    inspectSource: (identity, signal) => base.inspectSource(identity, signal),
    inspectSources: (signal) => base.inspectSources(signal),
    ...overrides,
  };
}

function baseHarness(runtime: McpRuntimePort, fake: FakeMcpRuntime): Harness {
  return {
    runtime,
    launch: (identity, serverKey, signal) => fake.launch(identity, serverKey, signal),
    failNextReplacement: () => fake.failNextReplacement(),
  };
}

describe("MCP runtime conformance suite negative evidence", () => {
  it("catches a replacement that deletes the current source before validation/publication", async () => {
    const fake = new FakeMcpRuntime();
    const runtime = delegated(fake, {
      replaceSource: async (request, signal) => {
        const current = (await fake.inspectSources(signal))[0];
        if (current !== undefined) await fake.removeSource(current.identity, signal);
        return fake.replaceSource(request, signal);
      },
    });
    await expect(assertMcpRuntimeContract(baseHarness(runtime, fake))).rejects.toThrow();
  });

  it("catches removal authorized by a global current name instead of exact identity", async () => {
    const fake = new FakeMcpRuntime();
    const runtime = delegated(fake, {
      removeSource: async (identity, signal) => {
        const current = (await fake.inspectSources(signal))[0];
        return fake.removeSource(current?.identity ?? identity, signal);
      },
    });
    await expect(assertMcpRuntimeContract(baseHarness(runtime, fake))).rejects.toThrow();
  });

  it("catches provider resolution before the runtime launch boundary", async () => {
    const fake = new FakeMcpRuntime();
    const runtime = delegated(fake, {
      replaceSource: async (request, signal) => {
        const serverKey = Object.keys(request.source.servers)[0]!;
        const server = request.source.servers[serverKey]!;
        const values = await request.launchValues.resolve(
          McpLaunchValueRequestSchema.parse({
            source: request.source.identity,
            serverKey,
            transport: server.transport,
          }),
          signal,
        );
        await request.launchValues.dispose(values);
        return fake.replaceSource(request, signal);
      },
    });
    await expect(assertMcpRuntimeContract(baseHarness(runtime, fake))).rejects.toThrow();
  });

  it("catches unsafe source-qualified inspection", async () => {
    const fake = new FakeMcpRuntime();
    const runtime = delegated(fake, {
      inspectSource: async (identity, signal) => {
        const status = await fake.inspectSource(identity, signal);
        if (status === undefined) return undefined;
        return McpSourceStatusSchema.parse({
          ...status,
          servers: status.servers.map((server) => ({
            ...server,
            provenance: [{ ...server.provenance[0]!, path: "CANARY_STATUS_VALUE" }],
          })),
        });
      },
    });
    await expect(assertMcpRuntimeContract(baseHarness(runtime, fake))).rejects.toThrow();
  });
});
