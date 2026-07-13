import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createContentStoreLayout } from "../../../src/infrastructure/filesystem/content-store-layout.js";
import { createContentRootResolver } from "../../../src/infrastructure/filesystem/content-root-resolver.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;

describe("logical content root resolver", () => {
  it("does not accept a path-bearing or unready marketplace record", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-content-resolver-"));
    try {
      const layout = await createContentStoreLayout(join(root, "host"));
      const resolver = createContentRootResolver({ layout, sha256 });
      const record = {
        marketplace: "community",
        source: { kind: "github", sourceHash: `sha256:${"a".repeat(64)}`, revision: "b".repeat(40) },
        contentDigest: `sha256:${"c".repeat(64)}`,
        binding: `sha256:${"d".repeat(64)}`,
        contentRef: `marketplace-content-v1:sha256:${"e".repeat(64)}`,
      } as never;
      await expect(resolver.resolveMarketplace(record, signal)).rejects.toThrow();
      expect(layout.hostRoot).not.toContain("community");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
