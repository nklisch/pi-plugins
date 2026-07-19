---
id: fix-silent-install-failure-diagnostics
kind: story
stage: done
tags: [tui, compatibility, reliability]
parent: null
depends_on: []
release_binding: null
created: 2026-07-18
updated: 2026-07-19
---

# Install failures surface no actionable diagnostics anywhere

Reproduced 2026-07-18: every install of a SOURCE_INVALID marketplace candidate
fails, but the user cannot discover why:

- TUI `/plugin add ...` shows only "Plugin Host command could not complete."
  (`src/pi/plugin-command.ts` deliberately swallows the native error and
  cause; the envelope detail never reaches the user either).
- The control envelope for `install.run` carries only
  `CONTROL_TARGET_SELECTION_FAILED` / `reinspect` — the underlying
  `SOURCE_INVALID` diagnostic (with the conflicting file pointers) is computed
  inside candidate inspection but is not propagated into the selection-failure
  envelope. `inspection.show` similarly returns bare
  `CONTROL_SELECTION_UNAVAILABLE`.
- The manager UI Discover/My Plugins shows "0 installed" with no per-candidate
  unavailable reason.

Result: a user's install attempts vanish without a trace; state correctly
records zero installed plugins, but nothing explains the refusal.

The selection-failure envelope should embed (or reference via detail-id) the
blocking inspection diagnostics — at minimum the diagnostic code, summary
text, and document locations — and the TUI operation view + manager Discover
page should render them. Swallowed native errors should stay internal, but the
facade envelope already has a diagnostics channel; use it.

Parser papercuts found in the same session (consider folding in or splitting):
- `/plugin add agile-workflow --scope user` (bare name) fails to parse at all
  (`CONTROL_REQUEST_INVALID`); only `name@marketplace` is accepted, with no
  hint in the diagnostic.
- `--snapshot-id`/`--detail-id` reject the `marketplace-snapshot-v1:...` /
  `marketplace-candidate-v1:...` IDs that `browse` displays; they require
  inspection-snapshot-family IDs, which no browse/list output labels as such.

## Progress (2026-07-19)

User directive: every install error surfaces in clear, simple language mapped
to claude/codex marketplace/plugin terms, never implementation vocabulary.

Landed so far:
- New registry keys SOURCE_DOCUMENT_INVALID / SOURCE_DECLARATION_CONFLICT /
  SOURCE_CONTENT_UNSAFE carry the real reason (host document, pointer, fixed
  reason vocabulary) instead of bare SOURCE_INVALID.
- Candidate inspection projects actual inspector diagnostics into findings
  (src/application/inspection-failure-projection.ts); native messages/causes
  still never enter facts.
- native-failure-presenter.ts composes plain sentences ("`.mcp.json` (Claude)
  disagrees with another declaration about the plugin description").
- Selection service now carries unavailable-detail diagnostics outward
  instead of dropping them.

Remaining: dispatcher must attach those diagnostics + human lines to
selection-failure envelopes (after concurrent hostPrecedence work lands),
recovery-required needs a human line, and the TUI swallow should point at the
envelope. The digest-mismatch saga showed FIVE layers each discarding the
underlying error (see fix-runtime-projection-digest-mismatch item).

Completed: dispatcher now attaches inspection diagnostics + presenter human
lines to every selection-failure envelope; projectNativeControlFailure maps
every control code to plain-language fallback text; recovery-required install
and lifecycle results carry a recovery explanation line. Verification: full
npm test green (338 files / 1,689 tests + packed Pi PTY acceptance).
Deferred hardening (not user-facing install errors): deeper runtime journal
diagnostics (broker ticket masking, safeFailure sanitization chain) remain
internal-only by design; richer operator-facing recovery detail is a future
doctor-surface concern.
