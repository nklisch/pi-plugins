import type {
  PluginConfigurationDocument,
} from "../../domain/configured-values.js";
import type { ContentDigest } from "../../domain/content-manifest.js";
import type { PluginConfigurationRef } from "../../domain/state/references.js";

/** CAS storage for non-sensitive configuration documents only. */
export interface PluginConfigurationStore {
  read(
    ref: PluginConfigurationRef,
    signal: AbortSignal,
  ): Promise<
    | Readonly<{ kind: "found"; document: PluginConfigurationDocument }>
    | Readonly<{ kind: "missing" }>
  >;
  replace(
    request: Readonly<{
      expectedRevision: ContentDigest | null;
      document: PluginConfigurationDocument;
    }>,
    signal: AbortSignal,
  ): Promise<
    | Readonly<{ kind: "stored" }>
    | Readonly<{ kind: "stale"; actualRevision: ContentDigest | null }>
  >;
  remove(
    request: Readonly<{
      ref: PluginConfigurationRef;
      expectedRevision: ContentDigest;
      confirmedSecretDeletion: true;
    }>,
    signal: AbortSignal,
  ): Promise<"removed" | "stale" | "missing">;
}
