import { z } from "zod";
import {
  ContentDigestSchema,
  ContentManifestSchema,
  createMaterializationBinding,
  verifyContentManifest,
  type ContentDigest,
  type ContentManifest,
} from "../content-manifest.js";
import {
  CompatibilityReportSchema,
  type CompatibilityReport,
} from "../compatibility.js";
import {
  MarketplaceNameSchema,
  PluginKeySchema,
  type MarketplaceName,
  type PluginKey,
} from "../identity.js";
import type { JsonValue } from "../schema.js";
import { NormalizedPluginSchema, type NormalizedPlugin } from "../plugin.js";
import {
  MarketplaceContentRefSchema,
  PendingTransitionRefSchema,
  PluginConfigurationRefSchema,
  PluginContentRefSchema,
  PluginDataRefSchema,
  deriveMarketplaceContentRef,
  derivePluginConfigurationRef,
  derivePluginContentRef,
  derivePluginDataRef,
  verifyMarketplaceContentRef,
  verifyPluginConfigurationRef,
  verifyPluginContentRef,
  verifyPluginDataRef,
  type MarketplaceContentRef,
  type PendingTransitionRef,
  type PluginConfigurationRef,
  type PluginContentRef,
  type PluginDataRef,
} from "./references.js";
import { ScopeReferenceSchema, type ScopeReference } from "./scope.js";
import {
  ResolvedMarketplaceSourceSchema,
  ResolvedPluginSourceSchema,
  verifyResolvedMarketplaceSource,
  verifyResolvedPluginSource,
  type ResolvedMarketplaceSource,
  type ResolvedPluginSource,
  type Sha256,
} from "../source.js";
import { defineVersionedSchemaFamily } from "./versioning.js";

// Generation is shared by every state family. It is defined with host config,
// rather than copied here, so compare-and-swap values cannot drift by scope.
export { GenerationSchema } from "./config-state.js";
export type { Generation } from "./config-state.js";
import { GenerationSchema } from "./config-state.js";

export const ActivationIntentSchema = z.enum(["enabled", "disabled"]);
export type ActivationIntent = z.infer<typeof ActivationIntentSchema>;

function addIssue(
  context: z.RefinementCtx,
  path: readonly (string | number)[],
  message: string,
): void {
  context.addIssue({ code: "custom", path: [...path], message });
}

function samePluginIdentity(
  left: NormalizedPlugin["identity"],
  right: CompatibilityReport["plugin"],
): boolean {
  return left.key === right.key &&
    left.marketplaceName === right.marketplaceName &&
    left.marketplaceEntryName === right.marketplaceEntryName &&
    left.manifestName === right.manifestName;
}

function addDuplicateIssues<T extends string>(
  values: readonly T[],
  path: readonly (string | number)[],
  label: string,
  context: z.RefinementCtx,
): void {
  const firstByValue = new Map<T, number>();
  for (const [index, value] of values.entries()) {
    const firstIndex = firstByValue.get(value);
    if (firstIndex !== undefined) {
      addIssue(context, [...path, index], `duplicate ${label}; first declared at index ${firstIndex}`);
    } else {
      firstByValue.set(value, index);
    }
  }
}

/** A verified, immutable marketplace catalog snapshot used by installed state. */
export const MarketplaceSnapshotRecordSchema = z
  .object({
    marketplace: MarketplaceNameSchema,
    source: ResolvedMarketplaceSourceSchema,
    content: ContentManifestSchema,
    binding: ContentDigestSchema,
    contentRef: MarketplaceContentRefSchema,
  })
  .strict()
  .readonly();
export type MarketplaceSnapshotRecord = z.infer<typeof MarketplaceSnapshotRecordSchema>;

/**
 * One immutable plugin revision. The normalized plugin and compatibility
 * report are deliberately embedded canonical contracts: state records do not
 * invent lifecycle-shaped copies of foreign declarations.
 */
