import { z } from "zod";
import { McpServerComponentSchema, type McpServerComponent } from "./components.js";
import type { McpCanonicalAuth } from "./mcp-compatibility-plan.js";
import { analyzeMcpCompatibility } from "./mcp-compatibility-plan.js";
import { PluginKeySchema, type PluginKey } from "./identity.js";
import type { JsonValue } from "./schema.js";

export const McpEnvironmentNameSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
export const McpHeaderNameSchema = z.string().regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/);

const McpLateValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("template"), template: z.string() }).strict().readonly(),
  z.object({ kind: z.literal("environment"), name: McpEnvironmentNameSchema }).strict().readonly(),
]);
export type McpLateValue = z.infer<typeof McpLateValueSchema>;

const McpEnvironmentEntrySchema = z.object({
  name: McpEnvironmentNameSchema,
  value: z.string(),
}).strict().readonly();

const McpHeaderEntrySchema = z.object({
  name: McpHeaderNameSchema,
  value: McpLateValueSchema,
}).strict().readonly();

export const McpLaunchTemplateSchemaV1 = z.discriminatedUnion("transport", [
  z.object({
    schemaVersion: z.literal(1),
    transport: z.literal("stdio"),
    command: z.string().min(1),
    args: z.array(z.string()).readonly(),
    cwd: z.string().optional(),
    env: z.array(McpEnvironmentEntrySchema).readonly(),
  }).strict().readonly(),
  z.object({
    schemaVersion: z.literal(1),
    transport: z.literal("streamable-http"),
    url: z.string().min(1),
    headers: z.array(McpHeaderEntrySchema).readonly(),
    bearerToken: McpLateValueSchema.optional(),
  }).strict().readonly(),
]);
export type McpLaunchTemplate = z.infer<typeof McpLaunchTemplateSchemaV1>;

export class McpLaunchTemplateError extends Error {
  constructor() {
    super("MCP launch template is invalid");
    this.name = "McpLaunchTemplateError";
  }
}

type JsonRecord = Readonly<Record<string, JsonValue>>;

function fail(): never {
  throw new McpLaunchTemplateError();
}

function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stringArray(value: JsonValue | undefined): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) fail();
  return value as readonly string[];
}

function stdioTemplate(declaration: JsonRecord): McpLaunchTemplate {
  if (typeof declaration.command !== "string" || declaration.command.length === 0) fail();
  const cwd = declaration.cwd ?? declaration.workingDirectory;
  if (cwd !== undefined && typeof cwd !== "string") fail();
  const rawEnvironment = declaration.env;
  if (rawEnvironment !== undefined && !isRecord(rawEnvironment)) fail();
  const env = Object.entries(rawEnvironment ?? {})
    .map(([name, value]) => {
      if (typeof value !== "string") fail();
      return McpEnvironmentEntrySchema.parse({ name, value });
    })
    .sort((left, right) => compareText(left.name, right.name));
  return McpLaunchTemplateSchemaV1.parse({
    schemaVersion: 1,
    transport: "stdio",
    command: declaration.command,
    args: stringArray(declaration.args),
    ...(cwd === undefined ? {} : { cwd }),
    env,
  });
}

function headerValue(value: JsonValue): McpLateValue {
  if (typeof value === "string") return { kind: "template", template: value };
  if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.env !== "string") fail();
  return McpLateValueSchema.parse({ kind: "environment", name: value.env });
}

function bearerEnvironment(
  declaration: JsonRecord,
  auth: McpCanonicalAuth,
): McpLateValue | undefined {
  if (auth.kind !== "bearer-environment") return undefined;
  const topLevel = typeof declaration.bearerTokenEnv === "string"
    ? declaration.bearerTokenEnv
    : undefined;
  const selected = ["auth", "authentication", "oauth"]
    .map((field) => declaration[field])
    .find((value) => value !== undefined);
  const nested = isRecord(selected) && typeof selected.env === "string"
    ? selected.env
    : undefined;
  const name = nested ?? topLevel;
  if (name === undefined) fail();
  return McpLateValueSchema.parse({ kind: "environment", name });
}

function httpTemplate(declaration: JsonRecord, auth: McpCanonicalAuth): McpLaunchTemplate {
  if (typeof declaration.url !== "string" || declaration.url.length === 0) fail();
  const features = isRecord(declaration.features) ? declaration.features : undefined;
  const rawHeaders = declaration.headers ?? features?.headers;
  if (rawHeaders !== undefined && !isRecord(rawHeaders)) fail();
  const seen = new Set<string>();
  const headers = Object.entries(rawHeaders ?? {})
    .map(([name, value]) => {
      const canonical = name.toLowerCase();
      if (seen.has(canonical)) fail();
      seen.add(canonical);
      McpHeaderNameSchema.parse(name);
      return McpHeaderEntrySchema.parse({ name, value: headerValue(value) });
    })
    .sort((left, right) => compareText(left.name.toLowerCase(), right.name.toLowerCase()) || compareText(left.name, right.name));
  const bearerToken = bearerEnvironment(declaration, auth);
  if (bearerToken !== undefined && headers.some((entry) => entry.name.toLowerCase() === "authorization")) fail();
  return McpLaunchTemplateSchemaV1.parse({
    schemaVersion: 1,
    transport: "streamable-http",
    url: declaration.url,
    headers,
    ...(bearerToken === undefined ? {} : { bearerToken }),
  });
}

/**
 * Project one compatibility-approved declaration into its unexpanded launch
 * template. The shared MCP analysis remains the acceptance and alias authority;
 * this mapper only copies its launch-bearing values into the strict contract.
 */
export function createMcpLaunchTemplate(
  componentInput: McpServerComponent,
  pluginInput: PluginKey = PluginKeySchema.parse("mcp-launch-template@internal"),
): McpLaunchTemplate {
  try {
    const component = McpServerComponentSchema.parse(componentInput);
    const analysis = analyzeMcpCompatibility({
      plugin: PluginKeySchema.parse(pluginInput),
      component,
    });
    if (analysis.kind === "incompatible" || !isRecord(component.declaration.value)) fail();
    const declaration = component.declaration.value;
    return analysis.plan.transport === "stdio"
      ? stdioTemplate(declaration)
      : httpTemplate(declaration, analysis.plan.options.auth);
  } catch (error) {
    if (error instanceof McpLaunchTemplateError) throw error;
    throw new McpLaunchTemplateError();
  }
}
