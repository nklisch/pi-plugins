import { z } from "zod";
import {
  ComponentKindRegistry,
  ComponentSchema,
  flattenComponents,
  type Component,
  type ForeignComponent,
  type HookComponent,
  type McpServerComponent,
  type RetainedMetadata,
  type SkillComponent,
} from "./components.js";
import {
  ComponentAssessmentSchema,
  ComponentVerdictRegistry,
  createCompatibilityReport,
  deriveActivatable,
  RuntimeRequirementAssessmentSchema,
  RuntimeRequirementIdSchema,
  RuntimeRequirementSchema,
  RuntimeRequirementStatusRegistry,
  type CompatibilityReport,
  type ComponentAssessment,
  type RuntimeRequirementAssessment,
  type RuntimeRequirementId,
} from "./compatibility.js";
import {
  CompatibilityPolicyRegistry,
  CompatibilityPolicyRuleRegistry,
  RuntimeCapabilityRegistry,
  RuntimeCapabilitySnapshotSchema,
  type CompatibilityPolicyRule,
  type RuntimeCapabilityId,
  type RuntimeCapabilitySnapshot,
} from "./compatibility-policy.js";
import { PluginConfigurationSchema, type ConfigurationOption } from "./configuration.js";
import {
  DiagnosticSchema,
  ErrorCodeRegistry,
  type Diagnostic,
} from "./errors.js";
import {
  MarketplaceInstallationPolicySchema,
  type MarketplaceInstallationPolicy,
} from "./marketplace.js";
import { NormalizedPluginSchema, type NormalizedPlugin } from "./plugin.js";
import { ProvenanceSchema, type Claimed, type Provenance } from "./provenance.js";
import { JsonValueSchema, type JsonValue } from "./schema.js";

const EVALUATION_OPERATION = "evaluateCompatibility";
const REQUIREMENT_ID_PREFIX = "requirement-v1";

type JsonRecord = { readonly [key: string]: JsonValue };

type RequirementUse = Readonly<{
  capability: RuntimeCapabilityId;
  provenance: readonly Provenance[];
  ruleId: string;
}>;

type PolicyDecision = Readonly<{
  verdict: "supported" | "incompatible";
  requirements: readonly RequirementUse[];
  diagnostics: readonly Diagnostic[];
}>;

export type CompatibilityEvaluationInput = Readonly<{
  plugin: NormalizedPlugin;
  capabilities: RuntimeCapabilitySnapshot;
  marketplacePolicy?: MarketplaceInstallationPolicy;
}>;

export const CompatibilityEvaluationInputSchema = z
  .object({
    plugin: NormalizedPluginSchema,
    capabilities: RuntimeCapabilitySnapshotSchema,
    marketplacePolicy: MarketplaceInstallationPolicySchema.optional(),
  })
  .strict()
  .readonly();

function isRecord(value: JsonValue): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort(compareText).map((key) => `${JSON.stringify(key)}:${stableJson(record[key]!)}`).join(",")}}`;
}

function sourceLocationKey(provenance: Provenance): string {
  const location = provenance.location;
  return stableJson([
    location.host,
    location.documentKind,
    location.path,
    location.pointer ?? "",
    location.line ?? 0,
    location.column ?? 0,
  ]);
}

function sortedProvenance(values: readonly Provenance[]): readonly Provenance[] {
  const result: Provenance[] = [];
  for (const candidate of [...values].map((value) => ProvenanceSchema.parse(value)).sort((left, right) =>
    compareText(sourceLocationKey(left), sourceLocationKey(right)))) {
    if (!result.some((existing) => sourceLocationKey(existing) === sourceLocationKey(candidate))) {
      result.push(candidate);
    }
  }
  if (result.length === 0) throw new Error("compatibility provenance cannot be empty");
  return result;
}

function sourceLocations(values: readonly Provenance[]): JsonValue {
  return sortedProvenance(values).map((provenance) => {
    const location = provenance.location;
    return {
      host: location.host,
      documentKind: location.documentKind,
      path: location.path,
      ...(location.pointer === undefined ? {} : { pointer: location.pointer }),
      ...(location.line === undefined ? {} : { line: location.line }),
      ...(location.column === undefined ? {} : { column: location.column }),
    };
  }) as unknown as JsonValue;
}

function firstLocation(values: readonly Provenance[]): Provenance["location"] {
  return sortedProvenance(values)[0]!.location;
}

function ruleById(ruleId: string): CompatibilityPolicyRule {
  const rule = CompatibilityPolicyRuleRegistry[ruleId];
  if (rule === undefined) throw new Error(`compatibility policy registry is missing rule ${ruleId}`);
  return rule;
}

function componentKindRank(kind: Component["kind"]): number {
  const entry = Object.values(ComponentKindRegistry).find((candidate) => candidate.tag === kind);
  if (entry === undefined) throw new Error(`component kind registry is missing ${kind}`);
  return Object.values(ComponentKindRegistry).indexOf(entry);
}

function capabilityRank(capability: string): number {
  const entry = Object.values(RuntimeCapabilityRegistry).find((candidate) => candidate.id === capability);
  if (entry === undefined) throw new Error(`capability registry is missing ${capability}`);
  return entry.rank;
}

function safeMcpScalar(field: string, value: JsonValue | undefined): JsonValue | undefined {
  if (typeof value !== "string") return undefined;
  if ((field === "transport" || field === "type") && canonicalTransport(value) !== undefined) {
    return value;
  }
  if (["auth", "oauth", "authentication"].includes(field) &&
      ["none", "bearer", "bearer-env", "oauth"].includes(value)) {
    return value;
  }
  return undefined;
}

function diagnostic(
  pluginKey: string,
  ruleId: string,
  severity: "warning" | "error",
  provenances: readonly Provenance[],
  details: Readonly<Record<string, JsonValue>> = {},
  messageOverride?: string,
  codeOverride?: import("./errors.js").ErrorCode,
): Diagnostic {
  const rule = ruleById(ruleId);
  const safeDetails: Record<string, JsonValue> = {
    ...details,
    ruleId,
    sourceLocations: sourceLocations(provenances),
  };
  return DiagnosticSchema.parse({
    code: codeOverride ?? rule.diagnosticCode ?? ErrorCodeRegistry.unsupportedDeclaration,
    severity,
    operation: EVALUATION_OPERATION,
    message: messageOverride ?? rule.message,
    location: firstLocation(provenances),
    plugin: pluginKey,
    details: safeDetails,
  });
}

function requirementUse(
  ruleId: string,
  provenance: readonly Provenance[],
): readonly RequirementUse[] {
  const rule = ruleById(ruleId);
  return rule.requirementCapabilityIds.map((capability) => ({
    capability,
    provenance: sortedProvenance(provenance),
    ruleId,
  }));
}

function mergeRequirementUses(uses: readonly RequirementUse[]): readonly RequirementUse[] {
  const byCapability = new Map<RuntimeCapabilityId, { provenance: Provenance[]; ruleId: string }>();
  for (const use of uses) {
    const existing = byCapability.get(use.capability);
    if (existing === undefined) {
      byCapability.set(use.capability, {
        provenance: [...use.provenance],
        ruleId: use.ruleId,
      });
      continue;
    }
    existing.provenance = [...existing.provenance, ...use.provenance];
    if (compareText(use.ruleId, existing.ruleId) < 0) existing.ruleId = use.ruleId;
  }
  return [...byCapability.entries()]
    .sort(([left], [right]) => {
      const rank = capabilityRank(left) - capabilityRank(right);
      return rank !== 0 ? rank : compareText(left, right);
    })
    .map(([capability, value]) => ({
      capability,
      provenance: sortedProvenance(value.provenance),
      ruleId: value.ruleId,
    }));
}

function decision(
  verdict: PolicyDecision["verdict"],
  requirements: readonly RequirementUse[],
  diagnostics: readonly Diagnostic[],
): PolicyDecision {
  return {
    verdict,
    requirements: verdict === "supported" ? mergeRequirementUses(requirements) : [],
    diagnostics: [...diagnostics].sort(compareDiagnostics),
  };
}

function locationJson(location: NonNullable<Diagnostic["location"]>): JsonValue {
  return {
    host: location.host,
    documentKind: location.documentKind,
    path: location.path,
    ...(location.pointer === undefined ? {} : { pointer: location.pointer }),
    ...(location.line === undefined ? {} : { line: location.line }),
    ...(location.column === undefined ? {} : { column: location.column }),
  };
}

function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
  const severityRank = left.severity === right.severity
    ? 0
    : left.severity === "error" ? -1 : 1;
  if (severityRank !== 0) return severityRank;
  const code = compareText(left.code, right.code);
  if (code !== 0) return code;
  const operation = compareText(left.operation, right.operation);
  if (operation !== 0) return operation;
  const leftLocation = left.location === undefined ? "" : stableJson(locationJson(left.location));
  const rightLocation = right.location === undefined ? "" : stableJson(locationJson(right.location));
  const location = compareText(leftLocation, rightLocation);
  if (location !== 0) return location;
  return compareText(
    left.details === undefined ? "" : stableJson(left.details),
    right.details === undefined ? "" : stableJson(right.details),
  );
}

function componentClaim(component: Component): readonly Provenance[] {
  switch (component.kind) {
    case ComponentKindRegistry.skill.tag:
      return sortedProvenance([...component.name.provenance, ...component.root.provenance]);
    case ComponentKindRegistry.hook.tag:
      return sortedProvenance([
        ...component.event.provenance,
        ...(component.matcher?.provenance ?? []),
        ...component.handler.provenance,
      ]);
    case ComponentKindRegistry.mcpServer.tag:
      return sortedProvenance([...component.nativeKey.provenance, ...component.declaration.provenance]);
    case ComponentKindRegistry.foreign.tag:
      return sortedProvenance([
        ...component.nativeKind.provenance,
        ...component.declaration.provenance,
      ]);
    default:
      return assertNever(component);
  }
}

function metadataField(metadata: RetainedMetadata): string {
  const segments = metadata.key.split(".");
  return segments[segments.length - 1] ?? metadata.key;
}

function metadataProvenance(metadata: RetainedMetadata): readonly Provenance[] {
  return sortedProvenance(metadata.claimed.provenance);
}

function hasMetadataNamespace(key: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`));
}

