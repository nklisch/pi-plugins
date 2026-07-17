import { z } from "zod";
import { MarketplaceNameSchema } from "../identity.js";
import {
  MarketplaceSourceSchema,
  serializeMarketplaceSource,
  type MarketplaceSource,
} from "../source.js";
import {
  MarketplaceRegistrationRecordSchema,
  MarketplaceRegistrationRecordSchemaV3,
  MarketplaceUpdateRecordSchemaV2,
  UpdateApplicationModeSchema,
  UpdateApplicationPreferenceSchema,
  UpdateCadenceSchema,
  UpdateSchedulerLeaseSchema,
  migrateMarketplaceRegistrationRecordV3,
  type MarketplaceRegistrationRecord,
  type MarketplaceRegistrationRecordV3,
  type MarketplaceUpdateRecord,
  type UpdateApplicationPreference,
} from "../update-policy.js";
import { defineVersionedSchemaFamily } from "./versioning.js";

/** A logical compare-and-swap value, never a timestamp or filesystem id. */
export const GenerationSchema = z.number().int().nonnegative().safe().brand<"Generation">();
export type Generation = z.infer<typeof GenerationSchema>;

export { UpdateApplicationPreferenceSchema } from "../update-policy.js";
export type { UpdateApplicationPreference } from "../update-policy.js";

export const MarketplaceConfigurationRecordSchemaV1 = z.object({
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  updateApplication: UpdateApplicationPreferenceSchema,
}).strict().readonly();
export type MarketplaceConfigurationRecordV1 = z.infer<typeof MarketplaceConfigurationRecordSchemaV1>;

/** Current records are v4 policy/lease/notice authorities. */
export const MarketplaceConfigurationRecordSchema = MarketplaceRegistrationRecordSchema;
export type MarketplaceConfigurationRecord = MarketplaceRegistrationRecord;

function addDuplicateMarketplaceIssues(
  records: readonly { marketplace: string; source?: MarketplaceSource }[],
  path: string,
  context: z.RefinementCtx,
): void {
  const firstByMarketplace = new Map<string, number>();
  const firstBySource = new Map<string, number>();
  for (const [index, record] of records.entries()) {
    const firstIndex = firstByMarketplace.get(record.marketplace);
    if (firstIndex !== undefined) context.addIssue({ code: "custom", path: [path, index, "marketplace"], message: `duplicate marketplace configuration; first declared at index ${firstIndex}` });
    else firstByMarketplace.set(record.marketplace, index);
    if (record.source !== undefined) {
      const parsed = MarketplaceSourceSchema.safeParse(record.source);
      if (parsed.success) {
        const source = serializeMarketplaceSource(parsed.data);
        const sourceIndex = firstBySource.get(source);
        if (sourceIndex !== undefined) context.addIssue({ code: "custom", path: [path, index, "source"], message: `duplicate marketplace source; first declared at index ${sourceIndex}` });
        else firstBySource.set(source, index);
      }
    }
  }
}

export const HostConfigDocumentSchemaV1 = z.object({
  schemaVersion: z.literal(1), generation: GenerationSchema,
  records: z.array(MarketplaceConfigurationRecordSchemaV1).readonly(),
}).strict().readonly().superRefine((document, context) => addDuplicateMarketplaceIssues(document.records, "records", context));
export type HostConfigDocumentV1 = z.infer<typeof HostConfigDocumentSchemaV1>;

export const HostConfigDocumentSchemaV2 = z.object({
  schemaVersion: z.literal(2), generation: GenerationSchema,
  records: z.array(MarketplaceUpdateRecordSchemaV2).readonly(),
}).strict().readonly().superRefine((document, context) => addDuplicateMarketplaceIssues(document.records, "records", context));
export type HostConfigDocumentV2 = z.infer<typeof HostConfigDocumentSchemaV2>;

export const HostConfigDocumentSchemaV3 = z.object({
  schemaVersion: z.literal(3), generation: GenerationSchema,
  records: z.array(MarketplaceRegistrationRecordSchemaV3).readonly(),
}).strict().readonly().superRefine((document, context) => addDuplicateMarketplaceIssues(document.records, "records", context));
export type HostConfigDocumentV3 = z.infer<typeof HostConfigDocumentSchemaV3>;

