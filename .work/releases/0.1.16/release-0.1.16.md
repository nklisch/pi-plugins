---
id: release-0.1.16
kind: release
stage: done
tags: []
parent: null
depends_on: []
release_binding: 0.1.16
gate_origin: null
created: 2026-07-22
updated: 2026-07-22
---

# 0.1.16

MCP gateway calls work from server keys alone — no identity JSON plumbing — and 0.1.15's human-readable output keeps a working model workflow.

## Included work

- mcp-adapter-source-free-calls
- (supersedes unpublished 0.1.15: mcp-adapter-search-and-human-gateway-output)

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, boundaries, 1699 unit tests, build, compiled imports, packed Pi RPC/JSON/PTY acceptance against published @nklisch/pi-mcp-adapter@2.11.0-nklisch.3 — all green. Full e2e delegated to CI (local tmpfs exhausted by an external process).

## Publication

- Shipped: 2026-07-22
- Mapping: tag-based
- Source commit: `f4b3251`
- Tag: `v0.1.16`
- GitHub Actions publish run: `29941503904`
- npm integrity: `sha512-2dun7tKViZbYQMdK2TgnWKcuTn510BrxmIdrP1Ddghq2qlh9oJy89COOZQQUTAl4X/RqiolTFfaEH2Klievyzw==`
- GitHub: https://github.com/nklisch/pi-plugins/releases/tag/v0.1.16
- npm: https://www.npmjs.com/package/@nklisch/pi-plugins/v/0.1.16

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
