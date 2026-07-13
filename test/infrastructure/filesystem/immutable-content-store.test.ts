import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createContentManifest,
  createMaterializationBinding,
  hashContent,
} from "../../../src/domain/content-manifest.js";
import { createResolvedPluginSource } from "../../../src/domain/source.js";
import { createPromotionPlan } from "../../../src/application/content-promotion.js";
import { createContentStoreLayout } from "../../../src/infrastructure/filesystem/content-store-layout.js";
import { createStagingAllocator } from "../../../src/infrastructure/filesystem/staging-allocator.js";
import {
  createImmutableContentStore,
  inspectPublishedRevision,
} from "../../../src/infrastructure/filesystem/immutable-content-store.js";
import {
  createNodeContentStorePlatform,
  renameNoReplaceByProbe,
} from "../../../src/infrastructure/filesystem/content-store-durability.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;

async function makeStore() {
  const root = await mkdtemp(join(tmpdir(), "pi-immutable-store-"));
  const layout = await createContentStoreLayout(join(root, "host"));
  const allocator = createStagingAllocator(layout, { randomBytes: () => Uint8Array.from({ length: 16 }, (_, i) => i + 1) });
  const platform = createNodeContentStorePlatform({ renameNoReplace: renameNoReplaceByProbe });
  const store = createImmutableContentStore({ layout, allocator, platform, sha256, randomBytes: () => Uint8Array.from({ length: 16 }, (_, i) => 31 - i) });
  return { root, layout, allocator, store };
}

async function makePlan(allocator: Awaited<ReturnType<typeof makeStore>>["allocator"], root: string, value = "plugin") {
  const allocation = await allocator.allocateStaging(signal);
  await mkdir(join(allocation.slot.root, "content"), { mode: 0o755 });
  await writeFile(join(allocation.slot.root, "content", "plugin.txt"), value, { mode: 0o644 });
  const bytes = new TextEncoder().encode(value);
  const manifest = createContentManifest([{ kind: "file", path: "plugin.txt", mode: 0o644, size: bytes.byteLength, digest: hashContent(bytes, sha256) }], sha256);
  const source = createResolvedPluginSource({ kind: "git", url: "https://example.com/plugin.git", revision: "a".repeat(40) }, sha256);
  return createPromotionPlan({
    kind: "plugin",
    allocation,
    materialized: {
      root: join(allocation.slot.root, "content"),
      source,
      content: manifest,
      binding: createMaterializationBinding(source.hash, manifest.rootDigest, sha256),
    },
  }, sha256);
}

describe("immutable content promotion", () => {
  it("publishes a complete read-only revision and is idempotent", async () => {
    const { root, allocator, store } = await makeStore();
    let publishedRoot: string | undefined;
    try {
      const plan = await makePlan(allocator, root);
      const first = await store.promote(plan, signal);
      publishedRoot = first.root.replace(/[/\\]content$/, "");
      expect(first.kind).toBe("promoted");
      expect(await readFile(join(first.root, "plugin.txt"), "utf8")).toBe("plugin");
      const secondPlan = await makePlan(allocator, root);
      const second = await store.promote(secondPlan, signal);
      expect(second.kind).toBe("already-present");
      expect((await inspectPublishedRevision(first.root.replace(/[/\\]content$/, ""), sha256)).identity).toEqual(first.identity);
    } finally {
      if (publishedRoot !== undefined) {
        await chmod(join(publishedRoot, "content", "plugin.txt"), 0o644).catch(() => undefined);
        await chmod(join(publishedRoot, "content"), 0o755).catch(() => undefined);
        await chmod(publishedRoot, 0o755).catch(() => undefined);
      }
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a handoff mutation before publication", async () => {
    const { root, allocator, store } = await makeStore();
    try {
      const plan = await makePlan(allocator, root);
      await writeFile(join(plan.root, "plugin.txt"), "tampered", { mode: 0o644 });
      await expect(store.promote(plan, signal)).rejects.toThrow(/verification|content/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
