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
import {
  createScopeContext,
  toScopeReference,
  verifyTrustedProjectRoot,
  type ScopeContext,
} from "../domain/state/scope.js";
import { PluginKeySchema, type PluginKey } from "../domain/identity.js";
import { BoundaryError, ErrorCodeRegistry } from "../domain/errors.js";
import {
  validateConfigurationSubmission,
  ConfigurationValidationError,
  type ConfigurationSubmission,
  type ValidatedConfigurationSubmission,
} from "./configuration-validation.js";
import type { ConfigurationPathContext, ConfigurationPathPort } from "./ports/configuration-path.js";
import type { ConfigurationWriteIdPort } from "./ports/configuration-write-id.js";
import {
  PluginConfigurationReadResultSchema,
  PluginConfigurationRemoveResultSchema,
  PluginConfigurationReplaceResultSchema,
  type PluginConfigurationStore,
} from "./ports/plugin-configuration-store.js";
import {
  SecretStoreRemoveResultSchema,
  type SecretStore,
} from "./ports/secret-store.js";
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
  pathContext?: ConfigurationPathContext;
  confirmedSecretDeletion: true;
}>;

export type ConfigurationRemovalResult =
  | Readonly<{ kind: "removed" }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "stale"; removedLocators: readonly SecretLocator[] }>
  | Readonly<{
      kind: "partial-failure";
      code: "SECRET_REMOVAL_FAILED" | "CONFIGURATION_REMOVAL_FAILED";
      /** True when the authoritative document was already retired by CAS. */
      retired: boolean;
      removedLocators: readonly SecretLocator[];
      remainingLocators: readonly SecretLocator[];
    }>;

export class ConfigurationCleanupError extends Error {
  readonly code = "CONFIGURATION_CLEANUP_REQUIRED" as const;
  readonly operation: "save" | "remove";
  readonly cleanup: ConfigurationCleanup;
  readonly aborted: boolean;

  constructor(operation: "save" | "remove", cleanup: ConfigurationCleanup, aborted: boolean) {
    super("configuration operation requires credential cleanup");
    this.name = "ConfigurationCleanupError";
    this.operation = operation;
    this.cleanup = cleanup;
    this.aborted = aborted;
  }
}

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
    return PluginConfigurationReadResultSchema.parse(await configurations.read(ref, signal));
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
): Promise<SecretLocator[]> {
  // Cleanup is recovery work. Reusing an already-aborted caller signal would
  // turn a guaranteed cleanup attempt into an orphaning path.
  const cleanupSignal = new AbortController().signal;
  const failed: SecretLocator[] = [];
  for (const locator of locators) {
    try {
      const result = SecretStoreRemoveResultSchema.parse(await secrets.remove(locator, cleanupSignal));
      void result;
    } catch {
      failed.push(locator);
    }
  }
  return failed;
}

function cleanupFailure(
  operation: "save" | "remove",
  locators: readonly SecretLocator[],
  aborted: boolean,
): ConfigurationCleanupError | undefined {
  const cleanup = cleanupResult(locators);
  return cleanup === undefined ? undefined : new ConfigurationCleanupError(operation, cleanup, aborted);
}

function cleanupResult(locators: readonly SecretLocator[]): ConfigurationCleanup | undefined {
  return locators.length === 0 ? undefined : { code: "SECRET_CLEANUP_REQUIRED", locators: [...locators] };
}

function ensureWriteId(value: unknown): ReturnType<typeof ConfigurationWriteIdSchema.parse> {
  return ConfigurationWriteIdSchema.parse(value);
}

function ensureRequestIdentity(
  request: SavePluginConfigurationRequest,
  sha256: Sha256,
): ScopeContext {
  PluginConfigurationRefSchema.parse(request.configurationRef);
  PluginKeySchema.parse(request.plugin);
  const scope = createScopeContext(request.scope, sha256);
  const pathScope = createScopeContext(request.pathContext.scope, sha256);
  if (scope.kind !== pathScope.kind || (scope.kind === "project" && pathScope.kind === "project" && scope.projectKey !== pathScope.projectKey)) {
    throw new Error("configuration path scope does not match request");
  }
  if (scope.kind === "project") {
    verifyTrustedProjectRoot(request.pathContext.trustedProjectRoot, pathScope, sha256);
  }
  return scope;
}

