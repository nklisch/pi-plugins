import {
  parseMarketplaceUpdateRecord,
  type MarketplaceUpdateRecord,
} from "../domain/update-policy.js";
import type { Sha256 } from "../domain/source.js";
import {
  parseStateMutation,
  type GenerationSnapshot,
  type StateMutation,
} from "./state-contract.js";

export function marketplaceUpdateRecords(
  snapshot: GenerationSnapshot,
): readonly MarketplaceUpdateRecord[] {
  const records = "config" in snapshot
    ? snapshot.config.records
    : snapshot.project.marketplaceUpdates;
  return records.map((record: unknown) => parseMarketplaceUpdateRecord(record));
}

export function createMarketplaceUpdateRecordsMutation(
  snapshot: GenerationSnapshot,
  records: readonly MarketplaceUpdateRecord[],
  sha256: Sha256,
): StateMutation {
  if ("config" in snapshot) {
    // Compatibility adapters may expose a v1 envelope around rich v2 records.
    // Force v2 before verification so migration defaults cannot erase their
    // claims, backoff, or notification memory.
    const config = {
      ...snapshot.config,
      schemaVersion: 2 as const,
      generation: snapshot.generation,
      records,
    };
    return parseStateMutation({
      scope: snapshot.scope,
      expectedGeneration: snapshot.generation,
      replace: { config },
    }, sha256);
  }
  const project = {
    ...snapshot.project,
    schemaVersion: 2 as const,
    generation: snapshot.generation,
    marketplaceUpdates: records,
  };
  return parseStateMutation({
    scope: snapshot.scope,
    expectedGeneration: snapshot.generation,
    replace: { project },
  }, sha256);
}
