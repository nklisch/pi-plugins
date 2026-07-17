import { describe, expect, it } from "vitest";
import { trustedInstallFlowFixture } from "../fixtures/trusted-install/plugin-install-flow.js";
import { trustedInstallHostileValues } from "../fixtures/trusted-install/hostile-values.js";

describe("trusted installation public-evidence security", () => {
  it("omits values, locators, roots, query contents, native causes, and control text", () => {
    const serialized = JSON.stringify(trustedInstallFlowFixture);
    expect(serialized).not.toContain("secret-v1:");
    expect(serialized).not.toContain(trustedInstallHostileValues.privateProjectRoot);
    expect(serialized).not.toContain(trustedInstallHostileValues.privateContentRoot);
    expect(serialized).not.toContain(trustedInstallHostileValues.callbackFailure);
    expect(serialized).not.toContain("credential=");
    expect(serialized).not.toMatch(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u);
  });

  it("discloses executable structure while binding redacted MCP declarations", () => {
    const mcp = trustedInstallFlowFixture.configureTrust.consent.components.mcpServers[0]!;
    expect(mcp).toMatchObject({ transport: "stdio", environmentNames: [{ text: "MCP_TOKEN" }], toolPolicy: { approval: "required" } });
    expect(trustedInstallFlowFixture.configureTrust.consent.source.endpoint).toMatchObject({ queryPresent: true });
    expect(trustedInstallFlowFixture.configureTrust.consent).not.toHaveProperty("discoveredTools");
  });
});
