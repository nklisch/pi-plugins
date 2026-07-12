---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-installed-project
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-scope-versioning]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Installed User and Project-Local State

## Scope

Implement Unit 3 of the parent design: generation, marketplace snapshot, installed revision/plugin, installed-user document, and project-local document schemas plus cross-field constructors.

Authoritative revision evidence directly reuses `Resolved*Source`, `NormalizedPlugin`, `CompatibilityReport`, `ContentManifest`, and materialization-binding contracts. Records contain logical references only. They contain neither generated projection contents nor physical paths, trust decisions, secret values, or recovery payloads.

## Files

- `src/domain/state/installed-state.ts`
- `src/domain/state/project-state.ts`
- `test/domain/state/installed-state.test.ts`
- `test/domain/state/project-state.test.ts`

## Implementation requirements

- Verify resolved source and content manifests through existing constructors/verifiers with injected `Sha256`.
- Require normalized plugin source, compatibility report identity, materialization binding/revision id, content/data/config refs, and selected revision to agree.
- Share installed plugin/revision schemas between scopes while keeping user and project envelopes independently versioned.
- Bind project-local state to the supplied verified project scope and portable declaration digest.
- Permit only an opaque `PendingTransitionRef`; do not define operation or journal payloads.
- Decode corrupt collections at plugin granularity; quarantine all duplicate keys.

## Acceptance criteria

- [ ] No lifecycle mirror of canonical source/plugin/content/report contracts exists.
- [ ] Forged hashes/bindings, mismatched identities/sources/references, duplicate revisions, and dangling selected revisions fail before write.
- [ ] User and project records for one plugin remain independently addressable and use distinct derived references.
- [ ] Serialized records contain no absolute paths, secret values, trust decisions, projection contents, expanded environment, reload evidence, timestamps, or native causes.
- [ ] Valid sibling plugins survive one corrupt plugin record; duplicate keys never gain file-order precedence.
- [ ] Project identity/key/context mismatch makes the project-local document unusable.
