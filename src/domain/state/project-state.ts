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
import { PluginKeySchema } from "../identity.js";
import { GenerationSchema } from "./config-state.js";
export { GenerationSchema } from "./config-state.js";
export type { Generation } from "./config-state.js";
import { defineVersionedSchemaFamily } from "./versioning.js";
import type { Sha256 } from "../source.js";

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
        if (revision.plugin.source.kind === "marketplace-path" &&
            revision.plugin.source.marketplaceRevision !== snapshot.source.revision) {
          context.addIssue({
            code: "custom",
            path: ["plugins", index, "revisions", revisionIndex, "plugin", "source", "marketplaceRevision"],
            message: "marketplace-relative plugin source must match the marketplace snapshot revision",
          });
        }
      }
    }
  });
export type ProjectLocalStateDocumentV1 = z.infer<typeof ProjectLocalStateDocumentSchemaV1>;

export const ProjectLocalStateSchemaFamily = defineVersionedSchemaFamily({
  latestVersion: 1,
  versions: new Map([[1, ProjectLocalStateDocumentSchemaV1]]),
  migrations: new Map(),
});
export const ProjectLocalStateDocumentSchema = ProjectLocalStateDocumentSchemaV1;
export type ProjectLocalStateDocument = ProjectLocalStateDocumentV1;

const ProjectLocalStateInputSchema = z
  .object({
    schemaVersion: z.literal(1).optional(),
    generation: GenerationSchema,
    projectKey: ProjectKeySchema,
    identity: ProjectIdentitySchema,
    declarationDigest: ContentDigestSchema,
    marketplaces: z.array(z.unknown()),
    plugins: z.array(z.unknown()),
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
      quarantined.push({ index, code: "RECORD_INVALID" });
      continue;
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
