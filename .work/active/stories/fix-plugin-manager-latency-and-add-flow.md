---
id: fix-plugin-manager-latency-and-add-flow
kind: story
stage: implementing
tags: [perf, tui, compatibility]
parent: null
depends_on: []
release_binding: 0.1.8
created: 2026-07-20
updated: 2026-07-20
---

# Fix plugin manager latency, hotkeys, and the add flow

User-reported: every manager step took multiple seconds; hotkey hints showed
uppercase letters; adding a plugin was three layers deep with broken
navigation and a forced disclosure scroll-gate; the deepest inline layer lost
visuals. Mockups drifted from the implemented flattened workflow.

## Root causes (measured, not guessed)

Reproduced in-process against a faithful replica of real user state and in the
real Pi session via a Python PTY driver; CPU-profiled with `--cpu-prof`.

Measured before: manager rows 3.2–3.4s, open detail 7.8–8.4s,
install.open 6.5–7.7s.

1. **No memoization in the read path.** Every control read re-verified the
   entire marketplace store (stat + SHA-256 of every retained file, re-parse
   of a 203 KB manifest) ~250 ms per call, 2× per catalog projection, with
   projections running 2–3× per command (evidence capture searches per scope,
   then the command's own search/resolve re-projects).
2. **Manifest validation was ~20× redundant** per entry (zod parse twice,
   re-normalize, collision key, ancestor walk, sort re-encode). CPU profile:
   `invalidPath` 4.7 s, `TextEncoder.encode` 2.1 s, GC 2.7 s.
3. **Input surfaces could not receive keys.** Pi's `ui.custom` does not
   stack: a nested custom replaces the first in the editor container and
   closing it restores the Pi editor, not the previous surface. Masked secret
   input, trust confirmation, and field editing inside the manager/operation
   surfaces were unreachable — "navigation is broken, I can't select Add".
4. **The install flow forced a disclosure scroll-gate** (Enter on Add was a
   no-op until the exact disclosure was expanded and scrolled to its end) and
   staged a review screen duplicating the manager detail pane.
5. **Selection staleness races.** Background scheduler settling (lease
   release, host-status publication, notice eligibility re-stamps every
   cycle) bumps authority generations between the list→detail capture pair;
   my read-path speedups made these windows common enough to fail
   `install.run`/`project sync` with `CONTROL_TARGET_SELECTION_FAILED`.

## Fixes

- `content-root-resolver`: fingerprint-keyed, single-flight published-revision
  verification cache. Payloads are content-addressed and published
  no-replace; the fingerprint covers marker, payload dir, and payload metadata
  sealed stats. Failures are never cached.
- `marketplace-catalog-service`: projection cache keyed on user-registry
  generation (mutations bust immediately) with a 30 s TTL bounding
  clock-driven cache-staleness lag.
- `content-manifest`: single schema parse, canonical-path reuse (schema
  already proves NFC canonicality), precomputed sort keys. Same verification
  semantics, ~20× less redundant work.
- `pi-project-context`: single-flight concurrent project revalidation
  (no time-based reuse — bound-identity replacement must fail closed on the
  very next call; covered by marketplace-discovery-security).
- Inline input custody: `PluginOperationView.presentInline`, and masked
  secret, trust confirmation, and non-sensitive field input route through the
  active surface's inline slot (manager or operation view) instead of
  `context.ui.custom`/`ui.input`. New `TextInputSurface`.
- Install flow flattened: no review screen (the manager detail already
  reviewed the candidate), the session opens immediately, fields edit in
  place, disclosure is optional power-user surface, Add grants consent by the
  explicit action. Focus starts on the first required field or Add; the
  window follows focus so controls never scroll out of view.
- Hotkey hints lowercase everywhere; footer adapts to narrow terminals;
  loading no longer flashes a false empty state.
- Selection recapture: up to 5 attempts with 25–400 ms backoff so
  authority-settling bursts complete between attempts.
- Automatic update eligibility no longer re-stamps `attemptedAt` for
  unchanged outcomes, and notice updates skip durable no-op writes (kills
  per-cycle generation churn).

## Measured after

Real Pi PTY (sandbox): manager open 76 ms, rows 177 ms, detail 201 ms,
install session open 153 ms, apply 406 ms. In-process replica: detail 259 ms,
install.open 430 ms (was 8.1 s / 7.7 s).

## Verification

- `npm test` green: typecheck, boundaries, 339 files / 1689 unit tests,
  build, compiled imports, packed Pi 0.80.8 RPC/JSON/PTY acceptance.
- Golden E2E 13/13, production E2E 12/12 locally (via a local `script` shim;
  util-linux missing on this host).
- New PTY perf gate: `test/e2e/golden/manager-performance.e2e.test.ts`
  (open < 5 s, detail < 3 s, session open < 10 s; actuals are ~0.2–0.5 s).

## Notes for reviewers

- The store-verification fingerprint deliberately does not detect an attacker
  who chmods individual sealed files and rewrites them in place; neither did
  per-read verification, and promotion-time verification remains the strict
  gate.
- `tsconfig.test.json` has ~670 pre-existing type errors across ~118 test
  files (branded-type drift); unchanged by this work except adoption-service
  tests, which were repaired. Worth its own backlog item.
- Stale mockups were deleted; one canonical manager mockup remains at
  `.mockups/screens/simplify-plugin-manager-experience/manager.html`.
