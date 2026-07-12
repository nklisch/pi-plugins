import { createHash } from "node:crypto";
import type { MaterializationLimits } from "../../application/ports/source-acquisition.js";
import type { ContentManifest } from "../../domain/content-manifest.js";
import {
  createSourceMaterializers,
  type MarketplaceMaterializer,
  type PluginMaterializer,
} from "../../application/source-materialization.js";
import { createTarReader } from "../archive/tar-reader.js";
import {
  createFilesystemMarketplacePathAcquirer,
  createSecureContentWriterFactory,
  verifyMaterializedContent,
} from "../filesystem/secure-content-writer.js";
import { createGitSourceAcquirer } from "../git/git-source-acquirer.js";
import {
  createBoundedFetch,
  createDefaultNpmCredentialProvider,
  type NpmCredentialProvider,
} from "../http/bounded-fetch.js";
import { createNpmRegistryClient } from "../npm/npm-registry-client.js";
import { createNpmSourceAcquirer } from "../npm/npm-source-acquirer.js";
import { createNodeCommandRunner } from "../process/command-runner.js";

/**
 * Node-only composition options. The individual adapters intentionally remain
 * private: callers receive only the lifecycle-facing materializers, while
 * tests and alternate hosts can still compose the application with ports.
 */
export type NodeSourceMaterializerOptions = Readonly<{
  gitExecutable?: string;
  fetch?: typeof globalThis.fetch;
  credentialProvider?: NpmCredentialProvider;
  limits?: Partial<MaterializationLimits>;
}>;

/**
 * Build the production Node adapter graph once at the boundary. Keeping this
 * wiring here prevents application policy from learning about child
 * processes, filesystem paths, HTTP credentials, or archive implementations.
 */
export function createNodeSourceMaterializers(
  options: NodeSourceMaterializerOptions = {},
): Readonly<{
  marketplaces: MarketplaceMaterializer;
  plugins: PluginMaterializer;
  verifyMaterializedContent(root: string, manifest: ContentManifest): Promise<ContentManifest>;
}> {
  if (options === null || typeof options !== "object") {
    throw new TypeError("Node source materializer options must be an object");
  }

  const configuredFetch = options.fetch ?? globalThis.fetch;
  if (typeof configuredFetch !== "function") {
    throw new TypeError("Node source materializers require fetch");
  }

  const credentials = options.credentialProvider ?? createDefaultNpmCredentialProvider();
  const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
  const command = createNodeCommandRunner();
  const limitOptions = options.limits === undefined ? {} : { limits: options.limits };
  const archive = createTarReader(limitOptions);
  const content = createSecureContentWriterFactory({ sha256, ...limitOptions });
  const boundedFetch = createBoundedFetch({
    fetch: configuredFetch,
    credentials,
    ...(options.limits?.maxRedirects === undefined ? {} : { maxRedirects: options.limits.maxRedirects }),
  });
  const registry = createNpmRegistryClient({
    fetch: boundedFetch,
    credentials,
    ...limitOptions,
  });

  const git = createGitSourceAcquirer({
    ...(options.gitExecutable === undefined ? {} : { gitExecutable: options.gitExecutable }),
    command,
    archive,
    sha256,
    ...limitOptions,
  });
  const npm = createNpmSourceAcquirer({
    registry,
    archive,
    sha256,
    ...limitOptions,
  });

  const materializers = createSourceMaterializers({
    git,
    npm,
    content,
    sha256,
    marketplace: createFilesystemMarketplacePathAcquirer({ sha256 }),
  });
  return {
    ...materializers,
    // Bind the verifier to the same private crypto/filesystem graph as the
    // materializers. Lifecycle code receives a narrow handoff operation, not
    // the adapters used to acquire or write untrusted source bytes.
    verifyMaterializedContent: (root: string, manifest: ContentManifest): Promise<ContentManifest> =>
      options.limits === undefined
        ? verifyMaterializedContent(root, manifest)
        : verifyMaterializedContent(root, manifest, { limits: options.limits }),
  };
}
