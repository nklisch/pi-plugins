import { directPlugin, fixtureProvenance, claimFixture, componentId, type PolicyFixture } from "./common.js";

export function mcp(declaration: Record<string, unknown>, token: string): unknown {
  const path = "plugin.mcp.json";
  return {
    kind: "mcp-server" as const,
    id: componentId("mcp-server", token),
    nativeKey: claimFixture(`server-${token}`, fixtureProvenance(path, `/mcpServers/server-${token}`, "claude", "mcp")),
    declaration: claimFixture(declaration, fixtureProvenance(path, `/mcpServers/server-${token}`, "claude", "mcp")),
    metadata: [],
  };
}

const stdio = (token = "1") => mcp({ transport: "stdio", command: "server" }, token);
const http = (token = "2") => mcp({ transport: "streamable-http", url: "https://example.invalid/mcp" }, token);
const baseline = () => directPlugin({ components: { mcpServers: [stdio()] } });

export const mcpPolicyFixtures: readonly PolicyFixture[] = [
  {
    id: "mcp-transport-stdio",
    ruleId: "mcp.transport.stdio",
    positive: () => directPlugin({ components: { mcpServers: [stdio("1")] } }),
    negative: () => directPlugin({ components: { mcpServers: [http("2")] } }),
    positiveVerdict: "supported",
  },
  {
    id: "mcp-transport-streamable-http",
    ruleId: "mcp.transport.streamable-http",
    positive: () => directPlugin({ components: { mcpServers: [http("3")] } }),
    negative: () => directPlugin({ components: { mcpServers: [stdio("4")] } }),
    positiveVerdict: "supported",
  },
  {
    id: "mcp-transport-sse",
    ruleId: "mcp.transport.sse",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "sse", url: "https://example.invalid/mcp" }, "5")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.transport.sse",
  },
  {
    id: "mcp-transport-websocket",
    ruleId: "mcp.transport.websocket",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "websocket", url: "wss://example.invalid/mcp" }, "6")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.transport.websocket",
  },
  {
    id: "mcp-oauth-authorization-code",
    ruleId: "mcp.oauth.authorization-code",
    positive: () => directPlugin({ components: { mcpServers: [mcp({
      transport: "streamable-http",
      url: "https://example.invalid/mcp",
      oauth: { grantType: "authorization-code", clientId: "client" },
    }, "7")] } }),
    negative: () => directPlugin({ components: { mcpServers: [http("8")] } }),
    positiveVerdict: "supported",
  },
  {
    id: "mcp-oauth-client-credentials",
    ruleId: "mcp.oauth.client-credentials",
    positive: () => directPlugin({ components: { mcpServers: [mcp({
      transport: "streamable-http",
      url: "https://example.invalid/mcp",
      oauth: { grantType: "client-credentials", clientId: "client" },
    }, "9")] } }),
    negative: () => directPlugin({ components: { mcpServers: [http("a")] } }),
    positiveVerdict: "supported",
  },
  {
    id: "mcp-features-core",
    ruleId: "mcp.features.core",
    positive: () => directPlugin({ components: { mcpServers: [mcp({
      transport: "stdio",
      command: "server",
      args: ["--safe"],
      env: { TOKEN: "CANARY_ENV_VALUE" },
      cwd: "/CANARY_RUNTIME_PATH",
      timeout: 1000,
      allowTools: ["search"],
      denyTools: ["delete"],
      instructions: "Use read-only tools",
      resources: ["docs"],
      headers: { Authorization: "CANARY_HEADER_VALUE" },
      auth: "bearer-env",
      bearerTokenEnv: "TOKEN",
    }, "b")] } }),
    negative: baseline,
    positiveVerdict: "supported",
  },
  {
    id: "mcp-feature-tool-approval",
    ruleId: "mcp.feature.tool-approval",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", toolApproval: true }, "c")] } }),
    negative: baseline,
    positiveVerdict: "supported",
  },
  {
    id: "mcp-feature-sampling",
    ruleId: "mcp.feature.sampling",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", sampling: true }, "d")] } }),
    negative: baseline,
    positiveVerdict: "supported",
  },
  {
    id: "mcp-feature-elicitation-form",
    ruleId: "mcp.feature.elicitation-form",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", elicitation: "form" }, "e")] } }),
    negative: baseline,
    positiveVerdict: "supported",
  },
  {
    id: "mcp-feature-elicitation-url",
    ruleId: "mcp.feature.elicitation-url",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", elicitation: "url" }, "f")] } }),
    negative: baseline,
    positiveVerdict: "supported",
  },
  {
    id: "mcp-headers-helper",
    ruleId: "mcp.headers-helper",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", headersHelper: "CANARY_HELPER" }, "10")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.headers-helper",
  },
  {
    id: "mcp-channels",
    ruleId: "mcp.channels",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", channels: ["CANARY_CHANNEL"] }, "11")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.channels",
  },
  {
    id: "mcp-default-deny",
    ruleId: "mcp.default-deny",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", unknownBehavior: "CANARY_UNKNOWN" }, "12")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.default-deny",
  },
];

export const mcpIngestionFixtures = {
  stdio: {
    local: {
      command: "node",
      args: ["server.js"],
      env: { TOKEN: "CANARY_ENV_VALUE" },
      cwd: "/CANARY_RUNTIME_PATH",
      headers: { Authorization: "CANARY_HEADER_VALUE" },
    },
  },
  streamableHttp: {
    remote: { type: "http", url: "https://example.invalid/mcp", headers: { Authorization: "Bearer ${TOKEN}" } },
  },
  features: {
    featureful: {
      command: "node",
      args: ["server.js"],
      toolApproval: true,
      sampling: true,
      elicitation: { form: true, url: true },
      instructions: "read-only",
      resources: ["docs"],
      timeout: 1000,
    },
  },
  unknown: {
    unknown: { command: "node", unknownBehavior: "CANARY_UNKNOWN" },
  },
} as const;