export const InstalledRevisionRecordSchema = z
  .object({
    revision: ContentDigestSchema,
    plugin: NormalizedPluginSchema,
    compatibility: CompatibilityReportSchema,
    content: ContentManifestSchema,
    contentRef: PluginContentRefSchema,
    dataRef: PluginDataRefSchema,
    configurationRef: PluginConfigurationRefSchema.optional(),
  })
  .strict()
  .readonly()
  .superRefine((record, context) => {
    if (!samePluginIdentity(record.plugin.identity, record.compatibility.plugin)) {
      addIssue(
        context,
        ["compatibility", "plugin"],
        "compatibility report identity must match the normalized plugin identity",
      );
    }
  });
export type InstalledRevisionRecord = z.infer<typeof InstalledRevisionRecordSchema>;

export const InstalledPluginRecordSchema = z
  .object({
    plugin: PluginKeySchema,
    activation: ActivationIntentSchema,
    selectedRevision: ContentDigestSchema,
    revisions: z.array(InstalledRevisionRecordSchema).min(1).readonly(),
    // This is intentionally only an opaque reference. Operation and recovery
    // payloads belong to their own later state families.
    pendingTransition: PendingTransitionRefSchema.optional(),
  })
  .strict()
  .readonly()
  .superRefine((record, context) => {
    addDuplicateIssues(
      record.revisions.map((revision) => revision.revision),
      ["revisions"],
      "revision",
      context,
    );

    const revisionKeys = new Set(record.revisions.map((revision) => revision.plugin.identity.key));
    if (revisionKeys.size !== 1 || !revisionKeys.has(record.plugin)) {
      addIssue(context, ["plugin"], "installed revisions must all belong to the installed plugin key");
    }
    if (!record.revisions.some((revision) => revision.revision === record.selectedRevision)) {
      addIssue(context, ["selectedRevision"], "selected revision must refer to an installed revision");
    }
  });
export type InstalledPluginRecord = z.infer<typeof InstalledPluginRecordSchema>;

function addDuplicateMarketplaceIssues(
  records: readonly MarketplaceSnapshotRecord[],
  context: z.RefinementCtx,
): void {
  addDuplicateIssues(
    records.map((record) => record.marketplace),
    ["marketplaces"],
    "marketplace snapshot",
    context,
  );
}

function addDuplicatePluginIssues(
  records: readonly InstalledPluginRecord[],
  context: z.RefinementCtx,
): void {
  addDuplicateIssues(
    records.map((record) => record.plugin),
    ["plugins"],
    "installed plugin",
    context,
  );
}

function validateMarketplaceCoverage(
  marketplaces: readonly MarketplaceSnapshotRecord[],
  plugins: readonly InstalledPluginRecord[],
  context: z.RefinementCtx,
): void {
  const snapshotsByName = new Map(marketplaces.map((record) => [record.marketplace, record]));
  for (const [index, plugin] of plugins.entries()) {
    const pluginMarketplace = plugin.plugin.slice(plugin.plugin.lastIndexOf("@") + 1) as MarketplaceName;
    const snapshot = snapshotsByName.get(pluginMarketplace);
    if (snapshot === undefined) {
      addIssue(
        context,
        ["plugins", index, "plugin"],
        "installed plugin must have a corresponding marketplace snapshot",
      );
      continue;
    }

    // Marketplace-relative plugin sources are only valid against the exact
    // immutable catalog revision that supplied their content. External plugin
    // sources have their own immutable source identity and need no such link.
    for (const [revisionIndex, revision] of plugin.revisions.entries()) {
      if (revision.plugin.source.kind === "marketplace-path" &&
          revision.plugin.source.marketplaceRevision !== snapshot.source.revision) {
        addIssue(
          context,
          ["plugins", index, "revisions", revisionIndex, "plugin", "source", "marketplaceRevision"],
          "marketplace-relative plugin source must match the marketplace snapshot revision",
        );
      }
    }
  }
}

