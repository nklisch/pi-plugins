import { z } from "zod";
import {
  HostConfigDocumentSchemaV1,
  HostConfigDocumentSchemaV2,
  HostConfigDocumentSchemaV3,
  HostConfigDocumentSchema,
  projectHostConfigV1ToV2,
  projectHostConfigV2ToV3,
  projectHostConfigV3ToV4,
  type HostConfigDocument,
} from "../domain/state/config-state.js";
import {
  InstalledUserStateDocumentSchemaV1,
  InstalledUserStateDocumentSchema,
  createInstalledUserStateDocumentV2,
  type InstalledUserStateDocument,
} from "../domain/state/installed-state.js";
import {
  ProjectLocalStateDocumentSchemaV1,
  ProjectLocalStateDocumentSchemaV2,
  ProjectLocalStateDocumentSchemaV3,
  ProjectLocalStateDocumentSchema,
  createProjectLocalStateDocumentV4,
  type ProjectLocalStateDocument,
} from "../domain/state/project-state.js";
import {
  type StatePointersDocumentV1,
} from "../domain/state/pointers.js";
import {
  TrustStateDocumentSchemaV1,
  createTrustStateRecord,
  type TrustStateDocumentV1,
} from "../domain/state/trust-state.js";
import {
  ProjectIdentitySchema,
  ProjectKeySchema,
  ScopeContextSchema,
  createScopeContext,
  type ScopeContext,
} from "../domain/state/scope.js";
import {
  GenerationSchema,
  type Generation,
} from "../domain/state/config-state.js";
import {
  StateCorruptionSchema,
  type StateCorruption,
} from "../domain/state/codec.js";
import type { Sha256 } from "../domain/source.js";

export type UserScopeContext = Extract<ScopeContext, { kind: "user" }>;
export type ProjectScopeContext = Extract<ScopeContext, { kind: "project" }>;

/** One coherent user generation selected by its pointer document. */
export type UserGenerationSnapshot = Readonly<{
  scope: UserScopeContext;
  generation: Generation;
  pointers: StatePointersDocumentV1;
  config: HostConfigDocument;
  installed: InstalledUserStateDocument;
  trust: TrustStateDocumentV1;
  corruptions: readonly StateCorruption[];
}>;

/** One coherent project generation selected by its pointer document. */
export type ProjectGenerationSnapshot = Readonly<{
  scope: ProjectScopeContext;
  generation: Generation;
  pointers: StatePointersDocumentV1;
  project: ProjectLocalStateDocument;
  corruptions: readonly StateCorruption[];
}>;

export type GenerationSnapshot = UserGenerationSnapshot | ProjectGenerationSnapshot;

const UserReplacementSchema = z
  .object({
    config: z.union([HostConfigDocumentSchema, HostConfigDocumentSchemaV3, HostConfigDocumentSchemaV2, HostConfigDocumentSchemaV1]).optional(),
    installed: z.union([InstalledUserStateDocumentSchema, InstalledUserStateDocumentSchemaV1]).optional(),
    trust: TrustStateDocumentSchemaV1.optional(),
  })
  .strict();

const ProjectReplacementSchema = z
  .object({
    project: z.union([ProjectLocalStateDocumentSchema, ProjectLocalStateDocumentSchemaV3, ProjectLocalStateDocumentSchemaV2, ProjectLocalStateDocumentSchemaV1]),
  })
  .strict();

/**
 * Untrusted structural input for a user mutation. Parsing this schema only
 * checks shape; it does not verify canonical evidence or produce a value that
 * a LifecycleStateStore may accept.
 */
export const UserStateMutationInputSchema = z
  .object({
    scope: z.object({ kind: z.literal("user") }).strict().readonly(),
    expectedGeneration: GenerationSchema,
    replace: UserReplacementSchema,
  })
  .strict()
  .readonly()
  .superRefine((mutation, context) => {
    const replacements = Object.keys(mutation.replace);
    if (replacements.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["replace"],
        message: "user state mutation must replace at least one document",
      });
    }
    for (const [name, document] of Object.entries(mutation.replace)) {
      if (document !== undefined && document.generation !== mutation.expectedGeneration) {
        context.addIssue({
          code: "custom",
          path: ["replace", name, "generation"],
          message: "replacement document generation must equal expectedGeneration",
        });
      }
    }
  });
export type UserStateMutationInput = z.infer<typeof UserStateMutationInputSchema>;

/** Untrusted structural input for a project mutation. */
export const ProjectStateMutationInputSchema = z
  .object({
    scope: z
      .object({
        kind: z.literal("project"),
        identity: ProjectIdentitySchema,
        projectKey: ProjectKeySchema,
      })
      .strict()
      .readonly(),
    expectedGeneration: GenerationSchema,
    replace: ProjectReplacementSchema,
  })
  .strict()
  .readonly()
  .superRefine((mutation, context) => {
    if (mutation.replace.project.generation !== mutation.expectedGeneration) {
      context.addIssue({
        code: "custom",
        path: ["replace", "project", "generation"],
        message: "replacement project generation must equal expectedGeneration",
      });
    }
    if (mutation.replace.project.projectKey !== mutation.scope.projectKey) {
      context.addIssue({
        code: "custom",
        path: ["replace", "project", "projectKey"],
        message: "replacement project does not belong to the mutation scope",
      });
    }
    if (!sameJson(mutation.replace.project.identity, mutation.scope.identity)) {
      context.addIssue({
        code: "custom",
        path: ["replace", "project", "identity"],
        message: "replacement project identity does not belong to the mutation scope",
      });
    }
  });
