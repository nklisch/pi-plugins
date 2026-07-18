---
id: gate-security-marketplace-egress-policy
kind: story
stage: done
tags: [security]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: security
created: 2026-07-18
updated: 2026-07-18
---

# Enforce marketplace network egress policy

## Severity
Medium

## Domain
Marketplace acquisition / network trust

## Location
`src/application/marketplace-plugin-probe.ts:58`

## Evidence
Catalog-derived sources can be materialized before plugin identity validation. Source schemas allow arbitrary HTTPS/SSH Git and HTTPS registry hosts, while Git acquisition can retain credential helpers, SSH agent access, and user SSH configuration.

## Remediation direction
Enforce policy before catalog-derived network access: block loopback, link-local, private, and DNS-rebinding destinations by default; require exact explicit approval for private enterprise origins; and prevent ambient Git/SSH credentials from reaching origins without separate approval. Add redirect, DNS-resolution, IPv4/IPv6, and credential-canary tests.

## Root cause
Remote source schemas established syntax and source identity, but the production materializer passed those declarations directly to Git and HTTPS adapters. Git inherited host credentials, SSH configuration, agents, and proxies, while neither adapter owned a destination policy or a DNS-pinned connection contract. Catalog entry authority therefore became network authority before the entry received install consent.

## Design
Add one Node infrastructure egress policy that canonicalizes exact HTTPS/SSH authorities, classifies literal and resolved IPv4/IPv6 addresses, and returns a DNS-pinned target. Public targets are allowed by default; RFC-private targets require an exact configured origin; loopback, link-local, mapped-private, and other special ranges always fail. Git and npm/HTTPS acquisition consume the approved target before process or request creation, disable cross-authority redirects by default, always disable ambient proxies because they bypass pinning, and separately require exact credential authority before ambient configuration can participate. Local Git and marketplace-relative copies stay offline.

The production path uses DNS pinning (Git curl resolution / SSH host override and Node HTTPS lookup binding) rather than treating a DNS preflight as proof. Injected test adapters remain trusted ports but still receive the same pre-request policy decision. Direct-read implementation is appropriate because source materialization already has one cohesive Node composition boundary.

## Acceptance checks
- Host normalization rejects userinfo, alternate IPv4 spellings, IPv4-mapped IPv6, private/special ranges, and rebinding to a forbidden address before Git/fetch execution.
- Exact private-origin approval does not imply credential approval; ambient proxies remain disabled because they would evade address pinning.
- Git HTTPS redirects stay disabled; bounded HTTPS redirects stay on the approved authority unless an exact redirect authority is configured.
- Unapproved Git targets cannot see credential helpers, SSH agent/config/identity defaults, or ambient proxy settings; approved enterprise authorities retain explicitly granted credential access.
- Offline startup and local/marketplace-relative source materialization do not resolve DNS or contact the network.

## Implementation notes
Execution capability: direct host implementation. The work crossed one cohesive Node acquisition boundary and needed tightly coordinated Git, HTTPS, composition, and security-test changes; splitting ownership would have increased contract drift.

Implemented one exact-origin egress authority in `src/infrastructure/network/network-egress-policy.ts`. It canonicalizes HTTPS, SSH URI, and SCP authorities; normalizes alternate IPv4 spellings; classifies IPv4, IPv6, mapped IPv4, reserved hostnames, and DNS answers; pins one deterministic approved address; and keeps private, credential, and redirect approvals independent. Packaged hosts accept exact approval arrays from source options or strict JSON environment arrays. Local and marketplace-relative sources remain offline.

Git acquisition now authorizes before starting a process, clears inherited DNS overrides, pins HTTPS through `http.curloptResolve`, pins SSH through `HostName`/`HostKeyAlias`, disables redirects and every ambient proxy, and isolates credential helpers, extra headers, global/system Git config, SSH config, identities, and agents unless the exact source origin has credential authority. The production bounded HTTPS path binds Node TLS lookup to the approved address and checks redirect authority before resolving the target; credentials are resolved separately on each approved hop.

The regression suite covers URL normalization, decimal/hex/short IPv4, IPv4-mapped IPv6, private/loopback/link-local/documentation ranges, adjacent public negative controls, mixed and changed DNS answers, exact private/credential/redirect authorities, Git HTTPS/SSH pinning, credential and proxy canaries, and no Git/fetch/content writes before policy. The packed E2E TLS fixture uses the same production policy with one exact loopback origin approval.

During full E2E verification, existing distinct-registration contention exposed an authoritative commit that could be reported ambiguous after a concurrent generation advanced. `bc2809d` adds safe source-and-snapshot reconciliation: exact durable authority returns idempotent `unchanged`; genuinely unproven outcomes remain indeterminate.

Files centered on:
- `src/infrastructure/network/network-egress-policy.ts`
- `src/infrastructure/git/git-source-acquirer.ts`
- `src/infrastructure/http/bounded-fetch.ts`
- `src/infrastructure/source/create-source-materializers.ts`
- `src/application/marketplace-registration-service.ts`
- corresponding infrastructure, integration, and packed E2E harness tests

## Verification evidence
- Focused network/Git/HTTP/source suites: green, including real Git subprocess and production materializer paths.
- `npm audit`: 0 vulnerabilities.
- `npm test`: 333 files / 1,648 tests; typecheck, dependency boundaries, build, compiled imports, and isolated packed Pi consumer all green.
- `npm run test:e2e`: 17 files / 54 tests green, including multiprocess contention, failure, fuzz, golden, infrastructure, and production paths.
- `npm run test:e2e:production`: 5 files / 10 tests green; also included in the final full E2E pass.

## Bounded inline review
Verdict: approve. No independent, fresh-context, or cross-model reviewer ran, per standalone-story policy. Core review checked policy-before-I/O ordering, IP range accuracy, DNS/redirect pinning, credential/proxy isolation, cancellation, deterministic output, private enterprise approval, offline startup, and public API boundaries. Review found and fixed overly broad neighboring IPv4 range blocks and inherited list-valued Git DNS overrides before final verification.

Residual limit: injected custom `fetch` remains a trusted host/test adapter and cannot be forced to use Node's pinned socket; the packaged production path uses the pinned Node HTTPS implementation. Git/OpenSSH clients that do not support the required pinning/isolation options fail closed rather than falling back.