function knownCodexInvocationValue(value: JsonValue): boolean {
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return CompatibilityPolicyRegistry.skills.invocationPolicyValues.includes(value as never);
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 1) return false;
  const key = keys[0];
  if (key !== "allow_implicit_invocation" && key !== "allowImplicitInvocation" &&
      key !== "implicit_invocation" && key !== "implicitInvocation") return false;
  const setting = value[key];
  return typeof setting === "boolean" ||
    (typeof setting === "string" && CompatibilityPolicyRegistry.skills.invocationPolicyValues.includes(setting as never));
}

function evaluateSkill(
  pluginKey: string,
  component: SkillComponent,
): PolicyDecision {
  const requirements: RequirementUse[] = [];
  const diagnostics: Diagnostic[] = [];
  let incompatible = false;

  for (const metadata of [...component.metadata].sort((left, right) => compareText(left.key, right.key))) {
    const field = metadataField(metadata);
    const provenance = metadataProvenance(metadata);
    const value = metadata.claimed.value;

    if (!hasMetadataNamespace(metadata.key, CompatibilityPolicyRegistry.skills.metadataPrefixes)) {
      incompatible = true;
      diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.unknownFrontmatter.id, "error", provenance, {
        componentId: component.id,
        field,
      }));
      continue;
    }
    if (CompatibilityPolicyRegistry.skills.presentationKeys.includes(field as never)) {
      diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.presentation.id, "warning", provenance, {
        componentId: component.id,
        field,
      }));
      continue;
    }
    if (field === "allowed-tools") {
      if (typeof value !== "string") {
        incompatible = true;
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.unknownFrontmatter.id, "error", provenance, {
          componentId: component.id,
          field,
        }));
      } else {
        requirements.push(...requirementUse(CompatibilityPolicyRegistry.skills.allowedTools.id, provenance));
      }
      continue;
    }
    if (field === "disable-model-invocation") {
      if (typeof value !== "boolean") {
        incompatible = true;
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.unknownFrontmatter.id, "error", provenance, {
          componentId: component.id,
          field,
        }));
      }
      continue;
    }
    if (metadata.key.startsWith("codex.agents.")) {
      if (CompatibilityPolicyRegistry.skills.invocationPolicyKeys.includes(field as never)) {
        if (!knownCodexInvocationValue(value)) {
          incompatible = true;
          diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.unknownFrontmatter.id, "error", provenance, {
            componentId: component.id,
            field,
          }));
        }
      } else {
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.codexPresentation.id, "warning", provenance, {
          componentId: component.id,
          field,
        }));
      }
      continue;
    }
    if (field === "scoped-hooks") {
      incompatible = true;
      diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.scopedHooks.id, "error", provenance, {
        componentId: component.id,
        field,
      }));
      continue;
    }

    incompatible = true;
    diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.skills.unknownFrontmatter.id, "error", provenance, {
      componentId: component.id,
      field,
    }));
  }

  return decision(incompatible ? "incompatible" : "supported", requirements, diagnostics);
}

