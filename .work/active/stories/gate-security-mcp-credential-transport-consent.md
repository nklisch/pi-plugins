---
id: gate-security-mcp-credential-transport-consent
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

# Protect MCP credentials and disclose endpoints

## Severity
Medium

## Domain
MCP transport / secrets / consent

## Location
`src/domain/mcp-launch-template.ts:112`

## Evidence
HTTP and HTTPS templates are accepted, and credential-bearing headers or bearer tokens can resolve without requiring HTTPS. Install consent currently exposes transport and host but omits scheme, port, and path.

## Remediation direction
Require HTTPS whenever credentials are present. Permit plaintext HTTP only for explicitly approved unauthenticated loopback endpoints. Present the complete redacted endpoint—scheme, host, port, and path—in TUI and headless consent, preserving secret non-retention and exact workflow-token binding.

## Root cause
The canonical MCP plan tracked transport and authentication independently. Launch-template validation accepted both HTTP and HTTPS, and install consent projected only host/port/path from the endpoint. As a result, a credential-bearing HTTP declaration could remain compatible and the consent digest did not bind the operator-visible scheme.

## Design
Make endpoint transport safety a canonical MCP compatibility and launch-template invariant: remote HTTP is incompatible, HTTPS is required whenever headers, bearer selectors, OAuth, sensitive query references, or configuration-derived endpoint values can carry credentials, and plaintext HTTP is limited to unauthenticated literal loopback endpoints explicitly marked for local plaintext use. Keep that approval in the normalized launch/projection contract so launch-time validation cannot diverge.

Extend the redacted endpoint view used by both TUI and native/headless/RPC responses to require scheme, host, effective port, and path while excluding userinfo, query, fragment, header values, tokens, and local path controls. Because the exact consent identifier hashes the complete executable candidate binding, include the endpoint disclosure digest in that binding so any endpoint presentation change invalidates stale consent. Direct-read implementation keeps schema, compatibility, projection, consent, and diagnostics changes coherent without nested ownership.

## Acceptance checks
- Credentials and secret-bearing templates fail over HTTP before projection or launch-value resolution.
- HTTP succeeds only for an explicit unauthenticated loopback declaration; non-loopback, omitted approval, headers, auth, query credentials, and expanded path/host controls fail closed.
- TUI and native/headless/RPC install consent render the same complete redacted scheme/host/effective-port/path.
- Consent tokens change with the disclosed endpoint set, and serialized diagnostics/results never contain secret values, userinfo, query, fragment, or filesystem canaries.

## Implementation notes
Execution capability: direct host implementation. Transport compatibility, launch schemas, projections, runtime value resolution, consent binding, native/RPC projection, and TUI rendering form one contract and were kept under one owner to prevent hand-copied policy.

Added `mcp-endpoint-security.ts` as the single endpoint authority. HTTPS endpoints may use late-bound secrets only in query values; scheme, host, port, and path are immutable before consent. Plain HTTP is accepted only for an unauthenticated literal loopback endpoint, and exact install consent is its approval. Remote HTTP, hostname loopback, mapped forms, headers, bearer/OAuth, secret query references, fragments, endpoint/path templates, userinfo, and encoded path controls fail compatibility before projection or launch.

The strict launch template carries `endpointSecurity`, source projection verifies auth coherence, and launch-time resolution rechecks the same endpoint policy. Native consent uses a dedicated MCP endpoint schema with required scheme, host, effective port, exact encoded path, and query-presence flag. Both TUI and RPC format the same redacted structure. A new `consentDisclosureDigest` in the prepared candidate binding hashes the complete projected component disclosure; exact consent IDs therefore change whenever the operator-visible endpoint set changes, while the executable-surface digest continues to bind raw declarations.

Files centered on:
- `src/domain/mcp-endpoint-security.ts`
- `src/domain/mcp-compatibility-plan.ts`
- `src/domain/mcp-launch-template.ts`
- `src/runtime/mcp/launch-value-provider.ts`
- `src/application/native-inspection-{contract,disclosure}.ts`
- `src/application/trusted-install-{candidate,contract,identifiers}.ts`
- Pi TUI/RPC consent renderers and MCP contract/integration tests

## Verification evidence
- Focused MCP compatibility, projection, launch-context, runtime, consent, TUI/RPC, adapter, and integration suites: 177 tests green.
- Credential, query, userinfo, path-control, and diagnostic canaries remain absent from durable/public output; environment selector names remain disclosure-only and values remain late-bound.
- `npm audit`: 0 vulnerabilities.
- `npm test`: 333 files / 1,648 tests; typecheck, boundaries, build, compiled API, and packed consumer green.
- `npm run test:e2e`: 17 files / 54 tests green; production subset 5 files / 10 tests green.

## Bounded inline review
Verdict: approve. No independent, fresh-context, or cross-model reviewer ran, per standalone-story policy. Core review checked compatibility/launch parity, HTTP negative controls, loopback literal handling, secret lifetime, schema strictness, disclosure completeness, consent-token binding, TUI/RPC parity, signed structure, and stale-consent behavior. Review tightened MCP path disclosure to preserve exact encoded bytes rather than visually aliasing `%2F` with a literal separator.

Residual limit: query values are intentionally omitted from presentation and represented only by `queryPresent`; their unexpanded declaration is still bound by executable trust evidence. Automatic updates continue to follow the existing explicitly granted marketplace update policy rather than opening a new interactive install session.
