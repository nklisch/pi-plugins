import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createUpdateNotificationService, pruneUpdateNotices } from "../../src/application/update-notification-service.js";
import { createMarketplaceConfigurationRecord, deriveMarketplaceSourceIdentity, derivePluginSourceIdentity, deriveUpdateCandidateKey, UpdateNoticeSchema } from "../../src/domain/update-policy.js";
import { deriveMarketplaceRegistrationId } from "../../src/domain/marketplace-registration.js";
import { deriveUpdateNoticeId } from "../../src/application/native-update-identifiers.js";
import { ContentDigestSchema } from "../../src/domain/content-manifest.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;
const scope = { kind: "user" as const };
const source = { kind: "github" as const, repository: "example/community" };
const pluginSource = { kind: "git" as const, url: "https://example.com/demo.git" };
const marketplaceIdentity = deriveMarketplaceSourceIdentity(source, sha256);
const pluginIdentity = derivePluginSourceIdentity(pluginSource, sha256);

function environment(publisher?: any) {
  let generation = 0;
  let record = createMarketplaceConfigurationRecord({ marketplace: "community", source });
  const snapshot = () => ({
    scope, generation,
    config: { schemaVersion: 4, generation, global: { application: "manual", cadence: "balanced" }, scope: {}, records: [record] },
    installed: { schemaVersion: 2, generation, marketplaces: [], plugins: [] },
    trust: { schemaVersion: 1, generation, records: [] }, pointers: { schemaVersion: 1, scope, generation, documents: [] }, corruptions: [],
  }) as any;
  let queue = Promise.resolve();
  const dependencies = {
    state: { async read() { return { ok: true as const, snapshot: snapshot() }; } },
    inventory: { async discover() { return { scopes: [scope], complete: true }; } },
    mutations: {
      async runPreparedMutation(request: any, prepare: any) {
        let release!: () => void;
        const previous = queue;
        queue = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        try {
          if (request.expectedGeneration !== generation) return { kind: "stale-generation", expected: request.expectedGeneration, actual: generation };
          const prepared = await prepare({ snapshot: snapshot(), assertOwned: async () => undefined });
          record = prepared.mutation.replace.config.records[0];
          generation += 1;
          return { kind: "committed", value: prepared.value, snapshot: snapshot() };
        } finally { release(); }
      },
    },
    clock: { nowEpochMilliseconds: () => 10, monotonicMilliseconds: () => 10 }, sha256,
    ...(publisher === undefined ? {} : { publisher }),
  } as any;
  return { dependencies, service: createUpdateNotificationService(dependencies), record: () => record };
}

function discovery() {
  const candidate = deriveUpdateCandidateKey({ scope, plugin: "demo@community", marketplaceSourceIdentity: marketplaceIdentity, pluginSourceIdentity: pluginIdentity, immutableRevision: ContentDigestSchema.parse(`sha256:${"b".repeat(64)}`) }, sha256);
  return {
    scope,
    registrationId: deriveMarketplaceRegistrationId({ scope, source }, sha256),
    snapshot: `marketplace-snapshot-v1:sha256:${"a".repeat(64)}` as any,
    candidateId: `marketplace-candidate-v1:sha256:${"a".repeat(64)}` as any,
    plugin: "demo@community" as const,
    candidate,
    available: { immutableRevision: ContentDigestSchema.parse(`sha256:${"b".repeat(64)}`), marketplaceSourceIdentity: marketplaceIdentity, pluginSourceIdentity: pluginIdentity, sourceRevision: "b".repeat(40) },
    display: { installed: "1.0.0", available: "1.1.0" },
  };
}

describe("update notification service", () => {
  it("records one exact notice across concurrent writers and separates unread from unresolved", async () => {
    const env = environment();
    const other = createUpdateNotificationService(env.dependencies);
    const [left, right] = await Promise.all([env.service.record([discovery()], signal), other.record([discovery()], signal)]);
    expect([...left, ...right]).toHaveLength(1);
    const page = await env.service.list({ scope: "all-current", limit: 50 }, signal);
    expect(page).toMatchObject({ unreadCount: 1, unresolvedCount: 1 });
    const id = page.notices[0]!.id;
    const ack = await env.service.acknowledge({ ids: [id] }, signal);
    expect(ack).toMatchObject({ acknowledged: [id], unreadCount: 0, unresolvedCount: 1 });
    const again = await env.service.acknowledge({ ids: [id] }, signal);
    expect(again).toMatchObject({ alreadyRead: [id], unresolvedCount: 1 });
  });

  it("retries a lost publisher response without a second visible event", async () => {
    const visible = new Set<string>();
    let calls = 0;
    const env = environment({
      async publish(event: { id: string }) {
        calls += 1;
        const duplicate = visible.has(event.id);
        visible.add(event.id);
        if (calls === 1) throw new Error("response lost");
        return duplicate ? "already-published" : "published";
      },
    });
    await env.service.record([discovery()], signal);
    expect(await env.service.dispatch({}, signal)).toMatchObject({ failed: 1, pending: 1 });
    expect(await env.service.dispatch({}, signal)).toMatchObject({ published: [expect.any(String)], pending: 0 });
    expect(visible.size).toBe(1);
    expect(env.record().notices[0]?.publication).toBe("published");
  });

  it("never prunes unread or unresolved notices and bounds acknowledged tombstones", () => {
    const exact = discovery();
    const notices = Array.from({ length: 70 }, (_, index) => {
      const candidate = deriveUpdateCandidateKey({ scope, plugin: exact.plugin, marketplaceSourceIdentity: marketplaceIdentity, pluginSourceIdentity: pluginIdentity, immutableRevision: ContentDigestSchema.parse(`sha256:${index.toString(16).padStart(64, "0")}`) }, sha256);
      return UpdateNoticeSchema.parse({
        id: deriveUpdateNoticeId({ scope, plugin: exact.plugin, candidate }, sha256), scope, plugin: exact.plugin,
        registrationId: exact.registrationId, snapshot: exact.snapshot, candidateId: exact.candidateId, candidate,
        available: { ...exact.available, immutableRevision: ContentDigestSchema.parse(`sha256:${index.toString(16).padStart(64, "0")}`) },
        display: exact.display, disposition: "manual-required", publication: "published", unread: false,
        discoveredAt: index, acknowledgedAt: index, resolution: { kind: "superseded", at: index },
      });
    });
    const unresolved = UpdateNoticeSchema.parse({ ...notices[0]!, id: `update-notice-v1:sha256:${"f".repeat(64)}`, unread: true, acknowledgedAt: undefined, resolution: undefined });
    const retained = pruneUpdateNotices([...notices, unresolved]);
    expect(retained).toHaveLength(65);
    expect(retained).toContainEqual(unresolved);
  });
});
