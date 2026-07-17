import { describe, expect, it } from "vitest";
import { createPiReloadBroker } from "../../src/pi/pi-reload-broker.js";

const binding = { sessionId: "s-1", cwd: "/workspace", mode: "interactive" as const, projectTrusted: true };
const scope = { kind: "user" as const };
const transition = `pending:${"a".repeat(64)}` as never;

describe("Pi reload broker", () => {
  it("permits only the exact successor to publish one ticket", async () => {
    const broker = createPiReloadBroker();
    const ticket = broker.open(binding, scope, transition);
    expect(broker.claimSuccessor({ ...binding, cwd: "/other" })).toBeUndefined();
    expect(broker.claimSuccessor(binding)).toEqual(ticket);
    expect(broker.claimSuccessor(binding)).toBeUndefined();
    broker.publish(ticket, []);
    await expect(broker.wait(ticket, new AbortController().signal)).resolves.toEqual([]);
  });

  it("rejects duplicate pending reloads for one session", async () => {
    const broker = createPiReloadBroker();
    const ticket = broker.open({ ...binding, sessionId: "s-2" }, scope, transition);
    expect(() => broker.open({ ...binding, sessionId: "s-2" }, scope, transition)).toThrow(/already pending/);
    const waiting = broker.wait(ticket, new AbortController().signal);
    broker.fail(ticket);
    await expect(waiting).rejects.toThrow(/successor failed/);
  });
});
