import {
  createPluginConfigurationDocument,
  deriveSecretLocator,
  digestConfigurationDescriptors,
  verifyPluginConfigurationDocument,
  ConfigurationWriteIdSchema,
  type PluginConfigurationDocument,
  type SecretLocator,
} from "../domain/configured-values.js";
import type { ContentDigest } from "../domain/content-manifest.js";
import { PluginConfigurationRefSchema, type PluginConfigurationRef } from "../domain/state/references.js";
import { toScopeReference, type ScopeContext } from "../domain/state/scope.js";
import { PluginKeySchema, type PluginKey } from "../domain/identity.js";
import { BoundaryError, ErrorCodeRegistry } from "../domain/errors.js";
import {
  validateConfigurationSubmission,
  type ConfigurationSubmission,
  type ValidatedConfigurationSubmission,
} from "./configuration-validation.js";
import type { ConfigurationPathPort } from "./ports/configuration-path.js";
import type { ConfigurationWriteIdPort } from "./ports/configuration-write-id.js";
import type { PluginConfigurationStore } from "./ports/plugin-configuration-store.js";
import type { SecretStore } from "./ports/secret-store.js";
import type { Sha256 } from "../domain/source.js";

export type SavePluginConfigurationRequest = Omit<ConfigurationSubmission, "existing">;

export type ConfigurationCleanup = Readonly<{
  code: "SECRET_CLEANUP_REQUIRED";
  locators: readonly SecretLocator[];
}>;

export type ConfigurationSaveResult =
  | Readonly<{ kind: "stored"; document: PluginConfigurationDocument }>
  | Readonly<{
      kind: "stored-with-cleanup-required";
      document: PluginConfigurationDocument;
      cleanup: ConfigurationCleanup;
    }>
  | Readonly<{
      kind: "stale";
      actualRevision: ContentDigest | null;
    }>
  | Readonly<{
      kind: "stale-with-cleanup-required";
      actualRevision: ContentDigest | null;
      cleanup: ConfigurationCleanup;
    }>;

export type RemovePluginConfigurationRequest = Readonly<{
  configurationRef: PluginConfigurationRef;
  plugin: PluginKey;
  scope: ScopeContext;
  descriptors: ConfigurationSubmission["descriptors"];
  confirmedSecretDeletion: true;
}>;

export type ConfigurationRemovalResult =
  | Readonly<{ kind: "removed" }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "stale"; removedLocators: readonly SecretLocator[] }>
  | Readonly<{
      kind: "partial-failure";
      code: "SECRET_REMOVAL_FAILED" | "CONFIGURATION_REMOVAL_FAILED";
      removedLocators: readonly SecretLocator[];
      remainingLocators: readonly SecretLocator[];
    }>;

function isAbortRejection(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const candidate = error as { readonly name?: unknown; readonly code?: unknown };
  return candidate.name === "AbortError" || candidate.code === "ABORT_ERR";
}

function adapterFailure(operation: string, cleanup?: readonly SecretLocator[]): BoundaryError {
  return new BoundaryError({
    code: ErrorCodeRegistry.adapterFailed,
    operation,
    message: cleanup === undefined
      ? "configuration adapter operation failed"
      : "configuration adapter operation failed and cleanup is required",
    ...(cleanup === undefined ? {} : {
      details: { cleanupRequired: true, locators: [...cleanup] },
    }),
  });
}

function assertAbort(signal: AbortSignal, error: unknown): never {
  if (signal.aborted) throw signal.reason;
  if (isAbortRejection(error)) throw error;
  throw error;
}

async function readConfiguration(
  configurations: PluginConfigurationStore,
  ref: PluginConfigurationRef,
  signal: AbortSignal,
): Promise<Awaited<ReturnType<PluginConfigurationStore["read"]>>> {
  try {
    return await configurations.read(ref, signal);
  } catch (error) {
    if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
    throw adapterFailure("readPluginConfiguration");
  }
}

function sameScope(left: ScopeContext, right: PluginConfigurationDocument["scope"]): boolean {
  const reference = toScopeReference(left);
  return reference.kind === right.kind &&
    (reference.kind === "user" || (right.kind === "project" && reference.projectKey === right.projectKey));
}