/** Independently versioned user installed state envelope. */
export const InstalledUserStateDocumentSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    generation: GenerationSchema,
    marketplaces: z.array(MarketplaceSnapshotRecordSchema).readonly(),
    plugins: z.array(InstalledPluginRecordSchema).readonly(),
  })
  .strict()
  .readonly()
  .superRefine((document, context) => {
    addDuplicateMarketplaceIssues(document.marketplaces, context);
    addDuplicatePluginIssues(document.plugins, context);
    validateMarketplaceCoverage(document.marketplaces, document.plugins, context);
  });
export type InstalledUserStateDocumentV1 = z.infer<typeof InstalledUserStateDocumentSchemaV1>;

export const InstalledUserStateSchemaFamily = defineVersionedSchemaFamily({
  latestVersion: 1,
  versions: new Map([[1, InstalledUserStateDocumentSchemaV1]]),
  migrations: new Map(),
});
export const InstalledUserStateDocumentSchema = InstalledUserStateDocumentSchemaV1;
export type InstalledUserStateDocument = InstalledUserStateDocumentV1;

function parseScope(input: unknown): ScopeReference {
  return ScopeReferenceSchema.parse(input ?? { kind: "user" });
}

function sourceAndContentIdentity(
  source: ResolvedMarketplaceSource | ResolvedPluginSource,
  content: ContentManifest,
  binding: ContentDigest,
): Record<string, JsonValue> {
  const immutableRevision = "version" in source
    ? source.version
    : "revision" in source
      ? source.revision
      : source.marketplaceRevision;
  return {
    source: source.canonical,
    sourceHash: source.hash,
    sourceRevision: immutableRevision,
    content: content.rootDigest,
    binding,
  };
}

function pluginRevisionIdentity(
  scope: ScopeReference,
  plugin: NormalizedPlugin,
  content: ContentManifest,
  binding: ContentDigest,
): Record<string, JsonValue> {
  return {
    scope,
    plugin: plugin.identity.key,
    ...sourceAndContentIdentity(plugin.source, content, binding),
  };
}

function pluginDataIdentity(
  scope: ScopeReference,
  plugin: NormalizedPlugin,
  content: ContentManifest,
  binding: ContentDigest,
): Record<string, JsonValue> {
  return {
    ...pluginRevisionIdentity(scope, plugin, content, binding),
    purpose: "persistent-plugin-data",
  };
}

function pluginConfigurationIdentity(
  scope: ScopeReference,
  plugin: NormalizedPlugin,
  content: ContentManifest,
  binding: ContentDigest,
): Record<string, JsonValue> {
  return {
    ...pluginRevisionIdentity(scope, plugin, content, binding),
    purpose: "plugin-configuration",
    configuration: plugin.configuration as unknown as JsonValue,
  };
}

const MarketplaceSnapshotInputSchema = z
  .object({
    marketplace: MarketplaceNameSchema,
    source: ResolvedMarketplaceSourceSchema,
    content: ContentManifestSchema,
    binding: ContentDigestSchema.optional(),
    contentRef: MarketplaceContentRefSchema.optional(),
  })
  .strict();

/**
 * Verify all supplied marketplace evidence and derive its binding/reference.
 * Optional caller claims are checked, never trusted or silently retained.
 */
export function createMarketplaceSnapshotRecord(
  input: unknown,
  sha256: Sha256,
): MarketplaceSnapshotRecord {
  const value = MarketplaceSnapshotInputSchema.parse(input);
  const source = verifyResolvedMarketplaceSource(value.source, sha256);
  const content = verifyContentManifest(value.content, sha256);
  const binding = createMaterializationBinding(source.hash, content.rootDigest, sha256);
  if (value.binding !== undefined && value.binding !== binding) {
    throw new Error("marketplace materialization binding does not match source and content");
  }
  const identity = sourceAndContentIdentity(source, content, binding);
  const contentRef = deriveMarketplaceContentRef(identity, sha256);
  if (value.contentRef !== undefined) {
    verifyMarketplaceContentRef(value.contentRef, identity, sha256);
  }
  return MarketplaceSnapshotRecordSchema.parse({
    marketplace: value.marketplace,
    source,
    content,
    binding,
    contentRef,
  });
}

