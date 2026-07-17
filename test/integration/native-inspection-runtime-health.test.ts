import { describe, expect, it } from "vitest";
import { SplitInspectorDetailFixtures } from "../fixtures/native-inspection/split-inspector.js";

describe("native inspection runtime health acceptance", () => {
  it("keeps exact MCP registration active when remote health fails", () => {
    const detail = SplitInspectorDetailFixtures["mcp-remote-failed"];
    expect(detail.activation?.state).toBe("active");
    expect(detail.mcpHealth?.localRegistration).toBe("matching");
    expect(detail.mcpHealth?.servers[0]?.state).toBe("failed");
    expect(detail.summary.condition).toBe("degraded");
    expect(detail.diagnostics.map((item) => item.code)).toEqual(["MCP_REMOTE_HEALTH_FAILED"]);
  });

  it("never presents pending recovery or project-untrusted state as active success", () => {
    const recovery = SplitInspectorDetailFixtures["recovery-required"];
    const untrusted = SplitInspectorDetailFixtures["project-untrusted"];
    expect(recovery.activation?.state).toBe("recovery-required");
    expect(recovery.summary.condition).toBe("blocked");
    expect(untrusted.activation?.state).toBe("blocked");
    expect(untrusted.trust).toBe("project-untrusted");
  });

  it("treats exact disabled inactivity as ready", () => {
    const disabled = SplitInspectorDetailFixtures.disabled;
    expect(disabled.activation).toMatchObject({ intent: "disabled", state: "inactive" });
    expect(disabled.summary.condition).toBe("ready");
  });
});
