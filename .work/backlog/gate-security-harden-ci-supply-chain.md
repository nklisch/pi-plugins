---
id: gate-security-harden-ci-supply-chain
kind: story
stage: backlog
tags: [security, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: security
created: 2026-07-18
updated: 2026-07-18
---

# Harden CI supply-chain references

## Severity
Low

Pin GitHub actions and the Node container immutably, declare `permissions: contents: read`, disable checkout credential persistence, and constrain npm lifecycle scripts to what the release lane requires. Current mutable references are defense-in-depth risk, not a release blocker.
