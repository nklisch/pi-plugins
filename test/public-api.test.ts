import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  BoundaryError,
  CanonicalSourceSchema,
  ClaimConflictError,
  ClaimedSchema,
  CompatibilityReportSchema,
  ComponentAssessmentSchema,
  ComponentIdSchema,
  ComponentKindRegistry,
  ComponentSchema,
  ComponentVerdictRegistry,
  ComponentVerdictSchema,
  ConfigurationOptionSchema,
  ConfigurationValueKindRegistry,
  ConfigurationValueSchema,
  DiagnosticSchema,
  DomainContractError,
  ErrorCodeRegistry,
  ErrorCodeSchema,
  FatalBoundaryCodeSchema,
  ForeignComponentSchema,
  GitRevisionSchema,
  HookComponentSchema,
  HookHandlerSchema,
  HookHandlerVariantRegistry,
  JsonValueSchema,
  MarketplaceNameSchema,
  MarketplaceSourceSchema,
  MarketplaceSourceVariantRegistry,
  McpServerComponentSchema,
  NativeHostSchema,
  NormalizedPluginSchema,
  NpmIntegritySchema,
  PluginComponentsSchema,
  PluginConfigurationSchema,
  PluginIdentitySchema,
  PluginKeySchema,
  PluginNameSchema,
  PluginSourceSchema,
  PluginSourceVariantRegistry,
  ProvenanceSchema,
  ReadResultSchema,
  ResolvedMarketplaceSourceSchema,
  ResolvedPluginSourceSchema,
  ResolvedPluginSourceVariantRegistry,
  RetainedMetadataSchema,
  RuntimeRequirementAssessmentSchema,
  RuntimeRequirementIdSchema,
  RuntimeRequirementSchema,
  RuntimeRequirementStatusRegistry,
  RuntimeRequirementStatusSchema,
  SkillComponentSchema,
  SourceDocumentKindSchema,
  SourceHashSchema,
  SourceLocationSchema,
  createCompatibilityReport,
  createPluginIdentity,
  deriveActivatable,
  diagnosticFromZodError,
  flattenComponents,
  formatPluginKey,
  hashCanonicalSource,
  mergeEquivalentClaims,
  nonEmptyReadonly,
  parsePluginKey,
  schemaValues,
  serializeMarketplaceSource,
  serializePluginSource,
  claim,
  type CompatibilityReport,
  type Component,
  type ComponentAssessment,
  type ComponentId,
  type ComponentVerdict,
  type ConfigurationOption,
  type ConfigurationValue,
  type Diagnostic,
  type DomainContractError as DomainContractErrorType,
  type ErrorCode,
  type FatalBoundaryCode,
  type ForeignComponent,
  type GitRevision,
  type HookComponent,
  type HookHandler,
  type JsonValue,
  type MarketplaceName,
  type MarketplaceSource,
  type McpServerComponent,
  type NativeHost,
  type NormalizedPlugin,
  type NpmIntegrity,
  type PluginComponents,
  type PluginConfiguration,
  type PluginIdentity,
  type PluginKey,
  type PluginName,
  type PluginSource,
  type Provenance,
  type ReadResult,
  type ResolvedMarketplaceSource,
  type ResolvedPluginSource,
  type RetainedMetadata,
  type RuntimeRequirement,
  type RuntimeRequirementAssessment,
  type RuntimeRequirementId,
  type RuntimeRequirementStatus,
  type Sha256,
  type SkillComponent,
  type SourceDocumentKind,
  type SourceHash,
  type SourceLocation,
  type Claimed,
  type CollectionReadResult,
} from "../src/index.js";

