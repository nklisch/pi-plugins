---
id: epic-mcp-runtime-integration-launch-context-transport-delivery
kind: story
stage: done
tags: [compatibility, infra, security]
parent: epic-mcp-runtime-integration-launch-context
depends_on: [epic-mcp-runtime-integration-launch-context-trusted-context]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Deliver Immediate MCP Transport Values

## Priority

High; produces the provider consumed by the completed package-neutral bridge seam.

## Deliverable

Implement `createTrustedMcpLaunchValueProvider`. It owns a parsed copy of one registered `McpConfigSource`, resolves one exact server through `McpLaunchContextPort`, reads only explicitly trusted ambient environment references through `McpLaunchEnvironmentPort`, and returns one fresh disposable `McpLaunchValues` lease for immediate standard-I/O launch or Streamable HTTP connection.

The provider performs no process, HTTP, OAuth, discovery, status, cache, file, state, environment mutation, or lifecycle work.

## Planned files

- `src/runtime/mcp/launch-value-provider.ts`
- `src/runtime/mcp/launch-error.ts`
- `src/application/resolved-configuration.ts`
- `test/runtime/mcp/launch-value-provider.test.ts`
- `test/application/resolved-configuration.test.ts`

## Standard-I/O mapping

- Resolve command and each argument independently as literal exec-form strings. Never invoke or emulate a shell.
- Resolve cwd only from the exact trusted declaration. Do not narrow existing trusted arbitrary cwd semantics, but reject empty/NUL results and callback overrides.
- Always supply `CLAUDE_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `PLUGIN_DATA`, and `CLAUDE_PROJECT_DIR` from the trusted context.
- Supply current `CLAUDE_PLUGIN_OPTION_<KEY>` values from `ResolvedConfiguration.environment()` and resolve direct `${user_config.KEY}` references through the facade.
- Resolve portable `${NAME}` references through provider-owned root/config names first, then through the requested-name-only ambient facade.
- Add declared environment entries only after platform collision validation. The result is an override map; host inheritance remains runtime-owned.

## Streamable HTTP mapping

- Resolve then parse URL; accept only `http:`/`https:`, no userinfo/NUL/control characters, and no invalid final URL.
- Normalize no URL text beyond the platform URL parser's validity check; query/path substitutions retain foreign literal semantics.
- Treat header names case-insensitively on all platforms. Reject duplicate names, invalid token names, and CR/LF/NUL values.
- Resolve string templates and structured environment references through current configuration/ambient facades.
- Resolve bearer selectors to raw token material from `CLAUDE_PLUGIN_OPTION_<KEY>` or one explicitly requested ambient name. Reject missing/empty/control/whitespace values.
- Reject a separate bearer selector when an `Authorization` header already exists. OAuth remains runtime-owned and is not converted to a bearer token.

## Platform and collision behavior

- Portable environment names use ASCII identifier syntax and reject `=`/NUL.
- POSIX collision equality is exact; Windows equality is ASCII case-insensitive.
- Reject collisions across reserved roots, configured variables, and declared entries. There is no last-writer precedence.
- Build maps with null prototypes, sort deterministically, freeze returned arrays/maps, and never use prototype-chain membership.
- Header equality is ASCII case-insensitive independent of process platform.

## Ownership and disposal

Each `resolve` returns a fresh accessor-backed object satisfying the existing `McpLaunchValues` union. Backing plaintext and provider ownership live in WeakMaps. `toString`/`toJSON`/inspection are redacted. `dispose` accepts only an object issued by this provider, invalidates access, and performs its cleanup effect once; a duplicate valid call is idempotent. A foreign/copied object cannot dispose another launch.

A final signal check is the ownership transfer point. If cancellation wins before successful return, the provider invalidates the lease and throws the exact abort reason. Once return succeeds, the MCP runtime owns exactly-once disposal after immediate consumption on success, consumer failure, timeout, cancellation, or partial launch/connect.

## Acceptance evidence

- [ ] Command/argument/root/config/ambient substitution is exact, non-recursive, literal, and deterministic; unknown/missing values fail without partial output.
- [ ] Root/config/declared environment collisions cover POSIX and Windows behavior, including case aliases and prototype-like keys, without overwriting.
- [ ] URL protocol/userinfo/control, header syntax/case/CRLF, bearer ambiguity/missing/empty/control/whitespace, and configured-versus-ambient lookup cases return stable safe codes.
- [ ] The source and active selection are copied/verified; caller mutation cannot change future output.
- [ ] Concurrent resolves produce distinct arrays/maps/lease identities and may observe different authoritative configuration/environment revisions.
- [ ] Success, mapper failure, ambient failure, abort before/during/after issuance, wrong transport, wrong provider, access after disposal, and duplicate disposal have exact ownership counts.
- [ ] `JSON.stringify`, string coercion, inspection, typed errors, and status mapping never expose command/args/cwd/URL/header/bearer/environment/config/root canaries.

## Ordering

Depends on `epic-mcp-runtime-integration-launch-context-trusted-context`. The conformance checkpoint depends on this provider.

## Risk and rollback

The irreducible risk is that a trusted runtime copies a JavaScript string before disposal. The provider can invalidate access and prevent accidental serialization but cannot erase a consumer's copy. Immediate-consumption conformance is therefore mandatory for a future production adapter. If it fails, leave MCP unavailable. Rollback removes the provider without touching source/state/projection authority.

## Production boundary

Returning values through `FakeMcpRuntime.launch` is not evidence of real standard-I/O or HTTP support. No executable resolver, child process, HTTP client, auth implementation, or package adapter is added here.

## Implementation notes

- Added `createTrustedMcpLaunchValueProvider`, bound at construction to a parsed deep copy of one canonical source. Every resolve requires an exact source/server/component/transport binding and compares the callback's freshly recreated canonical component template with the registered template.
- Added a strict, single-pass placeholder parser for the five roots, `${user_config.KEY}`, and portable `${NAME}` references. Unknown namespaces, empty/nested/unclosed/NUL tokens fail; inserted values are never reparsed. Ambient custody receives only sorted explicitly referenced names, and `CLAUDE_PLUGIN_OPTION_*` can never fall through to process state.
- Standard-I/O rendering preserves literal exec-form command/arguments, trusted-template cwd, all five roots, current configured options, and declared entries in frozen null-prototype maps. POSIX exact and Windows ASCII case-insensitive collisions reject across all layers.
- Streamable HTTP rendering enforces HTTP(S), no userinfo/control characters, case-insensitive header uniqueness, CR/LF/NUL rejection, configured/ambient bearer selectors, no authorization/bearer ambiguity, and no empty/control/whitespace bearer material.
- Every resolve issues fresh accessor-backed arrays/maps and a provider-owned WeakMap lease. String/JSON/inspection are redacted; duplicate valid disposal is idempotent, foreign-provider disposal fails safely, and all access after disposal fails. The final abort check is the exact ownership-transfer point.
- Added code/name-only cancellation and timeout classification; native messages and causes are not retained.

## Verification

- Focused transport/lifetime matrix: `npx vitest run test/runtime/mcp/launch-value-provider.test.ts test/application/resolved-configuration.test.ts` — **26 passed, 0 failed**.
- Coverage includes literalness, non-recursion, hostile prototype keys, ambient allowlists, POSIX/Windows collisions, URL/header/bearer rejection, source copying, concurrent lease independence, pre/mid/post-issue cancellation, environment failures, wrong-provider cleanup, and dispose-once behavior.
- `npm run typecheck` — passed.
- No shell, executable resolver, process, HTTP client, OAuth implementation, environment mutation, process cleanup, cache, or package adapter was introduced.
