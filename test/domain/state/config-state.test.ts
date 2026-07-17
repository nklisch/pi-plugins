import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  GenerationSchema,
  HostConfigDocumentSchemaV1,
  HostConfigDocumentSchemaV4,
  HostConfigSchemaFamily,
  MarketplaceConfigurationRecordSchema,
  UpdateApplicationPreferenceSchema,
  type HostConfigDocumentV1,
} from "../../../src/domain/state/config-state.js";
import { migrateVersionedDocument } from "../../../src/domain/state/versioning.js";
import { MarketplaceNameSchema } from "../../../src/domain/identity.js";
import { MarketplaceSourceSchema } from "../../../src/domain/source.js";

const marketplace = MarketplaceNameSchema.parse("team");
const remoteSource = MarketplaceSourceSchema.parse({ kind: "github", repository: "example/plugins" });

function document(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    generation: 0,
    records: [{ marketplace, source: remoteSource, updateApplication: "manual" }],
    ...overrides,
  };
}

describe("host marketplace configuration state", () => {
  it("retains strict legacy inputs while making v4 current", () => {
    const parsed = HostConfigDocumentSchemaV1.parse(document({ generation: 3 }));
    expect(parsed.generation).toBe(3);
    expect(UpdateApplicationPreferenceSchema.parse("manual")).toBe("manual");
    expect(GenerationSchema.parse(0)).toBe(0);
    expect(HostConfigSchemaFamily.latestVersion).toBe(4);
  });

  it("rejects duplicate marketplaces, unknown fields, and malformed lease windows", () => {
    expect(HostConfigDocumentSchemaV1.safeParse(document({ records: [document().records[0], document().records[0]] })).success).toBe(false);
    expect(HostConfigDocumentSchemaV4.safeParse({
      schemaVersion: 4,
      generation: 0,
      global: { application: "manual", cadence: "balanced" },
      scope: { schedulerLease: { id: `update-scheduler-lease-v1:uuid:123e4567-e89b-42d3-a456-426614174000`, startedAt: 10, renewedAt: 9, expiresAt: 20 } },
      records: [],
    }).success).toBe(false);
  });

  it("migrates v1-v3 deterministically into global-manual v4", () => {
    const migrated = migrateVersionedDocument(HostConfigSchemaFamily, document());
    expect(migrated).toMatchObject({ schemaVersion: 4, global: { application: "manual", cadence: "balanced" }, scope: {} });
    expect(migrated.records[0]?.applicationOverride).toBeUndefined();
    expect(migrated.records[0]?.refresh).toEqual({ consecutiveFailures: 0 });

    const automatic = migrateVersionedDocument(HostConfigSchemaFamily, document({
      records: [{ marketplace, source: remoteSource, updateApplication: "automatic" }],
    }));
    expect(automatic.records[0]?.applicationOverride).toBe("automatic");
    expect(() => migrateVersionedDocument(HostConfigSchemaFamily, { ...document(), schemaVersion: 5 })).toThrow(/newer/);
  });

  it("derives public document types from strict schemas", () => {
    expectTypeOf<z.infer<typeof HostConfigDocumentSchemaV1>>().toEqualTypeOf<HostConfigDocumentV1>();
    expectTypeOf<z.infer<typeof MarketplaceConfigurationRecordSchema>>().toEqualTypeOf<
      import("../../../src/domain/state/config-state.js").MarketplaceConfigurationRecord
    >();
  });
});
