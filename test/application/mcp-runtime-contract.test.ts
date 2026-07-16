import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  McpBridgeTransportSchema,
  McpConfigSourceSchemaV1,
  McpLaunchValueRequestSchema,
  McpRuntimeCapabilitiesSchemaV1,
  McpSourceIdentitySchemaV1,
  McpSourceRemoveResultSchema,
  McpSourceReplaceResultSchema,
  McpSourceServerSchemaV1,
  McpSourceStatusSchema,
  McpSourceValidationResultSchema,
  type McpConfigSource,
  type McpLaunchValues,
  type McpRuntimeCapabilities,
  type McpRuntimePort,
} from "../../src/application/ports/mcp-runtime.js";
import { ContentDigestSchema } from "../../src/domain/content-manifest.js";
import { ComponentIdSchema } from "../../src/domain/components.js";
import { PluginKeySchema } from "../../src/domain/identity.js";
import { SourceLocationSchema } from "../../src/domain/provenance-location.js";

const location = SourceLocationSchema.parse({
  host: "claude",
  documentKind: "mcp",
  path: "plugin.mcp.json",
  pointer: "/mcpServers/search",
});
const componentId = ComponentIdSchema.parse(`component-v1:mcp-server:${"a".repeat(64)}`);
const plugin = PluginKeySchema.parse("demo@community");
const digest = (hex: string) => ContentDigestSchema.parse(`sha256:${hex.repeat(64).slice(0, 64)}`);

function identity(overrides: Record<string, unknown> = {}) {
  return McpSourceIdentitySchemaV1.parse({
    schemaVersion: 1,
    scope: { kind: "user" },
    plugin,
    revision: digest("1"),
    projectionDigest: digest("2"),
    ...overrides,
  });
}

function source(overrides: Record<string, unknown> = {}): McpConfigSource {
  return McpConfigSourceSchemaV1.parse({
    schemaVersion: 1,
    identity: identity(),
    servers: {
      search: {
        componentId,
        transport: "stdio",
        options: { timeoutMs: 1000 },
        launchTemplate: { commandRef: "search-command" },
        provenance: [location],
      },
    },
    ...overrides,
  });
}

function capabilities(): McpRuntimeCapabilities {
  return McpRuntimeCapabilitiesSchemaV1.parse({
    schemaVersion: 1,
    sourceLifecycle: {
      initialSourcesBeforeToolRegistration: true,
      isolatedFileDiscovery: true,
      localValidation: true,
      atomicReplace: true,
      exactRemove: true,
      inspect: true,
      cancellable: true,
      lateLaunchValues: true,
    },
    transports: {
      stdio: true,
      streamableHttp: true,
      legacySse: false,
      websocket: false,
    },
    oauth: { authorizationCode: true, clientCredentials: false },
    features: {
      sampling: true,
      elicitationForm: true,
      elicitationUrl: false,
      toolApproval: true,
      resources: true,
    },
  });
}

