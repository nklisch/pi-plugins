// The package barrel is deliberately explicit. Domain modules can grow
// internal helpers without silently expanding the supported package API.
export {
  JsonValueSchema,
  nonEmptyReadonly,
  schemaValues,
} from "./domain/schema.js";
export type { JsonValue } from "./domain/schema.js";

export {
  MarketplaceNameSchema,
  PluginNameSchema,
  PluginKeySchema,
  PluginIdentitySchema,
  formatPluginKey,
  parsePluginKey,
  createPluginIdentity,
} from "./domain/identity.js";
export type {
  MarketplaceName,
  PluginName,
  PluginKey,
  PluginIdentity,
} from "./domain/identity.js";

export {
  MarketplaceSourceVariantRegistry,
  MarketplaceSourceSchema,
  PluginSourceVariantRegistry,
  PluginSourceSchema,
  GitRevisionSchema,
  NpmIntegritySchema,
  CanonicalSourceSchema,
  SourceHashSchema,
  ResolvedMarketplaceSourceSchema,
  ResolvedPluginSourceVariantRegistry,
  ResolvedPluginSourceSchema,
  serializeMarketplaceSource,
  serializePluginSource,
  hashCanonicalSource,
  createResolvedMarketplaceSource,
  verifyResolvedMarketplaceSource,
  createResolvedPluginSource,
  verifyResolvedPluginSource,
} from "./domain/source.js";
export type {
  MarketplaceSource,
  PluginSource,
  GitRevision,
  NpmIntegrity,
  CanonicalSource,
  SourceHash,
  ResolvedMarketplaceSource,
  ResolvedPluginSource,
  Sha256,
} from "./domain/source.js";

export {
  NativeHostSchema,
  SourceDocumentKindSchema,
  SourceLocationSchema,
  ProvenanceSchema,
  ClaimedSchema,
  claim,
  mergeEquivalentClaims,
} from "./domain/provenance.js";
export type {
  NativeHost,
  SourceDocumentKind,
  SourceLocation,
  Provenance,
  Claimed,
} from "./domain/provenance.js";

export {
  ConfigurationValueKindRegistry,
  ConfigurationValueSchema,
  ConfigurationOptionSchema,
  PluginConfigurationSchema,
} from "./domain/configuration.js";
export type {
  ConfigurationValue,
  ConfigurationValueKind,
  ConfigurationOption,
  PluginConfiguration,
} from "./domain/configuration.js";

export {
  ComponentKindRegistry,
  ComponentIdSchema,
  RetainedMetadataSchema,
  HookHandlerVariantRegistry,
  HookHandlerSchema,
  SkillComponentSchema,
  HookComponentSchema,
  McpServerComponentSchema,
  ForeignComponentSchema,
  ComponentSchema,
  PluginComponentsSchema,
  flattenComponents,
} from "./domain/components.js";
export type {
  ComponentId,
  RetainedMetadata,
  HookHandler,
  SkillComponent,
  HookComponent,
  McpServerComponent,
  ForeignComponent,
  Component,
  PluginComponents,
} from "./domain/components.js";

export {
  ComponentIdVersionRegistry,
  ComponentLogicalIdentitySchema,
  deriveComponentId,
  verifyComponentId,
} from "./domain/component-identity.js";
export type { ComponentLogicalIdentity } from "./domain/component-identity.js";

export {
  ComponentLocatorAuthorityRegistry,
  ComponentLocatorAuthoritySchema,
  ComponentLocatorSourceRegistry,
  ComponentLocatorSourceSchema,
  ComponentLocatorTargetSchema,
  ComponentLocatorClaimSchema,
  ForeignComponentDeclarationSchema,
  PluginManifestClaimsSchema,
} from "./domain/bundle-ingestion.js";
export type {
  ComponentLocatorAuthority,
  ComponentLocatorSource,
  ComponentLocatorTarget,
  ComponentLocatorClaim,
  ForeignComponentDeclaration,
  PluginManifestClaims,
} from "./domain/bundle-ingestion.js";

export { NormalizedPluginSchema } from "./domain/plugin.js";
export type { NormalizedPlugin } from "./domain/plugin.js";

