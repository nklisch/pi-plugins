---
id: epic-native-plugin-management-trusted-installation-exact-trust-grants
kind: story
stage: implementing
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
