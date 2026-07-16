---
id: epic-transactional-plugin-lifecycle-refresh-update-policy-contracts-state-comparison
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-refresh-update-policy
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Define durable update evidence and comparison

## Checkpoint

Evolve the existing host-config, installed-user, and project-local state families to v2 so scope-local refresh coordination and notification memory survive processes while automatic authority remains bound to exact declared marketplace/plugin source identities. Define immutable installed-versus-available comparison and declared-version display precedence without making display text revision authority.

## Scope

- Move the shared epoch-millisecond schema to `src/domain/time.ts` and have `LifecycleClock` re-export it, so state remains inward-only.
- Add pure stable source identity, available revision, claim ID, candidate key, comparison, and display-version contracts in `src/domain/update-policy.ts`.
- Add one shared marketplace update-record schema: host config owns user records; project-local state owns machine-local records derived from validated portable declarations and bound to the declaration digest.
- Add scope-local refresh claim/backoff and one-current-candidate notification memory, with strict source-change reset and local/manual defaults.
- Persist declared-version/source-revision labels and stable marketplace/plugin declaration identities in new installed evidence.
- Register deterministic v1→v2 state-family migrations. Where v1 cannot reconstruct a declared plugin source, emit `legacy-unavailable` and deny auto rather than infer.
- Point current codec, mutation, snapshot, coordinator, and registry contracts to v2 while retaining explicit v1 migration fixtures.
- Decouple historical marketplace-relative plugin revisions from the latest selected catalog snapshot; retain marketplace-name coverage and each revision's verified immutable binding.

## Acceptance evidence

- Equal declared/display version with a different immutable binding is `revision-changed`; equal immutable binding is `current`.
- Manifest version wins marketplace entry version, then source revision/version is display fallback only.
- Marketplace and plugin source changes remain distinct typed outcomes under equal names/versions/bytes.
- Host/installed/project v1 fixtures migrate deterministically; legacy source identity cannot authorize auto and does not disable installed content. Project v1 migration invents no source/policy record; normal portable sync populates it.
- New, local, and source-replaced config is manual. Source replacement clears claim/backoff and cannot carry automatic authority.
- Notification records are unique per scope/plugin, candidate-key verified, and contain no path, secret, adapter, timer, PID, or native error.
- State/codec/mutation tests and deterministic serialization remain green.

## Ordering

This is the root checkpoint. Refresh must not publish network evidence or schedule work until these durable identities and memory transitions exist.
