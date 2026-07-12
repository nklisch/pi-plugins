---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-skills-configuration
kind: story
stage: review
tags: [compatibility]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Read Agent Skills and configuration descriptors

## Scope

Implement Unit 3 from the parent feature design: bounded safe YAML-frontmatter extraction, pure Agent Skills normalization, optional bounded Codex presentation retention, and pure Claude `userConfig` descriptor normalization.

Commit hermetic snapshots from `/home/nathan/dev/skills` commit `8d312608113b2e64932f2a9cdb39a2995b2cb11c` with a source manifest. Do not make tests depend on the adjacent checkout. Add independent adversarial fixtures for constructs absent from the real repository.

## Files

- `src/formats/agent-skills/frontmatter-reader.ts`
- `src/formats/agent-skills/skill-reader.ts`
- `src/formats/claude/user-config-reader.ts`
- `test/fixtures/plugins/real-nklisch-skills/`
- `test/fixtures/plugins/adversarial-skills/`
- matching tests
- `package.json` / `package-lock.json` for the pinned YAML parser

## Acceptance criteria

- [ ] Frontmatter enforces the parent feature's byte, line, depth, node, and scalar bounds before/until allocation can exceed them.
- [ ] Aliases, anchors, explicit tags, merge keys, duplicate/non-string/prototype-polluting keys, multi-document YAML, invalid UTF-8, and unterminated frontmatter fail with no partial skill.
- [ ] Required Agent Skills fields and recognized invocation metadata are structurally validated; unknown fields are retained without runtime meaning or verdicts.
- [ ] Discovery accepts only manifest-indexed `SKILL.md` files beneath declared roots and never follows symlinks or discovers nested undeclared roots.
- [ ] `userConfig` emits `PluginConfiguration` descriptors only and rejects duplicate keys, unknown types, sensitive defaults, invalid patterns, type/default mismatches, and bound errors.
- [ ] Configured values, substitutions, environment, path existence checks, secrets, and secret stores do not appear in this implementation.
- [ ] Real folded frontmatter and `agents/openai.yaml` snapshots parse; fixture origin and commit are recorded.
- [ ] Focused tests and full `npm test` pass.

## Out of scope

No compatibility interpretation of invocation fields, configured-value collection, secret storage, substitution, runtime activation, or lifecycle behavior.

## Implementation notes

- Execution capability: direct-read only; the caller prohibited nested agents and peeragent, and the pure reader/fixture surface is cohesive.
- Review weight: standard by project default; explicit stop at `stage: review` because the caller requested the implementing→review transition and prohibited independent agents.
- Files changed: `src/formats/agent-skills/frontmatter-reader.ts`, `src/formats/agent-skills/skill-reader.ts`, `src/formats/claude/user-config-reader.ts`, Claude manifest wiring, `package.json`, `package-lock.json`, committed real and adversarial fixtures, and focused format tests.
- Tests added: bounded YAML/frontmatter adversarial cases, real folded Agent Skills and Codex presentation snapshots, normalized skill metadata/identity, and descriptor-only Claude `userConfig` validation.
- Discrepancies from design: discovery remains an application-layer responsibility; these pure readers accept only caller-supplied manifest-indexed paths/content and import no filesystem or runtime modules. The bounded YAML parser is pinned to `yaml@2.8.1`.
- Adjacent issues parked: none.
- Verification: focused tests, full `npm test`, and independent build/import verification passed.
