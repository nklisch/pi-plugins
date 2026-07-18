---
id: epic-native-plugin-management-trusted-installation-candidate-lease-disclosure
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-contracts-identifiers]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implementation notes

- Replaced the inspection-only scratch wrapper with one private `CandidateContentLeasePort`: acquisition owns one staging allocation, `claim` transfers it once, and idempotent `release` always uses a fresh cleanup signal.
- Native inspection now uses the lease port callback surface, retaining callback-scoped cleanup with no second materializer implementation.
- Added exact trusted-candidate acquisition over the selected catalog tuple. One retained materialization supplies bundle inspection, compatibility, installed-revision/configuration references, trust derivation, native detail, and consent binding.
- Consent reuses native safe source/component/requirement projections and now discloses declared MCP allow/deny/approval policy without remote tool discovery or secret-bearing values.
- Candidate failures release staging; successful acquisition intentionally retains the private lease for lifecycle transfer.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/trusted-install-candidate.test.ts test/composition/candidate-content-lease.test.ts test/application/native-candidate-inspection.test.ts test/application/native-inspection-disclosure.test.ts` — 12 passed.
