---
id: epic-skills-hook-runtime-projection-reload-evidence-cache-contract
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-projection-reload-evidence
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Build the Complete Projection Cache Contract

## Checkpoint

Implement Unit 1 of the parent design: one deterministic `projection.json` cache containing the complete schema-validated `PluginRuntimeProjection`, plus the generated-root contract needed to publish, discard, resolve, and decode it safely. Preserve `PluginRuntimeProjection.digest` and `ProjectionRootRef` as the scope/plugin/complete-bundle identity. Add a separate payload-tree digest for cache integrity; never substitute it for lifecycle evidence.

This checkpoint implements the existing `RuntimeProjectionPort.prepare` seam. It does not resolve plugin/data roots, activate components, read authoritative state, invoke reload, or interpret MCP entries.

## Files

- `src/application/runtime-projection-cache.ts`
- `src/application/ports/runtime-projection.ts`
- `src/application/ports/content-store.ts`
- `src/infrastructure/filesystem/runtime-projection-cache.ts`
- `src/infrastructure/filesystem/runtime-root-store.ts`
- focused application/infrastructure tests named in the parent

## Required behavior

- Canonically encode the complete projection and reject noncanonical, malformed, oversized, or mismatched cache bytes.
- Extend generated-root metadata with independently verified `projectionDigest` and `payloadDigest`; keep the ref derived from projection digest only.
- Add exact projection-root discard and resolve operations to the existing injected root port.
- Handle identical publication races by full verification and same-ref/different-payload as collision without overwrite.
- Clean only owned pre-publication allocations on failure/abort; preserve inspectable post-publication ambiguity.
- Keep cache filenames, raw filesystem helpers, metadata codec, and allocation cleanup private.

## Acceptance evidence

- [ ] Complete skill/hook/MCP projections round-trip canonically and MCP-only changes alter the complete digest/ref.
- [ ] Forged logical digest, payload digest, ref, scope, plugin, revision, metadata, bytes, controls, modes, extra entries, and UTF-8/JSON/schema forms fail without returning a projection.
- [ ] Concurrent exact prepares converge; different content under one identity reports collision and preserves the winner.
- [ ] Abort and write/seal failures have explicit cleanup/ambiguity behavior with no leaked path or native cause in diagnostics.
- [ ] Existing lifecycle callers still use only `RuntimeProjectionPort.prepare`; no alternate projection or reload protocol appears.
- [ ] Focused tests and the existing generated-root suite pass before the next checkpoint begins.

## Ordering

No child dependency. This contract must finish before snapshot resolution can consume a verified cache or resolved generated root.

## Implementation notes
- Execution capability: GPT-5.6 Luna xhigh; one cohesive feature-owner pass because cache publication, generated-root integrity, and lifecycle preparation share one write boundary.
- Review weight: standard, from project convention; this child checkpoint is verified directly and does not enter review.
- Files changed: `src/application/runtime-projection-cache.ts`, `src/application/ports/content-store.ts`, `src/infrastructure/filesystem/runtime-projection-cache.ts`, `src/infrastructure/filesystem/runtime-root-store.ts`, `src/infrastructure/filesystem/create-content-store.ts`.
- Tests added/updated: canonical cache codec and filesystem prepare/read coverage; existing generated-root suite remains green (13 focused tests total).
- Simplification: retained one generated-root publication path and one complete `projection.json`; no component cache or runtime pointer was introduced.
- Discrepancies from design: legacy lifecycle-only generated-root requests may omit `payloadDigest`; the filesystem adapter normalizes that input for existing callers, while all newly published metadata and cache paths carry and verify distinct `projectionDigest` and `payloadDigest` fields.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`; focused Vitest suites for cache codec, filesystem cache, and generated roots — 3 files / 13 tests passed.
