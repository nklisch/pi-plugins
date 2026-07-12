import {
  MarketplaceReadResultSchema,
  NormalizedMarketplaceEntrySchema,
  NormalizedMarketplaceSchema,
  type MarketplaceReadResult,
  type NormalizedMarketplaceEntry,
  type NormalizedMarketplace,
  type MarketplaceAuthority,
  type MarketplaceEntryDeclaration,
} from "../domain/marketplace.js";
import {
  BoundaryError,
  DomainContractError,
  DiagnosticSchema,
  ErrorCodeRegistry,
  type Diagnostic,
} from "../domain/errors.js";
import {
  MarketplaceNameSchema,
  type MarketplaceName,
  type PluginKey,
} from "../domain/identity.js";
import { serializePluginSource } from "../domain/source.js";
import {
  NativeHostSchema,
  type Claimed,
  type NativeHost,
  type Provenance,
  type SourceLocation,
} from "../domain/provenance.js";
import { JsonValueSchema, type JsonValue } from "../domain/schema.js";
import { type RetainedMetadata } from "../domain/components.js";

const OPERATION = "mergeMarketplaces";
const ENTRY_OPERATION = "mergeMarketplaceEntries";
const HOST_RANK: Readonly<Record<NativeHost, number>> = { claude: 0, codex: 1 };

export type MarketplaceCatalogInput = Readonly<{
  nativeHost: NativeHost;
  result: MarketplaceReadResult;
}>;

type ClaimLike<T> = Readonly<{
  value: T;
  provenance: readonly Provenance[];
}>;

/** A conflict is recoverable at catalog scope: only the overlapping entry is dropped. */
class MarketplaceClaimConflictError extends DomainContractError {
  constructor(input: Readonly<{
    field: string;
    plugin: string;
    location: SourceLocation;
    left: unknown;
    right: unknown;
  }>) {
    super({
      code: ErrorCodeRegistry.claimConflict,
      operation: ENTRY_OPERATION,
      message: `Conflicting marketplace entry claim for ${input.field}`,
      location: input.location,
      plugin: input.plugin as PluginKey,
      details: {
        field: input.field,
        left: claimSnapshot(input.left),
        right: claimSnapshot(input.right),
      },
    });
    this.name = "MarketplaceClaimConflictError";
  }
}

function isClaimed(value: unknown): value is ClaimLike<unknown> {
  return value !== null && typeof value === "object" &&
    "value" in value && "provenance" in value && Array.isArray(value.provenance);
}

function claimSnapshot(value: unknown): JsonValue {
  if (isClaimed(value)) {
    return {
      value: JsonValueSchema.parse(value.value),
      provenance: value.provenance as unknown as JsonValue,
    };
  }
  return JsonValueSchema.parse(value);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(record[key])}`,
  ).join(",")}}`;
}

function hostRank(host: NativeHost): number {
  return HOST_RANK[host];
}

function locationKey(location: SourceLocation): string {
  return [
    String(hostRank(location.host)).padStart(2, "0"),
    location.documentKind,
    location.path,
    location.pointer ?? "/",
    String(location.line ?? 0).padStart(10, "0"),
    String(location.column ?? 0).padStart(10, "0"),
  ].join("\u0000");
}

