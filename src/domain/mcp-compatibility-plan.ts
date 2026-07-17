import { z } from "zod";
import {
  ComponentIdSchema,
  McpServerComponentSchema,
  type McpServerComponent,
} from "./components.js";
import {
  CompatibilityPolicyRegistry,
  CompatibilityPolicyRuleRegistry,
  RuntimeCapabilityIdSchema,
  RuntimeCapabilityRegistry,
  type RuntimeCapabilityId,
} from "./compatibility-policy.js";
import {
  DiagnosticSchema,
  ErrorCodeRegistry,
  type Diagnostic,
} from "./errors.js";
import { PluginKeySchema, type PluginKey } from "./identity.js";
import { SourceLocationSchema, type SourceLocation } from "./provenance-location.js";
import { ProvenanceSchema, type Provenance } from "./provenance.js";
import { JsonValueSchema, type JsonValue } from "./schema.js";
import { isSensitiveFieldName, isSensitiveQueryName } from "./sensitive-fields.js";
import { canonicalJson, compareUtf8 } from "./canonical-json.js";

export const McpCanonicalTransportSchema = z.enum(["stdio", "streamable-http"]);
export type McpCanonicalTransport = z.infer<typeof McpCanonicalTransportSchema>;

export const McpCanonicalAuthSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict().readonly(),
  z.object({ kind: z.literal("bearer-environment") }).strict().readonly(),
  z.object({
    kind: z.literal("oauth"),
    flow: z.enum(["authorization-code", "client-credentials"]),
  }).strict().readonly(),
]);
export type McpCanonicalAuth = z.infer<typeof McpCanonicalAuthSchema>;

export const McpCanonicalOptionsSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  startupTimeoutMs: z.number().int().positive().optional(),
  toolTimeoutMs: z.number().int().positive().optional(),
  allowedTools: z.array(z.string().min(1)).readonly().optional(),
  deniedTools: z.array(z.string().min(1)).readonly().optional(),
  instructions: z.string().optional(),
  resources: z.union([z.boolean(), z.array(z.string()).readonly()]).optional(),
  toolApproval: z.boolean().optional(),
  sampling: z.boolean().optional(),
  elicitation: z.object({
    form: z.boolean(),
    url: z.boolean(),
  }).strict().readonly().optional(),
  auth: McpCanonicalAuthSchema,
}).strict().readonly();
export type McpCanonicalOptions = z.infer<typeof McpCanonicalOptionsSchemaV1>;

export const McpCompatibilityPlanSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  componentId: ComponentIdSchema,
  transport: McpCanonicalTransportSchema,
  options: McpCanonicalOptionsSchemaV1,
  requirementCapabilityIds: z.array(RuntimeCapabilityIdSchema).readonly(),
  provenance: z.array(SourceLocationSchema).nonempty().readonly(),
}).strict().readonly();
export type McpCompatibilityPlan = z.infer<typeof McpCompatibilityPlanSchemaV1>;

export type McpCompatibilityAnalysis =
  | Readonly<{ kind: "supported"; plan: McpCompatibilityPlan }>
  | Readonly<{ kind: "incompatible"; diagnostics: readonly Diagnostic[] }>;

type JsonRecord = Readonly<Record<string, JsonValue>>;
type OAuthFlow = "authorization-code" | "client-credentials";
type AuthMode = "none" | "bearer" | "oauth";

type RequirementUse = Readonly<{
  capability: RuntimeCapabilityId;
  ruleId: string;
}>;

const OPERATION = "evaluateCompatibility";

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function fieldProvenance(component: McpServerComponent, field: string): readonly Provenance[] {
  if (field === "declaration") return component.declaration.provenance;
  return component.declaration.provenance.map((provenance) => {
    const base = provenance.location.pointer ?? "";
    return ProvenanceSchema.parse({
      location: {
        ...provenance.location,
        pointer: `${base}/${field.split(".").map(pointerSegment).join("/")}`,
      },
    });
  });
}

