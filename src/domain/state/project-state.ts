import { z } from "zod";
import {
  ContentDigestSchema,
  type ContentDigest,
} from "../content-manifest.js";
import {
  ProjectIdentitySchema,
  ProjectKeySchema,
  ScopeContextSchema,
  createScopeContext,
  type ProjectIdentity,
  type ProjectKey,
  type ScopeContext,
} from "./scope.js";
import {
  InstalledPluginRecordSchema,
  MarketplaceSnapshotRecordSchema,
  createInstalledPluginRecord,
  createMarketplaceSnapshotRecord,
  type InstalledPluginRecord,
  type MarketplaceSnapshotRecord,
} from "./installed-state.js";
import { MarketplaceNameSchema, PluginKeySchema } from "../identity.js";
import { GenerationSchema } from "./config-state.js";
export { GenerationSchema } from "./config-state.js";
export type { Generation } from "./config-state.js";
import { defineVersionedSchemaFamily } from "./versioning.js";
import type { Sha256 } from "../source.js";
import {
  MarketplaceRegistrationRecordSchema,
  MarketplaceRegistrationRecordSchemaV3,
  MarketplaceUpdateRecordSchema,
  MarketplaceUpdateRecordSchemaV2,
  UpdateApplicationModeSchema,
  UpdateSchedulerLeaseSchema,
  migrateMarketplaceRegistrationRecordV3,
} from "../update-policy.js";
import { serializeMarketplaceSource } from "../source.js";

/** Machine-local state for one verified project declaration and identity. */
export const ProjectLocalStateDocumentSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    generation: GenerationSchema,
    projectKey: ProjectKeySchema,
    identity: ProjectIdentitySchema,
    declarationDigest: ContentDigestSchema,
    marketplaces: z.array(MarketplaceSnapshotRecordSchema).readonly(),
    plugins: z.array(InstalledPluginRecordSchema).readonly(),
  })
  .strict()
  .readonly()
  .superRefine((document, context) => {
    const marketplaceNames = new Set<string>();
    for (const [index, marketplace] of document.marketplaces.entries()) {
      if (marketplaceNames.has(marketplace.marketplace)) {
        context.addIssue({
          code: "custom",
          path: ["marketplaces", index, "marketplace"],
          message: "duplicate marketplace snapshot",
        });
      }
      marketplaceNames.add(marketplace.marketplace);
    }

    const pluginKeys = new Set<string>();
    for (const [index, plugin] of document.plugins.entries()) {
      if (pluginKeys.has(plugin.plugin)) {
        context.addIssue({
          code: "custom",
          path: ["plugins", index, "plugin"],
          message: "duplicate installed plugin",
        });
      }
      pluginKeys.add(plugin.plugin);

      const marketplace = plugin.plugin.slice(plugin.plugin.lastIndexOf("@") + 1);
      const snapshot = document.marketplaces.find((candidate) => candidate.marketplace === marketplace);
      if (snapshot === undefined) {
        context.addIssue({
          code: "custom",
          path: ["plugins", index, "plugin"],
          message: "installed plugin must have a corresponding marketplace snapshot",
        });
        continue;
      }
      for (const [revisionIndex, revision] of plugin.revisions.entries()) {
        if (revision.evidence.source.kind === "marketplace-path" &&
            revision.evidence.source.marketplaceRevision !== snapshot.source.revision) {
          context.addIssue({
            code: "custom",
            path: ["plugins", index, "revisions", revisionIndex, "evidence", "source", "marketplaceRevision"],
            message: "marketplace-relative plugin source must match the marketplace snapshot revision",
          });
        }
      }
    }
  });
export type ProjectLocalStateDocumentV1 = z.infer<typeof ProjectLocalStateDocumentSchemaV1>;

export const ProjectLocalStateDocumentSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  generation: GenerationSchema,
  projectKey: ProjectKeySchema,
  identity: ProjectIdentitySchema,
  declarationDigest: ContentDigestSchema,
  marketplaces: z.array(MarketplaceSnapshotRecordSchema).readonly(),
  plugins: z.array(InstalledPluginRecordSchema).readonly(),
  marketplaceUpdates: z.array(MarketplaceUpdateRecordSchemaV2).readonly(),
}).strict().readonly().superRefine((document, context) => {
  const snapshots = new Set(document.marketplaces.map((record) => record.marketplace));
  const seen = new Set<string>();
  for (const [index, record] of document.marketplaceUpdates.entries()) {
    if (!snapshots.has(record.marketplace)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "marketplace"], message: "update record must have a matching marketplace snapshot" });
    if (seen.has(record.marketplace)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "marketplace"], message: "duplicate marketplace update record" });
    seen.add(record.marketplace);
  }
  const pluginKeys = new Set<string>();
  for (const [index, plugin] of document.plugins.entries()) {
    if (pluginKeys.has(plugin.plugin)) context.addIssue({ code: "custom", path: ["plugins", index, "plugin"], message: "duplicate installed plugin" });
    pluginKeys.add(plugin.plugin);
    const marketplace = plugin.plugin.slice(plugin.plugin.lastIndexOf("@") + 1);
    if (!snapshots.has(MarketplaceNameSchema.parse(marketplace))) context.addIssue({ code: "custom", path: ["plugins", index, "plugin"], message: "installed plugin must have a corresponding marketplace snapshot" });
  }
});
export type ProjectLocalStateDocumentV2 = z.infer<typeof ProjectLocalStateDocumentSchemaV2>;

export const ProjectLocalStateDocumentSchemaV3 = z.object({
  schemaVersion: z.literal(3),
  generation: GenerationSchema,
  projectKey: ProjectKeySchema,
  identity: ProjectIdentitySchema,
  declarationDigest: ContentDigestSchema,
  marketplaces: z.array(MarketplaceSnapshotRecordSchema).readonly(),
  plugins: z.array(InstalledPluginRecordSchema).readonly(),
  marketplaceUpdates: z.array(MarketplaceRegistrationRecordSchemaV3).readonly(),
}).strict().readonly().superRefine((document, context) => {
  const snapshots = new Set(document.marketplaces.map((record) => record.marketplace));
  const names = new Set<string>();
  const sources = new Set<string>();
  for (const [index, record] of document.marketplaceUpdates.entries()) {
    if (record.source.kind === "local-git") context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "source"], message: "project marketplace sources must be portable" });
    if (!snapshots.has(record.marketplace)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "marketplace"], message: "registration must have a matching marketplace snapshot" });
    if (names.has(record.marketplace)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "marketplace"], message: "duplicate marketplace registration" });
    names.add(record.marketplace);
    const source = serializeMarketplaceSource(record.source);
    if (sources.has(source)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "source"], message: "duplicate marketplace source" });
    sources.add(source);
  }
  const pluginKeys = new Set<string>();
  for (const [index, plugin] of document.plugins.entries()) {
    if (pluginKeys.has(plugin.plugin)) context.addIssue({ code: "custom", path: ["plugins", index, "plugin"], message: "duplicate installed plugin" });
    pluginKeys.add(plugin.plugin);
    const marketplace = plugin.plugin.slice(plugin.plugin.lastIndexOf("@") + 1);
    if (!snapshots.has(MarketplaceNameSchema.parse(marketplace))) context.addIssue({ code: "custom", path: ["plugins", index, "plugin"], message: "installed plugin must have a corresponding marketplace snapshot" });
  }
});
export type ProjectLocalStateDocumentV3 = z.infer<typeof ProjectLocalStateDocumentSchemaV3>;

