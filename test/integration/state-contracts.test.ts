import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CompatibilityReportSchema,
  ContentDigestSchema,
  HostConfigDocumentSchemaV1,
  InstalledUserStateDocumentSchemaV1,
  MarketplaceNameSchema,
  ProjectIdentitySchema,
  PortableProjectDeclarationSchemaV1,
  ProjectLocalStateDocumentSchemaV1,
  StatePointersDocumentSchemaV1,
  StateMutationSchema,
  StateCodecError,
  TrustStateDocumentSchemaV1,
  createContentManifest,
  defineVersionedSchemaFamily,
  createInstalledUserStateDocument,
  createProjectLocalStateDocument,
  createStatePointersDocument,
  decodeStateDocument,
  deriveProjectKey,
  deriveStateBlobRef,
  encodeStateDocument,
  hashContent,
  parsePortableProjectDeclaration,
  parseStateMutation,
  type Generation,
  type LifecycleStateStore,
  type ProjectGenerationSnapshot,
  type ProjectIdentity,
  type ProjectScopeContext,
  type ScopeContext,
  type Sha256,
  type StateCommitResult,
  type StateLoadResult,
  type StateMutation as StateMutationType,
  type UserGenerationSnapshot,
} from "../../src/index.js";
import { NormalizedPluginSchema } from "../../src/domain/plugin.js";
import {
  createResolvedMarketplaceSource,
  createResolvedPluginSource,
  MarketplaceSourceSchema,
} from "../../src/domain/source.js";
import { claim, type Provenance } from "../../src/domain/provenance.js";

const root = process.cwd();
const sha256: Sha256 = (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest());
const digest = ContentDigestSchema.parse(`sha256:${"00".repeat(32)}`);
const text = (value: string) => new TextEncoder().encode(value);
const location: Provenance = {
  location: { host: "claude", documentKind: "manifest", path: ".claude-plugin/plugin.json", pointer: "" },
};

function fixture(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, "test/fixtures/state", path), "utf8")) as unknown;
}

function pointer(scope: ScopeContext, generation: Generation, kind: "hostConfig" | "installedUser" | "trust" | "projectLocal") {
  return {
    kind,
    generation,
    blob: deriveStateBlobRef({ document: kind, scope: scope.kind, generation }, sha256),
    digest,
  };
}

function pointers(scope: ScopeContext, generation: Generation) {
  const scopeReference = scope.kind === "user"
    ? { kind: "user" as const }
    : { kind: "project" as const, projectKey: scope.projectKey };
  const documents = scope.kind === "user"
    ? [
      pointer(scope, generation, "hostConfig"),
      pointer(scope, generation, "installedUser"),
      pointer(scope, generation, "trust"),
    ]
    : [pointer(scope, generation, "projectLocal")];
  return createStatePointersDocument({
    schemaVersion: 1,
    scope: scopeReference,
    generation,
    documents,
  });
}

const pluginSource = createResolvedPluginSource({
  kind: "git",
  url: "https://example.com/demo.git",
  revision: "a".repeat(40),
}, sha256);
const plugin = NormalizedPluginSchema.parse({
  identity: {
    key: "demo@community",
    marketplaceName: "community",
    marketplaceEntryName: "demo",
  },
  version: claim("1.0.0", location),
  source: pluginSource,
  configuration: { options: [] },
  components: { skills: [], hooks: [], mcpServers: [], foreign: [] },
  metadata: [],
});
const report = CompatibilityReportSchema.parse({
  plugin: plugin.identity,
  activatable: true,
  components: [],
  requirements: [],
  diagnostics: [],
});
const content = createContentManifest([{
  kind: "file",
  path: "README.md",
  mode: 0o644,
  size: 7,
  digest: hashContent(text("content"), sha256),
}], sha256);
const marketplaceSource = createResolvedMarketplaceSource({
  declared: { kind: "github", repository: "example/marketplace" },
  revision: "b".repeat(40),
}, sha256);
const marketplace = {
  marketplace: MarketplaceNameSchema.parse("community"),
  source: marketplaceSource,
  content,
};
const pluginRevision = { plugin, compatibility: report, content };

const projectIdentity: ProjectIdentity = ProjectIdentitySchema.parse({
  kind: "repository",
  canonicalRoot: "file:///workspace/project/",
  repositoryFingerprint: `sha256:${"9".repeat(64)}`,
});
const projectKey = deriveProjectKey(projectIdentity, sha256);
const projectScope: ProjectScopeContext = {
  kind: "project",
  identity: projectIdentity,
  projectKey,
};
const userScope = { kind: "user" as const };