function locationKey(location: SourceLocation): string {
  return canonicalJson({
    host: location.host,
    documentKind: location.documentKind,
    path: location.path,
    pointer: location.pointer ?? "",
    line: location.line ?? 0,
    column: location.column ?? 0,
  });
}

export function compareMcpSourceLocations(left: SourceLocation, right: SourceLocation): number {
  return compareUtf8(locationKey(left), locationKey(right));
}

export function canonicalMcpSourceLocations(component: McpServerComponent): readonly [SourceLocation, ...SourceLocation[]] {
  const locations = [...component.nativeKey.provenance, ...component.declaration.provenance]
    .map((provenance) => SourceLocationSchema.parse(provenance.location))
    .sort(compareMcpSourceLocations);
  const unique = locations.filter((location, index) =>
    index === 0 || locationKey(location) !== locationKey(locations[index - 1]!));
  if (unique.length === 0) throw new Error("MCP compatibility provenance cannot be empty");
  return unique as [SourceLocation, ...SourceLocation[]];
}

function diagnosticLocations(provenance: readonly Provenance[]): JsonValue {
  return provenance.map((entry) => SourceLocationSchema.parse(entry.location)) as unknown as JsonValue;
}

function safeScalar(field: string, value: JsonValue | undefined): JsonValue | undefined {
  if (typeof value !== "string") return undefined;
  if (field === "transport" || field === "type") {
    return canonicalTransport(value) === undefined ? undefined : value;
  }
  if (["auth", "oauth", "authentication"].includes(field) &&
      ["none", "bearer", "bearer-env", "oauth"].includes(value)) return value;
  return undefined;
}

function issue(
  plugin: PluginKey,
  component: McpServerComponent,
  field: string,
  value?: JsonValue,
  ruleId: string = CompatibilityPolicyRegistry.mcp.defaultDeny.id,
): Diagnostic {
  const rule = CompatibilityPolicyRuleRegistry[ruleId];
  if (rule === undefined) throw new Error(`compatibility policy registry is missing rule ${ruleId}`);
  const provenance = fieldProvenance(component, field);
  const safeValue = safeScalar(field, value);
  return DiagnosticSchema.parse({
    code: rule.diagnosticCode ?? ErrorCodeRegistry.unsupportedDeclaration,
    severity: "error",
    operation: OPERATION,
    message: rule.message,
    location: provenance[0]!.location,
    plugin,
    details: {
      componentId: component.id,
      field,
      ...(safeValue === undefined ? {} : { value: safeValue }),
      ruleId,
      sourceLocations: diagnosticLocations(provenance),
    },
  });
}

function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
  const severity = left.severity === right.severity ? 0 : left.severity === "error" ? -1 : 1;
  if (severity !== 0) return severity;
  const code = compareUtf8(left.code, right.code);
  if (code !== 0) return code;
  const leftLocation = left.location === undefined ? "" : locationKey(left.location);
  const rightLocation = right.location === undefined ? "" : locationKey(right.location);
  const location = compareUtf8(leftLocation, rightLocation);
  if (location !== 0) return location;
  return compareUtf8(canonicalJson(left.details ?? null), canonicalJson(right.details ?? null));
}

function capabilityRank(id: RuntimeCapabilityId): number {
  return Object.values(RuntimeCapabilityRegistry).find((entry) => entry.id === id)?.rank ?? Number.MAX_SAFE_INTEGER;
}

function requirements(...ruleIds: readonly string[]): readonly RequirementUse[] {
  const byCapability = new Map<RuntimeCapabilityId, string>();
  for (const ruleId of ruleIds) {
    const rule = CompatibilityPolicyRuleRegistry[ruleId];
    if (rule === undefined) throw new Error(`compatibility policy registry is missing rule ${ruleId}`);
    for (const capability of rule.requirementCapabilityIds) {
      const previous = byCapability.get(capability);
      if (previous === undefined || compareUtf8(ruleId, previous) < 0) byCapability.set(capability, ruleId);
    }
  }
  return [...byCapability].sort(([left], [right]) => {
    const rank = capabilityRank(left) - capabilityRank(right);
    return rank !== 0 ? rank : compareUtf8(left, right);
  }).map(([capability, ruleId]) => ({ capability, ruleId }));
}