function isConditionPrimitive(value: JsonValue): boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function conditionValueMatchesOperator(value: JsonValue, operator: string): boolean {
  const kind = (CompatibilityPolicyRegistry.hookEvents.conditionOperatorDefinitions as
    Readonly<Record<string, string>>)[operator];
  if (kind === "primitive") return isConditionPrimitive(value);
  if (kind === "string") return typeof value === "string";
  if (kind === "primitive-array") {
    return Array.isArray(value) && value.length > 0 && value.every(isConditionPrimitive);
  }
  return false;
}

/**
 * Hook conditions are retained opaque metadata, so this is a second, strict
 * policy-boundary parse rather than an assumption that any non-empty string is
 * a condition. The grammar is intentionally derived from the policy registry:
 * unknown syntax cannot silently acquire runtime semantics.
 */
function conditionIsKnown(value: JsonValue): boolean {
  if (Array.isArray(value)) return value.length > 0 && value.every((entry) => conditionIsKnown(entry));
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  const wrapperKeys = CompatibilityPolicyRegistry.hookEvents.conditionWrapperKeys as readonly string[];
  if (keys.length === 1 && wrapperKeys.includes(keys[0]!)) {
    return conditionIsKnown(value[keys[0]!]!);
  }
  const predicateKeys = CompatibilityPolicyRegistry.hookEvents.conditionPredicateKeys as readonly string[];
  if (keys.length !== predicateKeys.length || keys.some((key) => !predicateKeys.includes(key))) return false;
  const field = value.field;
  const operator = value.operator;
  if (typeof field !== "string" ||
      !(CompatibilityPolicyRegistry.hookEvents.conditionFields as readonly string[]).includes(field) ||
      typeof operator !== "string" ||
      !(CompatibilityPolicyRegistry.hookEvents.conditionOperators as readonly string[]).includes(operator)) {
    return false;
  }
  return conditionValueMatchesOperator(value.value!, operator);
}

function evaluateHook(
  pluginKey: string,
  component: HookComponent,
): PolicyDecision {
  const requirements: RequirementUse[] = [];
  const diagnostics: Diagnostic[] = [];
  let incompatible = false;

  const event = component.event.value;
  let eventRuleId: string;
  if (CompatibilityPolicyRegistry.hookEvents.supported.includes(event as never)) {
    eventRuleId = CompatibilityPolicyRegistry.hookHandlers.supportedEvent.id;
  } else if (CompatibilityPolicyRegistry.hookEvents.subagent.includes(event as never)) {
    eventRuleId = CompatibilityPolicyRegistry.hookHandlers.subagentEvent.id;
  } else if (CompatibilityPolicyRegistry.hookEvents.incompatible.includes(event as never)) {
    eventRuleId = CompatibilityPolicyRegistry.hookHandlers.incompatibleEvent.id;
  } else {
    eventRuleId = CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id;
  }

  if (eventRuleId === CompatibilityPolicyRegistry.hookHandlers.incompatibleEvent.id ||
      eventRuleId === CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id) {
    incompatible = true;
    diagnostics.push(diagnostic(pluginKey, eventRuleId, "error", component.event.provenance, {
      componentId: component.id,
      field: "event",
      ...(eventRuleId === CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id ? {} : { value: event }),
    }));
  } else {
    requirements.push(...requirementUse(eventRuleId, component.event.provenance));
  }

  const commandRule = CompatibilityPolicyRegistry.hookHandlers.command;
  requirements.push(...requirementUse(commandRule.id, component.handler.provenance));

  let shellRuleId: string | undefined = component.handler.value.kind === "shell"
    ? CompatibilityPolicyRegistry.hookHandlers.shellBash.id
    : undefined;
  let shellProvenance = component.handler.provenance;

  for (const metadata of [...component.metadata].sort((left, right) => compareText(left.key, right.key))) {
    const field = metadataField(metadata);
    const provenance = metadataProvenance(metadata);
    const value = metadata.claimed.value;

    if (!hasMetadataNamespace(metadata.key, CompatibilityPolicyRegistry.hookEvents.metadata.prefixes)) {
      incompatible = true;
      diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id, "error", provenance, {
        componentId: component.id,
        field,
      }));
      continue;
    }
    if (CompatibilityPolicyRegistry.hookEvents.metadata.statusMessage.includes(field as never)) {
      if (typeof value !== "string") {
        incompatible = true;
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id, "error", provenance, {
          componentId: component.id,
          field,
        }));
      } else {
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.hookHandlers.statusMessage.id, "warning", provenance, {
          componentId: component.id,
          field,
        }));
      }
      continue;
    }
    if (CompatibilityPolicyRegistry.hookEvents.metadata.shell.includes(field as never)) {
      if (value !== "bash" && value !== "powershell") {
        incompatible = true;
        const safeValue = value === "bash" || value === "powershell" ? value : undefined;
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id, "error", provenance, {
          componentId: component.id,
          field,
          ...(safeValue === undefined ? {} : { value: safeValue }),
        }));
      } else {
        shellRuleId = value === "powershell"
          ? CompatibilityPolicyRegistry.hookHandlers.shellPowershell.id
          : CompatibilityPolicyRegistry.hookHandlers.shellBash.id;
        shellProvenance = provenance;
      }
      continue;
    }
    if (CompatibilityPolicyRegistry.hookEvents.metadata.async.includes(field as never)) {
      if (typeof value !== "boolean" || value === true) {
        incompatible = true;
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.hookHandlers.async.id, "error", provenance, {
          componentId: component.id,
          field,
        }));
      }
      continue;
    }
    if (CompatibilityPolicyRegistry.hookEvents.metadata.ifRule.includes(field as never)) {
      if (!conditionIsKnown(value)) {
        incompatible = true;
        diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id, "error", provenance, {
          componentId: component.id,
          field,
        }));
      }
      continue;
    }

    incompatible = true;
    diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.hookHandlers.unknownEvent.id, "error", provenance, {
      componentId: component.id,
      field,
    }));
  }

  if (shellRuleId !== undefined) requirements.push(...requirementUse(shellRuleId, shellProvenance));
  return decision(incompatible ? "incompatible" : "supported", requirements, diagnostics);
}

