import { z } from "zod";
import { McpServerComponentSchema, type McpServerComponent } from "./components.js";
import { CompatibilityPolicyRegistry } from "./compatibility-policy.js";
import { isSensitiveFieldName, isSensitiveQueryName } from "./sensitive-fields.js";
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

function canonicalTransport(value: string): "stdio" | "streamable-http" | undefined {
  const aliases = CompatibilityPolicyRegistry.mcp.keys.transportAliases as Readonly<Record<string, string>>;
  const canonical = aliases[value] ?? value;
  return canonical === "stdio" || canonical === "streamable-http" ? canonical : undefined;
}

function selectedTransport(declaration: JsonRecord): "stdio" | "streamable-http" {
  const values = [declaration.transport, declaration.type].filter((value): value is string => typeof value === "string");
  if ((declaration.transport !== undefined && typeof declaration.transport !== "string") ||
      (declaration.type !== undefined && typeof declaration.type !== "string")) fail();
  const explicit = values.map(canonicalTransport);
  if (explicit.some((value) => value === undefined) || new Set(explicit).size > 1) fail();
  const inferred = declaration.command !== undefined
    ? "stdio"
    : declaration.url !== undefined
      ? "streamable-http"
      : undefined;
  const selected = explicit[0] ?? inferred;
  if (selected === undefined) fail();
  if ((selected === "stdio" && declaration.url !== undefined) ||
      (selected === "streamable-http" && declaration.command !== undefined)) fail();
  return selected;
}

function portableToken(value: string): boolean {
  return /^\$\{(?:user_config\.[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)\}$/.test(value);
}

function supportedCredentialTemplate(name: string, value: string): boolean {
  if (!isSensitiveFieldName(name)) return true;
  if (portableToken(value)) return true;
  return /^(?:Bearer|Basic)\s+\$\{(?:user_config\.[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*)\}$/i.test(value);
}

function validateSensitiveQueryValues(template: string): void {
  // URL accepts braces in path/query text. Replace only for parsing; the
  // original template remains the canonical source value.
  let parsed: URL;
  try {
    parsed = new URL(template.replace(/\$\{[^{}]*\}/g, "placeholder"));
  } catch {
    fail();
  }
  for (const [name, value] of parsed.searchParams) {
    if (isSensitiveQueryName(name) && value !== "placeholder") fail();
  }
}

function stringArray(value: JsonValue | undefined): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) fail();
  return value as readonly string[];
}

function stdioTemplate(declaration: JsonRecord): McpLaunchTemplate {
  if (typeof declaration.command !== "string" || declaration.command.length === 0) fail();
  if (declaration.cwd !== undefined && declaration.workingDirectory !== undefined) fail();
  const cwd = declaration.cwd ?? declaration.workingDirectory;
  if (cwd !== undefined && typeof cwd !== "string") fail();
  const rawEnvironment = declaration.env;
  if (rawEnvironment !== undefined && !isRecord(rawEnvironment)) fail();
  const env = Object.entries(rawEnvironment ?? {})
    .map(([name, value]) => {
      if (typeof value !== "string" || !supportedCredentialTemplate(name, value)) fail();
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

function headerValue(name: string, value: JsonValue): McpLateValue {
  if (typeof value === "string") {
    if (!supportedCredentialTemplate(name, value)) fail();
    return { kind: "template", template: value };
  }
  if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.env !== "string") fail();
  return McpLateValueSchema.parse({ kind: "environment", name: value.env });
}

function bearerEnvironment(declaration: JsonRecord): McpLateValue | undefined {
  const topLevel = declaration.bearerTokenEnv;
  if (topLevel !== undefined && typeof topLevel !== "string") fail();
  const aliases = ["auth", "authentication", "oauth"] as const;
  const present = aliases.filter((key) => declaration[key] !== undefined);
  if (present.length > 1) fail();
  const selected = present[0] === undefined ? undefined : declaration[present[0]];
  let nested: string | undefined;
  let bearer = false;
  if (typeof selected === "string") {
    bearer = selected === "bearer" || selected === "bearer-env";
    if (!bearer && selected !== "none" && selected !== "oauth" &&
        selected !== "authorization-code" && selected !== "authorization_code" &&
        selected !== "authorizationCode" && selected !== "client-credentials" &&
        selected !== "client_credentials" && selected !== "clientCredentials") fail();
  } else if (selected !== undefined) {
    if (!isRecord(selected)) fail();
    const modes = [selected.type, selected.mode].filter((value): value is string => typeof value === "string");
    if ((selected.type !== undefined && typeof selected.type !== "string") ||
        (selected.mode !== undefined && typeof selected.mode !== "string") || modes.length > 1) fail();
    const mode = modes[0];
    bearer = mode === "bearer" || mode === "bearer-env";
    if (mode !== undefined && !bearer && mode !== "none" && mode !== "oauth" &&
        mode !== "authorization-code" && mode !== "authorization_code" &&
        mode !== "authorizationCode" && mode !== "client-credentials" &&
        mode !== "client_credentials" && mode !== "clientCredentials") fail();
    if (selected.env !== undefined) {
      if (typeof selected.env !== "string" || !bearer) fail();
      nested = selected.env;
    }
  }
  if (topLevel !== undefined && nested !== undefined) fail();
  const name = nested ?? (typeof topLevel === "string" ? topLevel : undefined);
  if (bearer && name === undefined) fail();
  if (!bearer && nested !== undefined) fail();
  return name === undefined ? undefined : McpLateValueSchema.parse({ kind: "environment", name });
}

function httpTemplate(declaration: JsonRecord): McpLaunchTemplate {
  if (typeof declaration.url !== "string" || declaration.url.length === 0) fail();
  validateSensitiveQueryValues(declaration.url);
  const rawHeaders = declaration.headers;
  if (rawHeaders !== undefined && !isRecord(rawHeaders)) fail();
  const seen = new Set<string>();
  const headers = Object.entries(rawHeaders ?? {})
    .map(([name, value]) => {
      const canonical = name.toLowerCase();
      if (seen.has(canonical)) fail();
      seen.add(canonical);
      McpHeaderNameSchema.parse(name);
      return McpHeaderEntrySchema.parse({ name, value: headerValue(name, value) });
    })
    .sort((left, right) => compareText(left.name.toLowerCase(), right.name.toLowerCase()) || compareText(left.name, right.name));
  const bearerToken = bearerEnvironment(declaration);
  if (bearerToken !== undefined && headers.some((entry) => entry.name.toLowerCase() === "authorization")) fail();
  return McpLaunchTemplateSchemaV1.parse({
    schemaVersion: 1,
    transport: "streamable-http",
    url: declaration.url,
    headers,
    ...(bearerToken === undefined ? {} : { bearerToken }),
  });
}

/** Canonicalize only the launch-bearing surface of one trusted MCP component. */
export function createMcpLaunchTemplate(componentInput: McpServerComponent): McpLaunchTemplate {
  try {
    const component = McpServerComponentSchema.parse(componentInput);
    if (!isRecord(component.declaration.value)) fail();
    const declaration = component.declaration.value;
    return selectedTransport(declaration) === "stdio"
      ? stdioTemplate(declaration)
      : httpTemplate(declaration);
  } catch (error) {
    if (error instanceof McpLaunchTemplateError) throw error;
    throw new McpLaunchTemplateError();
  }
}
