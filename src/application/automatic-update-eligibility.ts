import { z } from "zod";
import { UpdateNoticeIdSchema } from "../domain/update-policy.js";

export const AutomaticUpdateEligibilityReasonRegistry = Object.freeze({
  eligible: "eligible",
  manual: "manual",
  approvalRequired: "approval-required",
  stale: "stale",
  projectUntrusted: "project-untrusted",
  recoveryRequired: "recovery-required",
  configurationRequired: "configuration-required",
  secretUnavailable: "secret-unavailable",
  capabilityUnavailable: "capability-unavailable",
  awaitingHostContext: "awaiting-host-context",
  retryable: "retryable",
} as const);

export const AutomaticUpdateEligibilityReasonSchema = z.enum([
  "eligible", "manual", "approval-required", "stale", "project-untrusted",
  "recovery-required", "configuration-required", "secret-unavailable",
  "capability-unavailable", "awaiting-host-context", "retryable",
]);
export type AutomaticUpdateEligibilityReason = z.infer<typeof AutomaticUpdateEligibilityReasonSchema>;

export const AutomaticUpdateEligibilitySchema = z.object({
  noticeId: UpdateNoticeIdSchema,
  kind: AutomaticUpdateEligibilityReasonSchema,
  retryAt: z.number().int().nonnegative().optional(),
}).strict().readonly().superRefine((result, context) => {
  if ((result.kind === "retryable") !== (result.retryAt !== undefined)) context.addIssue({ code: "custom", path: ["retryAt"], message: "only retryable eligibility has retry timing" });
});
export type AutomaticUpdateEligibility = z.infer<typeof AutomaticUpdateEligibilitySchema>;
