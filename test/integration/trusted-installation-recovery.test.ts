import { describe, expect, it } from "vitest";
import { TrustedInstallActivationResultSchema } from "../../src/application/trusted-install-contract.js";
import { trustedInstallFlowFixture } from "../fixtures/trusted-install/plugin-install-flow.js";

describe("trusted installation rollback and recovery evidence", () => {
  it("keeps compensation and ambiguous commit outcomes distinct", () => {
    const rolledBack = TrustedInstallActivationResultSchema.parse(trustedInstallFlowFixture.states.rolledBack);
    const recovery = TrustedInstallActivationResultSchema.parse(trustedInstallFlowFixture.states.recoveryRequired);
    expect(rolledBack).toMatchObject({ kind: "rolled-back", restored: true, retained: { configuration: true, trust: true } });
    expect(recovery).toMatchObject({ kind: "recovery-required", action: "run-recovery", committed: 4, retained: { configuration: true, trust: true } });
    expect(rolledBack.kind).not.toBe(recovery.kind);
  });

  it("keeps cancellation honest about retained safe preflight", () => {
    expect(trustedInstallFlowFixture.states.cancelled).toMatchObject({ kind: "cancelled", phase: "trust-decision", retained: { configuration: true, trust: false } });
  });
});
