import type { AutomaticUpdateCoordinator } from "./automatic-update-coordinator.js";
import type { MarketplaceUpdateScheduler } from "./marketplace-update-scheduler.js";
import {
  NativeUpdateStatusSchema,
  type NativeAutomaticUpdateRunRequest,
  type NativeAutomaticUpdateRunResult,
  type NativeUpdateAcknowledgmentRequest,
  type NativeUpdateAcknowledgmentResult,
  type NativeUpdateNotificationListRequest,
  type NativeUpdateNotificationPage,
  type NativeUpdatePolicyApplyRequest,
  type NativeUpdatePolicyApplyResult,
  type NativeUpdatePolicyPreviewResult,
  type NativeUpdateStatus,
  type NativeUpdateStatusRequest,
} from "./native-update-contract.js";
import type { NativeUpdatePolicyService } from "./native-update-policy-service.js";
import type { UpdateNotificationService } from "./update-notification-service.js";
import type { UpdatePolicyChange } from "../domain/update-policy.js";

export interface NativeUpdateManagementService {
  previewPolicy(request: UpdatePolicyChange, signal: AbortSignal): Promise<NativeUpdatePolicyPreviewResult>;
  applyPolicy(request: NativeUpdatePolicyApplyRequest, signal: AbortSignal): Promise<NativeUpdatePolicyApplyResult>;
  status(request: NativeUpdateStatusRequest, signal: AbortSignal): Promise<NativeUpdateStatus>;
  notifications(request: NativeUpdateNotificationListRequest, signal: AbortSignal): Promise<NativeUpdateNotificationPage>;
  acknowledge(request: NativeUpdateAcknowledgmentRequest, signal: AbortSignal): Promise<NativeUpdateAcknowledgmentResult>;
  runAutomatic(request: NativeAutomaticUpdateRunRequest, signal: AbortSignal): Promise<NativeAutomaticUpdateRunResult>;
}

export function createNativeUpdateManagementService(dependencies: Readonly<{
  policy: NativeUpdatePolicyService;
  notifications: UpdateNotificationService;
  automatic: AutomaticUpdateCoordinator;
  scheduler: MarketplaceUpdateScheduler;
}>): NativeUpdateManagementService {
  return Object.freeze({
    previewPolicy: dependencies.policy.preview.bind(dependencies.policy),
    applyPolicy: dependencies.policy.apply.bind(dependencies.policy),
    async status(
      request: NativeUpdateStatusRequest,
      signal: AbortSignal,
    ) {
      const [policy, scheduler, notices] = await Promise.all([
        dependencies.policy.status(request, signal),
        dependencies.scheduler.status(signal),
        dependencies.notifications.list({ scope: request.scope, ...(request.plugin === undefined ? {} : { plugin: request.plugin }), limit: 1 }, signal),
      ]);
      return NativeUpdateStatusSchema.parse({ policy, scheduler, unreadCount: notices.unreadCount, unresolvedCount: notices.unresolvedCount });
    },
    notifications: dependencies.notifications.list.bind(dependencies.notifications),
    acknowledge: dependencies.notifications.acknowledge.bind(dependencies.notifications),
    runAutomatic: dependencies.automatic.run.bind(dependencies.automatic),
  });
}
