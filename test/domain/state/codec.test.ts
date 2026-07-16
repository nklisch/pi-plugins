import { describe, expect, it } from "vitest";
import {
  StateCodecError,
  decodeStateDocument,
  encodeStateDocument,
  hashStateDocument,
} from "../../../src/domain/state/codec.js";
import { ContentDigestSchema } from "../../../src/domain/content-manifest.js";
import { GenerationSchema, HostConfigDocumentSchemaV1 } from "../../../src/domain/state/config-state.js";
import { MarketplaceNameSchema } from "../../../src/domain/identity.js";
import { MarketplaceSourceSchema } from "../../../src/domain/source.js";

const sha256 = () => new Uint8Array(32);
const marketplace = MarketplaceNameSchema.parse("team");
const source = MarketplaceSourceSchema.parse({ kind: "github", repository: "example/plugins" });
const context = {
  scope: { kind: "user" as const },
  generation: GenerationSchema.parse(0),
  sha256,
};
const valid = HostConfigDocumentSchemaV1.parse({
  schemaVersion: 1,
  generation: 0,
  records: [{ marketplace, source, updateApplication: "manual" }],
});

function encodedWith(records: unknown[]) {
  return { schemaVersion: 1, generation: 0, records };
}

describe("state codecs", () => {
  it("isolates corrupt and duplicate records while retaining valid siblings", () => {
    const decoded = decodeStateDocument("hostConfig", encodedWith([
      valid.records[0],
      { marketplace: "other", source, updateApplication: "automatic", unexpected: true },
      valid.records[0],
    ]), context);

    expect(decoded.value.records).toHaveLength(0);
    expect(decoded.corruptions.map((entry) => entry.code)).toEqual([
      "RECORD_DUPLICATE",
      "RECORD_INVALID",
      "RECORD_DUPLICATE",
    ]);
    expect(decoded.corruptions[0]).not.toHaveProperty("value");
    expect(decoded.corruptions[0]?.summary).not.toContain("unexpected");
  });

  it("keeps valid siblings when one record is malformed", () => {
    const decoded = decodeStateDocument("hostConfig", encodedWith([
      valid.records[0],
      { marketplace: "other", source, updateApplication: "not-a-preference" },
    ]), context);
    expect(decoded.value.records.map((record) => record.marketplace)).toEqual([marketplace]);
    expect(decoded.corruptions).toHaveLength(1);
  });

  it("fails closed for version, generation, and digest corruption", () => {
    expect(() => decodeStateDocument("hostConfig", { ...encodedWith([]), schemaVersion: 3 }, context))
      .toThrowError(StateCodecError);
    expect(() => decodeStateDocument("hostConfig", { ...encodedWith([]), generation: 1 }, context))
      .toThrowError(StateCodecError);

    const encoded = encodeStateDocument("hostConfig", valid, context);
    const digest = hashStateDocument(encoded, sha256);
    expect(decodeStateDocument("hostConfig", encoded, { ...context, expectedDigest: digest }).value).toMatchObject({
      schemaVersion: 2,
      generation: valid.generation,
      records: [{ marketplace, updateApplication: "manual" }],
    });
    expect(() => decodeStateDocument("hostConfig", encoded, {
      ...context,
      expectedDigest: ContentDigestSchema.parse(`sha256:${"ff".repeat(32)}`),
    })).toThrowError(StateCodecError);
  });

  it("writes current-valid documents in deterministic keyed order", () => {
    const other = HostConfigDocumentSchemaV1.parse({
      schemaVersion: 1,
      generation: 0,
      records: [{ marketplace: MarketplaceNameSchema.parse("alpha"), source, updateApplication: "automatic" }],
    }).records[0]!;
    const left = encodeStateDocument("hostConfig", { ...valid, records: [valid.records[0]!, other] }, context);
    const right = encodeStateDocument("hostConfig", { ...valid, records: [other, valid.records[0]!] }, context);
    expect(left).toEqual(right);
    expect(JSON.stringify(left)).toContain("alpha");
    expect(JSON.stringify(left).indexOf("alpha")).toBeLessThan(JSON.stringify(left).indexOf("team"));
  });
});
