---
id: derive-automatic-update-eligibility-contract-from-registry
kind: story
stage: implementing
tags: [refactor, reliability]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Derive Automatic Update Eligibility Contract from Its Registry

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** pattern drift / duplicated contract

`src/application/automatic-update-eligibility.ts:4` already declares the eleven automatic-update eligibility reasons in `AutomaticUpdateEligibilityReasonRegistry`, but `src/application/automatic-update-eligibility.ts:18` repeats every value in a separate `z.enum` list. Deriving the schema and type from the registry removes the parallel variant set and makes the file match the repository's established registry-derived contract pattern.

## Current State

```ts
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
```

The registry and runtime schema can drift because both independently enumerate the same growing reason set.

## Target State

```ts
export const AutomaticUpdateEligibilityReasonRegistry = Object.freeze({
  // Existing keys and values remain unchanged.
} as const);

export type AutomaticUpdateEligibilityReason =
  (typeof AutomaticUpdateEligibilityReasonRegistry)[keyof typeof AutomaticUpdateEligibilityReasonRegistry];

export const AutomaticUpdateEligibilityReasonSchema = z.enum(
  Object.values(AutomaticUpdateEligibilityReasonRegistry) as [
    AutomaticUpdateEligibilityReason,
    ...AutomaticUpdateEligibilityReason[],
  ],
);
```

## Implementation Notes

- Change only `src/application/automatic-update-eligibility.ts`.
- Preserve every registry key, reason string, exported symbol, schema behavior, and coordinator branch.
- Use the same non-empty tuple assertion pattern already established by registry-derived schemas elsewhere in the package.
- Do not add or edit tests; existing contract and coordinator tests already exercise schema parsing and all reason routes.

## Acceptance Criteria

- [ ] The eligibility reason strings have exactly one authoritative enumeration: `AutomaticUpdateEligibilityReasonRegistry`.
- [ ] `AutomaticUpdateEligibilityReasonSchema` and `AutomaticUpdateEligibilityReason` derive from that registry without changing their public runtime or TypeScript values.
- [ ] No scheduler, state, authority, lifecycle, inspection, or facade contract changes.
- [ ] Existing automatic-update eligibility/coordinator tests pass unchanged.
- [ ] Typecheck, boundaries, and build pass.

## Risk and Rollback

The only implementation risk is an incorrect non-empty tuple assertion weakening TypeScript inference or changing the Zod enum input. Existing compiler and contract tests bound that risk. Revert the implementation commit to restore the duplicated literal list; no state, migration, or runtime data is affected.

## Discovery Record

Direct-read discovery covered update notification, scheduler ownership, automatic eligibility/application, startup orchestration, inspection integration, their composition seams, and the current packaged-host integration around commits `611ecf8..651d292`. No nested agent or advisory review was used. Broader ownership, scheduler/state authority, public-contract, test-only, correctness, and facade-overlap candidates were deliberately excluded.
