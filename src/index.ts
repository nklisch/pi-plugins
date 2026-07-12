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

export { NormalizedPluginSchema } from "./domain/plugin.js";
export type { NormalizedPlugin } from "./domain/plugin.js";

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
