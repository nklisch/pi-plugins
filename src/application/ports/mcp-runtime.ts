import { z } from "zod";
import {
  ComponentIdSchema,
  type ComponentId,
} from "../../domain/components.js";
import {
  ContentDigestSchema,
  type ContentDigest,
} from "../../domain/content-manifest.js";
import {
  DiagnosticSchema,
  ErrorCodeSchema,
  ReadResultSchema,
  type Diagnostic,
  type ReadResult,
} from "../../domain/errors.js";
import { PluginKeySchema, type PluginKey } from "../../domain/identity.js";
import {
  ScopeReferenceSchema,
  type ScopeReference,
} from "../../domain/state/scope.js";
import {
  SourceLocationSchema,
  type SourceLocation,
} from "../../domain/provenance-location.js";
import { JsonValueSchema, type JsonValue } from "../../domain/schema.js";

/** The only transports that the Plugin Host source bridge may claim. */
export const McpBridgeTransportSchema = z.enum(["stdio", "streamable-http"]);
export type McpBridgeTransport = z.infer<typeof McpBridgeTransportSchema>;

/**
 * A source is owned by the complete versioned projection identity. Native MCP
 * server names are deliberately absent from this key: they are only unique
 * inside one source.
 */
export const McpSourceIdentitySchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    scope: ScopeReferenceSchema,
    plugin: PluginKeySchema,
    revision: ContentDigestSchema,
    projectionDigest: ContentDigestSchema,
  })
  .strict()
  .readonly();
export type McpSourceIdentity = z.infer<typeof McpSourceIdentitySchemaV1>;

const SecretFreeJsonRecordSchema = z
  .record(z.string().min(1), JsonValueSchema)
  .readonly();

/** A source server contains structure only; launch values arrive later. */
export const McpSourceServerSchemaV1 = z
  .object({
    componentId: ComponentIdSchema,
    transport: McpBridgeTransportSchema,
    options: SecretFreeJsonRecordSchema,
    launchTemplate: SecretFreeJsonRecordSchema,
    provenance: z.array(SourceLocationSchema).min(1).readonly(),
  })
  .strict()
  .readonly();
export type McpSourceServer = z.infer<typeof McpSourceServerSchemaV1>;

export const McpConfigSourceSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    identity: McpSourceIdentitySchemaV1,
    servers: z
      .record(z.string().min(1), McpSourceServerSchemaV1)
      .readonly(),
  })
  .strict()
  .readonly()
  .superRefine((source, context) => {
    const componentIds = new Map<ComponentId, string>();
    for (const [serverKey, server] of Object.entries(source.servers)) {
      const previousKey = componentIds.get(server.componentId);
      if (previousKey !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["servers", serverKey, "componentId"],
          message: `component id is duplicated by server ${previousKey}`,
        });
      } else {
        componentIds.set(server.componentId, serverKey);
      }
    }
    if (Object.keys(source.servers).length === 0) {
      context.addIssue({
        code: "custom",
        path: ["servers"],
        message: "MCP configuration source must contain at least one server",
      });
    }
  });
export type McpConfigSource = z.infer<typeof McpConfigSourceSchemaV1>;

export const McpLaunchValueRequestSchema = z
  .object({
    source: McpSourceIdentitySchemaV1,
    serverKey: z.string().min(1),
    transport: McpBridgeTransportSchema,
  })
  .strict()
  .readonly();
export type McpLaunchValueRequest = z.infer<typeof McpLaunchValueRequestSchema>;

/**
 * Plaintext launch values intentionally cannot be represented by a serialized
 * schema. They are only valid during one immediate runtime launch/connect
 * callback and must be disposed by the provider on every outcome.
 */
export type McpLaunchValues =
  | Readonly<{
      transport: "stdio";
      command: string;
      args: readonly string[];
      cwd?: string;
      env?: Readonly<Record<string, string>>;
    }>
  | Readonly<{
      transport: "streamable-http";
      url: string;
      headers?: Readonly<Record<string, string>>;
      bearerToken?: string;
    }>;

