import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createMaterializationBinding, createContentManifest, hashContent } from "../../../src/domain/content-manifest.js";
import { createResolvedPluginSource } from "../../../src/domain/source.js";
import { createPluginStoreIdentity } from "../../../src/domain/content-store.js";
import { derivePluginDataRef, deriveProjectionRootRef } from "../../../src/domain/state/references.js";
import { createContentStoreLayout } from "../../../src/infrastructure/filesystem/content-store-layout.js";
import { createRuntimeRootStore, hashProjectionRoot, inspectProjection } from "../../../src/infrastructure/filesystem/runtime-root-store.js";
import { createNodeContentStorePlatform, renameNoReplaceByProbe } from "../../../src/infrastructure/filesystem/content-store-durability.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;

describe("runtime data and projection roots", () => {
  it("keeps data stable and physically separate from immutable content", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-runtime-roots-"));
    try {
      const layout = await createContentStoreLayout(join(root, "host"));
      const runtime = createRuntimeRootStore({
        layout,
        platform: createNodeContentStorePlatform({ renameNoReplace: renameNoReplaceByProbe }),
        sha256,
      });
      const userDataRef = derivePluginDataRef({ scope: { kind: "user" }, plugin: "demo@market", purpose: "persistent-plugin-data" }, sha256);
      const first = await runtime.ensureDataRoot({ scope: { kind: "user" }, plugin: "demo@market", dataRef: userDataRef }, signal);
      await writeFile(join(first.root, "state.json"), "survives");
      const second = await runtime.ensureDataRoot({ scope: { kind: "user" }, plugin: "demo@market", dataRef: userDataRef }, signal);
      expect(second.root).toBe(first.root);
      expect(await readFile(join(second.root, "state.json"), "utf8")).toBe("survives");
      const projectRef = derivePluginDataRef({ scope: { kind: "project", projectKey: `project-v1:sha256:${"1".repeat(64)}` }, plugin: "demo@market", purpose: "persistent-plugin-data" }, sha256);
      const project = await runtime.ensureDataRoot({ scope: { kind: "project", projectKey: `project-v1:sha256:${"1".repeat(64)}` }, plugin: "demo@market", dataRef: projectRef }, signal);
      expect(project.root).not.toBe(first.root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("publishes a digest-verified replaceable projection root", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-projection-roots-"));
    let published: string | undefined;
    let allocationRoot: string | undefined;
    try {
      const layout = await createContentStoreLayout(join(root, "host"));
      const platform = createNodeContentStorePlatform({ renameNoReplace: renameNoReplaceByProbe });
      const runtime = createRuntimeRootStore({ layout, platform, sha256 });
      const source = await mkdtemp(join(root, "payload-"));
      await writeFile(join(source, "descriptor.json"), "one");
      const projectionDigest = await hashProjectionRoot(source, sha256);
      const scope = { kind: "user" } as const;
      const plugin = "demo@market" as const;
      const projectionRef = deriveProjectionRootRef({ scope, plugin, projectionDigest }, sha256);
      const allocation = await runtime.allocateProjectionRoot({ scope, plugin, projectionDigest, projectionRef }, signal);
      allocationRoot = allocation.root;
      await writeFile(join(allocation.root, "descriptor.json"), "one");
      const resolved = await runtime.sealProjectionRoot(allocation, signal);
      published = resolved.root;
      expect(await inspectProjection(resolved.root, sha256)).toMatchObject({ projectionRef, projectionDigest });
      expect(resolved.root).toBe(layout.projectionPath(projectionRef));
      await expect(writeFile(join(resolved.root, "new.txt"), "blocked")).rejects.toThrow();
      await chmod(join(resolved.root, "descriptor.json"), 0o644).catch(() => undefined);
      await chmod(resolved.root, 0o755).catch(() => undefined);
      await rm(source, { recursive: true, force: true });
    } finally {
      if (allocationRoot !== undefined) {
        await chmod(join(allocationRoot, "descriptor.json"), 0o644).catch(() => undefined);
        await chmod(join(allocationRoot, "metadata.json"), 0o644).catch(() => undefined);
        await chmod(join(allocationRoot, "READY"), 0o644).catch(() => undefined);
        await chmod(allocationRoot, 0o755).catch(() => undefined);
      }
      if (published !== undefined) {
        await chmod(join(published, "descriptor.json"), 0o644).catch(() => undefined);
        await chmod(join(published, "metadata.json"), 0o644).catch(() => undefined);
        await chmod(join(published, "READY"), 0o644).catch(() => undefined);
        await chmod(published, 0o755).catch(() => undefined);
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});
