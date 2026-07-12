import { describe, expect, it } from "vitest";
import { BoundaryError } from "../../src/domain/errors.js";
import { readClaudeMarketplace } from "../../src/formats/claude/marketplace-reader.js";
import { readCodexMarketplace } from "../../src/formats/codex/marketplace-reader.js";
import { mergeMarketplaces } from "../../src/formats/marketplace-merger.js";

function claudeCatalog(plugins: readonly object[]) {
  return readClaudeMarketplace({ name: "shared-catalog", owner: { name: "claude" }, plugins });
}

function codexCatalog(plugins: readonly object[]) {
  return readCodexMarketplace({ name: "shared-catalog", interface: { displayName: "Codex" }, plugins });
}

const sharedClaude = {
  name: "shared",
  source: "./plugins/shared",
  version: "1.2.3",
  description: "Shared plugin",
  policy: { installation: "AVAILABLE" },
  skills: ["./skills"],
};

const sharedCodex = {
  name: "shared",
  source: { source: "local", path: "./plugins/shared" },
  version: "1.2.3",
  description: "Shared plugin",
  policy: { installation: "AVAILABLE" },
  dependencies: ["runtime-helper"],
};

describe("dual marketplace merger", () => {
  it("uses canonical host and entry ordering, preserving both raw declarations", () => {
    const claude = claudeCatalog([
      { name: "zeta", source: "./plugins/zeta" },
      sharedClaude,
    ]);
    const codex = codexCatalog([
      { name: "alpha", source: "./plugins/alpha", policy: { installation: "NOT_AVAILABLE" } },
      sharedCodex,
    ]);

    const normal = mergeMarketplaces([
      { nativeHost: "claude", result: claude },
      { nativeHost: "codex", result: codex },
    ]);
    const permuted = mergeMarketplaces([
      { nativeHost: "codex", result: { ...codex, marketplace: { ...codex.marketplace, entries: [...codex.marketplace.entries].reverse() } } },
      { nativeHost: "claude", result: { ...claude, marketplace: { ...claude.marketplace, entries: [...claude.marketplace.entries].reverse() } } },
    ]);

    expect(permuted).toEqual(normal);
    expect(normal.marketplace.entries.map((entry) => entry.identity.value.marketplaceEntryName)).toEqual([
      "alpha",
      "shared",
      "zeta",
    ]);
    const shared = normal.marketplace.entries.find((entry) => entry.identity.value.marketplaceEntryName === "shared")!;
    expect(shared.source.value).toEqual({ kind: "marketplace-path", path: "./plugins/shared" });
    expect(shared.source.provenance.map((claim) => claim.location.host)).toEqual(["claude", "codex"]);
    expect(shared.authorities.map((authority) => authority.nativeHost)).toEqual(["claude", "codex"]);
    expect(shared.declarations.map((declaration) => declaration.field)).toEqual(["skills", "dependencies"]);
    expect(shared.rawDeclaration.provenance.map((claim) => claim.location.host)).toEqual(["claude", "codex"]);
  });

  it("drops only conflicting overlaps and keeps valid siblings", () => {
    const result = mergeMarketplaces([
      {
        nativeHost: "claude",
        result: claudeCatalog([
          { name: "conflict", source: "./plugins/one", version: "1" },
          { name: "claude-only", source: "./plugins/claude-only" },
        ]),
      },
      {
        nativeHost: "codex",
        result: codexCatalog([
          { name: "conflict", source: "./plugins/two", version: "1", policy: { installation: "AVAILABLE" } },
          { name: "codex-only", source: "./plugins/codex-only", policy: { installation: "AVAILABLE" } },
        ]),
      },
    ]);

    expect(result.marketplace.entries.map((entry) => entry.identity.value.marketplaceEntryName)).toEqual([
      "claude-only",
      "codex-only",
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "CLAIM_CONFLICT",
      operation: "mergeMarketplaceEntries",
      details: { field: "source" },
    });
    const details = result.diagnostics[0]!.details as { left: { provenance: readonly unknown[] }; right: { provenance: readonly unknown[] } };
    expect(details.left.provenance).toHaveLength(1);
    expect(details.right.provenance).toHaveLength(1);
  });

  it("treats selectors and root identity as fatal to the appropriate scope", () => {
    const left = claudeCatalog([{ name: "shared", source: { source: "url", url: "https://example.com/plugin.git", ref: "main" } }]);
    const right = codexCatalog([{ name: "shared", source: { source: "git-subdir", url: "https://example.com/plugin.git", path: "plugin", ref: "main" }, policy: { installation: "AVAILABLE" } }]);
    const merged = mergeMarketplaces([
      { nativeHost: "claude", result: left },
      { nativeHost: "codex", result: right },
    ]);
    expect(merged.marketplace.entries).toEqual([]);
    expect(merged.diagnostics[0]).toMatchObject({ code: "CLAIM_CONFLICT", details: { field: "source" } });

    expect(() => mergeMarketplaces([
      { nativeHost: "claude", result: claudeCatalog([{ name: "one", source: "./one" }]) },
      { nativeHost: "codex", result: readCodexMarketplace({ name: "different", plugins: [] }) },
    ])).toThrowError(BoundaryError);
    try {
      mergeMarketplaces([
        { nativeHost: "claude", result: claudeCatalog([{ name: "one", source: "./one" }]) },
        { nativeHost: "codex", result: readCodexMarketplace({ name: "different", plugins: [] }) },
      ]);
    } catch (error) {
      expect(error).toMatchObject({
        code: "MARKETPLACE_ROOT_INVALID",
        details: { left: { provenance: [{ location: { host: "claude" } }] }, right: { provenance: [{ location: { host: "codex" } }] } },
      });
    }
  });
});
