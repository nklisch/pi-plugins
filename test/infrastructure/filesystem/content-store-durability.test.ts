import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createNodeContentStorePlatform } from "../../../src/infrastructure/filesystem/content-store-durability.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
void sha256;

describe("content-store durability capability", () => {
  it("does not claim no-replace publication without a platform primitive", async () => {
    const platform = createNodeContentStorePlatform();
    await expect(platform.probe("/tmp")).rejects.toMatchObject({ code: "DURABILITY_UNAVAILABLE" });
  });
});
