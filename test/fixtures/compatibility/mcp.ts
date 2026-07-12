import {
  directPlugin,
  fixtureProvenance,
  claimFixture,
  componentId,
  expectedOutcome,
  expectedRequirement,
  type PolicyFixture,
} from "./common.js";

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
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "2", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-transport-streamable-http",
    ruleId: "mcp.transport.streamable-http",
    positive: () => directPlugin({ components: { mcpServers: [http("3")] } }),
    negative: () => directPlugin({ components: { mcpServers: [stdio("4")] } }),
    positiveVerdict: "supported",
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "3", "pi.mcp.runtime")],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "4", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-transport-sse",
    ruleId: "mcp.transport.sse",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "sse", url: "https://example.invalid/mcp" }, "5")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.transport.sse",
    positiveExpected: expectedOutcome(["incompatible"], false, {
      diagnosticCodes: ["UNSUPPORTED_DECLARATION"],
      diagnosticRuleIds: ["mcp.transport.sse"],
      diagnosticSourcePointers: ["/mcpServers/server-5/transport"],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-transport-websocket",
    ruleId: "mcp.transport.websocket",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "websocket", url: "wss://example.invalid/mcp" }, "6")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.transport.websocket",
    positiveExpected: expectedOutcome(["incompatible"], false, {
      diagnosticCodes: ["UNSUPPORTED_DECLARATION"],
      diagnosticRuleIds: ["mcp.transport.websocket"],
      diagnosticSourcePointers: ["/mcpServers/server-6/transport"],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
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
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [
        expectedRequirement("mcp-server", "7", "pi.mcp.runtime"),
        expectedRequirement("mcp-server", "7", "pi.mcp.oauth.authorization-code"),
      ],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "8", "pi.mcp.runtime")],
    }),
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
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [
        expectedRequirement("mcp-server", "9", "pi.mcp.runtime"),
        expectedRequirement("mcp-server", "9", "pi.mcp.oauth.client-credentials"),
      ],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "a", "pi.mcp.runtime")],
    }),
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
      auth: { type: "bearer", env: "TOKEN" },
    }, "b")] } }),
    negative: baseline,
    positiveVerdict: "supported",
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "b", "pi.mcp.runtime")],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-feature-tool-approval",
    ruleId: "mcp.feature.tool-approval",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", toolApproval: true }, "c")] } }),
    negative: baseline,
    positiveVerdict: "supported",
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [
        expectedRequirement("mcp-server", "c", "pi.mcp.runtime"),
        expectedRequirement("mcp-server", "c", "pi.mcp.tool-approval"),
      ],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-feature-sampling",
    ruleId: "mcp.feature.sampling",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", sampling: true }, "d")] } }),
    negative: baseline,
    positiveVerdict: "supported",
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [
        expectedRequirement("mcp-server", "d", "pi.mcp.runtime"),
        expectedRequirement("mcp-server", "d", "pi.mcp.sampling"),
      ],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-feature-elicitation-form",
    ruleId: "mcp.feature.elicitation-form",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", elicitation: "form" }, "e")] } }),
    negative: baseline,
    positiveVerdict: "supported",
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [
        expectedRequirement("mcp-server", "e", "pi.mcp.runtime"),
        expectedRequirement("mcp-server", "e", "pi.mcp.elicitation.form"),
      ],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-feature-elicitation-url",
    ruleId: "mcp.feature.elicitation-url",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", elicitation: "url" }, "f")] } }),
    negative: baseline,
    positiveVerdict: "supported",
    positiveExpected: expectedOutcome(["supported"], true, {
      requirements: [
        expectedRequirement("mcp-server", "f", "pi.mcp.runtime"),
        expectedRequirement("mcp-server", "f", "pi.mcp.elicitation.url"),
      ],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-headers-helper",
    ruleId: "mcp.headers-helper",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", headersHelper: "CANARY_HELPER" }, "10")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.headers-helper",
    positiveExpected: expectedOutcome(["incompatible"], false, {
      diagnosticCodes: ["UNSUPPORTED_DECLARATION"],
      diagnosticRuleIds: ["mcp.headers-helper"],
      diagnosticSourcePointers: ["/mcpServers/server-10/headersHelper"],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-channels",
    ruleId: "mcp.channels",
    positive: () => directPlugin({ components: { mcpServers: [mcp({ transport: "stdio", command: "server", channels: ["CANARY_CHANNEL"] }, "11")] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.channels",
    positiveExpected: expectedOutcome(["incompatible"], false, {
      diagnosticCodes: ["UNSUPPORTED_DECLARATION"],
      diagnosticRuleIds: ["mcp.channels"],
      diagnosticSourcePointers: ["/mcpServers/server-11/channels"],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
  },
  {
    id: "mcp-default-deny",
    ruleId: "mcp.default-deny",
    positive: () => directPlugin({ components: { mcpServers: [
      mcp({ transport: "stdio", command: "server", unknownBehavior: "CANARY_UNKNOWN" }, "12"),
      mcp({
        transport: "streamable-http",
        url: "https://example.invalid/mcp",
        oauth: { grantType: "authorization-code", flow: "client-credentials" },
      }, "13"),
      mcp({
        transport: "stdio",
        command: "server",
        features: { sampling: { enabled: "true" } },
      }, "14"),
      mcp({
        transport: "stdio",
        type: "streamable-http",
        url: "https://example.invalid/mcp",
      }, "15"),
      mcp({
        transport: "stdio",
        command: "server",
        features: { sampling: { enabled: true, futureFlag: false } },
      }, "16"),
    ] } }),
    negative: baseline,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "mcp.default-deny",
    positiveExpected: expectedOutcome(["incompatible", "incompatible", "incompatible", "incompatible", "incompatible"], false, {
      diagnosticCodes: [
        "UNSUPPORTED_DECLARATION",
        "UNSUPPORTED_DECLARATION",
        "UNSUPPORTED_DECLARATION",
        "UNSUPPORTED_DECLARATION",
        "UNSUPPORTED_DECLARATION",
      ],
      diagnosticRuleIds: [
        "mcp.default-deny",
        "mcp.default-deny",
        "mcp.default-deny",
        "mcp.default-deny",
        "mcp.default-deny",
      ],
      diagnosticSourcePointers: [
        "/mcpServers/server-12/unknownBehavior",
        "/mcpServers/server-13/oauth",
        "/mcpServers/server-14/features/sampling/enabled",
        "/mcpServers/server-15/type",
        "/mcpServers/server-16/features/sampling/futureFlag",
      ],
    }),
    negativeExpected: expectedOutcome(["supported"], true, {
      requirements: [expectedRequirement("mcp-server", "1", "pi.mcp.runtime")],
    }),
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
