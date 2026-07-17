import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createInstalledRevisionDescriptor, verifyInstalledRevisionDescriptor } from "../../src/application/installed-revision-descriptor.js";
import { CompatibilityReportSchema } from "../../src/domain/compatibility.js";
import { createContentManifest } from "../../src/domain/content-manifest.js";
import { NormalizedPluginSchema } from "../../src/domain/plugin.js";
import { createInstalledRevisionRecord } from "../../src/domain/state/installed-state.js";
import { createResolvedMarketplaceSource, createResolvedPluginSource } from "../../src/domain/source.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());

function fixture() {
  const source = createResolvedPluginSource({ kind: "marketplace-path", marketplaceRevision: "a".repeat(40), path: "./plugin" }, sha256);
  const plugin = NormalizedPluginSchema.parse({
    identity: { key: "fixture@community", marketplaceName: "community", marketplaceEntryName: "fixture" },
    source,
    configuration: { options: [] },
    components: { skills: [], hooks: [], mcpServers: [], foreign: [] },
    metadata: [],
  });
  const compatibility = CompatibilityReportSchema.parse({ plugin: plugin.identity, activatable: true, components: [], requirements: [], diagnostics: [] });
  const content = createContentManifest([], sha256);
  const revision = createInstalledRevisionRecord({ plugin, compatibility, content, scope: { kind: "user" } }, sha256);
  const loaded = {
    plugin,
    compatibility,
    marketplaceSource: createResolvedMarketplaceSource({ declared: { kind: "github", repository: "example/plugins" }, revision: "a".repeat(40) }, sha256),
    content,
    binding: revision.revision,
  };
  return { revision, loaded };
}

describe("installed revision descriptor", () => {
  it("seals exact normalized reconstruction evidence", () => {
    const { revision, loaded } = fixture();
    const descriptor = createInstalledRevisionDescriptor({ loaded, revision, sha256 });
    expect(verifyInstalledRevisionDescriptor(descriptor, revision, sha256)).toEqual(descriptor);
    expect(() => verifyInstalledRevisionDescriptor({ ...descriptor, digest: `sha256:${"f".repeat(64)}` }, revision, sha256)).toThrow();
    expect(JSON.stringify(revision)).not.toContain("marketplaceSource");
  });
});