const InstalledRevisionInputSchema = z
  .object({
    revision: ContentDigestSchema.optional(),
    plugin: NormalizedPluginSchema,
    compatibility: CompatibilityReportSchema,
    content: ContentManifestSchema,
    contentRef: PluginContentRefSchema.optional(),
    dataRef: PluginDataRefSchema.optional(),
    configurationRef: PluginConfigurationRefSchema.optional(),
    // Scope is constructor input only and is deliberately removed from the
    // persisted record. It makes user/project data refs non-interchangeable.
    scope: ScopeReferenceSchema.optional(),
  })
  .strict();

/** Verify canonical plugin evidence and derive all scope-bound references. */
export function createInstalledRevisionRecord(
  input: unknown,
  sha256: Sha256,
): InstalledRevisionRecord {
  const value = InstalledRevisionInputSchema.parse(input);
  const plugin = NormalizedPluginSchema.parse(value.plugin);
  const source = verifyResolvedPluginSource(plugin.source, sha256);
  const compatibility = CompatibilityReportSchema.parse(value.compatibility);
  if (!samePluginIdentity(plugin.identity, compatibility.plugin)) {
    throw new Error("compatibility report identity does not match normalized plugin identity");
  }
  const content = verifyContentManifest(value.content, sha256);
  const revision = createMaterializationBinding(source.hash, content.rootDigest, sha256);
  if (value.revision !== undefined && value.revision !== revision) {
    throw new Error("installed revision does not match the source/content materialization binding");
  }

  const scope = parseScope(value.scope);
  const revisionIdentity = pluginRevisionIdentity(scope, plugin, content, revision);
  const dataIdentity = pluginDataIdentity(scope, plugin, content, revision);
  const configurationIdentity = pluginConfigurationIdentity(scope, plugin, content, revision);
  const contentRef = derivePluginContentRef(revisionIdentity, sha256);
  const dataRef = derivePluginDataRef(dataIdentity, sha256);
  const configurationRef = value.configurationRef !== undefined || plugin.configuration.options.length > 0
    ? derivePluginConfigurationRef(configurationIdentity, sha256)
    : undefined;

  if (value.contentRef !== undefined) verifyPluginContentRef(value.contentRef, revisionIdentity, sha256);
  if (value.dataRef !== undefined) verifyPluginDataRef(value.dataRef, dataIdentity, sha256);
  if (value.configurationRef !== undefined) {
    verifyPluginConfigurationRef(value.configurationRef, configurationIdentity, sha256);
  }

  return InstalledRevisionRecordSchema.parse({
    revision,
    plugin: { ...plugin, source },
    compatibility,
    content,
    contentRef,
    dataRef,
    ...(configurationRef === undefined ? {} : { configurationRef }),
  });
}

const InstalledPluginInputSchema = z
  .object({
    plugin: PluginKeySchema,
    activation: ActivationIntentSchema,
    selectedRevision: ContentDigestSchema.optional(),
    revisions: z.array(z.unknown()).min(1),
    pendingTransition: PendingTransitionRefSchema.optional(),
    scope: ScopeReferenceSchema.optional(),
  })
  .strict();

/** Construct one plugin record while isolating scope-only constructor input. */
export function createInstalledPluginRecord(
  input: unknown,
  sha256: Sha256,
): InstalledPluginRecord {
  const value = InstalledPluginInputSchema.parse(input);
  const scope = parseScope(value.scope);
  const revisions = value.revisions.map((revision) =>
    createInstalledRevisionRecord({ ...revision as Record<string, unknown>, scope }, sha256),
  );
  const selectedRevision = value.selectedRevision ?? revisions[0]!.revision;
  return InstalledPluginRecordSchema.parse({
    plugin: value.plugin,
    activation: value.activation,
    selectedRevision,
    revisions,
    ...(value.pendingTransition === undefined ? {} : { pendingTransition: value.pendingTransition }),
  });
}

const InstalledUserStateInputSchema = z
  .object({
    schemaVersion: z.literal(1).optional(),
    generation: GenerationSchema,
    marketplaces: z.array(z.unknown()),
    plugins: z.array(z.unknown()),
  })
  .strict();

