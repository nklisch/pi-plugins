import { describe, expect, it, vi } from "vitest";
import { createCandidateContentLeasePort } from "../../src/composition/candidate-content-lease.js";

describe("trusted installation offline candidate handoff", () => {
  it("uses the acquired materialization after source access disappears", async () => {
    let online = true;
    const materialize = vi.fn(async () => {
      if (!online) throw new Error("network offline");
      return { root: "/staging/content", source: { kind: "git" }, content: {}, binding: "exact" } as never;
    });
    const discard = vi.fn(async () => undefined);
    const allocation = { slot: { root: "/staging" }, allocationId: "one" } as never;
    const port = createCandidateContentLeasePort({ content: { allocateStaging: async () => allocation, discardStaging: discard }, materializer: { materialize } } as never);
    const lease = await port.acquire({ entry: { source: { value: { kind: "git", url: "https://example.invalid/plugin.git" } } } } as never, new AbortController().signal);
    online = false;
    const claimed = await lease.claim(new AbortController().signal);
    expect(claimed.materialized.binding).toBe("exact");
    expect(materialize).toHaveBeenCalledTimes(1);
    expect(discard).not.toHaveBeenCalled();
  });
});
