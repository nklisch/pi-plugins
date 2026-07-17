---
id: epic-native-plugin-management-trusted-installation-configuration-custody
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

# Validate complete configuration input through existing custody

## Checkpoint

Make one configuration-validation implementation return every deterministic field issue, project safe field/default/constraint views, enforce non-sensitive versus `SensitiveValue` input partitioning, and persist only through the existing configuration/credential CAS and reconciliation service.

## Files

- `src/application/configuration-validation.ts`
- `src/application/configuration-service.ts`
- `src/application/trusted-install-configuration.ts`
- `src/composition/create-host-configuration.ts`
- `test/application/configuration-validation.test.ts`
- `test/application/configuration-service.test.ts`
- `test/application/trusted-install-configuration.test.ts`
- `test/integration/trust-config-secrets.test.ts`

## Acceptance evidence

- Unknown, duplicate, cross-partition, required, type, pattern, bound, and path issues are complete and unsigned-UTF-8 ordered without attempted values.
- Defaults apply exactly once; sensitive defaults remain impossible; all-default descriptor sets produce an exact document.
- Sensitive values reach only the existing immediate credential-custody path and never enter sessions, progress, results, diagnostics, or fixtures.
- Secret collision, stale/ambiguous configuration CAS, cleanup-required, and custody unavailable prevent lifecycle and retain honest recovery evidence.
- Project paths require current opaque root authority; user paths remain bound to the active session working directory.
