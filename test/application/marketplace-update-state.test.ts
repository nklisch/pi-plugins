import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createMarketplaceConfigurationRecord,
  deriveMarketplaceSourceIdentity,
  derivePluginSourceIdentity,
  deriveUpdateCandidateKey,
  type MarketplaceUpdateRecord,
} from "../../src/domain/update-policy.js";
import {
  ContentDigestSchema,
  createContentManifest,
  hashContent,
} from "../../src/domain/content-manifest.js";
import {
  MarketplaceSourceSchema,
  createResolvedMarketplaceSource,
} from "../../src/domain/source.js";
import { ProjectIdentitySchema, deriveProjectKey } from "../../src/domain/state/scope.js";
import {
  HostConfigDocumentSchemaV2,
  GenerationSchema,
} from "../../src/domain/state/config-state.js";
import { ProjectLocalStateDocumentSchemaV2 } from "../../src/domain/state/project-state.js";
import { createMarketplaceSnapshotRecord } from "../../src/domain/state/installed-state.js";
import { StatePointersDocumentSchemaV1 } from "../../src/domain/state/pointers.js";
import { TrustStateDocumentSchemaV1 } from "../../src/domain/state/trust-state.js";
import { InstalledUserStateDocumentSchemaV2 } from "../../src/domain/state/installed-state.js";
import {
  isVerifiedStateMutation,
  type GenerationSnapshot,
  type UserGenerationSnapshot,
  type ProjectGenerationSnapshot,
} from "../../src/application/state-contract.js";
import {
  createMarketplaceUpdateRecordsMutation,
  marketplaceUpdateRecords,
} from "../../src/application/marketplace-update-state.js";
import { deriveStateBlobRef } from "../../src/domain/state/references.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const digest = (value: string) => `sha256:${value.repeat(64 / value.length)}` as `sha256:${string}`;
const generation = GenerationSchema.parse(7);
const source = MarketplaceSourceSchema.parse({ kind: "github", repository: "example/community" });

function userPointers() {
  return StatePointersDocumentSchemaV1.parse({
    schemaVersion: 1,
    scope: { kind: "user" },
    generation,
    documents: ["hostConfig", "installedUser", "trust"].map((document) => ({
      kind: document,
      generation,
      blob: deriveStateBlobRef({ document, scope: "user", generation }, sha256),
      digest: digest("a"),
    })),
  });
}

function userSnapshot(config: unknown): UserGenerationSnapshot {
  return {
    scope: { kind: "user" },
    generation,
    pointers: userPointers(),
    config: config as UserGenerationSnapshot["config"],
    installed: InstalledUserStateDocumentSchemaV2.parse({ schemaVersion: 2, generation, marketplaces: [], plugins: [] }),
    trust: TrustStateDocumentSchemaV1.parse({ schemaVersion: 1, generation, records: [] }),
    corruptions: [],
  };
}

function projectSnapshot(record: MarketplaceUpdateRecord): ProjectGenerationSnapshot {
  const identity = ProjectIdentitySchema.parse({
    kind: "repository",
    canonicalRoot: "file:///workspace/project/",
    repositoryFingerprint: digest("c"),
  });
  const projectKey = deriveProjectKey(identity, sha256);
  const resolvedSource = createResolvedMarketplaceSource({
    declared: source,
    revision: "a".repeat(40),
  }, sha256);
  const content = createContentManifest([{
    kind: "file",
    path: "README.md",
    mode: 0o644,
    size: 0,
    digest: hashContent(new Uint8Array(), sha256),
  }], sha256);
  const marketplace = createMarketplaceSnapshotRecord({
    marketplace: "community",
    source: resolvedSource,
    content,
  }, sha256);
  const project = ProjectLocalStateDocumentSchemaV2.parse({
    schemaVersion: 2,
    generation,
    projectKey,
    identity,
    declarationDigest: content.rootDigest,
    marketplaces: [marketplace],
    plugins: [],
    marketplaceUpdates: [record],
  });
  return {
    scope: { kind: "project", identity, projectKey },
    generation,
    pointers: StatePointersDocumentSchemaV1.parse({
      schemaVersion: 1,
      scope: { kind: "project", projectKey },
      generation,
      documents: [{
        kind: "projectLocal",
        generation,
        blob: deriveStateBlobRef({ document: "projectLocal", scope: "project", generation }, sha256),
        digest: digest("a"),
      }],
    }),
    project,
    corruptions: [],
  };
}

