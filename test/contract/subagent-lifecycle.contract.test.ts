import { describe, expect, it } from "vitest";
import {
  defineSubagentLifecycleContract,
  traceContractViolations,
} from "./subagent-lifecycle.contract.js";
import { createFakeSubagentLifecycle } from "../support/fakes/subagent-lifecycle.js";

defineSubagentLifecycleContract(
  "deterministic fake",
  () => createFakeSubagentLifecycle(),
);

describe("subagent lifecycle contract negative evidence", () => {
  it("detects event approximation, post-finalization interception, and unbounded continuation", () => {
    expect(traceContractViolations({
      identity: {
        schemaVersion: 1,
        agentId: "agent",
        sessionId: "session",
        runId: "run",
        agentType: "type",
      },
      execution: {
        phase: "resume",
        origin: "service",
        mode: "background",
        admission: "queued",
      },
      checkpoints: [
        "prompt",
        "start-interceptor",
        "proposed-result",
        "finalize",
        "completion-interceptor",
        "completion-event",
      ],
      decisionKinds: [],
      terminal: "completed",
      continuationRounds: 4,
    })).toEqual([
      "start-after-prompt",
      "completion-after-finalize",
      "unbounded-continuation",
    ]);
  });
});
