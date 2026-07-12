import { BoundaryError } from "../domain/errors.js";
import {
  ContentDigestSchema,
  normalizeContentPath,
  verifyContentManifest,
  type ContentDigest,
  type ContentManifest,
} from "../domain/content-manifest.js";
import {
  MarketplaceSourceSchema,
  PluginSourceSchema,
  verifyResolvedMarketplaceSource,
  verifyResolvedPluginSource,
  type MarketplaceSource,
  type PluginSource,
  type ResolvedMarketplaceSource,
  type ResolvedPluginSource,
} from "../domain/source.js";
import type { JsonValue } from "../domain/schema.js";
import type {
  MarketplacePathAcquirer,
  SecureContentSession,
  SourceMaterializationPortDependencies,
  StagingSlot,
} from "./ports/source-acquisition.js";

export type { StagingSlot } from "./ports/source-acquisition.js";
export type {
  ContentEntry,
  GitSourceAcquirer,
  MarketplacePathAcquirer,
  MaterializationLimits,
  NpmSourceAcquirer,
  SecureContentSession,
  SecureContentWriterFactory,
} from "./ports/source-acquisition.js";
export { DEFAULT_MATERIALIZATION_LIMITS } from "./ports/source-acquisition.js";

export type MaterializedMarketplace = Readonly<{
  root: string;
  source: ResolvedMarketplaceSource;
  content: ContentManifest;
}>;
export type MaterializedPlugin = Readonly<{
  root: string;
  source: ResolvedPluginSource;
  content: ContentManifest;
}>;

export type SourceContext =
  | Readonly<{ kind: "external" }>
  | Readonly<{
      kind: "marketplace";
      root: string;
      source: ResolvedMarketplaceSource;
      contentRootDigest: ContentDigest;
    }>;

export type MaterializationFailureClassification = "security" | "permanent" | "transient";

export class SourceMaterializationError extends BoundaryError {
  readonly classification: MaterializationFailureClassification;

  constructor(input: Readonly<{
    code: "PATH_CONTAINMENT_FAILED" | "SOURCE_RESOLUTION_FAILED" | "ADAPTER_FAILED";
    classification: MaterializationFailureClassification;
    operation: string;
    message: string;
    details?: JsonValue;
    cause?: unknown;
  }>) {
    super(input);
    if (!(["security", "permanent", "transient"] as const).includes(input.classification)) {
      throw new TypeError("source materialization classification is invalid");
    }
    this.name = "SourceMaterializationError";
    this.classification = input.classification;
  }
}

export type SourceMaterializationDependencies = SourceMaterializationPortDependencies;