function valueIsStringArray(value: JsonValue): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function valueIsStringRecord(value: JsonValue): value is JsonRecord {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function valueIsPositiveNumber(value: JsonValue): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function recordHasOnlyKeys(value: JsonValue, allowed: readonly string[]): boolean {
  return isRecord(value) && Object.keys(value).every((key) => allowed.includes(key));
}

function canonicalTransport(value: string): "stdio" | "streamable-http" | "sse" | "websocket" | undefined {
  if ((CompatibilityPolicyRegistry.mcp.keys.transportValues as readonly string[]).includes(value)) {
    return value as ReturnType<typeof canonicalTransport>;
  }
  const alias = (CompatibilityPolicyRegistry.mcp.keys.transportAliases as Readonly<Record<string, string>>)[value];
  if (alias !== undefined && (CompatibilityPolicyRegistry.mcp.keys.transportValues as readonly string[]).includes(alias)) {
    return alias as ReturnType<typeof canonicalTransport>;
  }
  return undefined;
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function mcpFieldProvenance(
  component: McpServerComponent,
  field: string,
): readonly Provenance[] {
  if (field === "declaration") return component.declaration.provenance;
  return component.declaration.provenance.map((provenance) => {
    const base = provenance.location.pointer ?? "";
    const pointer = `${base}/${field.split(".").map(pointerSegment).join("/")}`;
    return ProvenanceSchema.parse({
      location: { ...provenance.location, pointer },
    });
  });
}

function mcpIssue(
  pluginKey: string,
  component: McpServerComponent,
  field: string,
  value?: JsonValue,
  ruleId: string = CompatibilityPolicyRegistry.mcp.defaultDeny.id,
): Diagnostic {
  const safeValue = safeMcpScalar(field, value);
  return diagnostic(pluginKey, ruleId, "error", mcpFieldProvenance(component, field), {
    componentId: component.id,
    field,
    ...(safeValue === undefined ? {} : { value: safeValue }),
  });
}

type OAuthFlow = "authorization-code" | "client-credentials";
type OAuthFlowValidation = Readonly<{
  candidate: boolean;
  valid: boolean;
  flow?: OAuthFlow;
  ruleId?: string;
}>;

function recognizedOAuthFlow(value: string): Readonly<{ flow: OAuthFlow; ruleId: string }> | undefined {
  for (const definition of Object.values(CompatibilityPolicyRegistry.mcp.keys.oauthFlowDefinitions)) {
    if ((definition.aliases as readonly string[]).includes(value)) {
      const flow = definition.ruleId === CompatibilityPolicyRegistry.mcp.oauthAuthorizationCode.id
        ? "authorization-code"
        : "client-credentials";
      return { flow, ruleId: definition.ruleId };
    }
  }
  return undefined;
}

/**
 * Parse OAuth without selecting the first recognizable branch. Every declared
 * selector must be well typed and exactly one flow selector must be present;
 * otherwise the declaration is ambiguous or malformed and is rejected.
 */
function oauthFlow(value: JsonValue): OAuthFlowValidation {
  if (typeof value === "string") {
    const recognized = recognizedOAuthFlow(value);
    return recognized === undefined
      ? { candidate: value === "oauth", valid: false }
      : { candidate: true, valid: true, ...recognized };
  }
  if (!isRecord(value)) return { candidate: false, valid: false };

  const authKeys = CompatibilityPolicyRegistry.mcp.keys.authKeys as readonly string[];
  if (Object.keys(value).some((key) => !authKeys.includes(key))) {
    return { candidate: true, valid: false };
  }

  let candidate = false;
  let modeSelectors = 0;
  const flows: Array<{ flow: OAuthFlow; ruleId: string }> = [];
  for (const [key, entry] of Object.entries(value)) {
    if (key === "grantType" || key === "grant_type" || key === "flow") {
      candidate = true;
      if (typeof entry !== "string") return { candidate, valid: false };
      const recognized = recognizedOAuthFlow(entry);
      if (recognized === undefined) return { candidate, valid: false };
      flows.push(recognized);
      continue;
    }
    if (key === "authorizationCode" || key === "authorization_code" ||
        key === "clientCredentials" || key === "client_credentials") {
      candidate = true;
      if (typeof entry !== "boolean") return { candidate, valid: false };
      if (entry) {
        const recognized = recognizedOAuthFlow(
          key.startsWith("authorization") ? "authorization-code" : "client-credentials",
        );
        if (recognized === undefined) return { candidate, valid: false };
        flows.push(recognized);
      }
      continue;
    }
    if (key === "type") {
      if (typeof entry !== "string") return { candidate: true, valid: false };
      if (entry === "oauth") {
        candidate = true;
        modeSelectors += 1;
      } else if (entry === "bearer" || entry === "none") {
        // These are handled by the bearer/none authentication policy below;
        // they are not OAuth selectors and must not be treated as malformed
        // OAuth merely because they use the shared `type` key.
      } else {
        const recognized = recognizedOAuthFlow(entry);
        if (recognized === undefined) return { candidate: false, valid: false };
        candidate = true;
        flows.push(recognized);
      }
      continue;
    }
    if (key === "mode") {
      if (typeof entry !== "string") return { candidate: true, valid: false };
      if (entry === "oauth") {
        candidate = true;
        modeSelectors += 1;
      } else if (entry !== "bearer" && entry !== "none") {
        return { candidate: false, valid: false };
      }
      continue;
    }
    if (key === "env" || key === "clientId" || key === "client_id" ||
        key === "redirectUri" || key === "redirect_uri") {
      if (typeof entry !== "string" || entry.length === 0) return { candidate, valid: false };
    }
  }
  if (!candidate) return { candidate: false, valid: false };
  if (modeSelectors > 1 || flows.length !== 1) return { candidate: true, valid: false };
  const selected = flows[0];
  return selected === undefined
    ? { candidate: true, valid: false }
    : { candidate: true, valid: true, ...selected };
}

function bearerAuthIsKnown(value: JsonValue, externalEnvironment: JsonValue | undefined): boolean {
  if (typeof value === "string") {
    return (value === "bearer" || value === "bearer-env") &&
      typeof externalEnvironment === "string" && externalEnvironment.length > 0;
  }
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !["mode", "type", "env"].includes(key))) return false;
  const selectors = ["mode", "type"].filter((key) => value[key] !== undefined);
  if (selectors.length !== 1 || value[selectors[0]!] !== "bearer") return false;
  if (value.env !== undefined && (typeof value.env !== "string" || value.env.length === 0)) return false;
  const environment = value.env ?? externalEnvironment;
  return typeof environment === "string" && environment.length > 0;
}

function invalidHeaderFields(value: JsonValue): readonly string[] {
  if (!isRecord(value)) return [""];
  const invalid: string[] = [];
  const allowedEnvironmentKeys = CompatibilityPolicyRegistry.mcp.keys.headerEnvironmentKeys as readonly string[];
  for (const [name, entry] of Object.entries(value)) {
    if (name.length === 0) {
      invalid.push(name);
      continue;
    }
    if (typeof entry === "string") {
      if (entry.length === 0 || (/^bearer\s+/i.test(entry) && !/^bearer\s+\$\{[^}]+\}$/i.test(entry))) {
        invalid.push(name);
      }
      continue;
    }
    if (!isRecord(entry) || Object.keys(entry).some((key) => !allowedEnvironmentKeys.includes(key)) ||
        Object.keys(entry).length !== allowedEnvironmentKeys.length ||
        typeof entry.env !== "string" || entry.env.length === 0) {
      invalid.push(name);
    }
  }
  return invalid;
}

