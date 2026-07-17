import { z } from "zod";
import {
  McpLaunchBindingSchemaV1,
  McpLaunchContextError,
  McpLaunchErrorCodes,
  type McpLaunchBinding,
  type McpLaunchContextPort,
} from "../../application/ports/mcp-launch-context.js";
import type {
  McpLaunchEnvironmentPort,
  ResolvedMcpLaunchEnvironment,
} from "../../application/ports/mcp-launch-environment.js";
import {
  McpConfigSourceSchemaV1,
  McpLaunchValueRequestSchema,
  type McpConfigSource,
  type McpLaunchValueProvider,
  type McpLaunchValues,
} from "../../application/ports/mcp-runtime.js";
import type { ResolvedConfiguration } from "../../application/resolved-configuration.js";
import {
  McpEnvironmentNameSchema,
  McpLaunchTemplateSchemaV1,
  type McpLateValue,
  type McpLaunchTemplate,
} from "../../domain/mcp-launch-template.js";
import {
  isPluginLaunchRootName,
  type PluginLaunchRootValues,
} from "../plugin-launch-roots.js";

export const McpProcessEnvironmentPlatformSchema = z.enum(["posix", "windows"]);
export type McpProcessEnvironmentPlatform = z.infer<typeof McpProcessEnvironmentPlatformSchema>;

type ParsedToken = Readonly<{
  raw: string;
  body: string;
  kind: "root" | "configuration" | "environment";
  name: string;
}>;

type LeaseBacking =
  | Readonly<{
      transport: "stdio";
      command: string;
      args: readonly string[];
      cwd?: string;
      env: Readonly<Record<string, string>>;
    }>
  | Readonly<{
      transport: "streamable-http";
      url: string;
      headers: Readonly<Record<string, string>>;
      bearerToken?: string;
    }>;

type LeaseState = { disposed: boolean; backing: LeaseBacking | undefined };

const inspectSymbol = Symbol.for("nodejs.util.inspect.custom");

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const value = error as { readonly name?: unknown; readonly code?: unknown };
  return value.name === "AbortError" || value.code === "ABORT_ERR";
}

function launchError(binding: McpLaunchBinding, code: (typeof McpLaunchErrorCodes)[keyof typeof McpLaunchErrorCodes]): McpLaunchContextError {
  return new McpLaunchContextError({
    code,
    source: binding.source,
    serverKey: binding.serverKey,
    componentId: binding.componentId,
    transport: binding.transport,
  });
}

function parseTokens(template: string): readonly ParsedToken[] {
  if (typeof template !== "string" || template.includes("\0")) throw new Error("invalid template");
  const tokens: ParsedToken[] = [];
  let cursor = 0;
  while (cursor < template.length) {
    const start = template.indexOf("${", cursor);
    if (start < 0) break;
    const end = template.indexOf("}", start + 2);
    if (end < 0) throw new Error("invalid template");
    const body = template.slice(start + 2, end);
    if (body.length === 0 || body.includes("${") || body.includes("{") || body.includes("}")) {
      throw new Error("invalid template");
    }
    const raw = template.slice(start, end + 1);
    if (isPluginLaunchRootName(body)) {
      tokens.push({ raw, body, kind: "root", name: body });
    } else if (body.startsWith("user_config.")) {
      const name = body.slice("user_config.".length);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error("invalid template");
      tokens.push({ raw, body, kind: "configuration", name });
    } else {
      McpEnvironmentNameSchema.parse(body);
      tokens.push({ raw, body, kind: "environment", name: body });
    }
    cursor = end + 1;
  }
  return tokens;
}

function templateStrings(template: McpLaunchTemplate): readonly string[] {
  if (template.transport === "stdio") {
    return [
      template.command,
      ...template.args,
      ...(template.cwd === undefined ? [] : [template.cwd]),
      ...template.env.map((entry) => entry.value),
    ];
  }
  return [
    template.url,
    ...template.headers.flatMap((entry) => entry.value.kind === "template" ? [entry.value.template] : []),
    ...(template.bearerToken?.kind === "template" ? [template.bearerToken.template] : []),
  ];
}

function configuredEnvironment(configuration: ResolvedConfiguration): Readonly<Record<string, string>> {
  return configuration.environment("CLAUDE_PLUGIN_OPTION_");
}

