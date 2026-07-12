---
id: epic-foreign-plugin-model-compatibility-reporting-review-hardening
kind: story
stage: implementing
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-compatibility-reporting
depends_on: [epic-foreign-plugin-model-compatibility-reporting-contract-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden Hook and MCP Default-Deny Semantics

## Scope

Resolve all accepted blocker and important findings from the compatibility-reporting feature's two-model review.

## Required fixes

- Replace the non-empty-string hook-condition check with registry-defined recognized grammar. Unknown or malformed condition syntax must yield an incompatible component assessment and `UNSUPPORTED_DECLARATION`, never optimistic support.
- Validate MCP OAuth flow declarations as mutually coherent. Multiple conflicting flows, malformed nested records, and unsupported flow spellings must be incompatible rather than selecting the first recognized branch.
- Validate recognized MCP feature payloads—including tool approval, sampling, elicitation, OAuth, headers, and related nested flags—against exact value shapes and primitive types before deriving requirements. Invalid `enabled`/`required` values or ambiguous shapes default incompatible.
- Extend compatibility fixtures with explicit expected positive and negative outcomes per rule: verdict, activatable, diagnostic code, requirement ids/status, and safe provenance. The registry table contract must assert both sides and fail if negative fixtures merely instantiate.
- Include arbitrary hook-condition strings, ambiguous OAuth, malformed feature payloads, conflicting transports, and nested unknown keys in the negative matrix.

## Acceptance criteria

- [ ] Only registry-recognized hook-condition syntax is supported; arbitrary strings are incompatible.
- [ ] Ambiguous/malformed OAuth and MCP feature shapes are incompatible with explicit diagnostics.
- [ ] Valid MCP shapes continue to derive the correct supported verdict and requirements.
- [ ] Every positive and negative fixture asserts its complete expected outcome rather than identity alone.
- [ ] Foundation compatibility claims and implementation agree.
- [ ] Full `npm test`, build, boundaries, and exact compiled package import pass.