export interface McpLaunchValueProvider {
  resolve(
    request: McpLaunchValueRequest,
    signal: AbortSignal,
  ): Promise<McpLaunchValues>;
  dispose(values: McpLaunchValues): void | Promise<void>;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

const McpSourceStateSchema = z.enum([
  "registered",
  "replacing",
  "removing",
  "failed",
]);
const McpServerConnectionStateSchema = z.enum([
  "registered",
  "idle",
  "connecting",
  "connected",
  "needs-auth",
  "failed",
]);

export const McpSourceServerStatusSchema = z
  .object({
    key: z.string().min(1),
    componentId: ComponentIdSchema,
    provenance: z.array(SourceLocationSchema).min(1).readonly(),
    state: McpServerConnectionStateSchema,
    toolCount: z.number().int().nonnegative().optional(),
    errorCode: ErrorCodeSchema.optional(),
  })
  .strict()
  .readonly();
export type McpSourceServerStatus = z.infer<typeof McpSourceServerStatusSchema>;

/**
 * Inspection is a local, source-qualified view. It intentionally has no
 * definition, expanded value, error message, native cause, or provider field.
 */
export const McpSourceStatusSchema = z
  .object({
    identity: McpSourceIdentitySchemaV1,
    state: McpSourceStateSchema,
    servers: z.array(McpSourceServerStatusSchema).readonly(),
  })
  .strict()
  .readonly()
  .superRefine((status, context) => {
    const keys = new Set<string>();
    const componentIds = new Set<string>();
    let previousKey: string | undefined;
    for (const [index, server] of status.servers.entries()) {
      if (keys.has(server.key)) {
        context.addIssue({
          code: "custom",
          path: ["servers", index, "key"],
          message: "source status contains a duplicate server key",
        });
      }
      keys.add(server.key);
      if (componentIds.has(server.componentId)) {
        context.addIssue({
          code: "custom",
          path: ["servers", index, "componentId"],
          message: "source status contains a duplicate component id",
        });
      }
      componentIds.add(server.componentId);
      if (previousKey !== undefined && compareText(previousKey, server.key) > 0) {
        context.addIssue({
          code: "custom",
          path: ["servers", index, "key"],
          message: "source status servers must be sorted by key",
        });
      }
      previousKey = server.key;
    }
  });
export type McpSourceStatus = z.infer<typeof McpSourceStatusSchema>;

export const McpRuntimeCapabilitiesSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    sourceLifecycle: z
      .object({
        initialSourcesBeforeToolRegistration: z.boolean(),
        isolatedFileDiscovery: z.boolean(),
        localValidation: z.boolean(),
        atomicReplace: z.boolean(),
        exactRemove: z.boolean(),
        inspect: z.boolean(),
        cancellable: z.boolean(),
        lateLaunchValues: z.boolean(),
      })
      .strict()
      .readonly(),
    transports: z
      .object({
        stdio: z.boolean(),
        streamableHttp: z.boolean(),
        legacySse: z.boolean(),
        websocket: z.boolean(),
      })
      .strict()
      .readonly(),
    oauth: z
      .object({
        authorizationCode: z.boolean(),
        clientCredentials: z.boolean(),
      })
      .strict()
      .readonly(),
    features: z
      .object({
        sampling: z.boolean(),
        elicitationForm: z.boolean(),
        elicitationUrl: z.boolean(),
        toolApproval: z.boolean(),
        resources: z.boolean(),
      })
      .strict()
      .readonly(),
  })
  .strict()
  .readonly();
export type McpRuntimeCapabilities = z.infer<typeof McpRuntimeCapabilitiesSchemaV1>;

export const McpSourceValidationResultSchema = ReadResultSchema(McpConfigSourceSchemaV1);
export type McpSourceValidationResult = ReadResult<McpConfigSource>;

const McpSourceReplaceResultSchemaRegistry = {
  applied: z
    .object({
      kind: z.literal("applied"),
      status: McpSourceStatusSchema,
      previousIdentity: McpSourceIdentitySchemaV1.optional(),
    })
    .strict()
    .readonly(),
  stale: z
    .object({
      kind: z.literal("stale"),
      currentIdentity: McpSourceIdentitySchemaV1,
    })
    .strict()
    .readonly(),
  rejected: z
    .object({
      kind: z.literal("rejected"),
      diagnostics: z.array(DiagnosticSchema).min(1).readonly(),
    })
    .strict()
    .readonly(),
} as const;
const McpSourceReplaceResultSchemas = Object.values(
  McpSourceReplaceResultSchemaRegistry,
) as [
  (typeof McpSourceReplaceResultSchemaRegistry)[keyof typeof McpSourceReplaceResultSchemaRegistry],
  ...(typeof McpSourceReplaceResultSchemaRegistry)[keyof typeof McpSourceReplaceResultSchemaRegistry][],
];
export const McpSourceReplaceResultSchema = z.discriminatedUnion(
  "kind",
  McpSourceReplaceResultSchemas,
);
export type McpSourceReplaceResult = z.infer<typeof McpSourceReplaceResultSchema>;

const McpSourceRemoveResultSchemaRegistry = {
  removed: z.object({ kind: z.literal("removed") }).strict().readonly(),
  absent: z.object({ kind: z.literal("absent") }).strict().readonly(),
  ownershipMismatch: z
    .object({
      kind: z.literal("ownership-mismatch"),
      requestedIdentity: McpSourceIdentitySchemaV1,
      currentIdentity: McpSourceIdentitySchemaV1,
    })
    .strict()
    .readonly(),
} as const;
const McpSourceRemoveResultSchemas = Object.values(
  McpSourceRemoveResultSchemaRegistry,
) as [
  (typeof McpSourceRemoveResultSchemaRegistry)[keyof typeof McpSourceRemoveResultSchemaRegistry],
  ...(typeof McpSourceRemoveResultSchemaRegistry)[keyof typeof McpSourceRemoveResultSchemaRegistry][],
];
export const McpSourceRemoveResultSchema = z.discriminatedUnion(
  "kind",
  McpSourceRemoveResultSchemas,
);
export type McpSourceRemoveResult = z.infer<typeof McpSourceRemoveResultSchema>;

export type McpSourceReplaceRequest = Readonly<{
  source: McpConfigSource;
  expectedProjectionDigest?: ContentDigest;
  launchValues: McpLaunchValueProvider;
}>;

/** Package-independent MCP runtime lifecycle boundary. */
export interface McpRuntimePort {
  capabilities(signal: AbortSignal): Promise<McpRuntimeCapabilities>;
  validateSource(
    source: McpConfigSource,
    signal: AbortSignal,
  ): Promise<McpSourceValidationResult>;
  replaceSource(
    request: McpSourceReplaceRequest,
    signal: AbortSignal,
  ): Promise<McpSourceReplaceResult>;
  removeSource(
    identity: McpSourceIdentity,
    signal: AbortSignal,
  ): Promise<McpSourceRemoveResult>;
  inspectSource(
    identity: McpSourceIdentity,
    signal: AbortSignal,
  ): Promise<McpSourceStatus | undefined>;
  inspectSources(signal: AbortSignal): Promise<readonly McpSourceStatus[]>;
}

export type {
  ComponentId,
  ContentDigest,
  Diagnostic,
  JsonValue,
  PluginKey,
  ScopeReference,
  SourceLocation,
};
