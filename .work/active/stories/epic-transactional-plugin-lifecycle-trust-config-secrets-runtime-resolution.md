---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-runtime-resolution
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy, epic-transactional-plugin-lifecycle-trust-config-secrets-secret-custody]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Trust-Gated Execution-Time Configuration Resolution

## Scope

Implement Unit 4 of the parent feature: a callback-scoped, redacted `ResolvedConfiguration` facade and resolver that verifies project/plugin trust, configured-document integrity, descriptor/path validity, and secrets immediately before a hook execution or MCP connection. Do not implement hook/MCP execution, activation, prompts, or caching.

## Files

- `src/application/resolved-configuration.ts`
- `src/application/configuration-resolver.ts`
- corresponding application tests

## Required behavior

- Resolution verifies exact project trust when applicable, exact granted plugin trust, config ref/scope/plugin/descriptor/revision integrity, non-secret values, and current path existence/kind before fetching credentials.
- Required missing secrets fail with `CONFIG_SECRET_MISSING`; optional missing secrets are omitted. Adapter failure never degrades to missing/empty/default.
- Only exact `${user_config.KEY}` placeholders are substituted. Unknown/missing required references fail; environment keys derive from valid descriptors and values serialize deterministically by kind.
- Secret/plain configured values live only inside a non-serializable callback facade. It is disposed in `finally` on success, error, and abort, and never returned/persisted/cached.
- Each runtime start/connection invokes the resolver anew so credential deletion and path drift are observed.

## Acceptance criteria

- [ ] No callback runs without current project trust and exact granted trust evidence.
- [ ] Forged/stale/wrong-scope documents and descriptor drift fail before credential exposure.
- [ ] Required/optional missing, adapter failure, path drift, placeholder, environment, callback error, and abort branches are tested.
- [ ] Facade coercion/JSON/errors/diagnostics/log spies never reveal plaintext.
- [ ] Resolver imports only domain/application ports and does not implement runtime activation or backend behavior.
