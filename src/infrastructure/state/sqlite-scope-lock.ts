import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { chmodSync, closeSync, lstatSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { BoundaryError } from "../../domain/errors.js";
import {
  ScopeReferenceSchema,
  type ScopeReference,
} from "../../domain/state/scope.js";
import type { ScopeLockLease, ScopeLockManager } from "../../application/ports/scope-lock.js";
import {
  ensurePrivateLockRoot,
  LOCAL_LOCK_DATABASE_MODE,
  verifyLocalFilesystemCapability,
} from "./local-lock-filesystem.js";

const PROTOCOL = "pi-plugin-host-scope-lock";
const PROTOCOL_VERSION = 1;
const PROTOCOL_TABLE = "scope_lock_protocol";
const ROOT_MARKER_NAME = ".scope-lock-root.identity";
const DATABASE_MARKER_SUFFIX = ".identity";
const DATABASE_INITIALIZATION_CLAIM_SUFFIX = ".initializing";
const ROOT_MARKER_PROTOCOL = "pi-plugin-host-scope-lock-root";
const DATABASE_MARKER_PROTOCOL = "pi-plugin-host-scope-lock-database";
const DEFAULT_RETRY_DELAY = Object.freeze({ minimum: 2, maximum: 25 });
const SQLITE_BUSY = 5;

export type SqliteScopeLockOptions = Readonly<{
  lockRoot: string;
  retryDelayMs: Readonly<{ minimum: number; maximum: number }>;
  random?: () => number;
  verifyLocalFilesystem?: (root: string) => Promise<void>;
}>;

type SqliteError = {
  readonly errcode?: unknown;
};

type SqliteRow = Record<string, unknown>;
type FileIdentity = Readonly<{ device: string; inode: string }>;
type RootIdentityMarker = Readonly<{
  protocol: typeof ROOT_MARKER_PROTOCOL;
  version: 1;
  identity: string;
}>;
type DatabaseIdentityMarker = Readonly<{
  protocol: typeof DATABASE_MARKER_PROTOCOL;
  version: 1;
  rootIdentity: string;
  database: string;
  state: "initializing" | "ready";
  identity?: FileIdentity;
}>;

class DatabaseInitializationInProgress extends Error {}

function assertSignal(signal: AbortSignal): void {
  if (
    signal === null ||
    typeof signal !== "object" ||
    typeof signal.addEventListener !== "function" ||
    typeof signal.removeEventListener !== "function" ||
    typeof signal.aborted !== "boolean"
  ) {
    throw new TypeError("scope lock acquisition requires an AbortSignal");
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason;
}

function isBusy(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as SqliteError).errcode === SQLITE_BUSY;
}

function adapterFailure(operation: string, cause: unknown): BoundaryError {
  return new BoundaryError({
    code: "ADAPTER_FAILED",
    operation,
    message: "local scope lock capability failed",
    cause,
  });
}

function cleanupCause(rollback: unknown, close: unknown): unknown {
  if (rollback !== undefined && close !== undefined) return { rollback, close };
  return rollback ?? close;
}

function validateRetryDelay(input: Readonly<{ minimum: number; maximum: number }>): Readonly<{ minimum: number; maximum: number }> {
  if (
    input === null ||
    typeof input !== "object" ||
    !Number.isSafeInteger(input.minimum) ||
    !Number.isSafeInteger(input.maximum) ||
    input.minimum < 0 ||
    input.maximum < input.minimum
  ) {
    throw new TypeError("scope lock retry delays must be ordered non-negative safe integers");
  }
  return { minimum: input.minimum, maximum: input.maximum };
}

function validateRandom(random: () => number): void {
  if (typeof random !== "function") throw new TypeError("scope lock jitter source must be a function");
}

function scopeDatabaseName(scope: ScopeReference): string {
  const value = ScopeReferenceSchema.parse(scope);
  if (value.kind === "user") return "user.sqlite";
  // Keep the domain's key grammar out of the adapter. URI escaping is injective
  // for the validated key and remains a legal filename on every supported OS.
  return `project-${encodeURIComponent(value.projectKey)}.sqlite`;
}

function databasePath(root: string, scope: ScopeReference): string {
  return join(root, scopeDatabaseName(scope));
}

function sameFileIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.device === right.device && left.inode === right.inode;
}

function regularFileIdentity(path: string): FileIdentity {
  const stats = lstatSync(path);
  if (stats.isSymbolicLink() || !stats.isFile()) throw new Error("scope lock identity path is not a regular file");
  return { device: String(stats.dev), inode: String(stats.ino) };
}

