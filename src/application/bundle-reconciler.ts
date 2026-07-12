import { z } from "zod";
import {
  ComponentSchema,
  ForeignComponentSchema,
  HookComponentSchema,
  McpServerComponentSchema,
  PluginComponentsSchema,
  RetainedMetadataSchema,
  SkillComponentSchema,
  type Component,
  type ForeignComponent,
  type HookComponent,
  type McpServerComponent,
  type RetainedMetadata,
  type SkillComponent,
} from "../domain/components.js";
import { NormalizedPluginSchema } from "../domain/plugin.js";
import {
  ConfigurationOptionSchema,
  PluginConfigurationSchema,
  type ConfigurationOption,
  type PluginConfiguration,
} from "../domain/configuration.js";
import { deriveComponentId, verifyComponentId } from "../domain/component-identity.js";
import {
  ForeignComponentDeclarationSchema,
  PluginManifestClaimsSchema,
  type ForeignComponentDeclaration,
  type PluginManifestClaims,
} from "../domain/bundle-ingestion.js";
import {
  DiagnosticSchema,
  ErrorCodeRegistry,
  type Diagnostic,
  type ReadResult,
} from "../domain/errors.js";
import {
  NormalizedMarketplaceEntrySchema,
  type NormalizedMarketplaceEntry,
} from "../domain/marketplace.js";
import type { Provenance } from "../domain/provenance.js";
import { PluginKeySchema } from "../domain/identity.js";
import type { JsonValue } from "../domain/schema.js";
import {
  ResolvedPluginSourceSchema,
  type ResolvedPluginSource,
  type Sha256,
} from "../domain/source.js";

const OPERATION = "reconcilePluginBundle";
const HOST_ORDER: Readonly<Record<"claude" | "codex", number>> = { claude: 0, codex: 1 };
const COMPONENT_ORDER: Readonly<Record<Component["kind"], number>> = {
  skill: 0,
  hook: 1,
  "mcp-server": 2,
  foreign: 3,
};

type Claim<T> = Readonly<{
  value: T;
  provenance: readonly Provenance[];
}>;

type ReconcileInput = Readonly<{
  entry: NormalizedMarketplaceEntry;
  source: ResolvedPluginSource;
  manifestClaims: readonly PluginManifestClaims[];
  /** Foreign declarations discovered outside host manifests (for example catalogs). */
  foreignDeclarations?: readonly ForeignComponentDeclaration[];
  configuration: readonly PluginConfiguration[];
  components: readonly Component[];
  metadata: readonly RetainedMetadata[];
  sha256: Sha256;
}>;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function locationKey(provenance: Provenance): string {
  const location = provenance.location;
  return stableJson([
    HOST_ORDER[location.host],
    location.documentKind,
    location.path,
    location.pointer ?? null,
    location.line ?? null,
    location.column ?? null,
  ]);
}

