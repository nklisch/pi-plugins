---
id: mcp-headers-helper-launch-execution
kind: story
stage: backlog
tags: [mcp, compatibility, feature]
parent: null
depends_on: []
release_binding: null
gate_origin: null
created: 2026-07-19
updated: 2026-07-19
---

# Execute MCP `headersHelper` at activation for Claude Code parity

## Context

Claude Code fully supports dynamic MCP auth: it runs a server's
`headersHelper` command at connection time, merges the JSON stdout into
request headers (10s timeout, re-run per connection so short-lived tokens
refresh, overrides same-name static headers, provides
`CLAUDE_CODE_MCP_SERVER_NAME` / `CLAUDE_CODE_MCP_SERVER_URL`).

Pi's MCP runtime only accepts static headers, so plugin MCP servers declaring
`headersHelper` are currently `metadata-only`: the plugin installs, every
other component works, the server is retained but not activated
(`mcp.headers-helper` in `src/domain/compatibility-policy.ts`).

## Proposal

At activation time (post-trust), execute the helper and materialize its JSON
stdout as static headers in the Pi MCP configuration.

- Trust: a plugin's stdio MCP server is already arbitrary code executed
  post-trust; running its helper post-trust is the same trust level. The
  pre-trust evaluation boundary must still never execute helpers.
- Timeout and size-cap the helper's stdout; reject non-JSON output and
  non-string values with a source-located diagnostic.
- Known limitation vs Claude Code: no per-connection re-run, so short-lived
  tokens go stale until the next activation or reload. Document this; a
  refresh-on-401 pass can follow if the MCP runtime exposes reconnect hooks.

## Acceptance

- A plugin whose only gap is `headersHelper` installs and its MCP server
  launches with helper-produced headers.
- Helper failure (non-zero exit, timeout, bad JSON) degrades the server to
  retained-not-activated with a human-readable diagnostic, never blocks the
  plugin.
- No helper output or header values appear in reports (credential canary
  coverage alongside the existing sanitization tests).
