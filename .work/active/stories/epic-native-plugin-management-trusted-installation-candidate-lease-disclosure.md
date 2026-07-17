---
id: epic-native-plugin-management-trusted-installation-candidate-lease-disclosure
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-contracts-identifiers]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Lease one exact candidate and disclose its executable surface

## Checkpoint

Resolve only an exact scope/registration/candidate/catalog snapshot, acquire one verified single-transfer materialization lease, inspect the complete bundle, derive compatibility/revision/configuration/trust bindings, and project safe install consent through the existing native inspection disclosure and diagnostics boundary.

## Files

- `src/application/ports/candidate-content-lease.ts`
- `src/application/trusted-install-candidate.ts`
- `src/application/native-candidate-inspection.ts`
- `src/application/native-inspection-disclosure.ts`
- `src/application/native-inspection-contract.ts`
- `src/composition/candidate-content-lease.ts`
- `src/composition/inspection-candidate-content.ts`
- `test/application/trusted-install-candidate.test.ts`
- `test/application/native-candidate-inspection.test.ts`
- `test/application/native-inspection-disclosure.test.ts`
- `test/composition/candidate-content-lease.test.ts`

## Acceptance evidence

- Candidate resolution has no name/latest/cross-scope fallback and every resolved field is cross-checked.
- One materialization feeds inspection, trust, consent, and lifecycle; claim is single-use and release is idempotent on all exits.
- Acquired marketplace-relative and external candidates continue offline; failed acquisition creates no resumable session.
- Skill, hook, MCP, persistent-data, tool-policy, requirement, and subagent facts are safe and complete without remote MCP discovery.
- Header/query/bearer/configuration values stay redacted while exact declaration changes invalidate trust and consent digests.
