---
id: release-0.1.15
kind: release
stage: implementing
tags: []
parent: null
depends_on: []
release_binding: 0.1.15
gate_origin: null
created: 2026-07-22
updated: 2026-07-22
---

# 0.1.15

MCP gateway operations render 1-3 human lines instead of raw JSON specs, and the programmatic gateway gains tool search.

## Included work

- mcp-adapter-search-and-human-gateway-output

## Gate runs

Release gates skipped by explicit maintainer instruction. The standard package verification remains required by the publish workflow.

## Candidate verification

- Local `npm test`: typecheck, boundaries, 1699 unit tests, build, compiled imports, packed Pi RPC/JSON/PTY acceptance against published @nklisch/pi-mcp-adapter@2.11.0-nklisch.2 — all green.
- Adapter fork: 453 tests + packed package qualification green.

## Publication

- Pending.

## Shipped items

Bodies live in git history under the `delete-refs` retention policy.
