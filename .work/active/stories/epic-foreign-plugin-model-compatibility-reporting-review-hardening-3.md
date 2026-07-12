---
id: epic-foreign-plugin-model-compatibility-reporting-review-hardening-3
kind: story
stage: implementing
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

- [ ] Stdio with HTTP headers, bearer auth, OAuth, or URL fields is incompatible and source-located.
- [ ] Valid stdio command declarations remain supported with no HTTP capability requirements.
- [ ] Valid Streamable HTTP header/bearer declarations remain supported and redacted.
- [ ] Transport-specific fixtures assert full positive/negative outcomes.
- [ ] Full `npm test`, build, boundaries, and exact compiled package import pass.
