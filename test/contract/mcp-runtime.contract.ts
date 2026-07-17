import { describe, expect, it } from "vitest";
import {
  McpConfigSourceSchemaV1,
  McpRuntimeCapabilitiesSchemaV1,
  McpSourceIdentitySchemaV1,
  McpSourceStatusSchema,
  type McpLaunchValueProvider,
  type McpLaunchValues,
  type McpRuntimePort,
  type McpSourceIdentity,
} from "../../src/application/ports/mcp-runtime.js";
import { ContentDigestSchema } from "../../src/domain/content-manifest.js";
import { ComponentIdSchema } from "../../src/domain/components.js";
import { PluginKeySchema } from "../../src/domain/identity.js";
import { SourceLocationSchema } from "../../src/domain/provenance-location.js";

export interface McpRuntimeContractHarness {
  readonly runtime: McpRuntimePort;
  launch(
    identity: McpSourceIdentity,
    serverKey: string,
    signal: AbortSignal,
    consume?: (values: McpLaunchValues) => void | Promise<void>,
  ): Promise<void>;
  failNextReplacement(): void | Promise<void>;
}

const location = SourceLocationSchema.parse({
  host: "claude",
  documentKind: "mcp",
  path: "plugin.mcp.json",
  pointer: "/mcpServers/shared",
});
const digest = (hex: string) => ContentDigestSchema.parse(`sha256:${hex.repeat(64).slice(0, 64)}`);
const runtimeKey = (hex: string) => `mcp-server-v1:${hex.repeat(64).slice(0, 64)}`;
const sharedKey = runtimeKey("a");
const alphaKey = runtimeKey("1");
const zuluKey = runtimeKey("f");

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function identity(
  token: string,
  overrides: Readonly<Record<string, unknown>> = {},
): McpSourceIdentity {
  return McpSourceIdentitySchemaV1.parse({
    schemaVersion: 1,
    scope: { kind: "user" },
    plugin: PluginKeySchema.parse(`plugin-${token}@community`),
    revision: digest(token),
    projectionDigest: digest(`${token}0`),
    ...overrides,
  });
}

function source(
  sourceIdentity: McpSourceIdentity,
  keys: readonly string[] = [sharedKey],
  transport: "stdio" | "streamable-http" = "stdio",
) {
  return McpConfigSourceSchemaV1.parse({
    schemaVersion: 1,
    identity: sourceIdentity,
    servers: Object.fromEntries(keys.map((key, index) => [key, {
      componentId: ComponentIdSchema.parse(`component-v1:mcp-server:${(index + 1).toString(16).repeat(64).slice(0, 64)}`),
      nativeKey: `native-${index}`,
      transport,
      options: { timeoutMs: 500 },
      projection: {
        schemaVersion: 1,
        componentId: ComponentIdSchema.parse(`component-v1:mcp-server:${(index + 1).toString(16).repeat(64).slice(0, 64)}`),
        contentRef: `plugin-content-v1:sha256:${"c".repeat(64)}`,
        dataRef: `plugin-data-v1:sha256:${"d".repeat(64)}`,
      },
      launchTemplate: transport === "stdio"
        ? {
            schemaVersion: 1,
            transport: "stdio",
            command: "safe-command-template",
            args: [],
            env: [],
          }
        : {
            schemaVersion: 1,
            transport: "streamable-http",
            url: "https://safe.invalid/mcp",
            headers: [],
          },
      toolAliases: [],
      provenance: [location],
    }])),
  });
}

function launchProvider(
  counters: { resolved: number; disposed: number },
  values: McpLaunchValues = { transport: "stdio", command: "safe-command", args: [] },
  resolve?: McpLaunchValueProvider["resolve"],
): McpLaunchValueProvider {
  const issued = new WeakSet<object>();
  const disposed = new WeakSet<object>();
  return {
    async resolve(request, signal) {
      counters.resolved += 1;
      const resolved = resolve === undefined ? clone(values) : await resolve(request, signal);
      if (issued.has(resolved as object)) throw new Error("provider retained a shared values object");
      issued.add(resolved as object);
      return resolved;
    },
    async dispose(candidate) {
      if (!issued.has(candidate as object) || disposed.has(candidate as object)) {
        throw new Error("provider disposal ownership was violated");
      }
      disposed.add(candidate as object);
      counters.disposed += 1;
    },
  };
}

