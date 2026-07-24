---
id: widen-packaged-host-pi-range
kind: story
stage: done
tags: [compatibility]
parent: null
depends_on: []
release_binding: 0.1.18
gate_origin: null
created: 2026-07-24
updated: 2026-07-24
---

# Widen packaged-host Pi range to major-only

Observed in production on Pi 0.81.1 with `@nklisch/pi-plugins@0.1.17`
installed: `PACKAGED_HOST_PI_RANGE = ">=0.80.0 <0.81.0"` failed host-API
qualification, which cascaded into user-visible breakage for
`krometrail@nklisch-skills` — all MCP capabilities reported unavailable, so the
plugin showed a red "incompatible" badge (2 unavailable requirements, blocking
diagnostics) and `lifecycle.update` exited `unavailable (6)` because candidate
selection inherits the degraded evidence. The plugin was fine; the host's own
Pi minor-version pin was the entire fault.

Every Pi minor bump currently hard-breaks the installed host until a new
host release ships. That is too brittle a compatibility surface for a package
whose whole job is managing other plugins.

## Decision

Widen `PACKAGED_HOST_PI_RANGE` from `>=0.80.0 <0.81.0` to `>=0.80.0 <1.0.0`:
keep the verified API floor at 0.80.0, cap only at the next major. The
structural ExtensionAPI shape check (`on`/`sendMessage`/`setSessionName`)
remains the fail-closed guard against genuine API drift, and the published
MCP/subagent adapter packages carry their own peer ranges
(`>=0.79.1 <1`, `>=0.75.0`), which qualification still enforces independently.

Trade-off accepted (user direction): a future 0.x Pi minor that silently
changes behavior is admitted without re-qualification; drift that alters the
API shape still fails closed via the structural check. The backlog item
`idea-track-pi-append-entry-compatibility` stays as the follow-up for
behavioral (non-shape) drift.

## Changes

- `src/composition/runtime-participant-qualification.ts`: widen the range and
  document the admission policy at the constant.
- `test/composition/runtime-participant-qualification.test.ts`: add host-range
  boundary coverage (0.79.x rejected, 0.80.0/0.81.x admitted, 1.0.0 rejected).

## Verification

- `vitest run` — 1707 pass, 0 fail (includes new host-range boundary tests:
  0.79.9/1.0.0 rejected, 0.80.0/0.81.1/0.99.0 admitted, API-shape drift still
  fails closed inside the range).
- `tsc --noEmit` clean; dependency boundaries clean (437 modules).
- `npm run test:package` — build, compiled imports, packed real-Pi 0.80.8
  RPC/JSON/PTY acceptance all green.