function ambientNames(
  template: McpLaunchTemplate,
  configured: Readonly<Record<string, string>>,
): readonly string[] {
  const result = new Set<string>();
  const inspectName = (name: string) => {
    if (isPluginLaunchRootName(name)) return;
    if (name.startsWith("CLAUDE_PLUGIN_OPTION_")) {
      // Configured variables never fall through to ambient process state.
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(configured, name)) result.add(name);
  };
  for (const value of templateStrings(template)) {
    for (const token of parseTokens(value)) {
      if (token.kind === "environment") inspectName(token.name);
    }
  }
  if (template.transport === "streamable-http") {
    for (const header of template.headers) {
      if (header.value.kind === "environment") inspectName(header.value.name);
    }
    if (template.bearerToken?.kind === "environment") inspectName(template.bearerToken.name);
  }
  return Object.freeze([...result].sort());
}

function rootValues(context: Readonly<{
  pluginRoot: string;
  pluginDataRoot: string;
  projectRoot: string;
}>): PluginLaunchRootValues {
  return Object.freeze({
    CLAUDE_PLUGIN_ROOT: context.pluginRoot,
    PLUGIN_ROOT: context.pluginRoot,
    CLAUDE_PLUGIN_DATA: context.pluginDataRoot,
    PLUGIN_DATA: context.pluginDataRoot,
    CLAUDE_PROJECT_DIR: context.projectRoot,
  });
}

function resolveTemplate(
  template: string,
  roots: PluginLaunchRootValues,
  configuration: ResolvedConfiguration,
  configured: Readonly<Record<string, string>>,
  environment: ResolvedMcpLaunchEnvironment,
): string {
  const tokens = parseTokens(template);
  if (tokens.length === 0) return template;
  let result = "";
  let cursor = 0;
  for (const token of tokens) {
    const start = template.indexOf(token.raw, cursor);
    result += template.slice(cursor, start);
    if (token.kind === "root") {
      result += roots[token.name as keyof PluginLaunchRootValues];
    } else if (token.kind === "configuration") {
      if (!configuration.has(token.name)) throw new Error("configuration value is unavailable");
      result += configuration.substitute(token.raw);
    } else if (Object.prototype.hasOwnProperty.call(configured, token.name)) {
      result += configured[token.name]!;
    } else {
      if (token.name.startsWith("CLAUDE_PLUGIN_OPTION_") || !environment.has(token.name)) {
        throw new Error("environment value is unavailable");
      }
      result += environment.substitute(token.raw);
    }
    cursor = start + token.raw.length;
  }
  return result + template.slice(cursor);
}

function resolveLateValue(
  value: McpLateValue,
  roots: PluginLaunchRootValues,
  configuration: ResolvedConfiguration,
  configured: Readonly<Record<string, string>>,
  environment: ResolvedMcpLaunchEnvironment,
): string {
  return value.kind === "template"
    ? resolveTemplate(value.template, roots, configuration, configured, environment)
    : resolveTemplate(`\${${value.name}}`, roots, configuration, configured, environment);
}

function assertText(value: string, options: Readonly<{ empty?: boolean; controls?: RegExp }> = {}): string {
  if ((!options.empty && value.length === 0) || value.includes("\0") || options.controls?.test(value)) {
    throw new Error("resolved launch value is invalid");
  }
  return value;
}

