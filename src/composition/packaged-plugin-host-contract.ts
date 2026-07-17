import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  SessionShutdownEvent,
  SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import type { McpRuntimePort } from "../application/ports/mcp-runtime.js";
import type { SubagentLifecyclePort } from "../application/ports/subagent-lifecycle.js";
import type { NativeLifecycleOperationService } from "../application/native-lifecycle-operation-contract.js";
import type { CompatibilityService } from "../application/compatibility-service.js";
import type { NativeInspectionService } from "../application/native-inspection-contract.js";
import type { TrustedInstallationService } from "../application/trusted-install-contract.js";
import type { BoundPluginConfigurationService } from "../application/configuration-service.js";
import type { LifecycleRecoveryService } from "../application/recovery-service.js";
import type { createRevisionCollectionService } from "../application/revision-collection-service.js";
import type { MarketplaceDiscoveryServices } from "./create-marketplace-discovery-services.js";
import type { RuntimeCapabilityProbe } from "../application/ports/runtime-capability-probe.js";
import type { SkillResourceDiscoveryPort } from "../runtime/skills/resource-discovery.js";
import type { HostCapabilityStatus, HostStartupResult } from "../application/host-observation-contract.js";
import type { HostStatusService } from "./host-status-service.js";
export type { HostCapabilityStatus, HostStartupResult } from "../application/host-observation-contract.js";

export const PackagedPluginHostErrorCode = {
  invalidOptions: "HOST_INVALID_OPTIONS",
  duplicateComposition: "HOST_DUPLICATE_COMPOSITION",
  duplicateSession: "HOST_DUPLICATE_SESSION",
  sessionMismatch: "HOST_SESSION_MISMATCH",
  terminal: "HOST_TERMINAL",
  reloadContextUnavailable: "PI_RELOAD_CONTEXT_UNAVAILABLE",
  startupFailed: "HOST_STARTUP_FAILED",
} as const;
export type PackagedPluginHostErrorCode =
  (typeof PackagedPluginHostErrorCode)[keyof typeof PackagedPluginHostErrorCode];

/** A redacted host-boundary failure. Native causes never enter JSON output. */
export class PackagedPluginHostError extends Error {
  readonly code: PackagedPluginHostErrorCode;

  constructor(code: PackagedPluginHostErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "PackagedPluginHostError";
    this.code = code;
  }

  toJSON(): Readonly<{ code: PackagedPluginHostErrorCode; message: string }> {
    return Object.freeze({ code: this.code, message: this.message });
  }
}

export type PackagedPluginHostRuntimeParticipants = Readonly<{
  mcp?: McpRuntimePort;
  subagents?: SubagentLifecyclePort;
}>;

export type PackagedPluginHostSourceOptions = Readonly<{
  fetch?: typeof globalThis.fetch;
}>;

export type PackagedPluginHostOptions = Readonly<{
  pi: ExtensionAPI;
  agentDir?: string;
  source?: PackagedPluginHostSourceOptions;
  runtime?: PackagedPluginHostRuntimeParticipants;
}>;

export type PiSessionBinding = Readonly<{
  sessionId: string;
  sessionFile?: string;
  cwd: string;
  mode: ExtensionContext["mode"];
  projectTrusted: boolean;
}>;

export interface PiSessionBindingPort {
  current(): PiSessionBinding;
  assertContext(context: ExtensionContext): void;
  isProjectTrusted(): boolean;
}

/** Safe application services; raw stores, handles, codecs, catalogs, and brokers stay private. */
export type PackagedPluginHostApplication = Readonly<{
  operations: NativeLifecycleOperationService;
  trustedInstallation: TrustedInstallationService;
  compatibility: CompatibilityService;
  inspection: NativeInspectionService;
  status: HostStatusService;
  configuration: BoundPluginConfigurationService;
  recovery: LifecycleRecoveryService;
  collection: ReturnType<typeof createRevisionCollectionService>;
  marketplace: MarketplaceDiscoveryServices;
  capabilities: RuntimeCapabilityProbe;
  resources: SkillResourceDiscoveryPort;
}>;

export type StartedPackagedPluginHost = Readonly<{
  application: PackagedPluginHostApplication;
  startup: HostStartupResult;
  close(): Promise<void>;
}>;

export interface PackagedPluginHost {
  start(event: SessionStartEvent, context: ExtensionContext): Promise<StartedPackagedPluginHost>;
  current(): StartedPackagedPluginHost | undefined;
  runWithPiOperationContext<T>(
    context: ExtensionCommandContext,
    signal: AbortSignal,
    use: (application: PackagedPluginHostApplication) => Promise<T>,
  ): Promise<T>;
  dispose(reason: SessionShutdownEvent["reason"]): Promise<void>;
}
