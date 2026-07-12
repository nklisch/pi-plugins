import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readClaudePluginManifest } from "../../src/formats/claude/manifest-reader.js";
import { readCodexPluginManifest } from "../../src/formats/codex/manifest-reader.js";
import { mergePluginManifestClaims } from "../../src/formats/manifest-merger.js";
import { PluginKeySchema } from "../../src/domain/identity.js";

const sha256 = (bytes: Uint8Array): Uint8Array =>
  new Uint8Array(createHash("sha256").update(bytes).digest());
const plugin = PluginKeySchema.parse("demo@catalog");

function read(host: "claude" | "codex", value: unknown) {
  const result = host === "claude"
    ? readClaudePluginManifest(value, { plugin, path: ".claude-plugin/plugin.json" })
    : readCodexPluginManifest(value, { plugin, path: ".codex-plugin/plugin.json" });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message);
  return result.value;
}

describe("dual plugin manifest merger", () => {
  it("combines complementary claims and merges equivalent claims in Claude-then-Codex order", () => {
    const claude = read("claude", {
      name: "demo",
      version: "1.0.0",
      description: "same",
      skills: "./skills/",
      author: { name: "nklisch" },
    });
    const codex = read("codex", {
      name: "demo",
      version: "1.0.0",
      description: "same",
      skills: "./skills",
      hooks: "./hooks/hooks.json",
      interface: { displayName: "Demo" },
    });

    const normal = mergePluginManifestClaims([codex, claude], sha256);
    const permuted = mergePluginManifestClaims([claude, codex], sha256);
    expect(normal).toEqual(permuted);
    expect(normal.ok).toBe(true);
    if (!normal.ok) return;
    expect(normal.value.locators.map((locator) => locator.target)).toEqual([
      { kind: "file", path: "./hooks/hooks.json" },
      { kind: "directory", path: "./skills" },
    ]);
    const skill = normal.value.locators.find((locator) => locator.componentKind === "skill")!;
    expect(skill.provenance.map((item) => item.location.host)).toEqual(["claude", "codex"]);
    expect(normal.value.metadata.map((item) => item.key)).toEqual([
      "claude.author",
      "codex.interface",
    ]);
  });

  it("returns CLAIM_CONFLICT with both claim snapshots for overlapping identity and version conflicts", () => {
    const claude = read("claude", { name: "demo", version: "1.0.0" });
    const codex = read("codex", { name: "other", version: "2.0.0" });
    const result = mergePluginManifestClaims([claude, codex], sha256);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      diagnostics: [{
        code: "CLAIM_CONFLICT",
        details: {
          field: "name",
          left: { provenance: [{ location: { host: "claude" } }] },
          right: { provenance: [{ location: { host: "codex" } }] },
        },
      }],
    });
    expect(result).not.toHaveProperty("value");
  });

  it("treats same manifest-field paths as conflicting but distinct roots as complementary", () => {
    const claude = read("claude", { name: "demo", skills: "./skills" });
    const codex = read("codex", { name: "demo", skills: "./other-skills" });
    const result = mergePluginManifestClaims([claude, codex], sha256);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ diagnostics: [{ code: "CLAIM_CONFLICT", details: { field: "locator.skill\u0000skills" } }] });
  });

  it("retains unsupported declarations without assigning compatibility verdicts", () => {
    const claude = read("claude", { name: "demo", agents: "./agents" });
    const codex = read("codex", { name: "demo", apps: "./.app.json" });
    const result = mergePluginManifestClaims([claude, codex], sha256);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.foreign.map((item) => item.nativeKind.value)).toEqual(["agents", "apps"]);
    expect(result.value).not.toHaveProperty("verdict");
    expect(result.value.foreign[0]?.declaration.provenance[0]?.location.host).toBe("claude");
  });

  it("uses map keys as semantic subkeys without using their source pointers", () => {
    const result = read("codex", {
      name: "demo",
      apps: {
        remote: { command: "remote" },
        local: { command: "local" },
      },
    });

    expect(result.foreign).toHaveLength(2);
    expect(result.foreign.map((item) => item.declarationSubkey)).toEqual(["key:local", "key:remote"]);
    expect(result.foreign.map((item) => item.declaration.provenance[0]?.location.pointer)).toEqual([
      "/apps/local",
      "/apps/remote",
    ]);
  });
});
