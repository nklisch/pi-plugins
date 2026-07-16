---
id: epic-skills-hook-runtime-skill-discovery-integration-hardening
kind: story
stage: done
tags: [compatibility, infra, tests]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: [epic-skills-hook-runtime-skill-discovery-pi-adapter]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Prove Pi collision authority and lifecycle removal

## Checkpoint

Integrate real immutable content/projection/snapshot/path services with a typed fake Pi resource lifecycle, the final observed participant, and Pi's exported native `loadSkills`. Prove trust, update, disable, uninstall, corruption, cancellation, complete projection evidence, and the intended package boundary in one coherent matrix.

## Files

- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/pi-skill-resource-discovery.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- Foundation documents only when implementation makes an existing assertion stale

## Constraints

- The fake models Pi's full resource reset before reload; it must not preserve extension paths by accident or copy Pi's collision parser.
- Use Pi's exported `loadSkills` for native validation/collision evidence. Plugin Host returns same-name different files and accepts Pi's first ordered winner/diagnostic.
- Exercise real immutable publication and manifest-backed verification for successful, missing, escaping, and mutated paths; inject only failures that cannot be portable filesystem fixtures.
- Complete `skills-hooks` observation still requires exact source/resource evidence and an independent MCP observation.
- Public exports include only stable logical schemas/contracts/final composition factory. Keep absolute paths, filesystem/Pi adapters, mutable registries, fake host, state readers, and reload implementation private.
- Compare full verification totals to the current 128 test files / 674 tests / 447 exports baseline and record intentional changes.

## Acceptance evidence

- [ ] Trusted user plus matching project startup contributes direct immutable skill files in stable user-first order with support assets left in place.
- [ ] Real Pi loading reports a same-name collision and keeps the first path; Plugin Host emits both paths and no competing name verdict.
- [ ] Project trust revocation and project switch reloads remove stale project paths while preserving user paths/evidence.
- [ ] Update reload removes the old revision path and observes only the new complete digest; stale expectation fails.
- [ ] Disable and uninstall remove target paths/ownership, compose exact inactive source/resource evidence, and still require MCP inactivity.
- [ ] Missing, escaping, unreadable, and digest-mutated skill documents fail their complete target without suppressing an unrelated plugin.
- [ ] Cancellation returns no paths/final observation; a fresh runtime retry succeeds.
- [ ] Typecheck, dependency boundaries, Vitest, build, exact compiled import, and public negative assertions all pass.

## Ordering

Final checkpoint after the Pi adapter. It is the feature-level acceptance and public-boundary evidence, not a separate implementation owner by default.

## Implementation notes
- Execution capability: GPT-5.6 Luna, high; integrated runtime/public-boundary checkpoint over immutable content, native Pi loading, lifecycle evidence, and package exports.
- Review weight: standard, source: project convention; child checkpoints do not enter review.
- Files changed: `src/pi/skill-resource-discovery.ts`, `src/index.ts`, `test/integration/pi-skill-resource-discovery.test.ts`, `test/integration/skill-hook-runtime-projection.test.ts`, `test/public-api.test.ts`, and `test/compiled-package-import.mjs`.
- Tests added/updated: typed fake Pi lifecycle, real Pi `loadSkills` collision evidence, immutable read-only skill files with bundled assets, removal/reload recomputation, stricter final observation integration, and public/compiled negative boundaries.
- Simplification: no Pi collision/name registry, copied resource tree, settings mutation, reload trigger, or authoritative state reader was added.
- Discrepancies from design: named resource event aliases are not root exports in Pi 0.80.8, so the adapter relies on `ExtensionAPI.on` contextual typing; this is recorded in the adapter checkpoint. The existing projection integration was updated to insert the required resource discovery participant before whole-bundle composition.
- Adjacent issues parked: none.
- Verification: `npm test` passes: 138 test files, 711 tests, 463 compiled exports. Design baseline was 133/696/459 (main baseline 133/696/459; delegated branch baseline 128/674/447); this implementation adds 5 files, 15 tests, and 4 exports relative to the design branch baseline.
- Stage transition: implementing -> done; implementation commit `implement: epic-skills-hook-runtime-skill-discovery-integration-hardening`.
