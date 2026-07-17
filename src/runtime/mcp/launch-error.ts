import {
  McpLaunchContextError,
  McpLaunchErrorCodes,
} from "../../application/ports/mcp-launch-context.js";
import type { ErrorCode } from "../../domain/errors.js";

function reasonShape(error: unknown): Readonly<{ name?: unknown; code?: unknown }> {
  return error !== null && typeof error === "object" ? error as { name?: unknown; code?: unknown } : {};
}

function isTimeout(error: unknown): boolean {
  const { name, code } = reasonShape(error);
  return name === "TimeoutError" || code === "ETIMEDOUT" || code === "TIMEOUT" || code === "ERR_TIMEOUT";
}

function isCancellation(error: unknown): boolean {
  const { name, code } = reasonShape(error);
  return name === "AbortError" || code === "ABORT_ERR" || code === "ERR_ABORTED";
}

/** Classify only typed codes and reason kind/code; native messages are ignored. */
export function classifyMcpLaunchFailure(error: unknown, signal: AbortSignal): ErrorCode {
  if (error instanceof McpLaunchContextError) return error.code;
  const candidate = signal.aborted ? signal.reason : error;
  if (isTimeout(candidate)) return McpLaunchErrorCodes.timeout;
  if (signal.aborted || isCancellation(candidate)) return McpLaunchErrorCodes.cancelled;
  return McpLaunchErrorCodes.valueInvalid;
}

export { McpLaunchContextError, McpLaunchErrorCodes };
