import { z } from "zod";
import {
  DiagnosticSchema,
  ErrorCodeRegistry,
  BoundaryError,
  type Diagnostic,
} from "../domain/errors.js";
import { claim, type Claimed, type NativeHost, type Provenance } from "../domain/provenance.js";
import {
  SourceLocationSchema,
  type SourceLocation,
} from "../domain/provenance-location.js";
import {
  MarketplaceAvailabilityRegistry,
  MarketplaceInstallationPolicySchema,
  type MarketplaceInstallationPolicy,
} from "../domain/marketplace.js";
import type { MarketplaceEntryDeclaration } from "../domain/marketplace.js";
import {
  JsonValueSchema,
  type JsonValue,
} from "../domain/schema.js";
import { type RetainedMetadata, RetainedMetadataSchema } from "../domain/components.js";
import { type PluginKey } from "../domain/identity.js";

export type MarketplaceReaderOptions = Readonly<{
  path?: string;
}>;

export const MarketplaceEntryDeclarationRegistry = {
  skills: { category: "component" },
  commands: { category: "component" },
  agents: { category: "component" },
  hooks: { category: "component" },
  mcpServers: { category: "component" },
  lspServers: { category: "component" },
  settings: { category: "runtime-metadata" },
  outputStyles: { category: "runtime-metadata" },
  dependencies: { category: "dependency" },
  plugins: { category: "dependency" },
} as const satisfies Readonly<Record<string, { readonly category: MarketplaceEntryDeclaration["category"] }>>;

export type MarketplaceEntryDeclarationField = keyof typeof MarketplaceEntryDeclarationRegistry;

const installationValues = {
  AVAILABLE: MarketplaceAvailabilityRegistry.available,
  INSTALLED_BY_DEFAULT: MarketplaceAvailabilityRegistry.installedByDefault,
  NOT_AVAILABLE: MarketplaceAvailabilityRegistry.notAvailable,
} as const;

/**
 * Encode an RFC 6901 JSON Pointer. The empty pointer is the document root;
 * `/` is a pointer to a property whose name is the empty string.
 */
