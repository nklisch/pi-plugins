import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createPackagedPluginHost } from "../composition/create-packaged-plugin-host.js";

/** Default package entry: construct only, with optional production participants absent. */
export default function packagedPluginHostExtension(pi: ExtensionAPI): void {
  createPackagedPluginHost({ pi });
}
