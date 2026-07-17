import { describe, expect, it } from "vitest";
import { CompatibilityPolicyRegistry } from "../../src/domain/compatibility-policy.js";
import { analyzeMcpCompatibility } from "../../src/domain/mcp-compatibility-plan.js";
import {
  McpEnvironmentNameSchema,
  McpHeaderNameSchema,
  McpLaunchTemplateError,
  McpLaunchTemplateSchemaV1,
  createMcpLaunchTemplate,
} from "../../src/domain/mcp-launch-template.js";
import { mcp } from "../fixtures/compatibility/mcp.js";

function component(declaration: Record<string, unknown>, token = "1") {
  return mcp(declaration, token) as never;
}

function template(declaration: Record<string, unknown>, token = "1") {
  return createMcpLaunchTemplate(component(declaration, token));
}

describe("canonical MCP launch templates", () => {
  it("canonicalizes aliases and declaration order into one deterministic secret-free shape", () => {
    const first = template({
      env: { ZED: "${ZED}", ALPHA: "${user_config.NAME}" },
      workingDirectory: "${PLUGIN_ROOT}/server",
      args: ["--root", "${CLAUDE_PLUGIN_ROOT}"],
      command: "node",
      type: "stdio",
    });
    const second = template({
      type: "stdio",
      command: "node",
      args: ["--root", "${CLAUDE_PLUGIN_ROOT}"],
      workingDirectory: "${PLUGIN_ROOT}/server",
      env: { ALPHA: "${user_config.NAME}", ZED: "${ZED}" },
    }, "2");
    expect(first).toEqual(second);
    expect(first).toEqual({
      schemaVersion: 1,
      transport: "stdio",
      command: "node",
      args: ["--root", "${CLAUDE_PLUGIN_ROOT}"],
      cwd: "${PLUGIN_ROOT}/server",
      env: [
        { name: "ALPHA", value: "${user_config.NAME}" },
        { name: "ZED", value: "${ZED}" },
      ],
    });
    expect(McpLaunchTemplateSchemaV1.parse(first)).toEqual(first);
  });

  it("uses registry launch aliases instead of a parallel template vocabulary", () => {
    const aliases = CompatibilityPolicyRegistry.mcp.keys.fieldGroups.workingDirectory.aliases as unknown as string[];
    const original = [...aliases];
    try {
      aliases.push("executionDirectory");
      const candidate = component({
        transport: "stdio",
        command: "node",
        executionDirectory: "${PLUGIN_ROOT}/server",
      });
      expect(analyzeMcpCompatibility({
        plugin: "demo@community",
        component: candidate,
      }).kind).toBe("supported");
      expect(createMcpLaunchTemplate(candidate, "demo@community")).toMatchObject({
        cwd: "${PLUGIN_ROOT}/server",
      });

      aliases.splice(aliases.indexOf("executionDirectory"), 1);
      expect(analyzeMcpCompatibility({
        plugin: "demo@community",
        component: candidate,
      }).kind).toBe("incompatible");
      expect(() => createMcpLaunchTemplate(candidate, "demo@community")).toThrow(McpLaunchTemplateError);
    } finally {
      aliases.splice(0, aliases.length, ...original);
    }
  });

  it("canonicalizes HTTP headers and bearer selectors without credential plaintext", () => {
    expect(template({
      type: "http",
      url: "https://example.invalid/mcp?access_token=${user_config.TOKEN}",
      headers: {
        "X-Trace": "static-safe",
        Authorization: "Bearer ${HTTP_TOKEN}",
      },
    })).toEqual({
      schemaVersion: 1,
      transport: "streamable-http",
      url: "https://example.invalid/mcp?access_token=${user_config.TOKEN}",
      headers: [
        { name: "Authorization", value: { kind: "template", template: "Bearer ${HTTP_TOKEN}" } },
        { name: "X-Trace", value: { kind: "template", template: "static-safe" } },
      ],
    });
    expect(template({
      transport: "streamable-http",
      url: "https://example.invalid/mcp",
      auth: { type: "bearer", env: "MCP_TOKEN" },
    }, "3")).toMatchObject({ bearerToken: { kind: "environment", name: "MCP_TOKEN" } });
  });

  it.each([
    { transport: "stdio", type: "http", command: "node" },
    { command: "node", cwd: "/one", workingDirectory: "/two" },
    { command: "node", env: { API_TOKEN: "plaintext" } },
    { type: "http", url: "https://example.invalid", headers: { Authorization: "Bearer plaintext" } },
    { type: "http", url: "https://example.invalid?api_key=plaintext" },
    { type: "http", url: "https://example.invalid", headers: { Alpha: "one", alpha: "two" } },
    { type: "http", url: "https://example.invalid", headers: { Authorization: "${TOKEN}" }, bearerTokenEnv: "TOKEN" },
    { type: "http", url: "https://example.invalid", auth: { type: "bearer", env: "ONE" }, bearerTokenEnv: "TWO" },
  ])("rejects conflicting aliases and literal credential material", (declaration) => {
    const candidate = component(declaration);
    expect(analyzeMcpCompatibility({
      plugin: "demo@community",
      component: candidate,
    }).kind).toBe("incompatible");
    expect(() => createMcpLaunchTemplate(candidate, "demo@community")).toThrow(McpLaunchTemplateError);
  });

  it("uses strict portable name grammars without caller-spelling normalization", () => {
    expect(McpEnvironmentNameSchema.safeParse("VALID_name_1").success).toBe(true);
    expect(McpEnvironmentNameSchema.safeParse("BAD-NAME").success).toBe(false);
    expect(McpEnvironmentNameSchema.safeParse("9BAD").success).toBe(false);
    expect(McpHeaderNameSchema.safeParse("X.Valid-Header").success).toBe(true);
    expect(McpHeaderNameSchema.safeParse("Bad Header").success).toBe(false);
  });
});
