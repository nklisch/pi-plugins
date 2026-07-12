import { z } from "zod";
import {
  ComponentLocatorClaimSchema,
  ForeignComponentDeclarationSchema,
  PluginManifestClaimsSchema,
  type ComponentLocatorClaim,
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
  ConfigurationOptionSchema,
  PluginConfigurationSchema,
  type ConfigurationOption,
} from "../domain/configuration.js";
import {
  RetainedMetadataSchema,
  type RetainedMetadata,
} from "../domain/components.js";
import {
  NativeHostSchema,
  type Claimed,
  type NativeHost,
  type Provenance,
} from "../domain/provenance.js";
import { JsonValueSchema, type JsonValue } from "../domain/schema.js";
import type { Sha256 } from "../domain/source.js";

const HOST_RANK: Readonly<Record<NativeHost, number>> = { claude: 0, codex: 1 };
const OPERATION = "mergePluginManifestClaims";

type Claim<T> = Readonly<{
  value: T;
  provenance: readonly Provenance[];
}>;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function locationKey(provenance: Provenance): string {
  const location = provenance.location;
  return stableJson([
    location.host,
    location.documentKind,
    location.path,
    location.pointer === undefined ? null : location.pointer,
    location.line === undefined ? null : location.line,
    location.column === undefined ? null : location.column,
  ]);
}

function hostRank(host: NativeHost): number {
  return HOST_RANK[host];
}

