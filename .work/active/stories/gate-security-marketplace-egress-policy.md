---
id: gate-security-marketplace-egress-policy
kind: story
stage: drafting
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
