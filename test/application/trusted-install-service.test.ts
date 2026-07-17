import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createTrustedInstallationService } from "../../src/application/trusted-install-service.js";
import { deriveInspectionDetailId, deriveInspectionEvidenceSnapshotId } from "../../src/application/native-inspection-identifiers.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const revision = `sha256:${"1".repeat(64)}` as never;
const projectionDigest = `sha256:${"2".repeat(64)}` as never;
const registrationId = `marketplace-registration-v1:sha256:${"3".repeat(64)}` as never;
const candidateId = `marketplace-candidate-v1:sha256:${"4".repeat(64)}` as never;
const catalogSnapshot = `marketplace-snapshot-v1:sha256:${"5".repeat(64)}` as never;
const projectKey = `project-v1:sha256:${"6".repeat(64)}` as never;
const subject = { version: 1 as const, subject: "marketplace-candidate" as const, scope: { kind: "user" as const }, plugin: "demo@market" as never, registrationId, candidateId, catalogSnapshot };
const detailId = deriveInspectionDetailId(subject, sha256);
const safe = (text: string) => ({ text, escaped: false, truncated: false });
const components = { counts: { skills: 0, hooks: 0, mcpServers: 0, foreign: 0 }, skills: [], hooks: [], mcpServers: [], foreign: [] };
const binding = {
  scope: { kind: "user" as const }, registrationId, candidateId, catalogSnapshot, plugin: "demo@market" as never,
  sourceIdentity: `sha256:${"7".repeat(64)}` as never, immutableRevision: revision, contentDigest: `sha256:${"8".repeat(64)}` as never,
  compatibilityFingerprint: `sha256:${"9".repeat(64)}` as never, configurationDescriptorDigest: `sha256:${"a".repeat(64)}` as never,
  trustSubject: `trust-subject-v1:sha256:${"b".repeat(64)}` as never, executableSurfaceDigest: `sha256:${"c".repeat(64)}` as never,
  capabilityDigest: `sha256:${"d".repeat(64)}` as never,
};
const snapshotBinding = {
  capturedAt: 1, scopes: [{ scope: { kind: "user" as const }, generation: 0, status: "ready" as const, corruptionCodes: [] }],
  currentProject: { projectKey, trust: { kind: "trusted" as const }, epoch: `sha256:${"e".repeat(64)}` as never },
  catalogs: [{ registrationId, snapshot: catalogSnapshot, cache: { kind: "ready" as const, validator: { kind: "git-commit" as const, revision: "a".repeat(40) }, etag: { kind: "not-applicable" as const } } }],
  capability: { status: "ready" as const, digest: binding.capabilityDigest, capturedBy: "fixture" },
  runtimeEpoch: `sha256:${"f".repeat(64)}` as never, recoveryDigest: `sha256:${"0".repeat(64)}` as never, updateDigest: `sha256:${"1".repeat(64)}` as never,
};
const snapshotId = deriveInspectionEvidenceSnapshotId(snapshotBinding, sha256);

function makeCandidate(releaseError = false) {
  const release = vi.fn(async () => { if (releaseError) throw new Error("cleanup failed"); });
  return {
    lease: { release }, binding,
    resolved: { scope: { kind: "user" }, entry: { source: { value: { kind: "git", url: "https://example.invalid/plugin.git" } } }, marketplace: { root: "/private/market", source: {}, content: { rootDigest: binding.contentDigest }, binding: binding.contentDigest } },
    plugin: { configuration: { options: [] } }, revision: { revision }, trust: { subject: binding.trustSubject }, snapshotBinding,
    fields: [],
    detail: {
      snapshotId, summary: { detailId, subject: "marketplace-candidate", scope: { kind: "user" }, plugin: "demo@market", name: safe("demo"), marketplace: safe("market"), revision: { immutable: revision, resolution: "exact" }, condition: "ready", freshness: { status: "current", basis: "marketplace" }, diagnosticCounts: { error: 0, warning: 0, info: 0 } },
      source: { kind: "git", identity: binding.sourceIdentity, endpoint: { scheme: "https", host: safe("example.invalid"), path: safe("/plugin.git"), queryPresent: false, fragmentPresent: false } }, provenance: [],
      compatibility: { status: "activatable", reportFingerprint: binding.compatibilityFingerprint, components, requirements: [] }, trust: "required", configuration: [], lifecycle: { installed: false, transition: "none", update: "not-applicable" }, diagnostics: [],
    },
    consent: { consentId: `trusted-install-consent-v1:sha256:${"2".repeat(64)}` as never, source: { kind: "git", identity: binding.sourceIdentity, endpoint: { scheme: "https", host: safe("example.invalid"), path: safe("/plugin.git"), queryPresent: false, fragmentPresent: false } }, immutableRevision: revision, executableSurfaceDigest: binding.executableSurfaceDigest, components, requirements: [], persistentData: true, configurationEnvironmentNames: [], subagentInterception: "not-declared", remoteMcpDiscovery: "not-performed", statement: safe("Grant exact trust") },
    release,
  } as never;
}

