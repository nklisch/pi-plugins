---
id: epic-skills-hook-runtime-projection-reload-evidence-integration-hardening
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-projection-reload-evidence
depends_on: [epic-skills-hook-runtime-projection-reload-evidence-contribution-observation]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Harden Projection-to-Observation Integration

## Checkpoint

Implement Unit 4 of the parent design. Converge cache, post-commit root resolution, current-project trust, atomic skill/hook catalogs, and two-participant lifecycle observation through real adapters and the package boundary. Use a minimal fake MCP contribution only to prove the shared binding/composition rule; do not interpret MCP or implement its runtime.

This checkpoint also owns public export and dependency boundaries. It must not expose cache filenames, mutable catalog internals, raw path/root codecs, state/transition readers, a reload implementation, or component-specific activation APIs.

## Files

- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/skill-hook-runtime-projection.test.ts`
- `test/integration/plugin-lifecycle.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- rolling foundation documents only if implementation makes current assertions stale

## Required behavior

- Exercise prepare before promotion and exact content/data resolution only after a commit-shaped handoff.
- Round-trip one realistic complete skill/hook/MCP projection and prove the unchanged MCP inventory reaches the fake sibling while skill/hook code never interprets it.
- Prove update, disable, user/project isolation, current-project change/trust revocation, corruption, collision, participant mismatch, and cancellation outcomes.
- Export only stable schema-derived cache/snapshot/contribution contracts, reader/catalog/participant boundaries, factories, and composition verifier.
- Keep application contracts independent of Node/runtime/Pi and prevent runtime projection code from importing authoritative state ports.

## Acceptance evidence

- [ ] Complete active evidence is produced only after exact skill/hook and MCP observations agree; exact inactive tombstone evidence requires both participants.
- [ ] Update cannot alias old/new revisions or complete digests; disable cannot pass from successful invocation or one component slice.
- [ ] User/project copies, current project identity, and trust remain explicit and isolated across integration cases.
- [ ] Every corruption/error/cancellation case has a typed non-success result and preserves previous or recoverable lifecycle behavior.
- [ ] Public/compiled allowlists and dependency canaries exclude every forbidden authority, path, pointer, reload, and mutable-catalog surface.
- [ ] Full `npm test` passes and records evidence relative to the stated starting baseline: 122 test files / 653 tests / 438 exports.

## Ordering

Blocked by `epic-skills-hook-runtime-projection-reload-evidence-contribution-observation`; integration cannot claim whole-bundle evidence until the common two-participant contract exists.

## Implementation notes
- Execution capability: GPT-5.6 Luna xhigh; integration and package-boundary work stayed with the feature owner because the cache, snapshot, catalog, composition, and lifecycle contracts must be verified together.
- Review weight: standard, from project convention; this child checkpoint is verified directly and does not enter review.
- Files changed: `src/index.ts`, `.dependency-cruiser.cjs`, `test/integration/skill-hook-runtime-projection.test.ts`, `test/integration/plugin-lifecycle.test.ts`, `test/integration/content-promotion.test.ts`, `test/public-api.test.ts`, `test/compiled-package-import.mjs`.
- Tests added/updated: realistic prepare → promote → post-commit resolve → reconcile → two-participant active/inactive evidence integration, public export assertions, and existing integration fixtures for generated-root capabilities and current-project evidence.
- Simplification: public exports expose only schema-derived contracts, read-only catalog/participant boundaries, factories, and pure composition; codec functions, filesystem cache factory, mutable catalog, paths, and MCP policy remain private.
- Discrepancies from design: test/package evidence is 128 files / 663 tests / 447 compiled exports versus the stated 122 / 653 / 438 baseline; all changes are additive coverage/contracts.
- Adjacent issues parked: none.
- Verification: full `npm test` passed — typecheck, dependency boundaries, 128 Vitest files / 663 tests, build, and compiled package import (447 exports).
