import { z } from "zod";
import { JsonValueSchema, nonEmptyReadonly } from "./schema.js";

export const NativeHostSchema = z.enum(["claude", "codex"]);
export type NativeHost = z.infer<typeof NativeHostSchema>;

export const SourceDocumentKindSchema = z.enum([
  "marketplace",
  "manifest",
  "hooks",
  "mcp",
  "skill",
  "convention",
]);
export type SourceDocumentKind = z.infer<typeof SourceDocumentKindSchema>;

export const SourceLocationSchema = z
  .object({
    host: NativeHostSchema,
    documentKind: SourceDocumentKindSchema,
    path: z.string().min(1),
    pointer: z.string().startsWith("/").optional(),
    line: z.number().int().positive().optional(),
    column: z.number().int().positive().optional(),
  })
  .readonly();
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const ProvenanceSchema = z
  .object({
    location: SourceLocationSchema,
    declaration: JsonValueSchema.optional(),
  })
  .readonly();
export type Provenance = z.infer<typeof ProvenanceSchema>;

const ProvenanceListSchema = z
  .array(ProvenanceSchema)
  .nonempty()
  .readonly();

/**
 * Wrap a normalized value with the source declarations that support it.
 * Provenance is intentionally non-empty: a normalized value without a source
 * cannot be audited or reconciled with a second foreign declaration.
 */
export function ClaimedSchema<T extends z.ZodTypeAny>(value: T) {
  return z
    .object({
      value,
      provenance: ProvenanceListSchema,
    })
    .strict();
}

export type Claimed<T> = Readonly<{
  value: T;
  provenance: readonly [Provenance, ...Provenance[]];
}>;

/** A typed conflict is distinguishable from malformed input at merge sites. */
export class ClaimConflictError<T = unknown> extends Error {
  readonly code = "CLAIM_CONFLICT" as const;
  readonly left: Claimed<T>;
  readonly right: Claimed<T>;

  constructor(left: Claimed<T>, right: Claimed<T>) {
    super("Cannot merge claims with different values");
    this.name = "ClaimConflictError";
    this.left = left;
    this.right = right;
  }
}

export function claim<T>(value: T, provenance: Provenance): Claimed<T> {
  const validProvenance = ProvenanceSchema.parse(provenance);
  return {
    value,
    provenance: [validProvenance],
  };
}

function validatedProvenance<T>(
  candidate: Claimed<T>,
  name: string,
): readonly [Provenance, ...Provenance[]] {
  if (candidate === null || typeof candidate !== "object") {
    throw new TypeError(`${name} must be a claimed value`);
  }

  // The value is generic and therefore cannot be schema-validated here. The
  // source list remains a strict boundary contract for every generic claim.
  return nonEmptyReadonly(ProvenanceListSchema.parse(candidate.provenance));
}

function sameSourceLocation(left: SourceLocation, right: SourceLocation): boolean {
  return (
    left.host === right.host &&
    left.documentKind === right.documentKind &&
    left.path === right.path &&
    left.pointer === right.pointer &&
    left.line === right.line &&
    left.column === right.column
  );
}

function defaultEquals(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => defaultEquals(value, right[index]));
  }

  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      defaultEquals(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
      ),
  );
}

export function mergeEquivalentClaims<T>(
  left: Claimed<T>,
  right: Claimed<T>,
  equals: (a: T, b: T) => boolean = defaultEquals as (a: T, b: T) => boolean,
): Claimed<T> {
  const leftProvenance = validatedProvenance(left, "left");
  const rightProvenance = validatedProvenance(right, "right");

  if (!equals(left.value, right.value)) {
    throw new ClaimConflictError(left, right);
  }

  const provenance: Provenance[] = [...leftProvenance];
  for (const candidate of rightProvenance) {
    if (!provenance.some((existing) => sameSourceLocation(existing.location, candidate.location))) {
      provenance.push(candidate);
    }
  }

  return {
    value: left.value,
    provenance: provenance as [Provenance, ...Provenance[]],
  };
}
