---
id: gate-security-marketplace-egress-policy
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
