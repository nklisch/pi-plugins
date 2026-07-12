import { z } from "zod";
import {
  MarketplaceConfigurationRecordSchema,
  HostConfigDocumentSchemaV1,
  type HostConfigDocumentV1,
} from "./config-state.js";
import {
  InstalledUserStateDocumentSchemaV1,
  MarketplaceSnapshotRecordSchema,
  createInstalledPluginRecord,
  createMarketplaceSnapshotRecord,
  type InstalledPluginRecord,
  type InstalledUserStateDocumentV1,
} from "./installed-state.js";
import {
  ProjectLocalStateDocumentSchemaV1,
  createProjectLocalStateDocument,
  type ProjectLocalStateDocumentV1,
} from "./project-state.js";
import {
  PortableProjectDeclarationSchemaV1,
  type PortableProjectDeclarationV1,
} from "./portable-project-declaration.js";
import {
  StatePointersDocumentSchemaV1,
  type StatePointersDocumentV1,
} from "./pointers.js";
import {
  TrustStateDocumentSchemaV1,
  createTrustStateRecord,
  type TrustStateDocumentV1,
  type TrustStateRecord,
} from "./trust-state.js";
import {
  StateDocumentKindSchema,
  getStateDocumentDefinition,
  type StateDocumentByKind,
  type StateDocumentFor,
  type StateDocumentKind,
} from "./registry.js";
import {
  ScopeContextSchema,
  ScopeReferenceSchema,
  createScopeContext,
  toScopeReference,
  type ScopeContext,
  type ScopeReference,
} from "./scope.js";
import {
  ContentDigestSchema,
  hashContent,
  type ContentDigest,
} from "../content-manifest.js";
import { JsonValueSchema, type JsonValue } from "../schema.js";
import { MarketplaceNameSchema, PluginKeySchema } from "../identity.js";
import { TrustSubjectRefSchema } from "./references.js";
import type { Sha256 } from "../source.js";
import { GenerationSchema, type Generation } from "./config-state.js";
import { migrateVersionedDocument, StateSchemaVersionSchema } from "./versioning.js";


/** Safe corruption metadata. It intentionally has no raw payload or cause. */
export const StateCorruptionCodeSchema = z.enum([
  "DOCUMENT_INVALID",
  "VERSION_UNSUPPORTED",
  "GENERATION_MISMATCH",
  "SCOPE_MISMATCH",
  "RECORD_INVALID",
  "RECORD_DUPLICATE",
  "DIGEST_MISMATCH",
]);
export type StateCorruptionCode = z.infer<typeof StateCorruptionCodeSchema>;

export const StateCorruptionSchema = z
  .object({
    document: StateDocumentKindSchema,
    scope: ScopeReferenceSchema,
    code: StateCorruptionCodeSchema,
    recordKey: z.string().min(1).optional(),
    schemaPath: z.string().min(1).optional(),
    message: z.string().min(1),
  })
  .strict()
  .readonly();
export type StateCorruption = z.infer<typeof StateCorruptionSchema>;

export type StateCodecContext = Readonly<{
  scope: ScopeContext;
  generation: Generation;
  sha256: Sha256;
  /** When present, verify the exact logical blob digest selected by a pointer. */
  expectedDigest?: ContentDigest;
}>;

export type DecodedDocument<T> = Readonly<{
  value: T;
  corruptions: readonly StateCorruption[];
}>;

/** Fatal enclosing-document failures never expose a partial value. */
export class StateCodecError extends Error {
  readonly corruption: StateCorruption;

  constructor(corruption: StateCorruption) {
    super(corruption.message);
    this.name = "StateCodecError";
    this.corruption = corruption;
  }
}

function assertSha256(sha256: Sha256): void {
  if (typeof sha256 !== "function") throw new TypeError("state codec requires a SHA-256 function");
}

function assertContext(context: StateCodecContext): {
  readonly scope: ScopeContext;
  readonly scopeReference: ScopeReference;
  readonly generation: StateCodecContext["generation"];
  readonly sha256: Sha256;
} {
  assertSha256(context.sha256);
  const scope = createScopeContext(ScopeContextSchema.parse(context.scope), context.sha256);
  const generation = GenerationSchema.parse(context.generation);
  return {
    scope,
    scopeReference: toScopeReference(scope),
    generation,
    sha256: context.sha256,
  };
}

