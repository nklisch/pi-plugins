import {
  createMarketplaceStoreIdentityFromEvidence,
  createPluginStoreIdentityFromEvidence,
  type MarketplaceStoreIdentity,
  type PluginStoreIdentity,
} from "../../domain/content-store.js";
import {
  MarketplaceContentRefSchema,
  PluginContentRefSchema,
  verifyMarketplaceContentRef,
  verifyPluginContentRef,
  verifyPluginDataRef,
  type MarketplaceContentRef,
  type PluginContentRef,
} from "../../domain/state/references.js";
import type {
  InstalledRevisionRecord,
  MarketplaceSnapshotRecord,
} from "../../domain/state/installed-state.js";
import { ScopeReferenceSchema, type ScopeReference } from "../../domain/state/scope.js";
import { DomainContractError, ErrorCodeRegistry } from "../../domain/errors.js";
import type { Sha256 } from "../../domain/source.js";
import { join } from "node:path";
import type { ResolvedContentRoot } from "../../application/ports/content-store.js";
import { assertLayoutRoot, type ContentStoreLayout } from "./content-store-layout.js";
import { inspectPublishedRevision } from "./immutable-content-store.js";

export type ContentRootResolver = Readonly<{
  resolveMarketplace(record: MarketplaceSnapshotRecord, signal: AbortSignal): Promise<ResolvedContentRoot>;
  resolvePlugin(record: InstalledRevisionRecord, signal: AbortSignal, scope: ScopeReference): Promise<ResolvedContentRoot>;
}>;

function resolutionError(message: string, cause?: unknown): DomainContractError {
  return new DomainContractError({
    code: ErrorCodeRegistry.contentVerificationFailed,
    operation: "resolveContent",
    message,
    details: { operation: "resolveContent" },
    ...(cause === undefined ? {} : { cause }),
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

async function verifyMarketplace(
  record: MarketplaceSnapshotRecord,
  layout: ContentStoreLayout,
  sha256: Sha256,
  signal: AbortSignal,
): Promise<ResolvedContentRoot> {
  throwIfAborted(signal);
  const validated = {
    marketplace: record.marketplace,
    source: record.source,
    contentDigest: record.contentDigest,
    binding: record.binding,
    contentRef: MarketplaceContentRefSchema.parse(record.contentRef),
  };
  const identityInput = {
    marketplace: validated.marketplace,
    source: validated.source,
    content: validated.contentDigest,
    binding: validated.binding,
  } as const;
  verifyMarketplaceContentRef(validated.contentRef, identityInput, sha256);
  const identity = createMarketplaceStoreIdentityFromEvidence({
    sourceHash: record.source.sourceHash,
    revision: record.source.revision,
    binding: record.binding,
  }, sha256);
  await assertLayoutRoot(layout, "marketplaceStoreRoot", "resolveContent");
  const published = await inspectPublishedRevision(layout.marketplacePath(identity), sha256).catch((cause) => {
    if (cause instanceof DomainContractError) throw cause;
    throw resolutionError("marketplace content is not a complete ready revision", cause);
  });
  await assertLayoutRoot(layout, "marketplaceStoreRoot", "resolveContent");
  if (published.identity.kind !== "marketplace" || published.identity.key !== identity.key || published.identity.sourceHash !== identity.sourceHash || published.identity.revision !== identity.revision || published.identity.binding !== identity.binding || published.manifest.rootDigest !== record.contentDigest) {
    throw resolutionError("marketplace state evidence does not match the published revision");
  }
  return {
    kind: "marketplace",
    root: join(published.root, "content"),
    identity: published.identity as MarketplaceStoreIdentity,
    manifest: published.manifest,
    contentRef: validated.contentRef,
  };
}

async function verifyPlugin(
  record: InstalledRevisionRecord,
  layout: ContentStoreLayout,
  sha256: Sha256,
  signal: AbortSignal,
  scopeInput: ScopeReference,
): Promise<ResolvedContentRoot> {
  throwIfAborted(signal);
  let scope: ScopeReference;
  try {
    scope = ScopeReferenceSchema.parse(scopeInput);
  } catch (cause) {
    throw resolutionError("installed state scope is required and invalid", cause);
  }
  let contentRef: PluginContentRef;
  try {
    contentRef = PluginContentRefSchema.parse(record.contentRef);
    const source = record.evidence.source;
    const identityInput = {
      scope,
      plugin: record.evidence.plugin.key,
      source,
      content: record.contentDigest,
      binding: record.revision,
    } as const;
    verifyPluginContentRef(contentRef, identityInput, sha256);
    verifyPluginDataRef(record.dataRef, {
      scope,
      plugin: record.evidence.plugin.key,
      purpose: "persistent-plugin-data",
    }, sha256);
  } catch (cause) {
    throw resolutionError("installed state scope-bound content evidence is invalid", cause);
  }
  const source = record.evidence.source;
  const identity = createPluginStoreIdentityFromEvidence({ sourceHash: source.sourceHash, binding: record.revision }, sha256);
  await assertLayoutRoot(layout, "pluginStoreRoot", "resolveContent");
  const published = await inspectPublishedRevision(layout.pluginPath(identity), sha256).catch((cause) => {
    if (cause instanceof DomainContractError) throw cause;
    throw resolutionError("plugin content is not a complete ready revision", cause);
  });
  await assertLayoutRoot(layout, "pluginStoreRoot", "resolveContent");
  if (published.identity.kind !== "plugin" || published.identity.key !== identity.key || published.identity.sourceHash !== identity.sourceHash || published.identity.binding !== identity.binding || published.manifest.rootDigest !== record.contentDigest) {
    throw resolutionError("installed state evidence does not match the published revision");
  }
  return {
    kind: "plugin",
    root: join(published.root, "content"),
    identity: published.identity as PluginStoreIdentity,
    manifest: published.manifest,
    contentRef,
  };
}

export function createContentRootResolver(options: Readonly<{ layout: ContentStoreLayout; sha256: Sha256 }>): ContentRootResolver {
  return Object.freeze({
    resolveMarketplace: (record, signal) => verifyMarketplace(record, options.layout, options.sha256, signal),
    resolvePlugin: (record, signal, scope) => verifyPlugin(record, options.layout, options.sha256, signal, scope),
  });
}
