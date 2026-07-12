import { describe, expect, it } from "vitest";
import {
  StateMutationSchema,
  parseStateMutation,
} from "../../src/application/state-contract.js";
import { HostConfigDocumentSchemaV1 } from "../../src/domain/state/config-state.js";
import { MarketplaceNameSchema } from "../../src/domain/identity.js";
import { MarketplaceSourceSchema } from "../../src/domain/source.js";

const source = MarketplaceSourceSchema.parse({ kind: "github", repository: "example/plugins" });
const config = HostConfigDocumentSchemaV1.parse({
  schemaVersion: 1,
  generation: 2,
  records: [{
    marketplace: MarketplaceNameSchema.parse("team"),
    source,
    updateApplication: "manual",
  }],
});
const sha256 = () => new Uint8Array(32);

describe("lifecycle state application contracts", () => {
  it("requires a non-empty expected-generation replacement", () => {
    expect(StateMutationSchema.safeParse({
      scope: { kind: "user" },
      expectedGeneration: 2,
      replace: {},
    }).success).toBe(false);
    expect(StateMutationSchema.safeParse({
      scope: { kind: "user" },
      expectedGeneration: 2,
      replace: { config, nextGeneration: 3 },
    }).success).toBe(false);
    expect(StateMutationSchema.safeParse({
      scope: { kind: "user" },
      expectedGeneration: 1,
      replace: { config },
    }).success).toBe(false);
  });

  it("returns a validated replacement and keeps adapter concerns outside the contract", () => {
    const mutation = parseStateMutation({
      scope: { kind: "user" },
      expectedGeneration: 2,
      replace: { config },
    }, sha256);
    expect(mutation.expectedGeneration).toBe(2);
    expect(mutation.replace).toHaveProperty("config");
    expect(mutation).not.toHaveProperty("transaction");
    expect(mutation).not.toHaveProperty("path");
    expect(mutation).not.toHaveProperty("lock");
  });
});