function compareProvenance(left: Provenance, right: Provenance): number {
  const a = locationKey(left);
  const b = locationKey(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function sameProvenance(left: Provenance, right: Provenance): boolean {
  return locationKey(left) === locationKey(right) &&
    stableJson(left.declaration) === stableJson(right.declaration);
}

function mergeProvenance(
  left: readonly Provenance[],
  right: readonly Provenance[],
): readonly [Provenance, ...Provenance[]] {
  const sorted = [...left, ...right].sort(compareProvenance);
  const result: Provenance[] = [];
  for (const candidate of sorted) {
    if (!result.some((existing) => sameProvenance(existing, candidate))) result.push(candidate);
  }
  if (result.length === 0) throw new Error("claim provenance cannot be empty");
  return result as [Provenance, ...Provenance[]];
}

function firstProvenance(value: Readonly<{ provenance: readonly Provenance[] }>): Provenance {
  const first = [...value.provenance].sort(compareProvenance)[0];
  if (first === undefined) throw new Error("claim provenance cannot be empty");
  return first;
}

function snapshot(value: unknown): JsonValue {
  if (value !== null && typeof value === "object" && "value" in value && "provenance" in value) {
    const claim = value as { readonly value: unknown; readonly provenance: readonly Provenance[] };
    return {
      value: snapshot(claim.value),
      provenance: claim.provenance as unknown as JsonValue,
    };
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (Array.isArray(value)) return value.map(snapshot);
  if (typeof value === "object") {
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(value)) result[key] = snapshot((value as Record<string, unknown>)[key]);
    return result;
  }
  return String(value);
}

function diagnostic(
  code: "SCHEMA_INVALID" | "CLAIM_CONFLICT",
  message: string,
  plugin: string,
  details?: JsonValue,
  provenance?: Provenance,
): Diagnostic {
  return DiagnosticSchema.parse({
    code,
    severity: "error",
    operation: OPERATION,
    message,
    plugin: PluginKeySchema.parse(plugin),
    ...(provenance === undefined ? {} : { location: provenance.location }),
    ...(details === undefined ? {} : { details }),
  });
}

function failure<T>(
  code: "SCHEMA_INVALID" | "CLAIM_CONFLICT",
  message: string,
  plugin: string,
  details?: JsonValue,
  provenance?: Provenance,
): ReadResult<T> {
  return { ok: false, diagnostics: [diagnostic(code, message, plugin, details, provenance)] };
}

function mergeClaim<T>(
  field: string,
  left: Claim<T>,
  right: Claim<T>,
  plugin: string,
  equals: (left: T, right: T) => boolean = (a, b) => stableJson(a) === stableJson(b),
): ReadResult<Claim<T>> {
  const leftSource = firstProvenance(left);
  const rightSource = firstProvenance(right);
  const conflictingRawSource = left.provenance.some((a) => right.provenance.some((b) =>
    locationKey(a) === locationKey(b) && stableJson(a.declaration) !== stableJson(b.declaration)));
  if (conflictingRawSource || !equals(left.value, right.value)) {
    return failure(
      ErrorCodeRegistry.claimConflict,
      `Conflicting plugin claim for ${field}`,
      plugin,
      {
        field,
        left: snapshot(left),
        right: snapshot(right),
        locations: [leftSource.location, rightSource.location] as unknown as JsonValue,
      },
      leftSource,
    );
  }
  return {
    ok: true,
    value: {
      value: left.value,
      provenance: mergeProvenance(left.provenance, right.provenance),
    },
    diagnostics: [],
  };
}

function mergeOptionalClaim<T>(
  field: string,
  left: Claim<T> | undefined,
  right: Claim<T> | undefined,
  plugin: string,
  equals?: (left: T, right: T) => boolean,
): ReadResult<Claim<T> | undefined> {
  if (left === undefined) return { ok: true, value: right, diagnostics: [] };
  if (right === undefined) return { ok: true, value: left, diagnostics: [] };
  return mergeClaim(field, left, right, plugin, equals);
}

function reduceClaim<T>(
  field: string,
  values: readonly Claim<T>[],
  plugin: string,
): ReadResult<Claim<T> | undefined> {
  let result: Claim<T> | undefined;
  for (const value of values) {
    if (result === undefined) {
      result = value;
      continue;
    }
    const merged = mergeClaim(field, result, value, plugin);
    if (!merged.ok) return merged;
    result = merged.value;
  }
  return { ok: true, value: result, diagnostics: [] };
}

function metadataKey(value: RetainedMetadata): string {
  return `${value.key}\u0000${locationKey(firstProvenance(value.claimed))}`;
}

function mergeMetadata(
  values: readonly RetainedMetadata[],
  plugin: string,
): ReadResult<readonly RetainedMetadata[]> {
  const byKey = new Map<string, RetainedMetadata>();
  for (const candidate of values) {
    const value = RetainedMetadataSchema.parse(candidate);
    const existing = byKey.get(value.key);
    if (existing === undefined) {
      byKey.set(value.key, value);
      continue;
    }
    const merged = mergeClaim(`metadata.${value.key}`, existing.claimed, value.claimed, plugin);
    if (!merged.ok) return merged;
    byKey.set(value.key, { key: value.key, claimed: merged.value });
  }
  return {
    ok: true,
    value: [...byKey.values()].sort((left, right) => {
      const a = metadataKey(left);
      const b = metadataKey(right);
      return a < b ? -1 : a > b ? 1 : 0;
    }),
    diagnostics: [],
  };
}

function mergeConfigurationOption(
  left: ConfigurationOption,
  right: ConfigurationOption,
  plugin: string,
): ReadResult<ConfigurationOption> {
  const label = mergeClaim(`configuration.${left.key}.label`, left.label, right.label, plugin);
  if (!label.ok) return label;
  const description = mergeOptionalClaim(`configuration.${left.key}.description`, left.description, right.description, plugin);
  if (!description.ok) return description;
  const value = mergeClaim(
    `configuration.${left.key}.value`,
    { value: left.value, provenance: left.provenance },
    { value: right.value, provenance: right.provenance },
    plugin,
  );
  if (!value.ok) return value;
  const required = mergeClaim(
    `configuration.${left.key}.required`,
    { value: left.required, provenance: left.provenance },
    { value: right.required, provenance: right.provenance },
    plugin,
  );
  if (!required.ok) return required;
  const sensitive = mergeClaim(
    `configuration.${left.key}.sensitive`,
    { value: left.sensitive, provenance: left.provenance },
    { value: right.sensitive, provenance: right.provenance },
    plugin,
  );
  if (!sensitive.ok) return sensitive;
  return {
    ok: true,
    value: ConfigurationOptionSchema.parse({
      key: left.key,
      label: label.value,
      ...(description.value === undefined ? {} : { description: description.value }),
      value: value.value,
      required: required.value,
      sensitive: sensitive.value,
      provenance: mergeProvenance(left.provenance, right.provenance),
    }),
    diagnostics: [],
  };
}

function mergeConfiguration(
  values: readonly ConfigurationOption[],
  plugin: string,
): ReadResult<readonly ConfigurationOption[]> {
  const byKey = new Map<string, ConfigurationOption>();
  for (const candidate of values) {
    const option = ConfigurationOptionSchema.parse(candidate);
    const existing = byKey.get(option.key);
    if (existing === undefined) {
      byKey.set(option.key, option);
      continue;
    }
    const merged = mergeConfigurationOption(existing, option, plugin);
    if (!merged.ok) return merged;
    byKey.set(option.key, merged.value);
  }
  const configuration = PluginConfigurationSchema.parse({
    options: [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key)),
  });
  return { ok: true, value: configuration.options, diagnostics: [] };
}

function mergeSkill(left: SkillComponent, right: SkillComponent, plugin: string): ReadResult<SkillComponent> {
  if (left.name.value !== right.name.value || left.root.value !== right.root.value) {
    return failure(ErrorCodeRegistry.claimConflict, "Conflicting skill component claims", plugin, {
      left: snapshot(left),
      right: snapshot(right),
    }, firstProvenance(right.root));
  }
  const name = mergeClaim("skill.name", left.name, right.name, plugin);
  if (!name.ok) return name;
  const root = mergeClaim("skill.root", left.root, right.root, plugin);
  if (!root.ok) return root;
  const metadata = mergeMetadata([...left.metadata, ...right.metadata], plugin);
  if (!metadata.ok) return metadata;
  return {
    ok: true,
    value: SkillComponentSchema.parse({ ...left, name: name.value, root: root.value, metadata: metadata.value }),
    diagnostics: [],
  };
}

function mergeHook(left: HookComponent, right: HookComponent, plugin: string): ReadResult<HookComponent> {
  if (left.event.value !== right.event.value ||
      (left.matcher?.value !== right.matcher?.value) ||
      stableJson(left.handler.value) !== stableJson(right.handler.value)) {
    return failure(ErrorCodeRegistry.claimConflict, "Conflicting hook component claims", plugin, {
      left: snapshot(left),
      right: snapshot(right),
    }, firstProvenance(right.handler));
  }
  const event = mergeClaim("hook.event", left.event, right.event, plugin);
  if (!event.ok) return event;
  const matcher = mergeOptionalClaim("hook.matcher", left.matcher, right.matcher, plugin);
  if (!matcher.ok) return matcher;
  const handler = mergeClaim("hook.handler", left.handler, right.handler, plugin);
  if (!handler.ok) return handler;
  const metadata = mergeMetadata([...left.metadata, ...right.metadata], plugin);
  if (!metadata.ok) return metadata;
  return {
    ok: true,
    value: HookComponentSchema.parse({
      ...left,
      event: event.value,
      ...(matcher.value === undefined ? {} : { matcher: matcher.value }),
      handler: handler.value,
      metadata: metadata.value,
    }),
    diagnostics: [],
  };
}

function mergeMcp(left: McpServerComponent, right: McpServerComponent, plugin: string): ReadResult<McpServerComponent> {
  if (left.nativeKey.value !== right.nativeKey.value || stableJson(left.declaration.value) !== stableJson(right.declaration.value)) {
    return failure(ErrorCodeRegistry.claimConflict, "Conflicting MCP server component claims", plugin, {
      left: snapshot(left),
      right: snapshot(right),
    }, firstProvenance(right.declaration));
  }
  const nativeKey = mergeClaim("mcp.nativeKey", left.nativeKey, right.nativeKey, plugin);
  if (!nativeKey.ok) return nativeKey;
  const declaration = mergeClaim("mcp.declaration", left.declaration, right.declaration, plugin);
  if (!declaration.ok) return declaration;
  const metadata = mergeMetadata([...left.metadata, ...right.metadata], plugin);
  if (!metadata.ok) return metadata;
  return {
    ok: true,
    value: McpServerComponentSchema.parse({ ...left, nativeKey: nativeKey.value, declaration: declaration.value, metadata: metadata.value }),
    diagnostics: [],
  };
}

function mergeForeign(left: ForeignComponent, right: ForeignComponent, plugin: string): ReadResult<ForeignComponent> {
  if (left.nativeHost !== right.nativeHost || left.nativeKind.value !== right.nativeKind.value ||
      stableJson(left.declaration.value) !== stableJson(right.declaration.value)) {
    return failure(ErrorCodeRegistry.claimConflict, "Conflicting foreign component claims", plugin, {
      left: snapshot(left),
      right: snapshot(right),
    }, firstProvenance(right.declaration));
  }
  const nativeKind = mergeClaim("foreign.nativeKind", left.nativeKind, right.nativeKind, plugin);
  if (!nativeKind.ok) return nativeKind;
  const declaration = mergeClaim("foreign.declaration", left.declaration, right.declaration, plugin);
  if (!declaration.ok) return declaration;
  return {
    ok: true,
    value: ForeignComponentSchema.parse({ ...left, nativeKind: nativeKind.value, declaration: declaration.value }),
    diagnostics: [],
  };
}

function componentIdentity(component: Component): Parameters<typeof deriveComponentId>[1] {
  switch (component.kind) {
    case "skill": return { kind: "skill", root: component.root.value };
    case "hook": return {
      kind: "hook",
      event: component.event.value,
      ...(component.matcher === undefined ? {} : { matcher: component.matcher.value }),
      handler: component.handler.value,
    };
    case "mcp-server": return { kind: "mcp-server", nativeKey: component.nativeKey.value };
    case "foreign": {
      const declarationKey = component.declaration.provenance[0]?.location.pointer;
      if (declarationKey === undefined || declarationKey.length === 0) {
        throw new Error("foreign component declaration is missing its identity pointer");
      }
      return {
        kind: "foreign",
        nativeHost: component.nativeHost,
        nativeKind: component.nativeKind.value,
        declarationKey,
      };
    }
  }
}

function mergeComponent(left: Component, right: Component, plugin: string): ReadResult<Component> {
  if (left.kind !== right.kind) {
    return failure(ErrorCodeRegistry.claimConflict, "Different component kinds share one component id", plugin, {
      left: snapshot(left),
      right: snapshot(right),
    }, firstProvenance(left.kind === "skill" ? left.root : left.kind === "hook" ? left.handler : left.kind === "mcp-server" ? left.declaration : left.declaration));
  }
  switch (left.kind) {
    case "skill": return mergeSkill(left, right as SkillComponent, plugin);
    case "hook": return mergeHook(left, right as HookComponent, plugin);
    case "mcp-server": return mergeMcp(left, right as McpServerComponent, plugin);
    case "foreign": return mergeForeign(left, right as ForeignComponent, plugin);
  }
}

function foreignDeclarationComponent(
  declaration: ForeignComponentDeclaration,
  plugin: string,
  sha256: Sha256,
): ForeignComponent {
  const valid = ForeignComponentDeclarationSchema.parse(declaration);
  const identity = {
    kind: "foreign" as const,
    nativeHost: valid.nativeHost,
    nativeKind: valid.nativeKind.value,
    declarationKey: valid.declarationKey,
  };
  return ForeignComponentSchema.parse({
    kind: "foreign",
    id: deriveComponentId(PluginKeySchema.parse(plugin), identity, sha256),
    nativeHost: valid.nativeHost,
    nativeKind: valid.nativeKind,
    declaration: valid.declaration,
  });
}

function realizeComponents(
  values: readonly Component[],
  plugin: string,
  sha256: Sha256,
): ReadResult<Readonly<{
  skills: readonly SkillComponent[];
  hooks: readonly HookComponent[];
  mcpServers: readonly McpServerComponent[];
  foreign: readonly ForeignComponent[];
}>> {
  const byId = new Map<string, Component>();
  try {
    for (const candidate of values) {
      const component = ComponentSchema.parse(candidate);
      verifyComponentId(component.id, PluginKeySchema.parse(plugin), componentIdentity(component), sha256);
      const existing = byId.get(component.id);
      if (existing === undefined) {
        byId.set(component.id, component);
      } else {
        const merged = mergeComponent(existing, component, plugin);
        if (!merged.ok) return merged;
        byId.set(component.id, merged.value);
      }
    }
    const sorted = [...byId.values()].sort((left, right) => {
      const kind = COMPONENT_ORDER[left.kind] - COMPONENT_ORDER[right.kind];
      return kind !== 0 ? kind : left.id.localeCompare(right.id);
    });
    const result = PluginComponentsSchema.parse({
      skills: sorted.filter((value): value is SkillComponent => value.kind === "skill"),
      hooks: sorted.filter((value): value is HookComponent => value.kind === "hook"),
      mcpServers: sorted.filter((value): value is McpServerComponent => value.kind === "mcp-server"),
      foreign: sorted.filter((value): value is ForeignComponent => value.kind === "foreign"),
    });
    return { ok: true, value: result, diagnostics: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(ErrorCodeRegistry.schemaInvalid, "normalized component inventory is invalid", plugin, {
        issues: error.issues.map((issue) => ({ code: issue.code, path: issue.path.map(String), message: issue.message })),
      });
    }
    return failure(ErrorCodeRegistry.schemaInvalid, error instanceof Error ? error.message : "normalized component inventory is invalid", plugin);
  }
}

function manifestClaimValues<T>(claims: readonly PluginManifestClaims[], selector: (claim: PluginManifestClaims) => Claim<T> | undefined): Claim<T>[] {
  return claims.flatMap((claim) => {
    const value = selector(claim);
    return value === undefined ? [] : [value];
  });
}

function locatorTargetKey(locator: PluginManifestClaims["locators"][number]): string {
  return stableJson(locator.target);
}

function locatorFieldKey(locator: PluginManifestClaims["locators"][number]): string {
  const pointer = [...locator.provenance].sort(compareProvenance)[0]?.location.pointer ?? "";
  return `${locator.componentKind}\u0000${pointer.split("/")[1] ?? pointer}`;
}

function validateManifestLocatorClaims(
  claims: readonly PluginManifestClaims[],
  plugin: string,
): ReadResult<true> {
  const locators = claims.flatMap((claim) => claim.locators);
  for (let leftIndex = 0; leftIndex < locators.length; leftIndex += 1) {
    const left = locators[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < locators.length; rightIndex += 1) {
      const right = locators[rightIndex]!;
      if (left.nativeHost === right.nativeHost || locatorFieldKey(left) !== locatorFieldKey(right)) continue;
      if (locatorTargetKey(left) === locatorTargetKey(right)) continue;
      return failure(ErrorCodeRegistry.claimConflict, "Conflicting dual-manifest component locators", plugin, {
        field: `locator.${locatorFieldKey(left)}`,
        left: snapshot(left),
        right: snapshot(right),
        locations: [firstProvenance(left), firstProvenance(right)] as unknown as JsonValue,
      }, firstProvenance(left));
    }
  }
  return { ok: true, value: true, diagnostics: [] };
}

/**
 * Reconcile every observed declaration into one complete normalized plugin.
 * This module intentionally owns no format or runtime policy; it only merges
 * typed claims and verifies the versioned component identities at the boundary.
 */
export function reconcilePluginBundle(input: ReconcileInput): ReadResult<z.infer<typeof NormalizedPluginSchema>> {
  let plugin = "unknown@unknown";
  try {
    const entry = NormalizedMarketplaceEntrySchema.parse(input.entry);
    plugin = PluginKeySchema.parse(entry.identity.value.key);
    const source = ResolvedPluginSourceSchema.parse(input.source);
    const claims = input.manifestClaims
      .map((claim) => PluginManifestClaimsSchema.parse(claim))
      .sort((left, right) => {
        const host = HOST_ORDER[left.nativeHost] - HOST_ORDER[right.nativeHost];
        if (host !== 0) return host;
        return left.document.location.path.localeCompare(right.document.location.path);
      });
    const locatorClaims = validateManifestLocatorClaims(claims, plugin);
    if (!locatorClaims.ok) return locatorClaims;
    const externalConfiguration = input.configuration.flatMap((configuration) =>
      PluginConfigurationSchema.parse(configuration).options.map((option) => ConfigurationOptionSchema.parse(option)),
    );
    const externalComponents = input.components.map((component) => ComponentSchema.parse(component));
    const externalMetadata = input.metadata.map((metadata) => RetainedMetadataSchema.parse(metadata));

    const names = manifestClaimValues(claims, (claim) => claim.name);
    const manifestName = reduceClaim("manifest.name", names, plugin);
    if (!manifestName.ok) return manifestName;
    const versions = [
      ...(entry.version === undefined ? [] : [entry.version]),
      ...manifestClaimValues(claims, (claim) => claim.version),
    ];
    const version = reduceClaim("version", versions, plugin);
    if (!version.ok) return version;
    const descriptions = [
      ...(entry.description === undefined ? [] : [entry.description]),
      ...manifestClaimValues(claims, (claim) => claim.description),
    ];
    const description = reduceClaim("description", descriptions, plugin);
    if (!description.ok) return description;

    const manifestConfiguration = claims.flatMap((claim) => claim.configuration);
    const configuration = mergeConfiguration([...manifestConfiguration, ...externalConfiguration], plugin);
    if (!configuration.ok) return configuration;

    const foreign = [
      ...(input.foreignDeclarations ?? []),
      ...claims.flatMap((claim) => claim.foreign),
    ].map((declaration) => foreignDeclarationComponent(declaration, plugin, input.sha256));
    const components = realizeComponents([...externalComponents, ...foreign], plugin, input.sha256);
    if (!components.ok) return components;

    const metadata = mergeMetadata([
      ...entry.metadata,
      ...claims.flatMap((claim) => claim.metadata),
      ...externalMetadata,
    ], plugin);
    if (!metadata.ok) return metadata;

    const manifestNameValue = manifestName.value?.value;
    const identity = {
      ...entry.identity.value,
      ...(manifestNameValue === undefined || manifestNameValue === entry.identity.value.marketplaceEntryName
        ? {}
        : { manifestName: manifestNameValue }),
    };
    const normalized = NormalizedPluginSchema.parse({
      identity,
      ...(version.value === undefined ? {} : { version: version.value }),
      ...(description.value === undefined ? {} : { description: description.value }),
      source,
      configuration: { options: configuration.value },
      components: components.value,
      metadata: metadata.value,
    });
    return { ok: true, value: normalized, diagnostics: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(ErrorCodeRegistry.schemaInvalid, "plugin bundle reconciliation input is invalid", plugin, {
        issues: error.issues.map((issue) => ({ code: issue.code, path: issue.path.map(String), message: issue.message })),
      });
    }
    return failure(ErrorCodeRegistry.schemaInvalid, error instanceof Error ? error.message : "plugin bundle reconciliation failed", plugin);
  }
}

export type { ReconcileInput as BundleReconciliationInput };