import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateTrustedInstallSubmission } from "../../src/application/trusted-install-configuration.js";
import { SensitiveValue } from "../../src/application/sensitive-value.js";
import { derivePluginConfigurationRef } from "../../src/domain/state/references.js";
import { claimFixture } from "../fixtures/compatibility/common.js";

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());
const scope = { kind: "user" as const };
const configurationRef = derivePluginConfigurationRef({ scope, plugin: "demo@market", content: "content", binding: "binding" }, sha256);
const descriptors = { options: [
  { key: "NAME", label: claimFixture("Name"), value: { kind: "string" as const, default: "default-name" }, required: true, sensitive: false, provenance: [claimFixture("NAME").provenance[0]!] },
  { key: "COUNT", label: claimFixture("Count"), value: { kind: "number" as const, min: 1, max: 4 }, required: true, sensitive: false, provenance: [claimFixture("COUNT").provenance[0]!] },
  { key: "TOKEN", label: claimFixture("Token"), value: { kind: "string" as const }, required: true, sensitive: true, provenance: [claimFixture("TOKEN").provenance[0]!] },
] } as const;
const fields = [
  { key: "NAME", label: { text: "Name", escaped: false, truncated: false }, kind: "string", required: true, sensitive: false, defaultPresent: true, default: { kind: "string", value: { text: "default-name", escaped: false, truncated: false } }, constraints: {}, state: "defaulted" },
  { key: "COUNT", label: { text: "Count", escaped: false, truncated: false }, kind: "number", required: true, sensitive: false, defaultPresent: false, constraints: { min: 1, max: 4 }, state: "missing" },
  { key: "TOKEN", label: { text: "Token", escaped: false, truncated: false }, kind: "string", required: true, sensitive: true, defaultPresent: false, constraints: {}, state: "missing" },
] as never;
const context = {
  configurationRef,
  plugin: "demo@market" as const,
  scope,
  descriptors,
  pathContext: { scope, trustedBaseDirectory: "/session/cwd" },
  paths: { normalizeAndInspect: async () => ({ kind: "invalid" as const }) },
  secretCustody: { status: "available" as const, explanation: "ready" },
};

function submission(nonSensitive: readonly { key: string; value: unknown }[], sensitive: readonly { key: string; value: SensitiveValue }[]) {
  return { expectedVersion: 0, nonSensitive, sensitive, consent: { kind: "grant" as const, consentId: `trusted-install-consent-v1:sha256:${"a".repeat(64)}` as never } };
}

describe("trusted-install configuration", () => {
  it("collects duplicate, partition, type, bounds, and required issues without values", async () => {
    const result = await validateTrustedInstallSubmission(fields, submission(
      [{ key: "COUNT", value: 99 }, { key: "COUNT", value: "CANARY_SECRET" }, { key: "TOKEN", value: "plaintext" }],
      [{ key: "NAME", value: SensitiveValue.fromUnknown("secret") }],
    ), context, new AbortController().signal);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.issues).toEqual([
      { code: "CONFIG_DUPLICATE_INPUT", key: "COUNT" },
      { code: "CONFIG_SENSITIVITY_MISMATCH", key: "NAME" },
      { code: "CONFIG_SENSITIVITY_MISMATCH", key: "TOKEN" },
    ]);
    expect(JSON.stringify(result)).not.toContain("CANARY_SECRET");
  });

  it("applies defaults and passes SensitiveValue only into the existing save request", async () => {
    const secret = SensitiveValue.fromUnknown("CANARY_SECRET");
    const result = await validateTrustedInstallSubmission(fields, submission([{ key: "COUNT", value: 2 }], [{ key: "TOKEN", value: secret }]), context, new AbortController().signal);
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.request.values).toMatchObject({ COUNT: 2, TOKEN: secret });
    expect(JSON.stringify(result)).not.toContain("CANARY_SECRET");
  });

  it("fails closed when required secret custody is unavailable", async () => {
    const result = await validateTrustedInstallSubmission(fields, submission([{ key: "COUNT", value: 2 }], [{ key: "TOKEN", value: SensitiveValue.fromUnknown("secret") }]), {
      ...context, secretCustody: { status: "unavailable" as const, explanation: "native details omitted" },
    }, new AbortController().signal);
    expect(result).toEqual({ kind: "invalid", issues: [{ code: "SECRET_CUSTODY_UNAVAILABLE", key: "TOKEN" }] });
  });
});
