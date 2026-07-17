import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createNativeInspectionService, NativeInspectionError } from "../../src/application/native-inspection-service.js";
import { deriveInspectionDetailId, deriveInspectionEvidenceSnapshotId } from "../../src/application/native-inspection-identifiers.js";
import { NativeInspectionSummarySchema } from "../../src/application/native-inspection-contract.js";
import { toSafeDisplayField } from "../../src/application/native-inspection-display.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const revision = `sha256:${"11".repeat(32)}` as never;
const registrationId = `marketplace-registration-v1:sha256:${"22".repeat(32)}` as never;
const catalogSnapshot = `marketplace-snapshot-v1:sha256:${"33".repeat(32)}` as never;
const candidateId = `marketplace-candidate-v1:sha256:${"44".repeat(32)}` as never;
const safe = (text: string) => toSafeDisplayField(text, { maxScalars: 256 });

function snapshot(generation = 0) {
  return {
    binding: {
      capturedAt: 1,
      scopes: [{ scope: { kind: "user" }, generation, status: "ready", corruptionCodes: [] }],
      currentProject: { projectKey: `project-v1:sha256:${"55".repeat(32)}`, trust: { kind: "trusted" }, epoch: `sha256:${"66".repeat(32)}` },
      catalogs: [{ registrationId, snapshot: catalogSnapshot, cache: { kind: "ready", validator: { kind: "git-commit", revision: "a".repeat(40) }, etag: { kind: "not-applicable" } } }],
      capability: { status: "ready", digest: `sha256:${"77".repeat(32)}`, capturedBy: "fixture" },
      runtimeEpoch: `sha256:${"88".repeat(32)}`,
      recoveryDigest: `sha256:${"99".repeat(32)}`,
      updateDigest: `sha256:${"aa".repeat(32)}`,
    },
    states: [{ ok: true, snapshot: { scope: { kind: "user" }, generation, corruptions: [], installed: { plugins: [{ plugin: "zeta@market", selectedRevision: revision }], marketplaces: [] }, config: { records: [] }, trust: { records: [] } } }],
    currentProject: { identity: { kind: "path-only", canonicalRoot: "file:///project/", limitation: "identity-changes-with-canonical-root" }, projectKey: `project-v1:sha256:${"55".repeat(32)}`, trust: { kind: "trusted" } },
    runtime: [], recovery: { results: [], deferred: false, processed: 0 },
    startup: { status: "ready", blocked: [], capabilities: { mcp: { status: "unavailable", explanation: "none" }, subagents: { status: "unavailable", explanation: "none" }, piReload: { status: "available", explanation: "ready" }, secrets: { status: "available", explanation: "ready" } } },
  } as never;
}

function setup() {
  let current = snapshot();
  const evidence = { capture: vi.fn(async () => current), validate: vi.fn(async () => "current" as const) };
  const installedSubject = { version: 1 as const, subject: "installed" as const, scope: { kind: "user" as const }, plugin: "zeta@market" as never, selectedRevision: revision };
  const installedSummary = NativeInspectionSummarySchema.parse({
    detailId: deriveInspectionDetailId(installedSubject, sha256), subject: "installed", scope: { kind: "user" }, plugin: "zeta@market",
    name: safe("zeta"), marketplace: safe("market"), revision: { installed: safe("1.0.0"), immutable: revision, resolution: "exact" },
    condition: "ready", freshness: { status: "current", basis: "state" }, diagnosticCounts: { error: 0, warning: 0, info: 0 },
  });
  const installed = { inspect: vi.fn(async () => ({ kind: "found" as const, detail: { summary: installedSummary, diagnostics: [] } as never })) };
  const candidates = { inspect: vi.fn() };
  const catalog = { search: vi.fn(async () => ({
    candidates: [{
      id: candidateId, snapshot: catalogSnapshot, scope: { kind: "user" }, registrationId, plugin: "alpha@market", marketplace: "market", name: "alpha",
      available: { kind: "marketplace-snapshot", marketplaceRevision: "a".repeat(40), snapshot: catalogSnapshot, declaredVersion: "2.0.0" },
    }],
    observations: [],
  })), detail: vi.fn() };
  const service = createNativeInspectionService({
    evidence: evidence as never,
    installed: installed as never,
    candidates: candidates as never,
    catalog: catalog as never,
    adoption: { preview: vi.fn(async () => ({ candidates: [], documents: [{ kind: "missing", document: "claude-marketplaces", host: "claude", path: ".claude/plugins/known_marketplaces.json" }], diagnostics: [] })) } as never,
    clock: { nowEpochMilliseconds: () => 1 } as never,
    sha256,
  });
  return { service, evidence, installed, candidates, catalog, current: () => current, setGeneration: (value: number) => { current = snapshot(value); } };
}

describe("native inspection service", () => {
  it("sorts unified subjects and paginates with snapshot-bound cursors", async () => {
    const value = setup();
    const first = await value.service.list({ subjects: ["installed", "marketplace-candidate"], scope: "all-current", query: "", limit: 1 }, new AbortController().signal);
    expect(first.items.map((item) => item.subject)).toEqual(["installed"]);
    expect(first.nextCursor).toBeDefined();
    const second = await value.service.list({ subjects: ["installed", "marketplace-candidate"], scope: "all-current", query: "", limit: 1, cursor: first.nextCursor }, new AbortController().signal);
    expect(second.items.map((item) => item.plugin)).toEqual(["alpha@market"]);
    expect(value.candidates.inspect).not.toHaveBeenCalled();
    expect(value.catalog.search).toHaveBeenCalled();
  });

  it("rejects cursor and detail replay after authority changes", async () => {
    const value = setup();
    const page = await value.service.list({ subjects: ["installed", "marketplace-candidate"], scope: "all-current", query: "", limit: 1 }, new AbortController().signal);
    const oldSnapshot = page.snapshotId;
    value.setGeneration(1);
    await expect(value.service.list({ subjects: ["installed", "marketplace-candidate"], scope: "all-current", query: "", limit: 1, cursor: page.nextCursor }, new AbortController().signal)).rejects.toEqual(expect.objectContaining({ code: "CURSOR_STALE" }));
    await expect(value.service.detail({ snapshotId: oldSnapshot, detailId: page.items[0]!.detailId }, new AbortController().signal)).resolves.toEqual({ kind: "stale", action: "retry-read" });
  });

  it("reports a clean host without adoption-missing warnings", async () => {
    const value = setup();
    const report = await value.service.diagnose({ target: { kind: "host" }, includeAdoption: true }, new AbortController().signal);
    expect(report.snapshotId).toBe(deriveInspectionEvidenceSnapshotId(value.current().binding, sha256));
    expect(report.condition).toBe("ready");
    expect(report.diagnostics).toEqual([]);
  });

  it("returns invalid-id without probing detail inspectors", async () => {
    const value = setup();
    const result = await value.service.detail({ snapshotId: deriveInspectionEvidenceSnapshotId(value.current().binding, sha256), detailId: "inspection-detail-v1:bad." + "0".repeat(64) as never }, new AbortController().signal);
    expect(result).toEqual({ kind: "invalid-id" });
    expect(value.installed.inspect).not.toHaveBeenCalled();
    expect(value.candidates.inspect).not.toHaveBeenCalled();
  });

  it("serializes stale errors without native detail", () => {
    expect(JSON.stringify(new NativeInspectionError("SNAPSHOT_STALE"))).toBe('{"code":"SNAPSHOT_STALE"}');
  });
});
