---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-value-validation
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Configured-Value Contracts and Validation

## Scope

Implement Unit 2 of the parent feature: schema-derived configured-value/document contracts, descriptor/document digests, fresh write-id-derived opaque secret locators, pure validation policy, and the application path-normalization port. This story validates and prepares values but performs no configuration or secret writes.

## Files

- `src/domain/configuration.ts` (export the existing authoritative key schema)
- `src/domain/configured-values.ts`
- `src/application/configuration-validation.ts`
- `src/application/ports/configuration-path.ts`
- corresponding domain/application tests

## Required behavior

- Configured-value variants derive exhaustively from the completed descriptor-kind registry.
- Strict documents bind `PluginConfigurationRef`, plugin, scope, descriptor digest, normalized non-sensitive values, opaque secret locators, and a verified CAS revision. Secret values are structurally impossible.
- Unknown/unsafe keys, wrong types, non-finite numbers, regex/bounds failures, required omissions, and conflicting unset/submission input fail before effects.
- Omitted sensitive keys preserve existing locators; explicit unset is allowed only for optional secrets. Sensitive defaults remain forbidden.
- File/directory values normalize through `ConfigurationPathPort` against an explicit trusted base and persist only canonical absolute `file:` URLs; adapters own native-path conversion and kind/existence semantics are typed.
- `SecretLocator` derives from scope/plugin/config ref/option key/fresh write id and reveals none of those fields in its text.

## Acceptance criteria

- [ ] All six descriptor kinds and every default/required/bounds/pattern branch have positive and adversarial tests.
- [ ] Document, descriptor, locator, and revision hashes are deterministic and reject forged claims.
- [ ] Sensitive values cannot serialize through documents, safe validation diagnostics, or exported result types.
- [ ] Relative paths cannot be stored or later resolved against ambient cwd.
- [ ] Future descriptor kinds break exhaustiveness until validation/persistence handling is added.
- [ ] Validation has no Node/filesystem/credential/runtime/Pi imports or writes.
