---
id: fix-runtime-projection-digest-mismatch-blocks-activation
kind: story
stage: done
tags: [runtime, compatibility, reliability]
parent: null
depends_on: []
release_binding: null
created: 2026-07-19
updated: 2026-07-19
---

# Runtime rebuild dropped marketplace policy, diverging projection digests

Fixed 2026-07-19. This was the deepest cause of "installs never show up".

## Symptom

Every install of a plugin whose marketplace entry carried an installation
`policy` (all nklisch/skills entries do) committed its transaction, then
stranded in `recovery-required` with an orphaned journal transition and an
installed-state record that never appeared. Installs of policy-less entries
(trivial fixtures, single-root catalogs) succeeded.

## Root cause

`createRuntimeDesiredState` (src/composition/runtime-desired-state.ts)
re-assessed compatibility via `compatibility.assess({ plugin })` WITHOUT the
marketplace entry's `marketplacePolicy`, while every candidate-time path
(native-candidate-inspection, trusted-install-candidate,
plugin-candidate-preparation, marketplace-plugin-probe) assesses WITH it. For
policy-bearing entries the two reports differ, so the runtime projection
digest never matched the install-time expectation, the skill/hook participant
observation failed OBSERVATION_MISMATCH, and the lifecycle transaction could
only end `recovery-required` — a transition startup recovery cannot finalize
because no installed record with `pendingTransition` exists to reconcile.

## Fix

The runtime rebuild now uses the stored install-time compatibility report
(`loaded.compatibility` from the installed-revision descriptor) instead of a
fresh policy-less assessment. The installed-plugin-loader contract already
promises "the same complete evidence used by installation", so projection
digests match by construction.

## Verification

Scratch RPC repro against the live `nklisch/skills` marketplace:
`add agile-workflow@nklisch-skills` and `add krometrail@nklisch-skills` both
return `succeeded` (previously `recovery-required` / selection failure).

## Follow-up

The failure was invisible end-to-end: five layers (control envelope, lifecycle
result, broker ticket, participant observation, safeFailure sanitization) each
discarded the underlying error. See fix-silent-install-failure-diagnostics.
