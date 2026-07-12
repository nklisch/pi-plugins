---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-service-hardening
kind: story
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation, epic-foreign-plugin-model-plugin-bundle-ingestion-skills-configuration, epic-foreign-plugin-model-plugin-bundle-ingestion-hooks-mcp-foreign]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Compose and harden complete bundle inspection

## Scope

Implement Unit 5 from the parent feature design: `PluginInspectionService`, final bundle reconciliation, the exact manifest-backed Node content reader, the explicit composition root, public exports, and full adversarial/integration coverage.

Apply the parent's exact fatality matrix. Inspection is all-or-nothing: malformed present content and claim conflicts return failed results with no `NormalizedPlugin`; only untrustworthy materialized/content/adapter boundaries throw; abort remains abort.

## Files

- `src/application/inspection-service.ts`
- `src/application/bundle-reconciler.ts`
- `src/infrastructure/filesystem/manifest-content-reader.ts`
- `src/composition/create-plugin-inspector.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- application/infrastructure/integration/public/tooling tests
- dual-format and adversarial bundle fixtures

## Acceptance criteria

- [ ] The service validates entry/source/binding/manifest, builds one manifest index, performs exact bounded reads, invokes pure reader ports, and returns one deterministic complete bundle.
- [ ] Marketplace entry identity remains authoritative; differing manifest name is retained; equal claims merge provenance and contradictory claims fail.
- [ ] The Node content adapter never lists directories or follows symlinks and verifies exact manifest size/digest before returning bytes.
- [ ] Claude-native, Codex-native, and equivalent dual fixtures produce complete deterministic inventories; dual conflicts and malformed present documents return no partial bundle.
- [ ] Invalid handoff/binding/content/containment and adapter failures throw typed boundary errors; abort is not converted to a diagnostic.
- [ ] Every unsupported runtime declaration remains a foreign component without compatibility verdicts or runtime requirements.
- [ ] Composition is the only layer allowed to import application, formats, and infrastructure together; generated dependency violations prove this boundary.
- [ ] Adversarial fixtures cover every row of the parent fatality matrix, path/symlink/digest attacks, bounded JSON/YAML, claim conflicts, and order permutations.
- [ ] No compatibility evaluator, runtime/activation, state/trust/secret, lifecycle, process, hook execution, or MCP runtime module is imported.
- [ ] Full `npm test`, build, and exact source/compiled public export checks pass.

## Out of scope

Compatibility verdicts, runtime requirement availability, activatability, trust, activation/projections, installation/update transactions, and lifecycle state.
