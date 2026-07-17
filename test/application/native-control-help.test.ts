import { describe, expect, it } from "vitest";
import { createNativeControlParser } from "../../src/application/native-control-parser.js";

const parser = createNativeControlParser();

describe("native control help and completion", () => {
  it("derives exact metadata from the registry", () => {
    const help = parser.help(["marketplace", "refresh"]);
    expect(help.grammarVersion).toBe("plugin-control/v1");
    expect(help.commands).toMatchObject([{ id: "marketplace.refresh", path: ["marketplace", "refresh"], aliases: [{ path: ["marketplace", "update"] }] }]);
    expect(parser.parseArgv(["help", "marketplace", "refresh"])).toEqual({ kind: "help", help });
  });

  it("completes only static safe metadata and supplied safe candidates", () => {
    const root = parser.complete({ text: "mar", dynamic: [] });
    expect(root.candidates.map((candidate) => candidate.value)).toContain("marketplace add");
    const plugins = parser.complete({ text: "show d", dynamic: [{ category: "plugin", value: "demo@market", safe: { text: "demo@market", escaped: false, truncated: false } }] });
    expect(plugins.candidates).toMatchObject([{ value: "demo@market", kind: "dynamic" }]);
    expect(JSON.stringify(plugins)).not.toContain("token");
  });

  it("reports incomplete quotes without guessing", () => {
    expect(parser.complete({ text: "browse 'par", dynamic: [] })).toMatchObject({ incomplete: true });
  });
});
