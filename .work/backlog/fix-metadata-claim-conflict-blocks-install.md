---
id: fix-metadata-claim-conflict-blocks-install
kind: story
stage: done
tags: [compatibility, marketplace]
parent: null
depends_on: []
release_binding: null
created: 2026-07-18
updated: 2026-07-19
---

# Metadata-only claim conflicts must not make a plugin SOURCE_INVALID

Reproduced 2026-07-18 against `nklisch/skills` (revision 0d9e0104): installing
`agile-workflow@nklisch-skills` fails at candidate inspection with
`SOURCE_INVALID` because the marketplace entry `description` differs from the
plugin manifest `description` (`.claude-plugin/marketplace.json`
`/plugins/3/description` vs `.claude-plugin/plugin.json` `/description`).
`mergeClaim` in `src/formats/manifest-merger.ts` treats any differing
declaration of the same field as a fatal conflict, including metadata-only
fields.

7 of 12 plugins in that marketplace are uninstallable for this reason
(workflow, nates-toolkit, code-audit, agile-workflow, workbench,
agentic-research, zai-research), plus all three git-subdir plugins
(krometrail, peeragent, skilltap) whose marketplace/manifest descriptions also
differ.

Spec tension: `docs/COMPATIBILITY.md` lists "Owner, description, category,
tags, interface" as **Metadata-only**, and Claude `strict: true`/omitted means
"manifest required, catalog runtime declarations supplemental".
`docs/SPEC.md` says conflicting declarations of a supported **runtime
component** make the plugin incompatible. A presentational `description`
mismatch is neither a runtime component nor, under strict authority, an
equal-rank claim — the catalog is supplemental, so the manifest should win (or
each document should keep its own description for its own purpose) with at
most a note diagnostic.

Decide and implement the precedence/authority rule for metadata-only fields
(description, category, tags, owner, interface) so mismatches degrade to a
non-blocking diagnostic, keeping conflicts fatal only for runtime-component
declarations. Re-verify the full nklisch/skills marketplace installs
afterwards.

## Resolution (2026-07-19)

Implemented as decided, and extended: not just metadata-only fields but ALL
cross-host declaration conflicts now resolve by precedence rather than
blocking. Precedence order: marketplace entry, then Claude, then Codex
(user-configurable via hostPrecedence; default Claude-first, matching real
Claude Code semantics). Superseded declarations are retained in merged
provenance, and runtime-relevant resolutions (MCP launch recipes) record a
`pi.reconciliation.precedence-resolution:*` metadata note.

- bundle-reconciler: presentational fields (name/version/description/metadata/
  config label+description) and runtime-component declarations (MCP, foreign)
  keep-first by precedence; divergent locators are an additive union.
- discovery-plan: cross-host explicit-locator conflicts removed (union).
- inspection-service: duplicate skill names dedupe by precedence with a
  resolution note instead of SOURCE_INVALID.
- marketplace-merger: entry-level version/description/policy/metadata drift
  merges keep-first; source/identity/raw-declaration conflicts remain fatal.
- configuration value/required/sensitive conflicts remain fatal (user-facing
  contract), as do structural collisions (kind mismatch at one component id).

Verified: agile-workflow and krometrail install `succeeded` from the live
nklisch/skills marketplace. `manifest-merger.ts` remains as dead code (tests
only); deletion is a maintainer decision (see final report).