function compareProvenance(left: Provenance, right: Provenance): number {
  const host = hostRank(left.location.host) - hostRank(right.location.host);
  if (host !== 0) return host;
  const leftKey = locationKey(left);
  const rightKey = locationKey(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function sameProvenance(left: Provenance, right: Provenance): boolean {
  return locationKey(left) === locationKey(right) &&
    stableJson(left.declaration) === stableJson(right.declaration);
}

function mergedProvenance(
  left: readonly Provenance[],
  right: readonly Provenance[],
): readonly [Provenance, ...Provenance[]] {
  const values = [...left, ...right].sort(compareProvenance);
  const unique: Provenance[] = [];
  for (const value of values) {
    if (!unique.some((existing) => sameProvenance(existing, value))) unique.push(value);
  }
  return unique as [Provenance, ...Provenance[]];
}

function claimValue<T>(value: T, provenance: readonly [Provenance, ...Provenance[]]): Claimed<T> {
  return { value, provenance };
}

type ProvenanceCarrier = Readonly<{ provenance: readonly Provenance[] }> | readonly Provenance[];

function firstProvenance(claim: ProvenanceCarrier): Provenance {
  const provenance = Array.isArray(claim)
    ? claim
    : (claim as Readonly<{ provenance: readonly Provenance[] }>).provenance;
  return [...provenance].sort(compareProvenance)[0] as Provenance;
}

function snapshot(value: unknown): JsonValue {
  if (value !== null && typeof value === "object" && "value" in value && "provenance" in value) {
    const claim = value as { value: unknown; provenance: readonly Provenance[] };
    return {
      value: JsonValueSchema.parse(claim.value),
      provenance: claim.provenance as unknown as JsonValue,
    };
  }
  return JsonValueSchema.parse(value);
}

function conflict(
  field: string,
  left: unknown,
  right: unknown,
  plugin: string,
): Diagnostic {
  const leftClaim = left as Claim<unknown>;
  const rightClaim = right as Claim<unknown>;
  const leftLocation = firstProvenance(leftClaim).location;
  return DiagnosticSchema.parse({
    code: ErrorCodeRegistry.claimConflict,
    severity: "error",
    operation: OPERATION,
    message: `Conflicting plugin manifest claim for ${field}`,
    location: leftLocation,
    plugin,
    details: {
      field,
      left: snapshot(left),
      right: snapshot(right),
    },
  });
}

function mergeClaim<T>(
  field: string,
  left: Claim<T>,
  right: Claim<T>,
  plugin: string,
  equals: (left: T, right: T) => boolean = (a, b) => stableJson(a) === stableJson(b),
): ReadResult<Claimed<T>> {
  const ordered = [left, right].sort((a, b) => compareProvenance(firstProvenance(a), firstProvenance(b)));
  const first = ordered[0] as Claim<T>;
  const second = ordered[1] as Claim<T>;
  if (first.provenance.some((leftProvenance) => second.provenance.some((rightProvenance) =>
    locationKey(leftProvenance) === locationKey(rightProvenance) &&
    stableJson(leftProvenance.declaration) !== stableJson(rightProvenance.declaration)))) {
    return { ok: false, diagnostics: [conflict(field, first, second, plugin)] };
  }
  if (!equals(first.value, second.value)) {
    return { ok: false, diagnostics: [conflict(field, first, second, plugin)] };
  }
  return {
    ok: true,
    value: claimValue(first.value, mergedProvenance(first.provenance, second.provenance)),
    diagnostics: [],
  };
}

function mergeOptional<T>(
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

function manifestFieldKey(provenance: readonly Provenance[]): string {
  const pointer = [...provenance].sort(compareProvenance)[0]?.location.pointer ?? "";
  const first = pointer.split("/")[1] ?? pointer;
  return first;
}

function targetKey(locator: ComponentLocatorClaim): string {
  return `${locator.componentKind}\u0000${stableJson(locator.target)}`;
}

function locatorFieldKey(locator: ComponentLocatorClaim): string {
  return `${locator.componentKind}\u0000${manifestFieldKey(locator.provenance)}`;
}

function mergeLocator(
  left: ComponentLocatorClaim,
  right: ComponentLocatorClaim,
  plugin: string,
): ReadResult<ComponentLocatorClaim> {
  if (left.provenance.some((leftProvenance) => right.provenance.some((rightProvenance) =>
    locationKey(leftProvenance) === locationKey(rightProvenance) &&
    stableJson(leftProvenance.declaration) !== stableJson(rightProvenance.declaration)))) {
    return { ok: false, diagnostics: [conflict("locator", left, right, plugin)] };
  }
  if (targetKey(left) === targetKey(right)) {
    const ordered = [left, right].sort((a, b) =>
      compareProvenance(firstProvenance(a.provenance), firstProvenance(b.provenance)));
    const first = ordered[0] as ComponentLocatorClaim;
    const second = ordered[1] as ComponentLocatorClaim;
    return {
      ok: true,
      value: ComponentLocatorClaimSchema.parse({
        ...first,
        // Claude is the canonical host for equivalent dual claims; complete
        // host provenance remains attached to the merged locator.
        nativeHost: firstProvenance(first.provenance).location.host,
        provenance: mergedProvenance(first.provenance, second.provenance),
      }),
      diagnostics: [],
    };
  }
  return { ok: false, diagnostics: [conflict(`locator.${locatorFieldKey(left)}`, left, right, plugin)] };
}

function locatorOrder(locator: ComponentLocatorClaim): string {
  return [
    locator.componentKind,
    stableJson(locator.target),
    stableJson(locator.provenance.map((entry) => locationKey(entry))),
  ].join("\u0000");
}

function foreignKey(declaration: ForeignComponentDeclaration): string {
  return `${declaration.nativeKind.value}\u0000${declaration.declarationKey}`;
}

function mergeForeign(
  left: ForeignComponentDeclaration,
  right: ForeignComponentDeclaration,
  plugin: string,
): ReadResult<ForeignComponentDeclaration> {
  if (foreignKey(left) !== foreignKey(right)) {
    return { ok: true, value: left, diagnostics: [] };
  }
  const declaration = mergeClaim(
    `foreign.${foreignKey(left)}`,
    left.declaration,
    right.declaration,
    plugin,
  );
  if (!declaration.ok) return declaration;
  const nativeKind = mergeClaim(
    `foreign.${foreignKey(left)}.nativeKind`,
    left.nativeKind,
    right.nativeKind,
    plugin,
  );
  if (!nativeKind.ok) return nativeKind;
  const first = [left, right].sort((a, b) =>
    compareProvenance(firstProvenance(a.declaration.provenance), firstProvenance(b.declaration.provenance)))[0] as ForeignComponentDeclaration;
  return {
    ok: true,
    value: ForeignComponentDeclarationSchema.parse({
      ...first,
      nativeHost: firstProvenance(declaration.value.provenance).location.host,
      nativeKind: nativeKind.value,
      declaration: declaration.value,
    }),
    diagnostics: [],
  };
}

function metadataOrder(metadata: RetainedMetadata): string {
  return `${metadata.key}\u0000${locationKey(firstProvenance(metadata.claimed))}`;
}

function mergeMetadata(
  values: readonly RetainedMetadata[],
  plugin: string,
): ReadResult<readonly RetainedMetadata[]> {
  const byKey = new Map<string, RetainedMetadata>();
  for (const metadata of values) {
    const existing = byKey.get(metadata.key);
    if (existing === undefined) {
      byKey.set(metadata.key, metadata);
      continue;
    }
    const merged = mergeClaim(`metadata.${metadata.key}`, existing.claimed, metadata.claimed, plugin);
    if (!merged.ok) return merged;
    byKey.set(metadata.key, { key: metadata.key, claimed: merged.value });
  }
  return {
    ok: true,
    value: [...byKey.values()].sort((a, b) => {
      const left = metadataOrder(a);
      const right = metadataOrder(b);
      return left < right ? -1 : left > right ? 1 : 0;
    }),
    diagnostics: [],
  };
}

function configurationKey(option: ConfigurationOption): string {
  return option.key;
}

function mergeConfigurationOption(
  left: ConfigurationOption,
  right: ConfigurationOption,
  plugin: string,
): ReadResult<ConfigurationOption> {
  const label = mergeClaim(`configuration.${left.key}.label`, left.label, right.label, plugin);
  if (!label.ok) return label;
  const description = mergeOptional(`configuration.${left.key}.description`, left.description, right.description, plugin);
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
      required: required.value.value,
      sensitive: sensitive.value.value,
      provenance: mergedProvenance(left.provenance, right.provenance),
    }),
    diagnostics: [],
  };
}

