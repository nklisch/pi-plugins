import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  CanonicalSourceSchema,
  GitRevisionSchema,
  MarketplaceSourceSchema,
  MarketplaceSourceVariantRegistry,
  NpmIntegritySchema,
  PluginSourceSchema,
  PluginSourceVariantRegistry,
  ResolvedMarketplaceSourceSchema,
  ResolvedPluginSourceSchema,
  ResolvedPluginSourceVariantRegistry,
  SourceHashSchema,
  hashCanonicalSource,
  serializeMarketplaceSource,
  serializePluginSource,
  type CanonicalSource,
  type MarketplaceSource,
  type PluginSource,
  type ResolvedMarketplaceSource,
  type ResolvedPluginSource,
  type Sha256,
  type SourceHash,
} from "../../src/domain/source.js";

describe("source schemas", () => {
  it("parses every declared marketplace variant from its registry", () => {
    const samples = {
      github: { kind: "github", repository: "owner/repository" },
      git: { kind: "git", url: "https://example.com/catalog.git" },
      localGit: { kind: "local-git", path: "./catalog" },
    } as const;

    for (const [name, entry] of Object.entries(MarketplaceSourceVariantRegistry)) {
      expect(entry.schema.safeParse(samples[name as keyof typeof samples]).success).toBe(
        true,
      );
      expect(MarketplaceSourceSchema.safeParse(samples[name as keyof typeof samples]).success).toBe(
        true,
      );
    }
  });

  it("parses every declared plugin variant from its registry", () => {
    const samples = {
      marketplacePath: { kind: "marketplace-path", path: "./plugins/demo" },
      git: { kind: "git", url: "https://example.com/plugin.git" },
      gitSubdir: {
        kind: "git-subdir",
        url: "ssh://git@example.com/plugin.git",
        path: "packages/demo",
      },
      npm: { kind: "npm", package: "@example/plugin" },
    } as const;

    for (const [name, entry] of Object.entries(PluginSourceVariantRegistry)) {
      expect(entry.schema.safeParse(samples[name as keyof typeof samples]).success).toBe(
        true,
      );
      expect(PluginSourceSchema.safeParse(samples[name as keyof typeof samples]).success).toBe(
        true,
      );
    }
  });

  it("rejects malformed source values and invalid immutable revisions", () => {
    expect(
      MarketplaceSourceSchema.safeParse({
        kind: "git",
        url: "not a URL",
      }).success,
    ).toBe(false);
    expect(
      PluginSourceSchema.safeParse({
        kind: "unknown",
        path: "./plugin",
      }).success,
    ).toBe(false);
    expect(GitRevisionSchema.safeParse("A".repeat(40)).success).toBe(false);
    expect(GitRevisionSchema.safeParse("a".repeat(39)).success).toBe(false);
    expect(GitRevisionSchema.safeParse("a".repeat(40)).success).toBe(true);
    expect(GitRevisionSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(NpmIntegritySchema.safeParse("sha512-abc=").success).toBe(true);
    expect(NpmIntegritySchema.safeParse("sha256-abc=").success).toBe(false);
  });

  it("derives declared and resolved types from their schemas", () => {
    expectTypeOf<z.infer<typeof MarketplaceSourceSchema>>().toEqualTypeOf<
      MarketplaceSource
    >();
    expectTypeOf<z.infer<typeof PluginSourceSchema>>().toEqualTypeOf<PluginSource>();
    expectTypeOf<z.infer<typeof ResolvedMarketplaceSourceSchema>>().toEqualTypeOf<
      ResolvedMarketplaceSource
    >();
    expectTypeOf<z.infer<typeof ResolvedPluginSourceSchema>>().toEqualTypeOf<
      ResolvedPluginSource
    >();

    const declared: PluginSource = {
      kind: "git",
      url: "https://example.com/plugin.git",
      ref: "main",
    };
    const requiresResolved = (source: ResolvedPluginSource): ResolvedPluginSource =>
      source;
    // A mutable selector must never be accepted as an immutable materialized source.
    // @ts-expect-error declared selectors and resolved revisions are different contracts
    requiresResolved(declared);
    expectTypeOf<PluginSource>().not.toMatchTypeOf<ResolvedPluginSource>();
  });

  it("derives resolved variants from one registry and narrows exhaustively", () => {
    const revision = "a".repeat(40);
    const hash = `sha256:${"b".repeat(64)}`;
    const canonical = "source-v1|git|url:30:https://example.com/plugin.git";
    const samples = {
      marketplacePath: {
        kind: "marketplace-path",
        canonical,
        hash,
        marketplaceRevision: revision,
        path: "./plugins/demo",
      },
      git: { kind: "git", canonical, hash, revision },
      gitSubdir: {
        kind: "git-subdir",
        canonical,
        hash,
        revision,
        path: "packages/demo",
      },
      npm: {
        kind: "npm",
        canonical,
        hash,
        package: "@example/plugin",
        version: "1.2.3",
        integrity: "sha512-abc=",
        registry: "https://registry.example.com",
      },
    } as const;

    for (const [name, entry] of Object.entries(ResolvedPluginSourceVariantRegistry)) {
      expect(entry.schema.safeParse(samples[name as keyof typeof samples]).success).toBe(
        true,
      );
      expect(
        ResolvedPluginSourceSchema.safeParse(samples[name as keyof typeof samples])
          .success,
      ).toBe(true);
    }

    const kinds = Object.values(samples).map((sample) => resolvedKind(sample));
    expect(kinds).toEqual([
      "marketplace-path",
      "git",
      "git-subdir",
      "npm",
    ]);
  });

  it("requires a declared marketplace source on a resolved marketplace", () => {
    const result = ResolvedMarketplaceSourceSchema.safeParse({
      declared: { kind: "github", repository: "owner/repository", ref: "main" },
      canonical: "source-v1|github|repository:16:owner/repository|ref:4:main",
      hash: `sha256:${"c".repeat(64)}`,
      revision: "d".repeat(40),
    });
    expect(result.success).toBe(true);
  });
});

function resolvedKind(source: ResolvedPluginSource): ResolvedPluginSource["kind"] {
  switch (source.kind) {
    case "marketplace-path":
    case "git":
    case "git-subdir":
    case "npm":
      return source.kind;
    default:
      return assertNever(source);
  }
}

function assertNever(value: never): never {
  throw new Error(`unexpected source: ${String(value)}`);
}

describe("canonical source serialization", () => {
  it("uses field lengths to protect values containing grammar delimiters", () => {
    const source = {
      kind: "github",
      repository: "a|ref:3:x",
      ref: "b:c|d",
    } as const;

    expect(serializeMarketplaceSource(source)).toBe(
      "source-v1|github|repository:9:a|ref:3:x|ref:5:b:c|d",
    );
  });

  it("uses registry order rather than caller object key order", () => {
    const source = {
      ref: "main",
      url: "HTTPS://Example.COM:443/repository.git",
      kind: "git",
    } as const;

    expect(serializeMarketplaceSource(source)).toBe(
      "source-v1|git|url:34:https://example.com/repository.git|ref:4:main",
    );
    expect(
      serializeMarketplaceSource({
        kind: "git",
        url: "https://example.com/repository.git",
        ref: "main",
      }),
    ).toBe(serializeMarketplaceSource(source));
  });

  it("omits absent optionals without inventing defaults", () => {
    expect(
      serializePluginSource({
        kind: "git",
        url: "https://example.com/plugin.git",
      }),
    ).toBe("source-v1|git|url:30:https://example.com/plugin.git");
    expect(
      serializePluginSource({
        kind: "git",
        url: "https://example.com/plugin.git",
        ref: "main",
      }),
    ).toBe("source-v1|git|url:30:https://example.com/plugin.git|ref:4:main");
  });

  it("counts UTF-8 bytes and percent-encodes path segments", () => {
    expect(
      serializeMarketplaceSource({ kind: "local-git", path: "é/🙂" }),
    ).toBe("source-v1|local-git|path:19:%C3%A9/%F0%9F%99%82");
    expect(
      serializePluginSource({
        kind: "git-subdir",
        url: "https://example.com/repository.git",
        path: "packages/naïve plugin",
      }),
    ).toBe(
      "source-v1|git-subdir|url:34:https://example.com/repository.git|path:28:packages/na%C3%AFve%20plugin",
    );
  });

  it("normalizes URL scheme, host, HTTPS port, and encoded path segments", () => {
    expect(
      serializePluginSource({
        kind: "git",
        url: "HTTPS://Example.COM:443/repo%2Fname",
      }),
    ).toBe("source-v1|git|url:31:https://example.com/repo%2Fname");
    expect(
      serializePluginSource({
        kind: "npm",
        package: "@example/plugin",
        registry: "HTTPS://Registry.Example.COM:443/npm/é",
      }),
    ).toBe(
      "source-v1|npm|package:15:@example/plugin|registry:39:https://registry.example.com/npm/%C3%A9",
    );
    expect(
      serializePluginSource({
        kind: "git",
        url: "SSH://Example.COM:22/repository.git",
      }),
    ).toBe("source-v1|git|url:35:ssh://example.com:22/repository.git");
  });

  it.each([
    [
      "marketplace-path",
      serializePluginSource({ kind: "marketplace-path", path: "./plugins/demo" }),
    ],
    [
      "git",
      serializePluginSource({ kind: "git", url: "https://example.com/plugin.git" }),
    ],
    [
      "git-subdir",
      serializePluginSource({
        kind: "git-subdir",
        url: "https://example.com/plugin.git",
        path: "packages/demo",
      }),
    ],
    [
      "npm",
      serializePluginSource({ kind: "npm", package: "@example/plugin" }),
    ],
  ])("serializes the %s plugin source kind", (_kind, serialized) => {
    expect(CanonicalSourceSchema.safeParse(serialized).success).toBe(true);
  });
});

describe("canonical source hashing", () => {
  it("hashes canonical UTF-8 bytes through the injected SHA-256 port", () => {
    const canonical = "source-v1|npm|package:15:@example/plugin" as CanonicalSource;
    let received = "";
    const sha256: Sha256 = (bytes) => {
      received = new TextDecoder().decode(bytes);
      return Uint8Array.from({ length: 32 }, (_, index) => index);
    };

    const hash = hashCanonicalSource(canonical, sha256);

    expect(received).toBe(canonical);
    expect(hash).toBe(
      "sha256:000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    );
    expect(SourceHashSchema.safeParse(hash).success).toBe(true);
  });

  it.each([31, 33])("rejects an injected digest of %i bytes", (length) => {
    expect(() =>
      hashCanonicalSource(
        "source-v1|git|url:30:https://example.com/plugin.git" as CanonicalSource,
        () => new Uint8Array(length),
      ),
    ).toThrow("exactly 32 bytes");
  });

  it("rejects a non-canonical input even when the type is forged", () => {
    expect(() =>
      hashCanonicalSource("not-canonical" as CanonicalSource, () =>
        new Uint8Array(32),
      ),
    ).toThrow();
  });
});
