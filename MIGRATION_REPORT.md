# Migration Report — agile-workflow bootstrap

**Date:** 2026-07-11
**Source shape:** greenfield
**Destination:** `.work/` substrate

## Foundation docs detected

- `docs/VISION.md` — preserved
- `docs/SPEC.md` — preserved
- `docs/ARCHITECTURE.md` — preserved
- `docs/COMPATIBILITY.md` — preserved

## Detection and classification

- Existing substrate: none
- Legacy tracking documents: none
- Existing agent entrypoints: none
- Existing `.agents/skills/` entries: none
- Existing `.claude/skills/` entries: none
- Existing `.claude/rules/` entries: none
- Convergence candidates: none
- Entrypoint model: `agents-canonical`
- Cleanup scope: `preserve-only`
- Destructive cleanup: none
- Reference-integrity rewrites or shims: none
- Dirty-repo in-flight capture: not required

## Items seeded

No items were seeded. The greenfield substrate is ready for decomposition from the foundation documents.

## Managed artifacts installed

- `.work/bin/work-view` — prebuilt `x86_64-unknown-linux-musl`, version `0.15.3`
- `.work/CONVENTIONS.md`
- `.agents/rules/agile-workflow.md`
- `AGENTS.md` — canonical agent entrypoint
- `CLAUDE.md` — compatibility symlink to `AGENTS.md`

## Conventions chosen

- Release mapping: `tag-based`
- Tag taxonomy: `security`, `compatibility`, `perf`, `refactor`, `infra`, `prose`, `research`
- Slugs: parent-qualified kebab-case
- Stage overrides: none
- Gate order: security → tests → cruft → docs → patterns
- Gate finding routing: critical/high → implementing, medium → drafting, low → backlog, info → skip
- Binding guard: `warn`
- Epic cohesion: `phased`
- Terminal-tier retention: `delete-refs`

## Next steps

1. Review the foundation documents and generated conventions.
2. Run `/agile-workflow:epicize` to decompose the foundation into dependent epics.
3. Review the proposed decomposition before implementation begins.
