import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  StateSchemaVersionSchema,
  defineVersionedSchemaFamily,
  migrateVersionedDocument,
  type VersionedSchemaFamily,
} from "../../../src/domain/state/versioning.js";

describe("versioned state schema families", () => {
  const v1 = z.object({
    schemaVersion: z.literal(1),
    name: z.string().min(1),
  }).strict();
  const v2 = z.object({
    schemaVersion: z.literal(2),
    displayName: z.string().min(1),
    enabled: z.boolean(),
  }).strict();

  function family(): VersionedSchemaFamily<{ readonly schemaVersion: 2; readonly displayName: string; readonly enabled: boolean }> {
    return defineVersionedSchemaFamily({
      latestVersion: 2,
      versions: new Map<number, z.ZodTypeAny>([[1, v1], [2, v2]]),
      migrations: new Map([
        [1, (input: unknown) => {
          const value = input as { readonly name: string };
          return {
            schemaVersion: 2,
            displayName: value.name,
            enabled: true,
          };
        }],
      ]),
    });
  }

  it("accepts only positive safe integer schema versions", () => {
    for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "1", undefined]) {
      expect(StateSchemaVersionSchema.safeParse(value).success).toBe(false);
    }
    expect(StateSchemaVersionSchema.parse(1)).toBe(1);
  });

  it("migrates adjacent versions in order and validates the final schema", () => {
    const input = { schemaVersion: 1 as const, name: "plugin" };
    const result = migrateVersionedDocument(family(), input);

    expect(result).toEqual({ schemaVersion: 2, displayName: "plugin", enabled: true });
    expect(input).toEqual({ schemaVersion: 1, name: "plugin" });
    expect(migrateVersionedDocument(family(), input)).toEqual(result);
  });

  it("deep-clones frozen input before a mutating migration", () => {
    const schema = z.object({
      schemaVersion: z.literal(1),
      nested: z.object({ value: z.string() }).strict(),
    }).strict();
    const latest = z.object({
      schemaVersion: z.literal(2),
      nested: z.object({ value: z.string() }).strict(),
    }).strict();
    const migrationFamily = defineVersionedSchemaFamily({
      latestVersion: 2,
      versions: new Map<number, z.ZodTypeAny>([[1, schema], [2, latest]]),
      migrations: new Map([[1, (value: unknown) => {
        const document = value as { schemaVersion: number; nested: { value: string } };
        document.nested.value = document.nested.value.toUpperCase();
        document.schemaVersion = 2;
        return document;
      }]]),
    });
    const input = Object.freeze({
      schemaVersion: 1 as const,
      nested: Object.freeze({ value: "unchanged" }),
    });

    expect(migrateVersionedDocument(migrationFamily, input)).toEqual({
      schemaVersion: 2,
      nested: { value: "UNCHANGED" },
    });
    expect(input).toEqual({ schemaVersion: 1, nested: { value: "unchanged" } });
  });

  it("validates every migration hop rather than trusting the final result", () => {
    const invalidFamily = defineVersionedSchemaFamily({
      latestVersion: 2,
      versions: new Map<number, z.ZodTypeAny>([[1, v1], [2, v2]]),
      migrations: new Map([[1, () => ({ schemaVersion: 2, displayName: "missing enabled" })]]),
    });

    expect(() => migrateVersionedDocument(invalidFamily, { schemaVersion: 1, name: "x" })).toThrow();
  });

  it("rejects gaps, non-adjacent edges, future versions, and malformed documents", () => {
    expect(() => defineVersionedSchemaFamily({
      latestVersion: 3,
      versions: new Map<number, z.ZodTypeAny>([[1, v1], [3, v2]]),
      migrations: new Map([[1, () => ({ schemaVersion: 2 })], [2, () => ({ schemaVersion: 3 })]]),
    })).toThrow(/gap/);

    expect(() => defineVersionedSchemaFamily({
      latestVersion: 2,
      versions: new Map<number, z.ZodTypeAny>([[1, v1], [2, v2]]),
      migrations: new Map([[2, () => ({ schemaVersion: 3 })]]),
    })).toThrow(/adjacent target/);

    expect(() => defineVersionedSchemaFamily({
      latestVersion: 2,
      versions: new Map<number, z.ZodTypeAny>([[1, v1], [2, v2]]),
      migrations: new Map(),
    })).toThrow(/missing adjacent/);

    expect(() => migrateVersionedDocument(family(), { schemaVersion: 3, name: "future" })).toThrow(/newer/);
    expect(() => migrateVersionedDocument(family(), { name: "missing version" })).toThrow(/schemaVersion/);
    expect(() => migrateVersionedDocument(family(), { schemaVersion: 1, name: "" })).toThrow();
  });

  it("does not infer an implicit v0 migration for a v1-only family", () => {
    const v1Only = defineVersionedSchemaFamily({
      latestVersion: 1,
      versions: new Map([[1, v1]]),
      migrations: new Map(),
    });
    expect(migrateVersionedDocument(v1Only, { schemaVersion: 1, name: "current" })).toEqual({
      schemaVersion: 1,
      name: "current",
    });
    expect(() => migrateVersionedDocument(v1Only, { schemaVersion: 0, name: "old" })).toThrow();
  });
});