function mergeConfiguration(
  values: readonly (readonly ConfigurationOption[])[],
  plugin: string,
): ReadResult<readonly ConfigurationOption[]> {
  const byKey = new Map<string, ConfigurationOption>();
  for (const options of values) {
    for (const option of options) {
      const validated = ConfigurationOptionSchema.parse(option);
      const existing = byKey.get(configurationKey(validated));
      if (existing === undefined) {
        byKey.set(validated.key, validated);
      } else {
        const merged = mergeConfigurationOption(existing, validated, plugin);
        if (!merged.ok) return merged;
        byKey.set(validated.key, merged.value);
      }
    }
  }
  const result = PluginConfigurationSchema.parse({
    options: [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key)),
  });
  return { ok: true, value: result.options, diagnostics: [] };
}

function mergeLocators(
  values: readonly (readonly ComponentLocatorClaim[])[],
  plugin: string,
): ReadResult<readonly ComponentLocatorClaim[]> {
  const byTarget = new Map<string, ComponentLocatorClaim>();
  const byField = new Map<string, Readonly<{ locator: ComponentLocatorClaim; group: number }>>();
  for (const [group, locators] of values.entries()) {
    for (const locator of locators) {
      const validated = ComponentLocatorClaimSchema.parse(locator);
      const key = targetKey(validated);
      const existing = byTarget.get(key);
      if (existing !== undefined) {
        const merged = mergeLocator(existing, validated, plugin);
        if (!merged.ok) return merged;
        byTarget.set(key, merged.value);
        const mergedField = byField.get(locatorFieldKey(merged.value));
        if (mergedField !== undefined) {
          byField.set(locatorFieldKey(merged.value), { locator: merged.value, group: mergedField.group });
        }
        continue;
      }
      // A repeated manifest field is an overlapping claim. Different targets
      // under that field are contradictory; distinct fields are complementary.
      const fieldKey = locatorFieldKey(validated);
      const fieldExisting = byField.get(fieldKey);
      if (fieldExisting !== undefined && fieldExisting.group !== group && targetKey(fieldExisting.locator) !== key) {
        return { ok: false, diagnostics: [conflict(`locator.${fieldKey}`, fieldExisting.locator, validated, plugin)] };
      }
      byTarget.set(key, validated);
      if (fieldExisting === undefined) byField.set(fieldKey, { locator: validated, group });
    }
  }
  return {
    ok: true,
    value: [...byTarget.values()].sort((a, b) => {
      const left = locatorOrder(a);
      const right = locatorOrder(b);
      return left < right ? -1 : left > right ? 1 : 0;
    }),
    diagnostics: [],
  };
}

function mergeForeignDeclarations(
  values: readonly (readonly ForeignComponentDeclaration[])[],
  plugin: string,
): ReadResult<readonly ForeignComponentDeclaration[]> {
  const byKey = new Map<string, ForeignComponentDeclaration>();
  for (const declarations of values) {
    for (const declaration of declarations) {
      const validated = ForeignComponentDeclarationSchema.parse(declaration);
      const key = foreignKey(validated);
      const existing = byKey.get(key);
      if (existing === undefined) {
        byKey.set(key, validated);
        continue;
      }
      const merged = mergeForeign(existing, validated, plugin);
      if (!merged.ok) return merged;
      byKey.set(key, merged.value);
    }
  }
  return {
    ok: true,
    value: [...byKey.values()].sort((a, b) => {
      const left = foreignKey(a);
      const right = foreignKey(b);
      return left < right ? -1 : left > right ? 1 : 0;
    }),
    diagnostics: [],
  };
}