function makeUserSnapshot(generation: Generation): UserGenerationSnapshot {
  const config = HostConfigDocumentSchemaV1.parse({
    schemaVersion: 1,
    generation,
    records: [{
      marketplace: "community",
      source: MarketplaceSourceSchema.parse({ kind: "github", repository: "example/marketplace" }),
      updateApplication: "manual",
    }],
  });
  const installed = createInstalledUserStateDocument({
    generation,
    marketplaces: [marketplace],
    plugins: [{
      plugin: plugin.identity.key,
      activation: "enabled",
      revisions: [pluginRevision],
    }],
  }, sha256);
  const trust = TrustStateDocumentSchemaV1.parse({ schemaVersion: 1, generation, records: [] });
  return {
    scope: userScope,
    generation,
    pointers: pointers(userScope, generation),
    config,
    installed,
    trust,
    corruptions: [],
  };
}

function makeProjectSnapshot(generation: Generation): ProjectGenerationSnapshot {
  const project = createProjectLocalStateDocument({
    schemaVersion: 1,
    generation,
    projectKey,
    identity: projectIdentity,
    declarationDigest: content.rootDigest,
    marketplaces: [marketplace],
    plugins: [{
      plugin: plugin.identity.key,
      activation: "enabled",
      revisions: [pluginRevision],
    }],
  }, projectScope, sha256);
  return {
    scope: projectScope,
    generation,
    pointers: pointers(projectScope, generation),
    project,
    corruptions: [],
  };
}

/** A deliberately tiny fake that implements only the public state port. */
class FakeLifecycleStateStore implements LifecycleStateStore {
  private user: UserGenerationSnapshot;
  private project: ProjectGenerationSnapshot;

  constructor() {
    this.user = makeUserSnapshot(0);
    this.project = makeProjectSnapshot(0);
  }

  async read(scope: ScopeContext, signal: AbortSignal): Promise<StateLoadResult> {
    if (signal.aborted) throw signal.reason;
    if (scope.kind === "user") return { ok: true, snapshot: this.user };
    if (scope.projectKey !== this.project.scope.projectKey) {
      return {
        ok: false,
        scope,
        corruptions: [{
          document: "projectLocal",
          scope: { kind: "project", projectKey: scope.projectKey },
          code: "SCOPE_MISMATCH",
          message: "state document scope is not the requested scope",
        }],
      };
    }
    return { ok: true, snapshot: this.project };
  }

  async commit(mutation: StateMutationType, signal: AbortSignal): Promise<StateCommitResult> {
    if (signal.aborted) throw signal.reason;
    const validated = parseStateMutation(StateMutationSchema.parse(mutation), sha256);
    if (validated.scope.kind === "user") {
      if (validated.expectedGeneration !== this.user.generation) {
        return { kind: "stale-generation", expected: validated.expectedGeneration, actual: this.user.generation };
      }
      const next = (validated.expectedGeneration + 1) as Generation;
      const replacement = validated.replace;
      this.user = {
        ...this.user,
        generation: next,
        pointers: pointers(userScope, next),
        config: replacement.config === undefined ? { ...this.user.config, generation: next } : { ...replacement.config, generation: next },
        installed: replacement.installed === undefined ? { ...this.user.installed, generation: next } : { ...replacement.installed, generation: next },
        trust: replacement.trust === undefined ? { ...this.user.trust, generation: next } : { ...replacement.trust, generation: next },
      };
      return { kind: "committed", snapshot: this.user };
    }
    if (validated.expectedGeneration !== this.project.generation) {
      return { kind: "stale-generation", expected: validated.expectedGeneration, actual: this.project.generation };
    }
    const next = (validated.expectedGeneration + 1) as Generation;
    const project = createProjectLocalStateDocument({
      ...validated.replace.project,
      generation: next,
    }, this.project.scope, sha256);
    this.project = { ...this.project, generation: next, pointers: pointers(this.project.scope, next), project };
    return { kind: "committed", snapshot: this.project };
  }
}

