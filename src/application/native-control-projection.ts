import type { JsonValue } from "../domain/schema.js";
import { toSafeDisplayField } from "./native-inspection-display.js";
import type { SafeDisplayField } from "./native-inspection-contract.js";
import type {
  NativeControlDiagnostic,
  NativeControlOperationHandle,
  NativeControlStatus,
} from "./native-control-contract.js";
import { NativeControlCommandRegistry, type NativeControlCommandId } from "./native-control-registry.js";
import { projectNativeControlJson } from "./native-control-redaction.js";

export type NativeControlDispatchResult = Readonly<{
  status: NativeControlStatus;
  data?: JsonValue;
  operation?: NativeControlOperationHandle;
  page?: Readonly<{ next?: string }>;
  diagnostics: readonly NativeControlDiagnostic[];
  human: readonly SafeDisplayField[];
}>;

export function controlDiagnostic(
  code: string,
  severity: NativeControlDiagnostic["severity"],
  action: NativeControlDiagnostic["action"],
): NativeControlDiagnostic {
  return Object.freeze({ code, severity, action });
}

/** Validate through the owner schema before crossing the redaction boundary. */
export function projectNativeControlResponse(
  command: NativeControlCommandId,
  result: unknown,
  input: Readonly<{
    status?: NativeControlStatus;
    operation?: NativeControlOperationHandle;
    next?: string;
    diagnostics?: readonly NativeControlDiagnostic[];
    human?: readonly SafeDisplayField[];
  }> = {},
): NativeControlDispatchResult {
  const owner = NativeControlCommandRegistry[command].response.parse(result);
  return Object.freeze({
    status: input.status ?? "ok",
    data: projectNativeControlJson(owner),
    ...(input.operation === undefined ? {} : { operation: input.operation }),
    ...(input.next === undefined ? {} : { page: Object.freeze({ next: input.next }) }),
    diagnostics: Object.freeze([...(input.diagnostics ?? [])]),
    human: Object.freeze([...(input.human ?? [toSafeDisplayField(NativeControlCommandRegistry[command].summary.text, { maxScalars: 256 })])]),
  });
}

export function projectNativeControlFailure(
  status: NativeControlStatus,
  code: string,
  action: NativeControlDiagnostic["action"],
  data?: unknown,
): NativeControlDispatchResult {
  return Object.freeze({
    status,
    ...(data === undefined ? {} : { data: projectNativeControlJson(data) }),
    diagnostics: Object.freeze([controlDiagnostic(code, "error", action)]),
    human: Object.freeze([]),
  });
}
