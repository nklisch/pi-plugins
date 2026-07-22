---
id: mcp-adapter-source-free-calls
kind: story
stage: done
tags: [compatibility]
parent: null
depends_on: []
release_binding: 0.1.16
gate_origin: null
created: 2026-07-22
updated: 2026-07-22
---

# MCP adapter 2.11.0-nklisch.3: source-free server-key calls

CI caught a real workflow break in 0.1.15: removing the source-identity
JSON from gateway `status` output also removed the only way a model could
form a `call` — the gateway's own status → list → call flow required
re-pasting a large identity JSON. The deterministic e2e model failing with
"Connection error" was the scripted proof of a design flaw, not a flake.

## Changes

- Adapter bump to `@nklisch/pi-mcp-adapter@2.11.0-nklisch.3`: `list`,
  `search`, and `call` accept a server key alone. Keys are derived from the
  exact source identity, so a stale key simply does not resolve — exactness
  is preserved without JSON plumbing. `status` lines show
  `nativeKey · full-server-key`; `search` without a source fans out across
  all sources. Model flow is now: status → pick a line →
  `call({ server, tool, args })`.
- The e2e deterministic model follows the same flow (parses status lines,
  calls by key), and the absent-MCP scenario still returns
  `PARENT_MCP_ABSENT`.

Adapter fork evidence: `v2.11.0-nklisch.3` tag
`edc0ffa77dde0ee70455ee8bf72f43ee4a313f89`, release commit
`111d79f7d292e928315c5cade586798ef395158a`, registry integrity
`sha512-keVNCjw0ZldLr5p6TwB3UvM9dHc9SwhCHbSQQOvdR+nhMFRua2lHdAG3nMqmr9CK1torEd8e5PX3ZyptXXhmbQ==`.

## Verification

- Adapter: 453 tests + packed package qualification green.
- Host: typecheck, boundaries, 1699 unit tests, compiled imports, packed
  real-Pi RPC/JSON/PTY acceptance against the published 2.11.0-nklisch.3 —
  all green. Full e2e runs in CI (local tmpfs full).
