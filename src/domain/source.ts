import { z } from "zod";
import { schemaValues } from "./schema.js";

/** A registry entry owns both the display metadata and its runtime schema. */
type SourceVariantRegistry = Record<
  string,
  { readonly label: string; readonly schema: z.ZodTypeAny }
>;

type RegistrySchemas<T extends SourceVariantRegistry> = {
  [K in keyof T]: T[K]["schema"];
};

function schemasFor<T extends SourceVariantRegistry>(
  registry: T,
): [T[keyof T]["schema"], ...T[keyof T]["schema"][]] {
  const schemas = Object.fromEntries(
    Object.entries(registry).map(([key, entry]) => [key, entry.schema]),
  ) as RegistrySchemas<T>;
  return schemaValues(schemas);
}

export const MarketplaceSourceVariantRegistry = {
  github: {
    label: "GitHub repository",
    schema: z.object({
      kind: z.literal("github"),
      repository: z.string().min(1),
      ref: z.string().min(1).optional(),
    }),
  },
  git: {
    label: "Git repository",
    schema: z.object({
      kind: z.literal("git"),
      url: z.string().url(),
      ref: z.string().min(1).optional(),
    }),
  },
  localGit: {
    label: "Local Git checkout",
    schema: z.object({
      kind: z.literal("local-git"),
      path: z.string().min(1),
      ref: z.string().min(1).optional(),
    }),
  },
} as const;

export const MarketplaceSourceSchema = z.discriminatedUnion(
  "kind",
  schemasFor(MarketplaceSourceVariantRegistry),
);
export type MarketplaceSource = z.infer<typeof MarketplaceSourceSchema>;

export const PluginSourceVariantRegistry = {
  marketplacePath: {
    label: "Marketplace path",
    schema: z.object({
      kind: z.literal("marketplace-path"),
      path: z.string().min(1),
    }),
  },
  git: {
    label: "Git repository",
    schema: z.object({
      kind: z.literal("git"),
      url: z.string().url(),
      ref: z.string().min(1).optional(),
      sha: z.string().min(1).optional(),
    }),
  },
  gitSubdir: {
    label: "Git repository subdirectory",
    schema: z.object({
      kind: z.literal("git-subdir"),
      url: z.string().url(),
      path: z.string().min(1),
      ref: z.string().min(1).optional(),
      sha: z.string().min(1).optional(),
    }),
  },
  npm: {
    label: "npm package",
    schema: z.object({
      kind: z.literal("npm"),
      package: z.string().min(1),
      selector: z.string().min(1).optional(),
      registry: z.string().url().optional(),
    }),
  },
} as const;

export const PluginSourceSchema = z.discriminatedUnion(
  "kind",
  schemasFor(PluginSourceVariantRegistry),
);
export type PluginSource = z.infer<typeof PluginSourceSchema>;

export const GitRevisionSchema = z
  .string()
  .regex(/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/)
  .brand<"GitRevision">();
export const NpmIntegritySchema = z
  .string()
  .regex(/^sha512-[A-Za-z0-9+/]+={0,2}$/)
  .brand<"NpmIntegrity">();
export const CanonicalSourceSchema = z
  .string()
  .startsWith("source-v1|")
  .brand<"CanonicalSource">();
export const SourceHashSchema = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/)
  .brand<"SourceHash">();
export type GitRevision = z.infer<typeof GitRevisionSchema>;
export type NpmIntegrity = z.infer<typeof NpmIntegritySchema>;
export type CanonicalSource = z.infer<typeof CanonicalSourceSchema>;
export type SourceHash = z.infer<typeof SourceHashSchema>;

export const ResolvedMarketplaceSourceSchema = z
  .object({
    declared: MarketplaceSourceSchema,
    canonical: CanonicalSourceSchema,
    hash: SourceHashSchema,
    revision: GitRevisionSchema,
  })
  .readonly();
export type ResolvedMarketplaceSource = z.infer<
  typeof ResolvedMarketplaceSourceSchema
>;

export const ResolvedPluginSourceVariantRegistry = {
  marketplacePath: {
    label: "Marketplace path",
    schema: z.object({
      kind: z.literal("marketplace-path"),
      canonical: CanonicalSourceSchema,
      hash: SourceHashSchema,
      marketplaceRevision: GitRevisionSchema,
      path: z.string().min(1),
    }),
  },
  git: {
    label: "Git repository",
    schema: z.object({
      kind: z.literal("git"),
      canonical: CanonicalSourceSchema,
      hash: SourceHashSchema,
      revision: GitRevisionSchema,
    }),
  },
  gitSubdir: {
    label: "Git repository subdirectory",
    schema: z.object({
      kind: z.literal("git-subdir"),
      canonical: CanonicalSourceSchema,
      hash: SourceHashSchema,
      revision: GitRevisionSchema,
      path: z.string().min(1),
    }),
  },
  npm: {
    label: "npm package",
    schema: z.object({
      kind: z.literal("npm"),
      canonical: CanonicalSourceSchema,
      hash: SourceHashSchema,
      package: z.string().min(1),
      version: z.string().min(1),
      integrity: NpmIntegritySchema,
      registry: z.string().url(),
    }),
  },
} as const;

export const ResolvedPluginSourceSchema = z.discriminatedUnion(
  "kind",
  schemasFor(ResolvedPluginSourceVariantRegistry),
);
export type ResolvedPluginSource = z.infer<
  typeof ResolvedPluginSourceSchema
