import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  GenerationSchema,
  HostConfigDocumentSchemaV1,
  HostConfigSchemaFamily,
  MarketplaceConfigurationRecordSchema,
  UpdateApplicationPreferenceSchema,
  type HostConfigDocumentV1,
} from "../../../src/domain/state/config-state.js";
import { migrateVersionedDocument } from "../../../src/domain/state/versioning.js";
import { MarketplaceNameSchema } from "../../../src/domain/identity.js";
import { MarketplaceSourceSchema } from "../../../src/domain/source.js";

const marketplace = MarketplaceNameSchema.parse("team");
const remoteSource = MarketplaceSourceSchema.parse({
  kind: "github",
  repository: "example/plugins",
});

function document(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    generation: 0,
    records: [{
      marketplace,
      source: remoteSource,
      updateApplication: "manual",
    }],
    ...overrides,
  };
}

describe("host marketplace configuration state", () => {
  it("accepts declarations and preserves update preference without implementing it", () => {
    const parsed = HostConfigDocumentSchemaV1.parse(document({
      generation: 3,
      records: [{
        marketplace,
        source: { kind: "local-git", path: "../local-marketplace" },
        updateApplication: "automatic",
      }],
    }));

    expect(parsed.generation).toBe(3);
    expect(parsed.records[0]?.updateApplication).toBe("automatic");
    expect(UpdateApplicationPreferenceSchema.parse("manual")).toBe("manual");
    expect(GenerationSchema.parse(0)).toBe(0);
  });

  it("rejects duplicate marketplaces and unknown fields at the schema boundary", () => {
    expect(HostConfigDocumentSchemaV1.safeParse(document({
      records: [document().records[0], document().records[0]],
    })).success).toBe(false);
    expect(HostConfigDocumentSchemaV1.safeParse({
      ...document(),
      records: [{
        ...document().records[0],
        trust: true,
      }],
    }).success).toBe(false);
    expect(HostConfigDocumentSchemaV1.safeParse({
      ...document(),
      records: [{
        ...document().records[0],
        source: { kind: "git", url: "https://user:password@example.com/plugins.git" },
      }],
    }).success).toBe(false);
  });

  it("has an independent v1 family with no implicit legacy migration", () => {
    expect(HostConfigSchemaFamily.latestVersion).toBe(1);
    expect(migrateVersionedDocument(HostConfigSchemaFamily, document())).toEqual(
      HostConfigDocumentSchemaV1.parse(document()),
    );
    expect(() => migrateVersionedDocument(HostConfigSchemaFamily, {
      ...document(),
      schemaVersion: 2,
    })).toThrow(/newer/);
  });

  it("derives its public document type from the strict schema", () => {
    expectTypeOf<z.infer<typeof HostConfigDocumentSchemaV1>>().toEqualTypeOf<HostConfigDocumentV1>();
    expectTypeOf<z.infer<typeof MarketplaceConfigurationRecordSchema>>().toEqualTypeOf<
      import("../../../src/domain/state/config-state.js").MarketplaceConfigurationRecord
    >();
  });
});
