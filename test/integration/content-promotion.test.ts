import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createContentManifest, createMaterializationBinding, hashContent } from "../../src/domain/content-manifest.js";
import { createResolvedPluginSource } from "../../src/domain/source.js";
import { createPromotionPlan } from "../../src/application/content-promotion.js";
import { createNodeContentStore, createNodeContentStoreWithPlatform } from "../../src/infrastructure/filesystem/create-content-store.js";
import { createNodeContentStorePlatform, renameNoReplaceByProbe } from "../../src/infrastructure/filesystem/content-store-durability.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;

describe("content store composition", () => {
  it("keeps the public Node factory honest when no atomic primitive is installed", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-content-public-"));
    try {
      const store = await createNodeContentStore({ hostRoot: join(root, "host") });
      await expect(store.capabilities(signal)).rejects.toMatchObject({ code: "DURABILITY_UNAVAILABLE" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("promotes a caller-owned materializer handoff through the composed port", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-content-composed-"));
    let publishedRoot: string | undefined;
    try {
      const store = await createNodeContentStoreWithPlatform({
        hostRoot: join(root, "host"),
        platform: createNodeContentStorePlatform({ renameNoReplace: renameNoReplaceByProbe }),
        randomBytes: () => Uint8Array.from({ length: 16 }, (_, index) => index + 3),
      });
      const allocation = await store.allocateStaging(signal);
      await mkdir(join(allocation.slot.root, "content"));
      await writeFile(join(allocation.slot.root, "content", "README.md"), "hello");
      const bytes = new TextEncoder().encode("hello");
      const manifest = createContentManifest([{ kind: "file", path: "README.md", mode: 0o644, size: bytes.byteLength, digest: hashContent(bytes, sha256) }], sha256);
      const source = createResolvedPluginSource({ kind: "git", url: "https://example.com/composed.git", revision: "c".repeat(40) }, sha256);
      const plan = createPromotionPlan({
        kind: "plugin",
        allocation,
        materialized: { root: join(allocation.slot.root, "content"), source, content: manifest, binding: createMaterializationBinding(source.hash, manifest.rootDigest, sha256) },
      }, sha256);
      const result = await store.promote(plan, signal);
      publishedRoot = result.root.replace(/[/\\]content$/, "");
      expect(result.kind).toBe("promoted");
      expect(await readFile(join(result.root, "README.md"), "utf8")).toBe("hello");
      expect(Object.keys(store).sort()).toEqual([
        "allocateProjectionRoot",
        "allocateStaging",
        "capabilities",
        "discardProjectionRoot",
        "discardStaging",
        "ensureDataRoot",
        "promote",
        "resolveMarketplace",
        "resolvePlugin",
        "resolveProjectionRoot",
        "sealProjectionRoot",
      ]);
    } finally {
      if (publishedRoot !== undefined) {
        await chmod(join(publishedRoot, "content", "README.md"), 0o644).catch(() => undefined);
        await chmod(join(publishedRoot, "content"), 0o755).catch(() => undefined);
        await chmod(join(publishedRoot, "metadata.json"), 0o644).catch(() => undefined);
        await chmod(join(publishedRoot, "READY"), 0o644).catch(() => undefined);
        await chmod(publishedRoot, 0o755).catch(() => undefined);
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});
