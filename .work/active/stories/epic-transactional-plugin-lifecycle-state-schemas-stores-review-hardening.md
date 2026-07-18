---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-contract-hardening]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Harden Persisted Evidence and Corruption Boundaries

## Scope

Resolve all accepted blocker and important findings from the state-contract feature's two-model deep review.

## Required fixes

- Do not persist an unrestricted `NormalizedPlugin` or other opaque runtime declarations in authoritative installed state. Define a strict persisted evidence summary derived from the normalized bundle that retains identities, component ids/kinds, immutable source/content references, compatibility/trust comparison fingerprints, and safe structural facts only. Raw MCP/foreign declarations, literal headers/auth values, expanded environment/path values, generated projection paths, and other secret/machine-local payloads must be absent. Later projection generation may re-inspect the immutable content reference; state must not become a raw declaration store.
- Verify an expected document digest against the exact raw canonical document before migration/record isolation. After integrity succeeds, isolate identifiable invalid records without comparing the cleaned representation to the raw digest. Digest mismatch remains fatal and yields no snapshot.
- Make SHA-256/canonical-evidence verification mandatory at every public mutation-validation path. `parseStateMutation` must not accept unverifiable trust subjects, references, content evidence, or installed records when a verifier is omitted; remove the optional bypass or require a verifier dependency object.
- Treat missing, malformed, or otherwise unidentifiable record keys as fatal at the smallest enclosing document. Record-level quarantine is permitted only when identity remains safely attributable. Duplicate identities remain fatal/quarantine-all according to the designed invariant, never file-order precedence.
- Replace free-form public corruption `schemaPath`/`message` strings with a schema-enforced safe projection: registry codes, document/scope, optional validated record identity and bounded JSON Pointer or field id, and fixed safe summaries. Native causes, raw values, physical paths, tokens, configured values, and arbitrary caller messages must be unrepresentable.
- Add direct regressions for all five review reproducers plus mixed sibling isolation, digest-before-isolation, mutation verification, and serialized canary exclusion.

## Acceptance criteria

- [ ] Installed state cannot serialize raw credential/header/config/environment/projection/path payloads from normalized components.
- [ ] Raw document digest verification succeeds before identifiable-record isolation and mismatches remain fatal.
- [ ] Public mutation parsing cannot bypass canonical evidence verification.
- [ ] Unidentifiable records fail their document; identifiable corrupt siblings remain isolated.
- [ ] Public corruption/failure JSON cannot represent arbitrary messages, native causes, secrets, or physical paths.
- [ ] Existing valid state round trips, deterministic encodings, and scope isolation remain intact.
- [ ] Full `npm test`, build, boundaries, and exact compiled package import pass.

## Implementation notes

- Execution capability: direct-read, single-owner implementation; the caller explicitly prohibited agents and required stopping at review.
- Review weight: standard default, with the caller's explicit implementing-to-review boundary; no independent review agent was invoked.
- Files changed: `src/domain/state/installed-state.ts`, `src/domain/state/codec.ts`, `src/domain/state/project-state.ts`, `src/application/state-contract.ts`, `src/index.ts`, package export allowlist, and state contract tests.
- Tests added: `test/domain/state/review-hardening-repro.test.ts` directly covers all five reproducers, raw-digest ordering, sibling isolation, mutation verification, and serialized canary exclusion.
- Discrepancies from design: the earlier installed-record design embedded canonical normalized declarations and manifests; this hardening replaces them with strict evidence summaries, fingerprints, and immutable logical references as required by the review findings.
- Adjacent issues parked: none.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane state-hardening review. Independently confirmed 422 tests, clean typecheck and dependency boundaries, build, and exact 253-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
