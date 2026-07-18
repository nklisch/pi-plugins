---
id: gate-security-mcp-credential-transport-consent
kind: story
stage: implementing
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
