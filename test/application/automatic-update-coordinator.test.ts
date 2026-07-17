import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAutomaticUpdateCoordinator } from "../../src/application/automatic-update-coordinator.js";
import { createMarketplaceConfigurationRecord, deriveMarketplaceSourceIdentity, derivePluginSourceIdentity, deriveUpdateCandidateKey } from "../../src/domain/update-policy.js";
import { deriveMarketplaceRegistrationId } from "../../src/domain/marketplace-registration.js";
import { deriveUpdateNoticeId } from "../../src/application/native-update-identifiers.js";
import { ContentDigestSchema } from "../../src/domain/content-manifest.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;
const scope = { kind: "user" as const };
const source = { kind: "github" as const, repository: "example/community" };
const marketplaceIdentity = deriveMarketplaceSourceIdentity(source, sha256);
const pluginIdentity = derivePluginSourceIdentity({ kind: "git", url: "https://example.com/demo.git" }, sha256);

function environment() {
  const candidate = deriveUpdateCandidateKey({ scope, plugin: "demo@community", marketplaceSourceIdentity: marketplaceIdentity, pluginSourceIdentity: pluginIdentity, immutableRevision: ContentDigestSchema.parse(`sha256:${"b".repeat(64)}`) }, sha256);
  const id = deriveUpdateNoticeId({ scope, plugin: "demo@community", candidate }, sha256);
  let generation = 0;
  let record: any = createMarketplaceConfigurationRecord({
    marketplace: "community", source, applicationOverride: "automatic",
    notices: [{
      id, scope, plugin: "demo@community",
      registrationId: deriveMarketplaceRegistrationId({ scope, source }, sha256),
      snapshot: `marketplace-snapshot-v1:sha256:${"a".repeat(64)}`,
      candidateId: `marketplace-candidate-v1:sha256:${"a".repeat(64)}`,
      candidate,
      available: { immutableRevision: ContentDigestSchema.parse(`sha256:${"b".repeat(64)}`), marketplaceSourceIdentity: marketplaceIdentity, pluginSourceIdentity: pluginIdentity, sourceRevision: "b".repeat(40) },
      display: { installed: "1.0.0", available: "1.1.0" }, disposition: "automatic-pending", publication: "pending", unread: true, discoveredAt: 1,
      automatic: { state: "pending", reason: "awaiting-host-context" },
    }],
  });
  const snapshot = () => ({ scope, generation, config: { schemaVersion: 4, generation, global: { application: "manual", cadence: "balanced" }, scope: {}, records: [record] }, installed: { schemaVersion: 2, generation, marketplaces: [], plugins: [] }, trust: { schemaVersion: 1, generation, records: [] }, pointers: { schemaVersion: 1, scope, generation, documents: [] }, corruptions: [] }) as any;
  let authority: any = { candidate: "current", source: "stable", target: "current", project: "trusted", recovery: "clear", configuration: "valid", secrets: "available", capability: "available" };
  let context: "available" | "unavailable" = "unavailable";
  let lifecycleResult: any = { kind: "changed" };
  let applyCalls = 0;
  const dependencies = {
    state: { async read() { return { ok: true as const, snapshot: snapshot() }; } },
    inventory: { async discover() { return { scopes: [scope], complete: true }; } },
    mutations: { async runPreparedMutation(_request: any, prepare: any) { const prepared = await prepare({ snapshot: snapshot(), assertOwned: async () => undefined }); record = prepared.mutation.replace.config.records[0]; generation += 1; return { kind: "committed", value: prepared.value, snapshot: snapshot() }; } },
    policy: { async resolve() { return { application: "automatic" as const, winningLevel: "marketplace" as const, sourceGuard: "none" as const }; } },
    lifecycle: { async inspect() { return authority; }, async apply() { applyCalls += 1; return lifecycleResult; } },
    activation: { availability: () => context },
    clock: { nowEpochMilliseconds: () => 100, monotonicMilliseconds: () => 100 }, sha256,
  } as any;
  return {
    id, service: createAutomaticUpdateCoordinator(dependencies),
    setAuthority(value: Partial<typeof authority>) { authority = { ...authority, ...value }; },
    setContext(value: typeof context) { context = value; },
    setResult(value: any) { lifecycleResult = value; },
    notice: () => record.notices[0], applyCalls: () => applyCalls,
  };
}

describe("automatic update coordinator", () => {
  it("records pending without a live reload context and makes zero lifecycle calls", async () => {
    const env = environment();
    await expect(env.service.evaluate({ noticeId: env.id }, signal)).resolves.toMatchObject({ kind: "awaiting-host-context" });
    await expect(env.service.run({ noticeIds: [env.id], limit: 1 }, signal)).resolves.toMatchObject({ outcomes: [{ kind: "pending" }] });
    expect(env.applyCalls()).toBe(0);
    expect(env.notice()).toMatchObject({ disposition: "automatic-pending" });
    expect(env.notice().resolution).toBeUndefined();
  });

  it.each([
    [{ source: "changed" }, "approval-required"],
    [{ candidate: "stale" }, "stale"],
    [{ target: "stale" }, "stale"],
    [{ project: "untrusted" }, "project-untrusted"],
    [{ recovery: "required" }, "recovery-required"],
    [{ configuration: "required" }, "configuration-required"],
    [{ secrets: "unavailable" }, "secret-unavailable"],
    [{ capability: "unavailable" }, "capability-unavailable"],
  ] as const)("rechecks trust/root/configuration/capability drift %j", async (drift, expected) => {
    const env = environment();
    env.setContext("available");
    env.setAuthority(drift);
    await expect(env.service.evaluate({ noticeId: env.id }, signal)).resolves.toMatchObject({ kind: expected });
    expect(env.applyCalls()).toBe(0);
  });

  it("applies through lifecycle only in admitted context and resolves without acknowledging", async () => {
    const env = environment();
    env.setContext("available");
    await expect(env.service.run({ noticeIds: [env.id], limit: 1 }, signal)).resolves.toMatchObject({ outcomes: [{ kind: "applied" }] });
    expect(env.applyCalls()).toBe(1);
    expect(env.notice()).toMatchObject({ disposition: "automatic-applied", unread: true, resolution: { kind: "installed" } });
  });

  it("preserves unresolved state on concurrent stale/rollback and reports recovery authority", async () => {
    const env = environment();
    env.setContext("available");
    env.setResult({ kind: "stale" });
    await expect(env.service.run({ noticeIds: [env.id], limit: 1 }, signal)).resolves.toMatchObject({ outcomes: [{ kind: "stale" }] });
    expect(env.notice().resolution).toBeUndefined();

    const recovery = environment();
    recovery.setContext("available");
    recovery.setResult({ kind: "recovery-required" });
    await recovery.service.run({ noticeIds: [recovery.id], limit: 1 }, signal);
    expect(recovery.notice()).toMatchObject({ disposition: "recovery-required" });
    expect(recovery.notice().resolution).toBeUndefined();
  });
});
