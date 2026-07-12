import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  BoundaryError,
  ContentDigestSchema,
  ContentManifestEntrySchema,
  ContentManifestSchema,
  DEFAULT_MATERIALIZATION_LIMITS,
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
  MarketplaceAvailabilityRegistry,
  MarketplaceAvailabilitySchema,
  MarketplaceAuthoritySchema,
  MarketplaceDeclarationCategoryRegistry,
  MarketplaceEntryDeclarationSchema,
  MarketplaceInstallationPolicySchema,
  MarketplaceNameSchema,
  MarketplaceReadResultSchema,
  MarketplaceSourceSchema,
  MarketplaceSourceVariantRegistry,
  McpServerComponentSchema,
  NativeHostSchema,
  NormalizedMarketplaceEntrySchema,
  NormalizedMarketplaceSchema,
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
  createContentManifest,
  createNodeSourceMaterializers,
  createPluginIdentity,
  createSourceMaterializers,
  createResolvedMarketplaceSource,
  createResolvedPluginSource,
  deriveActivatable,
  diagnosticFromZodError,
  flattenComponents,
  formatPluginKey,
  hashCanonicalSource,
  hashContent,
  mergeEquivalentClaims,
  SourceMaterializationError,
  verifyContentManifest,
  verifyResolvedMarketplaceSource,
  verifyResolvedPluginSource,
  nonEmptyReadonly,
  parsePluginKey,
  schemaValues,
  serializeMarketplaceSource,
  serializePluginSource,
  claim,
  type CompatibilityReport,
  type ContentDigest,
  type ContentManifest,
  type ContentManifestEntry,
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
  type MarketplaceAuthority,
  type MarketplaceAvailability,
  type MarketplaceEntryDeclaration,
  type MarketplaceInstallationPolicy,
  type MarketplaceName,
  type MarketplaceReadResult,
  type MarketplaceSource,
  type McpServerComponent,
  type NativeHost,
  type NormalizedMarketplace,
  type NormalizedMarketplaceEntry,
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
  type SourceContext,
  type SourceMaterializationDependencies,
  type StagingSlot,
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
      ContentDigestSchema,
      ContentManifestEntrySchema,
      ContentManifestSchema,
      DEFAULT_MATERIALIZATION_LIMITS,
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
      MarketplaceAvailabilityRegistry,
      MarketplaceAvailabilitySchema,
      MarketplaceAuthoritySchema,
      MarketplaceDeclarationCategoryRegistry,
      MarketplaceEntryDeclarationSchema,
      MarketplaceInstallationPolicySchema,
      MarketplaceNameSchema,
      MarketplaceReadResultSchema,
      MarketplaceSourceSchema,
      MarketplaceSourceVariantRegistry,
      McpServerComponentSchema,
      NativeHostSchema,
      NormalizedMarketplaceEntrySchema,
      NormalizedMarketplaceSchema,
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
      createContentManifest,
      createNodeSourceMaterializers,
      createPluginIdentity,
      createSourceMaterializers,
      createResolvedMarketplaceSource,
      createResolvedPluginSource,
      deriveActivatable,
      diagnosticFromZodError,
      flattenComponents,
      formatPluginKey,
      hashCanonicalSource,
      hashContent,
      mergeEquivalentClaims,
      SourceMaterializationError,
      verifyContentManifest,
      verifyResolvedMarketplaceSource,
      verifyResolvedPluginSource,
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
    expectTypeOf<ContentDigest>().toEqualTypeOf<z.infer<typeof ContentDigestSchema>>();
    expectTypeOf<ContentManifestEntry>().toEqualTypeOf<z.infer<typeof ContentManifestEntrySchema>>();
    expectTypeOf<ContentManifest>().toEqualTypeOf<z.infer<typeof ContentManifestSchema>>();
    expectTypeOf<SourceContext>().toMatchTypeOf<{ kind: "external" } | { kind: "marketplace" }>();
    expectTypeOf<SourceMaterializationDependencies>().toMatchTypeOf<{ sha256: Sha256 }>();
    expectTypeOf<StagingSlot>().toMatchTypeOf<{ root: string }>();
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
    expectTypeOf<MarketplaceAuthority>().toEqualTypeOf<z.infer<typeof MarketplaceAuthoritySchema>>();
    expectTypeOf<MarketplaceAvailability>().toEqualTypeOf<z.infer<typeof MarketplaceAvailabilitySchema>>();
    expectTypeOf<MarketplaceEntryDeclaration>().toEqualTypeOf<z.infer<typeof MarketplaceEntryDeclarationSchema>>();
    expectTypeOf<MarketplaceInstallationPolicy>().toEqualTypeOf<z.infer<typeof MarketplaceInstallationPolicySchema>>();
    expectTypeOf<MarketplaceName>().toEqualTypeOf<z.infer<typeof MarketplaceNameSchema>>();
    expectTypeOf<MarketplaceReadResult>().toEqualTypeOf<z.infer<typeof MarketplaceReadResultSchema>>();
    expectTypeOf<MarketplaceSource>().toEqualTypeOf<z.infer<typeof MarketplaceSourceSchema>>();
    expectTypeOf<McpServerComponent>().toEqualTypeOf<z.infer<typeof McpServerComponentSchema>>();
    expectTypeOf<NativeHost>().toEqualTypeOf<z.infer<typeof NativeHostSchema>>();
    expectTypeOf<NormalizedMarketplace>().toEqualTypeOf<z.infer<typeof NormalizedMarketplaceSchema>>();
    expectTypeOf<NormalizedMarketplaceEntry>().toEqualTypeOf<z.infer<typeof NormalizedMarketplaceEntrySchema>>();
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
