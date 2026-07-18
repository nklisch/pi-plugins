---
id: simplify-plugin-manager-experience
kind: feature
stage: done
tags: [tui, compatibility]
parent: null
depends_on: []
release_binding: 0.1.2
created: 2026-07-18
updated: 2026-07-18
---

# Simplify the plugin manager experience

Replace the protocol-shaped `/plugin` experience with a user-centered plugin manager and concise command vocabulary.

## User contract

The primary concepts are:

- **My Plugins** — plugins the user or current project has added;
- **Discover** — compatible plugins available from configured sources;
- **Sources** — global marketplace sources, with first-class Add Source onboarding;
- **Updates** — update notices and update actions;
- **Health** — host capability and diagnostic status.

The normal command vocabulary is `/plugin`, `add`, `remove`, `update`, `enable`, `disable`, `list`, and `doctor`, plus the advanced `marketplace` namespace. Existing protocol paths remain accepted as compatibility aliases or hidden advanced routes where automation still needs them, but default help and completion do not present workflow tokens, snapshots, install phases, or operation-control machinery as ordinary user tasks.

`/plugin add <plugin> --scope user|project` performs the complete trusted add/install/enable workflow. `/plugin remove` is the ordinary name for whole-plugin uninstall. Human command output presents actual result data instead of repeating command summaries.

## UI acceptance

- Empty My Plugins and Discover states explain that sources are required and offer Add Source.
- Sources provides Add, Refresh, and Remove actions.
- Actions are derived from current facade evidence rather than always displaying contradictory lifecycle operations.
- The manager presents concise inline guidance and visible direct-action shortcuts.
- Confirmation uses a stable, opaque, framed replacement surface sized to its actual render region; it does not use the experimental transparent overlay path.
- Detailed executable disclosure is reviewable without corrupting or bleeding through the underlying manager.
- Narrow and wide terminals preserve the same information architecture.

## Design decisions

- Keep the 32-route control registry as an automation/internal facade, but classify routes by presentation visibility. Default help and autocomplete expose only the concise product vocabulary; `help --all` and machine grammar retain the complete protocol.
- Make `add`, `remove`, and `doctor` canonical product paths while retaining `install`, `uninstall`, and `diagnose` as compatibility aliases.
- Derive manager sections, action labels, and command serialization from registries rather than copying path strings.
- Use full-screen custom components for confirmations and secret entry. Floating overlays are reserved for optional transient UI, not trust or destructive decisions.
- Render safe structured result data whenever a command has no command-specific human projection.

## Compatibility and safety

The application control facade remains the sole mutation authority. UI actions serialize through registry-owned command definitions, exact evidence remains mandatory for mutations, and trust/configuration collection remains fail-closed. Simplifying presentation must not bypass consent, transaction, recovery, or Pi reload handoff behavior.

## Implementation notes

- Added registry visibility classification so the complete automation facade remains intact while default human discovery stays concise.
- Canonical product paths are now `add`, `remove`, and `doctor`; prior terms are compatibility aliases.
- Added Health as a facade-backed manager section and Add Source as a first-class global action.
- Installed-plugin actions require current parsed inspection detail before enable/disable/update choices appear.
- Replaced trust/action overlays with framed full-screen custom components to eliminate overlay sizing and bleed-through defects.
- Human command projection now emits concise schema-derived help, status, list, source, discovery, and update output, with bounded terminal-safe structured fallback instead of command-summary labels.
- The installed badge remains stable across section changes, resolving `idea-stabilize-pi-manager-installed-badge`; action availability resolves `idea-model-current-pi-manager-action-availability`. Their terminal backlog references were removed under project retention policy.

## Verification

- `npm test` — 336 unit files / 1667 tests, typecheck, boundaries, build, compiled imports, and packed Pi 0.80.8 RPC/JSON/PTY acceptance passed.
- Golden command/manager E2E — 3/3 passed.
- Production concurrency/presentation/security E2E — 4/4 passed standalone. A concurrent run beside the golden PTY suite produced one harness interference failure; the unchanged production test passed immediately when rerun in isolation.
- `git diff --check` passed.
- Luna was discoverable as a model, but this harness exposed no subagent execution tool; final review was performed locally against the complete diff and runtime acceptance surfaces.

## Mockups

- `.mockups/screens/simplify-plugin-manager-experience/manager.html`