function provenanceKey(provenance: Provenance): string {
  return `${locationKey(provenance.location)}\u0000${stableJson(provenance.declaration)}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareProvenance(left: Provenance, right: Provenance): number {
  return compareText(provenanceKey(left), provenanceKey(right));
}

function firstProvenance<T>(claim: ClaimLike<T>): Provenance {
  return [...claim.provenance].sort(compareProvenance)[0] as Provenance;
}

function mergeProvenance<T>(
  left: ClaimLike<T>,
  right: ClaimLike<T>,
): readonly [Provenance, ...Provenance[]] {
  const values = [...left.provenance, ...right.provenance]
    .sort(compareProvenance);
  const unique: Provenance[] = [];
  for (const candidate of values) {
    if (!unique.some((existing) => locationKey(existing.location) === locationKey(candidate.location))) {
      unique.push(candidate);
    }
  }
  unique.sort(compareProvenance);
  return unique as [Provenance, ...Provenance[]];
}

function compareClaims(left: ClaimLike<unknown>, right: ClaimLike<unknown>): number {
  const locationComparison = compareProvenance(firstProvenance(left), firstProvenance(right));
  if (locationComparison !== 0) {
    return locationComparison;
  }
  return compareText(stableJson(left.value), stableJson(right.value));
}

function orderedClaims<T>(left: ClaimLike<T>, right: ClaimLike<T>): readonly [ClaimLike<T>, ClaimLike<T>] {
  return compareClaims(left as ClaimLike<unknown>, right as ClaimLike<unknown>) <= 0
    ? [left, right]
    : [right, left];
}

function conflict(
  field: string,
  left: unknown,
  right: unknown,
  plugin: string,
): never {
  const leftClaim = isClaimed(left) ? left : undefined;
  const rightClaim = isClaimed(right) ? right : undefined;
  const location = leftClaim === undefined
    ? firstProvenance(rightClaim as ClaimLike<unknown>).location
    : firstProvenance(leftClaim).location;
  throw new MarketplaceClaimConflictError({
    field,
    plugin,
    location,
    left,
    right,
  });
}

function mergeClaim<T>(
  field: string,
  left: ClaimLike<T>,
  right: ClaimLike<T>,
  plugin: string,
  equals: (left: T, right: T) => boolean = (a, b) => stableJson(a) === stableJson(b),
): Claimed<T> {
  const [first, second] = orderedClaims(left, right);
  if (!equals(first.value, second.value)) {
    conflict(field, first, second, plugin);
  }
  return {
    value: first.value,
    provenance: mergeProvenance(first, second),
  };
}

/** Keep both raw declarations while selecting the canonical host's normalized value. */
function mergeRawClaim<T>(left: ClaimLike<T>, right: ClaimLike<T>): Claimed<T> {
  const [first, second] = orderedClaims(left, right);
  return {
    value: first.value,
    provenance: mergeProvenance(first, second),
  };
}

function mergeOptionalClaim<T>(
  field: string,
  left: ClaimLike<T> | undefined,
  right: ClaimLike<T> | undefined,
  plugin: string,
  equals?: (left: T, right: T) => boolean,
): ClaimLike<T> | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return mergeClaim(field, left, right, plugin, equals);
}

function normalizePluginSource(
  claim: NormalizedMarketplaceEntry["source"],
): NormalizedMarketplaceEntry["source"] {
  if (claim.value.kind !== "git-subdir" || !claim.value.path.startsWith("./")) {
    return claim;
  }
  return {
    value: { ...claim.value, path: claim.value.path.slice(2) },
    provenance: claim.provenance,
  };
}

function mergePolicy(
  left: NonNullable<NormalizedMarketplaceEntry["policy"]>,
  right: NonNullable<NormalizedMarketplaceEntry["policy"]>,
  plugin: string,
): NonNullable<NormalizedMarketplaceEntry["policy"]> {
  const authentication = mergeOptionalClaim(
    "policy.authentication",
    left.authentication,
    right.authentication,
    plugin,
  );
  return {
    availability: mergeClaim("policy.availability", left.availability, right.availability, plugin),
    ...(authentication === undefined ? {} : { authentication }),
    // The normalized policy claims above determine compatibility. The raw
    // declaration is retained from both hosts for auditability even when
    // equivalent host documents use different object shapes or key order.
    declaration: mergeRawClaim(left.declaration, right.declaration),
  };
}

function mergeAuthority(
  left: MarketplaceAuthority,
  right: MarketplaceAuthority,
  plugin: string,
): MarketplaceAuthority {
  if (left.nativeHost !== right.nativeHost) {
    throw new TypeError("Cannot merge authorities from different native hosts");
  }
  const strict = mergeOptionalClaim("authority.strict", left.strict, right.strict, plugin);
  return {
    nativeHost: left.nativeHost,
    ...(strict === undefined ? {} : { strict }),
    manifest: mergeClaim("authority.manifest", left.manifest, right.manifest, plugin),
    catalogRuntime: mergeClaim("authority.catalogRuntime", left.catalogRuntime, right.catalogRuntime, plugin),
  };
}

function authorityOrder(authority: MarketplaceAuthority): string {
  const claim = authority.manifest;
  return `${String(hostRank(authority.nativeHost)).padStart(2, "0")}\u0000${locationKey(firstProvenance(claim).location)}`;
}

function mergeAuthorities(
  left: readonly MarketplaceAuthority[],
  right: readonly MarketplaceAuthority[],
  plugin: string,
): readonly MarketplaceAuthority[] {
  const byHost = new Map<NativeHost, MarketplaceAuthority>();
  for (const authority of [...left, ...right]) {
    const existing = byHost.get(authority.nativeHost);
    byHost.set(
      authority.nativeHost,
      existing === undefined ? authority : mergeAuthority(existing, authority, plugin),
    );
  }
  return [...byHost.values()].sort((a, b) =>
    compareText(authorityOrder(a), authorityOrder(b)));
}

function declarationKey(declaration: MarketplaceEntryDeclaration): string {
  return `${declaration.nativeHost}\u0000${declaration.category}\u0000${declaration.field}`;
}

function declarationOrder(declaration: MarketplaceEntryDeclaration): string {
  return [
    String(hostRank(declaration.nativeHost)).padStart(2, "0"),
    locationKey(firstProvenance(declaration.declaration).location),
    declaration.category,
    declaration.field,
  ].join("\u0000");
}

function mergeDeclarations(
  left: readonly MarketplaceEntryDeclaration[],
  right: readonly MarketplaceEntryDeclaration[],
  plugin: string,
): readonly MarketplaceEntryDeclaration[] {
  const byKey = new Map<string, MarketplaceEntryDeclaration>();
  for (const declaration of [...left, ...right]) {
    const key = declarationKey(declaration);
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, declaration);
      continue;
    }
    byKey.set(key, {
      nativeHost: declaration.nativeHost,
      category: declaration.category,
      field: declaration.field,
      declaration: mergeClaim(
        `declaration.${declaration.nativeHost}.${declaration.field}`,
        existing.declaration,
        declaration.declaration,
        plugin,
      ),
    });
  }
  return [...byKey.values()].sort((a, b) => compareText(declarationOrder(a), declarationOrder(b)));
}

function metadataOrder(metadata: RetainedMetadata): string {
  return [
    String(hostRank(firstProvenance(metadata.claimed).location.host)).padStart(2, "0"),
    locationKey(firstProvenance(metadata.claimed).location),
    metadata.key,
  ].join("\u0000");
}

function mergeMetadata(
  left: readonly RetainedMetadata[],
  right: readonly RetainedMetadata[],
  plugin: string,
): readonly RetainedMetadata[] {
  const byKey = new Map<string, RetainedMetadata>();
  for (const metadata of [...left, ...right]) {
    const existing = byKey.get(metadata.key);
    if (existing === undefined) {
      byKey.set(metadata.key, metadata);
      continue;
    }
    byKey.set(metadata.key, {
      key: metadata.key,
      claimed: mergeClaim(`metadata.${metadata.key}`, existing.claimed, metadata.claimed, plugin),
    });
  }
  return [...byKey.values()].sort((a, b) => compareText(metadataOrder(a), metadataOrder(b)));
}

function entryHost(entry: NormalizedMarketplaceEntry): NativeHost {
  return firstProvenance(entry.identity).location.host;
}

function entryOrder(entry: NormalizedMarketplaceEntry): string {
  return `${String(hostRank(entryHost(entry))).padStart(2, "0")}\u0000${stableJson(entry.identity.value)}\u0000${stableJson(entry.rawDeclaration.value)}`;
}

function normalizeEntryPair(
  left: NormalizedMarketplaceEntry,
  right: NormalizedMarketplaceEntry,
): readonly [NormalizedMarketplaceEntry, NormalizedMarketplaceEntry] {
  return compareText(entryOrder(left), entryOrder(right)) <= 0
    ? [left, right]
    : [right, left];
}

function assertIdentity(
  marketplaceName: MarketplaceName,
  left: NormalizedMarketplaceEntry,
  right: NormalizedMarketplaceEntry,
): void {
  if (left.identity.value.marketplaceName !== marketplaceName) {
    conflict("identity.marketplaceName", left.identity, right.identity, left.identity.value.key);
  }
  if (right.identity.value.marketplaceName !== marketplaceName) {
    conflict("identity.marketplaceName", left.identity, right.identity, right.identity.value.key);
  }
  if (left.identity.value.key !== right.identity.value.key ||
      left.identity.value.marketplaceEntryName !== right.identity.value.marketplaceEntryName) {
    conflict("identity", left.identity, right.identity, left.identity.value.key);
  }
}

/**
 * Reconcile one overlapping entry. This function intentionally throws a typed
 * claim conflict; the catalog-level function catches it and drops only this
 * entry while retaining its valid siblings.
 */
export function mergeMarketplaceEntries(
  marketplaceName: string,
  leftInput: NormalizedMarketplaceEntry,
  rightInput: NormalizedMarketplaceEntry,
): NormalizedMarketplaceEntry {
  const name = MarketplaceNameSchema.parse(marketplaceName) as MarketplaceName;
  const left = NormalizedMarketplaceEntrySchema.parse(leftInput) as NormalizedMarketplaceEntry;
  const right = NormalizedMarketplaceEntrySchema.parse(rightInput) as NormalizedMarketplaceEntry;
  const [first, second] = normalizeEntryPair(left, right);
  const plugin = first.identity.value.key;

  assertIdentity(name, first, second);

  const sourceLeft = normalizePluginSource(first.source);
  const sourceRight = normalizePluginSource(second.source);
  const canonicalLeft = serializePluginSource(sourceLeft.value);
  const canonicalRight = serializePluginSource(sourceRight.value);
  if (canonicalLeft !== canonicalRight) {
    conflict("source", sourceLeft, sourceRight, plugin);
  }

  const version = mergeOptionalClaim("version", first.version, second.version, plugin);
  const description = mergeOptionalClaim("description", first.description, second.description, plugin);
  const policy = first.policy === undefined
    ? second.policy
    : second.policy === undefined
      ? first.policy
      : mergePolicy(first.policy, second.policy, plugin);

  const merged = {
    identity: mergeClaim("identity", first.identity, second.identity, plugin),
    source: mergeClaim("source", sourceLeft, sourceRight, plugin, (a, b) =>
      serializePluginSource(a) === serializePluginSource(b),
    ),
    ...(version === undefined ? {} : { version }),
    ...(description === undefined ? {} : { description }),
    ...(policy === undefined ? {} : { policy }),
    authorities: mergeAuthorities(first.authorities, second.authorities, plugin),
    declarations: mergeDeclarations(first.declarations, second.declarations, plugin),
    metadata: mergeMetadata(first.metadata, second.metadata, plugin),
    rawDeclaration: mergeRawClaim(first.rawDeclaration, second.rawDeclaration),
  };
  return NormalizedMarketplaceEntrySchema.parse(merged);
}

function diagnosticOrder(diagnostic: Diagnostic): string {
  return [
    diagnostic.location === undefined ? "99" : String(hostRank(diagnostic.location.host)).padStart(2, "0"),
    diagnostic.location === undefined ? "" : locationKey(diagnostic.location),
    diagnostic.plugin ?? "",
    diagnostic.code,
    diagnostic.message,
    stableJson(diagnostic.details),
  ].join("\u0000");
}

function sourceDocumentOrder(document: NormalizedMarketplace["sourceDocuments"][number]): string {
  return `${locationKey(document.location)}\u0000${stableJson(document.declaration)}`;
}

function rootMetadataOrder(metadata: RetainedMetadata): string {
  return metadataOrder(metadata);
}

function rootConflict(
  left: NormalizedMarketplace,
  right: NormalizedMarketplace,
): never {
  const leftClaim = left.name;
  const rightClaim = right.name;
  throw new BoundaryError({
    code: ErrorCodeRegistry.marketplaceRootInvalid,
    operation: OPERATION,
    message: `Marketplace roots declare different names: ${leftClaim.value} and ${rightClaim.value}`,
    location: firstProvenance(leftClaim).location,
    details: {
      left: claimSnapshot(leftClaim),
      right: claimSnapshot(rightClaim),
    },
  });
}

function invalidInput(cause: unknown): never {
  throw new BoundaryError({
    code: ErrorCodeRegistry.marketplaceRootInvalid,
    operation: OPERATION,
    message: "Marketplace merger input is invalid",
    details: cause instanceof Error ? { message: cause.message } : { message: String(cause) },
    cause,
  });
}

function hostMismatch(
  nativeHost: NativeHost,
  subject: string,
  actualHost: unknown,
): never {
  throw new BoundaryError({
    code: ErrorCodeRegistry.marketplaceRootInvalid,
    operation: OPERATION,
    message: `Marketplace catalog input host does not match ${subject}`,
    details: {
      expectedHost: nativeHost,
      actualHost: actualHost === undefined ? null : String(actualHost),
      subject,
    },
  });
}

function assertProvenanceHost(
  nativeHost: NativeHost,
  provenance: readonly Provenance[],
  subject: string,
): void {
  for (const [index, claim] of provenance.entries()) {
    if (claim.location.host !== nativeHost) {
      hostMismatch(nativeHost, `${subject}.provenance[${index}]`, claim.location.host);
    }
  }
}

function assertCatalogHost(
  nativeHost: NativeHost,
  result: MarketplaceReadResult,
): void {
  for (const [index, document] of result.marketplace.sourceDocuments.entries()) {
    if (document.location.host !== nativeHost) {
      hostMismatch(nativeHost, `sourceDocuments[${index}]`, document.location.host);
    }
  }
  for (const [index, diagnostic] of result.diagnostics.entries()) {
    if (diagnostic.location === undefined) {
      hostMismatch(nativeHost, `diagnostics[${index}]`, "missing");
    }
    if (diagnostic.location.host !== nativeHost) {
      hostMismatch(nativeHost, `diagnostics[${index}]`, diagnostic.location.host);
    }
  }

  assertProvenanceHost(nativeHost, result.marketplace.name.provenance, "name");
  for (const [index, metadata] of result.marketplace.metadata.entries()) {
    assertProvenanceHost(nativeHost, metadata.claimed.provenance, `metadata[${index}]`);
  }
  for (const [index, entry] of result.marketplace.entries.entries()) {
    const subject = `entries[${index}]`;
    for (const authority of entry.authorities) {
      if (authority.nativeHost !== nativeHost) {
        hostMismatch(nativeHost, `${subject}.authorities`, authority.nativeHost);
      }
      if (authority.strict !== undefined) {
        assertProvenanceHost(nativeHost, authority.strict.provenance, `${subject}.authority.strict`);
      }
      assertProvenanceHost(nativeHost, authority.manifest.provenance, `${subject}.authority.manifest`);
      assertProvenanceHost(nativeHost, authority.catalogRuntime.provenance, `${subject}.authority.catalogRuntime`);
    }
    assertProvenanceHost(nativeHost, entry.identity.provenance, `${subject}.identity`);
    assertProvenanceHost(nativeHost, entry.source.provenance, `${subject}.source`);
    if (entry.version !== undefined) {
      assertProvenanceHost(nativeHost, entry.version.provenance, `${subject}.version`);
    }
    if (entry.description !== undefined) {
      assertProvenanceHost(nativeHost, entry.description.provenance, `${subject}.description`);
    }
    if (entry.policy !== undefined) {
      assertProvenanceHost(nativeHost, entry.policy.availability.provenance, `${subject}.policy.availability`);
      if (entry.policy.authentication !== undefined) {
        assertProvenanceHost(nativeHost, entry.policy.authentication.provenance, `${subject}.policy.authentication`);
      }
      assertProvenanceHost(nativeHost, entry.policy.declaration.provenance, `${subject}.policy.declaration`);
    }
    for (const [declarationIndex, declaration] of entry.declarations.entries()) {
      if (declaration.nativeHost !== nativeHost) {
        hostMismatch(nativeHost, `${subject}.declarations[${declarationIndex}]`, declaration.nativeHost);
      }
      assertProvenanceHost(nativeHost, declaration.declaration.provenance, `${subject}.declarations[${declarationIndex}]`);
    }
    for (const [metadataIndex, metadata] of entry.metadata.entries()) {
      assertProvenanceHost(nativeHost, metadata.claimed.provenance, `${subject}.metadata[${metadataIndex}]`);
    }
    assertProvenanceHost(nativeHost, entry.rawDeclaration.provenance, `${subject}.rawDeclaration`);
  }
}

function orderedInputs(inputs: readonly MarketplaceCatalogInput[]): readonly MarketplaceCatalogInput[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    invalidInput(new TypeError("mergeMarketplaces requires at least one catalog"));
  }
  const validated: MarketplaceCatalogInput[] = [];
  const hosts = new Set<NativeHost>();
  for (const input of inputs) {
    try {
      const nativeHost = NativeHostSchema.parse(input.nativeHost) as NativeHost;
      if (hosts.has(nativeHost)) {
        throw new BoundaryError({
          code: ErrorCodeRegistry.marketplaceRootInvalid,
          operation: OPERATION,
          message: `Duplicate ${nativeHost} marketplace catalog input`,
          details: { nativeHost },
        });
      }
      hosts.add(nativeHost);
      const result = MarketplaceReadResultSchema.parse(input.result) as MarketplaceReadResult;
      assertCatalogHost(nativeHost, result);
      validated.push({ nativeHost, result });
    } catch (cause) {
      if (cause instanceof BoundaryError) {
        throw cause;
      }
      invalidInput(cause);
    }
  }
  return validated.sort((left, right) => hostRank(left.nativeHost) - hostRank(right.nativeHost));
}

/**
 * Merge normalized foreign catalogs in a fixed host order. The merger has no
 * source acquisition or manifest semantics; it only reconciles catalog claims.
 */
export function mergeMarketplaces(
  inputs: readonly [MarketplaceCatalogInput, ...MarketplaceCatalogInput[]],
): MarketplaceReadResult {
  const catalogs = orderedInputs(inputs);
  const first = catalogs[0]?.result as MarketplaceReadResult | undefined;
  if (first === undefined) {
    invalidInput(new TypeError("mergeMarketplaces requires at least one catalog"));
  }
  const rootName = first.marketplace.name.value;
  for (const catalog of catalogs.slice(1)) {
    if (catalog.result.marketplace.name.value !== rootName) {
      rootConflict(first.marketplace, catalog.result.marketplace);
    }
  }

  const entries = new Map<string, NormalizedMarketplaceEntry>();
  const mergeDiagnostics: Diagnostic[] = [];
  for (const catalog of catalogs) {
    for (const entry of catalog.result.marketplace.entries) {
      const name = entry.identity.value.marketplaceEntryName;
      const existing = entries.get(name);
      if (existing === undefined) {
        entries.set(name, entry);
        continue;
      }
      try {
        entries.set(name, mergeMarketplaceEntries(rootName, existing, entry));
      } catch (cause) {
        if (cause instanceof MarketplaceClaimConflictError) {
          mergeDiagnostics.push(cause.toDiagnostic());
          entries.delete(name);
          continue;
        }
        throw cause;
      }
    }
  }

  const mergedMarketplace = NormalizedMarketplaceSchema.parse({
    name: mergeClaim(
      "name",
      first.marketplace.name,
      catalogs.length === 1
        ? first.marketplace.name
        : catalogs[1]?.result.marketplace.name ?? first.marketplace.name,
      OPERATION,
    ),
    entries: [...entries.values()].sort((left, right) =>
      compareText(left.identity.value.marketplaceEntryName, right.identity.value.marketplaceEntryName)),
    metadata: catalogs
      .flatMap((catalog) => catalog.result.marketplace.metadata)
      .sort((left, right) => compareText(rootMetadataOrder(left), rootMetadataOrder(right))),
    sourceDocuments: catalogs
      .flatMap((catalog) => catalog.result.marketplace.sourceDocuments)
      .sort((left, right) => compareText(sourceDocumentOrder(left), sourceDocumentOrder(right))),
  });

  const diagnostics = [
    ...catalogs.flatMap((catalog) => catalog.result.diagnostics).sort((a, b) =>
      compareText(diagnosticOrder(a), diagnosticOrder(b))),
    ...mergeDiagnostics.sort((a, b) => compareText(diagnosticOrder(a), diagnosticOrder(b))),
  ].map((diagnostic) => DiagnosticSchema.parse(diagnostic));
  return MarketplaceReadResultSchema.parse({
    marketplace: mergedMarketplace,
    diagnostics,
  });
}