function canonicalTransport(value: string): "stdio" | "streamable-http" | "sse" | "websocket" | undefined {
  const keys = CompatibilityPolicyRegistry.mcp.keys;
  if ((keys.transportValues as readonly string[]).includes(value)) {
    return value as "stdio" | "streamable-http" | "sse" | "websocket";
  }
  return (keys.transportAliases as Readonly<Record<string, "streamable-http">>)[value];
}

function stringArray(value: JsonValue): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

const PORTABLE_VALUE_REFERENCE = /^\$\{(?:user_config\.[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)\}$/;
const PORTABLE_ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HTTP_HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function portableCredentialTemplate(value: string): boolean {
  return PORTABLE_VALUE_REFERENCE.test(value) ||
    /^(?:bearer|basic)\s+\$\{(?:user_config\.[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)\}$/i.test(value);
}

function invalidEnvironmentFields(value: JsonValue): readonly string[] {
  if (!isRecord(value)) return [""];
  return Object.entries(value)
    .filter(([name, entry]) => !PORTABLE_ENVIRONMENT_NAME.test(name) || typeof entry !== "string" ||
      (isSensitiveFieldName(name) && !PORTABLE_VALUE_REFERENCE.test(entry)))
    .map(([name]) => name)
    .sort(compareUtf8);
}

function positiveNumber(value: JsonValue): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function exactStringSet(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareUtf8);
}

function equalJson(left: JsonValue, right: JsonValue): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function resolveAliases<T extends JsonValue>(
  declaration: JsonRecord,
  aliases: readonly string[],
  parse: (value: JsonValue) => T | undefined,
): Readonly<{ value?: T; conflicts: readonly string[]; invalid: readonly string[] }> {
  const present = aliases.filter((alias) => declaration[alias] !== undefined);
  const parsed = present.map((alias) => ({ alias, value: parse(declaration[alias]!) }));
  const invalid = parsed.filter((entry) => entry.value === undefined).map((entry) => entry.alias);
  const valid = parsed.filter((entry): entry is { alias: string; value: T } => entry.value !== undefined);
  const first = valid[0]?.value;
  const conflicts = first === undefined
    ? []
    : valid.filter((entry) => !equalJson(entry.value, first)).map((entry) => entry.alias);
  return {
    ...(first === undefined ? {} : { value: first }),
    conflicts,
    invalid,
  };
}

function parseString(value: JsonValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parsePositiveInteger(value: JsonValue): number | undefined {
  return positiveNumber(value) && Number.isInteger(value) ? value : undefined;
}

function parseToolList(value: JsonValue): readonly string[] | undefined {
  return stringArray(value) && value.every((entry) => entry.length > 0)
    ? exactStringSet(value)
    : undefined;
}

function invalidHeaderFields(value: JsonValue): readonly string[] {
  if (!isRecord(value)) return [""];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const [name, entry] of Object.entries(value)) {
    const canonicalName = name.toLowerCase();
    if (!HTTP_HEADER_NAME.test(name) || seen.has(canonicalName)) {
      invalid.push(name);
      continue;
    }
    seen.add(canonicalName);
    if (typeof entry === "string") {
      if (entry.length === 0 || isSensitiveFieldName(name) && !portableCredentialTemplate(entry)) {
        invalid.push(name);
      }
    } else if (!isRecord(entry) || Object.keys(entry).length !== 1 ||
      typeof entry.env !== "string" || !PORTABLE_ENVIRONMENT_NAME.test(entry.env)) {
      invalid.push(name);
    }
  }
  return invalid.sort(compareUtf8);
}

function recognizedFlow(value: string): OAuthFlow | undefined {
  for (const [name, definition] of Object.entries(CompatibilityPolicyRegistry.mcp.keys.oauthFlowDefinitions)) {
    if ((definition.aliases as readonly string[]).includes(value)) {
      return name === "authorizationCode" ? "authorization-code" : "client-credentials";
    }
  }
  return undefined;
}

function recognizedAuthMode(value: string): AuthMode | undefined {
  for (const [mode, definition] of Object.entries(CompatibilityPolicyRegistry.mcp.keys.authSelectorDefinitions.modes)) {
    if ((definition.aliases as readonly string[]).includes(value)) return mode as AuthMode;
  }
  return undefined;
}

function parseAuth(value: JsonValue, externalBearer?: string): McpCanonicalAuth | undefined {
  const definitions = CompatibilityPolicyRegistry.mcp.keys.authSelectorDefinitions;
  if (typeof value === "string") {
    const mode = recognizedAuthMode(value);
    if (mode === "none") return externalBearer === undefined ? { kind: "none" } : undefined;
    if (mode === "bearer") return externalBearer === undefined ? undefined : { kind: "bearer-environment" };
    const flow = recognizedFlow(value);
    return flow === undefined || externalBearer !== undefined ? undefined : { kind: "oauth", flow };
  }
  if (!isRecord(value)) return undefined;
  const allowed = [
    ...definitions.modeKeys,
    ...definitions.bearerEnvironmentKeys,
    ...definitions.oauthParameterKeys,
    ...definitions.oauthFlowKeys,
    ...definitions.oauthBooleanFlowKeys,
  ] as readonly string[];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return undefined;

  const modes: AuthMode[] = [];
  const flows: OAuthFlow[] = [];
  let modeSelectors = 0;
  let flowSelectors = 0;
  let nestedBearer: string | undefined;
  let oauthParameter = false;
  for (const [key, entry] of Object.entries(value)) {
    if ((definitions.modeKeys as readonly string[]).includes(key)) {
      modeSelectors += 1;
      if (typeof entry !== "string") return undefined;
      const mode = recognizedAuthMode(entry);
      if (mode !== undefined) modes.push(mode);
      else if (key === "type") {
        const flow = recognizedFlow(entry);
        if (flow === undefined) return undefined;
        flowSelectors += 1;
        flows.push(flow);
      } else return undefined;
    } else if ((definitions.oauthFlowKeys as readonly string[]).includes(key)) {
      flowSelectors += 1;
      if (typeof entry !== "string") return undefined;
      const flow = recognizedFlow(entry);
      if (flow === undefined) return undefined;
      flows.push(flow);
    } else if ((definitions.oauthBooleanFlowKeys as readonly string[]).includes(key)) {
      flowSelectors += 1;
      if (typeof entry !== "boolean") return undefined;
      if (entry) flows.push(key.startsWith("authorization") ? "authorization-code" : "client-credentials");
    } else if ((definitions.bearerEnvironmentKeys as readonly string[]).includes(key)) {
      if (typeof entry !== "string" || entry.length === 0) return undefined;
      nestedBearer = entry;
    } else {
      oauthParameter = true;
      if (typeof entry !== "string" || entry.length === 0) return undefined;
    }
  }
  if (modeSelectors > 1 || modes.length > 1 || flowSelectors > 1 || flows.length > 1) return undefined;
  const mode = modes[0];
  const hasBearer = nestedBearer !== undefined || externalBearer !== undefined || mode === "bearer";
  const hasOAuth = flowSelectors > 0 || mode === "oauth";
  if (hasBearer && hasOAuth) return undefined;
  if (nestedBearer !== undefined && externalBearer !== undefined) return undefined;
  if (mode === "none") {
    return flowSelectors === 0 && !oauthParameter && !hasBearer ? { kind: "none" } : undefined;
  }
  if (hasBearer) return !oauthParameter && flowSelectors === 0 ? { kind: "bearer-environment" } : undefined;
  if (flows.length === 1) return { kind: "oauth", flow: flows[0]! };
  return undefined;
}

function booleanFeature(value: JsonValue): Readonly<{
  value?: boolean;
  issueSuffixes: readonly string[];
}> {
  if (typeof value === "boolean") return { value, issueSuffixes: [] };
  if (!isRecord(value)) return { issueSuffixes: [""] };
  const issueSuffixes = Object.keys(value)
    .filter((key) => !["enabled", "required"].includes(key))
    .sort(compareUtf8);
  if (typeof value.enabled !== "boolean") issueSuffixes.push("enabled");
  if (value.required !== undefined && typeof value.required !== "boolean") issueSuffixes.push("required");
  if (value.required === true && value.enabled === false) issueSuffixes.push("required");
  return issueSuffixes.length > 0
    ? { issueSuffixes }
    : { value: value.enabled as boolean, issueSuffixes: [] };
}

function elicitationFeature(value: JsonValue): Readonly<{ form: boolean; url: boolean }> | undefined {
  if (value === "form") return { form: true, url: false };
  if (value === "url") return { form: false, url: true };
  if (!isRecord(value) || Object.keys(value).length === 0 ||
      Object.keys(value).some((key) => !["form", "url"].includes(key)) ||
      Object.values(value).some((entry) => typeof entry !== "boolean")) return undefined;
  return { form: value.form === true, url: value.url === true };
}

function knownTopLevelKeys(): ReadonlySet<string> {
  const keys = CompatibilityPolicyRegistry.mcp.keys;
  return new Set([
    "transport", "type", "command", "args", "env", "cwd", "workingDirectory", "url",
    "headers", "bearerTokenEnv", "auth", "oauth", "authentication", "timeout",
    "startupTimeout", "toolTimeout", "timeoutMs", "allowTools", "allowedTools",
    "denyTools", "disabledTools", "tools", "instructions", "resources", "toolApproval",
    "tool_approval", "sampling", "elicitation", "features", "headersHelper", "channels",
    ...keys.featureKeys,
  ]);
}

function transportAllowedFields(transport: string): readonly string[] {
  return CompatibilityPolicyRegistry.mcp.keys.transportAllowedFields[
    transport as keyof typeof CompatibilityPolicyRegistry.mcp.keys.transportAllowedFields
  ] ?? [];
}

function validateTransport(
  plugin: PluginKey,
  component: McpServerComponent,
  declaration: JsonRecord,
  diagnostics: Diagnostic[],
): "stdio" | "streamable-http" | "sse" | "websocket" | undefined {
  const selectors: Array<{
    field: string;
    value: ReturnType<typeof canonicalTransport>;
    raw?: string;
  }> = [];
  for (const field of ["transport", "type"]) {
    const raw = declaration[field];
    if (raw === undefined) continue;
    if (typeof raw !== "string") {
      diagnostics.push(issue(plugin, component, field));
      selectors.push({ field, value: undefined });
    } else {
      selectors.push({ field, value: canonicalTransport(raw), raw });
    }
  }
  let transport: ReturnType<typeof canonicalTransport>;
  for (const selector of selectors) {
    if (selector.value === undefined) {
      if (selector.raw !== undefined) diagnostics.push(issue(plugin, component, selector.field, selector.raw));
      transport = undefined;
      continue;
    }
    if (transport !== undefined && transport !== selector.value) {
      diagnostics.push(issue(plugin, component, selector.field, selector.raw));
      transport = undefined;
      continue;
    }
    transport = selector.value;
  }
  if (selectors.some((selector) => selector.value === undefined) ||
      selectors.length > 1 && new Set(selectors.map((selector) => selector.value)).size > 1) {
    diagnostics.push(issue(plugin, component, "transport"));
    return undefined;
  }
  transport ??= declaration.command !== undefined
    ? "stdio"
    : declaration.url !== undefined ? "streamable-http" : undefined;
  if (transport === undefined) diagnostics.push(issue(plugin, component, "transport"));
  return transport;
}

function analyze(
  plugin: PluginKey,
  component: McpServerComponent,
): McpCompatibilityAnalysis {
  const declarationValue = JsonValueSchema.parse(component.declaration.value);
  if (!isRecord(declarationValue)) {
    return { kind: "incompatible", diagnostics: [issue(plugin, component, "declaration")] };
  }
  const declaration = declarationValue;
  const diagnostics: Diagnostic[] = [];
  const ruleIds: string[] = [];
  const options: Record<string, JsonValue> = { schemaVersion: 1, auth: { kind: "none" } };

  const known = knownTopLevelKeys();
  for (const key of Object.keys(declaration)) {
    if (!known.has(key)) diagnostics.push(issue(plugin, component, key));
  }

  const transport = validateTransport(plugin, component, declaration, diagnostics);
  const allowedFields = transport === undefined ? [] : transportAllowedFields(transport);
  for (const field of Object.keys(declaration)) {
    if (field === "transport" || field === "type" || !known.has(field)) continue;
    if (!allowedFields.includes(field)) diagnostics.push(issue(plugin, component, field));
  }

  if (transport === "stdio") {
    if (typeof declaration.command !== "string" || declaration.command.length === 0) diagnostics.push(issue(plugin, component, "command"));
    ruleIds.push(CompatibilityPolicyRegistry.mcp.transportStdio.id);
  } else if (transport === "streamable-http" || transport === "sse" || transport === "websocket") {
    const url = declaration.url;
    let validUrl = typeof url === "string" && url.length > 0;
    if (validUrl) {
      try {
        const parsed = new URL(url as string);
        const protocols = transport === "websocket" ? ["ws:", "wss:"] : ["http:", "https:"];
        validUrl = protocols.includes(parsed.protocol) && parsed.username.length === 0 && parsed.password.length === 0 &&
          [...parsed.searchParams].every(([name, value]) =>
            !isSensitiveQueryName(name) || PORTABLE_VALUE_REFERENCE.test(value));
      } catch {
        validUrl = false;
      }
    }
    if (!validUrl) diagnostics.push(issue(plugin, component, "url"));
    if (transport === "streamable-http") ruleIds.push(CompatibilityPolicyRegistry.mcp.transportStreamableHttp.id);
    else diagnostics.push(issue(
      plugin,
      component,
      "transport",
      transport,
      transport === "sse"
        ? CompatibilityPolicyRegistry.mcp.transportSse.id
        : CompatibilityPolicyRegistry.mcp.transportWebsocket.id,
    ));
  }

  if (declaration.args !== undefined && !stringArray(declaration.args)) diagnostics.push(issue(plugin, component, "args"));
  if (declaration.env !== undefined && transport === "stdio") {
    for (const name of invalidEnvironmentFields(declaration.env)) {
      diagnostics.push(issue(plugin, component, name === "" ? "env" : `env.${name}`));
    }
  }
  if (declaration.headers !== undefined && transport === "streamable-http") {
    for (const name of invalidHeaderFields(declaration.headers)) {
      diagnostics.push(issue(plugin, component, name === "" ? "headers" : `headers.${name}`));
    }
  }
  if (declaration.headersHelper !== undefined) diagnostics.push(issue(plugin, component, "headersHelper", undefined, CompatibilityPolicyRegistry.mcp.headersHelper.id));
  if (declaration.channels !== undefined) diagnostics.push(issue(plugin, component, "channels", undefined, CompatibilityPolicyRegistry.mcp.channels.id));

  const cwd = resolveAliases(declaration, ["cwd", "workingDirectory"], parseString);
  for (const field of [...cwd.invalid, ...cwd.conflicts]) diagnostics.push(issue(plugin, component, field));

  const startup = resolveAliases(declaration, ["startupTimeout", "timeoutMs"], parsePositiveInteger);
  for (const field of [...startup.invalid, ...startup.conflicts]) diagnostics.push(issue(plugin, component, field));
  if (startup.value !== undefined) options.startupTimeoutMs = startup.value;
  const toolTimeout = resolveAliases(declaration, ["toolTimeout", "timeout"], parsePositiveInteger);
  for (const field of [...toolTimeout.invalid, ...toolTimeout.conflicts]) diagnostics.push(issue(plugin, component, field));
  if (toolTimeout.value !== undefined) options.toolTimeoutMs = toolTimeout.value;

  const tools = declaration.tools;
  if (tools !== undefined && (!isRecord(tools) || Object.keys(tools).some((key) => !["allow", "deny"].includes(key)))) {
    diagnostics.push(issue(plugin, component, "tools"));
  }
  const listDeclaration: Record<string, JsonValue> = { ...declaration };
  if (isRecord(tools)) {
    const nestedAllow = tools.allow;
    const nestedDeny = tools.deny;
    if (nestedAllow !== undefined) listDeclaration["tools.allow"] = nestedAllow;
    if (nestedDeny !== undefined) listDeclaration["tools.deny"] = nestedDeny;
  }
  const allow = resolveAliases(listDeclaration, ["allowTools", "allowedTools", "tools.allow"], parseToolList);
  for (const field of [...allow.invalid, ...allow.conflicts]) diagnostics.push(issue(plugin, component, field));
  const deny = resolveAliases(listDeclaration, ["denyTools", "disabledTools", "tools.deny"], parseToolList);
  for (const field of [...deny.invalid, ...deny.conflicts]) diagnostics.push(issue(plugin, component, field));
  if (allow.value !== undefined) options.allowedTools = [...allow.value];
  if (deny.value !== undefined) options.deniedTools = [...deny.value];
  const denySet = new Set(deny.value ?? []);
  if ((allow.value ?? []).some((name) => denySet.has(name))) diagnostics.push(issue(plugin, component, "tools"));

  if (declaration.instructions !== undefined) {
    if (typeof declaration.instructions !== "string") diagnostics.push(issue(plugin, component, "instructions"));
    else options.instructions = declaration.instructions;
  }
  const resources = declaration.resources;
  if (resources !== undefined) {
    if (!(typeof resources === "boolean" || stringArray(resources))) {
      diagnostics.push(issue(plugin, component, "resources"));
    } else {
      options.resources = Array.isArray(resources)
        ? [...exactStringSet(resources as readonly string[])]
        : resources;
      if (resources === true || Array.isArray(resources) && resources.length > 0) {
        ruleIds.push(CompatibilityPolicyRegistry.mcp.featureResources.id);
      }
    }
  }

  const featureAliases = {
    toolApproval: ["toolApproval", "tool_approval"],
    sampling: ["sampling"],
    elicitation: ["elicitation"],
  } as const;
  const nestedFeatures = declaration.features;
  if (nestedFeatures !== undefined && !isRecord(nestedFeatures)) diagnostics.push(issue(plugin, component, "features"));
  if (isRecord(nestedFeatures)) {
    for (const field of Object.keys(nestedFeatures)) {
      if (!["toolApproval", "tool_approval", "sampling", "elicitation", "oauth", "headers"].includes(field)) {
        diagnostics.push(issue(plugin, component, `features.${field}`));
      }
    }
  }
  for (const [canonical, aliases] of Object.entries(featureAliases)) {
    const claims: Array<{ field: string; value: JsonValue }> = [];
    for (const alias of aliases) {
      const value = declaration[alias];
      if (value !== undefined) claims.push({ field: alias, value });
    }
    if (isRecord(nestedFeatures)) {
      for (const alias of aliases) {
        const value = nestedFeatures[alias];
        if (value !== undefined) claims.push({ field: `features.${alias}`, value });
      }
    }
    if (claims.length > 1) {
      for (const claim of claims.slice(1)) diagnostics.push(issue(plugin, component, claim.field));
      continue;
    }
    const claim = claims[0];
    if (claim === undefined) continue;
    if (canonical === "elicitation") {
      const value = elicitationFeature(claim.value);
      if (value === undefined) diagnostics.push(issue(plugin, component, claim.field));
      else {
        options.elicitation = value;
        if (value.form) ruleIds.push(CompatibilityPolicyRegistry.mcp.featureElicitationForm.id);
        if (value.url) ruleIds.push(CompatibilityPolicyRegistry.mcp.featureElicitationUrl.id);
      }
    } else {
      const parsed = booleanFeature(claim.value);
      for (const suffix of parsed.issueSuffixes) {
        diagnostics.push(issue(plugin, component, suffix === "" ? claim.field : `${claim.field}.${suffix}`));
      }
      if (parsed.value !== undefined) {
        options[canonical] = parsed.value;
        if (parsed.value) ruleIds.push(canonical === "sampling"
          ? CompatibilityPolicyRegistry.mcp.featureSampling.id
          : CompatibilityPolicyRegistry.mcp.featureToolApproval.id);
      }
    }
  }

  const bearer = declaration.bearerTokenEnv;
  if (bearer !== undefined && (typeof bearer !== "string" || bearer.length === 0)) diagnostics.push(issue(plugin, component, "bearerTokenEnv"));
  const externalBearer = typeof bearer === "string" && bearer.length > 0 ? bearer : undefined;
  const authClaims = ["auth", "oauth", "authentication"].filter((field) => declaration[field] !== undefined);
  if (isRecord(nestedFeatures)) {
    for (const field of ["oauth", "headers"] as const) {
      if (nestedFeatures[field] !== undefined) authClaims.push(`features.${field}`);
    }
  }
  if (authClaims.length > 1) {
    if (allowedFields.includes("auth")) diagnostics.push(issue(plugin, component, "auth"));
  }
  else if (authClaims[0] !== undefined) {
    const field = authClaims[0];
    const value = field.startsWith("features.")
      ? (nestedFeatures as JsonRecord)[field.slice("features.".length)]
      : declaration[field];
    if (value === undefined) {
      diagnostics.push(issue(plugin, component, field));
    } else if (field.endsWith("headers")) {
      for (const name of invalidHeaderFields(value)) diagnostics.push(issue(plugin, component, name === "" ? field : `${field}.${name}`));
      if (transport !== "streamable-http") diagnostics.push(issue(plugin, component, field));
    } else {
      const auth = parseAuth(value, externalBearer);
      if (auth === undefined) {
        diagnostics.push(issue(plugin, component, field));
      } else if (transport !== "streamable-http") {
        if (allowedFields.includes(field)) diagnostics.push(issue(plugin, component, field));
      } else {
        options.auth = auth;
        if (auth.kind === "oauth") ruleIds.push(auth.flow === "authorization-code"
          ? CompatibilityPolicyRegistry.mcp.oauthAuthorizationCode.id
          : CompatibilityPolicyRegistry.mcp.oauthClientCredentials.id);
      }
    }
  } else if (externalBearer !== undefined) {
    if (transport !== "streamable-http") {
      if (allowedFields.includes("bearerTokenEnv")) diagnostics.push(issue(plugin, component, "bearerTokenEnv"));
    } else options.auth = { kind: "bearer-environment" };
  }

  const headerRecords = [
    declaration.headers,
    ...(isRecord(nestedFeatures) ? [nestedFeatures.headers] : []),
  ].filter((value): value is JsonRecord => isRecord(value));
  const hasAuthorizationHeader = headerRecords.some((headers) =>
    Object.keys(headers).some((name) => name.toLowerCase() === "authorization"));
  const canonicalAuth = McpCanonicalAuthSchema.safeParse(options.auth);
  if (hasAuthorizationHeader && canonicalAuth.success &&
      canonicalAuth.data.kind === "bearer-environment") {
    diagnostics.push(issue(plugin, component, externalBearer === undefined ? "auth" : "bearerTokenEnv"));
  }

  if (diagnostics.length > 0 || transport !== "stdio" && transport !== "streamable-http") {
    return { kind: "incompatible", diagnostics: diagnostics.sort(compareDiagnostics) };
  }
  const uses = requirements(...ruleIds);
  return {
    kind: "supported",
    plan: McpCompatibilityPlanSchemaV1.parse({
      schemaVersion: 1,
      componentId: component.id,
      transport,
      options: McpCanonicalOptionsSchemaV1.parse(options),
      requirementCapabilityIds: uses.map((use) => use.capability),
      provenance: canonicalMcpSourceLocations(component),
    }),
  };
}

/**
 * Interpret one normalized MCP declaration using the registry-owned policy.
 * Returned plans contain structural behavior only; launch and credential
 * values remain in the authoritative component declaration.
 */
export function analyzeMcpCompatibility(input: Readonly<{
  plugin: PluginKey;
  component: McpServerComponent;
}>): McpCompatibilityAnalysis {
  const plugin = PluginKeySchema.parse(input.plugin);
  const component = McpServerComponentSchema.parse(input.component);
  return analyze(plugin, component);
}