export const ProjectLocalStateDocumentSchemaV4 = z.object({
  schemaVersion: z.literal(4),
  generation: GenerationSchema,
  projectKey: ProjectKeySchema,
  identity: ProjectIdentitySchema,
  declarationDigest: ContentDigestSchema,
  scope: z.object({
    application: UpdateApplicationModeSchema.optional(),
    schedulerLease: UpdateSchedulerLeaseSchema.optional(),
  }).strict().readonly().default(() => ({})),
  marketplaces: z.array(MarketplaceSnapshotRecordSchema).readonly(),
  plugins: z.array(InstalledPluginRecordSchema).readonly(),
  marketplaceUpdates: z.array(MarketplaceRegistrationRecordSchema).readonly(),
}).strict().readonly().superRefine((document, context) => {
  const snapshots = new Set(document.marketplaces.map((record) => record.marketplace));
  const names = new Set<string>();
  const sources = new Set<string>();
  for (const [index, record] of document.marketplaceUpdates.entries()) {
    if (record.source.kind === "local-git") context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "source"], message: "project marketplace sources must be portable" });
    if (!snapshots.has(record.marketplace)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "marketplace"], message: "registration must have a matching marketplace snapshot" });
    if (names.has(record.marketplace)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "marketplace"], message: "duplicate marketplace registration" });
    names.add(record.marketplace);
    const source = serializeMarketplaceSource(record.source);
    if (sources.has(source)) context.addIssue({ code: "custom", path: ["marketplaceUpdates", index, "source"], message: "duplicate marketplace source" });
    sources.add(source);
  }
  const pluginKeys = new Set<string>();
  for (const [index, plugin] of document.plugins.entries()) {
    if (pluginKeys.has(plugin.plugin)) context.addIssue({ code: "custom", path: ["plugins", index, "plugin"], message: "duplicate installed plugin" });
    pluginKeys.add(plugin.plugin);
    const marketplace = plugin.plugin.slice(plugin.plugin.lastIndexOf("@") + 1);
    if (!snapshots.has(MarketplaceNameSchema.parse(marketplace))) context.addIssue({ code: "custom", path: ["plugins", index, "plugin"], message: "installed plugin must have a corresponding marketplace snapshot" });
  }
});
export type ProjectLocalStateDocumentV4 = z.infer<typeof ProjectLocalStateDocumentSchemaV4>;

function migrateProjectV1(input: unknown): ProjectLocalStateDocumentV2 {
  const value = ProjectLocalStateDocumentSchemaV1.parse(input);
  return ProjectLocalStateDocumentSchemaV2.parse({ ...value, schemaVersion: 2, marketplaceUpdates: [] });
}

function migrateProjectV2(input: unknown): ProjectLocalStateDocumentV3 {
  const value = ProjectLocalStateDocumentSchemaV2.parse(input);
  return ProjectLocalStateDocumentSchemaV3.parse({
    ...value,
    schemaVersion: 3,
    marketplaceUpdates: value.marketplaceUpdates.map((record) => ({ ...record, origin: { kind: "legacy" as const } })),
  });
}

export function projectProjectLocalV3ToV4(input: ProjectLocalStateDocumentV3): ProjectLocalStateDocumentV4 {
  const value = ProjectLocalStateDocumentSchemaV3.parse(input);
  return ProjectLocalStateDocumentSchemaV4.parse({
    ...value,
    schemaVersion: 4,
    scope: {},
    marketplaceUpdates: value.marketplaceUpdates.map(migrateMarketplaceRegistrationRecordV3),
  });
}

function migrateProjectV3(input: unknown): ProjectLocalStateDocumentV4 {
  return projectProjectLocalV3ToV4(ProjectLocalStateDocumentSchemaV3.parse(input));
}

export const ProjectLocalStateSchemaFamily = defineVersionedSchemaFamily({
  latestVersion: 4,
  versions: new Map<number, z.ZodTypeAny>([
    [1, ProjectLocalStateDocumentSchemaV1],
    [2, ProjectLocalStateDocumentSchemaV2],
    [3, ProjectLocalStateDocumentSchemaV3],
    [4, ProjectLocalStateDocumentSchemaV4],
  ]),
  migrations: new Map<number, (input: unknown) => unknown>([[1, migrateProjectV1], [2, migrateProjectV2], [3, migrateProjectV3]]),
});
export const ProjectLocalStateDocumentSchema = ProjectLocalStateDocumentSchemaV4;
export type ProjectLocalStateDocument = ProjectLocalStateDocumentV4;

const ProjectLocalStateInputSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    generation: GenerationSchema,
    projectKey: ProjectKeySchema,
    identity: ProjectIdentitySchema,
    declarationDigest: ContentDigestSchema,
    marketplaces: z.array(z.unknown()),
    plugins: z.array(z.unknown()),
    marketplaceUpdates: z.array(z.unknown()).optional(),
    scope: z.unknown().optional(),
  })
  .strict();

function sameJsonIdentity(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((entry, index) => sameJsonIdentity(entry, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(rightRecord, key) && sameJsonIdentity(leftRecord[key], rightRecord[key]),
  );
}

function projectScopeReference(context: Extract<ScopeContext, { kind: "project" }>): {
  readonly kind: "project";
  readonly projectKey: ProjectKey;
} {
  return { kind: "project", projectKey: context.projectKey };
}

/**
 * Construct a project-local document only from a scope context whose key is
 * recomputed against the injected hash. The canonical root is retained as
 * identity evidence in this machine-local document; nested plugin references
 * receive only the path-free project key.
 */
export function createProjectLocalStateDocument(
  input: unknown,
  context: Extract<ScopeContext, { kind: "project" }>,
  sha256: Sha256,
): ProjectLocalStateDocumentV1 {
  const value = ProjectLocalStateInputSchema.parse(input);
  const verifiedContext = createScopeContext(ScopeContextSchema.parse(context), sha256);
  if (verifiedContext.kind !== "project") {
    throw new Error("project-local state requires project scope context");
  }
  if (value.projectKey !== verifiedContext.projectKey) {
    throw new Error("project-local state project key does not match scope context");
  }
  if (!sameJsonIdentity(value.identity, verifiedContext.identity)) {
    throw new Error("project-local state identity does not match scope context");
  }

  const scope = projectScopeReference(verifiedContext);
  const marketplaces = value.marketplaces.map((marketplace) =>
    createMarketplaceSnapshotRecord(marketplace, sha256),
  );
  const plugins = value.plugins.map((plugin) =>
    createInstalledPluginRecord({ ...plugin as Record<string, unknown>, scope }, sha256),
  );

  return ProjectLocalStateDocumentSchemaV1.parse({
    schemaVersion: 1,
    generation: value.generation,
    projectKey: verifiedContext.projectKey,
    identity: verifiedContext.identity,
    declarationDigest: value.declarationDigest,
    marketplaces,
    plugins,
  });
}

/** Build the retained v2 envelope for migration fixtures. */
export function createProjectLocalStateDocumentV2(
  input: unknown,
  context: Extract<ScopeContext, { kind: "project" }>,
  sha256: Sha256,
): ProjectLocalStateDocumentV2 {
  const isObject = input !== null && typeof input === "object" && !Array.isArray(input);
  const value = isObject ? ProjectLocalStateInputSchema.parse(input) : undefined;
  const marketplaceUpdates = value?.schemaVersion === 2
    ? (value.marketplaceUpdates ?? []).map((record) => MarketplaceUpdateRecordSchemaV2.parse(record))
    : [];
  const legacyInput = value === undefined
    ? input
    : Object.fromEntries(Object.entries(value).filter(([key]) => key !== "schemaVersion" && key !== "marketplaceUpdates"));
  const legacy = createProjectLocalStateDocument({ ...(legacyInput as Record<string, unknown>), schemaVersion: 1 }, context, sha256);
  return ProjectLocalStateDocumentSchemaV2.parse({ ...legacy, schemaVersion: 2, marketplaceUpdates });
}

/** Build and verify a project-local v3 envelope for migration fixtures. */
export function createProjectLocalStateDocumentV3(
  input: unknown,
  context: Extract<ScopeContext, { kind: "project" }>,
  sha256: Sha256,
): ProjectLocalStateDocumentV3 {
  const value = ProjectLocalStateInputSchema.parse(input);
  if (value.schemaVersion === 1 || value.schemaVersion === undefined) {
    return migrateProjectV2(createProjectLocalStateDocumentV2(value, context, sha256));
  }
  if (value.schemaVersion === 2) {
    return migrateProjectV2(createProjectLocalStateDocumentV2(value, context, sha256));
  }
  const legacyInput = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "schemaVersion" && key !== "marketplaceUpdates"));
  const legacy = createProjectLocalStateDocument({ ...legacyInput, schemaVersion: 1 }, context, sha256);
  const marketplaceUpdates = (value.marketplaceUpdates ?? []).map((record) => MarketplaceRegistrationRecordSchemaV3.parse(record));
  return ProjectLocalStateDocumentSchemaV3.parse({ ...legacy, schemaVersion: 3, marketplaceUpdates });
}