function invalidInput(details: JsonValue): ReadResult<never> {
  return {
    ok: false,
    diagnostics: [DiagnosticSchema.parse({
      code: ErrorCodeRegistry.schemaInvalid,
      severity: "error",
      operation: OPERATION,
      message: "plugin manifest merger input is invalid",
      details,
    })],
  };
}

/**
 * Reconcile normalized host claims without assigning host precedence. The
 * hash port is accepted here for the stable merger boundary and intentionally
 * remains unused until component identities are realized by the application.
 */
export function mergePluginManifestClaims(
  claims: readonly PluginManifestClaims[],
  sha256: Sha256,
): ReadResult<Readonly<{
  manifestName?: Claimed<string>;
  version?: Claimed<string>;
  description?: Claimed<string>;
  locators: readonly ComponentLocatorClaim[];
  configuration: readonly ConfigurationOption[];
  foreign: readonly ForeignComponentDeclaration[];
  metadata: readonly RetainedMetadata[];
}>> {
  void sha256;
  try {
    if (!Array.isArray(claims) || claims.length === 0) {
      return invalidInput({ reason: "at least one manifest claim is required" });
    }
    const validated = claims.map((claim) => PluginManifestClaimsSchema.parse(claim));
    const ordered = [...validated].sort((left, right) => hostRank(left.nativeHost) - hostRank(right.nativeHost));
    // PluginManifestClaims intentionally stops before plugin identity. The
    // enclosing bundle attaches PluginKey after this format-level merge.
    const plugin = undefined as unknown as string;
    const names = ordered.map((item) => item.name).filter((value): value is Claimed<string> => value !== undefined);
    const versions = ordered.map((item) => item.version).filter((value): value is Claimed<string> => value !== undefined);
    const descriptions = ordered.map((item) => item.description).filter((value): value is Claimed<string> => value !== undefined);

    const manifestName = names.length === 0 ? undefined : names.slice(1).reduce<ReadResult<Claimed<string>>>(
      (result, value) => result.ok ? mergeClaim("name", result.value, value, plugin) : result,
      { ok: true, value: names[0]!, diagnostics: [] },
    );
    if (manifestName !== undefined && !manifestName.ok) return manifestName;
    const version = versions.length === 0 ? undefined : versions.slice(1).reduce<ReadResult<Claimed<string>>>(
      (result, value) => result.ok ? mergeClaim("version", result.value, value, plugin) : result,
      { ok: true, value: versions[0]!, diagnostics: [] },
    );
    if (version !== undefined && !version.ok) return version;
    const description = descriptions.length === 0 ? undefined : descriptions.slice(1).reduce<ReadResult<Claimed<string>>>(
      (result, value) => result.ok ? mergeClaim("description", result.value, value, plugin) : result,
      { ok: true, value: descriptions[0]!, diagnostics: [] },
    );
    if (description !== undefined && !description.ok) return description;

    const locators = mergeLocators(ordered.map((item) => item.locators), plugin);
    if (!locators.ok) return locators;
    const configuration = mergeConfiguration(ordered.map((item) => item.configuration), plugin);
    if (!configuration.ok) return configuration;
    const foreign = mergeForeignDeclarations(ordered.map((item) => item.foreign), plugin);
    if (!foreign.ok) return foreign;
    const metadata = mergeMetadata(ordered.flatMap((item) => item.metadata), plugin);
    if (!metadata.ok) return metadata;

    return {
      ok: true,
      value: {
        ...(manifestName === undefined ? {} : { manifestName: manifestName.value }),
        ...(version === undefined ? {} : { version: version.value }),
        ...(description === undefined ? {} : { description: description.value }),
        locators: locators.value,
        configuration: configuration.value,
        foreign: foreign.value,
        metadata: metadata.value,
      },
      diagnostics: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return invalidInput({
        issues: error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.map(String),
          message: issue.message,
        })),
      });
    }
    return invalidInput({ reason: error instanceof Error ? error.message : String(error) });
  }
}