function candidateDocument(
  request: SavePluginConfigurationRequest,
  scope: ScopeContext,
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
    scope: toScopeReference(scope),
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
  let verifiedScope: ScopeContext;
  try {
    verifiedScope = ensureRequestIdentity(request, dependencies.sha256);
  } catch {
    throw new ConfigurationValidationError("CONFIG_TYPE");
  }

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
    scope: verifiedScope,
    pathContext: { ...request.pathContext, scope: verifiedScope },
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
      scope: toScopeReference(verifiedScope),
      plugin: request.plugin,
      configurationRef: request.configurationRef,
      key: entry.key,
      writeId,
    }, dependencies.sha256),
    value: entry.value,
  }));
  const document = candidateDocument(
    request,
    verifiedScope,
    validated,
    fresh.map(({ key, locator }) => ({ key, locator })),
    dependencies.sha256,
  );
  const freshLocators = fresh.map((entry) => entry.locator);
  const currentLocators = new Set(current?.secrets.map((entry) => entry.locator) ?? []);
  if (freshLocators.some((locator) => currentLocators.has(locator))) {
    throw new Error("configuration write id reused an active secret locator");
  }
  const written: SecretLocator[] = [];

  for (const entry of fresh) {
    try {
      signal.throwIfAborted();
      // Track the attempt before calling the adapter: a provider may persist a
      // credential and then fail while reporting the operation result.
      written.push(entry.locator);
      await dependencies.secrets.put(entry.locator, entry.value, signal);
    } catch (error) {
      const failedCleanup = await cleanupLocators(dependencies.secrets, written);
      const cleanupError = cleanupFailure("save", failedCleanup, signal.aborted || isAbortRejection(error));
      if (cleanupError !== undefined) throw cleanupError;
      if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
      throw adapterFailure("putConfigurationSecret");
    }
  }

  let replacement: Awaited<ReturnType<PluginConfigurationStore["replace"]>>;
  try {
    signal.throwIfAborted();
    replacement = PluginConfigurationReplaceResultSchema.parse(await dependencies.configurations.replace({
      expectedRevision: current?.revision ?? null,
      document,
    }, signal));
  } catch (error) {
    const failedCleanup = await cleanupLocators(dependencies.secrets, freshLocators);
    const cleanupError = cleanupFailure("save", failedCleanup, signal.aborted || isAbortRejection(error));
    if (cleanupError !== undefined) throw cleanupError;
    if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
    throw adapterFailure("replacePluginConfiguration");
  }

  if (replacement.kind === "stale") {
    const failedCleanup = await cleanupLocators(dependencies.secrets, freshLocators);
    const cleanup = cleanupResult(failedCleanup);
    if (signal.aborted) {
      const cleanupError = cleanupFailure("save", failedCleanup, true);
      if (cleanupError !== undefined) throw cleanupError;
      return assertAbort(signal, signal.reason);
    }
    return cleanup === undefined
      ? { kind: "stale", actualRevision: replacement.actualRevision }
      : { kind: "stale-with-cleanup-required", actualRevision: replacement.actualRevision, cleanup };
  }

  const activeLocators = new Set(document.secrets.map((entry) => entry.locator));
  const superseded = (current?.secrets.map((entry) => entry.locator) ?? [])
    .filter((locator) => !activeLocators.has(locator));
  const failedCleanup = await cleanupLocators(dependencies.secrets, superseded);
  const cleanup = cleanupResult(failedCleanup);
  // Once CAS wins, the new document is authoritative. Never roll it back on
  // cancellation; return cleanup evidence for any old locators that remain.
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
  const verifiedScope = createScopeContext(request.scope, dependencies.sha256);
  if (verifiedScope.kind === "project") {
    const pathContext = request.pathContext;
    if (pathContext === undefined) throw new Error("project configuration removal requires a trusted root capability");
    const pathScope = createScopeContext(pathContext.scope, dependencies.sha256);
    if (pathScope.kind !== "project" || pathScope.projectKey !== verifiedScope.projectKey) {
      throw new Error("configuration path scope does not match request");
    }
    verifyTrustedProjectRoot(pathContext.trustedProjectRoot, pathScope, dependencies.sha256);
  }
  const verifiedRequest = { ...request, scope: verifiedScope };
  const currentRaw = await readConfiguration(dependencies.configurations, ref, signal);
  if (currentRaw.kind === "missing") return { kind: "missing" };

  let current: PluginConfigurationDocument;
  try {
    current = verifyCurrentDocument(currentRaw.document, verifiedRequest, dependencies.sha256);
  } catch {
    throw new Error("current configuration document is invalid");
  }

  // Retire the authoritative document first. A stale writer or a failed CAS
  // must leave both active references and their credentials untouched.
  let result: Awaited<ReturnType<PluginConfigurationStore["remove"]>>;
  try {
    result = PluginConfigurationRemoveResultSchema.parse(await dependencies.configurations.remove({
      ref,
      expectedRevision: current.revision,
      confirmedSecretDeletion: true,
    }, signal));
  } catch (error) {
    if (signal.aborted || isAbortRejection(error)) return assertAbort(signal, error);
    // A malformed/failed CAS response is not an authoritative removal result.
    // Keep the possible locator set in safe recovery details and do not delete
    // any credential until the retirement is positively acknowledged.
    throw adapterFailure("removePluginConfiguration", current.secrets.map((entry) => entry.locator));
  }
  if (result === "stale") return { kind: "stale", removedLocators: [] };
  if (result === "missing") return { kind: "missing" };

  // The document is now retired. Finish cleanup with a non-aborted recovery
  // signal so cancellation cannot strand credentials without evidence.
  const allLocators = current.secrets.map((entry) => entry.locator);
  const failedCleanup = await cleanupLocators(dependencies.secrets, allLocators);
  if (failedCleanup.length > 0) {
    const failed = new Set(failedCleanup);
    return {
      kind: "partial-failure",
      code: "SECRET_REMOVAL_FAILED",
      retired: true,
      removedLocators: allLocators.filter((locator) => !failed.has(locator)),
      remainingLocators: failedCleanup,
    };
  }
  return { kind: "removed" };
}

function assertNever(value: never): never {
  throw new Error(`unhandled configuration operation result: ${String(value)}`);
}
