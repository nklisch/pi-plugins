import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ContentStoreLayout, RootCapability } from "../filesystem/content-store-layout.js";
import { assertLayoutRoot } from "../filesystem/content-store-layout.js";
import { inspectPublishedRevision } from "../filesystem/immutable-content-store.js";
import { inspectProjection } from "../filesystem/runtime-root-store.js";
import { removePreparedTree, type PreparedTreeIdentity } from "../filesystem/prepared-tree-cleanup.js";
import { ContentStoreIdentitySchema, MarketplaceStoreKeySchema, PluginStoreKeySchema } from "../../domain/content-store.js";
import { ProjectionRootRefSchema } from "../../domain/state/references.js";
import type { RevisionArtifactCandidate, RevisionArtifactCollection, RevisionArtifactStore } from "../../application/ports/revision-artifact-store.js";

 type RecordValue = Readonly<{ candidate: RevisionArtifactCandidate; root: string; identity: PreparedTreeIdentity; parent: RootCapability }>;

export function createRevisionArtifactStore(layout: ContentStoreLayout, sha256: (bytes: Uint8Array) => Uint8Array): RevisionArtifactStore {
  const owned = new WeakMap<object, RecordValue>();
  async function scanStore(root: string, parent: RootCapability, kind: "marketplace" | "plugin"): Promise<{ artifacts: RevisionArtifactCandidate[]; complete: boolean }> {
    await assertLayoutRoot(layout, kind === "plugin" ? "pluginStoreRoot" : "marketplaceStoreRoot", "scanRevisionArtifacts");
    const artifacts: RevisionArtifactCandidate[] = [];
    let complete = true;
    for (const name of (await readdir(root)).sort()) {
      if (name.startsWith(".pending-")) { complete = false; continue; }
      if (!/^[0-9a-f]{64}$/.test(name)) { complete = false; continue; }
      const path = join(root, name);
      try {
        const stat = await lstat(path);
        if (!stat.isDirectory() || stat.isSymbolicLink()) { complete = false; continue; }
        const inspected = await inspectPublishedRevision(path, sha256);
        const identity = ContentStoreIdentitySchema.parse(inspected.identity);
        if (identity.kind !== kind) { complete = false; continue; }
        const reference = kind === "plugin"
          ? identity.kind === "plugin" ? { kind: "plugin" as const, key: PluginStoreKeySchema.parse(identity.key) } : undefined
          : identity.kind === "marketplace" ? { kind: "marketplace" as const, key: MarketplaceStoreKeySchema.parse(identity.key) } : undefined;
        if (reference === undefined) { complete = false; continue; }
        const capability = Object.freeze({});
        const candidate = Object.freeze({ kind, key: name, reference, capability });
        owned.set(capability, { candidate, root: path, identity: { dev: stat.dev, ino: stat.ino }, parent });
        artifacts.push(candidate);
      } catch { complete = false; }
    }
    return { artifacts, complete };
  }
  async function scanProjections(): Promise<{ artifacts: RevisionArtifactCandidate[]; complete: boolean }> {
    await assertLayoutRoot(layout, "generatedRoot", "scanRevisionArtifacts");
    const artifacts: RevisionArtifactCandidate[] = [];
    let complete = true;
    for (const name of (await readdir(layout.generatedRoot)).sort()) {
      if (name === ".staging") { continue; }
      if (!/^[0-9a-f]{64}$/.test(name)) { complete = false; continue; }
      const path = join(layout.generatedRoot, name);
      try {
        const stat = await lstat(path);
        const metadata = await inspectProjection(path, sha256);
        const reference = { kind: "projection" as const, reference: ProjectionRootRefSchema.parse(metadata.projectionRef) };
        const capability = Object.freeze({});
        const candidate = Object.freeze({ kind: "projection" as const, key: name, reference, capability });
        owned.set(capability, { candidate, root: path, identity: { dev: stat.dev, ino: stat.ino }, parent: layout.rootCapabilities.generatedRoot });
        artifacts.push(candidate);
      } catch { complete = false; }
    }
    return { artifacts, complete };
  }
  async function scan(signal: AbortSignal): Promise<RevisionArtifactCollection> {
    if (signal.aborted) throw signal.reason;
    const marketplace = await scanStore(layout.marketplaceStoreRoot, layout.rootCapabilities.marketplaceStoreRoot, "marketplace");
    const plugin = await scanStore(layout.pluginStoreRoot, layout.rootCapabilities.pluginStoreRoot, "plugin");
    const projections = await scanProjections();
    return { complete: marketplace.complete && plugin.complete && projections.complete, artifacts: [...marketplace.artifacts, ...plugin.artifacts, ...projections.artifacts].sort((a, b) => a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key)) };
  }
  async function remove(candidate: RevisionArtifactCandidate, signal: AbortSignal): Promise<"removed" | "already-absent"> {
    if (signal.aborted) throw signal.reason;
    const record = owned.get(candidate.capability);
    if (record === undefined || record.candidate !== candidate) throw new Error("revision artifact capability is not owned");
    const current = await lstat(record.root).catch((error) => { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; });
    if (current === undefined) return "already-absent";
    if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== record.identity.dev || current.ino !== record.identity.ino) throw new Error("revision artifact identity changed");
    await assertLayoutRoot(layout, record.candidate.kind === "plugin" ? "pluginStoreRoot" : record.candidate.kind === "marketplace" ? "marketplaceStoreRoot" : "generatedRoot", "removeRevisionArtifact");
    if (record.candidate.kind === "projection") await inspectProjection(record.root, sha256);
    else {
      const inspected = await inspectPublishedRevision(record.root, sha256);
      if (record.candidate.reference.kind === "projection" || inspected.identity.key !== record.candidate.reference.key) throw new Error("revision artifact identity changed");
    }
    return removePreparedTree(record.root, record.identity, record.parent);
  }
  return Object.freeze({ scan, remove });
}
