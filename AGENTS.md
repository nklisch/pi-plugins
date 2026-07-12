<!-- agile-workflow:start -->
## Agile-Workflow Substrate

Work is tracked in `.work/` as Markdown items with YAML frontmatter (`kind`, `stage`, `tags`, `parent`, `depends_on`, `release_binding`, `research_refs`, `research_origin`, and optional `research_dials`).

Layout: `.work/active/{epics,features,stories}/`, `.work/backlog/`, `.work/releases/<version>/`, `.work/archive/`.

**Primary query tool:** `.work/bin/work-view` filters by stage, tag, kind, parent, dependency, research origin, and scan origin. Common patterns:

- `work-view --ready` — items ready to work, with dependencies satisfied
- `work-view --stage review` — items awaiting an agent review pass
- `work-view --parent <id>` / `--blocking <id>` — hierarchy and sequencing
- `work-view --scope all` — include terminal release and archive tiers
- `work-view --help` — full query surface

Foundation documents in `docs/` describe the project's current truth and intended state. Git carries history. Item files are durable work state: record implementation discoveries, review findings, blockers, and decisions in their bodies rather than relying on conversation history.

Reusable code patterns live in `.agents/skills/patterns/`. Project agent rules live in `.agents/rules/*.md`; do not maintain `.claude/rules/*.md` as a source of truth.

**Before designing, implementing, or reviewing, read `.agents/rules/*.md`.** The agile-workflow hook loads these rules at session start and after compaction; read them directly when working without the hook. Query `work-view` when current queue state is needed.

Research-linked work uses `research_refs`, `research_origin`, and the commissioning `research_dials` block defined by the agentic-research integration. The `.work/` ↔ `.research/` handoff contract lives in the installed agentic-research plugin's `docs/HANDOFF.md`.

Project-specific refactor style conventions belong in this file under `## Refactor Style Conventions`. Detailed references belong in `.agents/skills/refactor-conventions/` and extend `refactor-design` defaults; they do not create standalone plan documents.
<!-- agile-workflow:end -->

<!-- ux-ui-design:installed -->
## UI/UX Design Convention

**Mockup-first.** All UI/UX design is done as standalone HTML/CSS/JS mockups
before any production code is written. Mockups are committed.

**Location.** Mockups live in `.mockups/` with three buckets:

- `.mockups/design-system/` — palette, typography, tokens (project-wide)
- `.mockups/screens/<feature-id>/` — single-screen options per feature
- `.mockups/flows/<flow-name>/` — multi-page user journeys

`<feature-id>` matches the agile-workflow item id when applicable, else a
kebab-case short name.

**Process.**
- Single screen with options to align on: `/ux-ui-design:screens`
- Multi-page user flow for sign-off: `/ux-ui-design:flows`
- Palette / typography / design tokens: `/ux-ui-design:palette`
- Convention reference (auto-loads): `/ux-ui-design:ux-ui-principles`

**Tech rule.** Single-file HTML per mock, vanilla CSS in `<style>`, vanilla JS
in `<script>`. No build step, no CSS framework CDNs. Hosted fonts (Google
Fonts, etc.) are fine when the palette specifies one.

**Linking.** Each substrate item with mocks gets a `## Mockups` section in its
body pointing at the relevant `.mockups/` paths.

**Skip mocking** for trivial copy changes, bug fixes that don't shift visual
structure, behind-the-scenes refactors, or feature-level UI that cleanly
reuses existing components and patterns. Mock new surfaces, design-system
shifts, and multi-screen epics.