function verifyCurrentDocument(
  document: PluginConfigurationDocument,
  request: Readonly<{ configurationRef: PluginConfigurationRef; plugin: PluginKey; scope: ScopeContext; descriptors: ConfigurationSubmission["descriptors"] }>,
  sha256: Sha256,
): PluginConfigurationDocument {
  const verified = verifyPluginConfigurationDocument(document, request.descriptors, sha256);
  if (verified.configurationRef !== request.configurationRef || verified.plugin !== request.plugin || !sameScope(request.scope, verified.scope)) {
    throw new Error("configuration document identity does not match request");
  }
  return verified;
}

async function cleanupLocators(
  secrets: SecretStore,
  locators: readonly SecretLocator[],
  signal: AbortSignal,
): Promise<SecretLocator[]> {
  const failed: SecretLocator[] = [];
  for (const locator of locators) {
    try {
      await secrets.remove(locator, signal);
    } catch {
      failed.push(locator);
    }
  }
  return failed;
}

function cleanupResult(locators: readonly SecretLocator[]): ConfigurationCleanup | undefined {
  return locators.length === 0 ? undefined : { code: "SECRET_CLEANUP_REQUIRED", locators: [...locators] };
}

function ensureWriteId(value: unknown): ReturnType<typeof ConfigurationWriteIdSchema.parse> {
  return ConfigurationWriteIdSchema.parse(value);
}

function ensureRequestIdentity(request: SavePluginConfigurationRequest): void {
  PluginConfigurationRefSchema.parse(request.configurationRef);
  PluginKeySchema.parse(request.plugin);
  if (request.pathContext.scope.kind !== request.scope.kind) throw new Error("configuration path scope does not match request");
}

function candidateDocument(
  request: SavePluginConfigurationRequest,
  validated: ValidatedConfigurationSubmission,
  fresh: readonly Readonly<{ key: string; locator: SecretLocator }>[],
  sha256: Sha256,
): PluginConfigurationDocument {
  const retained = validated.preservedSecrets.map((entry) => ({ key: entry.key, locator: entry.locator }));
  const secrets = [...retained, ...fresh].sort((left, right) => left.key.localeCompare(right.key));
  const document = createPluginConfigurationDocument({
    schemaVersion: 1,
    configurationRef: request.configurationRef,
    plugin: request.plugin,
    scope: toScopeReference(request.scope),
    descriptorDigest: digestConfigurationDescriptors(request.descriptors, sha256),
    values: validated.values,
    secrets,
  }, sha256);
  return verifyPluginConfigurationDocument(document, request.descriptors, sha256);
}

