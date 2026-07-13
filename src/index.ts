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
  ConfigurationKeySchema,
  PluginConfigurationSchema,
} from "./domain/configuration.js";
export type {
  ConfigurationValue,
  ConfigurationValueKind,
  ConfigurationOption,
  PluginConfiguration,
} from "./domain/configuration.js";

export {
  CanonicalConfigurationPathSchema,
  ConfiguredValueSchemaRegistry,
  ConfiguredValueSchema,
  SecretLocatorSchema,
  ConfigurationWriteIdSchema,
  PluginConfigurationDocumentSchemaV1,
  digestConfigurationDescriptors,
  deriveSecretLocator,
  createPluginConfigurationDocument,
  verifyPluginConfigurationDocument,
} from "./domain/configured-values.js";
export type {
  CanonicalConfigurationPath,
  ConfiguredValue,
  ConfiguredValueKind,
  SecretLocator,
  ConfigurationWriteId,
  PluginConfigurationDocument,
} from "./domain/configured-values.js";

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
  ExecutableSurfaceKindRegistry,
  ExecutableSurfaceEntrySchema,
  ExecutableSurfaceSchema,
  SkillTrustEntrySchema,
  HookTrustEntrySchema,
  McpTrustEntrySchema,
  ConfigurationTrustEntrySchema,
  createExecutableSurface,
  digestExecutableSurface,
  verifyExecutableSurface,
} from "./domain/executable-surface.js";
export type {
  ExecutableSurfaceEntry,
  ExecutableSurface,
} from "./domain/executable-surface.js";

export {
  TrustCandidateSchema,
  TrustDecisionSchema,
  TrustChangeDescriptionSchema,
  createTrustCandidate,
  verifyTrustCandidate,
  evaluateTrust,
  grantTrust,
  revokeTrust,
  describeTrustChange,
} from "./domain/trust-policy.js";
export type {
  TrustCandidate,
  TrustDecision,
  TrustChangeDescription,
  TrustSurfaceSummary,
  TrustSurfaceChange,
} from "./domain/trust-policy.js";

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
  RuntimeCapabilityRegistry,
  RuntimeCapabilityIdSchema,
  RuntimeCapabilityAvailabilitySchema,
  RuntimeCapabilitySnapshotSchema,
  RuntimeCapabilityStatusRegistry,
  RuntimeCapabilityStatusSchema,
  CompatibilityPolicyRegistry,
  CompatibilityPolicyRuleRegistry,
  CompatibilityPolicyRuleSchema,
  CompatibilityPolicyRulesSchema,
  RuntimeCapabilityRegistrySchema,
  HookEventSchema,
  MCPTransportSchema,
  MCPFeatureSchema,
} from "./domain/compatibility-policy.js";
export type {
  RuntimeCapabilityId,
  RuntimeCapabilityAvailability,
  RuntimeCapabilitySnapshot,
  CompatibilityPolicySurface,
  CompatibilityPolicyDisposition,
  CompatibilityPolicyRule,
  CompatibilityPolicyRegistryType,
  HookEvent,
  MCPTransport,
  MCPFeature,
} from "./domain/compatibility-policy.js";

export {
  CompatibilityEvaluationInputSchema,
  evaluateCompatibility,
} from "./domain/compatibility-evaluator.js";
export type { CompatibilityEvaluationInput } from "./domain/compatibility-evaluator.js";

export { createCompatibilityService } from "./application/compatibility-service.js";
export type {
  CompatibilityAssessmentRequest,
  CompatibilityService,
} from "./application/compatibility-service.js";
export type { RuntimeCapabilityProbe } from "./application/ports/runtime-capability-probe.js";

export { authorizeTrustCandidate } from "./application/trust-service.js";
export type { TrustAuthorizationResult } from "./application/trust-service.js";
export type { ProjectTrustPort } from "./application/ports/project-trust.js";

