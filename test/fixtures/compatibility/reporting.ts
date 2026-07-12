import { directPlugin, fixtureProvenance, claimFixture, type PolicyFixture } from "./common.js";
import { foreignPolicyFixtures } from "./foreign.js";
import { mcpPolicyFixtures } from "./mcp.js";

const knownMetadata = {
  key: "owner",
  claimed: claimFixture("compatibility-fixture", fixtureProvenance(".claude-plugin/marketplace.json", "/plugins/0/owner", "claude", "manifest")),
};

const sampling = mcpPolicyFixtures.find((fixture) => fixture.id === "mcp-feature-sampling");
const foreign = foreignPolicyFixtures[0];
if (sampling === undefined || foreign === undefined) throw new Error("shared compatibility fixtures are incomplete");

export const reportingPolicyFixtures: readonly PolicyFixture[] = [
  {
    id: "verdict-registry",
    ruleId: "verdict.registry",
    positive: () => directPlugin(),
    negative: () => directPlugin(),
    positiveVerdict: "supported",
  },
  {
    id: "requirement-separate-status",
    ruleId: "requirement.separate-status",
    positive: sampling.positive,
    negative: sampling.negative,
    positiveVerdict: "supported",
  },
  {
    id: "verdict-metadata-only",
    ruleId: "verdict.metadata-only",
    positive: () => directPlugin({ metadata: [knownMetadata] }),
    negative: () => directPlugin(),
    positiveVerdict: "supported",
    diagnosticRuleId: "metadata.known-presentation",
  },
  {
    id: "verdict-incompatible",
    ruleId: "verdict.incompatible",
    positive: foreign.positive,
    negative: foreign.negative,
    positiveVerdict: "incompatible",
    diagnosticRuleId: "foreign.default-deny",
  },
  {
    id: "metadata-known-presentation",
    ruleId: "metadata.known-presentation",
    positive: () => directPlugin({ metadata: [knownMetadata] }),
    negative: () => directPlugin(),
    positiveVerdict: "supported",
    diagnosticRuleId: "metadata.known-presentation",
  },
];
