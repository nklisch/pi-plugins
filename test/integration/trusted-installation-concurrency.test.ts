import { describe, expect, it } from "vitest";
import { createKeyedMutationScheduler } from "../../src/infrastructure/state/keyed-mutation-scheduler.js";

describe("trusted installation durable operation concurrency", () => {
  it("serializes the same scope/plugin through existing mutation admission", async () => {
    const scheduler = createKeyedMutationScheduler();
    const subject = [{ scope: { kind: "user" as const }, plugin: "demo@market" as never }];
    const events: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const first = scheduler.run(subject, async () => { events.push("first-start"); await gate; events.push("first-end"); return 1; }, new AbortController().signal);
    const second = scheduler.run(subject, async () => { events.push("second-start"); return 2; }, new AbortController().signal);
    await Promise.resolve();
    expect(events).toEqual(["first-start"]);
    release();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(events).toEqual(["first-start", "first-end", "second-start"]);
  });
});
