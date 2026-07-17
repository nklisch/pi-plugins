import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createNativeUpdatePolicyService } from "../../src/application/native-update-policy-service.js";
import { GenerationSchema, HostConfigDocumentSchemaV4 } from "../../src/domain/state/config-state.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;

function environment() {
  let generation = 0;
  let config = HostConfigDocumentSchemaV4.parse({
    schemaVersion: 4,
    generation: GenerationSchema.parse(0),
    global: { application: "manual", cadence: "balanced" },
    scope: {},
    records: [],
  });
  const snapshot = () => ({
    scope: { kind: "user" as const },
    generation: GenerationSchema.parse(generation),
    pointers: { schemaVersion: 1, scope: { kind: "user" }, generation, documents: [] },
    config,
    installed: { schemaVersion: 2, generation, marketplaces: [], plugins: [] },
    trust: { schemaVersion: 1, generation, records: [] },
    corruptions: [],
  }) as any;
  const state = { async read() { return { ok: true as const, snapshot: snapshot() }; } };
  const mutations = {
    async runPreparedMutation(request: any, prepare: any) {
      if (request.expectedGeneration !== generation) return { kind: "stale-generation" as const, expected: request.expectedGeneration, actual: generation };
      const prepared = await prepare({ snapshot: snapshot(), assertOwned: async () => undefined });
      generation += 1;
      config = HostConfigDocumentSchemaV4.parse({ ...prepared.mutation.replace.config, generation });
      return { kind: "committed" as const, value: prepared.value, snapshot: snapshot() };
    },
  };
  const dependencies = {
    state, mutations,
    inventory: { async discover() { return { scopes: [{ kind: "user" as const }], complete: true }; } },
    sha256,
    clock: { nowEpochMilliseconds: () => 100, monotonicMilliseconds: () => 100 },
  } as any;
  return { service: createNativeUpdatePolicyService(dependencies), dependencies, config: () => config };
}

describe("native update policy service", () => {
  it("previews automatic breadth, requires exact consent, and applies through CAS", async () => {
    const env = environment();
    const change = { kind: "application" as const, target: { kind: "global" as const }, mode: "automatic" as const };
    const result = await env.service.preview(change, signal);
    expect(result.kind).toBe("previewed");
    if (result.kind !== "previewed") return;
    expect(result.preview.consent).toMatchObject({ required: true, disclosure: "global-current-and-future" });
    await expect(env.service.apply({ change, expectedPreviewId: result.preview.previewId }, signal)).resolves.toMatchObject({ kind: "rejected", code: "CONSENT_REQUIRED" });
    await expect(env.service.apply({ change, expectedPreviewId: result.preview.previewId, consent: { kind: "grant", consentId: result.preview.consent.consentId! } }, signal)).resolves.toMatchObject({ kind: "changed" });
    expect(env.config().global.application).toBe("automatic");
  });

  it("makes a reused preview stale after another process commits", async () => {
    const env = environment();
    const second = createNativeUpdatePolicyService(env.dependencies);
    const change = { kind: "cadence" as const, target: { kind: "global" as const }, cadence: "frequent" as const };
    const preview = await env.service.preview(change, signal);
    if (preview.kind !== "previewed") throw new Error("expected preview");
    await expect(env.service.apply({ change, expectedPreviewId: preview.preview.previewId }, signal)).resolves.toMatchObject({ kind: "changed" });
    await expect(second.apply({ change, expectedPreviewId: preview.preview.previewId }, signal)).resolves.toMatchObject({ kind: "stale", reason: "preview" });
  });

  it("reports network-free global and lease-safe status", async () => {
    const env = environment();
    await expect(env.service.status({ scope: "all-current" }, signal)).resolves.toMatchObject({
      global: { application: "manual", cadence: "balanced" },
      scopes: [{ ownership: "none", clock: "current" }],
      inventoryComplete: true,
    });
  });
});
