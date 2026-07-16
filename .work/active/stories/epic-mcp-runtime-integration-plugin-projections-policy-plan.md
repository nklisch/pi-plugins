---
id: epic-mcp-runtime-integration-plugin-projections-policy-plan
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-plugin-projections
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Extract the Shared MCP Compatibility Plan

## Checkpoint

Move the existing MCP declaration interpretation out of `compatibility-evaluator.ts` into one strict, registry-driven plan consumed by both compatibility reporting and plugin MCP projection. This is extraction plus explicit fail-closed alias collisions, not a second parser.

## Files

- `src/domain/mcp-compatibility-plan.ts`
- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/index.ts`
- `test/domain/mcp-compatibility-plan.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- `test/domain/compatibility-table-contract.test.ts`

## Contract

Implement `McpCompatibilityPlanSchemaV1`, `McpCanonicalOptionsSchemaV1`, and `analyzeMcpCompatibility({ plugin, component })` exactly as designed in the parent feature. Registry metadata owns accepted field aliases, canonical targets, units, allowed transports, rules, and collision behavior.

The supported plan contains only component id, canonical transport, secret-free structural options, requirement capability ids, and stripped/sorted source locations. Command, args, cwd, env values, URL, headers, bearer environment names, OAuth client values, declarations, and native causes remain outside it.

## Acceptance evidence

- [ ] Existing MCP compatibility fixtures preserve intended verdicts, requirements, safe diagnostics, and deterministic ordering.
- [ ] Evaluator MCP dispatch delegates to the shared analyzer; no prior transport/auth/feature parser remains beside it.
- [ ] Conflicting selector/field aliases, unequal canonical aliases, allow/deny overlap, unknown fields, SSE, WebSocket, and unsupported auth fail closed.
- [ ] Removing a registry mapping makes report and plan reject the same declaration.
- [ ] Secret canaries cannot appear in serialized plans or diagnostics.

## Ordering and boundary

No sibling dependencies. This story does not touch readers, files, runtime ports, fake runtime state, launch values, lifecycle, reload, persistence, or a production MCP package.
