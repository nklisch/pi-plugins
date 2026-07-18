---
id: epic-native-plugin-management-clean-environment-core-e2e-fuzz-boundaries
kind: story
stage: done
tags: [e2e-test, testing]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [epic-native-plugin-management-clean-environment-core-e2e-infrastructure]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Fuzz packed control, state, project, and foreign boundaries

## Scope

Implement Unit 5 from the parent feature as bounded deterministic mutation/grammar campaigns through real packed Pi processes. Cover `/plugin` text/argv and opaque tokens, portable `.pi/plugins.json`, cloned SQLite state evidence, and Claude/Codex adoption files. Use fixed seed `0x504c5547`, named mutation operators, strict byte/case ceilings, and replayable artifacts.

Do not turn this into random soak testing or duplicate detailed source/codec unit properties. The E2E property is that hostile boundary input yields a bounded public result, preserves authority on rejection, and never crashes/hangs/leaks/retargets.

## Files

- `test/e2e/harness/mutation-corpus.ts`
- `test/e2e/fuzz/control-argv-fuzz.e2e.test.ts`
- `test/e2e/fuzz/state-config-fuzz.e2e.test.ts`

## Campaign properties

- Mutated quoting/options/aliases/Unicode/control/NUL/oversize text either reaches the one documented valid command or returns bounded usage/input/stale/rejected evidence before mutation.
- Mutated cursors, detail IDs, session tokens, operation tokens, and notice IDs never resolve to another current object.
- Project intent with unknown/machine-local fields, duplicate identities, malformed JSON/UTF-8, traversal spellings, timestamps, or oversized arrays never changes project authority/file on rejection.
- Pointer/blob digest/kind/generation/document mutation in cloned state yields bounded corruption/blocked behavior and preserves valid sibling evidence; it never silently rewrites defaults.
- Claude JSON/Codex TOML mutation preserves foreign bytes and never imports foreign cache/trust/credentials/installations; valid sibling declarations may remain visible.
- Output, logs, files, and retained artifacts remain bounded and exclude secret canaries, native causes, custody paths, and terminal-control injection.

## Acceptance criteria

- [ ] Corpus generation is byte-identical for the fixed seed and records case ID/operator/input/replay command.
- [ ] Control campaign runs at least 128 cases with maximum input 8 KiB and a per-case command deadline; no case invokes an LLM or hidden prompt.
- [ ] Token mutation includes truncation, checksum changes, prefix substitution, cross-owner replay, valid-looking random payloads, and stale exact tokens.
- [ ] State/config campaign uses disposable baseline clones and compares public state digests/files before and after every rejected case.
- [ ] Foreign fixture files are byte-identical after preview/import rejection and clean missing-host cases remain clean.
- [ ] Structural SQLite corruption that intentionally fails `integrity_check` is classified separately from schema/digest corruption; neither is mislabeled a product success.
- [ ] A failing case is reproducible alone from its artifact without relying on execution order or random timing.
- [ ] Case count/size stays bounded; this story does not add a new fuzz framework dependency unless the simple deterministic corpus proves insufficient.

## Test integrity

Park real parser/state/adoption bugs with `/agile-workflow:park`, retain the minimal replay and linked skip/xfail only when necessary, and fix generator/harness defects in-session. Never define the property as “did not throw” alone: every invalid case must also preserve public authority and produce bounded safe output. Never loosen generators or discard a seed merely to make the campaign green.

## Implementation notes

- Execution capability: GPT-5.6 Sol xhigh, caller-selected; one owner kept corpus, process, filesystem, and state evidence together without nested agents.
- Review weight: standard from `.work/CONVENTIONS.md`; child-story checkpoint does not receive review.
- Files changed: `test/e2e/harness/mutation-corpus.ts`, authority-digest normalization in `state-inspector.ts`, and `test/e2e/fuzz/{control-argv-fuzz,state-config-fuzz}.e2e.test.ts`.
- Tests added: fixed 128-case/8-KiB grammar corpus with seed hash and per-case replay; six opaque-token operators; eight project-intent mutations including malformed UTF-8; structural versus schema-valid SQLite corruption; seven pointer/blob mutations; and Claude/Codex byte-preservation mutations.
- Simplification: a small xorshift corpus replaces a fuzz dependency; the public authority digest intentionally removes scheduler clocks/snapshot IDs while retaining installed rows, registration declarations, policy, and notice counts.
- Discrepancies from design: schema-valid SQLite corruptions hit the parked packed-startup diagnosis bug and are linked expected failures; structural corruption is classified on a disposable real SQLite clone instead of being mislabeled a product result.
- Adjacent issues parked: no new fuzz-specific issue; `idea-packed-corruption-startup-diagnosis` is linked to all seven exact state-corruption cases.
- Verification: control fuzz passed all 128 cases plus token mutations; state/config fuzz passed 10 tests; combined fuzz lane passed 13 tests including linked executable expected failures.
