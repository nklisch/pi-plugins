import { z } from "zod";
import {
  HostConfigDocumentSchema,
  HostConfigSchemaFamily,
  type HostConfigDocument,
} from "./config-state.js";
import {
  InstalledUserStateDocumentSchema,
  InstalledUserStateSchemaFamily,
  type InstalledUserStateDocument,
} from "./installed-state.js";
import {
  ProjectLocalStateDocumentSchema,
  ProjectLocalStateSchemaFamily,
  type ProjectLocalStateDocument,
} from "./project-state.js";
import {
  StatePointersDocumentSchemaV1,
  StatePointersSchemaFamily,
  type StatePointersDocumentV1,
} from "./pointers.js";
import {
  TrustStateDocumentSchemaV1,
  TrustStateSchemaFamily,
  type TrustStateDocumentV1,
} from "./trust-state.js";
import {
  PortableProjectDeclarationSchemaV1,
  PortableProjectSchemaFamily,
  type PortableProjectDeclarationV1,
} from "./portable-project-declaration.js";
import {
  StateDocumentKindSchema,
  StateDocumentKindRegistry,
  type StateDocumentKind,
} from "./pointers.js";

export type StateDocumentIsolation =
  | "marketplace-record"
  | "plugin-record"
  | "trust-record"
  | "none";

/**
 * The authoritative routing table for durable state. New document families
 * must be added here before they can be decoded or encoded; consumers do not
 * maintain a parallel switch for versions or migration ownership.
 */
export const StateDocumentRegistry = {
  hostConfig: {
    schema: HostConfigDocumentSchema,
    family: HostConfigSchemaFamily,
    isolation: "marketplace-record",
  },
  installedUser: {
    schema: InstalledUserStateDocumentSchema,
    family: InstalledUserStateSchemaFamily,
    isolation: "plugin-record",
  },
  trust: {
    schema: TrustStateDocumentSchemaV1,
    family: TrustStateSchemaFamily,
    isolation: "trust-record",
  },
  projectLocal: {
    schema: ProjectLocalStateDocumentSchema,
    family: ProjectLocalStateSchemaFamily,
    isolation: "plugin-record",
  },
  portableProject: {
    schema: PortableProjectDeclarationSchemaV1,
    family: PortableProjectSchemaFamily,
    isolation: "none",
  },
  pointers: {
    schema: StatePointersDocumentSchemaV1,
    family: StatePointersSchemaFamily,
    isolation: "none",
  },
} as const satisfies Record<
  StateDocumentKind,
  Readonly<{
    schema: z.ZodTypeAny;
    family: { readonly latestVersion: number };
    isolation: StateDocumentIsolation;
  }>
>;

export type RegisteredStateDocument = (typeof StateDocumentRegistry)[StateDocumentKind];

/**
 * The registry schema is the contract source. Inferring these outputs from the
 * registered schemas prevents a new family from acquiring a second,
 * hand-maintained persistence interface in this module.
 */
export type StateDocumentByKind<K extends StateDocumentKind = StateDocumentKind> = z.infer<
  (typeof StateDocumentRegistry)[K]["schema"]
>;
export type StateDocumentFor<K extends StateDocumentKind> = StateDocumentByKind<K>;

export function getStateDocumentDefinition(
  kind: unknown,
): RegisteredStateDocument {
  const parsed = StateDocumentKindSchema.parse(kind);
  return StateDocumentRegistry[parsed];
}

/** Stable registry order is useful for diagnostics and deterministic tooling. */
export function stateDocumentKinds(): readonly StateDocumentKind[] {
  return Object.keys(StateDocumentKindRegistry) as StateDocumentKind[];
}

export { StateDocumentKindRegistry, StateDocumentKindSchema } from "./pointers.js";

export type {
  HostConfigDocument,
  InstalledUserStateDocument,
  ProjectLocalStateDocument,
  PortableProjectDeclarationV1,
  StatePointersDocumentV1,
  TrustStateDocumentV1,
  StateDocumentKind,
};