function nullPrototypeRecord(entries: readonly (readonly [string, string])[]): Readonly<Record<string, string>> {
  const record = Object.create(null) as Record<string, string>;
  for (const [name, value] of entries) {
    Object.defineProperty(record, name, {
      value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(record);
}

function environmentKey(name: string, platform: McpProcessEnvironmentPlatform): string {
  McpEnvironmentNameSchema.parse(name);
  return platform === "windows" ? name.toLowerCase() : name;
}

function processEnvironment(
  template: Extract<McpLaunchTemplate, { transport: "stdio" }>,
  roots: PluginLaunchRootValues,
  configuration: ResolvedConfiguration,
  configured: Readonly<Record<string, string>>,
  environment: ResolvedMcpLaunchEnvironment,
  platform: McpProcessEnvironmentPlatform,
): Readonly<Record<string, string>> {
  const entries: Array<readonly [string, string]> = [];
  const seen = new Set<string>();
  const append = (name: string, value: string) => {
    const key = environmentKey(name, platform);
    if (seen.has(key)) throw new Error("environment name collision");
    seen.add(key);
    entries.push([name, assertText(value, { empty: true })]);
  };
  for (const name of Object.keys(roots).sort()) append(name, roots[name as keyof PluginLaunchRootValues]);
  for (const name of Object.keys(configured).sort()) append(name, configured[name]!);
  for (const entry of template.env) {
    append(entry.name, resolveTemplate(entry.value, roots, configuration, configured, environment));
  }
  entries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return nullPrototypeRecord(entries);
}

function renderValues(
  template: McpLaunchTemplate,
  context: Readonly<{
    pluginRoot: string;
    pluginDataRoot: string;
    projectRoot: string;
    configuration: ResolvedConfiguration;
  }>,
  environment: ResolvedMcpLaunchEnvironment,
  platform: McpProcessEnvironmentPlatform,
): LeaseBacking {
  const roots = rootValues(context);
  const configured = configuredEnvironment(context.configuration);
  if (template.transport === "stdio") {
    const command = assertText(resolveTemplate(template.command, roots, context.configuration, configured, environment));
    const args = Object.freeze(template.args.map((value) =>
      assertText(resolveTemplate(value, roots, context.configuration, configured, environment), { empty: true })));
    const cwd = template.cwd === undefined
      ? undefined
      : assertText(resolveTemplate(template.cwd, roots, context.configuration, configured, environment));
    const env = processEnvironment(template, roots, context.configuration, configured, environment, platform);
    return Object.freeze({
      transport: "stdio" as const,
      command,
      args,
      ...(cwd === undefined ? {} : { cwd }),
      env,
    });
  }

  const url = assertText(resolveTemplate(template.url, roots, context.configuration, configured, environment), {
    controls: /[\u0000-\u001f\u007f]/,
  });
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("resolved MCP URL is invalid");
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error("resolved MCP URL is invalid");
  }
  const headerEntries: Array<readonly [string, string]> = [];
  const names = new Set<string>();
  for (const header of template.headers) {
    const name = header.name.toLowerCase();
    if (names.has(name)) throw new Error("header name collision");
    names.add(name);
    const value = assertText(resolveLateValue(header.value, roots, context.configuration, configured, environment), {
      empty: true,
      controls: /[\r\n\0]/,
    });
    headerEntries.push([header.name, value]);
  }
  headerEntries.sort(([left], [right]) => {
    const lower = left.toLowerCase().localeCompare(right.toLowerCase());
    return lower !== 0 ? lower : left.localeCompare(right);
  });
  const bearerToken = template.bearerToken === undefined
    ? undefined
    : assertText(resolveLateValue(template.bearerToken, roots, context.configuration, configured, environment), {
        controls: /\s/,
      });
  if (bearerToken !== undefined && names.has("authorization")) throw new Error("authorization is ambiguous");
  return Object.freeze({
    transport: "streamable-http" as const,
    url,
    headers: nullPrototypeRecord(headerEntries),
    ...(bearerToken === undefined ? {} : { bearerToken }),
  });
}

function createLease(backing: LeaseBacking, states: WeakMap<object, LeaseState>): McpLaunchValues {
  const lease = {} as Record<PropertyKey, unknown>;
  const state: LeaseState = { disposed: false, backing };
  states.set(lease, state);
  const read = (key: "transport" | "command" | "args" | "cwd" | "env" | "url" | "headers" | "bearerToken"): unknown => {
    const current = states.get(lease);
    if (current === undefined || current.disposed || current.backing === undefined) {
      throw new Error("MCP launch values are disposed");
    }
    return (current.backing as unknown as Record<string, unknown>)[key];
  };
  const descriptors: PropertyDescriptorMap = {
    transport: { enumerable: true, get: () => read("transport") },
    toString: { value: () => "[REDACTED]", enumerable: false },
    toJSON: { value: () => "[REDACTED]", enumerable: false },
    [inspectSymbol]: { value: () => "[REDACTED]", enumerable: false },
  };
  if (backing.transport === "stdio") {
    descriptors.command = { enumerable: true, get: () => read("command") };
    descriptors.args = { enumerable: true, get: () => read("args") };
    descriptors.cwd = { enumerable: true, get: () => read("cwd") };
    descriptors.env = { enumerable: true, get: () => read("env") };
  } else {
    descriptors.url = { enumerable: true, get: () => read("url") };
    descriptors.headers = { enumerable: true, get: () => read("headers") };
    descriptors.bearerToken = { enumerable: true, get: () => read("bearerToken") };
  }
  Object.defineProperties(lease, descriptors);
  return Object.freeze(lease) as McpLaunchValues;
}

/** Create one provider bound to an immutable registered source snapshot. */
export function createTrustedMcpLaunchValueProvider(input: Readonly<{
  source: McpConfigSource;
  context: McpLaunchContextPort;
  environment: McpLaunchEnvironmentPort;
  platform: McpProcessEnvironmentPlatform;
}>): McpLaunchValueProvider {
  let source: McpConfigSource;
  let platform: McpProcessEnvironmentPlatform;
  try {
    source = McpConfigSourceSchemaV1.parse(JSON.parse(JSON.stringify(input.source)));
    platform = McpProcessEnvironmentPlatformSchema.parse(input.platform);
  } catch {
    throw new McpLaunchContextError({ code: McpLaunchErrorCodes.authorityRejected });
  }
  if (input.context === null || typeof input.context !== "object" ||
      input.environment === null || typeof input.environment !== "object") {
    throw new TypeError("MCP launch provider dependencies are required");
  }
  const states = new WeakMap<object, LeaseState>();

  const provider: McpLaunchValueProvider = {
    async resolve(requestInput, signal): Promise<McpLaunchValues> {
      signal.throwIfAborted();
      let request: ReturnType<typeof McpLaunchValueRequestSchema.parse>;
      try {
        request = McpLaunchValueRequestSchema.parse(requestInput);
      } catch {
        throw new McpLaunchContextError({ code: McpLaunchErrorCodes.authorityRejected });
      }
      const server = source.servers[request.serverKey];
      if (!sameJson(request.source, source.identity) || server === undefined || server.transport !== request.transport) {
        throw new McpLaunchContextError({
          code: McpLaunchErrorCodes.authorityRejected,
          source: request.source,
          serverKey: request.serverKey,
          transport: request.transport,
        });
      }
      const binding = McpLaunchBindingSchemaV1.parse({
        schemaVersion: 1,
        source: request.source,
        serverKey: request.serverKey,
        componentId: server.componentId,
        transport: request.transport,
      });
      let issued: McpLaunchValues | undefined;
      let renderFailure: McpLaunchContextError | undefined;

      await input.context.withContext(binding, signal, async (context) => {
        try {
          if (!sameJson(context.binding, binding) ||
              !sameJson(context.projection, server.projection)) {
            throw new Error("context projection mismatch");
          }
          const selectedTemplate = McpLaunchTemplateSchemaV1.parse(context.template);
          if (!sameJson(selectedTemplate, server.launchTemplate)) throw new Error("launch template mismatch");
          const configured = configuredEnvironment(context.configuration);
          const names = ambientNames(selectedTemplate, configured);
          try {
            await input.environment.withResolved(names, signal, async (environment) => {
              try {
                const backing = renderValues(selectedTemplate, context, environment, platform);
                issued = createLease(backing, states);
              } catch {
                renderFailure = launchError(binding, McpLaunchErrorCodes.valueInvalid);
              }
            });
          } catch (error) {
            if (signal.aborted) throw signal.reason;
            if (isAbortRejection(error)) throw error;
            renderFailure = launchError(binding, McpLaunchErrorCodes.environmentFailed);
          }
        } catch (error) {
          if (signal.aborted) throw signal.reason;
          if (isAbortRejection(error)) throw error;
          renderFailure = error instanceof McpLaunchContextError
            ? error
            : launchError(binding, McpLaunchErrorCodes.valueInvalid);
        }
      });

      if (renderFailure !== undefined) throw renderFailure;
      if (issued === undefined) throw launchError(binding, McpLaunchErrorCodes.valueInvalid);
      if (signal.aborted) {
        const state = states.get(issued as object);
        if (state !== undefined && !state.disposed) {
          state.disposed = true;
          state.backing = undefined;
        }
        throw signal.reason;
      }
      return issued;
    },

    dispose(values): void {
      const state = states.get(values as object);
      if (state === undefined) {
        throw new McpLaunchContextError({ code: McpLaunchErrorCodes.cleanupFailed });
      }
      if (state.disposed) return;
      state.disposed = true;
      state.backing = undefined;
    },
  };
  return Object.freeze(provider);
}