function richRecord(): MarketplaceUpdateRecord {
  const marketplaceSourceIdentity = deriveMarketplaceSourceIdentity(source, sha256);
  const pluginSourceIdentity = derivePluginSourceIdentity({ kind: "git", url: "https://example.com/demo.git" }, sha256);
  const candidate = deriveUpdateCandidateKey({
    scope: { kind: "user" },
    plugin: "demo@community",
    marketplaceSourceIdentity,
    pluginSourceIdentity,
    immutableRevision: ContentDigestSchema.parse(digest("b")),
  }, sha256);
  return createMarketplaceConfigurationRecord({
    marketplace: "community",
    source,
    refresh: {
      claim: { id: "refresh-claim-v1:uuid:123e4567-e89b-42d3-a456-426614174000", startedAt: 10, expiresAt: 20 },
      lastCompletedAt: 9,
      nextScheduledAt: 200,
      consecutiveFailures: 3,
    },
    notifications: [{
      scope: { kind: "user" },
      plugin: "demo@community",
      candidate,
      display: { installed: "1.0.0", available: "1.1.0" },
      phase: "discovered",
    }],
  });
}

describe("marketplace update state projection", () => {
  it("reads compatible records with defaults and keeps strict parsing", () => {
    const minimal = { marketplace: "community", source, updateApplication: "manual" };
    const records = marketplaceUpdateRecords(userSnapshot({ schemaVersion: 1, generation, records: [minimal] }));
    expect(records[0]).toMatchObject({
      marketplace: "community",
      refresh: { nextScheduledAt: 0, consecutiveFailures: 0 },
      notifications: [],
    });

    const rich = richRecord();
    expect(marketplaceUpdateRecords(userSnapshot({ schemaVersion: 1, generation, records: [rich] }))).toEqual([rich]);
    expect(() => marketplaceUpdateRecords(userSnapshot({
      schemaVersion: 2,
      generation,
      records: [{ marketplace: "community", source: { kind: "not-a-source" }, updateApplication: "manual" }],
    }))).toThrow();
  });

  it.each(["v1-compatible", "v2"] as const)("projects a %s user envelope to a verified frozen v2 mutation", (version) => {
    const rich = richRecord();
    const config = version === "v1-compatible"
      ? { schemaVersion: 1 as const, generation, records: [rich] }
      : HostConfigDocumentSchemaV2.parse({ schemaVersion: 2, generation, records: [rich] });
    const snapshot = userSnapshot(config);
    const mutation = createMarketplaceUpdateRecordsMutation(snapshot, marketplaceUpdateRecords(snapshot), sha256);

    expect(isVerifiedStateMutation(mutation)).toBe(true);
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation.replace)).toBe(true);
    if (!("config" in mutation.replace)) throw new Error("expected config replacement");
    expect(mutation.scope).toEqual(snapshot.scope);
    expect(mutation.expectedGeneration).toBe(snapshot.generation);
    expect(mutation.replace.config.schemaVersion).toBe(2);
    expect(mutation.replace.config.generation).toBe(snapshot.generation);
    expect(mutation.replace.config.records).toEqual([rich]);
    expect(Object.isFrozen(mutation.replace.config)).toBe(true);
    expect(Object.isFrozen(mutation.replace.config.records)).toBe(true);
    expect(mutation.replace.config.records[0]!.refresh).toEqual(rich.refresh);
    expect(mutation.replace.config.records[0]!.notifications).toEqual(rich.notifications);
  });

  it("projects project records without changing project identity or adjacent state", () => {
    const rich = richRecord();
    const snapshot = projectSnapshot(rich);
    const replacement = richRecord();
    const mutation = createMarketplaceUpdateRecordsMutation(snapshot, [replacement], sha256);

    expect(isVerifiedStateMutation(mutation)).toBe(true);
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation.replace)).toBe(true);
    if (!("project" in mutation.replace)) throw new Error("expected project replacement");
    expect(mutation.scope).toEqual(snapshot.scope);
    expect(mutation.expectedGeneration).toBe(snapshot.generation);
    expect(mutation.replace.project.schemaVersion).toBe(2);
    expect(mutation.replace.project.generation).toBe(snapshot.generation);
    expect(mutation.replace.project.projectKey).toBe(snapshot.project.projectKey);
    expect(mutation.replace.project.identity).toEqual(snapshot.project.identity);
    expect(mutation.replace.project.declarationDigest).toBe(snapshot.project.declarationDigest);
    expect(mutation.replace.project.marketplaces).toEqual(snapshot.project.marketplaces);
    expect(mutation.replace.project.plugins).toEqual(snapshot.project.plugins);
    expect(mutation.replace.project.marketplaceUpdates).toEqual([replacement]);
    expect(Object.isFrozen(mutation.replace.project)).toBe(true);
    expect(Object.isFrozen(mutation.replace.project.marketplaceUpdates)).toBe(true);
  });
});
