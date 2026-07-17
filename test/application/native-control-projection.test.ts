import { describe, expect, it } from "vitest";
import { projectNativeControlResponse } from "../../src/application/native-control-projection.js";

describe("native control response projection", () => {
  it("validates owner data before redacting path-bearing machine fields", () => {
    const result = projectNativeControlResponse("marketplace.list", { registrations: [] });
    expect(result).toMatchObject({ status: "ok", data: { registrations: [] } });
    expect(() => projectNativeControlResponse("marketplace.list", { registrations: [], extra: true })).toThrow();
  });
});
