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
  MarketplaceUpdateRecordSchema,
  type MarketplaceUpdateRecord,
} from "../update-policy.js";

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
  marketplaceUpdates: z.array(MarketplaceUpdateRecordSchema).readonly(),
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

function migrateProjectV1(input: unknown): ProjectLocalStateDocumentV2 {
  const value = ProjectLocalStateDocumentSchemaV1.parse(input);
  return ProjectLocalStateDocumentSchemaV2.parse({ ...value, schemaVersion: 2, marketplaceUpdates: [] });
}

export const ProjectLocalStateSchemaFamily = defineVersionedSchemaFamily({
  latestVersion: 2,
  versions: new Map<number, z.ZodTypeAny>([[1, ProjectLocalStateDocumentSchemaV1], [2, ProjectLocalStateDocumentSchemaV2]]),
  migrations: new Map([[1, migrateProjectV1]]),
});
export const ProjectLocalStateDocumentSchema = ProjectLocalStateDocumentSchemaV2;
export type ProjectLocalStateDocument = ProjectLocalStateDocumentV2;

const ProjectLocalStateInputSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]).optional(),
    generation: GenerationSchema,
    projectKey: ProjectKeySchema,
    identity: ProjectIdentitySchema,
    declarationDigest: ContentDigestSchema,
    marketplaces: z.array(z.unknown()),
    plugins: z.array(z.unknown()),
    marketplaceUpdates: z.array(z.unknown()).optional(),
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

/** Build the current machine-local v2 envelope from the existing checked constructor. */
export function createProjectLocalStateDocumentV2(
  input: unknown,
  context: Extract<ScopeContext, { kind: "project" }>,
  sha256: Sha256,
): ProjectLocalStateDocumentV2 {
  const isObject = input !== null && typeof input === "object" && !Array.isArray(input);
  const value = isObject ? ProjectLocalStateInputSchema.parse(input) : undefined;
  const isV2 = value?.schemaVersion === 2;
  const marketplaceUpdates = isV2
    ? (value.marketplaceUpdates ?? []).map((record) => MarketplaceUpdateRecordSchema.parse(record))
    : [];
  const legacyInput = value === undefined
    ? input
    : Object.fromEntries(Object.entries(value).filter(([key]) => key !== "schemaVersion" && key !== "marketplaceUpdates"));
  const legacy = createProjectLocalStateDocument({ ...(legacyInput as Record<string, unknown>), schemaVersion: 1 }, context, sha256);
  return ProjectLocalStateDocumentSchemaV2.parse({ ...legacy, schemaVersion: 2, marketplaceUpdates });
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
