import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createProjectRootAuthorityPort } from "../../src/composition/create-project-root-authority.js";
import type { TrustedProjectRoot } from "../../src/application/ports/project-root-authority.js";
import {
  CanonicalProjectRootSchema,
  ProjectIdentitySchema,
  createScopeContext,
  deriveProjectKey,
  type ScopeContext,
} from "../../src/domain/state/scope.js";
import { SourceHashSchema } from "../../src/domain/source.js";

const sha256 = (bytes: Uint8Array): Uint8Array =>
  new Uint8Array(createHash("sha256").update(bytes).digest());
const root = CanonicalProjectRootSchema.parse("file:///home/example/project/");
const identity = ProjectIdentitySchema.parse({
  kind: "repository",
  canonicalRoot: root,
  repositoryFingerprint: SourceHashSchema.parse(`sha256:${"11".repeat(32)}`),
});
const project = createScopeContext({
  kind: "project",
  identity,
  projectKey: deriveProjectKey(identity, sha256),
}, sha256);

function authority(resolved: ScopeContext = project) {
  return createProjectRootAuthorityPort({ resolve: async () => resolved }, sha256);
}

describe("project-root authority port", () => {
  it("issues only from the adapter acquisition boundary and rejects spread copies", async () => {
    const port = authority();
    const capability = await port.acquire(new AbortController().signal);

    expect(port.verify(capability, project)).toEqual(project);
    expect(() => port.verify({ ...capability } as unknown as TrustedProjectRoot, project)).toThrow(/capability/);
    expect(() => port.verify(JSON.parse(JSON.stringify(capability)), project)).toThrow(/capability/);
  });

  it("does not expose a domain self-issuer for an attacker-selected root", async () => {
    const alternateIdentity = ProjectIdentitySchema.parse({
      ...identity,
      canonicalRoot: CanonicalProjectRootSchema.parse("file:///home/attacker/plugin/"),
    });
    const alternateScope = createScopeContext({
      kind: "project",
      identity: alternateIdentity,
      projectKey: deriveProjectKey(alternateIdentity, sha256),
    }, sha256);
    const port = authority();
    const capability = await port.acquire(new AbortController().signal);

    expect(() => port.verify(capability, alternateScope)).toThrow(/capability|identity/);
    expect("createTrustedProjectRoot" in (await import("../../src/domain/state/scope.js"))).toBe(false);
  });
});
