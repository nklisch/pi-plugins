import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createInactiveProjectionExpectation } from "../../src/application/ports/runtime-projection.js";
import { projectionMatchesObservation } from "../../src/application/recovery-contract.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());

describe("lifecycle transition reconciliation evidence", () => {
  it("requires exact scope and plugin evidence instead of treating reload acceptance as proof", () => {
    const expectation = createInactiveProjectionExpectation({ scope: { kind: "user" }, plugin: "demo@community" as never, sha256 });
    expect(projectionMatchesObservation({ kind: "inactive", scope: { kind: "user" }, plugin: "demo@community" as never }, expectation, "demo@community" as never)).toBe(true);
    expect(projectionMatchesObservation({ kind: "inactive", scope: { kind: "user" }, plugin: "other@community" as never }, expectation, "demo@community" as never)).toBe(false);
  });
});