describe("explicit package API", () => {
  it("exposes the complete intended domain contract without adapters", () => {
    const symbols = [
      BoundaryError,
      CanonicalSourceSchema,
      ClaimConflictError,
      ClaimedSchema,
      CompatibilityReportSchema,
      ComponentAssessmentSchema,
      ComponentIdSchema,
      ComponentKindRegistry,
      ComponentSchema,
      ComponentVerdictRegistry,
      ComponentVerdictSchema,
      ConfigurationOptionSchema,
      ConfigurationValueKindRegistry,
      ConfigurationValueSchema,
      DiagnosticSchema,
      DomainContractError,
      ErrorCodeRegistry,
      ErrorCodeSchema,
      FatalBoundaryCodeSchema,
      ForeignComponentSchema,
      GitRevisionSchema,
      HookComponentSchema,
      HookHandlerSchema,
      HookHandlerVariantRegistry,
      MarketplaceNameSchema,
      MarketplaceSourceSchema,
      MarketplaceSourceVariantRegistry,
      McpServerComponentSchema,
      NativeHostSchema,
      NormalizedPluginSchema,
      NpmIntegritySchema,
      PluginComponentsSchema,
      PluginConfigurationSchema,
      PluginIdentitySchema,
      PluginKeySchema,
      PluginNameSchema,
      PluginSourceSchema,
      PluginSourceVariantRegistry,
      ProvenanceSchema,
      ReadResultSchema,
      ResolvedMarketplaceSourceSchema,
      ResolvedPluginSourceSchema,
      ResolvedPluginSourceVariantRegistry,
      RetainedMetadataSchema,
      RuntimeRequirementAssessmentSchema,
      RuntimeRequirementIdSchema,
      RuntimeRequirementSchema,
      RuntimeRequirementStatusRegistry,
      RuntimeRequirementStatusSchema,
      SkillComponentSchema,
      SourceDocumentKindSchema,
      SourceHashSchema,
      SourceLocationSchema,
      createCompatibilityReport,
      createPluginIdentity,
      deriveActivatable,
      diagnosticFromZodError,
      flattenComponents,
      formatPluginKey,
      hashCanonicalSource,
      mergeEquivalentClaims,
      nonEmptyReadonly,
      parsePluginKey,
      schemaValues,
      serializeMarketplaceSource,
      serializePluginSource,
      claim,
    ];

    for (const symbol of symbols) {
      expect(symbol).toBeDefined();
    }
  });

  it("keeps public types inferred from the exported schemas", () => {
    expectTypeOf<Component>().toMatchTypeOf<z.infer<typeof ComponentSchema>>();
    expectTypeOf<ComponentAssessment>().toEqualTypeOf<z.infer<typeof ComponentAssessmentSchema>>();
    expectTypeOf<CompatibilityReport>().toEqualTypeOf<z.infer<typeof CompatibilityReportSchema>>();
    expectTypeOf<ConfigurationOption>().toEqualTypeOf<z.infer<typeof ConfigurationOptionSchema>>();
    expectTypeOf<ConfigurationValue>().toEqualTypeOf<z.infer<typeof ConfigurationValueSchema>>();
    expectTypeOf<Diagnostic>().toEqualTypeOf<z.infer<typeof DiagnosticSchema>>();
    expectTypeOf<DomainContractErrorType>().toMatchTypeOf<DomainContractError>();
    expectTypeOf<ErrorCode>().toEqualTypeOf<z.infer<typeof ErrorCodeSchema>>();
    expectTypeOf<FatalBoundaryCode>().toEqualTypeOf<z.infer<typeof FatalBoundaryCodeSchema>>();
    expectTypeOf<ForeignComponent>().toEqualTypeOf<z.infer<typeof ForeignComponentSchema>>();
    expectTypeOf<GitRevision>().toEqualTypeOf<z.infer<typeof GitRevisionSchema>>();
    expectTypeOf<HookComponent>().toEqualTypeOf<z.infer<typeof HookComponentSchema>>();
    expectTypeOf<HookHandler>().toEqualTypeOf<z.infer<typeof HookHandlerSchema>>();
    expectTypeOf<JsonValue>().toEqualTypeOf<z.infer<typeof JsonValueSchema>>();
    expectTypeOf<MarketplaceName>().toEqualTypeOf<z.infer<typeof MarketplaceNameSchema>>();
    expectTypeOf<MarketplaceSource>().toEqualTypeOf<z.infer<typeof MarketplaceSourceSchema>>();
    expectTypeOf<McpServerComponent>().toEqualTypeOf<z.infer<typeof McpServerComponentSchema>>();
    expectTypeOf<NativeHost>().toEqualTypeOf<z.infer<typeof NativeHostSchema>>();
    expectTypeOf<NormalizedPlugin>().toEqualTypeOf<z.infer<typeof NormalizedPluginSchema>>();
    expectTypeOf<NpmIntegrity>().toEqualTypeOf<z.infer<typeof NpmIntegritySchema>>();
    expectTypeOf<PluginComponents>().toEqualTypeOf<z.infer<typeof PluginComponentsSchema>>();
    expectTypeOf<PluginConfiguration>().toEqualTypeOf<z.infer<typeof PluginConfigurationSchema>>();
    expectTypeOf<PluginIdentity>().toEqualTypeOf<z.infer<typeof PluginIdentitySchema>>();
    expectTypeOf<PluginKey>().toEqualTypeOf<z.infer<typeof PluginKeySchema>>();
    expectTypeOf<PluginName>().toEqualTypeOf<z.infer<typeof PluginNameSchema>>();
    expectTypeOf<PluginSource>().toEqualTypeOf<z.infer<typeof PluginSourceSchema>>();
    expectTypeOf<Provenance>().toEqualTypeOf<z.infer<typeof ProvenanceSchema>>();
    expectTypeOf<ReadResult<unknown>>().toMatchTypeOf<ReadResult<unknown>>();
    expectTypeOf<ResolvedMarketplaceSource>().toEqualTypeOf<z.infer<typeof ResolvedMarketplaceSourceSchema>>();
    expectTypeOf<ResolvedPluginSource>().toEqualTypeOf<z.infer<typeof ResolvedPluginSourceSchema>>();
    expectTypeOf<RetainedMetadata>().toEqualTypeOf<z.infer<typeof RetainedMetadataSchema>>();
    expectTypeOf<RuntimeRequirement>().toEqualTypeOf<z.infer<typeof RuntimeRequirementSchema>>();
    expectTypeOf<RuntimeRequirementAssessment>().toEqualTypeOf<z.infer<typeof RuntimeRequirementAssessmentSchema>>();
    expectTypeOf<RuntimeRequirementId>().toEqualTypeOf<z.infer<typeof RuntimeRequirementIdSchema>>();
    expectTypeOf<RuntimeRequirementStatus>().toEqualTypeOf<z.infer<typeof RuntimeRequirementStatusSchema>>();
    expectTypeOf<SkillComponent>().toEqualTypeOf<z.infer<typeof SkillComponentSchema>>();
    expectTypeOf<SourceDocumentKind>().toEqualTypeOf<z.infer<typeof SourceDocumentKindSchema>>();
    expectTypeOf<SourceHash>().toEqualTypeOf<z.infer<typeof SourceHashSchema>>();
    expectTypeOf<SourceLocation>().toEqualTypeOf<z.infer<typeof SourceLocationSchema>>();
    expectTypeOf<ComponentId>().toEqualTypeOf<z.infer<typeof ComponentIdSchema>>();
    expectTypeOf<Claimed<string>>().toMatchTypeOf<{ value: string }>();
    expectTypeOf<CollectionReadResult<unknown>>().toMatchTypeOf<{ items: readonly unknown[] }>();
    expectTypeOf<Sha256>().toBeFunction();
  });
});
