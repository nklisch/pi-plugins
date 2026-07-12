import { describe, expect, it } from "vitest";
import { BoundaryError } from "../../../src/domain/errors.js";
import {
  readClaudeMarketplace,
  readClaudeMarketplaceJson,
} from "../../../src/formats/claude/marketplace-reader.js";

const catalog = {
  name: "nklisch-skills",
  owner: { name: "nklisch" },
  plugins: [
    {
      name: "workflow",
      source: "./plugins/workflow",
      description: "Workflow skills",
      category: "productivity",
      tags: ["workflow"],
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    },
    {
      name: "remote",
      source: {
        source: "git-subdir",
        url: "https://github.com/example/catalog.git",
        path: "plugin",
        ref: "main",
      },
      strict: false,
      skills: ["./skills"],
      dependencies: ["other"],
      "presentation/name": "Remote",
    },
  ],
};

describe("Claude marketplace reader", () => {
  it("normalizes the real-shaped catalog forms without resolving content", () => {
    const result = readClaudeMarketplace(catalog);
    expect(result.diagnostics).toEqual([]);
    expect(result.marketplace.name.value).toBe("nklisch-skills");
    expect(result.marketplace.metadata.map((metadata) => metadata.key)).toEqual(["claude.owner"]);

    const workflow = result.marketplace.entries[0]!;
    expect(workflow.source.value).toEqual({ kind: "marketplace-path", path: "./plugins/workflow" });
    expect(workflow.source.provenance[0]?.declaration).toBe("./plugins/workflow");
    expect(workflow.authorities[0]?.strict?.value).toBe(true);
    expect(workflow.authorities[0]?.strict?.provenance[0]?.location.pointer).toBe("/plugins/0");
    expect(workflow.metadata.map((metadata) => metadata.key)).toEqual([
      "claude.category",
      "claude.tags",
    ]);
    expect(workflow.metadata[0]?.claimed.provenance[0]?.declaration).toBe("productivity");
    expect(workflow.metadata[1]?.claimed.provenance[0]?.location.pointer).toBe("/plugins/0/tags");
    expect(workflow.policy?.availability.value).toBe("available");

    const remote = result.marketplace.entries[1]!;
    expect(remote.source.value).toEqual({
      kind: "git-subdir",
      url: "https://github.com/example/catalog.git",
      path: "plugin",
      ref: "main",
    });
    expect(remote.authorities[0]?.manifest.value).toBe("optional");
    expect(remote.authorities[0]?.catalogRuntime.value).toBe("authoritative");
    expect(remote.declarations.map((declaration) => declaration.field)).toEqual(["skills", "dependencies"]);
    expect(remote.metadata.find((metadata) => metadata.key === "claude.presentation/name")?.claimed.provenance[0]?.location.pointer).toBe("/plugins/1/presentation~1name");
    expect(remote.metadata.find((metadata) => metadata.key === "claude.category")).toBeUndefined();
  });

  it("maps all supported Claude source declarations", () => {
    const result = readClaudeMarketplace({
      name: "catalog",
      plugins: [
        { name: "github", source: { source: "github", repo: "owner/repo", ref: "v1" } },
        { name: "url", source: { source: "url", url: "ssh://git@example.com/repo.git", sha: "0123456789abcdef0123456789abcdef01234567" } },
        { name: "subdir", source: { source: "git-subdir", url: "https://example.com/repo.git", path: "./plugin" } },
        { name: "npm", source: { source: "npm", package: "@example/plugin", version: "latest", registry: "https://registry.example.com/" } },
      ],
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.marketplace.entries.map((entry) => entry.source.value)).toEqual([
      { kind: "git", url: "https://github.com/owner/repo.git", ref: "v1" },
      { kind: "git", url: "ssh://git@example.com/repo.git", sha: "0123456789abcdef0123456789abcdef01234567" },
      { kind: "git-subdir", url: "https://example.com/repo.git", path: "plugin" },
      { kind: "npm", package: "@example/plugin", selector: "latest", registry: "https://registry.example.com/" },
    ]);
  });

  it("drops malformed entries atomically and preserves valid siblings", () => {
    const result = readClaudeMarketplace({
      name: "catalog",
      plugins: [
        { name: "good", source: "./good" },
        { name: "bad-source", source: "../escape" },
        { name: "bad-runtime", source: "./runtime", hooks: null },
        { name: "good-two", source: "./two", tags: ["valid"] },
      ],
    });
    expect(result.marketplace.entries.map((entry) => entry.identity.value.marketplaceEntryName)).toEqual(["good", "good-two"]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["SOURCE_INVALID", "ENTRY_INVALID"]);
    expect(result.diagnostics[0]?.location.pointer).toBe("/plugins/1/source");
    expect(result.diagnostics[1]?.location.pointer).toBe("/plugins/2/hooks");
  });

  it("validates nested declarations atomically and reports original indexes", () => {
    const result = readClaudeMarketplace({
      name: "catalog",
      plugins: [
        { name: "bad-list", source: "./bad-list", commands: ["./ok", null] },
        { name: "good", source: "./good", hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo ok" }] }] } },
        { name: "bad-map", source: "./bad-map", mcpServers: { server: null } },
        { name: "good-two", source: "./two" },
        { name: "bad-nested", source: "./other", hooks: { PostToolUse: [null] } },
      ],
    });
    expect(result.marketplace.entries.map((entry) => entry.identity.value.marketplaceEntryName)).toEqual([
      "good",
      "good-two",
    ]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.location?.pointer)).toEqual([
      "/plugins/0/commands/1",
      "/plugins/2/mcpServers/server",
      "/plugins/4/hooks/PostToolUse/0",
    ]);

    try {
      readClaudeMarketplace({
        name: "catalog",
        plugins: [
          { name: "failed", source: "./failed", hooks: null },
          { name: "duplicate", source: "./first" },
          { name: "failed-again", source: "./failed-again", commands: ["ok", 1] },
          { name: "duplicate", source: "./second" },
        ],
      });
      throw new Error("expected duplicate root failure");
    } catch (error) {
      expect(error).toBeInstanceOf(BoundaryError);
      expect((error as BoundaryError).details).toMatchObject({
        first: "/plugins/1",
        duplicate: "/plugins/3",
      });
    }
  });

  it("rejects non-canonical GitHub shorthand before URL synthesis", () => {
    const result = readClaudeMarketplace({
      name: "catalog",
      plugins: [
        { name: "good", source: { source: "github", repo: "owner/repository" } },
        { name: "git-suffix", source: { source: "github", repo: "owner/repository.git" } },
        { name: "extra-segment", source: { source: "github", repo: "owner/repository/extra" } },
        { name: "fragment", source: { source: "github", repo: "owner/repository#main" } },
      ],
    });
    expect(result.marketplace.entries.map((entry) => entry.identity.value.marketplaceEntryName)).toEqual(["good"]);
    expect(result.marketplace.entries[0]?.source.value).toEqual({
      kind: "git",
      url: "https://github.com/owner/repository.git",
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.location?.pointer)).toEqual([
      "/plugins/1/source/repo",
      "/plugins/2/source/repo",
      "/plugins/3/source/repo",
    ]);
  });

  it("treats root failures and JSON syntax failures as boundary errors", () => {
    expect(() => readClaudeMarketplace({ name: "catalog", plugins: [{ name: "x", source: "./x" }, { name: "x", source: "./y" }] })).toThrowError(BoundaryError);
    expect(() => readClaudeMarketplace({ name: "catalog", plugins: "nope" })).toThrowError(BoundaryError);
    try {
      readClaudeMarketplaceJson("{not-json");
      throw new Error("expected invalid JSON");
    } catch (error) {
      expect(error).toBeInstanceOf(BoundaryError);
      expect((error as BoundaryError).code).toBe("MARKETPLACE_ROOT_INVALID");
      expect((error as BoundaryError).operation).toBe("readClaudeMarketplaceJson");
      expect((error as BoundaryError).cause).toBeInstanceOf(SyntaxError);
      expect((error as BoundaryError).toDiagnostic()).not.toHaveProperty("cause");
    }
  });
});