/** Save a complete non-sensitive document and its fresh secret locators with CAS. */
export async function savePluginConfiguration(
  request: SavePluginConfigurationRequest,
  dependencies: Readonly<{
    configurations: PluginConfigurationStore;
    secrets: SecretStore;
    paths: ConfigurationPathPort;
    writeIds: ConfigurationWriteIdPort;
    sha256: Sha256;
  }>,
  signal: AbortSignal,
): Promise<ConfigurationSaveResult> {
  signal.throwIfAborted();
  ensureRequestIdentity(request);

  const currentRaw = await readConfiguration(dependencies.configurations, request.configurationRef, signal);
  let current: PluginConfigurationDocument | undefined;
  if (currentRaw.kind === "found") {
    try {
      current = verifyCurrentDocument(currentRaw.document, request, dependencies.sha256);
    } catch {
      throw new Error("current configuration document is invalid");
    }
  }

  const validated = await validateConfigurationSubmission({
    ...request,
    ...(current === undefined ? {} : { existing: current }),
  }, dependencies.paths, signal);
  signal.throwIfAborted();

  let writeId: ReturnType<typeof ConfigurationWriteIdSchema.parse>;
  try {
    writeId = ensureWriteId(await dependencies.writeIds.create(signal));
  } catch (error) {
    if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
    throw adapterFailure("createConfigurationWriteId");
  }

  const fresh = validated.secrets.map((entry) => ({
    key: entry.key,
    locator: deriveSecretLocator({
      scope: toScopeReference(request.scope),
      plugin: request.plugin,
      configurationRef: request.configurationRef,
      key: entry.key,
      writeId,
    }, dependencies.sha256),
    value: entry.value,
  }));
  const document = candidateDocument(
    request,
    validated,
    fresh.map(({ key, locator }) => ({ key, locator })),
    dependencies.sha256,
  );
  const freshLocators = fresh.map((entry) => entry.locator);
  const written: SecretLocator[] = [];

  for (const entry of fresh) {
    signal.throwIfAborted();
    try {
      await dependencies.secrets.put(entry.locator, entry.value, signal);
      written.push(entry.locator);
    } catch (error) {
      const failedCleanup = await cleanupLocators(dependencies.secrets, written, signal);
      if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
      throw adapterFailure("putConfigurationSecret", failedCleanup);
    }
  }

  let replacement: Awaited<ReturnType<PluginConfigurationStore["replace"]>>;
  try {
    replacement = await dependencies.configurations.replace({
      expectedRevision: current?.revision ?? null,
      document,
    }, signal);
  } catch (error) {
    const failedCleanup = await cleanupLocators(dependencies.secrets, freshLocators, signal);
    if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
    throw adapterFailure("replacePluginConfiguration", failedCleanup);
  }

  if (replacement.kind === "stale") {
    const failedCleanup = await cleanupLocators(dependencies.secrets, freshLocators, signal);
    const cleanup = cleanupResult(failedCleanup);
    return cleanup === undefined
      ? { kind: "stale", actualRevision: replacement.actualRevision }
      : { kind: "stale-with-cleanup-required", actualRevision: replacement.actualRevision, cleanup };
  }

  const activeLocators = new Set(document.secrets.map((entry) => entry.locator));
  const superseded = (current?.secrets.map((entry) => entry.locator) ?? [])
    .filter((locator) => !activeLocators.has(locator));
  const failedCleanup = await cleanupLocators(dependencies.secrets, superseded, signal);
  const cleanup = cleanupResult(failedCleanup);
  return cleanup === undefined
    ? { kind: "stored", document }
    : { kind: "stored-with-cleanup-required", document, cleanup };
}

/** Explicitly confirmed removal; disable has no path to this service. */
export async function removePluginConfiguration(
  request: RemovePluginConfigurationRequest,
  dependencies: Readonly<{
    configurations: PluginConfigurationStore;
    secrets: SecretStore;
    sha256: Sha256;
  }>,
  signal: AbortSignal,
): Promise<ConfigurationRemovalResult> {
  if (request.confirmedSecretDeletion !== true) throw new TypeError("secret deletion requires explicit confirmation");
  signal.throwIfAborted();
  const ref = PluginConfigurationRefSchema.parse(request.configurationRef);
  const currentRaw = await readConfiguration(dependencies.configurations, ref, signal);
  if (currentRaw.kind === "missing") return { kind: "missing" };

  let current: PluginConfigurationDocument;
  try {
    current = verifyCurrentDocument(currentRaw.document, request, dependencies.sha256);
  } catch {
    throw new Error("current configuration document is invalid");
  }
  const removed: SecretLocator[] = [];
  for (const entry of current.secrets) {
    try {
      await dependencies.secrets.remove(entry.locator, signal);
      removed.push(entry.locator);
    } catch (error) {
      if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
      return {
        kind: "partial-failure",
        code: "SECRET_REMOVAL_FAILED",
        removedLocators: removed,
        remainingLocators: current.secrets.map((candidate) => candidate.locator).filter((locator) => !removed.includes(locator)),
      };
    }
  }

  let result: Awaited<ReturnType<PluginConfigurationStore["remove"]>>;
  try {
    result = await dependencies.configurations.remove({
      ref,
      expectedRevision: current.revision,
      confirmedSecretDeletion: true,
    }, signal);
  } catch (error) {
    if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
    return {
      kind: "partial-failure",
      code: "CONFIGURATION_REMOVAL_FAILED",
      removedLocators: removed,
      remainingLocators: [],
    };
  }
  switch (result) {
    case "removed": return { kind: "removed" };
    case "missing": return { kind: "missing" };
    case "stale": return { kind: "stale", removedLocators: removed };
    default: return assertNever(result);
  }
}

function assertNever(value: never): never {
  throw new Error(`unhandled configuration operation result: ${String(value)}`);
}