const safeMessages: Record<StateCorruptionCode, string> = {
  DOCUMENT_INVALID: "state document failed schema validation",
  VERSION_UNSUPPORTED: "state document schema version is unsupported",
  GENERATION_MISMATCH: "state document generation is not the requested generation",
  SCOPE_MISMATCH: "state document scope is not the requested scope",
  RECORD_INVALID: "state record failed validation and was quarantined",
  RECORD_DUPLICATE: "duplicate state record was quarantined",
  DIGEST_MISMATCH: "state document digest does not match its pointer",
};

function corruption(
  document: StateDocumentKind,
  scope: ScopeReference,
  code: StateCorruptionCode,
  options: Readonly<{ recordKey?: string; schemaPath?: string }> = {},
): StateCorruption {
  return StateCorruptionSchema.parse({
    document,
    scope,
    code,
    ...(options.recordKey === undefined ? {} : { recordKey: options.recordKey }),
    ...(options.schemaPath === undefined ? {} : { schemaPath: options.schemaPath }),
    message: safeMessages[code],
  });
}

function fatal(
  document: StateDocumentKind,
  scope: ScopeReference,
  code: StateCorruptionCode,
  options?: Readonly<{ recordKey?: string; schemaPath?: string }>,
): never {
  throw new StateCodecError(corruption(document, scope, code, options));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readVersion(input: unknown): number | undefined {
  if (!isRecord(input)) return undefined;
  const result = StateSchemaVersionSchema.safeParse(input.schemaVersion);
  return result.success ? result.data : undefined;
}

function sameScope(left: ScopeReference, right: ScopeReference): boolean {
  if (left.kind === "user") return right.kind === "user";
  return right.kind === "project" && left.projectKey === right.projectKey;
}

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
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.prototype.hasOwnProperty.call(rightRecord, key) && sameJson(leftRecord[key], rightRecord[key]));
}

/** Record-tolerant roots let the codec quarantine individual bad children. */
const rootSchemas: { readonly [K in StateDocumentKind]: z.ZodTypeAny } = {
  hostConfig: z.object({ schemaVersion: z.literal(1), generation: GenerationSchema, records: z.array(z.unknown()) }).strict(),
  installedUser: z.object({ schemaVersion: z.literal(1), generation: GenerationSchema, marketplaces: z.array(z.unknown()), plugins: z.array(z.unknown()) }).strict(),
  trust: z.object({ schemaVersion: z.literal(1), generation: GenerationSchema, records: z.array(z.unknown()) }).strict(),
  projectLocal: z.object({ schemaVersion: z.literal(1), generation: GenerationSchema, projectKey: z.string(), identity: z.unknown(), declarationDigest: z.string(), marketplaces: z.array(z.unknown()), plugins: z.array(z.unknown()) }).strict(),
  portableProject: z.object({ schemaVersion: z.literal(1), marketplaces: z.array(z.unknown()), plugins: z.array(z.unknown()) }).strict(),
  pointers: z.object({ schemaVersion: z.literal(1), scope: z.unknown(), generation: GenerationSchema, previousGeneration: GenerationSchema.optional(), documents: z.array(z.unknown()) }).strict(),
};

function parseRoot<K extends StateDocumentKind>(
  kind: K,
  input: unknown,
  scope: ScopeReference,
): Record<string, unknown> {
  const definition = getStateDocumentDefinition(kind);
  const version = readVersion(input);
  if (version === undefined || version > definition.family.latestVersion || !definition.family.latestVersion) {
    fatal(kind, scope, version === undefined ? "DOCUMENT_INVALID" : "VERSION_UNSUPPORTED");
  }

  let candidate = input;
  if (version !== definition.family.latestVersion) {
    try {
      candidate = migrateVersionedDocument(definition.family, input);
    } catch {
      fatal(kind, scope, "VERSION_UNSUPPORTED");
    }
  }
  const parsed = rootSchemas[kind].safeParse(candidate);
  if (!parsed.success || !isRecord(parsed.data)) {
    fatal(kind, scope, "DOCUMENT_INVALID");
  }
  return parsed.data;
}

function validateEnclosingContext(
  kind: StateDocumentKind,
  root: Record<string, unknown>,
  context: ReturnType<typeof assertContext>,
): void {
  if (kind === "portableProject") return;

  if (kind === "pointers") {
    const pointerScope = root.scope;
    const scopeResult = ScopeReferenceSchema.safeParse(pointerScope);
    if (!scopeResult.success || !sameScope(scopeResult.data, context.scopeReference)) {
      fatal(kind, context.scopeReference, "SCOPE_MISMATCH");
    }
  }

  if (root.generation !== context.generation) {
    fatal(kind, context.scopeReference, "GENERATION_MISMATCH");
  }

  if (kind === "hostConfig" || kind === "installedUser" || kind === "trust") {
    if (context.scope.kind !== "user") fatal(kind, context.scopeReference, "SCOPE_MISMATCH");
  }

  if (kind === "projectLocal") {
    if (context.scope.kind !== "project") fatal(kind, context.scopeReference, "SCOPE_MISMATCH");
    if (root.projectKey !== context.scope.projectKey || !sameJson(root.identity, context.scope.identity)) {
      fatal(kind, context.scopeReference, "SCOPE_MISMATCH");
    }
  }
}

