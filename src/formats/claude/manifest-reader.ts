import {
  CLAUDE_PLUGIN_MANIFEST_PATH,
  readManifestRecord,
  type PluginManifestReader,
} from "../plugin-manifest.js";

const CLAUDE_RUNTIME_FIELDS = new Set([
  "agents",
  "commands",
  "dependencies",
  "lspServers",
  "outputStyles",
  "settings",
  "themes",
  "channels",
  "userConfig",
  "strict",
]);

/** Pure Claude plugin.json reader. JSON decoding is deliberately external. */
export const readClaudePluginManifest: PluginManifestReader = (input, context) =>
  readManifestRecord(input, context, {
    nativeHost: "claude",
    operation: "readClaudePluginManifest",
    runtimeFields: CLAUDE_RUNTIME_FIELDS,
  });

export { CLAUDE_PLUGIN_MANIFEST_PATH };