>;

export type Sha256 = (bytes: Uint8Array) => Uint8Array;

const encoder = new TextEncoder();
const hex = "0123456789ABCDEF";

function utf8ByteLength(value: string): number {
  return encoder.encode(value).byteLength;
}

function encodePathSegment(value: string): string {
  let encoded = "";
  for (const byte of encoder.encode(value)) {
    // RFC 3986 unreserved bytes are safe inside a path segment. Encoding all
    // other bytes avoids delimiter aliases and gives one representation for
    // Unicode and punctuation in declared paths.
    if (
      (byte >= 0x30 && byte <= 0x39) ||
      (byte >= 0x41 && byte <= 0x5a) ||
      (byte >= 0x61 && byte <= 0x7a) ||
      byte === 0x2d ||
      byte === 0x2e ||
      byte === 0x5f ||
      byte === 0x7e
    ) {
      encoded += String.fromCharCode(byte);
    } else {
      encoded += `%${hex[byte >> 4]}${hex[byte & 0x0f]}`;
    }
  }
  return encoded;
}

function encodePath(value: string): string {
  return value.split("/").map(encodePathSegment).join("/");
}

function decodeUrlSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // URL accepts a few malformed percent sequences. Treat their percent
    // signs as literal data rather than allowing them to create an alias.
    return value;
  }
}

function encodeUrlPath(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => encodePathSegment(decodeUrlSegment(segment)))
    .join("/");
}

/**
 * Normalize only URL syntax that is safe at this contract boundary. URL does
 * not resolve redirects, refs, filesystem paths, symlinks, or semver; those
 * are acquisition concerns. The authority is rebuilt because URL only
 * lowercases hosts for its special schemes (for example, not `ssh:`).
 */
function normalizeUrl(value: string): string {
  const parsed = new URL(value);
  const href = parsed.href;
  const suffix = `${parsed.search}${parsed.hash}`;
  const withoutSuffix = suffix
    ? href.slice(0, href.length - suffix.length)
    : href;
  const hierarchicalPrefix = `${parsed.protocol.toLowerCase()}//`;

  if (!withoutSuffix.startsWith(hierarchicalPrefix)) {
    return href;
  }

  const credentials = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
    : "";
  const port = parsed.port ? `:${parsed.port}` : "";
  const authority = `${hierarchicalPrefix}${credentials}${parsed.hostname.toLowerCase()}${port}`;
  return `${authority}${encodeUrlPath(parsed.pathname)}${suffix}`;
}

type CanonicalField = readonly [name: string, value: string | undefined];

function canonicalSource(
  kind: string,
  fields: readonly CanonicalField[],
): CanonicalSource {
  const encodedFields = fields
    .filter((field): field is readonly [string, string] => field[1] !== undefined)
    .map(([name, value]) => `${name}:${utf8ByteLength(value)}:${value}`);
  return CanonicalSourceSchema.parse(
    ["source-v1", kind, ...encodedFields].join("|"),
  );
}

export function serializeMarketplaceSource(
  source: MarketplaceSource,
): CanonicalSource {
  const value = MarketplaceSourceSchema.parse(source);
  switch (value.kind) {
    case "github":
      return canonicalSource("github", [
        ["repository", value.repository],
        ["ref", value.ref],
      ]);
    case "git":
      return canonicalSource("git", [
        ["url", normalizeUrl(value.url)],
        ["ref", value.ref],
      ]);
    case "local-git":
      return canonicalSource("local-git", [
        ["path", encodePath(value.path)],
        ["ref", value.ref],
      ]);
    default:
      return assertNever(value);
  }
}

export function serializePluginSource(source: PluginSource): CanonicalSource {
  const value = PluginSourceSchema.parse(source);
  switch (value.kind) {
    case "marketplace-path":
      return canonicalSource("marketplace-path", [
        ["path", encodePath(value.path)],
      ]);
    case "git":
      return canonicalSource("git", [
        ["url", normalizeUrl(value.url)],
        ["ref", value.ref],
        ["sha", value.sha],
      ]);
    case "git-subdir":
      return canonicalSource("git-subdir", [
        ["url", normalizeUrl(value.url)],
        ["path", encodePath(value.path)],
        ["ref", value.ref],
        ["sha", value.sha],
      ]);
    case "npm":
      return canonicalSource("npm", [
        ["package", value.package],
        ["selector", value.selector],
        ["registry", value.registry === undefined ? undefined : normalizeUrl(value.registry)],
      ]);
    default:
      return assertNever(value);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled source variant: ${String(value)}`);
}

export function hashCanonicalSource(
  source: CanonicalSource,
  sha256: Sha256,
): SourceHash {
  const canonical = CanonicalSourceSchema.parse(source);
  if (typeof sha256 !== "function") {
    throw new TypeError("hashCanonicalSource requires a SHA-256 function");
  }

  const digest = sha256(encoder.encode(canonical));
  if (!(digest instanceof Uint8Array) || digest.byteLength !== 32) {
    throw new Error("SHA-256 function must return exactly 32 bytes");
  }

  let digestHex = "";
  for (const byte of digest) {
    digestHex += `${hex[byte >> 4]}${hex[byte & 0x0f]}`.toLowerCase();
  }
  return SourceHashSchema.parse(`sha256:${digestHex}`);
}
