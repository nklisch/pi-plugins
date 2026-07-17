---
id: idea-packaged-atomic-no-replace-directory-publication
created: 2026-07-17
updated: 2026-07-17
tags: [infra, reliability, security]
---

Add the production-owned atomic no-replace directory publication adapter behind `ContentStorePlatform.renameNoReplace` and wire it through `createNodeContentInfrastructure` only after a real capability probe. On Linux this requires a maintained native `renameat2(..., RENAME_NOREPLACE)` equivalent; supported non-Linux platforms need an equally strong primitive rather than check-then-rename. Preserve sync, sealing, collision verification, and fail-closed behavior. Prove two-process publication and run the packaged marketplace add/restart/concurrency acceptance path without its `PROMOTION_FAILED` branch. This is owned by packaged immutable-content infrastructure, not marketplace discovery.