type McpFeatureDefinition = (typeof CompatibilityPolicyRegistry.mcp.keys.featurePayloadDefinitions)[keyof typeof CompatibilityPolicyRegistry.mcp.keys.featurePayloadDefinitions];

function featureDefinitionFor(field: string): McpFeatureDefinition | undefined {
  return Object.values(CompatibilityPolicyRegistry.mcp.keys.featurePayloadDefinitions)
    .find((definition) => (definition.aliases as readonly string[]).includes(field));
}

function mcpFeatureUses(
  pluginKey: string,
  component: McpServerComponent,
  field: string,
  value: JsonValue,
  definition: McpFeatureDefinition,
): Readonly<{ requirements: readonly RequirementUse[]; diagnostics: readonly Diagnostic[]; incompatible: boolean }> {
  const requirements: RequirementUse[] = [];
  const diagnostics: Diagnostic[] = [];
  let incompatible = false;
  const issue = (path = field) => diagnostics.push(mcpIssue(pluginKey, component, path));

  if (definition.shape === "boolean-flags") {
    let enabled: boolean | undefined;
    if (typeof value === "boolean") {
      enabled = value;
    } else if (isRecord(value)) {
      const allowed = CompatibilityPolicyRegistry.mcp.keys.booleanFeatureKeys as readonly string[];
      const keys = Object.keys(value);
      const unknownKeys = keys.filter((key) => !allowed.includes(key));
      if (unknownKeys.length > 0) {
        incompatible = true;
        for (const key of unknownKeys) issue(`${field}.${key}`);
      }
      if (typeof value.enabled !== "boolean") {
        incompatible = true;
        issue(`${field}.enabled`);
      } else {
        enabled = value.enabled;
      }
      if (value.required !== undefined && typeof value.required !== "boolean") {
        incompatible = true;
        issue(`${field}.required`);
      }
      if (value.required === true && value.enabled === false) {
        incompatible = true;
        issue(`${field}.required`);
      }
    } else {
      incompatible = true;
      issue();
    }
    if (!incompatible && enabled === true) requirements.push(...requirementUse(definition.ruleId, mcpFieldProvenance(component, field)));
  } else if (definition.shape === "elicitation-flags") {
    const elicitationRules = {
      form: CompatibilityPolicyRegistry.mcp.featureElicitationForm.id,
      url: CompatibilityPolicyRegistry.mcp.featureElicitationUrl.id,
    } as const;
    if (typeof value === "string") {
      if (value === "form") requirements.push(...requirementUse(elicitationRules.form, mcpFieldProvenance(component, field)));
      else if (value === "url") requirements.push(...requirementUse(elicitationRules.url, mcpFieldProvenance(component, field)));
      else {
        incompatible = true;
        issue();
      }
    } else if (isRecord(value)) {
      const allowed = CompatibilityPolicyRegistry.mcp.keys.elicitationFeatureKeys as readonly string[];
      const keys = Object.keys(value);
      const unknownKeys = keys.filter((key) => !allowed.includes(key));
      if (unknownKeys.length > 0) {
        incompatible = true;
        for (const key of unknownKeys) issue(`${field}.${key}`);
      }
      if (keys.length === 0) {
        incompatible = true;
        issue();
      }
      for (const key of keys.filter((candidate) => allowed.includes(candidate))) {
        if (typeof value[key] !== "boolean") {
          incompatible = true;
          issue(`${field}.${key}`);
        }
      }
      if (!incompatible) {
        if (value.form === true) requirements.push(...requirementUse(elicitationRules.form, mcpFieldProvenance(component, `${field}.form`)));
        if (value.url === true) requirements.push(...requirementUse(elicitationRules.url, mcpFieldProvenance(component, `${field}.url`)));
      }
    } else {
      incompatible = true;
      issue();
    }
  } else if (definition.shape === "oauth") {
    const parsed = oauthFlow(value);
    if (!parsed.valid || parsed.flow === undefined || parsed.ruleId === undefined) incompatible = true;
    else requirements.push(...requirementUse(parsed.ruleId, mcpFieldProvenance(component, field)));
  } else if (definition.shape === "headers") {
    for (const name of invalidHeaderFields(value)) {
      incompatible = true;
      issue(name.length === 0 ? field : `${field}.${name}`);
    }
  }

  if (incompatible && diagnostics.length === 0) issue();
  return { requirements, diagnostics, incompatible };
}

