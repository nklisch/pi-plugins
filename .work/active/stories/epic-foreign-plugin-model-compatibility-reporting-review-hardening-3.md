---
id: epic-foreign-plugin-model-compatibility-reporting-review-hardening-3
kind: story
stage: done
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-compatibility-reporting
depends_on: [epic-foreign-plugin-model-compatibility-reporting-review-hardening-2]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Enforce MCP Transport and Authentication Coherence

## Scope

Close the remaining MCP transport-coherence fail-open case.

## Required fixes

- Define transport-specific allowed-field sets in the MCP classifier. Stdio accepts command/args/env/cwd and documented stdio features only; HTTP headers, bearer authentication, OAuth, URLs, and other HTTP-only semantics on stdio are incompatible.
- Apply equivalent coherence checks across Streamable HTTP, SSE, websocket, and unknown transports so behavior-bearing fields cannot be accepted under a transport that cannot preserve them.
- Replace the existing positive fixture that expects stdio plus HTTP headers/bearer authentication to be supported with a complete negative outcome. Add positive stdio-only and HTTP bearer/header cases.
- Keep credential/header values out of diagnostics and serialized reports.

## Acceptance criteria

- [x] Stdio with HTTP headers, bearer auth, OAuth, or URL fields is incompatible and source-located.
- [x] Valid stdio command declarations remain supported with no HTTP capability requirements.
- [x] Valid Streamable HTTP header/bearer declarations remain supported and redacted.
- [x] Transport-specific fixtures assert full positive/negative outcomes.
- [x] Full `npm test`, build, boundaries, and exact compiled package import pass.

## Implementation notes

- Execution capability: direct-read inline implementation; the caller explicitly prohibited agents and the existing unstaged evaluator/policy/fixture work provided the implementation surface.
- Transport coherence is registry-driven: canonical stdio, Streamable HTTP, SSE, WebSocket, and unknown declarations are checked against transport-specific field sets before transport requirements are emitted. Unsupported HTTP/auth/url fields on stdio therefore fail closed without inheriting stdio runtime requirements.
- Valid stdio-only and Streamable HTTP header/bearer fixtures now assert complete verdict, activatability, requirement, diagnostic, source-pointer, and serialized-canary outcomes. Diagnostic construction continues to omit opaque credential/header values.
- Verification: `npm test` passed (51 files, 352 tests, typecheck, dependency boundaries, build, and compiled package import); independent `npm run build && node test/compiled-package-import.mjs` passed (131 exports).
- Files changed: `src/domain/compatibility-evaluator.ts`, `src/domain/compatibility-policy.ts`, `test/domain/compatibility-policy.test.ts`, `test/fixtures/compatibility/mcp.ts`, and `test/integration/compatibility-reporting.test.ts`.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane transport-coherence review. Independently confirmed 352 tests, clean typecheck and dependency boundaries, build, and exact 131-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