function abortIfRequested(signal: AbortSignal): void {
  if (!signal.aborted) return;
  throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function safeMessage(error: unknown): string {
  if (error instanceof SourceMaterializationError) return error.message;
  // Adapter messages may contain URLs, credentials, or remote stderr. Keep
  // those details in the native cause for the owning redacted logger only.
  return "source materialization adapter failed";
}

function safeDetails(operation: string): JsonValue {
  return { operation };
}

function asAdapterFailure(operation: string, error: unknown): SourceMaterializationError {
  if (error instanceof SourceMaterializationError) return error;
  return new SourceMaterializationError({
    code: "ADAPTER_FAILED",
    classification: "permanent",
    operation,
    message: safeMessage(error),
    details: safeDetails(operation),
    cause: error,
  });
}

function asResolutionFailure(operation: string, error: unknown): SourceMaterializationError {
  if (error instanceof SourceMaterializationError) return error;
  return new SourceMaterializationError({
    code: "SOURCE_RESOLUTION_FAILED",
    classification: "permanent",
    operation,
    message: safeMessage(error),
    details: safeDetails(operation),
    cause: error,
  });
}

async function cleanupOrThrow(
  session: SecureContentSession,
  original: unknown,
  signal: AbortSignal,
): Promise<never> {
  try {
    await session.abort(original);
  } catch (cleanupError) {
    const cleanup = asAdapterFailure("abortMaterialization", cleanupError);
    throw new SourceMaterializationError({
      code: "ADAPTER_FAILED",
      classification: "permanent",
      operation: "abortMaterialization",
      message: "materialization failed and cleanup also failed",
      details: {
        operation: "abortMaterialization",
        cleanup: cleanup.message,
      },
      cause: new AggregateError([original, cleanupError], "materialization cleanup failed"),
    });
  }
  if (signal.aborted) throw signal.reason ?? original;
  throw original instanceof SourceMaterializationError
    ? original
    : asAdapterFailure("materializeSource", original);
}

function checkedMarketplaceContext(
  context: SourceContext,
  sha256: SourceMaterializationDependencies["sha256"],
): Extract<SourceContext, { kind: "marketplace" }> {
  if (context === null || typeof context !== "object" || context.kind !== "marketplace") {
    throw new SourceMaterializationError({
      code: "PATH_CONTAINMENT_FAILED",
      classification: "security",
      operation: "materializePlugin",
      message: "marketplace-relative source requires marketplace context",
      details: { operation: "materializePlugin" },
    });
  }
  if (typeof context.root !== "string" || context.root.length === 0) {
    throw new SourceMaterializationError({
      code: "PATH_CONTAINMENT_FAILED",
      classification: "security",
      operation: "materializePlugin",
      message: "marketplace context root is empty",
      details: { operation: "materializePlugin" },
    });
  }
  try {
    ContentDigestSchema.parse(context.contentRootDigest);
  } catch (error) {
    throw new SourceMaterializationError({
      code: "PATH_CONTAINMENT_FAILED",
      classification: "security",
      operation: "materializePlugin",
      message: "marketplace context manifest digest is invalid",
      details: { operation: "materializePlugin" },
      cause: error,
    });
  }
  try {
    verifyResolvedMarketplaceSource(context.source, sha256);
  } catch (error) {
    throw new SourceMaterializationError({
      code: "SOURCE_RESOLUTION_FAILED",
      classification: "permanent",
      operation: "materializePlugin",
      message: "marketplace context source is not verified",
      details: { operation: "materializePlugin" },
      cause: error,
    });
  }
  return context;
}

function verifyMarketplaceResult(result: unknown, sha256: SourceMaterializationDependencies["sha256"]): ResolvedMarketplaceSource {
  try {
    return verifyResolvedMarketplaceSource(result, sha256);
  } catch (error) {
    throw asResolutionFailure("materializeMarketplace", error);
  }
}

function verifyPluginResult(result: unknown, sha256: SourceMaterializationDependencies["sha256"]): ResolvedPluginSource {
  try {
    return verifyResolvedPluginSource(result, sha256);
  } catch (error) {
    throw asResolutionFailure("materializePlugin", error);
  }
}

async function finalize(
  session: SecureContentSession,
  signal: AbortSignal,
  sha256: SourceMaterializationDependencies["sha256"],
  operation: string,
): Promise<Readonly<{ root: string; content: ContentManifest }>> {
  abortIfRequested(signal);
  const result = await session.finalize(signal);
  abortIfRequested(signal);
  try {
    return { root: result.root, content: verifyContentManifest(result.content, sha256) };
  } catch (error) {
    throw asAdapterFailure(operation, error);
  }
}

export function createSourceMaterializers(
  dependencies: SourceMaterializationDependencies,
): Readonly<{
  marketplaces: MarketplaceMaterializer;
  plugins: PluginMaterializer;
}> {
  const marketplaces: MarketplaceMaterializer = {
    async materialize(source, destination, signal) {
      abortIfRequested(signal);
      let declaration: MarketplaceSource;
      try {
        declaration = MarketplaceSourceSchema.parse(source);
      } catch (error) {
        throw asResolutionFailure("materializeMarketplace", error);
      }
      let session: SecureContentSession | undefined;
      try {
        session = await dependencies.content.open(destination);
        abortIfRequested(signal);
        const resolved = verifyMarketplaceResult(
          await dependencies.git.materializeMarketplace(declaration, session, signal),
          dependencies.sha256,
        );
        const content = await finalize(session, signal, dependencies.sha256, "finalizeContentManifest");
        abortIfRequested(signal);
        return { root: content.root, source: resolved, content: content.content };
      } catch (error) {
        if (session !== undefined) return cleanupOrThrow(session, error, signal);
        if (signal.aborted) throw signal.reason ?? error;
        throw asAdapterFailure("materializeMarketplace", error);
      }
    },
  };

  const plugins: PluginMaterializer = {
    async materialize(source, context, destination, signal) {
      abortIfRequested(signal);
      let declaration: PluginSource;
      try {
        declaration = PluginSourceSchema.parse(source);
      } catch (error) {
        throw asResolutionFailure("materializePlugin", error);
      }
      let session: SecureContentSession | undefined;
      try {
        if (declaration.kind === "marketplace-path") {
          const marketplace = checkedMarketplaceContext(context, dependencies.sha256);
          try {
            normalizeContentPath(declaration.path);
          } catch (error) {
            throw new SourceMaterializationError({
              code: "PATH_CONTAINMENT_FAILED",
              classification: "security",
              operation: "copyMarketplacePath",
              message: "marketplace source path is unsafe",
              details: { operation: "copyMarketplacePath" },
              cause: error,
            });
          }
          const copier: MarketplacePathAcquirer | undefined = dependencies.marketplace;
          if (copier === undefined) {
            throw new SourceMaterializationError({
              code: "ADAPTER_FAILED",
              classification: "permanent",
              operation: "copyMarketplacePath",
              message: "no marketplace path acquirer is configured",
              details: { operation: "copyMarketplacePath" },
            });
          }
          session = await dependencies.content.open(destination);
          abortIfRequested(signal);
          await copier.materialize(declaration, marketplace, session, signal);
          const resolved = createMarketplacePluginSource(declaration, marketplace, dependencies.sha256);
          const content = await finalize(session, signal, dependencies.sha256, "finalizeContentManifest");
          abortIfRequested(signal);
          return { root: content.root, source: resolved, content: content.content };
        }

        if (context === null || typeof context !== "object" || context.kind !== "external") {
          throw new SourceMaterializationError({
            code: "SOURCE_RESOLUTION_FAILED",
            classification: "permanent",
            operation: "materializePlugin",
            message: "external plugin source cannot use marketplace context",
            details: { operation: "materializePlugin" },
          });
        }

        session = await dependencies.content.open(destination);
        abortIfRequested(signal);
        const resolved = declaration.kind === "npm"
          ? await dependencies.npm.materialize(declaration, session, signal)
          : await dependencies.git.materializePlugin(declaration, session, signal);
        const verified = verifyPluginResult(resolved, dependencies.sha256);
        const content = await finalize(session, signal, dependencies.sha256, "finalizeContentManifest");
        abortIfRequested(signal);
        return { root: content.root, source: verified, content: content.content };
      } catch (error) {
        if (session !== undefined) return cleanupOrThrow(session, error, signal);
        if (signal.aborted) throw signal.reason ?? error;
        throw asAdapterFailure("materializePlugin", error);
      }
    },
  };

  return { marketplaces, plugins };
}

function createMarketplacePluginSource(
  source: Extract<PluginSource, { kind: "marketplace-path" }>,
  context: Extract<SourceContext, { kind: "marketplace" }>,
  sha256: SourceMaterializationDependencies["sha256"],
): ResolvedPluginSource {
  return verifyPluginResult({
    kind: "marketplace-path",
    marketplaceRevision: context.source.revision,
    path: source.path,
  }, sha256);
}

export interface MarketplaceMaterializer {
  materialize(source: MarketplaceSource, destination: StagingSlot, signal: AbortSignal): Promise<MaterializedMarketplace>;
}
export interface PluginMaterializer {
  materialize(source: PluginSource, context: SourceContext, destination: StagingSlot, signal: AbortSignal): Promise<MaterializedPlugin>;
}