function expectUnavailable(error: unknown, reason: Error): void {
  expect(error).toBe(reason);
}

/**
 * Assertions are deliberately expressed only in terms of McpRuntimePort. A
 * future upstream or fork harness can call this function without importing
 * this fake or changing the lifecycle contract.
 */
export async function assertMcpRuntimeContract(
  harness: McpRuntimeContractHarness,
): Promise<void> {
  const runtime = harness.runtime;
  const signal = new AbortController().signal;
  const capabilities = McpRuntimeCapabilitiesSchemaV1.parse(await runtime.capabilities(signal));
  expect(capabilities.schemaVersion).toBe(1);
  expect(Object.values(capabilities.sourceLifecycle).every((value) => typeof value === "boolean")).toBe(true);
  expect(Object.values(capabilities.transports).every((value) => typeof value === "boolean")).toBe(true);
  expect(Object.values(capabilities.oauth).every((value) => typeof value === "boolean")).toBe(true);
  expect(Object.values(capabilities.features).every((value) => typeof value === "boolean")).toBe(true);

  const firstIdentity = identity("1");
  const firstSource = source(firstIdentity, [zuluKey, alphaKey]);
  const firstCounters = { resolved: 0, disposed: 0 };
  const firstProvider = launchProvider(firstCounters);
  const validation = await runtime.validateSource(firstSource, signal);
  expect(validation.ok).toBe(true);
  if (!validation.ok) throw new Error("valid source was rejected");
  expect(McpConfigSourceSchemaV1.parse(validation.value)).toEqual(firstSource);
  expect(firstCounters).toEqual({ resolved: 0, disposed: 0 });

  const applied = await runtime.replaceSource({
    source: firstSource,
    launchValues: firstProvider,
  }, signal);
  expect(applied.kind).toBe("applied");
  expect(firstCounters).toEqual({ resolved: 0, disposed: 0 });
  const firstStatus = await runtime.inspectSource(firstIdentity, signal);
  expect(firstStatus).toBeDefined();
  if (firstStatus === undefined) throw new Error("applied source was not inspectable");
  McpSourceStatusSchema.parse(firstStatus);
  expect(firstStatus.identity).toEqual(firstIdentity);
  expect(firstStatus.state).toBe("registered");
  expect(firstStatus.servers.map((server) => server.key)).toEqual([alphaKey, zuluKey]);
  expect(firstStatus.servers.map((server) => server.nativeKey)).toEqual(["native-1", "native-0"]);
  expect(JSON.stringify(firstStatus)).not.toContain("safe-command-template");
  expect(JSON.stringify(firstStatus)).not.toContain("safe-command");
  expect(JSON.stringify(firstStatus)).not.toContain("CANARY");

  await harness.launch(firstIdentity, alphaKey, signal);
  await harness.launch(firstIdentity, alphaKey, signal);
  expect(firstCounters).toEqual({ resolved: 2, disposed: 2 });

  const secondIdentity = identity("2", {
    plugin: firstIdentity.plugin,
    revision: digest("3"),
    projectionDigest: digest("4"),
  });
  const secondCounters = { resolved: 0, disposed: 0 };
  const secondSource = source(secondIdentity, [alphaKey]);
  const replaced = await runtime.replaceSource({
    source: secondSource,
    expectedProjectionDigest: firstIdentity.projectionDigest,
    launchValues: launchProvider(secondCounters),
  }, signal);
  expect(replaced).toMatchObject({ kind: "applied", previousIdentity: firstIdentity });
  expect(await runtime.inspectSource(firstIdentity, signal)).toBeUndefined();
  expect(await runtime.inspectSource(secondIdentity, signal)).toBeDefined();
  expect(secondCounters).toEqual({ resolved: 0, disposed: 0 });

  const stale = await runtime.replaceSource({
    source: source(identity("5", {
      plugin: firstIdentity.plugin,
      revision: digest("6"),
      projectionDigest: digest("7"),
    })),
    expectedProjectionDigest: digest("f"),
    launchValues: launchProvider({ resolved: 0, disposed: 0 }),
  }, signal);
  expect(stale).toMatchObject({ kind: "stale", currentIdentity: secondIdentity });
  expect(await runtime.inspectSource(secondIdentity, signal)).toBeDefined();

  await harness.failNextReplacement();
  const rejected = await runtime.replaceSource({
    source: source(identity("8", {
      plugin: firstIdentity.plugin,
      revision: digest("9"),
      projectionDigest: digest("a"),
    })),
    expectedProjectionDigest: secondIdentity.projectionDigest,
    launchValues: launchProvider({ resolved: 0, disposed: 0 }),
  }, signal);
  expect(rejected.kind).toBe("rejected");
  expect(await runtime.inspectSource(secondIdentity, signal)).toBeDefined();

  const newerIdentity = identity("b", {
    plugin: firstIdentity.plugin,
    revision: digest("c"),
    projectionDigest: digest("d"),
  });
  await runtime.replaceSource({
    source: source(newerIdentity),
    expectedProjectionDigest: secondIdentity.projectionDigest,
    launchValues: launchProvider({ resolved: 0, disposed: 0 }),
  }, signal);
  expect(await runtime.removeSource(secondIdentity, signal)).toMatchObject({
    kind: "ownership-mismatch",
    currentIdentity: newerIdentity,
  });
  expect(await runtime.inspectSource(newerIdentity, signal)).toBeDefined();

  const collidingOwner = identity("e");
  await runtime.replaceSource({
    source: source(collidingOwner),
    launchValues: launchProvider({ resolved: 0, disposed: 0 }),
  }, signal);
  expect(await runtime.inspectSource(collidingOwner, signal)).toBeDefined();
  expect(await runtime.inspectSource(newerIdentity, signal)).toBeDefined();

  expect(await runtime.removeSource(newerIdentity, signal)).toEqual({ kind: "removed" });
  expect(await runtime.removeSource(newerIdentity, signal)).toEqual({ kind: "absent" });
  expect(await runtime.inspectSource(collidingOwner, signal)).toBeDefined();

  const mismatchCounters = { resolved: 0, disposed: 0 };
  const mismatchIdentity = identity("f", { plugin: PluginKeySchema.parse("mismatch@community") });
  await runtime.replaceSource({
    source: source(mismatchIdentity),
    launchValues: launchProvider(mismatchCounters, {
      transport: "streamable-http",
      url: "https://safe.invalid/mcp",
    }),
  }, signal);
  await expect(harness.launch(mismatchIdentity, sharedKey, signal)).rejects.toThrow();
  expect(mismatchCounters).toEqual({ resolved: 1, disposed: 1 });

  const cancelController = new AbortController();
  const cancelCounters = { resolved: 0, disposed: 0 };
  const cancelIdentity = identity("a", { plugin: PluginKeySchema.parse("cancel@community") });
  const cancelProvider = launchProvider(cancelCounters, undefined, async (_request, _signal) => {
    cancelController.abort(new Error("launch cancelled"));
    return { transport: "stdio", command: "safe-command", args: [] };
  });
  await runtime.replaceSource({ source: source(cancelIdentity), launchValues: cancelProvider }, signal);
  await expect(harness.launch(cancelIdentity, sharedKey, cancelController.signal)).rejects.toThrow("launch cancelled");
  expect(cancelCounters).toEqual({ resolved: 1, disposed: 1 });
  expect((await runtime.inspectSource(cancelIdentity, signal))?.servers[0]?.errorCode)
    .toBe("MCP_LAUNCH_CANCELLED");

  const timeoutController = new AbortController();
  const timeoutReason = { name: "TimeoutError", code: "TIMEOUT", message: "CANARY_TIMEOUT_REASON" };
  const timeoutCounters = { resolved: 0, disposed: 0 };
  const timeoutIdentity = identity("c", { plugin: PluginKeySchema.parse("timeout@community") });
  await runtime.replaceSource({
    source: source(timeoutIdentity),
    launchValues: launchProvider(timeoutCounters, undefined, async () => {
      timeoutController.abort(timeoutReason);
      return { transport: "stdio", command: "safe-command", args: [] };
    }),
  }, signal);
  const timeoutFailure = await harness.launch(timeoutIdentity, sharedKey, timeoutController.signal)
    .catch((error: unknown) => error);
  expect(timeoutFailure).toBe(timeoutReason);
  expect(timeoutCounters).toEqual({ resolved: 1, disposed: 1 });
  expect((await runtime.inspectSource(timeoutIdentity, signal))?.servers[0]?.errorCode)
    .toBe("MCP_LAUNCH_TIMEOUT");
  expect(JSON.stringify(await runtime.inspectSource(timeoutIdentity, signal)))
    .not.toContain("CANARY_TIMEOUT_REASON");

  const consumerCounters = { resolved: 0, disposed: 0 };
  const consumerIdentity = identity("d", { plugin: PluginKeySchema.parse("consumer@community") });
  await runtime.replaceSource({
    source: source(consumerIdentity),
    launchValues: launchProvider(consumerCounters),
  }, signal);
  const consumerFailure = await harness.launch(
    consumerIdentity,
    sharedKey,
    signal,
    async () => { throw new Error("CANARY_CONSUMER_FAILURE"); },
  ).catch((error: unknown) => error);
  expect(consumerCounters).toEqual({ resolved: 1, disposed: 1 });
  expect(JSON.stringify(consumerFailure)).not.toContain("CANARY_CONSUMER_FAILURE");
  expect((await runtime.inspectSource(consumerIdentity, signal))?.servers[0]?.errorCode)
    .toBe("MCP_LAUNCH_VALUE_INVALID");

  const preAbortMethods: readonly [string, (signal: AbortSignal) => Promise<unknown>][] = [
    ["capabilities", (abortSignal) => runtime.capabilities(abortSignal)],
    ["validate", (abortSignal) => runtime.validateSource(firstSource, abortSignal)],
    ["replace", (abortSignal) => runtime.replaceSource({ source: firstSource, launchValues: firstProvider }, abortSignal)],
    ["remove", (abortSignal) => runtime.removeSource(collidingOwner, abortSignal)],
    ["inspect", (abortSignal) => runtime.inspectSource(collidingOwner, abortSignal)],
    ["inspectSources", (abortSignal) => runtime.inspectSources(abortSignal)],
    ["launch", (abortSignal) => harness.launch(consumerIdentity, sharedKey, abortSignal)],
  ];
  for (const [name, operation] of preAbortMethods) {
    const controller = new AbortController();
    const reason = new Error(`${name} cancelled`);
    controller.abort(reason);
    const outcome = await Promise.resolve()
      .then(() => operation(controller.signal))
      .then(
        () => ({ kind: "fulfilled" as const }),
        (error: unknown) => ({ kind: "rejected" as const, error }),
      );
    expect(outcome.kind, `${name} must reject cancelled ${name} operation`).toBe("rejected");
    if (outcome.kind === "rejected") expectUnavailable(outcome.error, reason);
  }
}

export function defineMcpRuntimeContract(
  name: string,
  create: () => McpRuntimeContractHarness | Promise<McpRuntimeContractHarness>,
): void {
  describe(`${name} MCP runtime contract`, () => {
    it("satisfies the adapter-neutral lifecycle and redaction contract", async () => {
      await assertMcpRuntimeContract(await create());
    });
  });
}