function evaluateMcp(
  pluginKey: string,
  component: McpServerComponent,
): PolicyDecision {
  const declaration = JsonValueSchema.parse(component.declaration.value);
  if (!isRecord(declaration)) {
    return decision("incompatible", [], [mcpIssue(pluginKey, component, "declaration")]);
  }

  const requirements: RequirementUse[] = [];
  const diagnostics: Diagnostic[] = [];
  let incompatible = false;
  const knownKeys = new Set<string>();
  for (const value of Object.values(CompatibilityPolicyRegistry.mcp.keys)) {
    if (typeof value === "string") knownKeys.add(value);
  }
  for (const key of Object.keys(declaration)) {
    if (!knownKeys.has(key)) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, key));
    }
  }

  const selectors: Array<{ field: string; value: string }> = [];
  for (const field of ["transport", "type"] as const) {
    const value = declaration[field];
    if (value !== undefined) {
      if (typeof value !== "string") {
        incompatible = true;
        diagnostics.push(mcpIssue(pluginKey, component, field));
      } else {
        selectors.push({ field, value });
      }
    }
  }
  let transport: ReturnType<typeof canonicalTransport> = undefined;
  const command = declaration.command;
  const url = declaration.url;
  const inferred = command !== undefined ? "stdio" : url !== undefined ? "streamable-http" : undefined;
  for (const selector of selectors) {
    const value = canonicalTransport(selector.value);
    if (value === undefined) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, selector.field, selector.value));
      continue;
    }
    if (transport !== undefined && transport !== value) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, selector.field, selector.value));
    }
    transport = value;
  }
  if (transport === undefined) transport = inferred;
  if (transport === undefined) {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "transport"));
  }
  if (command !== undefined && url !== undefined) {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "transport"));
  }
  if (transport === "stdio") {
    if (typeof command !== "string" || command.length === 0) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, "command"));
    }
    if (url !== undefined) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, "url"));
    }
  } else if (transport === "streamable-http") {
    if (typeof url !== "string" || url.length === 0) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, "url"));
    } else {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported URL protocol");
      } catch {
        incompatible = true;
        diagnostics.push(mcpIssue(pluginKey, component, "url"));
      }
    }
    if (command !== undefined) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, "command"));
    }
  } else if (transport === "sse") {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "transport", "sse", CompatibilityPolicyRegistry.mcp.transportSse.id));
  } else if (transport === "websocket") {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "transport", "websocket", CompatibilityPolicyRegistry.mcp.transportWebsocket.id));
  }

  if (transport === "stdio") {
    requirements.push(...requirementUse(CompatibilityPolicyRegistry.mcp.transportStdio.id, component.declaration.provenance));
  } else if (transport === "streamable-http") {
    requirements.push(...requirementUse(CompatibilityPolicyRegistry.mcp.transportStreamableHttp.id, component.declaration.provenance));
  }

  for (const field of ["args", "allowTools", "allowedTools", "denyTools", "disabledTools"] as const) {
    if (declaration[field] !== undefined && !valueIsStringArray(declaration[field]!)) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, field));
    }
  }
  if (declaration.tools !== undefined) {
    const tools = declaration.tools;
    if (!(valueIsStringArray(tools) || (isRecord(tools) &&
      recordHasOnlyKeys(tools, ["allow", "deny"]) &&
      (tools.allow === undefined || valueIsStringArray(tools.allow)) &&
      (tools.deny === undefined || valueIsStringArray(tools.deny))))) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, "tools"));
    }
  }
  for (const field of ["env"] as const) {
    if (declaration[field] !== undefined && !valueIsStringRecord(declaration[field]!)) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, field));
    }
  }
  for (const field of ["cwd", "workingDirectory", "bearerTokenEnv", "instructions"] as const) {
    if (declaration[field] !== undefined && typeof declaration[field] !== "string") {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, field));
    }
  }
  for (const field of ["timeout", "startupTimeout", "toolTimeout", "timeoutMs"] as const) {
    if (declaration[field] !== undefined && !valueIsPositiveNumber(declaration[field]!)) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, field));
    }
  }
  if (declaration.resources !== undefined && !(typeof declaration.resources === "boolean" || valueIsStringArray(declaration.resources))) {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "resources"));
  }
  if (declaration.headers !== undefined) {
    const invalid = invalidHeaderFields(declaration.headers);
    for (const name of invalid) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, name.length === 0 ? "headers" : `headers.${name}`));
    }
  }

  const authValues = ["auth", "oauth", "authentication"]
    .filter((field) => declaration[field] !== undefined)
    .map((field) => ({ field, value: declaration[field]! }));
  if (authValues.length > 1) {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "auth"));
  } else if (authValues[0] !== undefined) {
    const { field, value } = authValues[0];
    const parsedOAuth = oauthFlow(value);
    const isOAuth = field === "oauth" || parsedOAuth.candidate || value === "oauth";
    if (isOAuth) {
      if (!parsedOAuth.valid || parsedOAuth.flow === undefined || parsedOAuth.ruleId === undefined || transport !== "streamable-http") {
        incompatible = true;
        diagnostics.push(mcpIssue(pluginKey, component, field, value));
      } else {
        requirements.push(...requirementUse(parsedOAuth.ruleId, component.declaration.provenance));
      }
    } else if (value === "none") {
      if (declaration.bearerTokenEnv !== undefined) {
        incompatible = true;
        diagnostics.push(mcpIssue(pluginKey, component, "bearerTokenEnv"));
      }
    } else if (value === "bearer" || value === "bearer-env" || isRecord(value)) {
      if (!bearerAuthIsKnown(value, declaration.bearerTokenEnv)) {
        incompatible = true;
        diagnostics.push(mcpIssue(pluginKey, component, field, value));
      }
    } else {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, field, value));
    }
  } else if (declaration.bearerTokenEnv !== undefined) {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "bearerTokenEnv"));
  }

  if (declaration.headersHelper !== undefined) {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "headersHelper", undefined, CompatibilityPolicyRegistry.mcp.headersHelper.id));
  }
  if (declaration.channels !== undefined) {
    incompatible = true;
    diagnostics.push(mcpIssue(pluginKey, component, "channels", undefined, CompatibilityPolicyRegistry.mcp.channels.id));
  }

  const featureDefinitions = CompatibilityPolicyRegistry.mcp.keys.featurePayloadDefinitions;
  const seenFeatures = new Set<string>();
  const evaluateFeatureRecord = (record: JsonRecord, prefix: string, topLevel: boolean): void => {
    for (const [field, value] of Object.entries(record)) {
      const definition = featureDefinitionFor(field);
      if (definition === undefined || (topLevel && !definition.topLevel)) continue;
      const canonical = Object.entries(featureDefinitions)
        .find(([, candidate]) => (candidate.aliases as readonly string[]).includes(field))?.[0];
      if (canonical === undefined) continue;
      if (seenFeatures.has(canonical)) {
        incompatible = true;
        diagnostics.push(mcpIssue(pluginKey, component, `${prefix}${field}`));
        continue;
      }
      seenFeatures.add(canonical);
      const fieldPath = `${prefix}${field}`;
      const result = mcpFeatureUses(pluginKey, component, fieldPath, value, definition);
      requirements.push(...result.requirements);
      diagnostics.push(...result.diagnostics);
      incompatible ||= result.incompatible;
      if (definition.shape === "oauth" && transport !== "streamable-http") {
        incompatible = true;
        diagnostics.push(mcpIssue(pluginKey, component, fieldPath));
      }
    }
  };

  // Direct feature aliases are supported by the normalized declaration. The
  // nested feature map is an additional exact shape, not a second chance to
  // interpret arbitrary keys. Core auth/header declarations occupy the same
  // canonical feature slots, so duplicate nested aliases are ambiguous too.
  if (declaration.oauth !== undefined || declaration.auth !== undefined || declaration.authentication !== undefined) {
    seenFeatures.add("oauth");
  }
  if (declaration.headers !== undefined) seenFeatures.add("headers");
  evaluateFeatureRecord(declaration, "", true);
  if (declaration.features !== undefined) {
    if (!isRecord(declaration.features)) {
      incompatible = true;
      diagnostics.push(mcpIssue(pluginKey, component, "features"));
    } else {
      evaluateFeatureRecord(declaration.features, "features.", false);
      for (const field of Object.keys(declaration.features)) {
        if (featureDefinitionFor(field) === undefined) {
          incompatible = true;
          diagnostics.push(mcpIssue(pluginKey, component, `features.${field}`));
        }
      }
    }
  }

  return decision(incompatible ? "incompatible" : "supported", requirements, diagnostics);
}

