import {
  McpConfigSourceSchemaV1,
  McpLaunchValueRequestSchema,
  McpRuntimeCapabilitiesSchemaV1,
  McpSourceIdentitySchemaV1,
  McpSourceRemoveResultSchema,
  McpSourceReplaceResultSchema,
  McpSourceStatusSchema,
  McpSourceValidationResultSchema,
  type McpConfigSource,
  type McpLaunchValues,
  type McpRuntimeCapabilities,
  type McpRuntimePort,
  type McpSourceIdentity,
  type McpSourceReplaceRequest,
  type McpSourceStatus,
} from "../../../src/application/ports/mcp-runtime.js";
import {
  DiagnosticSchema,
  ErrorCodeRegistry,
  ErrorCodeSchema,
  diagnosticFromZodError,
  type ErrorCode,
} from "../../../src/domain/errors.js";

export type FakeMcpRuntimeOptions = Readonly<{
  capabilities?: McpRuntimeCapabilities;
}>;

type StoredSource = Readonly<{
  source: McpConfigSource;
  launchValues: McpSourceReplaceRequest["launchValues"];
}>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function ownerKey(identity: McpSourceIdentity): string {
  return JSON.stringify({ scope: identity.scope, plugin: identity.plugin });
}

function exactIdentityKey(identity: McpSourceIdentity): string {
  return JSON.stringify({
    schemaVersion: identity.schemaVersion,
    scope: identity.scope,
    plugin: identity.plugin,
    revision: identity.revision,
    projectionDigest: identity.projectionDigest,
  });
}

function defaultCapabilities(): McpRuntimeCapabilities {
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
    oauth: {
      authorizationCode: true,
      clientCredentials: true,
    },
    features: {
      sampling: true,
      elicitationForm: true,
      elicitationUrl: true,
      toolApproval: true,
      resources: true,
    },
  });
}

function safeCode(value: string | undefined): ErrorCode {
  const parsed = ErrorCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : ErrorCodeRegistry.adapterFailed;
}

function rejection(code: string | undefined, operation: string) {
  return DiagnosticSchema.parse({
    code: safeCode(code),
    severity: "error",
    operation,
    message: "MCP source operation was rejected",
    details: { sourceOperation: operation },
  });
}

function copyIdentity(identity: McpSourceIdentity): McpSourceIdentity {
  return McpSourceIdentitySchemaV1.parse(clone(identity));
}

function statusFor(record: StoredSource, state: "registered" | "replacing" | "removing" | "failed" = "registered"): McpSourceStatus {
  const servers = Object.entries(record.source.servers)
    .sort(([left], [right]) => compareText(left, right))
    .map(([key, server]) => ({
      key,
      componentId: server.componentId,
      provenance: clone(server.provenance),
      state: "registered" as const,
    }));
  return McpSourceStatusSchema.parse({
    identity: clone(record.source.identity),
    state,
    servers,
  });
}

function copyStatus(status: McpSourceStatus): McpSourceStatus {
  return McpSourceStatusSchema.parse(clone(status));
}

/**
 * Test-only runtime authority. It intentionally models the source lifecycle,
 * not MCP transport behavior: launch is the sole hook that invokes late
 * values, and inspection exposes local registration separately from health.
 */
export class FakeMcpRuntime implements McpRuntimePort {
  private readonly records = new Map<string, StoredSource>();
  private readonly runtimeCapabilities: McpRuntimeCapabilities;
  private nextReplacementFailure: ErrorCode | undefined;

  constructor(options: FakeMcpRuntimeOptions = {}) {
    this.runtimeCapabilities = McpRuntimeCapabilitiesSchemaV1.parse(
      clone(options.capabilities ?? defaultCapabilities()),
    );
  }

  capabilities(signal: AbortSignal): Promise<McpRuntimeCapabilities> {
    signal.throwIfAborted();
    return Promise.resolve(clone(this.runtimeCapabilities));
  }

  async validateSource(source: McpConfigSource, signal: AbortSignal) {
    signal.throwIfAborted();
    const result = McpConfigSourceSchemaV1.safeParse(source);
    if (!result.success) {
      const diagnostic = diagnosticFromZodError(result.error, {
        operation: "validateMcpSource",
      });
      return McpSourceValidationResultSchema.parse({
        ok: false,
        diagnostics: [diagnostic],
      });
    }
    signal.throwIfAborted();
    return McpSourceValidationResultSchema.parse({
      ok: true,
      value: clone(result.data),
      diagnostics: [],
    });
  }

  failNextReplacement(code?: string): void {
    this.nextReplacementFailure = safeCode(code);
  }

