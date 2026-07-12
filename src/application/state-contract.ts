import { z } from "zod";
import {
  HostConfigDocumentSchemaV1,
  type HostConfigDocumentV1,
} from "../domain/state/config-state.js";
import {
  InstalledUserStateDocumentSchemaV1,
  createInstalledUserStateDocument,
  type InstalledUserStateDocumentV1,
} from "../domain/state/installed-state.js";
import {
  ProjectLocalStateDocumentSchemaV1,
  createProjectLocalStateDocument,
  type ProjectLocalStateDocumentV1,
} from "../domain/state/project-state.js";
import {
  StatePointersDocumentSchemaV1,
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
  config: HostConfigDocumentV1;
  installed: InstalledUserStateDocumentV1;
  trust: TrustStateDocumentV1;
  corruptions: readonly StateCorruption[];
}>;

/** One coherent project generation selected by its pointer document. */
export type ProjectGenerationSnapshot = Readonly<{
  scope: ProjectScopeContext;
  generation: Generation;
  pointers: StatePointersDocumentV1;
  project: ProjectLocalStateDocumentV1;
  corruptions: readonly StateCorruption[];
}>;

export type GenerationSnapshot = UserGenerationSnapshot | ProjectGenerationSnapshot;

const UserReplacementSchema = z
  .object({
    config: HostConfigDocumentSchemaV1.optional(),
    installed: InstalledUserStateDocumentSchemaV1.optional(),
    trust: TrustStateDocumentSchemaV1.optional(),
  })
  .strict();

const ProjectReplacementSchema = z
  .object({
    project: ProjectLocalStateDocumentSchemaV1,
  })
  .strict();

export const UserStateMutationSchema = z
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

export const ProjectStateMutationSchema = z
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

/** Schema-derived replacement contract. No next generation or pointer is accepted. */
export const StateMutationSchema = z.union([UserStateMutationSchema, ProjectStateMutationSchema]);
export type StateMutation = z.infer<typeof StateMutationSchema>;

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
 * Parse a mutation and, when supplied, re-verify canonical evidence before an
 * adapter writes it. The schema is the shape gate; the constructors are the
 * cross-field/digest gate.
 */
export function parseStateMutation(input: unknown, sha256?: Sha256): StateMutation {
  const mutation = StateMutationSchema.parse(input);
  if (sha256 === undefined) return mutation;
  const scope = ScopeContextSchema.parse(mutation.scope);
  if ("project" in mutation.replace) {
    if (scope.kind !== "project") throw new Error("project replacement requires project scope");
    return {
      ...mutation,
      replace: {
        project: createProjectLocalStateDocument(mutation.replace.project, scope, sha256),
      },
    } as StateMutation;
  }
  const replace = mutation.replace;
  return {
    ...mutation,
    replace: {
      ...(replace.config === undefined ? {} : { config: HostConfigDocumentSchemaV1.parse(replace.config) }),
      ...(replace.installed === undefined ? {} : { installed: createInstalledUserStateDocument(replace.installed, sha256) }),
      ...(replace.trust === undefined ? {} : {
        trust: TrustStateDocumentSchemaV1.parse({
          ...replace.trust,
          records: replace.trust.records.map((record) => createTrustStateRecord(record, sha256)),
        }),
      }),
    },
  } as StateMutation;
}

/** Explicit validation spelling for adapter implementations. */
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
  HostConfigDocumentV1,
  InstalledUserStateDocumentV1,
  ProjectLocalStateDocumentV1,
  StateCorruption,
  StatePointersDocumentV1,
  TrustStateDocumentV1,
};
