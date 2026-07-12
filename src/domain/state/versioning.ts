import { z } from "zod";

/** Every durable state family carries its own positive, safe integer version. */
export const StateSchemaVersionSchema = z.number().int().positive().safe();
export type StateSchemaVersion = z.infer<typeof StateSchemaVersionSchema>;

/** A migration is deliberately a pure-looking boundary: no ports are supplied. */
export type StateMigration = (input: unknown) => unknown;

/**
 * A version family owns all schemas and only adjacent migration edges for one
 * persisted document kind. Versioned state is JSON-shaped, but the migration
 * boundary remains unknown so each family can choose its own strict schema.
 */
export type VersionedSchemaFamily<T = unknown> = Readonly<{
  latestVersion: StateSchemaVersion;
  versions: ReadonlyMap<StateSchemaVersion, z.ZodTypeAny>;
  migrations: ReadonlyMap<StateSchemaVersion, StateMigration>;
  /** The latest schema's output type, retained for callers of migrateVersionedDocument. */
  readonly __output?: T;
}>;

function assertSchemaVersion(value: unknown, expected: number, label: string): void {
  if (
    value === null ||
    typeof value !== "object" ||
    !("schemaVersion" in value) ||
    (value as { readonly schemaVersion?: unknown }).schemaVersion !== expected
  ) {
    throw new Error(`${label} must contain schemaVersion ${expected}`);
  }
}

function assertVersionKey(value: unknown, label: string): asserts value is StateSchemaVersion {
  if (!StateSchemaVersionSchema.safeParse(value).success) {
    throw new Error(`${label} must be a positive safe integer version`);
  }
}

function assertSchema(value: unknown, label: string): asserts value is z.ZodTypeAny {
  if (
    value === null ||
    typeof value !== "object" ||
    typeof (value as { readonly parse?: unknown }).parse !== "function"
  ) {
    throw new Error(`${label} must be a Zod schema`);
  }
}

function requireMap<T>(value: unknown, label: string): ReadonlyMap<number, T> {
  if (!(value instanceof Map)) {
    throw new TypeError(`${label} must be a Map`);
  }
  return value;
}

function cloneForMigration(input: unknown): unknown {
  // structuredClone is a platform API, not a Node dependency. It protects
  // callers when a migration mutates a nested object before returning it.
  if (typeof structuredClone !== "function") {
    throw new Error("structuredClone is required for pure state migrations");
  }
  return structuredClone(input);
}

function parseDocument(
  schema: z.ZodTypeAny,
  input: unknown,
  version: number,
  label: string,
): unknown {
  const parsed = schema.parse(input);
  assertSchemaVersion(parsed, version, label);
  return parsed;
}

/**
 * Validate a version graph once, before any document is accepted. A family is
 * intentionally not allowed to infer missing versions or silently skip a hop:
 * that would make an old document's meaning depend on registry ordering.
 */
export function defineVersionedSchemaFamily<T = unknown>(
  input: VersionedSchemaFamily<T>,
): VersionedSchemaFamily<T> {
  if (input === null || typeof input !== "object") {
    throw new TypeError("versioned schema family must be an object");
  }

  const latestVersion = input.latestVersion;
  assertVersionKey(latestVersion, "latestVersion");

  const versionEntries = [...requireMap<z.ZodTypeAny>(input.versions, "versions").entries()];
  if (versionEntries.length === 0) {
    throw new Error("versioned schema family must define at least one schema");
  }

  const schemas = new Map<number, z.ZodTypeAny>();
  for (const [version, schema] of versionEntries) {
    assertVersionKey(version, "schema version");
    assertSchema(schema, `schema for version ${version}`);
    if (schemas.has(version)) {
      throw new Error(`duplicate schema version ${version}`);
    }
    schemas.set(version, schema);
  }

  const schemaVersions = [...schemas.keys()].sort((left, right) => left - right);
  if (schemaVersions.at(-1) !== latestVersion) {
    throw new Error("latestVersion must equal the highest registered schema version");
  }
  for (let version = 1; version <= latestVersion; version += 1) {
    if (!schemas.has(version)) {
      throw new Error(`schema version graph has a gap at version ${version}`);
    }
  }

  const migrationEntries = [
    ...requireMap<StateMigration>(input.migrations, "migrations").entries(),
  ];
  const migrations = new Map<number, StateMigration>();
  for (const [version, migration] of migrationEntries) {
    assertVersionKey(version, "migration source version");
    if (version >= latestVersion) {
      throw new Error(`migration from version ${version} has no adjacent target`);
    }
    if (typeof migration !== "function") {
      throw new Error(`migration from version ${version} must be a function`);
    }
    if (migrations.has(version)) {
      throw new Error(`duplicate migration from version ${version}`);
    }
    migrations.set(version, migration);
  }
  for (let version = 1; version < latestVersion; version += 1) {
    if (!migrations.has(version)) {
      throw new Error(`migration graph is missing adjacent edge ${version}->${version + 1}`);
    }
  }

  return Object.freeze({
    latestVersion,
    versions: schemas,
    migrations,
  });
}

/**
 * Migrate one document in memory. The caller's value is cloned before the
 * first schema parse, and each edge is followed and validated independently.
 */
export function migrateVersionedDocument<T>(
  family: VersionedSchemaFamily<T>,
  input: unknown,
): T {
  const parsedFamily = defineVersionedSchemaFamily(family);
  if (input === null || typeof input !== "object") {
    throw new Error("versioned document must be an object");
  }

  const rawVersion = (input as { readonly schemaVersion?: unknown }).schemaVersion;
  const versionResult = StateSchemaVersionSchema.safeParse(rawVersion);
  if (!versionResult.success) {
    throw new Error("versioned document schemaVersion must be a positive safe integer");
  }
  const version = versionResult.data;
  if (version > parsedFamily.latestVersion) {
    throw new Error(`versioned document schemaVersion ${version} is newer than supported ${parsedFamily.latestVersion}`);
  }
  if (!parsedFamily.versions.has(version)) {
    throw new Error(`versioned document schemaVersion ${version} is not supported`);
  }

  let current = parseDocument(
    parsedFamily.versions.get(version)!,
    cloneForMigration(input),
    version,
    `schema version ${version}`,
  );

  for (let currentVersion = version; currentVersion < parsedFamily.latestVersion; currentVersion += 1) {
    const migration = parsedFamily.migrations.get(currentVersion);
    if (migration === undefined) {
      // defineVersionedSchemaFamily already rejects this. Keep the assertion
      // here so a caller cannot subvert the contract by mutating a Map later.
      throw new Error(`migration graph is missing adjacent edge ${currentVersion}->${currentVersion + 1}`);
    }
    const migrated = migration(current);
    current = parseDocument(
      parsedFamily.versions.get(currentVersion + 1)!,
      migrated,
      currentVersion + 1,
      `migrated schema version ${currentVersion + 1}`,
    );
  }

  return current as T;
}
