import { z } from "zod";
import { MarketplaceNameSchema } from "../identity.js";
import { MarketplaceSourceSchema } from "../source.js";
import { defineVersionedSchemaFamily } from "./versioning.js";

/**
 * A generation is a logical compare-and-swap value, not a timestamp or a
 * filesystem identifier. State adapters own how it is incremented and stored.
 */
export const GenerationSchema = z
  .number()
  .int()
  .nonnegative()
  .safe()
  .brand<"Generation">();
export type Generation = z.infer<typeof GenerationSchema>;

/**
 * This preference records how a later update policy may apply a discovered
 * update. It deliberately does not grant update authority or implement the
 * update operation itself.
 */
export const UpdateApplicationPreferenceSchema = z.enum(["manual", "automatic"]);
export type UpdateApplicationPreference = z.infer<
  typeof UpdateApplicationPreferenceSchema
>;

export const MarketplaceConfigurationRecordSchema = z
  .object({
    marketplace: MarketplaceNameSchema,
    source: MarketplaceSourceSchema,
    updateApplication: UpdateApplicationPreferenceSchema,
  })
  .strict()
  .readonly();
export type MarketplaceConfigurationRecord = z.infer<
  typeof MarketplaceConfigurationRecordSchema
>;

function addDuplicateMarketplaceIssues(
  records: readonly MarketplaceConfigurationRecord[],
  context: z.RefinementCtx,
): void {
  const firstByMarketplace = new Map<string, number>();
  for (const [index, record] of records.entries()) {
    const firstIndex = firstByMarketplace.get(record.marketplace);
    if (firstIndex !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["records", index, "marketplace"],
        message: `duplicate marketplace configuration; first declared at index ${firstIndex}`,
      });
    } else {
      firstByMarketplace.set(record.marketplace, index);
    }
  }
}

/** The independently versioned user host configuration envelope. */
export const HostConfigDocumentSchemaV1 = z
  .object({
    schemaVersion: z.literal(1),
    generation: GenerationSchema,
    records: z.array(MarketplaceConfigurationRecordSchema).readonly(),
  })
  .strict()
  .readonly()
  .superRefine((document, context) => {
    addDuplicateMarketplaceIssues(document.records, context);
  });
export type HostConfigDocumentV1 = z.infer<typeof HostConfigDocumentSchemaV1>;

/**
 * Keep the family next to its schema so the state registry can route both
 * validation and migration from one declaration. Version 1 intentionally has
 * no fabricated legacy migration.
 */
export const HostConfigSchemaFamily = defineVersionedSchemaFamily({
  latestVersion: 1,
  versions: new Map([[1, HostConfigDocumentSchemaV1]]),
  migrations: new Map(),
});

/** Convenient singular alias for callers that do not need the version suffix. */
export const HostConfigDocumentSchema = HostConfigDocumentSchemaV1;
export type HostConfigDocument = HostConfigDocumentV1;
