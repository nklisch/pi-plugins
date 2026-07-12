import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { reconcilePluginBundle } from "../../src/application/bundle-reconciler.js";
import { readClaudePluginManifest } from "../../src/formats/claude/manifest-reader.js";
import { readClaudeHooks } from "../../src/formats/claude/hook-reader.js";
import { readClaudeMarketplace } from "../../src/formats/claude/marketplace-reader.js";
import { readCodexMarketplace } from "../../src/formats/codex/marketplace-reader.js";
import { readCodexPluginManifest } from "../../src/formats/codex/manifest-reader.js";
import { mergeMarketplaces } from "../../src/formats/marketplace-merger.js";
import { createResolvedPluginSource } from "../../src/domain/source.js";
import { claim } from "../../src/domain/provenance.js";
import type { ForeignComponentDeclaration, PluginManifestClaims } from "../../src/domain/bundle-ingestion.js";
import type { NormalizedMarketplaceEntry } from "../../src/domain/marketplace.js";

const sha256 = (bytes: Uint8Array): Uint8Array =>
  new Uint8Array(createHash("sha256").update(bytes).digest());
const plugin = "demo@catalog" as const;

function entryForClaude(fields: Record<string, unknown> = {}): NormalizedMarketplaceEntry {
  const result = readClaudeMarketplace({
    name: "catalog",
    plugins: [{ name: "demo", source: "./plugin", strict: false, ...fields }],
  });
  const entry = result.marketplace.entries[0];
  if (entry === undefined) throw new Error("missing test entry");
  return entry;
}

function source(entry: NormalizedMarketplaceEntry) {
  return createResolvedPluginSource({
    kind: "marketplace-path",
    marketplaceRevision: "a".repeat(40),
    path: entry.source.value.path,
  }, sha256);
}

function manifest(host: "claude" | "codex", value: unknown): PluginManifestClaims {
  const result = host === "claude"
    ? readClaudePluginManifest(value, { plugin, path: ".claude-plugin/plugin.json" })
    : readCodexPluginManifest(value, { plugin, path: ".codex-plugin/plugin.json" });
  if (!result.ok) throw new Error(result.diagnostics[0]?.message ?? "manifest failed");
  return result.value;
}

function foreignFromEntry(entry: NormalizedMarketplaceEntry): ForeignComponentDeclaration[] {
  return entry.declarations.map((declaration) => {
    const provenance = declaration.declaration.provenance[0];
    if (provenance === undefined) throw new Error("test declaration is missing provenance");
    return {
      nativeHost: declaration.nativeHost,
      nativeKind: claim(declaration.field, provenance),
      declarationKey: provenance.location.pointer ?? `/${declaration.field}`,
      declaration: declaration.declaration,
    };
  });
}

function reconcile(
  entry: NormalizedMarketplaceEntry,
  input: Partial<Parameters<typeof reconcilePluginBundle>[0]> = {},
) {
  return reconcilePluginBundle({
    entry,
    source: source(entry),
    manifestClaims: [],
    configuration: [],
    components: [],
    metadata: [],
    sha256,
    ...input,
  });
}

describe("complete plugin bundle reconciliation", () => {
  it("materializes catalog foreign declarations with exact provenance", () => {
    const entry = entryForClaude({ agents: "./agents" });
    const declarations = foreignFromEntry(entry);
    const result = reconcile(entry, { foreignDeclarations: declarations });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.components.foreign).toHaveLength(1);
    expect(result.value.components.foreign[0]).toMatchObject({
      nativeHost: "claude",
      nativeKind: { value: "agents" },
      declaration: { value: "./agents", provenance: [{ location: { pointer: "/plugins/0/agents" } }] },
    });
  });

  it("merges configuration and produces byte-for-byte deterministic output across input order", () => {
    const entry = entryForClaude({ agents: "./agents", commands: "./commands" });
    const declarations = foreignFromEntry(entry);
    const config = manifest("claude", {
      name: "demo",
      userConfig: { TOKEN: { type: "string", title: "Token", sensitive: true } },
    });
    const first = reconcile(entry, {
      foreignDeclarations: declarations,
      manifestClaims: [config],
    });
    const second = reconcile(entry, {
      foreignDeclarations: [...declarations].reverse(),
      manifestClaims: [config],
    });
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.configuration.options).toMatchObject([{ key: "TOKEN", sensitive: true }]);
    expect(first.value.components.foreign.map((component) => component.nativeKind.value).sort()).toEqual([
      "agents",
      "commands",
    ]);
  });

  it("fails closed when a component kind and id disagree", () => {
    const entry = entryForClaude();
    const hooks = readClaudeHooks({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo" }] }] } }, {
      plugin,
      nativeHost: "claude",
      provenance: {
        location: { host: "claude", documentKind: "hooks", path: "hooks/hooks.json", pointer: "" },
      },
    });
    expect(hooks.ok).toBe(true);
    if (!hooks.ok) return;
    const hook = hooks.value[0];
    if (hook === undefined || hook.kind !== "hook") throw new Error("missing hook");
    const mismatched = {
      ...hook,
      kind: "mcp-server" as const,
      nativeKey: hook.event,
    };
    const result = reconcile(entry, { components: [mismatched as never] });
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: "SCHEMA_INVALID" }] });
    expect(result).not.toHaveProperty("value");
  });

  it("reports contradictory dual-manifest locators without precedence", () => {
    const claude = readClaudeMarketplace({
      name: "catalog",
      plugins: [{ name: "demo", source: "./plugin", strict: false }],
    });
    const codex = readCodexMarketplace({
      name: "catalog",
      plugins: [{ name: "demo", source: "./plugin", policy: { installation: "AVAILABLE" } }],
    });
    const merged = mergeMarketplaces([
      { nativeHost: "codex", result: codex },
      { nativeHost: "claude", result: claude },
    ]);
    const entry = merged.marketplace.entries[0];
    if (entry === undefined) throw new Error("missing merged entry");
    const claudeManifest = readClaudePluginManifest(
      { name: "demo", skills: "./claude-skills" },
      { plugin, path: ".claude-plugin/plugin.json" },
    );
    const codexManifest = readCodexPluginManifest(
      { name: "demo", skills: "./codex-skills" },
      { plugin, path: ".codex-plugin/plugin.json" },
    );
    expect(claudeManifest.ok).toBe(true);
    expect(codexManifest.ok).toBe(true);
    if (!claudeManifest.ok || !codexManifest.ok) return;
    const result = reconcile(entry, { manifestClaims: [claudeManifest.value, codexManifest.value] });
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: "CLAIM_CONFLICT", details: { field: "locator.skill\u0000skills" } }],
    });
  });
});