export {
  savePluginConfiguration,
  removePluginConfiguration,
  ConfigurationCleanupError,
} from "./application/configuration-service.js";
export type {
  SavePluginConfigurationRequest,
  RemovePluginConfigurationRequest,
  ConfigurationCleanup,
  ConfigurationReconciliation,
  ConfigurationSaveResult,
  ConfigurationRemovalResult,
} from "./application/configuration-service.js";
export type { ConfigurationPathContext, ConfigurationPathPort } from "./application/ports/configuration-path.js";
export type { ProjectRootAuthorityPort, TrustedProjectRoot } from "./application/ports/project-root-authority.js";
export type { PluginConfigurationStore } from "./application/ports/plugin-configuration-store.js";
export type { SecretStore } from "./application/ports/secret-store.js";
export type { ConfigurationWriteIdPort } from "./application/ports/configuration-write-id.js";
export { SensitiveValue } from "./application/sensitive-value.js";
export {
  withResolvedPluginConfiguration,
  ConfigurationResolutionError,
} from "./application/configuration-resolver.js";
export type { ResolvedConfiguration } from "./application/resolved-configuration.js";

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
  ContentStoreKindRegistry,
  ContentStoreKeySchema,
  ContentStoreIdentitySchema,
  MarketplaceStoreIdentitySchema,
  PluginStoreIdentitySchema,
  createMarketplaceStoreIdentity,
  createPluginStoreIdentity,
  createMarketplaceStoreIdentityFromEvidence,
  createPluginStoreIdentityFromEvidence,
  verifyContentStoreIdentity,
  contentStoreKeyDigest,
  contentStoreKeySchema,
} from "./domain/content-store.js";
export type {
  ContentStoreKind,
  ContentStoreKey,
  ContentStoreIdentity,
  MarketplaceStoreIdentity,
  PluginStoreIdentity,
} from "./domain/content-store.js";

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
export { createNodeContentStore } from "./infrastructure/filesystem/create-content-store.js";
export { verifyMaterializedContent } from "./infrastructure/filesystem/secure-content-writer.js";
export type { NodeSourceMaterializerOptions } from "./infrastructure/source/create-source-materializers.js";
export type { NodeContentStoreOptions } from "./infrastructure/filesystem/create-content-store.js";

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

// Lifecycle state is a public contract, not a storage implementation. Export
// only schema-derived values, pure identity/codec helpers, and the adapter
// port; physical paths, locks, secret stores, projections, and operations stay
// outside the package boundary.
export {
  StateSchemaVersionSchema,
  defineVersionedSchemaFamily,
  migrateVersionedDocument,
} from "./domain/state/versioning.js";
export type {
  StateSchemaVersion,
  StateMigration,
  VersionedSchemaFamily,
} from "./domain/state/versioning.js";

export {
  CanonicalProjectRootSchema,
  ProjectIdentitySchema,
  ProjectKeySchema,
  ScopeReferenceSchema,
  ScopeContextSchema,
  deriveProjectKey,
  createScopeContext,
  toScopeReference,
} from "./domain/state/scope.js";
export type {
  CanonicalProjectRoot,
  ProjectIdentity,
  ProjectKey,
  ScopeReference,
  ScopeContext,
} from "./domain/state/scope.js";
export type { ProjectRootResolutionPort } from "./application/ports/project-root-authority.js";

export {
  StateReferenceKindRegistry,
  StateBlobRefSchema,
  MarketplaceContentRefSchema,
  PluginContentRefSchema,
  PluginDataRefSchema,
  PluginConfigurationRefSchema,
  TrustSubjectRefSchema,
  PendingTransitionRefSchema,
  ProjectionRootRefSchema,
  StateReferenceSchema,
  ReferenceIdentitySchema,
  deriveStateBlobRef,
  deriveMarketplaceContentRef,
  derivePluginContentRef,
  derivePluginDataRef,
  derivePluginConfigurationRef,
  deriveTrustSubjectRef,
  derivePendingTransitionRef,
  deriveProjectionRootRef,
  verifyStateBlobRef,
  verifyMarketplaceContentRef,
  verifyPluginContentRef,
  verifyPluginDataRef,
  verifyPluginConfigurationRef,
  verifyTrustSubjectRef,
  verifyPendingTransitionRef,
  verifyProjectionRootRef,
} from "./domain/state/references.js";
export type {
  StateReferenceKind,
  StateReferenceTag,
  StateBlobRef,
  MarketplaceContentRef,
  PluginContentRef,
  PluginDataRef,
  PluginConfigurationRef,
  TrustSubjectRef,
  PendingTransitionRef,
  ProjectionRootRef,
  StateReference,
  ReferenceIdentity,
} from "./domain/state/references.js";