function candidateKey(
  kind: StateDocumentKind,
  candidate: unknown,
): string | undefined {
  if (!isRecord(candidate)) return undefined;
  if (kind === "hostConfig") {
    const value = candidate.marketplace;
    return typeof value === "string" && MarketplaceNameSchema.safeParse(value).success ? value : undefined;
  }
  if (kind === "trust") {
    const value = candidate.subject;
    return typeof value === "string" && TrustSubjectRefSchema.safeParse(value).success ? value : undefined;
  }
  const value = candidate.plugin;
  return typeof value === "string" && PluginKeySchema.safeParse(value).success ? value : undefined;
}

function decodeRecords<T>(
  kind: StateDocumentKind,
  input: unknown,
  scope: ScopeReference,
  decode: (candidate: unknown) => T,
  keyOf: (candidate: unknown) => string | undefined = (candidate) => candidateKey(kind, candidate),
): { readonly records: readonly T[]; readonly corruptions: readonly StateCorruption[] } {
  if (!Array.isArray(input)) fatal(kind, scope, "DOCUMENT_INVALID");
  const occurrences = new Map<string, number>();
  for (const candidate of input) {
    const key = keyOf(candidate);
    if (key !== undefined) occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  }

  const records: T[] = [];
  const corruptions: StateCorruption[] = [];
  for (const [index, candidate] of input.entries()) {
    const key = keyOf(candidate);
    if (key === undefined) {
      corruptions.push(corruption(kind, scope, "RECORD_INVALID", { schemaPath: `records[${index}]` }));
      continue;
    }
    if (occurrences.get(key)! > 1) {
      corruptions.push(corruption(kind, scope, "RECORD_DUPLICATE", { recordKey: key, schemaPath: `records[${index}]` }));
      continue;
    }
    try {
      records.push(decode(candidate));
    } catch {
      corruptions.push(corruption(kind, scope, "RECORD_INVALID", { recordKey: key, schemaPath: `records[${index}]` }));
    }
  }
  return { records, corruptions };
}

function marketplaceCandidateKey(candidate: unknown): string | undefined {
  if (!isRecord(candidate)) return undefined;
  const value = candidate.marketplace;
  return typeof value === "string" && MarketplaceNameSchema.safeParse(value).success ? value : undefined;
}

function decodeInstalledCollection(
  kind: "installedUser" | "projectLocal",
  input: unknown,
  scope: ScopeReference,
  sha256: Sha256,
): { readonly records: readonly InstalledPluginRecord[]; readonly corruptions: readonly StateCorruption[] } {
  return decodeRecords(kind, input, scope, (candidate) => {
    if (!isRecord(candidate)) throw new Error("record is not an object");
    return createInstalledPluginRecord({ ...candidate, scope }, sha256);
  });
}

function filterDependentInstalledRecords(
  kind: "installedUser" | "projectLocal",
  records: readonly InstalledPluginRecord[],
  marketplaces: readonly { readonly marketplace: string; readonly source: { readonly revision: string } }[],
  scope: ScopeReference,
  corruptions: readonly StateCorruption[],
): { readonly records: readonly InstalledPluginRecord[]; readonly corruptions: readonly StateCorruption[] } {
  const snapshots = new Map(marketplaces.map((record) => [record.marketplace, record.source.revision]));
  const kept: InstalledPluginRecord[] = [];
  const nextCorruptions = [...corruptions];
  for (const record of records) {
    const marketplace = record.plugin.slice(record.plugin.lastIndexOf("@") + 1);
    const snapshotRevision = snapshots.get(marketplace);
    const invalid = snapshotRevision === undefined || record.revisions.some((revision) =>
      revision.plugin.source.kind === "marketplace-path" && revision.plugin.source.marketplaceRevision !== snapshotRevision,
    );
    if (invalid) {
      nextCorruptions.push(corruption(kind, scope, "RECORD_INVALID", { recordKey: record.plugin, schemaPath: "plugins" }));
    } else {
      kept.push(record);
    }
  }
  return { records: kept, corruptions: nextCorruptions };
}

