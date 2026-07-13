import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { claim } from "../../src/domain/provenance.js";
import { CompatibilityReportSchema } from "../../src/domain/compatibility.js";
import { createContentManifest } from "../../src/domain/content-manifest.js";
import { NormalizedPluginSchema } from "../../src/domain/plugin.js";
import { createResolvedPluginSource } from "../../src/domain/source.js";
import { createInstalledRevisionRecord } from "../../src/domain/state/installed-state.js";
import {
  createPluginRuntimeProjection,
  createActiveProjectionExpectation,
} from "../../src/application/ports/runtime-projection.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const provenance = { location: { host: "claude" as const, documentKind: "manifest" as const, path: "plugin.json", pointer: "/components" } };
const id = (kind: string, token: string) => `component-v1:${kind}:${token.repeat(64).slice(0, 64)}`;

const plugin = NormalizedPluginSchema.parse({
  identity: { key: "bundle@community", marketplaceName: "community", marketplaceEntryName: "bundle" },
  source: createResolvedPluginSource({ kind: "git", url: "https://example.invalid/bundle.git", revision: "c".repeat(40) }, sha256),
  configuration: { options: [] },
  components: {
    skills: [{ kind: "skill", id: id("skill", "1"), name: claim("bundle-skill", provenance), root: claim("skills/bundle", provenance), metadata: [] }],
    hooks: [{ kind: "hook", id: id("hook", "2"), event: claim("SessionStart", provenance), handler: claim({ kind: "shell", command: "echo ready" }, provenance), metadata: [] }],
    mcpServers: [{ kind: "mcp-server", id: id("mcp-server", "3"), nativeKey: claim("bundle", provenance), declaration: claim({ transport: "stdio", command: "bundle-mcp" }, provenance), metadata: [] }],
    foreign: [],
  },
  metadata: [],
});
const componentIds = [plugin.components.skills[0]!.id, plugin.components.hooks[0]!.id, plugin.components.mcpServers[0]!.id];
const compatibility = CompatibilityReportSchema.parse({
  plugin: plugin.identity,
  activatable: true,
  components: componentIds.map((componentId) => ({ componentId, verdict: { kind: "supported" }, requirementIds: [], diagnostics: [] })),
  requirements: [],
  diagnostics: [],
});
const content = createContentManifest([], sha256);

function revision(scope: { kind: "user" } | { kind: "project"; projectKey: string }) {
  return createInstalledRevisionRecord({ plugin, compatibility, content, scope }, sha256);
}

describe("whole-plugin lifecycle integration contracts", () => {
  it("projects one skill, hook, and MCP bundle through one complete runtime seam", () => {
    const projection = createPluginRuntimeProjection({ scope: { kind: "user" }, plugin, compatibility, revision: revision({ kind: "user" }), sha256 });
    expect(projection.components.skills).toHaveLength(1);
    expect(projection.components.hooks).toHaveLength(1);
    expect(projection.components.mcpServers).toHaveLength(1);
    expect(createActiveProjectionExpectation(projection, sha256).kind).toBe("active");
    expect(JSON.stringify(projection)).not.toContain("example.invalid");
    expect(JSON.stringify(projection)).not.toContain("file://");
  });

  it("keeps identical plugin keys isolated by scope-qualified immutable references", () => {
    const user = createPluginRuntimeProjection({ scope: { kind: "user" }, plugin, compatibility, revision: revision({ kind: "user" }), sha256 });
    const project = createPluginRuntimeProjection({ scope: { kind: "project", projectKey: `project-v1:sha256:${"a".repeat(64)}` }, plugin, compatibility, revision: revision({ kind: "project", projectKey: `project-v1:sha256:${"a".repeat(64)}` }), sha256 });
    expect(user.plugin).toBe(project.plugin);
    expect(user.digest).not.toBe(project.digest);
    expect(user.dataRef).not.toBe(project.dataRef);
  });
});
