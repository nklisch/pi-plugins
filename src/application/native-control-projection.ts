import type { JsonValue } from "../domain/schema.js";
import { toSafeDisplayField } from "./native-inspection-display.js";
import type { SafeDisplayField } from "./native-inspection-contract.js";
import type {
  NativeControlDiagnostic,
  NativeControlExit,
  NativeControlOperationHandle,
  NativeControlStatus,
} from "./native-control-contract.js";
import { NativeControlCommandRegistry, type NativeControlCommandId } from "./native-control-registry.js";
import { projectNativeControlSchemaJson } from "./native-control-redaction.js";

export type NativeControlDispatchResult = Readonly<{
  status: NativeControlStatus;
  data?: JsonValue;
  operation?: NativeControlOperationHandle;
  page?: Readonly<{ next?: string }>;
  exitOverride?: NativeControlExit;
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
  const definition = NativeControlCommandRegistry[command];
  const owner = definition.response.parse(result);
  const projected = definition.projectResponse === undefined
    ? projectNativeControlSchemaJson(owner)
    : definition.projectResponse(owner);
  // Projection is a second real boundary. Reparse the emitted shape so a
  // redaction transform cannot silently remove required fields or change a
  // source/path field into a different contract.
  const safeResponse = definition.projectedResponse.parse(projected);
  const jsonResponse = projectNativeControlSchemaJson(safeResponse);
  const reparsedResponse = definition.projectedResponse.parse(jsonResponse);
  return Object.freeze({
    status: input.status ?? "ok",
    data: projectNativeControlSchemaJson(reparsedResponse),
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
  _privateContext?: unknown,
): NativeControlDispatchResult {
  return Object.freeze({
    status,
    // Failure context often contains input-channel or owner-private values.
    // Stable diagnostics carry the actionable contract; arbitrary context is
    // deliberately not promoted into the command's response schema.
    diagnostics: Object.freeze([controlDiagnostic(code, "error", action)]),
    human: Object.freeze([]),
  });
}