export {
  GenerationSchema,
  UpdateApplicationPreferenceSchema,
  MarketplaceConfigurationRecordSchema,
  HostConfigDocumentSchemaV1,
  HostConfigDocumentSchema,
  HostConfigSchemaFamily,
} from "./domain/state/config-state.js";
export type {
  Generation,
  UpdateApplicationPreference,
  MarketplaceConfigurationRecord,
  HostConfigDocumentV1,
  HostConfigDocument,
} from "./domain/state/config-state.js";

export {
  PortableMarketplaceSourceSchema,
  PortablePluginSourceSchema,
  PortablePluginConstraintSchema,
  PortableMarketplaceDeclarationSchema,
  PortablePluginDeclarationSchema,
  PortableProjectDeclarationSchemaV1,
  PortableProjectDeclarationSchema,
  PortableProjectSchemaFamily,
  isSafePortableRelativePath,
  assertPortableProjectDeclarationSafe,
  parsePortableProjectDeclaration,
  decodePortableProjectDeclaration,
} from "./domain/state/portable-project-declaration.js";
export type {
  PortableMarketplaceSource,
  PortablePluginSource,
  PortablePluginConstraint,
  PortableMarketplaceDeclaration,
  PortablePluginDeclaration,
  PortableProjectDeclarationV1,
  PortableProjectDeclaration,
} from "./domain/state/portable-project-declaration.js";

export {
  ActivationIntentSchema,
  InstalledPluginIdentitySchema,
  InstalledSourceEvidenceSchema,
  InstalledComponentEvidenceSchema,
  InstalledCompatibilityEvidenceSchema,
  InstalledTrustEvidenceSchema,
  InstalledEvidenceSummarySchema,
  MarketplaceSourceEvidenceSchema,
  MarketplaceSnapshotRecordSchema,
  InstalledRevisionRecordSchema,
  InstalledPluginRecordSchema,
  InstalledUserStateDocumentSchemaV1,
  InstalledUserStateDocumentSchema,
  InstalledUserStateSchema,
  InstalledUserStateSchemaFamily,
  createMarketplaceSnapshotRecord,
  createInstalledRevisionRecord,
  deriveStablePluginDataRef,
  verifyInstalledRevisionRecord,
  verifyInstalledPluginRecord,
  createInstalledPluginRecord,
  createInstalledUserStateDocument,
  decodeInstalledPluginRecords,
  decodeInstalledUserPlugins,
} from "./domain/state/installed-state.js";
export type {
  ActivationIntent,
  ComponentEvidenceKind,
  InstalledPluginIdentity,
  InstalledSourceEvidence,
  InstalledComponentEvidence,
  InstalledCompatibilityEvidence,
  InstalledTrustEvidence,
  InstalledEvidenceSummary,
  MarketplaceSourceEvidence,
  MarketplaceSnapshotRecord,
  InstalledRevisionRecord,
  InstalledPluginRecord,
  InstalledUserStateDocumentV1,
  InstalledUserStateDocument,
  InstalledRecordQuarantine,
  InstalledRecordCollectionDecode,
} from "./domain/state/installed-state.js";

export {
  ProjectLocalStateDocumentSchemaV1,
  ProjectLocalStateDocumentSchema,
  ProjectLocalStateSchemaFamily,
  createProjectLocalStateDocument,
  decodeProjectPlugins,
} from "./domain/state/project-state.js";
export type {
  ProjectLocalStateDocumentV1,
  ProjectLocalStateDocument,
  ProjectPluginRecordCollectionDecode,
} from "./domain/state/project-state.js";

export {
  StateDocumentKindRegistry,
  StateDocumentKindSchema,
  PointerDocumentKindSchema,
  StateDocumentPointerSchema,
  StatePointersDocumentSchemaV1,
  StatePointersDocumentSchema,
  StatePointersSchemaFamily,
  createStatePointersDocument,
  verifyStatePointersScope,
} from "./domain/state/pointers.js";
export type {
  StateDocumentKind,
  PointerDocumentKind,
  StateDocumentPointer,
  StatePointersDocumentV1,
  StatePointersDocument,
} from "./domain/state/pointers.js";

