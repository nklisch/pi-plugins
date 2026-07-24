---
id: simplify-update-confirmation-and-auto-updates
kind: story
stage: done
tags: [tui]
parent: null
depends_on: []
release_binding: 0.1.17
created: 2026-07-22
updated: 2026-07-22
---

# Simplify update confirmation, add auto-update setup and update-all in Updates

User direction: "updates need to remove the confirm dialogue, and we need an
auto update setup and an update all." On clarification, the confirmation itself
stays (it is the consent gate) but must be simplified: the current surface is
confusing and effectively broken for accepting — with an executable disclosure
present, Enter only confirms after Space-expanding the disclosure and scrolling
to its exact end, with no other accept path.

## Changes

- ConfirmationSurface: `y`/Enter confirms, `n`/Escape cancels, Space toggles
  the exact executable disclosure, arrows/page keys scroll. The mandatory
  scroll-to-end gate is removed — that gate was why "accept" felt broken.
- Exact-action confirm content is purpose-aware and concise: title names the
  action ("Update plugin?", "Add plugin?"), body shows the consent statement
  and component counts; raw digests/purpose tokens move into the disclosure.
- Update all (`ctrl+u`) and Auto updates setup (`p`) are available from the
  installed view's **updates lens** (the reachable updates surface) and from
  the updates view. Both also appear as menu actions.
- Auto updates setup is an inline global policy flow (off/on + cadence) over
  `updates.policy.set`, including the consent-preview round trip enabling
  automatic updates requires.
- The current global policy (auto on/off + cadence) shows in the heading of
  update surfaces, sourced from `updates.status`.

## Discovery

The `updates` and `health` manager views are unreachable from the keyboard
(only `m` toggles installed ↔ marketplaces); the installed view's updates
**lens** is the de-facto updates surface, and `homeLines` in
plugin-manager-render.ts is dead code from the earlier sections design. The
new actions were therefore wired into the lens as well as the view. Removing
or re-enabling the orphaned views is parked as follow-up scope, not done here.

## Mockups

Skipped per convention: reuses existing inline choice/confirmation/list
components; no new surface family.

## Verification

- `npm run typecheck`, `npm run boundaries` — clean.
- Unit: 1707 tests pass, incl. rewritten ConfirmationSurface semantics and new
  model/component/controller/commands coverage for lens actions, policy state,
  and policy argv.
- `npm run build` + compiled/packed Pi 0.80.8 RPC/JSON/PTY acceptance — pass.
- Complementary GLM-5.2 review: no blocking findings. One minor (unreachable
  defensive branch wording in runPolicySet) fixed; one noted consistency item
  (policy-flow abort signals are not linked to manager close, matching the
  existing install-flow pattern) left as-is.