function parseRootIdentityMarker(input: unknown): RootIdentityMarker {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error("scope lock root identity marker is invalid");
  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).length !== 3 ||
    value.protocol !== ROOT_MARKER_PROTOCOL ||
    value.version !== 1 ||
    typeof value.identity !== "string" ||
    value.identity.length === 0
  ) throw new Error("scope lock root identity marker is invalid");
  return value as RootIdentityMarker;
}

function rootIdentityMarkerPath(root: string): string {
  return join(root, ROOT_MARKER_NAME);
}

function ensureRootIdentityMarker(root: string): string {
  const path = rootIdentityMarkerPath(root);
  let markerExists = false;
  try {
    regularFileIdentity(path);
    markerExists = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!markerExists) {
    const marker: RootIdentityMarker = {
      protocol: ROOT_MARKER_PROTOCOL,
      version: 1,
      identity: randomUUID(),
    };
    try {
      writeFileSync(path, `${JSON.stringify(marker)}\n`, { flag: "wx", mode: LOCAL_LOCK_DATABASE_MODE });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  chmodSync(path, LOCAL_LOCK_DATABASE_MODE);
  return parseRootIdentityMarker(JSON.parse(readFileSync(path, "utf8"))).identity;
}

function databaseIdentityMarkerPath(path: string): string {
  return `${path}${DATABASE_MARKER_SUFFIX}`;
}

function databaseInitializationClaimPath(path: string): string {
  return `${path}${DATABASE_INITIALIZATION_CLAIM_SUFFIX}`;
}

function parseDatabaseIdentityMarker(input: unknown): DatabaseIdentityMarker {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error("scope lock database identity marker is invalid");
  const value = input as Record<string, unknown>;
  if (
    (value.state !== "initializing" && value.state !== "ready") ||
    Object.keys(value).length !== (value.state === "ready" ? 6 : 5) ||
    value.protocol !== DATABASE_MARKER_PROTOCOL ||
    value.version !== 1 ||
    typeof value.rootIdentity !== "string" ||
    value.rootIdentity.length === 0 ||
    typeof value.database !== "string" ||
    value.database.length === 0
  ) throw new Error("scope lock database identity marker is invalid");
  if (value.state === "initializing") return {
    protocol: DATABASE_MARKER_PROTOCOL,
    version: 1,
    rootIdentity: value.rootIdentity,
    database: value.database,
    state: "initializing",
  };
  const identity = value.identity;
  if (identity === null || typeof identity !== "object" || Array.isArray(identity)) {
    throw new Error("scope lock database identity marker is invalid");
  }
  const fileIdentity = identity as Record<string, unknown>;
  if (
    Object.keys(fileIdentity).length !== 2 ||
    typeof fileIdentity.device !== "string" ||
    typeof fileIdentity.inode !== "string" ||
    fileIdentity.device.length === 0 ||
    fileIdentity.inode.length === 0
  ) throw new Error("scope lock database identity marker is invalid");
  return {
    protocol: DATABASE_MARKER_PROTOCOL,
    version: 1,
    rootIdentity: value.rootIdentity,
    database: value.database,
    state: "ready",
    identity: { device: fileIdentity.device, inode: fileIdentity.inode },
  };
}

function readDatabaseIdentityMarker(path: string): DatabaseIdentityMarker | undefined {
  const markerPath = databaseIdentityMarkerPath(path);
  try {
    regularFileIdentity(markerPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    try {
      regularFileIdentity(databaseInitializationClaimPath(path));
    } catch (claimError) {
      if ((claimError as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw claimError;
    }
    throw new DatabaseInitializationInProgress("scope lock database initialization is in progress");
  }
  chmodSync(markerPath, LOCAL_LOCK_DATABASE_MODE);
  return parseDatabaseIdentityMarker(JSON.parse(readFileSync(markerPath, "utf8")));
}

function validateDatabaseIdentity(
  root: string,
  rootIdentity: string,
  path: string,
  databaseName: string,
  marker: DatabaseIdentityMarker,
): FileIdentity {
  if (marker.state === "initializing") throw new DatabaseInitializationInProgress("scope lock database initialization is in progress");
  if (
    marker.rootIdentity !== rootIdentity ||
    marker.database !== databaseName ||
    basename(path) !== databaseName
  ) throw new Error("scope lock database identity marker does not match its path");
  regularFileIdentity(rootIdentityMarkerPath(root));
  if (parseRootIdentityMarker(JSON.parse(readFileSync(rootIdentityMarkerPath(root), "utf8"))).identity !== rootIdentity) {
    throw new Error("scope lock root identity marker changed");
  }
  const identity = regularFileIdentity(path);
  if (marker.identity === undefined || !sameFileIdentity(identity, marker.identity)) throw new Error("scope lock database path was replaced");
  return identity;
}

function validateProtocolSchema(database: DatabaseSync): void {
  const objects = database
    .prepare("SELECT name, type FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as SqliteRow[];
  if (objects.length !== 1 || objects[0]?.name !== PROTOCOL_TABLE || objects[0]?.type !== "table") {
    throw new Error("scope lock database contains an unexpected object");
  }

  const tableDefinition = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(PROTOCOL_TABLE) as SqliteRow | undefined;
  const expectedDefinition = `CREATE TABLE ${PROTOCOL_TABLE} (protocol TEXT PRIMARY KEY NOT NULL CHECK (protocol = '${PROTOCOL}'), version INTEGER NOT NULL CHECK (version = ${PROTOCOL_VERSION})) STRICT`;
  if (typeof tableDefinition?.sql !== "string" || tableDefinition.sql.replaceAll(/\s+/g, " ").trim() !== expectedDefinition) {
    throw new Error("scope lock protocol table definition is invalid");
  }

  const columns = database.prepare(`PRAGMA table_info(${PROTOCOL_TABLE})`).all() as SqliteRow[];
  const expected = [
    { name: "protocol", type: "TEXT", notnull: 1, pk: 1 },
    { name: "version", type: "INTEGER", notnull: 1, pk: 0 },
  ];
  if (
    columns.length !== expected.length ||
    columns.some((column, index) => {
      const wanted = expected[index];
      return wanted === undefined ||
        column.name !== wanted.name ||
        column.type !== wanted.type ||
        column.notnull !== wanted.notnull ||
        column.pk !== wanted.pk ||
        column.dflt_value !== null;
    })
  ) {
    throw new Error("scope lock protocol schema is invalid");
  }

  const rows = database.prepare(`SELECT protocol, version FROM ${PROTOCOL_TABLE}`).all() as SqliteRow[];
  if (
    rows.length !== 1 ||
    rows[0]?.protocol !== PROTOCOL ||
    rows[0]?.version !== PROTOCOL_VERSION
  ) {
    throw new Error("scope lock protocol version is invalid");
  }
}

function prepareDatabase(
  root: string,
  rootIdentity: string,
  path: string,
  databaseName: string,
): DatabaseSync {
  let marker = readDatabaseIdentityMarker(path);
  let created = false;
  let ownsInitialization = false;
  let existing = true;
  try {
    regularFileIdentity(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    existing = false;
  }

  if (marker === undefined) {
    if (existing) throw new Error("scope lock database identity marker is missing");
    const initializing: DatabaseIdentityMarker = {
      protocol: DATABASE_MARKER_PROTOCOL,
      version: 1,
      rootIdentity,
      database: databaseName,
      state: "initializing",
    };
    try {
      // Claim initialization with a separate atomically-created path. The
      // complete marker is then published by rename, so readers never parse a
      // partially written identity document.
      const claimPath = databaseInitializationClaimPath(path);
      const claim = openSync(claimPath, "wx", LOCAL_LOCK_DATABASE_MODE);
      closeSync(claim);
      const temporary = `${databaseIdentityMarkerPath(path)}.${randomUUID()}.tmp`;
      writeFileSync(temporary, `${JSON.stringify(initializing)}\n`, {
        flag: "wx",
        mode: LOCAL_LOCK_DATABASE_MODE,
      });
      renameSync(temporary, databaseIdentityMarkerPath(path));
      marker = initializing;
      ownsInitialization = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      marker = readDatabaseIdentityMarker(path);
      if (marker === undefined) throw new Error("scope lock database identity marker disappeared");
    }
  }

  if (marker.state === "initializing" && !ownsInitialization) {
    throw new DatabaseInitializationInProgress("scope lock database initialization is in progress");
  }
  if (marker.state === "ready" && !existing) {
    throw new Error("scope lock database is missing after initialization");
  }
  if (!existing) {
    let descriptor: number;
    try {
      descriptor = openSync(path, "wx", LOCAL_LOCK_DATABASE_MODE);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new DatabaseInitializationInProgress("scope lock database initialization is in progress");
      }
      throw error;
    }
    closeSync(descriptor);
    const identity = regularFileIdentity(path);
    const ready: DatabaseIdentityMarker = {
      protocol: DATABASE_MARKER_PROTOCOL,
      version: 1,
      rootIdentity,
      database: databaseName,
      state: "ready",
      identity,
    };
    marker = ready;
    created = true;
  }

  validateDatabaseIdentity(root, rootIdentity, path, databaseName, marker);
  const database = new DatabaseSync(path, {
    allowExtension: false,
    defensive: true,
    enableDoubleQuotedStringLiterals: false,
    enableForeignKeyConstraints: true,
    readOnly: false,
    timeout: 0,
  });
  try {
    database.enableLoadExtension(false);
    database.enableDefensive(true);
    const openedIdentity = validateDatabaseIdentity(root, rootIdentity, path, databaseName, marker);
    chmodSync(path, LOCAL_LOCK_DATABASE_MODE);
    if (process.platform !== "win32" && (lstatSync(path).mode & 0o777) !== LOCAL_LOCK_DATABASE_MODE) {
      throw new Error("scope lock database is not private");
    }
    database.exec("PRAGMA journal_mode = DELETE; PRAGMA locking_mode = NORMAL; PRAGMA foreign_keys = ON; PRAGMA trusted_schema = OFF;");
    if (created) {
      database.exec(`CREATE TABLE ${PROTOCOL_TABLE} (protocol TEXT PRIMARY KEY NOT NULL CHECK (protocol = '${PROTOCOL}'), version INTEGER NOT NULL CHECK (version = ${PROTOCOL_VERSION})) STRICT;`);
      database.exec(`INSERT INTO ${PROTOCOL_TABLE} (protocol, version) VALUES ('${PROTOCOL}', ${PROTOCOL_VERSION});`);
    }
    validateProtocolSchema(database);
    validateDatabaseIdentity(root, rootIdentity, path, databaseName, marker);
    if (marker.identity === undefined || !sameFileIdentity(openedIdentity, marker.identity)) throw new Error("scope lock database path was replaced during open");
    const journal = database.prepare("PRAGMA journal_mode").get() as SqliteRow | undefined;
    if (journal?.journal_mode !== "delete") throw new Error("scope lock database is not using rollback journal mode");
    if (created) {
      const temporary = `${databaseIdentityMarkerPath(path)}.${randomUUID()}.tmp`;
      try {
        writeFileSync(temporary, `${JSON.stringify(marker)}\n`, { flag: "wx", mode: LOCAL_LOCK_DATABASE_MODE });
        renameSync(temporary, databaseIdentityMarkerPath(path));
        unlinkSync(databaseInitializationClaimPath(path));
      } catch (error) {
        throw new Error("scope lock database identity marker could not be finalized", { cause: error });
      }
    }
    return database;
  } catch (error) {
    try {
      database.close();
    } catch (closeError) {
      throw new Error("scope lock database setup and cleanup failed", { cause: { error, closeError } });
    }
    throw error;
  }
}

async function closeDatabase(database: DatabaseSync): Promise<void> {
  if (!database.isOpen) return;
  database.close();
}

async function waitForRetry(
  delayMs: number,
  signal: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  await new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      timer = undefined;
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

class SqliteScopeLockLease implements ScopeLockLease {
  readonly scope: ScopeReference;
  private status: "held" | "released" | "uncertain" = "held";

  constructor(
    scope: ScopeReference,
    private readonly database: DatabaseSync,
    private readonly root: string,
    private readonly rootIdentity: string,
    private readonly path: string,
    private readonly databaseName: string,
    private readonly marker: DatabaseIdentityMarker,
  ) {
    this.scope = scope;
  }

  async assertOwned(signal: AbortSignal): Promise<void> {
    assertSignal(signal);
    throwIfAborted(signal);
    if (this.status !== "held" || !this.database.isOpen || !this.database.isTransaction) {
      throw adapterFailure("scope-lock.assert-owned", new Error("scope lock is no longer held"));
    }
    try {
      validateDatabaseIdentity(this.root, this.rootIdentity, this.path, this.databaseName, this.marker);
    } catch (error) {
      throw adapterFailure("scope-lock.assert-owned", error);
    }
  }

  async release(): Promise<void> {
    if (this.status === "released") return;
    let rollbackError: unknown;
    let closeError: unknown;
    try {
      if (this.database.isOpen && this.database.isTransaction) this.database.exec("ROLLBACK");
    } catch (error) {
      rollbackError = error;
    } finally {
      try {
        if (this.database.isOpen) this.database.close();
      } catch (error) {
        closeError = error;
      }
    }

    if (!this.database.isOpen) this.status = "released";
    else this.status = "uncertain";
    if (rollbackError !== undefined || closeError !== undefined) {
      throw adapterFailure("scope-lock.release", cleanupCause(rollbackError, closeError));
    }
  }
}

class SqliteScopeLockManager implements ScopeLockManager {
  constructor(
    private readonly root: string,
    private readonly rootIdentity: string,
    private readonly retryDelayMs: Readonly<{ minimum: number; maximum: number }>,
    private readonly random: () => number,
  ) {}

  async acquire(input: ScopeReference, signal: AbortSignal): Promise<ScopeLockLease> {
    assertSignal(signal);
    const scope = ScopeReferenceSchema.parse(input);
    const path = databasePath(this.root, scope);

    for (;;) {
      throwIfAborted(signal);
      let database: DatabaseSync | undefined;
      try {
        const databaseName = scopeDatabaseName(scope);
        database = prepareDatabase(this.root, this.rootIdentity, path, databaseName);
        database.exec("BEGIN IMMEDIATE");
        if (signal.aborted) {
          await closeDatabase(database);
          throw signal.reason;
        }
        const marker = readDatabaseIdentityMarker(path);
        if (marker === undefined) throw new Error("scope lock database identity marker disappeared");
        validateDatabaseIdentity(this.root, this.rootIdentity, path, databaseName, marker);
        return new SqliteScopeLockLease(scope, database, this.root, this.rootIdentity, path, databaseName, marker);
      } catch (error) {
        if (database !== undefined) {
          try {
            await closeDatabase(database);
          } catch (closeError) {
            throw adapterFailure("scope-lock.acquire", cleanupCause(error, closeError));
          }
        }
        if (signal.aborted) throw signal.reason;
        if (error instanceof DatabaseInitializationInProgress) {
          const delay = await this.retryDelay();
          await waitForRetry(delay, signal);
          continue;
        }
        if (!isBusy(error)) throw adapterFailure("scope-lock.acquire", error);
        const delay = await this.retryDelay();
        await waitForRetry(delay, signal);
      }
    }
  }

  private async retryDelay(): Promise<number> {
    let value: number;
    try {
      value = this.random();
    } catch (error) {
      throw adapterFailure("scope-lock.retry", error);
    }
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw adapterFailure("scope-lock.retry", new Error("invalid retry jitter"));
    }
    return Math.floor(this.retryDelayMs.minimum + value * (this.retryDelayMs.maximum - this.retryDelayMs.minimum));
  }
}

async function probeExclusion(root: string, rootIdentity: string): Promise<void> {
  const probeDirectory = await mkdtemp(join(root, ".scope-lock-probe-"));
  const path = join(probeDirectory, "probe.sqlite");
  let holder: DatabaseSync | undefined;
  let contender: DatabaseSync | undefined;
  let released: DatabaseSync | undefined;
  try {
    holder = prepareDatabase(root, rootIdentity, path, "probe.sqlite");
    holder.exec("BEGIN IMMEDIATE");
    try {
      contender = prepareDatabase(root, rootIdentity, path, "probe.sqlite");
      contender.exec("BEGIN IMMEDIATE");
      throw new Error("SQLite did not exclude a second writer");
    } catch (error) {
      if (!isBusy(error)) throw error;
    }
    if (contender?.isOpen) contender.close();
    contender = undefined;
    holder.exec("ROLLBACK");
    holder.close();
    holder = undefined;

    released = prepareDatabase(root, rootIdentity, path, "probe.sqlite");
    released.exec("BEGIN IMMEDIATE");
    released.exec("ROLLBACK");
    released.close();
    released = undefined;
  } finally {
    for (const database of [contender, holder, released]) {
      if (database?.isOpen) {
        try {
          database.close();
        } catch {
          // The probe is failing anyway; cleanup must not expose a native error.
        }
      }
    }
    await rm(probeDirectory, { recursive: true, force: true });
  }
}

/**
 * Create a scope lock manager after proving the configured root has the
 * capabilities this safety boundary needs. No process-local fallback exists.
 */
export async function createSqliteScopeLockManager(
  options: SqliteScopeLockOptions,
): Promise<ScopeLockManager> {
  if (options === null || typeof options !== "object") throw new TypeError("scope lock options are required");
  const retryDelayMs = validateRetryDelay(options.retryDelayMs ?? DEFAULT_RETRY_DELAY);
  const random = options.random ?? Math.random;
  validateRandom(random);
  const root = await ensurePrivateLockRoot(options.lockRoot).catch((error) => {
    throw adapterFailure("scope-lock.initialize", error);
  });
  try {
    const rootIdentity = ensureRootIdentityMarker(root);
    await (options.verifyLocalFilesystem ?? verifyLocalFilesystemCapability)(root);
    await probeExclusion(root, rootIdentity);
    return new SqliteScopeLockManager(root, rootIdentity, retryDelayMs, random);
  } catch (error) {
    if (error instanceof BoundaryError) throw error;
    throw adapterFailure("scope-lock.initialize", error);
  }
}

export { scopeDatabaseName };
