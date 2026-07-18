---
id: gate-security-upgrade-yaml-parser
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

# Upgrade the vulnerable YAML parser

## Severity
Medium

## Domain
Dependency security / denial of service

## Location
`package.json:54`

## Evidence
The runtime pins `yaml@2.8.1`. GHSA-48c2-rrv3-qjmp reports stack exhaustion from deeply nested YAML before 2.8.3. Untrusted Agent Skills frontmatter reaches `YAML.parseDocument` before the host's post-parse depth traversal.

## Remediation direction
Upgrade and lock a fixed current YAML release, retain exact dependency provenance, and add an adversarial deeply nested frontmatter regression that fails safely without process-level stack exhaustion.
