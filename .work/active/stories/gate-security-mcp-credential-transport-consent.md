---
id: gate-security-mcp-credential-transport-consent
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
