import { z } from "zod";
import { canonicalJson } from "../../domain/canonical-json.js";
import {
  ContentDigestSchema,
  hashContent,
  type ContentDigest,
} from "../../domain/content-manifest.js";
import {
  HookComponentSchema,
  McpServerComponentSchema,
  SkillComponentSchema,
  type HookComponent,
  type McpServerComponent,
  type SkillComponent,
} from "../../domain/components.js";
import {
  CompatibilityReportSchema,
  type CompatibilityReport,
} from "../../domain/compatibility.js";
import {
  NormalizedPluginSchema,
  type NormalizedPlugin,
} from "../../domain/plugin.js";
import {
  InstalledRevisionRecordSchema,
  type InstalledRevisionRecord,
} from "../../domain/state/installed-state.js";
import {
  PluginConfigurationRefSchema,
  PluginContentRefSchema,
  PluginDataRefSchema,
  deriveProjectionRootRef,
  ProjectionRootRefSchema,
  type PluginConfigurationRef,
  type ProjectionRootRef,
} from "../../domain/state/references.js";
import {
  PluginKeySchema,
  type PluginKey,
} from "../../domain/identity.js";
import {
  ScopeReferenceSchema,
  type ScopeReference,
} from "../../domain/state/scope.js";
import type { Sha256 } from "../../domain/source.js";

export const RuntimePluginComponentsSchema = z.object({
  skills: z.array(SkillComponentSchema).readonly(),
  hooks: z.array(HookComponentSchema).readonly(),
  mcpServers: z.array(McpServerComponentSchema).readonly(),
}).strict().readonly();
export type RuntimePluginComponents = z.infer<typeof RuntimePluginComponentsSchema>;

export const PluginRuntimeProjectionSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  revision: ContentDigestSchema,
  contentRef: PluginContentRefSchema,
  dataRef: PluginDataRefSchema,
  configurationRef: PluginConfigurationRefSchema.optional(),
  components: RuntimePluginComponentsSchema,
  digest: ContentDigestSchema,
}).strict().readonly();
export type PluginRuntimeProjection = z.infer<typeof PluginRuntimeProjectionSchemaV1>;

const ActiveProjectionExpectationSchema = z.object({
  kind: z.literal("active"),
  projection: PluginRuntimeProjectionSchemaV1,
  projectionRef: ProjectionRootRefSchema,
}).strict().readonly();
const InactiveProjectionExpectationSchema = z.object({
  kind: z.literal("inactive"),
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  digest: ContentDigestSchema,
}).strict().readonly();
export const ProjectionExpectationSchema = z.discriminatedUnion("kind", [
  ActiveProjectionExpectationSchema,
  InactiveProjectionExpectationSchema,
]);
export type ProjectionExpectation = z.infer<typeof ProjectionExpectationSchema>;

export interface RuntimeProjectionPort {
  /** Publish/verify one complete-plugin projection, without activating it. */
  prepare(expectation: ProjectionExpectation, signal: AbortSignal): Promise<ProjectionExpectation>;
}

function digestProjection(value: Omit<PluginRuntimeProjection, "digest">, sha256: Sha256): ContentDigest {
  return hashContent(
    new TextEncoder().encode(`plugin-runtime-projection-v1\0${canonicalJson(value)}`),
    sha256,
  );
}

function digestInactive(scope: ScopeReference, plugin: PluginKey, sha256: Sha256): ContentDigest {
  return hashContent(
    new TextEncoder().encode(`plugin-runtime-inactive-v1\0${canonicalJson({ scope, plugin })}`),
    sha256,
  );
}

function supportedComponentIds(report: CompatibilityReport): Map<string, "supported" | "metadata-only" | "incompatible"> {
  const result = new Map<string, "supported" | "metadata-only" | "incompatible">();
  for (const assessment of report.components) {
    result.set(assessment.componentId, assessment.verdict.kind);
  }
  return result;
}

function runtimeComponents(plugin: NormalizedPlugin, report: CompatibilityReport): RuntimePluginComponents {
  const verdicts = supportedComponentIds(report);
  const skills: SkillComponent[] = [];
  const hooks: HookComponent[] = [];
  const mcpServers: McpServerComponent[] = [];
  for (const component of [
    ...plugin.components.skills,
    ...plugin.components.hooks,
    ...plugin.components.mcpServers,
  ]) {
    const verdict = verdicts.get(component.id);
    if (verdict === undefined || verdict === "incompatible") {
      throw new Error("runtime projection component inventory is not activatable");
    }
    if (verdict === "metadata-only") continue;
    if (component.kind === "skill") skills.push(component);
    else if (component.kind === "hook") hooks.push(component);
    else mcpServers.push(component);
  }
  return RuntimePluginComponentsSchema.parse({
    skills: skills.sort((left, right) => left.id.localeCompare(right.id)),
    hooks: hooks.sort((left, right) => left.id.localeCompare(right.id)),
    mcpServers: mcpServers.sort((left, right) => left.id.localeCompare(right.id)),
  });
}

