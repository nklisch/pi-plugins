import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createContentManifest,
} from "../../src/domain/content-manifest.js";
import {
  createResolvedMarketplaceSource,
  createResolvedPluginSource,
  type Sha256,
} from "../../src/domain/source.js";
import {
  createSourceMaterializers,
  SourceMaterializationError,
  type SecureContentSession,
  type SourceMaterializationDependencies,
} from "../../src/application/source-materialization.js";

const sha256: Sha256 = (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = (): AbortSignal => new AbortController().signal;
const marketplace = createResolvedMarketplaceSource({
  declared: { kind: "local-git", path: "/marketplace" },
  revision: "a".repeat(40),
}, sha256);
const plugin = createResolvedPluginSource({
  kind: "git",
  url: "https://example.test/plugin.git",
  revision: "b".repeat(40),
}, sha256);

function session(options: { failFinalize?: boolean } = {}): SecureContentSession & { aborts: number } {
  const content = createContentManifest([], sha256);
  const value = {
    aborts: 0,
    async add() {},
    async finalize() {
      if (options.failFinalize) throw new Error("finalize failed");
      return { root: "/slot/content", content };
    },
    async abort() { value.aborts += 1; },
  };
  return value;
}

function dependencies(overrides: Partial<SourceMaterializationDependencies> = {}): SourceMaterializationDependencies {
  const current = session();
  return {
    content: { open: vi.fn(async () => current) },
    git: {
      materializeMarketplace: vi.fn(async () => marketplace),
      materializePlugin: vi.fn(async () => plugin),
    },
    npm: { materialize: vi.fn(async () => plugin) },
    sha256,
    ...overrides,
  };
}

describe("source materialization application contract", () => {
  it("dispatches external plugin sources and verifies the resolved handoff", async () => {
    const deps = dependencies();
    const result = await createSourceMaterializers(deps).plugins.materialize(
      { kind: "git", url: "https://example.test/plugin.git" },
      { kind: "external" },
      { root: "/slot" },
      signal(),
    );
    expect(result.root).toBe("/slot/content");
    expect(result.source).toEqual(plugin);
    expect(deps.git.materializePlugin).toHaveBeenCalledOnce();
  });

  it("rejects context mismatches before opening a sink", async () => {
    const deps = dependencies();
    await expect(createSourceMaterializers(deps).plugins.materialize(
      { kind: "marketplace-path", path: "../escape" },
      { kind: "external" },
      { root: "/slot" },
      signal(),
    )).rejects.toMatchObject({ code: "PATH_CONTAINMENT_FAILED", classification: "security" });
    expect(deps.content.open).not.toHaveBeenCalled();
  });

  it("cleans before rethrowing adapter failures and never returns a partial handoff", async () => {
    const current = session();
    const deps = dependencies({
      content: { open: vi.fn(async () => current) },
      git: {
        materializeMarketplace: vi.fn(async () => { throw new Error("secret remote stderr"); }),
        materializePlugin: vi.fn(async () => plugin),
      },
    });
    const materializers = createSourceMaterializers(deps);
    await expect(materializers.marketplaces.materialize(
      { kind: "local-git", path: "/marketplace" },
      { root: "/slot" },
      signal(),
    )).rejects.toMatchObject({ code: "ADAPTER_FAILED" });
    expect(current.aborts).toBe(1);
  });

  it("preserves caller cancellation instead of converting it to a diagnostic", async () => {
    const controller = new AbortController();
    const reason = new Error("caller cancelled");
    controller.abort(reason);
    const deps = dependencies();
    await expect(createSourceMaterializers(deps).marketplaces.materialize(
      { kind: "local-git", path: "/marketplace" },
      { root: "/slot" },
      controller.signal,
    )).rejects.toBe(reason);
    expect(deps.content.open).not.toHaveBeenCalled();
  });

  it("exposes a classified boundary error without leaking adapter text", () => {
    const error = new SourceMaterializationError({
      code: "SOURCE_RESOLUTION_FAILED",
      classification: "transient",
      operation: "resolveGitSource",
      message: "network unavailable",
    });
    expect(error.toDiagnostic().code).toBe("SOURCE_RESOLUTION_FAILED");
    expect(error.classification).toBe("transient");
  });
});