/** Build and verify the current project-local v4 envelope. */
export function createProjectLocalStateDocumentV4(
  input: unknown,
  context: Extract<ScopeContext, { kind: "project" }>,
  sha256: Sha256,
): ProjectLocalStateDocumentV4 {
  const value = ProjectLocalStateInputSchema.parse(input);
  if (value.schemaVersion !== 4) return projectProjectLocalV3ToV4(createProjectLocalStateDocumentV3(value, context, sha256));
  const legacyInput = Object.fromEntries(Object.entries(value).filter(([key]) => !["schemaVersion", "marketplaceUpdates", "scope"].includes(key)));
  const legacy = createProjectLocalStateDocument({ ...legacyInput, schemaVersion: 1 }, context, sha256);
  return ProjectLocalStateDocumentSchemaV4.parse({
    ...legacy,
    schemaVersion: 4,
    scope: value.scope ?? {},
    marketplaceUpdates: (value.marketplaceUpdates ?? []).map((record) => MarketplaceUpdateRecordSchema.parse(record)),
  });
}

export type ProjectPluginRecordCollectionDecode = Readonly<{
  records: readonly InstalledPluginRecord[];
  quarantined: readonly {
    index: number;
    recordKey?: string;
    code: "RECORD_INVALID" | "RECORD_DUPLICATE";
  }[];
}>;

function projectCandidateKey(input: unknown): string | undefined {
  if (input === null || typeof input !== "object") return undefined;
  const key = (input as { readonly plugin?: unknown }).plugin;
  return typeof key === "string" && PluginKeySchema.safeParse(key).success ? key : undefined;
}

/** Project-local variant of plugin-granular corruption isolation. */
export function decodeProjectPlugins(
  input: unknown,
  context: Extract<ScopeContext, { kind: "project" }>,
  sha256: Sha256,
): ProjectPluginRecordCollectionDecode {
  if (!Array.isArray(input)) throw new Error("project plugin collection must be an array");
  const valid: Array<{ index: number; key: string; record: InstalledPluginRecord }> = [];
  const quarantined: ProjectPluginRecordCollectionDecode["quarantined"][number][] = [];
  const verifiedContext = createScopeContext(ScopeContextSchema.parse(context), sha256);
  if (verifiedContext.kind !== "project") {
    throw new Error("project plugin collection requires project scope context");
  }
  const scope = projectScopeReference(verifiedContext);
  const counts = new Map<string, number>();
  for (const candidate of input) {
    const key = projectCandidateKey(candidate);
    if (key !== undefined) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [index, candidate] of input.entries()) {
    const key = projectCandidateKey(candidate);
    if (key === undefined) {
      throw new Error(`project plugin record identity is missing or invalid at index ${index}`);
    }
    try {
      const record = createInstalledPluginRecord({
        ...candidate as Record<string, unknown>,
        scope,
      }, sha256);
      valid.push({ index, key, record });
    } catch {
      quarantined.push({ index, recordKey: key, code: "RECORD_INVALID" });
    }
  }

  const records: InstalledPluginRecord[] = [];
  for (const candidate of valid) {
    if (counts.get(candidate.key)! > 1) {
      quarantined.push({ index: candidate.index, recordKey: candidate.key, code: "RECORD_DUPLICATE" });
    } else {
      records.push(candidate.record);
    }
  }
  return {
    records,
    quarantined: quarantined.sort((left, right) => left.index - right.index),
  };
}

export type { ProjectIdentity, ProjectKey, ScopeContext, ContentDigest, MarketplaceSnapshotRecord };
export type { InstalledPluginRecord };