export {
  MarketplaceAvailabilityRegistry,
  MarketplaceAvailabilitySchema,
  MarketplaceInstallationPolicySchema,
  MarketplaceAuthoritySchema,
  MarketplaceDeclarationCategoryRegistry,
  MarketplaceEntryDeclarationSchema,
  NormalizedMarketplaceEntrySchema,
  NormalizedMarketplaceSchema,
  MarketplaceReadResultSchema,
} from "./domain/marketplace.js";
export type {
  MarketplaceAvailability,
  MarketplaceInstallationPolicy,
  MarketplaceAuthority,
  MarketplaceEntryDeclaration,
  NormalizedMarketplaceEntry,
  NormalizedMarketplace,
  MarketplaceReadResult,
} from "./domain/marketplace.js";

export {
  ComponentVerdictRegistry,
  RuntimeRequirementStatusRegistry,
  RuntimeRequirementIdSchema,
  RuntimeRequirementSchema,
  RuntimeRequirementStatusSchema,
  RuntimeRequirementAssessmentSchema,
  ComponentVerdictSchema,
  ComponentAssessmentSchema,
  CompatibilityReportSchema,
  deriveActivatable,
  createCompatibilityReport,
} from "./domain/compatibility.js";
export type {
  RuntimeRequirementId,
  RuntimeRequirement,
  RuntimeRequirementStatus,
  RuntimeRequirementAssessment,
  ComponentVerdict,
  ComponentAssessment,
  CompatibilityReport,
} from "./domain/compatibility.js";

export {
  ErrorCodeRegistry,
  ErrorCodeSchema,
  FatalBoundaryCodeSchema,
  DiagnosticSchema,
  ReadResultSchema,
  DomainContractError,
  BoundaryError,
  ClaimConflictError,
  diagnosticFromZodError,
} from "./domain/errors.js";
export type {
  ErrorCode,
  FatalBoundaryCode,
  Diagnostic,
  ReadResult,
  CollectionReadResult,
} from "./domain/errors.js";

export {
  ContentDigestSchema,
  ContentManifestEntrySchema,
  ContentManifestSchema,
  DEFAULT_CONTENT_MANIFEST_LIMITS,
  createContentManifest,
  createMaterializationBinding,
  hashContent,
  verifyContentManifest,
} from "./domain/content-manifest.js";
export type {
  ContentDigest,
  ContentManifestEntry,
  ContentManifest,
  ContentManifestLimits,
} from "./domain/content-manifest.js";

export {
  DEFAULT_MATERIALIZATION_LIMITS,
  SourceMaterializationError,
  createSourceMaterializers,
} from "./application/source-materialization.js";
export type {
  ContentEntry,
  GitSourceAcquirer,
  MarketplaceMaterializer,
  MarketplacePathAcquirer,
  MaterializationFailureClassification,
  MaterializationLimits,
  MaterializedMarketplace,
  MaterializedPlugin,
  NpmSourceAcquirer,
  PluginMaterializer,
  SecureContentSession,
  SecureContentWriterFactory,
  SourceContext,
  SourceMaterializationDependencies,
  StagingSlot,
} from "./application/source-materialization.js";

export { createNodeSourceMaterializers } from "./infrastructure/source/create-source-materializers.js";
export { verifyMaterializedContent } from "./infrastructure/filesystem/secure-content-writer.js";
export type { NodeSourceMaterializerOptions } from "./infrastructure/source/create-source-materializers.js";

export {
  BundleDocumentLimits,
  BundleDocumentLimitsSchema,
  BundleInspectionInputSchema,
  BundleInspectionResultSchema,
} from "./application/inspection-contract.js";
export type {
  BundleDocumentLimitsContract,
  BundleInspectionInput,
  BundleInspectionResult,
} from "./application/inspection-contract.js";
export { createContentIndex } from "./application/content-index.js";
export type { ContentIndex } from "./application/content-index.js";
export type {
  ContentReadPort,
  ManifestFileRef,
} from "./application/ports/content-read.js";
export type {
  AgentSkillReader,
  AgentSkillReaderContext,
  BundleReaderSet,
  HookDocumentReader,
  HookDocumentReaderContext,
  McpDocumentReader,
  McpDocumentReaderContext,
  PluginManifestReader,
  PluginManifestReaderContext,
  SkillPresentationReader,
} from "./application/ports/bundle-readers.js";

export { createPluginInspectionService } from "./application/inspection-service.js";
export type {
  PluginInspectionDependencies,
  PluginInspectionService,
} from "./application/inspection-service.js";
export { reconcilePluginBundle } from "./application/bundle-reconciler.js";
export type { BundleReconciliationInput } from "./application/bundle-reconciler.js";
export { createNodePluginInspector } from "./composition/create-plugin-inspector.js";
export type { NodePluginInspectorOptions } from "./composition/create-plugin-inspector.js";
