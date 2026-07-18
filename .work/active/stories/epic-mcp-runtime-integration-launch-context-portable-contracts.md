---
id: epic-mcp-runtime-integration-launch-context-portable-contracts
kind: story
stage: done
tags: [compatibility, infra, security]
parent: epic-mcp-runtime-integration-launch-context
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Define Portable MCP Launch Contracts

## Priority

High; first checkpoint and shared contract for projection and invocation.

## Deliverable

Define the strict, package-neutral launch-template, active-selection/context, ambient-environment, root-token, and safe-failure contracts. Canonicalize only launch-bearing fields from a trusted `McpServerComponent` through one `createMcpLaunchTemplate` function consumed later by both plugin projection and immediate invocation.

The contract remains secret-free: source templates contain only trusted static non-secret text, logical root/config/environment references, and typed structure. No process/connection, runtime package import, state, or concrete environment adapter is added.

## Planned files

- `src/domain/mcp-launch-template.ts`
- `src/runtime/plugin-launch-roots.ts`
- `src/runtime/hooks/hook-launch-contract.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/infrastructure/logging/redaction.ts`
- `src/application/ports/mcp-launch-context.ts`
- `src/application/ports/mcp-launch-environment.ts`
- `src/domain/error-contract.ts`
- `src/application/resolved-configuration.ts`
- `test/domain/mcp-launch-template.test.ts`
- `test/runtime/hooks/hook-launch-contract.test.ts`
- `test/application/mcp-launch-contract.test.ts`
- `test/application/resolved-configuration.test.ts`

## Contract checkpoints

- `McpLaunchTemplateSchemaV1` has exactly `stdio` and `streamable-http` variants. Stdio owns command/args/cwd/environment templates; HTTP owns URL/header/bearer templates.
- Transport/type, cwd, auth, and header aliases canonicalize from `CompatibilityPolicyRegistry`. Conflicting aliases and unsupported fields fail rather than gaining precedence.
- The exact token vocabulary is five root tokens, `${user_config.KEY}`, and portable `${NAME}` ambient references. Resolution is non-recursive.
- Root token names have one registry shared with guarded hooks. Existing shell/unknown-placeholder hook behavior remains unchanged.
- Sensitive header/query classification is shared with structured redaction. Credential-bearing literal material is incompatible; trusted non-secret static values remain representable.
- Active-selection/context/environment callback interfaces return `Promise<void>` and discard callback completion. No generic callback result can carry plaintext.
- Stable MCP launch error codes extend the one common `ErrorCodeRegistry`; status schemas continue deriving from that registry.
- All environment/header maps use null-prototype construction and own-property checks. Configuration/environment keys such as `__proto__`, `constructor`, and `prototype` never trigger prototype mutation.

## Acceptance evidence

- [ ] Canonical template fixtures cover command/type inference, HTTP aliasing, cwd/auth/header aliases, deterministic ordering, and strict unknown/conflicting rejection.
- [ ] Malicious empty/nested/unclosed/unknown/NUL/prototype-like placeholders fail safely or resolve only through a `Map`/facade; inserted values are not reparsed.
- [ ] POSIX/Windows environment-name and HTTP header-name schemas reject invalid syntax without normalizing caller spelling.
- [ ] Credential portions of static auth/token/password/credential-like fields and sensitive URL query values require logical value references (while syntax such as `Bearer ` may remain static); non-secret static headers remain supported.
- [ ] Existing guarded-hook template tests pass unchanged after root registry extraction.
- [ ] Schema/string/JSON tests prove no resolved configuration, ambient environment, bearer, URL, header, command, or root value exists in the portable contracts.

## Ordering

No sibling dependencies. The trusted-context checkpoint depends on these contracts. The plugin-projections sibling may consume `createMcpLaunchTemplate` after this story without waiting for a real MCP package.

## Risk and rollback

The risk is creating a launch-field vocabulary that drifts from compatibility policy. Derive aliases/keys from the existing registry and assert mechanical agreement. If canonical mapping cannot preserve an accepted declaration, compatibility must fail that declaration rather than source projection guessing. Rollback removes only unconsumed package-internal contracts and restores the unchanged hook root list.

## Production boundary

This checkpoint proves only serializable/template and callback-port contracts. It does not register a source, read `process.env`, launch a process, connect HTTP, or qualify `pi-mcp-adapter`.

## Implementation notes

- Added the strict schema-derived `McpLaunchTemplate` union and one deterministic `createMcpLaunchTemplate` mapper over the compatibility registry. Standard-I/O environment and HTTP header ordering are canonical; transport/type, cwd, and authentication aliases fail closed on conflicts.
- Added one shared structured sensitive-field classifier. Compatibility, canonical template creation, and infrastructure redaction now agree that credential-looking environment/header/query fields require a supported late-value reference; static non-secret declarations remain valid.
- Extracted the five launch-root names into `PluginLaunchRootRegistry` and reused it from guarded hooks without changing hook shell/unknown-placeholder semantics.
- Added exact callback-only launch binding/context/environment ports and stable MCP launch codes derived from the common error registry. `McpConfigSource` now accepts only the canonical typed launch-template union.
- Hardened resolved configuration environment output with frozen null-prototype maps and own-property semantics, including `__proto__` and `constructor` keys.
- Execution capability: GPT-5.6 Sol, xhigh, direct host ownership. The four checkpoints share one security boundary and write set, so cohesive sequential ownership was safer than story-level delegation; nested agents were explicitly prohibited.

## Verification

- Risk-first portable/template tests were written before implementation and initially exercised 14 assertions across template, callback, configuration, and hook behavior.
- Focused final check: `npx vitest run test/domain/mcp-launch-template.test.ts test/domain/compatibility-evaluator.test.ts test/domain/compatibility-table-contract.test.ts test/application/mcp-launch-contract.test.ts test/application/resolved-configuration.test.ts test/application/mcp-runtime-contract.test.ts test/runtime/hooks/hook-launch-contract.test.ts test/integration/compatibility-reporting.test.ts` — **43 passed, 0 failed**.
- `npm run typecheck` — passed.
- No process environment, file/settings mutation, secret store, transport, auth, process, lifecycle, reload, or package adapter was added.