function decodeDocument<K extends StateDocumentKind>(
  kind: K,
  root: Record<string, unknown>,
  context: ReturnType<typeof assertContext>,
): DecodedDocument<StateDocumentFor<K>> {
  const scope = context.scopeReference;
  const sha256 = context.sha256;

  if (kind === "pointers") {
    return { value: StatePointersDocumentSchemaV1.parse(root) as StateDocumentFor<K>, corruptions: [] };
  }
  if (kind === "portableProject") {
    return { value: PortableProjectDeclarationSchemaV1.parse(root) as StateDocumentFor<K>, corruptions: [] };
  }
  if (kind === "hostConfig") {
    const decoded = decodeRecords(kind, root.records, scope, (candidate) => MarketplaceConfigurationRecordSchema.parse(candidate));
    const value = HostConfigDocumentSchemaV1.parse({ ...root, records: decoded.records });
    return { value: value as StateDocumentFor<K>, corruptions: decoded.corruptions };
  }
  if (kind === "trust") {
    const decoded = decodeRecords(kind, root.records, scope, (candidate) => createTrustStateRecord(candidate, sha256));
    const value = TrustStateDocumentSchemaV1.parse({ ...root, records: decoded.records });
    return { value: value as StateDocumentFor<K>, corruptions: decoded.corruptions };
  }

  const marketplaces = decodeRecords(kind, root.marketplaces, scope, (candidate) => createMarketplaceSnapshotRecord(candidate, sha256), marketplaceCandidateKey);
  const installed = decodeInstalledCollection(kind, root.plugins, scope, sha256);
  const filtered = filterDependentInstalledRecords(kind, installed.records, marketplaces.records, scope, [...marketplaces.corruptions, ...installed.corruptions]);
  if (kind === "installedUser") {
    const value = InstalledUserStateDocumentSchemaV1.parse({ ...root, marketplaces: marketplaces.records, plugins: filtered.records });
    return { value: value as StateDocumentFor<K>, corruptions: filtered.corruptions };
  }
  const value = ProjectLocalStateDocumentSchemaV1.parse({ ...root, marketplaces: marketplaces.records, plugins: filtered.records });
  return { value: value as StateDocumentFor<K>, corruptions: filtered.corruptions };
}

function canonicalStringCompare(left: string, right: string): number {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

function canonicalizeJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalizeJsonValue);
  if (value !== null && typeof value === "object") {
    const record = value as { readonly [key: string]: JsonValue };
    const sorted: Record<string, JsonValue> = {};
    for (const key of Object.keys(record).sort(canonicalStringCompare)) {
      sorted[key] = canonicalizeJsonValue(record[key]!);
    }
    return sorted;
  }
  return value;
}

function sortByKey<T>(values: readonly T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) => canonicalStringCompare(key(left), key(right)));
}

function deterministicDocument(kind: StateDocumentKind, input: JsonValue): JsonValue {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return input;
  const document = { ...(input as Record<string, JsonValue>) };
  if (kind === "hostConfig" && Array.isArray(document.records)) {
    document.records = sortByKey(document.records, (value) => String((value as Record<string, JsonValue>).marketplace));
  }
  if (kind === "trust" && Array.isArray(document.records)) {
    document.records = sortByKey(document.records, (value) => String((value as Record<string, JsonValue>).subject));
  }
  if (kind === "installedUser" || kind === "projectLocal") {
    if (Array.isArray(document.marketplaces)) {
      document.marketplaces = sortByKey(document.marketplaces, (value) => String((value as Record<string, JsonValue>).marketplace));
    }
    if (Array.isArray(document.plugins)) {
      document.plugins = sortByKey(document.plugins, (value) => String((value as Record<string, JsonValue>).plugin)).map((value) => {
        if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
        const plugin = { ...(value as Record<string, JsonValue>) };
        if (Array.isArray(plugin.revisions)) {
          plugin.revisions = sortByKey(plugin.revisions, (revision) => String((revision as Record<string, JsonValue>).revision));
        }
        return plugin;
      });
    }
  }
  if (kind === "portableProject") {
    if (Array.isArray(document.marketplaces)) {
      document.marketplaces = sortByKey(document.marketplaces, (value) => String((value as Record<string, JsonValue>).marketplace));
    }
    if (Array.isArray(document.plugins)) {
      document.plugins = sortByKey(document.plugins, (value) => String((value as Record<string, JsonValue>).plugin));
    }
  }
  if (kind === "pointers" && Array.isArray(document.documents)) {
    document.documents = sortByKey(document.documents, (value) => String((value as Record<string, JsonValue>).kind));
  }
  return canonicalizeJsonValue(document);
}

