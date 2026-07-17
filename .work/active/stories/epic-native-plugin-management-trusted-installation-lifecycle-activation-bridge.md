---
id: epic-native-plugin-management-trusted-installation-lifecycle-activation-bridge
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-candidate-lease-disclosure]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Transfer the candidate through the existing lifecycle transaction

## Checkpoint

Add a package-private prepared-install entry that consumes the exact candidate lease but shares the existing inspection, compatibility, readiness, projection, promotion, state, reload, observation, rollback, and recovery executor. Map exact disabled/current/different installed states without adding update behavior.

## Files

- `src/application/plugin-candidate-preparation.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/trusted-install-lifecycle.ts`
- `test/application/plugin-candidate-preparation.test.ts`
- `test/application/plugin-lifecycle-service.test.ts`
- `test/application/trusted-install-lifecycle.test.ts`
- `test/integration/plugin-lifecycle.test.ts`

## Acceptance evidence

- Prepared install makes no second materializer/network call and ordinary public install remains source-compatible.
- Initial install enforces the exact expected revision and every lease/candidate/config/trust/report binding before promotion.
- Exact disabled revision uses enable, exact enabled is current-state, and a different revision is conflict—not update.
- Success requires exact complete active observation; callback/progress/reload acceptance cannot prove success.
- Concurrent install/update/uninstall and all lifecycle result variants map losslessly through existing scheduler, lock, CAS, rollback, and recovery authority.