function evaluateForeign(
  pluginKey: string,
  component: ForeignComponent,
): PolicyDecision {
  const provenances = sortedProvenance([
    ...component.nativeKind.provenance,
    ...component.declaration.provenance,
  ]);
  const ruleId = component.nativeKind.value === "hook-handler"
    ? CompatibilityPolicyRegistry.hookHandlers.unsupportedHandler.id
    : CompatibilityPolicyRegistry.foreign.defaultDeny.id;
  return decision("incompatible", [], [diagnostic(pluginKey, ruleId, "error", provenances, {
    componentId: component.id,
    nativeHost: component.nativeHost,
    nativeKind: component.nativeKind.value,
  })]);
}

function evaluateComponent(pluginKey: string, component: Component): PolicyDecision {
  switch (component.kind) {
    case ComponentKindRegistry.skill.tag:
      return evaluateSkill(pluginKey, component);
    case ComponentKindRegistry.hook.tag:
      return evaluateHook(pluginKey, component);
    case ComponentKindRegistry.mcpServer.tag:
      return evaluateMcp(pluginKey, component);
    case ComponentKindRegistry.foreign.tag:
      return evaluateForeign(pluginKey, component);
    default:
      return assertNever(component);
  }
}

function requirementId(componentId: string, capability: RuntimeCapabilityId): RuntimeRequirementId {
  return RuntimeRequirementIdSchema.parse(`${REQUIREMENT_ID_PREFIX}:${capability}:${componentId}`);
}

function createRequirementAssessment(
  component: Component,
  use: RequirementUse,
  capabilities: RuntimeCapabilitySnapshot,
): RuntimeRequirementAssessment {
  const capability = capabilities.capabilities[use.capability];
  if (capability === undefined) throw new Error(`missing validated capability ${use.capability}`);
  const capabilityEntry = Object.values(RuntimeCapabilityRegistry).find((candidate) => candidate.id === use.capability);
  if (capabilityEntry === undefined) throw new Error(`capability registry is missing ${use.capability}`);
  const id = requirementId(component.id, use.capability);
  return RuntimeRequirementAssessmentSchema.parse({
    requirement: RuntimeRequirementSchema.parse({
      id,
      capability: use.capability,
      description: capabilityEntry.description,
      // Claims carry raw declarations for ingestion and reconciliation. A
      // compatibility report is an inspection boundary, so it retains exact
      // source locations but never serializes those declarations.
      provenance: sortedProvenance(use.provenance).map((provenance) =>
        ProvenanceSchema.parse({ location: provenance.location }),
      ),
    }),
    status: capability.status,
    // Adapter explanations are runtime-owned text and may contain paths,
    // environment values, timestamps, or native errors. Reports use the
    // registry description plus the status vocabulary instead.
    explanation: `${capabilityEntry.description} (${capability.status})`,
  });
}

function unavailableRequirementDiagnostic(
  pluginKey: string,
  component: Component,
  requirement: RuntimeRequirementAssessment,
  ruleId: string,
): Diagnostic {
  const capability = requirement.requirement.capability;
  return diagnostic(pluginKey, CompatibilityPolicyRegistry.mcp.defaultDeny.id, "error", requirement.requirement.provenance, {
    componentId: component.id,
    requirementId: requirement.requirement.id,
    capability,
    policyRuleId: ruleId,
  }, `${capability} is unavailable for this supported component`, ErrorCodeRegistry.requirementUnavailable);
}

function configurationDetails(option: ConfigurationOption): JsonValue {
  const value = option.value;
  const details: Record<string, JsonValue> = {
    key: option.key,
    kind: value.kind,
    required: option.required,
    sensitive: option.sensitive,
    hasDefault: Object.prototype.hasOwnProperty.call(value, "default"),
  };
  if (value.kind === "directory" || value.kind === "file") {
    details.pathConstraint = { mustExist: value.mustExist };
  } else if (value.kind === "number") {
    details.bounds = {
      ...(value.min === undefined ? {} : { min: value.min }),
      ...(value.max === undefined ? {} : { max: value.max }),
    };
  } else if (value.kind === "strings") {
    details.bounds = {
      ...(value.minItems === undefined ? {} : { minItems: value.minItems }),
      ...(value.maxItems === undefined ? {} : { maxItems: value.maxItems }),
    };
  } else if (value.kind === "string" && value.pattern !== undefined) {
    details.hasPatternConstraint = true;
  }
  return details;
}

function evaluateConfiguration(pluginKey: string, plugin: NormalizedPlugin): readonly Diagnostic[] {
  const configuration = PluginConfigurationSchema.parse(plugin.configuration);
  const diagnostics: Diagnostic[] = [];
  for (const option of [...configuration.options].sort((left, right) => compareText(left.key, right.key))) {
    const provenance = sortedProvenance(option.provenance);
    const details = configurationDetails(option) as Record<string, JsonValue>;
    diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.configuration.descriptor.id, "warning", provenance, details));
    const hasDefault = Boolean(details.hasDefault);
    if (option.required && !hasDefault) {
      diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.configuration.requiredInput.id, "warning", provenance, {
        key: option.key,
        required: true,
        hasDefault: false,
      }));
    }
    if (option.sensitive) {
      diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.configuration.sensitive.id, "warning", provenance, {
        key: option.key,
        sensitive: true,
      }));
    }
  }
  return diagnostics;
}

function evaluateMarketplacePolicy(
  pluginKey: string,
  policy: MarketplaceInstallationPolicy | undefined,
): readonly Diagnostic[] {
  if (policy === undefined) return [];
  const diagnostics: Diagnostic[] = [];
  const availabilityRule = {
    available: CompatibilityPolicyRegistry.marketplace.availabilityAvailable.id,
    "installed-by-default": CompatibilityPolicyRegistry.marketplace.availabilityInstalledByDefault.id,
    "not-available": CompatibilityPolicyRegistry.marketplace.availabilityNotAvailable.id,
  }[policy.availability.value];
  diagnostics.push(diagnostic(pluginKey, availabilityRule, "warning", policy.availability.provenance, {
    availability: policy.availability.value,
    advisoryOnly: true,
  }));
  if (policy.authentication !== undefined) {
    diagnostics.push(diagnostic(pluginKey, CompatibilityPolicyRegistry.marketplace.policy.id, "warning", policy.authentication.provenance, {
      hasAuthenticationPolicy: true,
      advisoryOnly: true,
    }));
  }
  return diagnostics;
}