function validateForEncoding<K extends StateDocumentKind>(
  kind: K,
  input: StateDocumentFor<K>,
  context: ReturnType<typeof assertContext>,
): StateDocumentFor<K> {
  if (kind !== "portableProject" && isRecord(input) && "generation" in input && input.generation !== context.generation) {
    throw new Error("state document generation does not match the requested generation");
  }
  if (kind === "hostConfig") return HostConfigDocumentSchemaV1.parse(input) as StateDocumentFor<K>;
  if (kind === "trust") {
    const value = TrustStateDocumentSchemaV1.parse(input);
    const records = value.records.map((record) => createTrustStateRecord(record, context.sha256));
    return TrustStateDocumentSchemaV1.parse({ ...value, records }) as StateDocumentFor<K>;
  }
  if (kind === "installedUser") {
    if (context.scope.kind !== "user") throw new Error("installed user state requires user scope");
    const value = input as InstalledUserStateDocumentV1;
    return InstalledUserStateDocumentSchemaV1.parse({
      ...value,
      marketplaces: value.marketplaces.map((record) => createMarketplaceSnapshotRecord(record, context.sha256)),
      plugins: value.plugins.map((record) => createInstalledPluginRecord({ ...record, scope: context.scopeReference }, context.sha256)),
    }) as StateDocumentFor<K>;
  }
  if (kind === "projectLocal") {
    if (context.scope.kind !== "project") throw new Error("project-local state requires project scope");
    return createProjectLocalStateDocument(input, context.scope, context.sha256) as StateDocumentFor<K>;
  }
  if (kind === "portableProject") return PortableProjectDeclarationSchemaV1.parse(input) as StateDocumentFor<K>;
  const pointers = StatePointersDocumentSchemaV1.parse(input);
  if (!sameScope(pointers.scope, context.scopeReference) || pointers.generation !== context.generation) {
    throw new Error("state pointer scope or generation does not match the requested context");
  }
  return pointers as StateDocumentFor<K>;
}

function jsonBytes(value: JsonValue): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(canonicalizeJsonValue(value)));
}

/** Hash the canonical JSON representation used by pointer digests. */
export function hashStateDocument(input: JsonValue, sha256: Sha256): ContentDigest {
  assertSha256(sha256);
  return hashContent(jsonBytes(input), sha256);
}

export function decodeStateDocument<K extends StateDocumentKind>(
  kind: K,
  input: unknown,
  context: StateCodecContext,
): DecodedDocument<StateDocumentFor<K>> {
  const parsedKind = StateDocumentKindSchema.parse(kind) as K;
  const parsedContext = assertContext(context);
  const root = parseRoot(parsedKind, input, parsedContext.scopeReference);
  validateEnclosingContext(parsedKind, root, parsedContext);
  let decoded: DecodedDocument<StateDocumentFor<K>>;
  try {
    decoded = decodeDocument(parsedKind, root, parsedContext);
  } catch (error) {
    if (error instanceof StateCodecError) throw error;
    fatal(parsedKind, parsedContext.scopeReference, "DOCUMENT_INVALID");
  }
  if (context.expectedDigest !== undefined) {
    const encoded = encodeStateDocument(parsedKind, decoded.value, {
      scope: parsedContext.scope,
      generation: parsedContext.generation,
      sha256: parsedContext.sha256,
    });
    const actual = hashStateDocument(encoded, parsedContext.sha256);
    if (actual !== ContentDigestSchema.parse(context.expectedDigest)) {
      fatal(parsedKind, parsedContext.scopeReference, "DIGEST_MISMATCH");
    }
  }
  return decoded;
}

export function encodeStateDocument<K extends StateDocumentKind>(
  kind: K,
  input: StateDocumentFor<K>,
  context: StateCodecContext,
): JsonValue {
  const parsedKind = StateDocumentKindSchema.parse(kind) as K;
  const parsedContext = assertContext(context);
  const value = validateForEncoding(parsedKind, input, parsedContext);
  const json = JsonValueSchema.parse(value) as JsonValue;
  return deterministicDocument(parsedKind, json);
}

export type {
  ContentDigest,
  HostConfigDocumentV1,
  InstalledUserStateDocumentV1,
  ProjectLocalStateDocumentV1,
  PortableProjectDeclarationV1,
  StateDocumentByKind,
  StateDocumentFor,
  StateDocumentKind,
  StatePointersDocumentV1,
  TrustStateDocumentV1,
  TrustStateRecord,
};
