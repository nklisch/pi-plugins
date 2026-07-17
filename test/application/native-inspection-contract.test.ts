import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  NativeInspectionDetailResultSchema,
  NativeInspectionListRequestSchema,
  NativeInspectionPageSchema,
  SafeDisplayFieldSchema,
  type NativeInspectionPage,
} from "../../src/application/native-inspection-contract.js";

describe("native inspection contracts", () => {
  it("applies bounded defaults and rejects unknown fields", () => {
    expect(NativeInspectionListRequestSchema.parse({})).toEqual({
      subjects: ["installed", "marketplace-candidate"],
      scope: "all-current",
      query: "",
      limit: 50,
    });
    expect(() => NativeInspectionListRequestSchema.parse({ extra: true })).toThrow();
    expect(() => NativeInspectionListRequestSchema.parse({ subjects: [] })).toThrow();
    expect(() => NativeInspectionListRequestSchema.parse({ limit: 101 })).toThrow();
    expect(() => SafeDisplayFieldSchema.parse({ text: "x".repeat(8193), escaped: false, truncated: false })).toThrow();
  });

  it("keeps result variants strict and impossible combinations out", () => {
    expect(NativeInspectionDetailResultSchema.parse({ kind: "stale", action: "retry-read" })).toEqual({ kind: "stale", action: "retry-read" });
    expect(() => NativeInspectionDetailResultSchema.parse({ kind: "stale", action: "refresh-marketplace" })).toThrow();
    expect(() => NativeInspectionDetailResultSchema.parse({ kind: "invalid-id", detail: {} })).toThrow();
    expect(() => NativeInspectionPageSchema.parse({ snapshotId: "bad", condition: "ready", items: [], observations: [] })).toThrow();
  });

  it("infers the public page type from its schema", () => {
    expectTypeOf<NativeInspectionPage>().toEqualTypeOf<z.infer<typeof NativeInspectionPageSchema>>();
  });
});
