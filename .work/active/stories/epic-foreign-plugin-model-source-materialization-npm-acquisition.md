---
id: epic-foreign-plugin-model-source-materialization-npm-acquisition
kind: story
stage: implementing
tags: [security, infra]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-secure-content-contract]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
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

- [ ] Hermetic HTTPS fixtures cover latest/exact/tag/range/prerelease, malformed/oversized packuments, redirects, auth, and HTTP classification.
- [ ] Missing/malformed/mismatched integrity leaves no content or tarball and never begins extraction.
- [ ] A package declaring lifecycle scripts materializes as bytes without executing any marker.
- [ ] Tar traversal, links, special files, collisions, limits, gzip bombs, slow-stream cancellation, and cleanup use Unit 1 behavior.
- [ ] Returned npm source records exact package/version/integrity/registry through the existing verified constructor.
- [ ] Focused tests, `npm run typecheck`, and `npm run boundaries` pass.