function samePluginIdentity(plugin: NormalizedPlugin, report: CompatibilityReport): boolean {
  return plugin.identity.key === report.plugin.key &&
    plugin.identity.marketplaceName === report.plugin.marketplaceName &&
    plugin.identity.marketplaceEntryName === report.plugin.marketplaceEntryName &&
    plugin.identity.manifestName === report.plugin.manifestName;
}

/**
 * Build the one logical runtime descriptor from normalized, compatibility-checked
 * evidence. The digest is derived from this exact schema projection, not from
 * adapter paths or expanded configuration values.
 */
export function createPluginRuntimeProjection(
  input: Readonly<{
    scope: ScopeReference;
    plugin: NormalizedPlugin;
    compatibility: CompatibilityReport;
    revision: InstalledRevisionRecord;
    sha256: Sha256;
    digest?: ContentDigest;
  }>,
): PluginRuntimeProjection {
  const scope = ScopeReferenceSchema.parse(input.scope);
  const plugin = NormalizedPluginSchema.parse(input.plugin);
  const compatibility = CompatibilityReportSchema.parse(input.compatibility);
  const revision = InstalledRevisionRecordSchema.parse(input.revision);
  if (!samePluginIdentity(plugin, compatibility)) throw new Error("projection plugin and compatibility identity differ");
  if (!compatibility.activatable) throw new Error("incompatible plugin cannot receive an active projection");
  if (revision.evidence.plugin.key !== plugin.identity.key) throw new Error("projection revision belongs to another plugin");
  const components = runtimeComponents(plugin, compatibility);
  const withoutDigest = {
    schemaVersion: 1 as const,
    scope,
    plugin: plugin.identity.key,
    revision: revision.revision,
    contentRef: revision.contentRef,
    dataRef: revision.dataRef,
    ...(revision.configurationRef === undefined ? {} : { configurationRef: revision.configurationRef }),
    components,
  };
  const digest = digestProjection(withoutDigest, input.sha256);
  if (input.digest !== undefined && ContentDigestSchema.parse(input.digest) !== digest) {
    throw new Error("runtime projection digest does not match its contents");
  }
  return PluginRuntimeProjectionSchemaV1.parse({ ...withoutDigest, digest });
}

export function createActiveProjectionExpectation(
  projection: PluginRuntimeProjection,
  sha256: Sha256,
): Extract<ProjectionExpectation, { kind: "active" }> {
  const value = PluginRuntimeProjectionSchemaV1.parse(projection);
  const { digest: claimedDigest, ...withoutDigest } = value;
  const digest = digestProjection(withoutDigest, sha256);
  if (digest !== claimedDigest) throw new Error("runtime projection digest does not match its contents");
  const projectionRef = deriveProjectionRootRef({
    scope: value.scope,
    plugin: value.plugin,
    projectionDigest: value.digest,
  }, sha256);
  return ActiveProjectionExpectationSchema.parse({ kind: "active", projection: value, projectionRef });
}

/** A canonical, scope-qualified tombstone used for all deactivation operations. */
export function createInactiveProjectionExpectation(
  input: Readonly<{ scope: ScopeReference; plugin: PluginKey; sha256: Sha256; digest?: ContentDigest }>,
): Extract<ProjectionExpectation, { kind: "inactive" }> {
  const scope = ScopeReferenceSchema.parse(input.scope);
  const plugin = PluginKeySchema.parse(input.plugin);
  const digest = digestInactive(scope, plugin, input.sha256);
  if (input.digest !== undefined && ContentDigestSchema.parse(input.digest) !== digest) {
    throw new Error("inactive projection digest does not match its scope and plugin");
  }
  return InactiveProjectionExpectationSchema.parse({ kind: "inactive", scope, plugin, digest });
}

/** Validate adapter evidence and recompute its canonical digest/reference. */
export function verifyProjectionExpectation(input: unknown, sha256: Sha256): ProjectionExpectation {
  const value = ProjectionExpectationSchema.parse(input);
  const expected = value.kind === "active"
    ? createActiveProjectionExpectation(value.projection, sha256)
    : createInactiveProjectionExpectation({
      scope: value.scope,
      plugin: value.plugin,
      digest: value.digest,
      sha256,
    });
  if (canonicalJson(value) !== canonicalJson(expected)) {
    throw new Error("projection expectation evidence does not match its canonical digest or reference");
  }
  return expected;
}

export type {
  ContentDigest,
  PluginConfigurationRef,
  PluginKey,
  ProjectionRootRef,
  ScopeReference,
};
