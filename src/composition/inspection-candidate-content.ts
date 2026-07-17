import type { ContentStorePort } from "../application/ports/content-store.js";
import type { InspectionCandidateContentPort } from "../application/ports/inspection-candidate-content.js";
import type { ResolvedMarketplaceCandidate } from "../application/marketplace-catalog-service.js";
import type { MaterializedPlugin, PluginMaterializer, SourceContext } from "../application/source-materialization.js";

/** Disposable candidate acquisition over the existing hardened materializer. */
export function createInspectionCandidateContent(input: Readonly<{
  content: Pick<ContentStorePort, "allocateStaging" | "discardStaging">;
  materializer: PluginMaterializer;
}>): InspectionCandidateContentPort {
  if (input === null || typeof input !== "object") throw new TypeError("candidate content dependencies are required");
  const port: InspectionCandidateContentPort = {
    async withMaterialized<T>(candidate: ResolvedMarketplaceCandidate, signal: AbortSignal, use: (materialized: MaterializedPlugin) => Promise<T>): Promise<T> {
      signal.throwIfAborted();
      const allocation = await input.content.allocateStaging(signal);
      let outcome: T | undefined;
      let failure: unknown;
      try {
        const context: SourceContext = candidate.entry.source.value.kind === "marketplace-path"
          ? {
              kind: "marketplace",
              root: candidate.marketplace.root,
              source: candidate.marketplace.source,
              contentRootDigest: candidate.marketplace.content.rootDigest,
              content: candidate.marketplace.content,
              binding: candidate.marketplace.binding,
            }
          : { kind: "external" };
        const materialized = await input.materializer.materialize(candidate.entry.source.value, context, allocation.slot, signal);
        outcome = await use(materialized);
      } catch (error) {
        failure = error;
      }
      try {
        // Cleanup is mandatory even after caller cancellation.
        await input.content.discardStaging(allocation, new AbortController().signal);
      } catch (cleanupError) {
        failure = failure === undefined ? cleanupError : new AggregateError([failure, cleanupError], "candidate staging cleanup failed");
      }
      if (failure !== undefined) throw failure;
      return outcome as T;
    },
  };
  return Object.freeze(port);
}