export type ProjectStateMutationInput = z.infer<typeof ProjectStateMutationInputSchema>;

/** The complete untrusted structural mutation contract. */
export const StateMutationInputSchema = z.union([
  UserStateMutationInputSchema,
  ProjectStateMutationInputSchema,
]);
export type StateMutationInput = z.infer<typeof StateMutationInputSchema>;
export type UnverifiedStateMutation = StateMutationInput;

/**
 * Compatibility names for the structural schemas. Their inferred output is
 * intentionally UnverifiedStateMutation, never the store-facing type.
 */
export const UserStateMutationSchema = UserStateMutationInputSchema;
export const ProjectStateMutationSchema = ProjectStateMutationInputSchema;
export const StateMutationSchema = StateMutationInputSchema;

/**
 * This compile-time symbol is deliberately module-private. TypeScript callers
 * cannot manufacture the store-facing type by parsing a public structural
 * schema. Runtime membership is held separately in a private WeakSet so an
 * ordinary caller cannot discover and copy a brand property.
 */
declare const verifiedStateMutationBrand: unique symbol;
const verifiedStateMutations = new WeakSet<object>();

export type VerifiedStateMutation = UnverifiedStateMutation & {
  readonly [verifiedStateMutationBrand]: true;
};

/** The mutation type accepted by the lifecycle state port. */
export type StateMutation = VerifiedStateMutation;

function deepFreeze(value: unknown, seen = new WeakSet<object>()): void {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return;
  const object = value as object;
  if (seen.has(object)) return;
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor?.value !== undefined) deepFreeze(descriptor.value, seen);
  }
  Object.freeze(object);
}

function brandVerifiedStateMutation(mutation: UnverifiedStateMutation): StateMutation {
  deepFreeze(mutation);
  verifiedStateMutations.add(mutation);
  return mutation as StateMutation;
}

/** Runtime guard for adapters and fakes at the untyped boundary. */
export function isVerifiedStateMutation(input: unknown): input is StateMutation {
  return typeof input === "object" && input !== null && verifiedStateMutations.has(input);
}

export type StateCommitResult =
  | Readonly<{ kind: "committed"; snapshot: GenerationSnapshot }>
  | Readonly<{
      kind: "stale-generation";
      expected: Generation;
      actual: Generation;
    }>;

export type StateLoadResult =
  | Readonly<{ ok: true; snapshot: GenerationSnapshot }>
  | Readonly<{
      ok: false;
      scope: UserScopeContext | ProjectScopeContext;
      corruptions: readonly [StateCorruption, ...StateCorruption[]];
    }>;

function sameJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((entry, index) => sameJson(entry, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(rightRecord, key) && sameJson(leftRecord[key], rightRecord[key]),
  );
}

/**
 * The only constructor for a store-facing mutation. Structural parsing is
 * deliberately performed first, then every evidence-bearing replacement is
 * rebuilt through its SHA-256-aware constructor before the opaque brand is
 * attached.
 */
export function parseStateMutation(input: unknown, sha256: Sha256): StateMutation {
  if (typeof sha256 !== "function") throw new TypeError("state mutation parsing requires a SHA-256 verifier");
  const mutation = StateMutationInputSchema.parse(input);
  if (mutation.scope.kind === "project") {
    const scope = createScopeContext(mutation.scope, sha256);
    if (scope.kind !== "project") throw new Error("project replacement requires project scope");
    if (!("project" in mutation.replace)) throw new Error("project scope requires a project replacement");
    return brandVerifiedStateMutation({
      ...mutation,
      scope,
      replace: {
        project: createProjectLocalStateDocumentV4(mutation.replace.project, scope, sha256),
      },
    });
  }
  const scope = createScopeContext(mutation.scope, sha256);
  if (scope.kind !== "user") throw new Error("user mutation requires user scope");
  if ("project" in mutation.replace) throw new Error("project replacement requires project scope");
  const replace = mutation.replace;
  return brandVerifiedStateMutation({
    ...mutation,
    scope,
    replace: {
      ...(replace.config === undefined ? {} : { config: HostConfigDocumentSchema.parse(
        replace.config.schemaVersion === 1
          ? projectHostConfigV3ToV4(projectHostConfigV2ToV3(HostConfigDocumentSchemaV2.parse(projectHostConfigV1ToV2(replace.config))))
          : replace.config.schemaVersion === 2
            ? projectHostConfigV3ToV4(projectHostConfigV2ToV3(replace.config))
            : replace.config.schemaVersion === 3
              ? projectHostConfigV3ToV4(replace.config)
              : replace.config,
      ) }),
      ...(replace.installed === undefined ? {} : { installed: createInstalledUserStateDocumentV2(replace.installed, sha256) }),
      ...(replace.trust === undefined ? {} : {
        trust: TrustStateDocumentSchemaV1.parse({
          ...replace.trust,
          records: replace.trust.records.map((record) => createTrustStateRecord(record, sha256)),
        }),
      }),
    },
  });
}

/** Explicit verifier spelling retained for adapter code; SHA-256 is mandatory. */
export const validateStateMutation = parseStateMutation;

/** Validate a failed load result without accepting an empty corruption list. */
export const StateLoadFailureSchema = z
  .object({
    ok: z.literal(false),
    scope: ScopeContextSchema,
    corruptions: z.array(StateCorruptionSchema).min(1).readonly(),
  })
  .strict()
  .readonly();

export type {
  Generation,
  HostConfigDocument,
  InstalledUserStateDocument,
  ProjectLocalStateDocument,
  StateCorruption,
  StatePointersDocumentV1,
  TrustStateDocumentV1,
};
