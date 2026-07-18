---
id: epic-skills-hook-runtime-skill-discovery-pi-adapter
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: [epic-skills-hook-runtime-skill-discovery-resource-set]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Bind verified resources to Pi discovery and shutdown

## Checkpoint

Register the host-neutral resource service against Pi 0.80.8's exported `resources_discover` and `session_shutdown` contracts. Forward exact startup/reload reason and live project trust, return only skill paths, and use one extension-instance lifetime controller because Pi supplies no event-scoped discovery signal.

## Files

- `src/pi/skill-resource-discovery.ts`
- `package.json`
- `package-lock.json`
- `test/pi/skill-resource-discovery.test.ts`

## Constraints

- Import `ExtensionAPI`, `ResourcesDiscoverEvent`, and `ResourcesDiscoverResult` from `@earendil-works/pi-coding-agent`; do not hand-copy event types.
- Add Pi as peer dependency `"*"` and exact 0.80.8 development contract; production imports remain type-only and Pi is not bundled.
- The resource handler returns `{ skillPaths }` only. No prompt/theme values, commands, UI, settings, state, reload invocation, or copied files.
- Sample `ctx.isProjectTrusted()` on every event. Validate the event/context cwd agreement without inventing a second project identity.
- Abort the owned controller idempotently on `session_shutdown`. Do not use normally undefined idle `ctx.signal` as a fake cancellation guarantee.
- Known per-target failures return healthy paths and stay in lifecycle observation. Global failure/cancellation returns no stale path list and exposes only a safe code.

## Acceptance evidence

- [ ] A typed fake Pi API captures exactly one resource and one shutdown handler with current exported signatures.
- [ ] `startup` and `reload` plus true/false project trust reach the host-neutral request unchanged.
- [ ] Ready discovery returns the exact array and no other resource kind.
- [ ] Shutdown abort prevents a pending old-instance discovery from publishing success.
- [ ] Target failure preserves unrelated paths; global failure and cancellation do not leak absolute roots or prior results.
- [ ] The adapter does not call UI, settings, state, reload, commands, or a skill parser.

## Ordering

Depends on the complete resource-set service. Full fake-host/lifecycle integration follows this checkpoint.

## Implementation notes
- Execution capability: GPT-5.6 Luna, high; narrow typed Pi host adapter with explicit extension-lifetime cancellation.
- Review weight: standard, source: project convention; child checkpoints do not enter review.
- Files changed: `src/pi/skill-resource-discovery.ts`, `package.json`, `package-lock.json`, and `test/pi/skill-resource-discovery.test.ts`.
- Tests added/updated: exact handler registration, startup/reload and trust forwarding, healthy-path preservation, safe global failure, cwd validation, and shutdown cancellation.
- Simplification: the adapter returns only `skillPaths`; it has no Pi settings, UI, command, state, reload, or native parser path.
- Discrepancies from design: Pi 0.80.8's root barrel does not export the named `ResourcesDiscoverEvent`/`ResourcesDiscoverResult` aliases. The adapter uses the root `ExtensionAPI.on` overload for contextual typing instead of copying private aliases or importing an unexported subpath; runtime behavior remains the exact typed event contract.
- Adjacent issues parked: none.
- Verification: source typecheck and focused Pi adapter suite pass; runtime test typechecking remains disabled for the focused run because the design branch's pre-existing test typecheck baseline is already non-green under TypeScript 7.
- Stage transition: implementing -> done; implementation commit `implement: epic-skills-hook-runtime-skill-discovery-pi-adapter`.
