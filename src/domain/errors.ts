import { z } from "zod";
import { PluginKeySchema, type PluginKey } from "./identity.js";
import { JsonValueSchema, type JsonValue } from "./schema.js";
import { SourceLocationSchema, type SourceLocation } from "./provenance.js";

/**
 * Stable machine-readable failures at domain boundaries. The values are part
 * of the package contract; add new codes rather than changing an existing
 * meaning.
 */
export const ErrorCodeRegistry = {
  schemaInvalid: "SCHEMA_INVALID",
  entryInvalid: "ENTRY_INVALID",
  identityInvalid: "IDENTITY_INVALID",
  sourceInvalid: "SOURCE_INVALID",
  claimConflict: "CLAIM_CONFLICT",
  unsupportedDeclaration: "UNSUPPORTED_DECLARATION",
  requirementUnavailable: "REQUIREMENT_UNAVAILABLE",
  marketplaceRootInvalid: "MARKETPLACE_ROOT_INVALID",
  manifestRootInvalid: "MANIFEST_ROOT_INVALID",
  sourceResolutionFailed: "SOURCE_RESOLUTION_FAILED",
  pathContainmentFailed: "PATH_CONTAINMENT_FAILED",
  adapterFailed: "ADAPTER_FAILED",
} as const;

type ErrorCodeValue =
  (typeof ErrorCodeRegistry)[keyof typeof ErrorCodeRegistry];

const errorCodeValues = Object.values(ErrorCodeRegistry) as [
  ErrorCodeValue,
  ...ErrorCodeValue[],
];

/** Runtime validation is derived from the single error-code registry. */
export const ErrorCodeSchema = z.enum(errorCodeValues);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

const fatalBoundaryCodes = [
  ErrorCodeRegistry.marketplaceRootInvalid,
  ErrorCodeRegistry.manifestRootInvalid,
  ErrorCodeRegistry.sourceResolutionFailed,
  ErrorCodeRegistry.pathContainmentFailed,
  ErrorCodeRegistry.adapterFailed,
] as const;

export const FatalBoundaryCodeSchema = z.enum(fatalBoundaryCodes);
export type FatalBoundaryCode = z.infer<typeof FatalBoundaryCodeSchema>;

export const DiagnosticSchema = z
  .object({
    code: ErrorCodeSchema,
    severity: z.enum(["warning", "error"]),
    operation: z.string().min(1),
    message: z.string().min(1),
    location: SourceLocationSchema.optional(),
    plugin: PluginKeySchema.optional(),
    details: JsonValueSchema.optional(),
  })
  .readonly();
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

/**
 * A schema factory for entry readers. A failed entry must carry at least one
 * diagnostic, while a successful entry may carry warnings alongside its
 * value.
 */
export function ReadResultSchema<T extends z.ZodTypeAny>(value: T) {
  return z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      value,
      diagnostics: z.array(DiagnosticSchema).readonly(),
    }),
    z.object({
      ok: z.literal(false),
      diagnostics: z.array(DiagnosticSchema).min(1).readonly(),
    }),
  ]);
}

export type ReadResult<T> =
  | Readonly<{
      ok: true;
      value: T;
      diagnostics: readonly Diagnostic[];
    }>
  | Readonly<{
      ok: false;
      diagnostics: readonly [Diagnostic, ...Diagnostic[]];
    }>;

/** A collection can retain valid siblings while reporting invalid entries. */
export type CollectionReadResult<T> = Readonly<{
  items: readonly T[];
  diagnostics: readonly Diagnostic[];
}>;

type DomainContractErrorInput = Readonly<{
  code: ErrorCode;
  operation: string;
  message: string;
  location?: SourceLocation;
  plugin?: PluginKey;
  details?: JsonValue;
  cause?: unknown;
}>;

/**
 * Typed domain failure with a serializable diagnostic projection. The native
 * Error cause is deliberately kept only on the thrown object: it can contain
 * an Error, response, or adapter-specific value that is not domain JSON.
 */
export class DomainContractError extends Error {
  readonly code: ErrorCode;
  readonly operation: string;
  readonly location?: SourceLocation;
  readonly plugin?: PluginKey;
  readonly details?: JsonValue;

  constructor(input: DomainContractErrorInput) {
    super(
      input.message,
      input.cause === undefined ? undefined : { cause: input.cause },
    );
    this.name = "DomainContractError";

    this.code = ErrorCodeSchema.parse(input.code);
    this.operation = z.string().min(1).parse(input.operation);

    if (input.location !== undefined) {
      this.location = SourceLocationSchema.parse(input.location);
    }
    if (input.plugin !== undefined) {
      this.plugin = PluginKeySchema.parse(input.plugin);
    }
    if (input.details !== undefined) {
      this.details = JsonValueSchema.parse(input.details);
    }

    // Error's constructor accepts values that JavaScript can stringify. The
    // domain contract does not: reject an empty message at this boundary.
    z.string().min(1).parse(input.message);
  }

  toDiagnostic(): Diagnostic {
    const diagnostic = {
      code: this.code,
      severity: "error" as const,
      operation: this.operation,
      message: this.message,
      ...(this.location === undefined ? {} : { location: this.location }),
      ...(this.plugin === undefined ? {} : { plugin: this.plugin }),
      ...(this.details === undefined ? {} : { details: this.details }),
    };
    return DiagnosticSchema.parse(diagnostic);
  }
}

/** Errors that make the enclosing marketplace, manifest, or adapter unusable. */
export class BoundaryError extends DomainContractError {
  constructor(
    input: Readonly<{
      code: FatalBoundaryCode;
      operation: string;
      message: string;
      location?: SourceLocation;
      plugin?: PluginKey;
      details?: JsonValue;
      cause?: unknown;
    }>,
  ) {
    super({ ...input, code: FatalBoundaryCodeSchema.parse(input.code) });
    this.name = "BoundaryError";
  }
}

/**
 * Unit 3 owns the merge behavior. Re-export its error here so callers have a
 * single error module without creating a second, incompatible class.
 */
export { ClaimConflictError } from "./provenance.js";

function diagnosticIssuePath(path: readonly PropertyKey[]): readonly string[] {
  return path.map((segment) => String(segment));
}

/** Convert a Zod boundary failure into deterministic, source-aware JSON. */
export function diagnosticFromZodError(
  error: z.ZodError,
  context: Readonly<{
    operation: string;
    location?: SourceLocation;
    plugin?: PluginKey;
  }>,
): Diagnostic {
  if (!(error instanceof z.ZodError)) {
    throw new TypeError("diagnosticFromZodError requires a ZodError");
  }

  const issues = error.issues.map((issue) => ({
    code: issue.code,
    path: diagnosticIssuePath(issue.path),
    message: issue.message,
  }));
  const firstIssue = issues[0];
  const message = firstIssue === undefined
    ? `${context.operation} input is invalid`
    : `${context.operation} input is invalid at ${firstIssue.path.join(".") || "<root>"}: ${firstIssue.message}`;

  return DiagnosticSchema.parse({
    code: ErrorCodeRegistry.schemaInvalid,
    severity: "error",
    operation: z.string().min(1).parse(context.operation),
    message,
    ...(context.location === undefined
      ? {}
      : { location: SourceLocationSchema.parse(context.location) }),
    ...(context.plugin === undefined
      ? {}
      : { plugin: PluginKeySchema.parse(context.plugin) }),
    details: { issues },
  });
}
