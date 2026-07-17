---
id: idea-fix-packed-candidate-inspection
created: 2026-07-17
updated: 2026-07-17
tags: [compatibility]
---

A clean packed Pi 0.80.8 process can install the package, register and materialize the real HTTPS smart-Git marketplace, and browse all six candidates, but every public candidate `show <plugin>@native-e2e-market --scope user` returns `status: failed`, exit 10, and only `CONTROL_INTERNAL`. This blocks exact inspection and every trusted-install journey before installation opens.

Reproducer: `npm run test:e2e -- test/e2e/golden/clean-startup-marketplace.e2e.test.ts` from the clean-environment E2E feature. The fixture is served by a separate real `git http-backend`; browse succeeds and candidate identities are stable, so the failure begins at packed candidate detail acquisition/inspection rather than registration or catalog publication. The linked E2E keeps the exact public inspection invariant as an expected failure until this is fixed.
