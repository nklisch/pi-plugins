import { describe, expect, it } from "vitest";
import { createLifecycleRecoveryService } from "../../src/application/recovery-service.js";
import { StateCorruptionSchema } from "../../src/domain/state/codec.js";

const corruption = StateCorruptionSchema.parse({ document: "installedUser", scope: { kind: "user" }, code: "DOCUMENT_INVALID", summary: "state document is invalid" });

describe("bounded lifecycle recovery", () => {
  it("isolates corrupt scopes and returns a safe blocked result without entering lifecycle commands", async () => {
    let forbidden = false;
    const service = createLifecycleRecoveryService({
      state: { async read() { return { ok: false as const, scope: { kind: "user" as const }, corruptions: [corruption] }; }, async commit() { forbidden = true; throw new Error("forbidden"); } },
      inventory: { async discover() { return { scopes: [{ kind: "user" as const }], complete: true }; } },
      transitions: () => ({ async prepare() { throw new Error("forbidden"); }, async settle() { throw new Error("forbidden"); } }),
      reconciler: { async recoverInterruptedTransition() { forbidden = true; throw new Error("forbidden"); }, async completeCommittedTransition() { forbidden = true; throw new Error("forbidden"); } },
      reload: { async reload() { forbidden = true; throw new Error("forbidden"); }, async observe() { forbidden = true; throw new Error("forbidden"); } },
      artifacts: { async scan() { forbidden = true; throw new Error("forbidden"); }, async remove() { forbidden = true; throw new Error("forbidden"); } },
      clock: { nowEpochMilliseconds: () => 100, monotonicMilliseconds: () => 0 },
    });
    const result = await service.recover({ requiredScopes: [{ kind: "user" }] }, new AbortController().signal);
    expect(result).toMatchObject({ deferred: true, results: [{ kind: "blocked", code: "STATE_CORRUPT" }] });
    expect(forbidden).toBe(false);
  });

  it("honors the required transition budget before cleanup", async () => {
    const result = await createLifecycleRecoveryService({
      state: { async read() { return { ok: false as const, scope: { kind: "user" as const }, corruptions: [corruption] }; }, async commit() { throw new Error("unused"); } },
      transitions: () => ({ async prepare() { throw new Error("unused"); }, async settle() { throw new Error("unused"); } }),
      reconciler: {} as never,
      reload: {} as never,
      clock: { nowEpochMilliseconds: () => 100, monotonicMilliseconds: () => 1 },
    }).recover({ requiredScopes: [{ kind: "user" }], policy: { requiredBudgetMs: 0 } }, new AbortController().signal);
    expect(result.results[0]).toMatchObject({ kind: "deferred", code: "BUDGET_EXHAUSTED" });
  });
});
