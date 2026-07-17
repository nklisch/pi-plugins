import { describe, expect, it, vi } from "vitest";
import { createCandidateContentLeasePort } from "../../src/composition/candidate-content-lease.js";

const candidate = {
  entry: { source: { value: { kind: "git", url: "https://example.invalid/plugin.git" } } },
} as never;
const allocation = { slot: { root: "/private/staging", contentRoot: "/private/staging/content", workRoot: "/private/staging/.work" }, identity: { kind: "plugin", key: "x" } } as never;
const materialized = { root: "/private/staging/content", source: { kind: "git" }, content: {}, binding: "binding" } as never;

function setup() {
  const discardStaging = vi.fn(async () => undefined);
  const materialize = vi.fn(async () => materialized);
  const port = createCandidateContentLeasePort({
    content: { allocateStaging: vi.fn(async () => allocation), discardStaging },
    materializer: { materialize },
  } as never);
  return { port, discardStaging, materialize };
}

describe("candidate content lease", () => {
  it("transfers one exact materialization at most once", async () => {
    const { port, discardStaging, materialize } = setup();
    const lease = await port.acquire(candidate, new AbortController().signal);
    expect(materialize).toHaveBeenCalledTimes(1);
    const claimed = await lease.claim(new AbortController().signal);
    expect(claimed.materialized).toBe(materialized);
    expect(claimed.allocation).toBe(allocation);
    await expect(lease.claim(new AbortController().signal)).rejects.toThrow("already settled");
    await lease.release();
    expect(discardStaging).not.toHaveBeenCalled();
  });

  it("releases idempotently with a fresh cleanup signal", async () => {
    const { port, discardStaging } = setup();
    const controller = new AbortController();
    const lease = await port.acquire(candidate, controller.signal);
    controller.abort();
    await lease.release();
    await lease.release();
    expect(discardStaging).toHaveBeenCalledTimes(1);
    expect(discardStaging.mock.calls[0]![1].aborted).toBe(false);
  });

  it("cleans acquisition failure without creating a lease", async () => {
    const discardStaging = vi.fn(async () => undefined);
    const port = createCandidateContentLeasePort({
      content: { allocateStaging: vi.fn(async () => allocation), discardStaging },
      materializer: { materialize: vi.fn(async () => { throw new Error("offline"); }) },
    } as never);
    await expect(port.acquire(candidate, new AbortController().signal)).rejects.toThrow("offline");
    expect(discardStaging).toHaveBeenCalledTimes(1);
  });
});