export function jsonPointer(...segments: readonly (string | number)[]): string {
  if (segments.length === 0) {
    return "";
  }
  return `/${segments
    .map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
}

/**
 * Validate only the lexical form of a marketplace-relative path. Containment,
 * realpath, and symlink checks intentionally belong to source materialization.
 */
export function validateCatalogRelativePath(path: unknown, pointer: string): string {
  if (typeof path !== "string") {
    throw new TypeError(`Expected a relative catalog path at ${pointer}`);
  }
  if (
    path.length < 3 ||
    !path.startsWith("./") ||
    path === "./" ||
    path.includes("\\") ||
    path.includes("\u0000")
  ) {
    throw new TypeError(`Invalid relative catalog path at ${pointer}: ${path}`);
  }

  const segments = path.slice(2).split("/");
  if (
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..") ||
    /^[A-Za-z]:/.test(path.slice(2))
  ) {
    throw new TypeError(`Invalid relative catalog path at ${pointer}: ${path}`);
  }
  return path;
}

/**
 * Git subdirectory declarations are relative to a remote repository rather
 * than the marketplace checkout. The documented forms use both `plugin` and
 * `./plugin`, so both are accepted while traversal syntax is rejected.
 */
export function validateRelativeSubdirectoryPath(path: unknown, pointer: string): string {
  if (typeof path !== "string" || path.length === 0) {
    throw new TypeError(`Expected a relative repository path at ${pointer}`);
  }
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\u0000") ||
    /^[A-Za-z]:/.test(path)
  ) {
    throw new TypeError(`Invalid relative repository path at ${pointer}: ${path}`);
  }

  const candidate = path.startsWith("./")
    ? validateCatalogRelativePath(path, pointer).slice(2)
    : path;
  const segments = candidate.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new TypeError(`Invalid relative repository path at ${pointer}: ${path}`);
  }
  // `plugin` and `./plugin` identify the same repository subdirectory. Keep
  // the exact foreign spelling in the source claim's provenance, but expose
  // one canonical domain path so dual catalogs can reconcile it.
  return candidate;
}

export function joinCatalogRelativePath(root: string | undefined, path: string, pointer: string): string {
  const child = validateCatalogRelativePath(path, pointer);
  if (root === undefined) {
    return child;
  }
  const parent = validateCatalogRelativePath(root, `${pointer} (pluginRoot)`);
  return `./${parent.slice(2)}/${child.slice(2)}`;
}

export function documentPath(
  options: MarketplaceReaderOptions | undefined,
  fallback: string,
): string {
  if (options?.path === undefined) {
    return fallback;
  }
  if (typeof options.path !== "string" || options.path.length === 0) {
    throw new TypeError("MarketplaceReaderOptions.path must be a non-empty string");
  }
  return options.path;
}

export function isJsonRecord(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function own(
  value: { readonly [key: string]: JsonValue },
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function readJsonDocument(
  json: string,
  operation: string,
  nativeHost: NativeHost,
  path: string,
): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (cause) {
    throw new BoundaryError({
      code: ErrorCodeRegistry.marketplaceRootInvalid,
      operation,
      message: `Invalid JSON in ${path}`,
      location: sourceLocation(nativeHost, path, jsonPointer()),
      cause,
    });
  }
}

export function readRootRecord(
  input: unknown,
  operation: string,
  nativeHost: NativeHost,
  path: string,
): { readonly [key: string]: JsonValue } {
  let value: JsonValue;
  try {
    value = JsonValueSchema.parse(input);
  } catch (cause) {
    const details: JsonValue | undefined = cause instanceof z.ZodError
      ? {
          issues: cause.issues.map((issue) => ({
            code: issue.code,
            path: issue.path.map(String),
            message: issue.message,
          })),
        }
      : undefined;
    throw rootInvalid(operation, nativeHost, path, "Marketplace root must be a JSON object", details);
  }
  if (!isJsonRecord(value)) {
    throw rootInvalid(operation, nativeHost, path, "Marketplace root must be a JSON object");
  }
  return value;
}

export function sourceLocation(
  nativeHost: NativeHost,
  path: string,
  pointer: string,
): SourceLocation {
  return SourceLocationSchema.parse({
    host: nativeHost,
    documentKind: "marketplace",
    path,
    pointer,
  });
}

export function provenanceAt(
  nativeHost: NativeHost,
  path: string,
  pointer: string,
  declaration?: JsonValue,
): Provenance {
  const location = sourceLocation(nativeHost, path, pointer);
  return declaration === undefined ? { location } : { location, declaration };
}

export function claimedFrom<T>(value: T, provenance: readonly [Provenance, ...Provenance[]]): Claimed<T> {
  return { value, provenance };
}

export function claimAt<T>(
  value: T,
  nativeHost: NativeHost,
  path: string,
  pointer: string,
  declaration?: JsonValue,
): Claimed<T> {
  return claim(value, provenanceAt(nativeHost, path, pointer, declaration));
}

export function rootInvalid(
  operation: string,
  nativeHost: NativeHost,
  path: string,
  message: string,
  details?: JsonValue,
  cause?: unknown,
  pointer = jsonPointer(),
): BoundaryError {
  const input = {
    code: ErrorCodeRegistry.marketplaceRootInvalid,
    operation,
    message,
    location: sourceLocation(nativeHost, path, pointer),
    ...(details === undefined ? {} : { details }),
    ...(cause === undefined ? {} : { cause }),
  } as const;
  return new BoundaryError(input);
}

export type MarketplaceEntryErrorCode =
  | "ENTRY_INVALID"
  | "IDENTITY_INVALID"
  | "SOURCE_INVALID";

export class MarketplaceEntryError extends Error {
  readonly code: MarketplaceEntryErrorCode;
  readonly pointer: string;
  readonly plugin?: PluginKey;
  readonly details?: JsonValue;

  constructor(input: Readonly<{
    code: MarketplaceEntryErrorCode;
    pointer: string;
    message: string;
    plugin?: PluginKey;
    details?: JsonValue;
  }>) {
    super(input.message);
    this.name = "MarketplaceEntryError";
    this.code = input.code;
    this.pointer = input.pointer;
    if (input.plugin !== undefined) {
      this.plugin = input.plugin;
    }
    if (input.details !== undefined) {
      this.details = input.details;
    }
  }
}

export function entryError(
  code: MarketplaceEntryErrorCode,
  pointer: string,
  message: string,
  plugin?: PluginKey,
  details?: JsonValue,
): MarketplaceEntryError {
  return new MarketplaceEntryError({
    code,
    pointer,
    message,
    ...(plugin === undefined ? {} : { plugin }),
    ...(details === undefined ? {} : { details }),
  });
}

export function entryDiagnostic(
  error: MarketplaceEntryError,
  operation: string,
  nativeHost: NativeHost,
  path: string,
): Diagnostic {
  return DiagnosticSchema.parse({
    code: error.code,
    severity: "error",
    operation,
    message: error.message,
    location: sourceLocation(nativeHost, path, error.pointer),
    ...(error.plugin === undefined ? {} : { plugin: error.plugin }),
    ...(error.details === undefined ? {} : { details: error.details }),
  });
}

export function zodDetails(error: z.ZodError): JsonValue {
  return {
    issues: error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String),
      message: issue.message,
    })),
  };
}

export function requireString(
  value: JsonValue | undefined,
  field: string,
  pointer: string,
  options: Readonly<{ nonEmpty?: boolean }> = {},
): string {
  if (typeof value !== "string" || (options.nonEmpty === true && value.length === 0)) {
    throw entryError("ENTRY_INVALID", pointer, `${field} must be a${options.nonEmpty === true ? " non-empty" : ""} string`);
  }
  return value;
}

export function requireRecord(
  value: JsonValue | undefined,
  field: string,
  pointer: string,
): { readonly [key: string]: JsonValue } {
  if (value === undefined || !isJsonRecord(value)) {
    throw entryError("ENTRY_INVALID", pointer, `${field} must be an object`);
  }
  return value;
}

export function readPluginRoot(
  root: { readonly [key: string]: JsonValue },
  nativeHost: NativeHost,
  path: string,
  operation: string,
): { readonly root: string | undefined; readonly metadata: RetainedMetadata[] } {
  const metadataValue = root.metadata;
  if (metadataValue === undefined) {
    return { root: undefined, metadata: [] };
  }
  if (!isJsonRecord(metadataValue)) {
    throw rootInvalid(operation, nativeHost, path, "Marketplace root metadata must be an object", {
      pointer: jsonPointer("metadata"),
    }, undefined, jsonPointer("metadata"));
  }

  let pluginRoot: string | undefined;
  if (own(metadataValue, "pluginRoot")) {
    try {
      pluginRoot = validateCatalogRelativePath(
        metadataValue.pluginRoot,
        jsonPointer("metadata", "pluginRoot"),
      );
    } catch (cause) {
      throw rootInvalid(
        operation,
        nativeHost,
        path,
        "Marketplace metadata.pluginRoot is invalid",
        { pointer: jsonPointer("metadata", "pluginRoot") },
        cause,
        jsonPointer("metadata", "pluginRoot"),
      );
    }
  }

  const retained: RetainedMetadata[] = [];
  for (const [key, value] of Object.entries(metadataValue)) {
    if (key === "pluginRoot") {
      continue;
    }
    retained.push(RetainedMetadataSchema.parse({
      key: `${nativeHost}.metadata.${key}`,
      claimed: claimAt(value, nativeHost, path, jsonPointer("metadata", key), value),
    }));
  }
  return { root: pluginRoot, metadata: retained };
}

export function collectRootMetadata(
  root: { readonly [key: string]: JsonValue },
  nativeHost: NativeHost,
  path: string,
): RetainedMetadata[] {
  const retained: RetainedMetadata[] = [];
  for (const [key, value] of Object.entries(root)) {
    if (key === "name" || key === "plugins" || key === "metadata") {
      continue;
    }
    retained.push(RetainedMetadataSchema.parse({
      key: `${nativeHost}.${key}`,
      claimed: claimAt(value, nativeHost, path, jsonPointer(key), value),
    }));
  }
  return retained;
}

export function collectEntryMetadata(
  entry: { readonly [key: string]: JsonValue },
  nativeHost: NativeHost,
  path: string,
  entryPointer: string,
  excluded: ReadonlySet<string>,
): RetainedMetadata[] {
  const retained: RetainedMetadata[] = [];
  for (const [key, value] of Object.entries(entry)) {
    if (excluded.has(key)) {
      continue;
    }
    retained.push(RetainedMetadataSchema.parse({
      key: `${nativeHost}.${key}`,
      claimed: claimAt(value, nativeHost, path, `${entryPointer}/${jsonPointer(key).slice(1)}`, value),
    }));
  }
  return retained;
}

export function readInstallationPolicy(
  raw: JsonValue,
  nativeHost: NativeHost,
  path: string,
  pointer: string,
): MarketplaceInstallationPolicy {
  if (!isJsonRecord(raw)) {
    throw entryError("ENTRY_INVALID", pointer, "policy must be an object");
  }
  const keys = new Set(Object.keys(raw));
  for (const key of keys) {
    if (key !== "installation" && key !== "authentication") {
      throw entryError("ENTRY_INVALID", `${pointer}/${jsonPointer(key).slice(1)}`, `policy field ${key} is not supported`);
    }
  }

  const installation = raw.installation;
  if (typeof installation !== "string" || !(installation in installationValues)) {
    throw entryError("ENTRY_INVALID", `${pointer}/installation`, "policy.installation is unknown or missing");
  }
  const authentication = raw.authentication;
  if (authentication !== undefined && (typeof authentication !== "string" || authentication.length === 0)) {
    throw entryError("ENTRY_INVALID", `${pointer}/authentication`, "policy.authentication must be a non-empty string");
  }

  const result = {
    availability: claimAt(
      installationValues[installation as keyof typeof installationValues],
      nativeHost,
      path,
      `${pointer}/installation`,
      installation,
    ),
    ...(authentication === undefined
      ? {}
      : {
          authentication: claimAt(
            authentication,
            nativeHost,
            path,
            `${pointer}/authentication`,
            authentication,
          ),
        }),
    declaration: claimAt(raw, nativeHost, path, pointer, raw),
  };
  return MarketplaceInstallationPolicySchema.parse(result);
}

function declarationPointer(pointer: string, segment: string | number): string {
  return `${pointer}/${jsonPointer(segment).slice(1)}`;
}

function invalidDeclaration(pointer: string, message: string): never {
  throw entryError("ENTRY_INVALID", pointer, message);
}

function validateNonEmptyString(value: JsonValue, pointer: string, field: string): void {
  if (typeof value !== "string" || value.length === 0) {
    invalidDeclaration(pointer, `${field} must be a non-empty string`);
  }
}

function validateStringList(value: JsonValue, pointer: string, field: string): void {
  if (typeof value === "string") {
    validateNonEmptyString(value, pointer, field);
    return;
  }
  if (!Array.isArray(value)) {
    invalidDeclaration(pointer, `${field} must be a string or an array of strings`);
  }
  for (const [index, item] of value.entries()) {
    validateNonEmptyString(item, declarationPointer(pointer, index), `${field} item`);
  }
}

function validateNestedJson(
  value: JsonValue,
  pointer: string,
  field: string,
  allowNull: boolean,
): void {
  if (value === null) {
    if (allowNull) {
      return;
    }
    invalidDeclaration(pointer, `${field} cannot contain null`);
  }
  if (typeof value === "string") {
    validateNonEmptyString(value, pointer, field);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      validateNestedJson(item, declarationPointer(pointer, index), field, allowNull);
    }
    return;
  }
  if (!isJsonRecord(value)) {
    invalidDeclaration(pointer, `${field} must be valid JSON`);
  }
  for (const [key, item] of Object.entries(value)) {
    validateNestedJson(item, declarationPointer(pointer, key), field, allowNull);
  }
}

function validateRuntimeMap(value: JsonValue, pointer: string, field: string): void {
  if (typeof value === "string") {
    validateNonEmptyString(value, pointer, field);
    return;
  }
  if (!isJsonRecord(value)) {
    invalidDeclaration(pointer, `${field} must be a path string or an object map`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (key.length === 0) {
      invalidDeclaration(declarationPointer(pointer, key), `${field} contains an empty key`);
    }
    // Runtime maps may contain host-specific nested objects, but a null or
    // scalar event/server declaration is never a structurally valid entry.
    if (item === null || typeof item === "boolean" || typeof item === "number") {
      invalidDeclaration(declarationPointer(pointer, key), `${field} declaration must be an object, array, or path string`);
    }
    validateNestedJson(item, declarationPointer(pointer, key), field, false);
  }
}

function validateServerMap(value: JsonValue, pointer: string, field: string): void {
  if (typeof value === "string") {
    validateNonEmptyString(value, pointer, field);
    return;
  }
  if (!isJsonRecord(value)) {
    invalidDeclaration(pointer, `${field} must be a path string or an object map`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (key.length === 0) {
      invalidDeclaration(declarationPointer(pointer, key), `${field} contains an empty key`);
    }
    if (!(typeof item === "string" || isJsonRecord(item))) {
      invalidDeclaration(declarationPointer(pointer, key), `${field} server must be an object or path string`);
    }
    validateNestedJson(item, declarationPointer(pointer, key), field, false);
  }
}

function validateDependencyList(value: JsonValue, pointer: string, field: string): void {
  if (typeof value === "string") {
    validateNonEmptyString(value, pointer, field);
    return;
  }
  if (!Array.isArray(value)) {
    invalidDeclaration(pointer, `${field} must be a dependency string or an array`);
  }
  for (const [index, item] of value.entries()) {
    const itemPointer = declarationPointer(pointer, index);
    if (typeof item === "string") {
      validateNonEmptyString(item, itemPointer, `${field} item`);
    } else if (isJsonRecord(item)) {
      validateNestedJson(item, itemPointer, field, false);
    } else {
      invalidDeclaration(itemPointer, `${field} item must be a string or object`);
    }
  }
}

/**
 * Validate the structural shape of known declarations without interpreting
 * their host-specific meaning. A declaration is retained verbatim only after
 * its complete nested value has passed the field-specific boundary check.
 */
export function validateKnownDeclaration(
  field: MarketplaceEntryDeclarationField,
  value: JsonValue,
  pointer: string,
): void {
  JsonValueSchema.parse(value);
  switch (field) {
    case "skills":
    case "commands":
    case "agents":
    case "outputStyles":
      validateStringList(value, pointer, field);
      return;
    case "hooks":
      validateRuntimeMap(value, pointer, field);
      return;
    case "mcpServers":
    case "lspServers":
      validateServerMap(value, pointer, field);
      return;
    case "settings":
      if (!isJsonRecord(value)) {
        invalidDeclaration(pointer, `${field} must be an object`);
      }
      validateNestedJson(value, pointer, field, true);
      return;
    case "dependencies":
    case "plugins":
      validateDependencyList(value, pointer, field);
      return;
    default:
      throw new Error(`Unhandled marketplace declaration field: ${field}`);
  }
}

export function collectEntryDeclarations(
  entry: { readonly [key: string]: JsonValue },
  nativeHost: NativeHost,
  path: string,
  entryPointer: string,
): Array<{
  readonly nativeHost: NativeHost;
  readonly category: MarketplaceEntryDeclaration["category"];
  readonly field: MarketplaceEntryDeclarationField;
  readonly declaration: Claimed<JsonValue>;
}> {
  const declarations: Array<{
    readonly nativeHost: NativeHost;
    readonly category: MarketplaceEntryDeclaration["category"];
    readonly field: MarketplaceEntryDeclarationField;
    readonly declaration: Claimed<JsonValue>;
  }> = [];
  for (const field of Object.keys(MarketplaceEntryDeclarationRegistry) as MarketplaceEntryDeclarationField[]) {
    if (!own(entry, field)) {
      continue;
    }
    const value = entry[field];
    if (value === undefined) {
      throw entryError("ENTRY_INVALID", `${entryPointer}/${jsonPointer(field).slice(1)}`, `${field} is invalid`);
    }
    const pointer = `${entryPointer}/${jsonPointer(field).slice(1)}`;
    validateKnownDeclaration(field, value, pointer);
    declarations.push({
      nativeHost,
      category: MarketplaceEntryDeclarationRegistry[field].category,
      field,
      declaration: claimAt(value, nativeHost, path, pointer, value),
    });
  }
  return declarations;
}

export function entryPointerPath(entryPointer: string, field: string): string {
  return `${entryPointer}/${jsonPointer(field).slice(1)}`;
}
