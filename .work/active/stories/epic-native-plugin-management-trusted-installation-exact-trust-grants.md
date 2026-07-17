---
id: epic-native-plugin-management-trusted-installation-exact-trust-grants
kind: story
stage: done
tags: [security]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-candidate-lease-disclosure]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Persist exact consent through existing trust state

## Checkpoint

Record one explicit grant for the verified trust candidate through the existing user trust document, generation mutation coordinator, scope/plugin scheduler, and project trust/root authority. Keep exact idempotence and ambiguous-commit reconciliation without adding a trust store or policy engine.

## Files

- `src/application/exact-trust-grant-service.ts`
- `src/application/trust-service.ts`
- `src/domain/state/trust-state.ts`
- `test/application/exact-trust-grant-service.test.ts`
- `test/application/trust-service.test.ts`
- `test/integration/state-contracts.test.ts`

## Acceptance evidence

- Persisted evidence exactly binds scope, marketplace/plugin source, immutable revision, and executable-surface digest.
- Exact granted subject is idempotent; explicitly re-granting an exact revoked subject preserves every sibling subject.
- Another revision or executable surface creates another subject and never inherits by plugin/source name.
- User generation races and ambiguous commits return stale/recovery evidence; lifecycle never runs until exact authority is proven.
- Project trust/root is revalidated before commit with no project-to-user fallback or public root disclosure.

## Implementation notes

- Added `ExactTrustGrantService` over the existing user `LifecycleStateStore` and `GenerationMutationCoordinator`; no trust store, transaction, expiry policy, or wildcard policy was introduced.
- The service verifies the candidate/scope, replaces only the exact subject, preserves and deterministically sorts sibling records, and treats an existing exact grant as idempotent.
- Stale generations remain explicit; failed/ambiguous commits become recovery-required and lifecycle callers cannot proceed without proven exact authority.
- Project candidates require the opaque root capability and are rechecked for root identity and Pi project trust before queueing, in `beforeCommit`, and after commit. There is no project-to-user fallback.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/exact-trust-grant-service.test.ts test/application/trust-service.test.ts test/integration/state-contracts.test.ts` — 13 passed.
