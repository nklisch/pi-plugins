import { createMarketplaceRegistrationService } from "../application/marketplace-registration-service.js";
import { createMarketplaceCatalogService } from "../application/marketplace-catalog-service.js";
import { createNodeMarketplaceUpdateServices } from "./create-marketplace-update-services.js";
import { createNodeAdoptionService } from "./create-adoption-service.js";
import { createNodeMarketplaceLocalSourcePort } from "../infrastructure/filesystem/marketplace-local-source.js";
import type { GenerationMutationCoordinator } from "../application/generation-mutation-coordinator.js";
import type { MarketplaceInspectionService } from "../application/marketplace-inspection-contract.js";
import type { ContentStorePort } from "../application/ports/content-store.js";
import type { LifecycleClock } from "../application/ports/lifecycle-clock.js";
import type { LifecycleStateInventoryPort } from "../application/ports/lifecycle-state-inventory.js";
import type { LifecycleStateStore } from "../application/ports/lifecycle-state-store.js";
import type { ProjectTrustPort } from "../application/ports/project-trust.js";
import type { RefreshClaimIdPort } from "../application/ports/refresh-claim-id.js";
import type { MarketplaceMaterializer, PluginMaterializer } from "../application/source-materialization.js";
import type { ScopeContext } from "../domain/state/scope.js";
import type { Sha256 } from "../domain/source.js";
import type { MarketplacePluginProbePort } from "../application/marketplace-refresh-service.js";
import type { PluginLifecycleService } from "../application/plugin-lifecycle-service.js";

export type MarketplaceDiscoveryServices = Readonly<{
  registration: ReturnType<typeof createMarketplaceRegistrationService>;
  refresh: ReturnType<typeof createNodeMarketplaceUpdateServices>["refresh"];
  policy: ReturnType<typeof createNodeMarketplaceUpdateServices>["policy"];
  catalog: Pick<ReturnType<typeof createMarketplaceCatalogService>, "search" | "detail">;
  adoption: ReturnType<typeof createNodeAdoptionService>;
}>;

export type NodeMarketplaceDiscoveryServicesOptions = Readonly<{
  state: LifecycleStateStore;
  inventory: LifecycleStateInventoryPort;
  mutations: GenerationMutationCoordinator;
  clock: LifecycleClock;
  claimIds: RefreshClaimIdPort;
  materializers: Readonly<{ marketplaces: MarketplaceMaterializer; plugins?: PluginMaterializer }>;
  inspection: MarketplaceInspectionService;
  content: ContentStorePort;
  currentProject: Extract<ScopeContext, { kind: "project" }>;
  projectTrust: ProjectTrustPort;
  sha256: Sha256;
  probe?: MarketplacePluginProbePort;
  lifecycle?: PluginLifecycleService;
  userHome?: string;
  claudeRoot?: string;
  codexHome?: string;
  maxDocumentBytes?: number;
}>;

/**
 * Compose one marketplace capability over the existing state, content, source,
 * and trust graph. Construction performs no I/O; every read/acquisition remains
 * behind an explicit application method.
 */
export function createNodeMarketplaceDiscoveryServices(
  options: NodeMarketplaceDiscoveryServicesOptions,
): MarketplaceDiscoveryServices {
  const registration = createMarketplaceRegistrationService({
    state: options.state,
    mutations: options.mutations,
    materializer: options.materializers.marketplaces,
    inspection: options.inspection,
    content: options.content,
    clock: options.clock,
    currentProject: options.currentProject,
    projectTrust: options.projectTrust,
    localSources: createNodeMarketplaceLocalSourcePort(),
    sha256: options.sha256,
  });
  const updates = createNodeMarketplaceUpdateServices({
    refresh: {
      inventory: options.inventory,
      state: options.state,
      mutations: options.mutations,
      clock: options.clock,
      claimIds: options.claimIds,
      materializers: options.materializers,
      inspection: options.inspection,
      content: options.content,
      currentProject: options.currentProject,
      sha256: options.sha256,
      ...(options.probe === undefined ? {} : { probe: options.probe }),
      ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
    },
  });
  const internalCatalog = createMarketplaceCatalogService({
    state: options.state,
    content: options.content,
    inspection: options.inspection,
    clock: options.clock,
    currentProject: options.currentProject,
    sha256: options.sha256,
  });
  const catalog: MarketplaceDiscoveryServices["catalog"] = Object.freeze({
    search: internalCatalog.search,
    detail: internalCatalog.detail,
  });
  const adoption = createNodeAdoptionService({
    registrations: registration,
    registry: registration,
    ...(options.userHome === undefined ? {} : { userHome: options.userHome }),
    ...(options.claudeRoot === undefined ? {} : { claudeRoot: options.claudeRoot }),
    ...(options.codexHome === undefined ? {} : { codexHome: options.codexHome }),
    ...(options.maxDocumentBytes === undefined ? {} : { maxDocumentBytes: options.maxDocumentBytes }),
  });
  return Object.freeze({ registration, refresh: updates.refresh, policy: updates.policy, catalog, adoption });
}