describe("state contract integration", () => {
  it("loads every independently versioned v1 fixture through strict envelopes", () => {
    expect(HostConfigDocumentSchemaV1.parse(fixture("v1/valid/host-config.json"))).toBeTruthy();
    expect(InstalledUserStateDocumentSchemaV1.parse(fixture("v1/valid/installed-user.json"))).toBeTruthy();
    expect(TrustStateDocumentSchemaV1.parse(fixture("v1/valid/trust.json"))).toBeTruthy();
    expect(ProjectLocalStateDocumentSchemaV1.parse(fixture("v1/valid/project-local.json"))).toBeTruthy();
    expect(StatePointersDocumentSchemaV1.parse(fixture("v1/valid/pointers-user.json"))).toBeTruthy();
    expect(StatePointersDocumentSchemaV1.parse(fixture("v1/valid/pointers-project.json"))).toBeTruthy();
    expect(PortableProjectDeclarationSchemaV1.parse(fixture("portable/valid.json"))).toBeTruthy();
  });

  it("quarantines mixed records while fatal roots expose no partial snapshot", () => {
    const decoded = decodeStateDocument("hostConfig", fixture("v1/corrupt/host-config-mixed.json"), {
      scope: userScope,
      generation: 0,
      sha256,
    });
    expect(decoded.value.records.map((record) => record.marketplace)).toEqual(["alpha"]);
    expect(decoded.corruptions.map((entry) => entry.code)).toEqual([
      "RECORD_DUPLICATE",
      "RECORD_INVALID",
      "RECORD_DUPLICATE",
      "RECORD_INVALID",
    ]);

    const userState = makeUserSnapshot(0).installed;
    const userWithCorruptSibling = decodeStateDocument("installedUser", {
      ...userState,
      plugins: [
        userState.plugins[0],
        { ...userState.plugins[0], plugin: "other@community", activation: "corrupt" },
      ],
    }, { scope: userScope, generation: 0, sha256 });
    expect(userWithCorruptSibling.value.plugins.map((entry) => entry.plugin)).toEqual([plugin.identity.key]);
    expect(userWithCorruptSibling.corruptions).toHaveLength(1);

    const projectState = makeProjectSnapshot(0).project;
    const projectWithCorruptSibling = decodeStateDocument("projectLocal", {
      ...projectState,
      plugins: [
        projectState.plugins[0],
        { ...projectState.plugins[0], plugin: "other@community", activation: "corrupt" },
      ],
    }, { scope: projectScope, generation: 0, sha256 });
    expect(projectWithCorruptSibling.value.plugins.map((entry) => entry.plugin)).toEqual([plugin.identity.key]);
    expect(projectWithCorruptSibling.corruptions).toHaveLength(1);

    expect(() => decodeStateDocument("pointers", fixture("v1/corrupt/pointers-fatal.json"), {
      scope: userScope,
      generation: 4,
      sha256,
    })).toThrowError(StateCodecError);
    try {
      decodeStateDocument("pointers", fixture("v1/corrupt/pointers-fatal.json"), {
        scope: userScope,
        generation: 4,
        sha256,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(StateCodecError);
      expect(JSON.stringify((error as StateCodecError).corruption)).not.toContain("/var/lib");
      expect(JSON.stringify(error)).not.toContain("nativeCause");
    }
  });

  it("rejects future versions and portable canaries without partial intent", () => {
    expect(() => decodeStateDocument("hostConfig", fixture("v1/corrupt/future-version.json"), {
      scope: userScope,
      generation: 0,
      sha256,
    })).toThrowError(StateCodecError);
    expect(() => decodeStateDocument("pointers", fixture("v1/corrupt/scope-mismatch.json"), {
      scope: userScope,
      generation: 0,
      sha256,
    })).toThrowError(StateCodecError);
    expect(() => decodeStateDocument("hostConfig", fixture("v1/corrupt/digest-mismatch.json"), {
      scope: userScope,
      generation: 0,
      sha256,
      expectedDigest: `sha256:${"ff".repeat(32)}`,
    })).toThrowError(StateCodecError);
    const canaries = JSON.stringify(fixture("portable/prohibited-canaries.json"));
    expect(() => parsePortableProjectDeclaration(fixture("portable/prohibited-canaries.json"))).toThrow();
    expect(() => parsePortableProjectDeclaration(fixture("portable/timestamps.json"))).toThrow();
    expect(canaries).toContain("CANARY_SECRET_VALUE");
    expect(JSON.stringify(PortableProjectDeclarationSchemaV1.safeParse(fixture("portable/prohibited-canaries.json")))).not.toContain("CANARY_SECRET_VALUE");
  });

  it("encodes records and nested object keys deterministically", () => {
    const left = {
      schemaVersion: 1 as const,
      generation: 0 as const,
      records: [
        { marketplace: "team", source: { kind: "github" as const, repository: "example/plugins" }, updateApplication: "manual" as const },
        { marketplace: "alpha", source: { kind: "github" as const, repository: "example/plugins" }, updateApplication: "automatic" as const },
      ],
    };
    const right = {
      schemaVersion: 1 as const,
      generation: 0 as const,
      records: [
        { updateApplication: "automatic" as const, source: { repository: "example/plugins", kind: "github" as const }, marketplace: "alpha" },
        { updateApplication: "manual" as const, source: { repository: "example/plugins", kind: "github" as const }, marketplace: "team" },
      ],
    };
    const context = { scope: userScope, generation: 0 as Generation, sha256 };
    expect(JSON.stringify(encodeStateDocument("hostConfig", left, context))).toBe(
      JSON.stringify(encodeStateDocument("hostConfig", right, context)),
    );
    expect(JSON.stringify(encodeStateDocument("hostConfig", left, context))).toBe(
      JSON.stringify(encodeStateDocument("hostConfig", left, context)),
    );
  });

  it("round-trips complete user and independent project evidence through only the public store port", async () => {
    const store = new FakeLifecycleStateStore();
    const controller = new AbortController();
    const user = await store.read(userScope, controller.signal);
    const project = await store.read(projectScope, controller.signal);
    expect(user.ok && user.snapshot.installed.plugins[0]?.revisions[0]?.evidence.plugin).toEqual(plugin.identity);
    expect(project.ok && project.snapshot.project.plugins[0]?.revisions[0]?.evidence.compatibility.activatable).toBe(true);
    if (!user.ok || !project.ok) throw new Error("fake store did not return snapshots");
    expect(user.snapshot.installed.plugins[0]!.revisions[0]!.dataRef)
      .not.toBe(project.snapshot.project.plugins[0]!.revisions[0]!.dataRef);

    const nextConfig = { ...user.snapshot.config, records: user.snapshot.config.records.map((record) => ({ ...record, updateApplication: "automatic" as const })) };
    const committed = await store.commit({
      scope: userScope,
      expectedGeneration: user.snapshot.generation,
      replace: { config: nextConfig },
    }, controller.signal);
    expect(committed.kind).toBe("committed");
    if (committed.kind !== "committed" || committed.snapshot.scope.kind !== "user") throw new Error("user commit failed");
    expect(committed.snapshot.generation).toBe(1);
    expect(committed.snapshot.installed.plugins).toHaveLength(1);
    expect((await store.commit({
      scope: userScope,
      expectedGeneration: 0,
      replace: { config: nextConfig },
    }, controller.signal)).kind).toBe("stale-generation");

    const projectMutation: StateMutationType = {
      scope: projectScope,
      expectedGeneration: project.snapshot.generation,
      replace: { project: project.snapshot.project },
    };
    const projectCommit = await store.commit(projectMutation, controller.signal);
    expect(projectCommit.kind).toBe("committed");
    expect((await store.read(userScope, controller.signal)).ok).toBe(true);
  });

  it("propagates cancellation from the port without converting it to state corruption", async () => {
    const store = new FakeLifecycleStateStore();
    const controller = new AbortController();
    const reason = new Error("cancelled by caller");
    controller.abort(reason);
    await expect(store.read(userScope, controller.signal)).rejects.toBe(reason);
    await expect(store.commit({
      scope: userScope,
      expectedGeneration: 0,
      replace: { config: makeUserSnapshot(0).config },
    }, controller.signal)).rejects.toBe(reason);
  });

  it("keeps fixture migration inputs and state serialization free of operational canaries", async () => {
    const serialized = JSON.stringify(makeUserSnapshot(0));
    for (const canary of ["CANARY_SECRET_VALUE", "authorization", "x-api-key", "generatedProjection", "NODE_ENV", "/var/lib", "2026-07-12T00:00:00.000Z", "nativeCause"]) {
      expect(serialized.toLowerCase()).not.toContain(canary.toLowerCase());
    }
    const v1 = z.object({ schemaVersion: z.literal(1), value: z.string() }).strict();
    const v2 = z.object({ schemaVersion: z.literal(2), value: z.string(), enabled: z.boolean() }).strict();
    const family = defineVersionedSchemaFamily({
      latestVersion: 2,
      versions: new Map([[1, v1], [2, v2]]),
      migrations: new Map([[1, (value: unknown) => ({ ...(value as object), schemaVersion: 2, enabled: true })]]),
    });
    const migrationInput = fixture("v1/corrupt/migration-v1.json");
    expect((await import("../../src/index.js")).migrateVersionedDocument(family, migrationInput)).toEqual({
      schemaVersion: 2,
      value: "fixture-value",
      enabled: true,
    });
  });
});