export const HostUpdateGlobalPolicySchema = z.object({
  application: UpdateApplicationModeSchema,
  cadence: UpdateCadenceSchema,
}).strict().readonly();
export type HostUpdateGlobalPolicy = z.infer<typeof HostUpdateGlobalPolicySchema>;

export const HostUpdateScopePolicySchema = z.object({
  application: UpdateApplicationModeSchema.optional(),
  schedulerLease: UpdateSchedulerLeaseSchema.optional(),
}).strict().readonly();
export type HostUpdateScopePolicy = z.infer<typeof HostUpdateScopePolicySchema>;

export const HostConfigDocumentSchemaV4 = z.object({
  schemaVersion: z.literal(4),
  generation: GenerationSchema,
  global: HostUpdateGlobalPolicySchema.default({ application: "manual", cadence: "balanced" }),
  scope: HostUpdateScopePolicySchema.default({}),
  records: z.array(MarketplaceRegistrationRecordSchema).readonly(),
}).strict().readonly().superRefine((document, context) => addDuplicateMarketplaceIssues(document.records, "records", context));
export type HostConfigDocumentV4 = z.infer<typeof HostConfigDocumentSchemaV4>;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function projectHostConfigV1ToV2(input: Readonly<{ records: readonly unknown[] }>): Readonly<Record<string, unknown> & { schemaVersion: 2; records: readonly unknown[] }> {
  return {
    ...input,
    schemaVersion: 2,
    records: input.records.map((record) => isObjectRecord(record)
      ? { ...record, refresh: { nextScheduledAt: 0, consecutiveFailures: 0 }, notifications: [] }
      : record),
  };
}

function migrateHostV1(input: unknown): HostConfigDocumentV2 {
  const value = HostConfigDocumentSchemaV1.parse(input);
  const normalized = {
    ...value,
    records: value.records.map((record) => ({ ...record, updateApplication: record.source.kind === "local-git" ? "manual" : record.updateApplication })),
  };
  return HostConfigDocumentSchemaV2.parse(projectHostConfigV1ToV2(normalized));
}

export function projectHostConfigV2ToV3(input: HostConfigDocumentV2): HostConfigDocumentV3 {
  const value = HostConfigDocumentSchemaV2.parse(input);
  return HostConfigDocumentSchemaV3.parse({
    ...value,
    schemaVersion: 3,
    records: value.records.map((record) => ({ ...record, origin: { kind: "legacy" as const } })),
  });
}

function migrateHostV2(input: unknown): HostConfigDocumentV3 {
  return projectHostConfigV2ToV3(HostConfigDocumentSchemaV2.parse(input));
}

export function projectHostConfigV3ToV4(input: HostConfigDocumentV3): HostConfigDocumentV4 {
  const value = HostConfigDocumentSchemaV3.parse(input);
  return HostConfigDocumentSchemaV4.parse({
    schemaVersion: 4,
    generation: value.generation,
    global: { application: "manual", cadence: "balanced" },
    scope: {},
    records: value.records.map((record: MarketplaceRegistrationRecordV3) => migrateMarketplaceRegistrationRecordV3(record)),
  });
}

function migrateHostV3(input: unknown): HostConfigDocumentV4 {
  return projectHostConfigV3ToV4(HostConfigDocumentSchemaV3.parse(input));
}

export const HostConfigSchemaFamily = defineVersionedSchemaFamily({
  latestVersion: 4,
  versions: new Map<number, z.ZodTypeAny>([
    [1, HostConfigDocumentSchemaV1],
    [2, HostConfigDocumentSchemaV2],
    [3, HostConfigDocumentSchemaV3],
    [4, HostConfigDocumentSchemaV4],
  ]),
  migrations: new Map<number, (input: unknown) => unknown>([[1, migrateHostV1], [2, migrateHostV2], [3, migrateHostV3]]),
});

export const HostConfigDocumentSchema = HostConfigDocumentSchemaV4;
export type HostConfigDocument = HostConfigDocumentV4;

export type { MarketplaceSource, MarketplaceUpdateRecord };
