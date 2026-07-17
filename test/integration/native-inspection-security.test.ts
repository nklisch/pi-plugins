import { describe, expect, it } from "vitest";
import { SplitInspectorDetailFixtures, SplitInspectorPageFixture } from "../fixtures/native-inspection/split-inspector.js";
import { NativeInspectionLeakageCanaries } from "../fixtures/native-inspection/hostile-values.js";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("native inspection hostile-input and redaction acceptance", () => {
  it("keeps every fixture JSON terminal-safe", () => {
    const values = strings({ page: SplitInspectorPageFixture, details: SplitInspectorDetailFixtures });
    for (const value of values) {
      expect(value).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\ufeff]/u);
    }
    const hostile = SplitInspectorDetailFixtures["hostile-display"];
    expect(hostile.summary.name.escaped).toBe(true);
    expect(hostile.mcpHealth?.servers[0]?.nativeKey.escaped).toBe(true);
    expect(hostile.summary.name.text).toContain("\\u{1B}");
  });

  it("contains none of the path, URL, credential, environment, or native-cause canaries", () => {
    const json = JSON.stringify({ page: SplitInspectorPageFixture, details: SplitInspectorDetailFixtures });
    for (const [key, canary] of Object.entries(NativeInspectionLeakageCanaries)) {
      if (["control", "bidi", "combining", "command", "argument"].includes(key)) continue;
      expect(json, key).not.toContain(canary);
    }
    expect(json).not.toContain("SECRET_");
    expect(json).not.toContain("user:password");
    expect(json).not.toContain("secret-v1:");
  });

  it("keeps semantic actions separate from command grammar", () => {
    for (const detail of Object.values(SplitInspectorDetailFixtures)) {
      for (const diagnostic of detail.diagnostics) {
        expect(diagnostic.action).not.toMatch(/^\//u);
        expect(diagnostic.action).not.toContain("npm ");
        expect(diagnostic.summary.text).not.toContain(diagnostic.action);
      }
    }
  });
});