function setup(options: { trustGate?: Promise<void>; releaseError?: boolean; sessionIdFailure?: boolean } = {}) {
  let id = 0;
  const candidates: ReturnType<typeof makeCandidate>[] = [];
  const candidateService = {
    acquire: vi.fn(async () => { const candidate = makeCandidate(options.releaseError); candidates.push(candidate); return { kind: "ready" as const, candidate }; }),
    validate: vi.fn(async () => "current" as const),
  };
  const trustGrant = vi.fn(async () => { await options.trustGate; return { kind: "recorded" as const, subject: binding.trustSubject, generation: 1 }; });
  const composition = createTrustedInstallationService({
    candidate: candidateService,
    configuration: { save: vi.fn(), remove: vi.fn() } as never,
    configurationAuthority: { readExact: vi.fn() },
    configurationInput: () => ({ pathContext: { scope: { kind: "user" }, trustedBaseDirectory: "/session/cwd" }, paths: { normalizeAndInspect: vi.fn() }, secretCustody: { status: "available", explanation: "ready" } }) as never,
    trust: { grant: trustGrant },
    lifecycle: {
      state: { read: vi.fn(async () => ({ ok: true, snapshot: { installed: { plugins: [] } } })) } as never,
      prepared: { installPrepared: vi.fn(async () => ({ kind: "changed", operation: "install", snapshot: {}, observation: { kind: "active", scope: binding.scope, plugin: binding.plugin, revision, projectionDigest } })) } as never,
      publicLifecycle: { enable: vi.fn() } as never,
    },
    evidence: { capture: vi.fn(async () => ({ binding: snapshotBinding })), validate: vi.fn(async () => "current") } as never,
    projectRoots: { acquire: vi.fn(), verify: vi.fn() } as never,
    clock: { nowEpochMilliseconds: () => 1000 as never, monotonicMilliseconds: () => 0 },
    sessionIds: { create: async () => {
      if (options.sessionIdFailure) throw new Error("id unavailable");
      return `2d6737b6-7482-4a50-9310-${String(++id).padStart(12, "0")}` as never;
    } },
    hostEpoch: `sha256:${"3".repeat(64)}` as never, sha256,
  });
  const openRequest = { inspectionSnapshotId: snapshotId, detailId };
  const submission = { expectedVersion: 0, nonSensitive: [], sensitive: [], consent: { kind: "grant" as const, consentId: `trusted-install-consent-v1:sha256:${"2".repeat(64)}` as never } };
  return { composition, candidateService, trustGrant, candidates, openRequest, submission };
}

describe("trusted installation service", () => {
  it("runs the same open/activate engine and requires exact observed activation", async () => {
    const value = setup();
    const opened = await value.composition.application.open(value.openRequest, new AbortController().signal);
    expect(opened.kind).toBe("opened");
    if (opened.kind !== "opened") return;
    const result = await value.composition.application.activate({ token: opened.session.token, submission: value.submission }, { onProgress: () => { throw new Error("CANARY_CALLBACK"); } }, new AbortController().signal);
    expect(result).toMatchObject({ kind: "succeeded", revision, projectionDigest });
    expect(JSON.stringify(result)).not.toContain("CANARY_CALLBACK");
    expect(value.trustGrant).toHaveBeenCalledTimes(1);
  });

  it("returns complete missing input without trust or lifecycle mutation", async () => {
    const value = setup();
    const result = await value.composition.application.run(value.openRequest, {}, new AbortController().signal);
    expect(result.kind).toBe("needs-input");
    if (result.kind === "needs-input") expect(result.issues).toEqual([{ code: "CONSENT_REQUIRED" }]);
    expect(value.trustGrant).not.toHaveBeenCalled();
  });

  it("rejects duplicate concurrent activation and prevents replay", async () => {
    let resolve!: () => void;
    const gate = new Promise<void>((done) => { resolve = done; });
    const value = setup({ trustGate: gate });
    const opened = await value.composition.application.open(value.openRequest, new AbortController().signal);
    if (opened.kind !== "opened") throw new Error("open failed");
    const first = value.composition.application.activate({ token: opened.session.token, submission: value.submission }, {}, new AbortController().signal);
    await Promise.resolve();
    const duplicate = await value.composition.application.activate({ token: opened.session.token, submission: value.submission }, {}, new AbortController().signal);
    expect(duplicate).toMatchObject({ kind: "conflict", reason: "operation-in-progress" });
    resolve();
    expect((await first).kind).toBe("succeeded");
    expect((await value.composition.application.activate({ token: opened.session.token, submission: value.submission }, {}, new AbortController().signal)).kind).toBe("succeeded");
    expect(value.trustGrant).toHaveBeenCalledTimes(1);
  });

  it("reports cleanup failure instead of claiming clean cancellation", async () => {
    const value = setup({ releaseError: true });
    const opened = await value.composition.application.open(value.openRequest, new AbortController().signal);
    if (opened.kind !== "opened") throw new Error("open failed");
    await expect(value.composition.application.cancel({ token: opened.session.token }, new AbortController().signal))
      .resolves.toMatchObject({ kind: "accepted", state: "failed" });
    const status = await value.composition.application.status({ token: opened.session.token }, new AbortController().signal);
    expect(status).toMatchObject({ kind: "found", result: { kind: "failed", code: "CLEANUP_FAILED" } });
  });

  it("releases acquired content when session identifier creation fails", async () => {
    const value = setup({ sessionIdFailure: true });
    await expect(value.composition.application.open(value.openRequest, new AbortController().signal))
      .resolves.toMatchObject({ kind: "unavailable", code: "SESSION_UNAVAILABLE" });
    expect(value.candidates[0]!.release).toHaveBeenCalledTimes(1);
  });

  it("cancels before durable preflight and disposes unclaimed content", async () => {
    const value = setup();
    const opened = await value.composition.application.open(value.openRequest, new AbortController().signal);
    if (opened.kind !== "opened") throw new Error("open failed");
    await expect(value.composition.application.cancel({ token: opened.session.token }, new AbortController().signal)).resolves.toMatchObject({ kind: "accepted", state: "cancelled" });
    expect(value.candidates[0]!.release).toHaveBeenCalledTimes(1);
    expect(value.trustGrant).not.toHaveBeenCalled();
  });
});
