import { createHash } from "node:crypto";
import { createContentStoreLayout } from "../filesystem/content-store-layout.js";
import { createLocalRecoveryFilesystem } from "./local-recovery-filesystem.js";
import { createSqliteTransitionJournal } from "./sqlite-transition-journal.js";
import { createSqliteRevisionRetention } from "./sqlite-revision-retention.js";
import { createProcessRevisionLeaseStore } from "./process-revision-leases.js";
import { createRevisionArtifactStore } from "./revision-artifact-store.js";
import type { ScopeReference } from "../../domain/state/scope.js";
import type { LifecycleTransitionStore } from "../../application/ports/lifecycle-transition-store.js";
import type { RevisionRetentionStore } from "../../application/ports/revision-retention-store.js";
import type { RevisionLeaseStore } from "../../application/ports/revision-lease-store.js";
import type { RevisionArtifactStore } from "../../application/ports/revision-artifact-store.js";
import type { LifecycleRecoveryService, LifecycleRecoveryServiceDependencies } from "../../application/recovery-service.js";
import { createLifecycleRecoveryService } from "../../application/recovery-service.js";
import { createRevisionCollectionService, type RevisionCollectionDependencies } from "../../application/revision-collection-service.js";

const nodeSha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());

export type NodeRecoveryAdapterOptions = Readonly<{
  hostRoot: string;
  verifyLocalFilesystem?: (root: string) => Promise<void>;
}>;

export type NodeRecoveryAdapters = Readonly<{
  transitions(scope: ScopeReference): LifecycleTransitionStore;
  leases: RevisionLeaseStore;
  retention: RevisionRetentionStore;
  artifacts: RevisionArtifactStore;
  createRecoveryService(dependencies: Omit<LifecycleRecoveryServiceDependencies, "transitions">): LifecycleRecoveryService;
  createCollectionService(dependencies: Omit<RevisionCollectionDependencies, "transitions" | "leases" | "retention" | "artifacts" | "sha256">): ReturnType<typeof createRevisionCollectionService>;
}>;

/** Composition root: adapter details remain private while application policy stays injectable. */
export async function createNodeRecoveryAdapters(options: NodeRecoveryAdapterOptions): Promise<NodeRecoveryAdapters> {
  if (options === null || typeof options !== "object" || typeof options.hostRoot !== "string") throw new TypeError("Node recovery adapters require a host root");
  const filesystem = await createLocalRecoveryFilesystem(options);
  const layout = await createContentStoreLayout(options.hostRoot);
  const journals = new Map<string, LifecycleTransitionStore>();
  const transitions = (scope: ScopeReference): LifecycleTransitionStore => {
    const key = JSON.stringify(scope);
    const existing = journals.get(key);
    if (existing !== undefined) return existing;
    const created = createSqliteTransitionJournal({ filesystem });
    journals.set(key, created);
    return created;
  };
  const [leases, retention] = await Promise.all([
    createProcessRevisionLeaseStore(options),
    createSqliteRevisionRetention(options),
  ]);
  const artifacts = createRevisionArtifactStore(layout, nodeSha256);
  return Object.freeze({
    transitions,
    leases,
    retention,
    artifacts,
    createRecoveryService: (dependencies) => createLifecycleRecoveryService({ ...dependencies, transitions }),
    createCollectionService: (dependencies) => createRevisionCollectionService({ ...dependencies, transitions, leases, retention, artifacts, sha256: nodeSha256 }),
  });
}
