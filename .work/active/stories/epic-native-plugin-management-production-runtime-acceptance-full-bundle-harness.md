---
id: epic-native-plugin-management-production-runtime-acceptance-full-bundle-harness
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-production-runtime-acceptance
depends_on: [epic-native-plugin-management-production-runtime-acceptance-package-provenance]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Build the real production full-bundle harness

## Checkpoint

Implement Unit 2 from the parent feature. Extend the proven packed Pi 0.80.8 process harness with a registry-installed production consumer, one complete foreign-plugin fixture, and one deterministic external model service. No product/runtime fake or source import may satisfy production evidence.

## Files

- `test/e2e/harness/production-environment.ts`
- `test/e2e/harness/production-model-service.ts`
- `test/e2e/harness/production-bundle.ts`
- bounded extensions to existing environment/process/RPC/PTY/Git/state helpers
- `test/e2e/services/deterministic-openai.mjs`
- `test/e2e/fixtures/marketplace/plugins/production-bundle/**`
- `test/e2e/fixtures/model/models.json`
- `test/e2e/production/harness-smoke.e2e.test.ts`
- `vitest.e2e.config.ts`, `package.json` only for the production lane

## Full-bundle fixture

One V1/V2 Claude-native plugin owns:

- one discoverable skill;
- ordinary `SessionStart`/tool hooks;
- `SubagentStart` context injection and `SubagentStop` one-round continuation;
- a real standard-I/O MCP JSON-RPC server with an `identity` tool;
- one required non-sensitive `CHANNEL` value used by hooks/MCP at execution time.

V2 changes every observable marker. The hook writes only safe boundary/identity/round markers to plugin data. The MCP server reports revision plus late root/data/channel values and starts only after an explicit gateway call.

## Harness invariants

- Pi, Pi TUI, candidate, MCP adapter, subagent package, Git, hooks, MCP, SQLite, RPC, and PTY are real packed/public processes and bytes.
- A separate finite OpenAI-compatible service supplies deterministic model responses only. It imports no product/adapter module; request counts/logs are diagnostics, never success evidence.
- Parent MCP flow discovers source/server through the real `mcp` gateway before calling. Parent subagent flow invokes the real `subagent` tool and can succeed only after exact start injection and same-session Stop continuation.
- Every test owns fresh HOME/agent/session/project/XDG/npm/Git/log/process roots and fixed locked service ports. No arbitrary sleeps or auto-increment ports.
- Pass teardown closes every process group, listener, source, lease, RPC/PTTY, verifies SQLite/canaries, and leaves no artifact directory.

## Acceptance evidence

- [ ] Production consumer installs from the candidate tarball and public lock/SRI bytes with no checkout/global/foreign-host resolution.
- [ ] One top-level Pi install discovers `/plugin`, subagent tools, and MCP gateway, and status reports both production capabilities available.
- [ ] Candidate show/diagnose reports one compatible complete bundle and truthful `RUNTIME_ALIAS_UNAVAILABLE` evidence.
- [ ] Fixture hook/MCP/model services exercise public protocol boundaries and expose no product call-count oracle.
- [ ] Service/model absence does not block local offline startup or MCP source registration.
- [ ] Teardown reliably fails on process, port, source, lease, SQLite, staging, canary, or retained-artifact residue.

## Ordering and risk

Depends on package/provenance so all paths and resource entries use `@nklisch/pi-plugins`. The hardest harness risk is deterministic subagent model scripting without becoming a runtime mock; user-visible Pi results and plugin-owned behavior markers remain the sole acceptance authority.

## Implementation notes

- Replaced checkout dependency copying with a test-owned public-registry lock/cache and immutable registry-installed consumer template. Public rows are HTTPS/SRI-bound; Pi's undeclared nested bundled closure is explicitly represented as Pi-tarball-owned authority so `npm ci` can replay it.
- Added one V1/V2 production bundle fixture carrying a skill, three ordinary/subagent hooks, one usable and one intentionally failing MCP server, and non-sensitive late `CHANNEL` configuration.
- Added a finite external OpenAI-compatible process that emits only model protocol responses. Real Pi tools, subagent child sessions, hook commands, MCP processes, Git, SQLite, RPC, and PTY remain acceptance authorities.
- Added production sandbox/model/bundle/environment helpers with fixed locked ports, condition-driven waits, process cleanup, lock/SRI/realpath audits, and no checkout/global/foreign-host resolution.
- Verified the production harness smoke plus the one-install Pi 0.80.8 infrastructure lane; startup remains local when the model service is absent and MCP stays unlaunched until an explicit tool call.
