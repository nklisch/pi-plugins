import { describe, expect, it } from "vitest";
import { BoundaryError } from "../../../src/domain/errors.js";
import {
  readCodexMarketplace,
  readCodexMarketplaceJson,
} from "../../../src/formats/codex/marketplace-reader.js";

describe("Codex marketplace reader", () => {
  it("normalizes native and Claude-compatible sources", () => {
    const result = readCodexMarketplace({
      name: "codex-catalog",
      interface: { displayName: "Codex Catalog" },
      plugins: [
        {
          name: "local",
          source: { source: "local", path: "./plugins/local" },
          policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
          category: "Productivity",
          interface: { displayName: "Local" },
        },
        {
          name: "remote",
          source: { source: "git-subdir", url: "https://github.com/example/plugins.git", path: "plugin", ref: "main" },
          policy: { installation: "INSTALLED_BY_DEFAULT" },
          skills: ["./skills"],
        },
        {
          name: "compatible",
          source: "./plugins/compatible",
          policy: { installation: "NOT_AVAILABLE" },
        },
      ],
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.marketplace.metadata.map((metadata) => metadata.key)).toEqual(["codex.interface"]);
    expect(result.marketplace.entries.map((entry) => entry.source.value)).toEqual([
      { kind: "marketplace-path", path: "./plugins/local" },
      { kind: "git-subdir", url: "https://github.com/example/plugins.git", path: "plugin", ref: "main" },
      { kind: "marketplace-path", path: "./plugins/compatible" },
    ]);
    expect(result.marketplace.entries.map((entry) => entry.policy?.availability.value)).toEqual([
      "available",
      "installed-by-default",
      "not-available",
    ]);
    expect(result.marketplace.entries[0]?.authorities[0]).toMatchObject({
      nativeHost: "codex",
      manifest: { value: "required" },
      catalogRuntime: { value: "supplemental" },
    });
    expect(result.marketplace.entries[0]?.authorities[0]).not.toHaveProperty("strict");
    expect(result.marketplace.entries[0]?.metadata.map((metadata) => metadata.key)).toEqual(["codex.interface"]);
    expect(result.marketplace.entries[1]?.declarations[0]?.field).toBe("skills");
  });

  it("drops missing/unknown policy, Claude strictness, and malformed entries atomically", () => {
    const result = readCodexMarketplace({
      name: "codex-partial",
      plugins: [
        { name: "good", source: { source: "local", path: "./good" }, policy: { installation: "AVAILABLE" } },
        { name: "missing-policy", source: "./missing" },
        { name: "unknown-policy", source: "./unknown", policy: { installation: "MAYBE" } },
        { name: "claude-strict", source: "./strict", strict: true, policy: { installation: "AVAILABLE" } },
        { name: "bad-runtime", source: "./runtime", policy: { installation: "AVAILABLE" }, hooks: null },
        { name: "good-sibling", source: "./sibling", policy: { installation: "NOT_AVAILABLE" } },
      ],
    });
    expect(result.marketplace.entries.map((entry) => entry.identity.value.marketplaceEntryName)).toEqual(["good", "good-sibling"]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "ENTRY_INVALID",
      "ENTRY_INVALID",
      "ENTRY_INVALID",
      "ENTRY_INVALID",
    ]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.location.pointer)).toEqual([
      "/plugins/1/policy",
      "/plugins/2/policy/installation",
      "/plugins/3/strict",
      "/plugins/4/hooks",
    ]);
  });

  it("rejects unsupported source forms and preserves exact source declarations", () => {
    const result = readCodexMarketplace({
      name: "codex-catalog",
      plugins: [
        { name: "unsupported", source: { source: "github", repo: "owner/repo" }, policy: { installation: "AVAILABLE" } },
        { name: "traversal", source: { source: "local", path: "./../escape" }, policy: { installation: "AVAILABLE" } },
        { name: "good", source: { source: "local", path: "./good" }, policy: { installation: "AVAILABLE" } },
      ],
    });
    expect(result.marketplace.entries).toHaveLength(1);
    expect(result.marketplace.entries[0]?.source.provenance[0]?.declaration).toEqual({ source: "local", path: "./good" });
    expect(result.diagnostics.map((diagnostic) => diagnostic.location.pointer)).toEqual([
      "/plugins/0/source/source",
      "/plugins/1/source/path",
    ]);
  });

  it("maps JSON syntax and root failures to typed boundary errors", () => {
    try {
      readCodexMarketplaceJson("[1,2,3]");
      throw new Error("expected root failure");
    } catch (error) {
      expect(error).toBeInstanceOf(BoundaryError);
      expect((error as BoundaryError).code).toBe("MARKETPLACE_ROOT_INVALID");
      expect((error as BoundaryError).location?.pointer).toBe("/");
    }
    try {
      readCodexMarketplaceJson("{broken");
      throw new Error("expected JSON failure");
    } catch (error) {
      expect(error).toBeInstanceOf(BoundaryError);
      expect((error as BoundaryError).operation).toBe("readCodexMarketplaceJson");
      expect((error as BoundaryError).cause).toBeInstanceOf(SyntaxError);
    }
  });
});