function normalizedReportIdentity(plugin: NormalizedPlugin): NormalizedPlugin["identity"] {
  const identity = plugin.identity;
  return {
    key: identity.key,
    marketplaceName: identity.marketplaceName,
    marketplaceEntryName: identity.marketplaceEntryName,
    ...(identity.manifestName === undefined ? {} : { manifestName: identity.manifestName }),
  };
}

function pluginMetadataDiagnostics(pluginKey: string, plugin: NormalizedPlugin): readonly Diagnostic[] {
  const known = new Set<string>(CompatibilityPolicyRegistry.metadata.knownPluginPresentationKeys);
  return [...plugin.metadata]
    .sort((left, right) => compareText(left.key, right.key))
    .map((metadata) => diagnostic(
      pluginKey,
      known.has(metadata.key)
        ? CompatibilityPolicyRegistry.report.knownPresentation.id
        : CompatibilityPolicyRegistry.skills.presentation.id,
      "warning",
      metadata.claimed.provenance,
      {
        field: metadata.key,
        knownPresentation: known.has(metadata.key),
        advisoryOnly: true,
      },
    ));
}

function assertCompleteAssessment(
  components: readonly Component[],
  assessments: readonly ComponentAssessment[],
): void {
  if (components.length !== assessments.length) {
    throw new Error(`compatibility evaluator emitted ${assessments.length} assessments for ${components.length} components`);
  }
  const expected = new Set(components.map((component) => component.id));
  const actual = new Set<string>();
  for (const assessment of assessments) {
    if (!expected.has(assessment.componentId)) throw new Error(`assessment has unknown component id ${assessment.componentId}`);
    if (actual.has(assessment.componentId)) throw new Error(`duplicate compatibility assessment ${assessment.componentId}`);
    actual.add(assessment.componentId);
  }
  if (actual.size !== expected.size) throw new Error("compatibility evaluator omitted a component assessment");
}

/**
 * Evaluate a complete normalized bundle using only policy data and a complete
 * capability snapshot. No runtime adapter, process, filesystem, or network
 * operation is reachable from this function.
 */
export function evaluateCompatibility(input: CompatibilityEvaluationInput): CompatibilityReport {
  const valid = CompatibilityEvaluationInputSchema.parse(input);
  const plugin = valid.plugin;
  const pluginKey = plugin.identity.key;
  const components = [...flattenComponents(plugin.components)].sort((left, right) => {
    const rank = componentKindRank(left.kind) - componentKindRank(right.kind);
    return rank !== 0 ? rank : compareText(left.id, right.id);
  });

  const decisions = components.map((component) => ({
    component,
    decision: evaluateComponent(pluginKey, ComponentSchema.parse(component)),
  }));
  const assessments = decisions.map(({ component, decision: componentDecision }) =>
    ComponentAssessmentSchema.parse({
      componentId: component.id,
      verdict: componentDecision.verdict === "supported"
        ? { kind: ComponentVerdictRegistry.supported.tag }
        : { kind: ComponentVerdictRegistry.incompatible.tag, reason: componentDecision.diagnostics[0]?.message ?? "Unsupported declaration" },
      requirementIds: [],
      diagnostics: componentDecision.diagnostics,
    }),
  );

  const requirements: RuntimeRequirementAssessment[] = [];
  const requirementUsesByComponent = new Map<string, readonly RequirementUse[]>();
  const requirementsByComponent = new Map<string, string[]>();
  for (const { component, decision: componentDecision } of decisions) {
    if (componentDecision.verdict !== "supported") continue;
    const uses = mergeRequirementUses(componentDecision.requirements);
    requirementUsesByComponent.set(component.id, uses);
    const componentRequirementIds = requirementsByComponent.get(component.id) ?? [];
    for (const use of uses) {
      const assessment = createRequirementAssessment(component, use, valid.capabilities);
      requirements.push(assessment);
      componentRequirementIds.push(assessment.requirement.id);
    }
    requirementsByComponent.set(component.id, componentRequirementIds);
  }
  const finalAssessments = assessments.map((assessment) => ComponentAssessmentSchema.parse({
    ...assessment,
    requirementIds: requirementsByComponent.get(assessment.componentId) ?? [],
  }));
  assertCompleteAssessment(components, finalAssessments);

  const sortedRequirements = [...requirements].sort((left, right) => {
    const leftComponent = components.find((component) => left.requirement.id.endsWith(`:${component.id}`));
    const rightComponent = components.find((component) => right.requirement.id.endsWith(`:${component.id}`));
    const leftComponentId = leftComponent?.id ?? "";
    const rightComponentId = rightComponent?.id ?? "";
    const kindRank = (leftComponent === undefined ? Number.MAX_SAFE_INTEGER : componentKindRank(leftComponent.kind)) -
      (rightComponent === undefined ? Number.MAX_SAFE_INTEGER : componentKindRank(rightComponent.kind));
    if (kindRank !== 0) return kindRank;
    if (leftComponentId !== rightComponentId) return compareText(leftComponentId, rightComponentId);
    const capabilityOrder = capabilityRank(left.requirement.capability) - capabilityRank(right.requirement.capability);
    return capabilityOrder !== 0 ? capabilityOrder : compareText(left.requirement.id, right.requirement.id);
  });
  const reportDiagnostics: Diagnostic[] = [];
  for (const { component } of decisions) {
    for (const requirement of sortedRequirements) {
      if (requirement.status !== RuntimeRequirementStatusRegistry.unavailable.tag) continue;
      if (!requirement.requirement.id.endsWith(`:${component.id}`)) continue;
      const use = requirementUsesByComponent.get(component.id)?.find((candidate) => candidate.capability === requirement.requirement.capability);
      reportDiagnostics.push(unavailableRequirementDiagnostic(pluginKey, component, requirement, use?.ruleId ?? CompatibilityPolicyRegistry.mcp.defaultDeny.id));
    }
  }
  reportDiagnostics.push(...evaluateConfiguration(pluginKey, plugin));
  reportDiagnostics.push(...evaluateMarketplacePolicy(pluginKey, valid.marketplacePolicy));
  reportDiagnostics.push(...pluginMetadataDiagnostics(pluginKey, plugin));
  reportDiagnostics.sort(compareDiagnostics);

  const activatable = deriveActivatable({
    components: finalAssessments,
    requirements: sortedRequirements,
  });
  // This factory is intentionally the final gate. The evaluator never writes
  // or independently validates a second activatability algorithm.
  return createCompatibilityReport({
    plugin: normalizedReportIdentity(plugin),
    activatable,
    components: finalAssessments,
    requirements: sortedRequirements,
    diagnostics: reportDiagnostics,
  });
}

function assertNever(value: never): never {
  throw new Error(`Unhandled compatibility component: ${String(value)}`);
}
