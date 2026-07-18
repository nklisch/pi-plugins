---
id: epic-native-plugin-management-packaged-host-composition-project-secret-identity-adapters
kind: story
stage: done
tags: [security, compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-host-contract-session-layout]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Bind Project Authority and OS Secret Custody

## Checkpoint

Implement the exact Pi project root/trust adapters and a safe concrete Linux Secret Service store over a package-private D-Bus client. Unsupported platforms or unavailable credential services remain explicit unavailable capabilities; no plaintext or CLI fallback is allowed.

## Planned files

- `src/pi/pi-project-context.ts`
- `src/infrastructure/project/node-project-root-resolver.ts`
- `src/infrastructure/secrets/create-platform-secret-store.ts`
- `src/infrastructure/secrets/dbus-secret-service-client.ts`
- `src/infrastructure/secrets/linux-secret-service-store.ts`
- `src/infrastructure/secrets/unavailable-secret-store.ts`
- `package.json`, `package-lock.json`
- `test/pi/pi-project-context.test.ts`
- `test/infrastructure/secrets/linux-secret-service-store.test.ts`
- `test/contract/platform-secret-store.contract.ts`

## Required behavior

- Resolve only the actual bound `ctx.cwd`; canonicalize through realpath and derive repository identity from local Git common-directory identity when available, else explicit path-only identity.
- `createProjectRootAuthorityPort` remains the only trusted-root capability issuer; copied/serialized/other-session capabilities fail.
- Project trust is available only for the exact current project key while Pi reports that binding trusted.
- Linux uses an exact-lockfile-pinned `dbus-next` transport and negotiates the Secret Service encrypted D-Bus session algorithm without plain-session downgrade; prompt-required/headless operations remain unavailable.
- Atomic no-replace uses `CreateItem(..., replace=false)` plus a random owner nonce inside the encrypted value envelope. Creation evidence is issued only after the returned item proves that nonce, and `removeOwned` re-verifies it before deletion, so concurrent losers and stale evidence cannot remove a winner/replacement.
- Secret plaintext travels only through short-lived adapter buffers and `SensitiveValue`; never D-Bus attributes/labels, argv, environment, error text, status, logs, state, projection, or journal. Buffers are zeroed after handoff.
- macOS/Windows/missing/locked/session-bus providers return unavailable/adapter failure without a CLI, file, environment, Pi-setting, SQLite, or plaintext-session fallback.

## Acceptance evidence

- [ ] Repository replacement, cwd/session drift, path-only, moved/symlinked root, trust revocation, and capability forgery are denied.
- [ ] Secret-store conformance, two real-client writers, collision ownership, missing/duplicate item, lost response, owned cleanup, abort, prompt, and provider disappearance are covered.
- [ ] Leak canaries inspect D-Bus attributes/labels, errors, causes projected to JSON, logs, host status, state, and compiled declarations.
- [ ] Non-sensitive startup remains usable when credentials are unavailable; sensitive activation fails explicitly.

## Ordering constraint

May proceed beside durable state after host contracts. Runtime selection depends on its exact project/trust and credential boundaries.

## Implementation notes

- Added exact Pi-bound project composition over canonical real paths, optional local Git common-directory device/inode identity, the existing opaque project-root authority, and live conjunctive Pi trust.
- Added a pinned `dbus-next` dependency and a package-private encrypted Secret Service client using the required DH/AES session algorithm only. Fixed labels/attributes contain no values; prompt/locked/session failures fail closed.
- Added the Linux `SecretStore` adapter with random nonce envelopes, verified creation evidence, exact-item owned deletion, zeroed byte buffers, collision isolation, and explicit unavailable adapters for missing/unsupported providers. No CLI, file, environment, settings, SQLite, or plain-session fallback exists.
- Verification: project/root/path and secret custody suites passed (5 tests); `npm run typecheck` and `npm run boundaries` passed.
