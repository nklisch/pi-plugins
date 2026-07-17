import { describe, expect, it } from "vitest";
import { NativeInspectionDetailSchema } from "../../src/application/native-inspection-contract.js";
import { TrustedInstallActivationResultSchema, TrustedInstallConsentDisclosureSchema, TrustedInstallConfigurationFieldSchema } from "../../src/application/trusted-install-contract.js";
import { trustedInstallFlowFixture } from "../fixtures/trusted-install/plugin-install-flow.js";

describe("trusted installation signed three-step flow", () => {
  it("provides schema-valid choose/inspect, configure/trust, and activation-result evidence", () => {
    expect(NativeInspectionDetailSchema.parse(trustedInstallFlowFixture.chooseInspect).compatibility.components.counts).toEqual({ skills: 1, hooks: 1, mcpServers: 1, foreign: 0 });
    expect(trustedInstallFlowFixture.configureTrust.fields.map((field) => TrustedInstallConfigurationFieldSchema.parse(field).key)).toEqual(["NAME", "ROOT", "TOKEN"]);
    expect(TrustedInstallConsentDisclosureSchema.parse(trustedInstallFlowFixture.configureTrust.consent)).toMatchObject({ remoteMcpDiscovery: "not-performed", subagentInterception: "available" });
    expect(TrustedInstallActivationResultSchema.parse(trustedInstallFlowFixture.activationResult)).toMatchObject({ kind: "succeeded", components: { skills: 1, hooks: 1, mcpServers: 1 } });
  });

  it("contains data only, with no command, terminal, renderer, or HTML contract", () => {
    const serialized = JSON.stringify(trustedInstallFlowFixture);
    expect(serialized).not.toMatch(/<html|keybinding|terminalWidget|render\(/i);
  });
});
