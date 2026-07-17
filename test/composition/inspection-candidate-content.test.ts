import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createInspectionCandidateContent } from "../../src/composition/inspection-candidate-content.js";
import { createContentStoreLayout } from "../../src/infrastructure/filesystem/content-store-layout.js";
import { createStagingAllocator } from "../../src/infrastructure/filesystem/staging-allocator.js";

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

  it("uses the production private staging layout and removes executable candidate bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-inspection-candidate-"));
    try {
      const layout = await createContentStoreLayout(join(root, "host"));
      const allocator = createStagingAllocator(layout, {
        randomBytes: () => Uint8Array.from({ length: 16 }, (_, index) => index + 1),
      });
      let materializedRoot = "";
      const port = createInspectionCandidateContent({
        content: allocator,
        materializer: {
          async materialize(_source, _context, slot) {
            materializedRoot = join(slot.root, "content");
            await mkdir(materializedRoot);
            await writeFile(join(materializedRoot, "plugin.js"), "export default () => 'not executed';");
            return { root: materializedRoot } as never;
          },
        },
      });
      await expect(port.withMaterialized(
        { entry: { source: { value: { kind: "git", url: "https://example.invalid/plugin.git" } } } } as never,
        new AbortController().signal,
        async (materialized) => {
          expect(materialized.root).toBe(materializedRoot);
          expect(materialized.root.startsWith(layout.stagingRoot)).toBe(true);
          expect(materialized.root).not.toContain(layout.pluginStoreRoot);
          expect(await readFile(join(materialized.root, "plugin.js"), "utf8")).toContain("not executed");
          return "inspected";
        },
      )).resolves.toBe("inspected");
      await expect(stat(materializedRoot)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
