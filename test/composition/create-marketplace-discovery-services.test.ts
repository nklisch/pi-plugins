import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createNodeMarketplaceDiscoveryServices } from "../../src/composition/create-marketplace-discovery-services.js";
import { deriveProjectKey } from "../../src/domain/state/scope.js";
import type { Sha256 } from "../../src/domain/source.js";

const sha256: Sha256 = (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest());

describe("marketplace discovery composition", () => {
  it("constructs one inert capability and keeps internal candidate resolution private", () => {
    const read = vi.fn();
    const discover = vi.fn();
    const materialize = vi.fn();
    const inspect = vi.fn();
    const assess = vi.fn();
    const identity = { kind: "path-only" as const, canonicalRoot: "file:///project/", limitation: "identity-changes-with-canonical-root" as const };
    const currentProject = { kind: "project" as const, identity, projectKey: deriveProjectKey(identity, sha256) };
    const services = createNodeMarketplaceDiscoveryServices({
      state: { read, commit: vi.fn() } as never,
      inventory: { discover } as never,
      mutations: { runPreparedMutation: vi.fn() } as never,
      clock: { nowEpochMilliseconds: () => 0, monotonicMilliseconds: () => 0 },
      claimIds: { create: vi.fn() } as never,
      materializers: { marketplaces: { materialize } as never },
      inspection: { inspect } as never,
      content: {} as never,
      currentProject,
      projectTrust: { assess } as never,
      sha256,
      userHome: "/home/test",
    });

    expect(Object.keys(services).sort()).toEqual(["adoption", "catalog", "policy", "refresh", "registration"]);
    expect(Object.keys(services.catalog).sort()).toEqual(["detail", "search"]);
    expect(services.catalog).not.toHaveProperty("resolve");
    expect(read).not.toHaveBeenCalled();
    expect(discover).not.toHaveBeenCalled();
    expect(materialize).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
    expect(assess).not.toHaveBeenCalled();
  });
});
