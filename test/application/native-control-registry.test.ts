import { describe, expect, it } from "vitest";
import {
  NativeControlCommandRegistry,
  NativeControlCommandSchema,
  nativeControlCommandIds,
} from "../../src/application/native-control-registry.js";

describe("native control registry", () => {
  it("owns one unique canonical path and complete command metadata", () => {
    const ids = nativeControlCommandIds();
    expect(ids).toHaveLength(32);
    expect(new Set(ids).size).toBe(ids.length);
    const paths = ids.map((id) => NativeControlCommandRegistry[id].path.join(" "));
    expect(new Set(paths).size).toBe(paths.length);
    for (const definition of Object.values(NativeControlCommandRegistry)) {
      expect(definition.request).toBeDefined();
      expect(definition.response).toBeDefined();
      expect(definition.safety).toMatch(/^(pure|local-read|remote-read|mutation|operation-control)$/);
      expect(definition.input).toMatch(/^(none|confirmation|configuration|decision)$/);
    }
  });

  it("derives direct command validation from request schemas", () => {
    expect(NativeControlCommandSchema.parse({
      command: "marketplace.list",
      request: { scope: "user", limit: 50 },
      invocation: { grammarVersion: "plugin-control/v1", output: "json", nonInteractive: true, input: { kind: "none" } },
    })).toMatchObject({ command: "marketplace.list", request: { scope: "user" } });
    expect(() => NativeControlCommandSchema.parse({
      command: "marketplace.list",
      request: { scope: "user", limit: 50, secret: "canary" },
      invocation: { grammarVersion: "plugin-control/v1", output: "json", nonInteractive: true, input: { kind: "none" } },
    })).toThrow();
  });
});
