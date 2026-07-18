---
id: idea-fix-packed-candidate-inspection
kind: story
stage: done
tags: [bug, compatibility]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Fix packed candidate inspection

## Original finding

A clean packed Pi 0.80.8 process can install the package, register and materialize the real HTTPS smart-Git marketplace, and browse all six candidates, but every public candidate `show <plugin>@native-e2e-market --scope user` returns `status: failed`, exit 10, and only `CONTROL_INTERNAL`. This blocks exact inspection and every trusted-install journey before installation opens.

Reproducer: `npm run test:e2e -- test/e2e/golden/clean-startup-marketplace.e2e.test.ts` from the clean-environment E2E feature. The fixture is served by a separate real `git http-backend`; browse succeeds and candidate identities are stable, so the failure begins at packed candidate detail acquisition/inspection rather than registration or catalog publication. The linked E2E keeps the exact public inspection invariant as an expected failure until this is fixed.

## Fix contract

- Reproduce through the packed real-Pi public `show` path and identify the swallowed candidate-detail failure.
- Add a focused regression test at the narrow production boundary plus truthful packed inspection/capability tests.
- Preserve exact snapshot/detail authority, safe disclosure, candidate isolation, and unavailable runtime diagnostics.
- Do not depend on projection publication; inspection must succeed before install activation is attempted.

## Resolution

Packed inspection now validates candidates through the install-readiness boundary while retaining exact compatibility, secret-custody, MCP, subagent, and incompatibility findings. Unbound current-authority reads recapture one transient stale snapshot; exact snapshot, cursor, and detail selectors remain strictly stale. Candidate inspection remains independent of runtime projection publication.

Verified by focused selection/readiness regressions, exact packed capability diagnostics, the complete 43-test E2E lane, and consolidated package acceptance.
