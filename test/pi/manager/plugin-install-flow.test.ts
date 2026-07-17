import { describe, expect, it } from "vitest";
import { visibleWidth } from "@earendil-works/pi-tui";
import { trustedInstallFlowFixture } from "../../fixtures/trusted-install/plugin-install-flow.js";
import { createPluginInstallState, pluginInstallReducer } from "../../../src/pi/manager/plugin-install-flow.js";
import { renderPluginInstall } from "../../../src/pi/manager/plugin-install-component.js";

const theme = { fg: (_token: string, text: string) => text, bg: (_token: string, text: string) => text, bold: (text: string) => text } as any;

describe("signed plugin install flow", () => {
  it("preserves choose/inspect → configure/trust → activation-result hierarchy", () => {
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    let lines = renderPluginInstall({ state, width: 84, height: 30, theme });
    expect(lines.join("\n")).toContain("Step 1/3 · Choose and inspect");
    expect(lines.join("\n")).toContain("Compatibility inventory");
    expect(lines.join("\n")).toContain("1 skills · 1 hooks · 1 MCP servers");

    state = pluginInstallReducer(state, { type: "session-opened", session: trustedInstallFlowFixture.states.missingInput.session });
    lines = renderPluginInstall({ state, width: 84, height: 30, theme });
    expect(lines.join("\n")).toContain("Step 2/3 · Configure and trust");
    expect(lines.join("\n")).toContain("Executable surface");
    expect(lines.join("\n")).toContain("exact hook commands");
    expect(lines.join("\n")).not.toContain("bundle-hook");

    state = pluginInstallReducer(state, { type: "toggle-disclosure", key: "executable" });
    lines = renderPluginInstall({ state, width: 84, height: 30, theme });
    expect(lines.join("\n")).toContain("bundle-hook");
    expect(lines.join("\n")).toContain("bundle-mcp");

    state = pluginInstallReducer(state, { type: "activation-result", result: trustedInstallFlowFixture.activationResult });
    lines = renderPluginInstall({ state, width: 84, height: 30, theme });
    expect(lines.join("\n")).toContain("Step 3/3 · Activation result");
    expect(lines.join("\n")).toContain("succeeded");
    expect(lines.join("\n")).toContain("1 discoverable skills");
    expect(lines.every((line) => visibleWidth(line) <= 84)).toBe(true);
  });

  it.each([
    trustedInstallFlowFixture.states.cancelled,
    trustedInstallFlowFixture.states.candidateStale,
    trustedInstallFlowFixture.states.rolledBack,
    trustedInstallFlowFixture.states.recoveryRequired,
  ])("renders owner result truth without treating cancellation as stronger evidence", (result) => {
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    state = pluginInstallReducer(state, { type: "activation-result", result });
    const output = renderPluginInstall({ state, width: 58, height: 20, theme }).join("\n");
    expect(output).toContain(result.kind);
    if (result.kind === "recovery-required") expect(output).toContain("run-recovery");
    if (result.kind === "rolled-back") expect(output).toContain("restored");
  });

  it("clears exact consent whenever authority becomes stale", () => {
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    state = pluginInstallReducer(state, { type: "session-opened", session: trustedInstallFlowFixture.states.missingInput.session });
    state = pluginInstallReducer(state, { type: "consent", consentId: trustedInstallFlowFixture.configureTrust.consent.consentId });
    expect(state.consentId).toBeDefined();
    state = pluginInstallReducer(state, { type: "authority-stale" });
    expect(state.consentId).toBeUndefined();
    expect(state.step).toBe("choose-inspect");
  });
});
