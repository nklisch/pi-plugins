---
id: epic-foreign-plugin-model-source-materialization-npm-acquisition
kind: story
stage: done
tags: [security, infra]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-secure-content-contract]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Materialize integrity-verified npm packages

## Scope

Implement Unit 3 from the parent feature: bounded HTTPS packument resolution, standard external credential application, exact npm selector resolution, required SHA-512 tarball verification before extraction, `package/` payload handling through the secure sink, and resolved npm source construction. No npm subprocess, install, dependency installation, or lifecycle script may run.

## Files

- `src/infrastructure/npm/npm-registry-client.ts`
- `src/infrastructure/npm/npm-source-acquirer.ts`
- `src/infrastructure/http/bounded-fetch.ts`
- `package.json`
- `package-lock.json`
- matching tests and hermetic npm fixtures listed in parent Unit 3

## Required behavior

- Default to `https://registry.npmjs.org/`; validate/encode package identity and strictly parse a packument bounded to 10 MiB.
- Resolve absent selector as `latest`, exact version/tag exactly, and ranges through the pinned `semver` package, excluding prereleases unless explicitly permitted.
- Require canonical SHA-512 integrity and credential-free HTTPS tarball URL. Download into bounded scratch, follow at most five HTTPS redirects, do not forward auth cross-origin, verify exact bytes in constant time, then extract.
- Require/strip exactly `package/`; reject empty/rootless payloads and route every tar entry through Unit 1 policy and limits.
- Credentials remain internal to the registry/HTTP adapter; diagnostics omit headers, query/fragment, body, and secrets. Map failures/classifications exactly as the parent specifies.

## Acceptance criteria

- [x] Hermetic HTTPS-boundary fixtures cover latest/exact/tag/range/prerelease, malformed/oversized packuments, redirects, auth, and HTTP classification.
- [x] Missing/malformed/mismatched integrity leaves no content or tarball and never begins extraction.
- [x] A package declaring lifecycle scripts materializes as bytes without executing any marker.
- [x] Tar traversal, links, special files, collisions, limits, gzip bombs, slow-stream cancellation, and cleanup use Unit 1 behavior.
- [x] Returned npm source records exact package/version/integrity/registry through the existing verified constructor.
- [x] Focused tests, `npm run typecheck`, `npm run boundaries`, full `npm test`, and compiled-package import pass.

## Implementation notes

- Added `BoundedFetch` with HTTPS-only manual redirects (maximum five hops), per-hop credential re-authorization, streamed byte limits, abort propagation, and safe response/error classification.
- Added strict npm packument projection and pinned `semver` 7.8.1 resolution for latest, exact, tag, stable-range, and explicitly permitted prerelease selectors.
- Added direct SHA-512 tarball streaming with constant-time digest comparison before any `TarReader` call. Tarballs live under private bounded scratch `.work` and are removed on all failure paths.
- Added npm source acquisition through the existing verified source constructor; extraction is gzip-bounded, exact `package/`-prefixed, script-free, and sink-mediated. Extended `TarReader` with a retained-entry requirement so empty packages fail closed.
- Added hermetic registry, redirect, integrity, lifecycle-marker, package-prefix, and hostile-archive tests; promoted the pinned `semver` runtime dependency into the lockfile.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Independently confirmed `npm test`: 170 tests, typecheck, 134 dependency edges with no violations, build, and exact 90-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.

