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
