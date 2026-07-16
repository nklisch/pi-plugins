import { z } from "zod";
import { MarketplaceNameSchema } from "../identity.js";
import { MarketplaceSourceSchema, type MarketplaceSource } from "../source.js";
import {
  MarketplaceUpdateRecordSchema,
  UpdateApplicationPreferenceSchema,
  createMarketplaceConfigurationRecord,
  type MarketplaceUpdateRecord,
  type UpdateApplicationPreference,
} from "../update-policy.js";
import { defineVersionedSchemaFamily } from "./versioning.js";

/** A logical compare-and-swap value, never a timestamp or filesystem id. */
export const GenerationSchema = z.number().int().nonnegative().safe().brand<"Generation">();
export type Generation = z.infer<typeof GenerationSchema>;

export { UpdateApplicationPreferenceSchema } from "../update-policy.js";
export type { UpdateApplicationPreference } from "../update-policy.js";

/** The v1 record is retained as an explicit migration input and fixture type. */
export const MarketplaceConfigurationRecordSchemaV1 = z.object({
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  updateApplication: UpdateApplicationPreferenceSchema,
}).strict().readonly();
export type MarketplaceConfigurationRecordV1 = z.infer<typeof MarketplaceConfigurationRecordSchemaV1>;

/** Current host records own policy and all scope-local operational memory. */
export const MarketplaceConfigurationRecordSchema = MarketplaceUpdateRecordSchema;
export type MarketplaceConfigurationRecord = MarketplaceUpdateRecord;

function addDuplicateMarketplaceIssues(records: readonly { marketplace: string }[], path: string, context: z.RefinementCtx): void {
  const firstByMarketplace = new Map<string, number>();
  for (const [index, record] of records.entries()) {
    const firstIndex = firstByMarketplace.get(record.marketplace);
    if (firstIndex !== undefined) context.addIssue({ code: "custom", path: [path, index, "marketplace"], message: `duplicate marketplace configuration; first declared at index ${firstIndex}` });
    else firstByMarketplace.set(record.marketplace, index);
  }
}

export const HostConfigDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1), generation: GenerationSchema,
  records: z.array(MarketplaceConfigurationRecordSchemaV1).readonly(),
}).strict().readonly().superRefine((document, context) => addDuplicateMarketplaceIssues(document.records, "records", context));
export type HostConfigDocumentV1 = z.infer<typeof HostConfigDocumentSchemaV1>;

export const HostConfigDocumentSchemaV2 = z.object({
  schemaVersion: z.literal(2), generation: GenerationSchema,
  records: z.array(MarketplaceUpdateRecordSchema).readonly(),
}).strict().readonly().superRefine((document, context) => addDuplicateMarketplaceIssues(document.records, "records", context));
export type HostConfigDocumentV2 = z.infer<typeof HostConfigDocumentSchemaV2>;

function migrateHostV1(input: unknown): HostConfigDocumentV2 {
  const value = HostConfigDocumentSchemaV1.parse(input);
  return HostConfigDocumentSchemaV2.parse({
    schemaVersion: 2,
    generation: value.generation,
    records: value.records.map((record) => createMarketplaceConfigurationRecord({
      marketplace: record.marketplace,
      source: record.source,
      updateApplication: record.source.kind === "local-git" ? "manual" : record.updateApplication,
    })),
  });
}

export const HostConfigSchemaFamily = defineVersionedSchemaFamily({
  latestVersion: 2,
  versions: new Map<number, z.ZodTypeAny>([[1, HostConfigDocumentSchemaV1], [2, HostConfigDocumentSchemaV2]]),
  migrations: new Map([[1, migrateHostV1]]),
});

export const HostConfigDocumentSchema = HostConfigDocumentSchemaV2;
export type HostConfigDocument = HostConfigDocumentV2;

export type { MarketplaceSource, MarketplaceUpdateRecord };
