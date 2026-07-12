---
id: epic-foreign-plugin-model-compatibility-reporting-review-hardening-2
kind: story
stage: implementing
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

- [ ] Conflicting bearer/OAuth selectors are incompatible and cite the auth declaration location.
- [ ] MCP URLs with embedded username/password are incompatible without leaking credentials.
- [ ] Valid bearer-only and OAuth-only declarations retain their documented supported behavior and requirements.
- [ ] Negative fixtures assert full outcomes and redaction.
- [ ] Full `npm test`, build, boundaries, and exact compiled package import pass.