  async replaceSource(
    request: McpSourceReplaceRequest,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    const validation = await this.validateSource(request.source, signal);
    if (!validation.ok) {
      return McpSourceReplaceResultSchema.parse({
        kind: "rejected",
        diagnostics: clone(validation.diagnostics),
      });
    }
    if (
      request.launchValues === null ||
      typeof request.launchValues !== "object" ||
      typeof request.launchValues.resolve !== "function" ||
      typeof request.launchValues.dispose !== "function"
    ) {
      return McpSourceReplaceResultSchema.parse({
        kind: "rejected",
        diagnostics: [rejection(ErrorCodeRegistry.sourceInvalid, "replaceMcpSource")],
      });
    }

    // Everything above is staged. The single map mutation below is the fake's
    // atomic publication point; no provider is called on this path.
    const source = McpConfigSourceSchemaV1.parse(clone(validation.value));
    const key = ownerKey(source.identity);
    const previous = this.records.get(key);
    if (previous !== undefined && request.expectedProjectionDigest !== undefined &&
        request.expectedProjectionDigest !== previous.source.identity.projectionDigest) {
      return McpSourceReplaceResultSchema.parse({
        kind: "stale",
        currentIdentity: copyIdentity(previous.source.identity),
      });
    }
    if (previous === undefined && request.expectedProjectionDigest !== undefined) {
      return McpSourceReplaceResultSchema.parse({
        kind: "rejected",
        diagnostics: [rejection(ErrorCodeRegistry.sourceInvalid, "replaceMcpSource")],
      });
    }
    if (this.nextReplacementFailure !== undefined) {
      const code = this.nextReplacementFailure;
      this.nextReplacementFailure = undefined;
      return McpSourceReplaceResultSchema.parse({
        kind: "rejected",
        diagnostics: [rejection(code, "replaceMcpSource")],
      });
    }

    const replacement: StoredSource = {
      source,
      launchValues: request.launchValues,
    };
    this.records.set(key, replacement);
    const status = statusFor(replacement);
    return McpSourceReplaceResultSchema.parse({
      kind: "applied",
      status: copyStatus(status),
      ...(previous === undefined ? {} : { previousIdentity: copyIdentity(previous.source.identity) }),
    });
  }

  async removeSource(
    identity: McpSourceIdentity,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    const requested = McpSourceIdentitySchemaV1.parse(clone(identity));
    const key = ownerKey(requested);
    const current = this.records.get(key);
    if (current === undefined) {
      return McpSourceRemoveResultSchema.parse({ kind: "absent" });
    }
    if (exactIdentityKey(current.source.identity) !== exactIdentityKey(requested)) {
      return McpSourceRemoveResultSchema.parse({
        kind: "ownership-mismatch",
        requestedIdentity: requested,
        currentIdentity: copyIdentity(current.source.identity),
      });
    }
    this.records.delete(key);
    return McpSourceRemoveResultSchema.parse({ kind: "removed" });
  }

  async inspectSource(
    identity: McpSourceIdentity,
    signal: AbortSignal,
  ): Promise<McpSourceStatus | undefined> {
    signal.throwIfAborted();
    const requested = McpSourceIdentitySchemaV1.parse(clone(identity));
    const record = this.records.get(ownerKey(requested));
    if (record === undefined || exactIdentityKey(record.source.identity) !== exactIdentityKey(requested)) {
      return undefined;
    }
    return copyStatus(statusFor(record));
  }

  async inspectSources(signal: AbortSignal): Promise<readonly McpSourceStatus[]> {
    signal.throwIfAborted();
    return [...this.records.entries()]
      .sort(([left], [right]) => compareText(left, right))
      .map(([, record]) => copyStatus(statusFor(record)));
  }

  /** Test-only launch boundary; no production adapter uses this method. */
  async launch(
    identity: McpSourceIdentity,
    serverKey: string,
    signal: AbortSignal,
  ): Promise<void> {
    signal.throwIfAborted();
    const requested = McpSourceIdentitySchemaV1.parse(clone(identity));
    const record = this.records.get(ownerKey(requested));
    if (record === undefined || exactIdentityKey(record.source.identity) !== exactIdentityKey(requested)) {
      throw new Error("MCP source is not registered for launch");
    }
    const server = record.source.servers[serverKey];
    if (server === undefined) throw new Error("MCP server is not registered for launch");

    const request = McpLaunchValueRequestSchema.parse({
      source: requested,
      serverKey,
      transport: server.transport,
    });
    let values: McpLaunchValues | undefined;
    let failure: unknown;
    try {
      values = await record.launchValues.resolve(request, signal);
      signal.throwIfAborted();
      if (values.transport !== server.transport) {
        throw new Error("late MCP launch values use the wrong transport");
      }
      // The fake proves callback timing and custody, not remote health.
    } catch (error) {
      // Abort reasons are caller-owned evidence and must propagate unchanged.
      // Other provider failures are wrapped so a native error message cannot
      // become a secret-bearing fake error surface.
      failure = signal.aborted
        ? signal.reason
        : new Error(
            error instanceof Error && error.message === "late MCP launch values use the wrong transport"
              ? "MCP launch values use the wrong transport"
              : "MCP launch failed",
            { cause: error },
          );
    }
    if (values !== undefined) {
      try {
        await record.launchValues.dispose(values);
      } catch (error) {
        if (failure === undefined) failure = new Error("MCP launch cleanup failed", { cause: error });
      }
    }
    if (failure !== undefined) throw failure;
  }
}
