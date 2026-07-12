---
id: epic-transactional-plugin-lifecycle-trust-config-secrets
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Trust, Configuration, and Secrets

## Brief

Define lifecycle policy and ports for source/revision/executable-surface trust, validated plugin configuration values, and operating-system-backed secret storage. Trust must bind to canonical marketplace and plugin source identity, immutable revision, and normalized executable component definitions; configured values must satisfy the completed descriptor contracts before activation.

Sensitive values pass directly through a dedicated secret-store boundary and are resolved only at execution or MCP connection time. This feature never places secret material in authoritative state, projections, journals, diagnostics, reports, or logs, and it does not render prompts, implement a credential backend, activate components, or decide automatic-update policy.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 2 safeguard — lifecycle operations consume its validated grants and secret references
- Depends on state schemas for durable non-secret trust/config references
- Required guarantees: scope, data, network, and ports guarantees in the parent epic

## Foundation references

- `docs/VISION.md` — Explicit trust
- `docs/SPEC.md` — Supporting plugin configuration; Trust and security; Enablement
- `docs/ARCHITECTURE.md` — Trust subject; Trust flow; State ports
- `docs/COMPATIBILITY.md` — Supporting plugin configuration; Whole-plugin behavior

## Existing contract references

- `src/domain/configuration.ts` — descriptor-only configuration contracts
- `src/domain/plugin.ts` — normalized executable inventory
- `src/domain/source.ts` and `src/domain/component-identity.ts` — source and component trust identities
- `src/domain/compatibility.ts` — complete report required before trust/activation

## Late-bound feature decisions

Trust-record schema, executable-surface fingerprint representation, grant/revoke semantics, non-sensitive configured-value storage shape, secret key naming, platform credential-adapter selection, missing-secret behavior, and update trust-diff presentation data remain for feature design. The presentation layer collects consent later; this feature exposes typed policy/results only.

## UI alignment

No UI surface in this feature. Trust and configuration interaction belongs to `epic-native-plugin-management`.
