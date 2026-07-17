import { createPluginMcpProjection } from "../application/mcp-plugin-projection.js";
import type { McpRuntimeCapabilities } from "../application/ports/mcp-runtime.js";
import type { Sha256 } from "../domain/source.js";
import type { McpLifecycleState } from "../runtime/mcp/lifecycle-participant.js";
import type { RuntimeSelection } from "./runtime-selection-catalog.js";

export function projectRuntimeSelectionToMcpState(
  selection: RuntimeSelection,
  capabilities: McpRuntimeCapabilities,
  sha256: Sha256,
): McpLifecycleState {
  const expectation = selection.skillHook.prepared.expectation;
  const projection = createPluginMcpProjection({
    projection: expectation.projection,
    compatibility: selection.compatibility,
    runtimeCapabilities: capabilities,
    sha256,
  });
  return projection.kind === "none"
    ? { kind: "none", expectation, projection }
    : { kind: "source", expectation, projection, capabilities };
}
