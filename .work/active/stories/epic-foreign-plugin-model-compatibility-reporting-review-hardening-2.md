---
id: epic-foreign-plugin-model-compatibility-reporting-review-hardening-2
kind: story
stage: review
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-compatibility-reporting
depends_on: [epic-foreign-plugin-model-compatibility-reporting-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden MCP Credential Selector Semantics

## Scope

Close two residual MCP default-deny failures reproduced by final compatibility certification.

## Required fixes

- Treat bearer-token authentication and OAuth flow selectors as mutually exclusive unless the documented schema explicitly represents a coherent combined mode. A declaration containing bearer `type`/token environment plus authorization-code or client-credentials selectors must be incompatible with an exact source-located diagnostic.
- Reject Streamable HTTP/SSE MCP URLs containing embedded username or password credentials. URL protocol validity alone is insufficient; embedded credentials must yield incompatible assessment without echoing credential values.
- Validate all authentication selector combinations through one explicit registry/table rather than first-recognized-branch behavior.
- Add positive bearer-only and OAuth-only fixtures plus negative combined-selector and embedded-credential fixtures. Assertions must include verdict, activatable, diagnostic code/rule/source pointer, requirement ids, and serialized report canary exclusion.

## Acceptance criteria

- [x] Conflicting bearer/OAuth selectors are incompatible and cite the auth declaration location.
- [x] MCP URLs with embedded username/password are incompatible without leaking credentials.
- [x] Valid bearer-only and OAuth-only declarations retain their documented supported behavior and requirements.
- [x] Negative fixtures assert full outcomes and redaction.
- [x] Full `npm test`, build, boundaries, and exact compiled package import pass.

## Implementation notes

- Execution capability: direct-read inline implementation; the caller explicitly prohibited agents.
- Authentication selectors now use the policy registry as one coherent parser. Bearer credentials and OAuth flow selectors are mutually exclusive, duplicate credential sources fail closed, and valid bearer-only/OAuth-only declarations retain their runtime requirements.
- Streamable HTTP and SSE URLs reject embedded userinfo credentials; URL and opaque authentication values are omitted from diagnostics so reports remain redacted.
- Compatibility fixtures assert complete verdict, activatability, diagnostic, requirement, provenance, and serialized-canary outcomes for both positive and negative cases.
- Verification: `npm test` passed (51 files, 350 tests, typecheck, dependency boundaries, build, and compiled package import); independent `npm run build && node test/compiled-package-import.mjs` passed (131 exports).
- Files changed: `src/domain/compatibility-evaluator.ts`, `src/domain/compatibility-policy.ts`, `test/domain/compatibility-evaluator.test.ts`, `test/domain/compatibility-table-contract.test.ts`, and `test/fixtures/compatibility/mcp.ts`.
- `.work/bin/work-view` was intentionally excluded from this story commit.
