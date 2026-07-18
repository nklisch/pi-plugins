import { describe, expect, it } from "vitest";
import { visibleWidth } from "@earendil-works/pi-tui";
import { trustedInstallFlowFixture } from "../../fixtures/trusted-install/plugin-install-flow.js";
import { createPluginInstallState, pluginInstallReducer } from "../../../src/pi/manager/plugin-install-flow.js";
import { TrustedInstallActivationResultSchema } from "../../../src/application/trusted-install-contract.js";
import { PluginInstallComponent, renderPluginInstall } from "../../../src/pi/manager/plugin-install-component.js";

const theme = { fg: (_token: string, text: string) => text, bg: (_token: string, text: string) => text, bold: (text: string) => text } as any;

describe("signed plugin install flow", () => {
  it("preserves choose/inspect → configure/trust → activation-result hierarchy", () => {
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    let lines = renderPluginInstall({ state, width: 84, height: 30, theme });
    expect(lines.join("\n")).toContain("Step 1/3 · Review plugin");
    expect(lines.join("\n")).toContain("Compatibility inventory");
    expect(lines.join("\n")).toContain("1 skills · 1 hooks · 1 MCP servers");

    state = pluginInstallReducer(state, { type: "session-opened", session: trustedInstallFlowFixture.states.missingInput.session });
    lines = renderPluginInstall({ state, width: 84, height: 30, theme });
    expect(lines.join("\n")).toContain("Step 2/3 · Configure and review trust");
    expect(lines.join("\n")).toContain("Executable surface");
    expect(lines.join("\n")).toContain("Expand exact executable disclosure");
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

  it("retains only non-sensitive values across Back while exact evidence remains current", () => {
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    const session = trustedInstallFlowFixture.states.missingInput.session;
    state = pluginInstallReducer(state, { type: "session-opened", session });
    state = pluginInstallReducer(state, { type: "set-value", key: "ROOT", value: "/audit" });
    state = pluginInstallReducer(state, { type: "consent", consentId: session.consent.consentId });
    state = pluginInstallReducer(state, { type: "back" });
    state = pluginInstallReducer(state, { type: "session-opened", session });
    expect(state.values).toEqual({ ROOT: "/audit" });
    expect(state.consentId).toBeUndefined();
    expect(JSON.stringify(state)).not.toContain("SECRET-CANARY");
  });

  it("requires keyboard inspection through the end of exact disclosure before Continue", () => {
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    state = pluginInstallReducer(state, { type: "session-opened", session: trustedInstallFlowFixture.states.missingInput.session });
    state = pluginInstallReducer(state, { type: "toggle-disclosure", key: "executable" });
    state = pluginInstallReducer(state, { type: "focus", focus: "disclosure" });
    const actions: unknown[] = [];
    let component!: PluginInstallComponent;
    const keybindings = {
      matches: (data: string, id: string) => id === "tui.select.confirm" ? data === "\r" : id === "tui.select.pageDown" ? data === "\u001b[6~" : false,
    } as any;
    const onEvent = (event: any) => {
      state = pluginInstallReducer(state, event);
      component.update(state);
    };
    component = new PluginInstallComponent({ state, theme, keybindings, height: () => 6, onEvent, onAction: (action) => actions.push(action) });
    component.render(44);
    component.handleInput("\t");
    component.handleInput("\t");
    component.handleInput("\r");
    expect(actions).toEqual([]);
    onEvent({ type: "focus", focus: "disclosure" });
    for (let index = 0; index < 128; index += 1) {
      component.handleInput("\u001b[6~");
      component.render(44);
    }
    component.handleInput("\t");
    component.handleInput("\t");
    component.handleInput("\r");
    expect(state.consentId).toBe(state.session?.consent.consentId);
    expect(actions).toContainEqual({ type: "continue" });
  });

  it("clears exact consent and retained values whenever authority becomes stale", () => {
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    state = pluginInstallReducer(state, { type: "session-opened", session: trustedInstallFlowFixture.states.missingInput.session });
    state = pluginInstallReducer(state, { type: "set-value", key: "ROOT", value: "/audit" });
    state = pluginInstallReducer(state, { type: "consent", consentId: trustedInstallFlowFixture.configureTrust.consent.consentId });
    expect(state.consentId).toBeDefined();
    state = pluginInstallReducer(state, { type: "activation-result", result: trustedInstallFlowFixture.states.candidateStale });
    expect(state.consentId).toBeUndefined();
    expect(state.values).toEqual({});
    expect(state.session).toBeUndefined();
    expect(state.step).toBe("activation-result");

    state = pluginInstallReducer(state, { type: "authority-stale" });
    expect(state.step).toBe("choose-inspect");
  });

  it("routes owner-provided workflow recovery back through renewed configuration and trust", () => {
    const session = trustedInstallFlowFixture.states.missingInput.session;
    const retry = TrustedInstallActivationResultSchema.parse({
      kind: "recovery-required",
      action: "retry-trust-recovery",
      session,
      progress: [],
      retained: { configuration: true, trust: false },
    });
    let state = createPluginInstallState(trustedInstallFlowFixture.chooseInspect);
    state = pluginInstallReducer(state, { type: "session-opened", session });
    state = pluginInstallReducer(state, { type: "activation-result", result: retry });
    expect(renderPluginInstall({ state, width: 72, height: 20, theme }).join("\n")).toContain("Review recovery configuration");
    state = pluginInstallReducer(state, { type: "session-opened", session: retry.session!, submission: "recover" });
    expect(state).toMatchObject({ step: "configure-trust", submission: "recover" });
    expect(state.consentId).toBeUndefined();
    expect(renderPluginInstall({ state, width: 72, height: 20, theme }).join("\n")).toContain("Retry owner recovery");
  });
});
