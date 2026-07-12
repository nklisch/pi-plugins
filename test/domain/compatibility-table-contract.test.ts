import { describe, expect, it } from "vitest";
import {
  CompatibilityPolicyRuleRegistry,
  RuntimeCapabilityRegistry,
} from "../../src/domain/compatibility-policy.js";
import { evaluateCompatibility } from "../../src/domain/compatibility-evaluator.js";
import type { MarketplaceInstallationPolicy } from "../../src/domain/marketplace.js";
import {
  capabilities,
  directPlugin,
  type PolicyFixture,
} from "../fixtures/compatibility/common.js";
import { configurationMarketplaceFixtures } from "../fixtures/compatibility/configuration-marketplace.js";
import { foreignPolicyFixtures } from "../fixtures/compatibility/foreign.js";
import { hookPolicyFixtures } from "../fixtures/compatibility/hooks.js";
import { mcp, mcpPolicyFixtures } from "../fixtures/compatibility/mcp.js";
import { reportingPolicyFixtures } from "../fixtures/compatibility/reporting.js";
import { skillPolicyFixtures } from "../fixtures/compatibility/skills.js";

const fixtures: readonly PolicyFixture[] = [
  ...skillPolicyFixtures,
  ...hookPolicyFixtures,
  ...mcpPolicyFixtures,
  ...foreignPolicyFixtures,
  ...configurationMarketplaceFixtures,
  ...reportingPolicyFixtures,
];

function detailRuleIds(value: unknown): string[] {
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(detailRuleIds);
  const record = value as Record<string, unknown>;
  return [
    ...(typeof record.ruleId === "string" ? [record.ruleId] : []),
    ...Object.values(record).flatMap(detailRuleIds),
  ];
}

function reportFor(fixture: PolicyFixture, positive: boolean) {
  const plugin = positive ? fixture.positive() : fixture.negative();
  const policy = positive ? fixture.positivePolicy : fixture.negativePolicy;
  return evaluateCompatibility({
    plugin,
    capabilities: capabilities(),
    ...(policy === undefined ? {} : { marketplacePolicy: policy as MarketplaceInstallationPolicy }),
  });
}

