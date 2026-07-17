---
id: epic-native-plugin-management-inspection-diagnostics-installed-runtime-inspection
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-safe-display-redaction, epic-native-plugin-management-inspection-diagnostics-snapshot-evidence]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Project installed readiness and runtime health

## Checkpoint

Project selected immutable installed evidence, current compatibility, exact trust/configuration readiness, lifecycle transition/recovery state, skill/hook and MCP contribution observations, MCP live server health, and update memory through the common safe schemas. Preserve activation-versus-health and unavailable/degraded/blocked distinctions.

## Files

- `src/application/native-installed-inspection.ts`
- `test/application/native-installed-inspection.test.ts`
- `test/composition/native-inspection-readiness.test.ts`

## Acceptance evidence

- Enabled/disabled/pending/recovery/active/unavailable states follow fixed authority precedence and never claim partial activation.
- Skill/hook and MCP local evidence matches exact component/revision/projection identities.
- MCP remote needs-auth/failure degrades live health after exact local registration without changing compatibility/activation.
- Trust/configuration views contain no values, locators, defaults, paths, or provider details.
- Update/adoption provenance and refresh state reuse existing evidence without network work.

## Implementation notes

- Added exact installed projection from authoritative `{scope, plugin, selectedRevision}` state and the immutable installed loader. Current compatibility is the existing evaluator over the captured capability snapshot; the stored fingerprint remains available when capture is unavailable.
- Fixed precedence is implemented as state/recovery, project trust, compatibility, plugin trust/configuration, local participant evidence, remote health, then update freshness. Enabled plugins require both exact participant matches; disabled plus exact inactive evidence is ready.
- Skill/hook evidence compares revision, projection digest, and sorted component IDs. MCP local registration compares source digest and exact component inventory; only after that match can `connected`/`needs-auth`/`failed` contribute live-health diagnostics.
- Configuration tests prove document values and secret locators are absent from serialized views, including hostile labels and unavailable secret custody.
- Verification: `npm run typecheck`; focused installed/readiness suites (6 tests), including pending recovery and activation-versus-remote-health behavior.
