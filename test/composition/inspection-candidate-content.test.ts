import { describe, expect, it, vi } from "vitest";
import { createInspectionCandidateContent } from "../../src/composition/inspection-candidate-content.js";

function fixture() {
  const allocation = { allocationId: "private", slot: { root: "/scratch", id: "opaque" } } as never;
  const discardStaging = vi.fn(async () => {});
  const materialized = { root: "/scratch/content" } as never;
  const materialize = vi.fn(async () => materialized);
  const port = createInspectionCandidateContent({
    content: { allocateStaging: vi.fn(async () => allocation), discardStaging },
    materializer: { materialize },
  } as never);
  const candidate = { entry: { source: { value: { kind: "git", url: "https://example.invalid/plugin.git" } } } } as never;
  return { port, candidate, discardStaging, materialize, materialized };
}

describe("inspection candidate content", () => {
  it("discards staging after success", async () => {
    const value = fixture();
    await expect(value.port.withMaterialized(value.candidate, new AbortController().signal, async (materialized) => {
      expect(materialized).toBe(value.materialized);
      return "ok";
    })).resolves.toBe("ok");
    expect(value.discardStaging).toHaveBeenCalledOnce();
  });

  it("discards staging after callback failure and cancellation", async () => {
    const failed = fixture();
    await expect(failed.port.withMaterialized(failed.candidate, new AbortController().signal, async () => { throw new Error("failed"); })).rejects.toThrow("failed");
    expect(failed.discardStaging).toHaveBeenCalledOnce();

    const aborted = fixture();
    const controller = new AbortController();
    await expect(aborted.port.withMaterialized(aborted.candidate, controller.signal, async () => {
      controller.abort(new DOMException("cancelled", "AbortError"));
      throw controller.signal.reason;
    })).rejects.toThrow();
    expect(aborted.discardStaging).toHaveBeenCalledOnce();
  });
});