describe("compatibility table contract", () => {
  it("grounds every registry rule in one executable positive and negative fixture", () => {
    const ruleIds = Object.keys(CompatibilityPolicyRuleRegistry).sort();
    const fixtureIds = fixtures.map((fixture) => fixture.ruleId).sort();
    expect(new Set(fixtureIds).size).toBe(fixtureIds.length);
    expect(fixtureIds).toEqual(ruleIds);

    for (const fixture of fixtures) {
      const rule = CompatibilityPolicyRuleRegistry[fixture.ruleId];
      expect(rule, `${fixture.id} must name a registry rule`).toBeDefined();
      const positive = reportFor(fixture, true);
      const negative = reportFor(fixture, false);
      expect(positive).toMatchObject({ plugin: { key: "fixture@compatibility" } });
      expect(negative).toMatchObject({ plugin: { key: "fixture@compatibility" } });

      const positiveAssessments = positive.components.filter((assessment) =>
        assessment.verdict.kind === fixture.positiveVerdict,
      );
      if (fixture.positiveVerdict === "incompatible") {
        expect(positiveAssessments.length, fixture.id).toBeGreaterThan(0);
        expect(positive.activatable, fixture.id).toBe(false);
      }
      if (fixture.positiveVerdict === "supported" && positive.components.length > 0) {
        expect(positive.components.every((assessment) => assessment.verdict.kind === "supported"), fixture.id).toBe(true);
      }

      const observedRuleIds = [
        ...positive.diagnostics.flatMap((diagnostic) => detailRuleIds(diagnostic.details)),
        ...positive.components.flatMap((assessment) => assessment.diagnostics.flatMap((diagnostic) => detailRuleIds(diagnostic.details))),
      ];
      if (fixture.diagnosticRuleId !== undefined) {
        expect(observedRuleIds, `${fixture.id} must emit ${fixture.diagnosticRuleId}`).toContain(fixture.diagnosticRuleId);
      }
      for (const capability of rule!.requirementCapabilityIds) {
        if (fixture.positiveVerdict === "supported") {
          expect(positive.requirements.some((requirement) => requirement.requirement.capability === capability),
            `${fixture.id} must cite ${capability}`).toBe(true);
        }
      }
    }
  });

  it("grounds every runtime capability in a registry-referenced requirement fixture", () => {
    const observed = new Set<string>();
    for (const fixture of fixtures) {
      const report = reportFor(fixture, true);
      for (const requirement of report.requirements) observed.add(requirement.requirement.capability);
    }
    expect([...observed].sort()).toEqual(Object.values(RuntimeCapabilityRegistry).map((entry) => entry.id).sort());
  });

  it("covers every incompatible hook event explicitly and keeps unknown behavior fail-closed", () => {
    const fixture = hookPolicyFixtures.find((candidate) => candidate.id === "hook-event-incompatible");
    if (fixture === undefined) throw new Error("incompatible hook event fixture is missing");
    const report = reportFor(fixture, true);
    expect(report.components).toHaveLength(19);
    expect(report.components.every((assessment) => assessment.verdict.kind === "incompatible")).toBe(true);
    expect(report.components.every((assessment) => assessment.diagnostics.some((diagnostic) => diagnostic.details &&
      detailRuleIds(diagnostic.details).includes("hook.event.incompatible")))).toBe(true);

    const unknown = reportFor(hookPolicyFixtures.find((candidate) => candidate.id === "hook-event-default-deny")!, true);
    expect(unknown.components[0]?.verdict.kind).toBe("incompatible");
    expect(detailRuleIds(unknown.components[0]?.diagnostics[0]?.details)).toContain("hook.event.default-deny");
  });

  it("rejects unknown transports, auth modes, feature keys, conflicts, and malformed recognized combinations", () => {
    const declarations = [
      { transport: "future-transport", command: "server" },
      { transport: "stdio", command: "server", auth: "future-auth" },
      { transport: "stdio", type: "streamable-http", command: "server" },
      { transport: "stdio", url: "https://example.invalid/mcp", command: "server" },
      { transport: "stdio", command: "server", features: { futureFeature: true } },
      { transport: "stdio", command: "server", tools: { future: ["delete"] } },
    ];
    const report = evaluateCompatibility({
      plugin: directPlugin({ components: {
        mcpServers: declarations.map((declaration, index) => mcp(declaration, `e${(index + 1).toString(16)}`)),
      } }),
      capabilities: capabilities(),
    });
    expect(report.components).toHaveLength(declarations.length);
    expect(report.components.every((assessment) => assessment.verdict.kind === "incompatible")).toBe(true);
    expect(report.components.every((assessment) => assessment.diagnostics.length > 0)).toBe(true);
    expect(JSON.stringify(report)).not.toContain("future-auth");
  });

  it("retains requirement availability as a separate axis from supported verdicts", () => {
    const fixture = mcpPolicyFixtures.find((candidate) => candidate.id === "mcp-feature-sampling");
    if (fixture === undefined) throw new Error("sampling fixture is missing");
    const available = reportFor(fixture, true);
    const unavailable = evaluateCompatibility({
      plugin: fixture.positive(),
      capabilities: capabilities({ "pi.mcp.sampling": "unavailable" }),
    });
    const availableComponent = available.components[0];
    const unavailableComponent = unavailable.components[0];
    expect(availableComponent?.verdict).toEqual({ kind: "supported" });
    expect(unavailableComponent?.verdict).toEqual(availableComponent?.verdict);
    expect(unavailable.requirements).toContainEqual(expect.objectContaining({
      status: "unavailable",
      requirement: expect.objectContaining({ capability: "pi.mcp.sampling" }),
    }));
    expect(unavailable.activatable).toBe(false);
  });
});