/** Build a complete user document; malformed known records fail the write. */
export function createInstalledUserStateDocument(
  input: unknown,
  sha256: Sha256,
): InstalledUserStateDocumentV1 {
  const value = InstalledUserStateInputSchema.parse(input);
  const marketplaces = value.marketplaces.map((marketplace) =>
    createMarketplaceSnapshotRecord(marketplace, sha256),
  );
  const plugins = value.plugins.map((plugin) =>
    createInstalledPluginRecord({ ...plugin as Record<string, unknown>, scope: { kind: "user" } }, sha256),
  );
  return InstalledUserStateDocumentSchemaV1.parse({
    schemaVersion: 1,
    generation: value.generation,
    marketplaces,
    plugins,
  });
}

/** A safe, redacted result for record-level recovery/quarantine callers. */
export type InstalledRecordQuarantine = Readonly<{
  index: number;
  recordKey?: string;
  code: "RECORD_INVALID" | "RECORD_DUPLICATE";
}>;
export type InstalledRecordCollectionDecode = Readonly<{
  records: readonly InstalledPluginRecord[];
  quarantined: readonly InstalledRecordQuarantine[];
}>;

function candidatePluginKey(input: unknown): string | undefined {
  if (input === null || typeof input !== "object") return undefined;
  const candidate = (input as { readonly plugin?: unknown }).plugin;
  return typeof candidate === "string" && PluginKeySchema.safeParse(candidate).success
    ? candidate
    : undefined;
}

/**
 * Decode plugin records independently. Invalid records are not allowed to
 * poison valid siblings; when a key occurs more than once every occurrence is
 * quarantined, so input order can never select a winner.
 */
export function decodeInstalledPluginRecords(
  input: unknown,
  sha256: Sha256,
): InstalledRecordCollectionDecode {
  if (!Array.isArray(input)) {
    throw new Error("installed plugin collection must be an array");
  }

  const parsed: Array<{ readonly index: number; readonly key: string; readonly record: InstalledPluginRecord }> = [];
  const quarantined: InstalledRecordQuarantine[] = [];
  const occurrences = new Map<string, number>();
  for (const candidate of input) {
    const key = candidatePluginKey(candidate);
    if (key !== undefined) occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  }
  for (const [index, candidate] of input.entries()) {
    const key = candidatePluginKey(candidate);
    if (key === undefined) {
      quarantined.push({ index, code: "RECORD_INVALID" });
      continue;
    }
    try {
      const record = createInstalledPluginRecord(candidate, sha256);
      parsed.push({ index, key, record });
    } catch {
      quarantined.push({ index, recordKey: key, code: "RECORD_INVALID" });
    }
  }

  const records: InstalledPluginRecord[] = [];
  for (const candidate of parsed) {
    if (occurrences.get(candidate.key)! > 1) {
      quarantined.push({ index: candidate.index, recordKey: candidate.key, code: "RECORD_DUPLICATE" });
    } else {
      records.push(candidate.record);
    }
  }
  return { records, quarantined: quarantined.sort((left, right) => left.index - right.index) };
}

/** Decode a user plugin collection with the same duplicate-quarantine policy. */
export function decodeInstalledUserPlugins(
  input: unknown,
  sha256: Sha256,
): InstalledRecordCollectionDecode {
  if (!Array.isArray(input)) throw new Error("installed plugin collection must be an array");
  const withUserScope = input.map((value) =>
    value !== null && typeof value === "object"
      ? { ...value as Record<string, unknown>, scope: { kind: "user" } }
      : value,
  );
  return decodeInstalledPluginRecords(withUserScope, sha256);
}

// Keep these aliases explicit for callers that use the document terminology.
export const InstalledUserStateSchema = InstalledUserStateDocumentSchemaV1;
export type { MarketplaceName, ResolvedMarketplaceSource, ResolvedPluginSource };
export type {
  MarketplaceContentRef,
  PendingTransitionRef,
  PluginConfigurationRef,
  PluginContentRef,
  PluginDataRef,
  ContentDigest,
  ContentManifest,
};
