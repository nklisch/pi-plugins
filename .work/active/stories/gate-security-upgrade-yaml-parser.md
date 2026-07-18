---
id: gate-security-upgrade-yaml-parser
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

## Root cause
The frontmatter reader bounded bytes and traversed the parsed AST iteratively only after `YAML.parseDocument`, but the exact runtime dependency was `yaml@2.8.1`, whose parser could exhaust the JavaScript stack on deeply nested untrusted input before those post-parse limits ran.

## Design
Pin the current fixed `yaml@2.9.0` release exactly and retain npm lockfile integrity. This release supports Node 24 (`node >=14.6`) and is newer than the advisory's fixed `2.8.3` floor. Add a child-process regression around the real Agent Skills frontmatter reader so a maximal deeply nested document must return a bounded schema diagnostic without process crash, uncaught stack exhaustion, or nondeterministic output.

Authoritative version evidence checked at implementation start: npm registry reports `yaml@2.9.0` with integrity `sha512-2AvhNX3mb8zd6Zy7INTtSpl1F15HW6Wnqj0srWlkKLcpYl/gMIMJiyuGq2KeI2YFxUPjdlB+3Lc10seMLtL4cA==` and Node engine `>=14.6`; the finding's GHSA-48c2-rrv3-qjmp fixed floor is `2.8.3`. Direct-read dependency and focused regression work needs no delegated ownership.

## Acceptance checks
- `package.json` and `package-lock.json` resolve exactly `yaml@2.9.0` with the registry integrity.
- Deeply nested untrusted frontmatter fails through the public reader contract in a child process and does not terminate from stack exhaustion.
- Existing valid frontmatter behavior, package receipts, Node 24 build, audit, and packed-package checks remain green.