export {
  TrustDecisionStatusSchema,
  ImmutableRevisionEvidenceSchema,
  TrustSubjectEvidenceSchema,
  TrustStateRecordSchema,
  TrustStateDocumentSchemaV1,
  TrustStateDocumentSchema,
  TrustStateSchemaFamily,
  createTrustStateRecord,
  verifyTrustStateRecord,
  createTrustStateDocument,
  deriveTrustSubject,
} from "./domain/state/trust-state.js";
export type {
  TrustDecisionStatus,
  ImmutableRevisionEvidence,
  TrustSubjectEvidence,
  TrustStateRecord,
  TrustStateDocumentV1,
  TrustStateDocument,
} from "./domain/state/trust-state.js";

export {
  StateDocumentRegistry,
  getStateDocumentDefinition,
  stateDocumentKinds,
} from "./domain/state/registry.js";
export type {
  StateDocumentIsolation,
  RegisteredStateDocument,
  StateDocumentByKind,
  StateDocumentFor,
} from "./domain/state/registry.js";

export {
  StateCorruptionCodeRegistry,
  StateCorruptionCodeSchema,
  StateCorruptionSummarySchema,
  StateCorruptionFieldRegistry,
  StateCorruptionFieldIdSchema,
  StateCorruptionPointerSchema,
  StateCorruptionLocationSchema,
  StateCorruptionSchema,
  StateCodecError,
  hashStateDocument,
  decodeStateDocument,
  encodeStateDocument,
} from "./domain/state/codec.js";
export type {
  StateCorruptionCode,
  StateCorruptionSummary,
  StateCorruptionFieldId,
  StateCorruptionPointer,
  StateCorruptionLocation,
  StateCorruption,
  StateCodecContext,
  DecodedDocument,
} from "./domain/state/codec.js";

export {
  UserStateMutationInputSchema,
  ProjectStateMutationInputSchema,
  StateMutationInputSchema,
  // These compatibility names are structural input schemas, not verified
  // mutation constructors.
  UserStateMutationSchema,
  ProjectStateMutationSchema,
  StateMutationSchema,
  parseStateMutation,
  validateStateMutation,
  isVerifiedStateMutation,
  StateLoadFailureSchema,
} from "./application/state-contract.js";
export type {
  UserScopeContext,
  ProjectScopeContext,
  UserGenerationSnapshot,
  ProjectGenerationSnapshot,
  GenerationSnapshot,
  UserStateMutationInput,
  ProjectStateMutationInput,
  StateMutationInput,
  UnverifiedStateMutation,
  VerifiedStateMutation,
  StateMutation,
  StateCommitResult,
  StateLoadResult,
} from "./application/state-contract.js";
export type { LifecycleStateStore } from "./application/ports/lifecycle-state-store.js";

export {
  createPromotionPlan,
  assertVerifiedPromotionPlan,
} from "./application/content-promotion.js";
export type {
  PromotionPlanInput,
  VerifiedPromotionPlan,
} from "./application/content-promotion.js";
export type {
  ContentStoreCapabilities,
  ContentStorePort,
  PromotionResult,
  ResolvedContentRoot,
  StableDataRootRequest,
  WritableDataRoot,
  ProjectionRootRequest,
  ProjectionRootAllocation,
  ResolvedProjectionRoot,
  StagingAllocation,
} from "./application/ports/content-store.js";

// Mutation coordination is a portable application contract. The SQLite
// adapter, physical lock roots, retry timers, and protocol schema remain an
// infrastructure composition detail.
export { MutationSubjectSchema } from "./application/mutation-coordination.js";
export type {
  KeyedMutationScheduler,
  MutationSubject,
} from "./application/mutation-coordination.js";
export { createKeyedMutationScheduler } from "./application/keyed-mutation-scheduler.js";
export type {
  ScopeLockLease,
  ScopeLockManager,
} from "./application/ports/scope-lock.js";
export {
  CommittedMutationCleanupError,
  MutationCleanupError,
  createGenerationMutationCoordinator,
} from "./application/generation-mutation-coordinator.js";
export type {
  GenerationMutationCoordinator,
  GenerationMutationCoordinatorDependencies,
  GenerationMutationResult,
  PreparedMutation,
  PreparedMutationContext,
  PreparedMutationRequest,
} from "./application/generation-mutation-coordinator.js";
