---
id: mcp-adapter-search-and-human-gateway-output
kind: story
stage: done
tags: [tui, compatibility]
parent: null
depends_on: []
release_binding: 0.1.15
gate_origin: null
created: 2026-07-22
updated: 2026-07-22
---

# MCP adapter 2.11.0-nklisch.2: tool search and human gateway output

User-reported: MCP operations dumped entire JSON specs into chat history.
The source was the fork's programmatic gateway (`programmatic-extension.ts`)
pretty-printing full payloads — source inventories, capability specs, and
tool lists with inputSchemas — for every status/capabilities/list action.

## Changes

- Adapter bump to `@nklisch/pi-mcp-adapter@2.11.0-nklisch.2` (receipt,
  dependency pin, and every version/integrity pin site updated:
  runtime provider constant, integration test, compiled import check,
  production e2e expectations).
- Gateway `status`/`capabilities`/`list` now render one-to-three-line human
  text (`MCP: 2/3 servers connected · 14 tools`,
  `✓ zread (5 tools)`, one line per tool with a short description);
  structured payloads remain on result `details`.
- New gateway `search` action: substring or `regex: true` matching over
  tool names/descriptions across one source's servers, one short line per
  match. Servers that won't start are reported as unsearchable instead of
  sinking the query (best-effort, like every other boundary).
- Failures are plain sentences ("That MCP server isn't registered…",
  "That search query isn't usable…").

Adapter fork evidence: `v2.11.0-nklisch.2` tag
`ff2d099cc12ca3b2fd768497e8325b7db18d8993`, release commit
`706c163935eb9f2c0e77f2335623651acb633e91`, registry integrity
`sha512-ocrvhYsBSnIu/M9kW9U6qCscCQWrQ9uUZdF/T4/e6x/666DTgowP8gh5jbPHjLk7MnzWiwIjXUgSQB4aWHm8Pg==`,
installed-tree digest
`sha256:a8326e59befb9584a6eadecc8ecf1f631bb0913f25ad0afbe31159dd0b810bde`.

## Verification

- Adapter: 453 tests + packed package qualification green.
- Host: typecheck, boundaries, 1699 unit tests, compiled imports, packed
  real-Pi RPC/JSON/PTY acceptance against the published 2.11.0-nklisch.2 —
  all green.
