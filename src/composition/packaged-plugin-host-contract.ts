import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  SessionShutdownEvent,
  SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import type { McpRuntimePort } from "../application/ports/mcp-runtime.js";
import type { SubagentLifecyclePort } from "../application/ports/subagent-lifecycle.js";

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

export type HostCapabilityStatus = Readonly<{
  status: "available" | "unavailable";
  explanation: string;
}>;

export type HostStartupResult = Readonly<{
  status: "ready" | "blocked";
  blocked: readonly Readonly<{ plugin: string; code: string; explanation: string }>[];
  capabilities: Readonly<{
    mcp: HostCapabilityStatus;
    subagents: HostCapabilityStatus;
    piReload: HostCapabilityStatus;
    secrets: HostCapabilityStatus;
  }>;
}>;

/**
 * The concrete application shape is intentionally structural and safe. The
 * composition module refines these fields with the existing application
 * services without exposing stores, SQLite handles, path codecs, or brokers.
 */
export type PackagedPluginHostApplication = Readonly<{
  lifecycle?: unknown;
  compatibility?: unknown;
  inspection?: unknown;
  configuration?: unknown;
  recovery?: unknown;
  collection?: unknown;
  marketplace?: unknown;
  capabilities?: unknown;
  resources?: unknown;
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