describe("portable MCP runtime contract", () => {
  it("derives the public serializable types from strict schemas", () => {
    expectTypeOf<McpConfigSource>().toEqualTypeOf<z.infer<typeof McpConfigSourceSchemaV1>>();
    expectTypeOf<McpRuntimeCapabilities>().toEqualTypeOf<z.infer<typeof McpRuntimeCapabilitiesSchemaV1>>();
    expectTypeOf<McpLaunchValues>().not.toEqualTypeOf<McpConfigSource>();
    expectTypeOf<McpRuntimePort>().toMatchTypeOf<{
      capabilities: Function;
      validateSource: Function;
      replaceSource: Function;
      removeSource: Function;
      inspectSource: Function;
      inspectSources: Function;
    }>();
  });

  it("accepts only the two bridge transports", () => {
    expect(McpBridgeTransportSchema.parse("stdio")).toBe("stdio");
    expect(McpBridgeTransportSchema.parse("streamable-http")).toBe("streamable-http");
    expect(McpBridgeTransportSchema.safeParse("sse").success).toBe(false);
    expect(McpBridgeTransportSchema.safeParse("websocket").success).toBe(false);
  });

  it("rejects unknown fields, empty sources, duplicate components, functions, and non-JSON templates", () => {
    expect(McpSourceIdentitySchemaV1.safeParse({ ...identity(), extra: true }).success).toBe(false);
    expect(McpSourceServerSchemaV1.safeParse({
      ...source().servers.search,
      launchTemplate: { callback: () => "secret" },
    }).success).toBe(false);
    expect(McpConfigSourceSchemaV1.safeParse({ ...source(), servers: {} }).success).toBe(false);
    expect(McpConfigSourceSchemaV1.safeParse({
      ...source(),
      servers: {
        first: source().servers.search,
        second: { ...source().servers.search, provenance: [location] },
      },
    }).success).toBe(false);
    expect(McpConfigSourceSchemaV1.safeParse({
      ...source(),
      servers: { remote: { ...source().servers.search, transport: "sse" } },
    }).success).toBe(false);
    expect(McpSourceServerSchemaV1.safeParse({
      ...source().servers.search,
      options: { nested: Number.NaN },
    }).success).toBe(false);
  });

  it("keeps exact scope, plugin, revision, and projection identity", () => {
    const project = identity({
      scope: { kind: "project", projectKey: `project-v1:sha256:${"f".repeat(64)}` },
    });
    const otherRevision = identity({ revision: digest("3") });
    const otherProjection = identity({ projectionDigest: digest("4") });
    expect(new Set([
      JSON.stringify(identity()),
      JSON.stringify(project),
      JSON.stringify(otherRevision),
      JSON.stringify(otherProjection),
    ]).size).toBe(4);
    expect(McpConfigSourceSchemaV1.parse(source()).identity).toEqual(identity());
  });

  it("round-trips redacted status and typed operation outcomes", () => {
    const status = McpSourceStatusSchema.parse({
      identity: identity(),
      state: "registered",
      servers: [{
        key: "search",
        componentId,
        provenance: [location],
        state: "idle",
        toolCount: 2,
        errorCode: "ADAPTER_FAILED",
      }],
    });
    expect(McpSourceStatusSchema.parse(status)).toEqual(status);
    expect(JSON.stringify(status)).not.toContain("commandRef");
    expect(McpSourceValidationResultSchema.parse({ ok: true, value: source(), diagnostics: [] }).ok).toBe(true);
    expect(McpSourceValidationResultSchema.safeParse({ ok: false, diagnostics: [] }).success).toBe(false);
    expect(McpSourceReplaceResultSchema.parse({ kind: "stale", currentIdentity: identity() }).kind).toBe("stale");
    expect(McpSourceReplaceResultSchema.parse({
      kind: "rejected",
      diagnostics: [{
        code: "SCHEMA_INVALID",
        severity: "error",
        operation: "validateMcpSource",
        message: "source is invalid",
      }],
    }).kind).toBe("rejected");
    expect(McpSourceRemoveResultSchema.parse({ kind: "absent" }).kind).toBe("absent");
    const mismatch = McpSourceRemoveResultSchema.parse({
      kind: "ownership-mismatch",
      requestedIdentity: identity(),
      currentIdentity: identity({ revision: digest("9") }),
    });
    expect(JSON.stringify(mismatch)).not.toContain("secret");
  });

  it("requires cancellation at every asynchronous lifecycle seam and mandatory disposal", () => {
    const methods = [
      "capabilities",
      "validateSource",
      "replaceSource",
      "removeSource",
      "inspectSource",
      "inspectSources",
    ] as const;
    for (const method of methods) expect(method).toBeTypeOf("string");
    const request = McpLaunchValueRequestSchema.parse({
      source: identity(),
      serverKey: "search",
      transport: "stdio",
    });
    expect(request.transport).toBe("stdio");
  });
});
