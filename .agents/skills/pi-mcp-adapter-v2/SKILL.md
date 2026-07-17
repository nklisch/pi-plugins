---
name: pi-mcp-adapter-v2
description: >
  Current pi-mcp-adapter v2 integration facts. Load when work mentions pi-mcp-adapter,
  pi-mcp-adapter@2.11.0, nicobailon/pi-mcp-adapter, loadMcpConfig, initializeMcp,
  McpServerManager, MCP config providers/sources, programmatic MCP registration,
  plugin-scoped MCP activation, or an upstream/fork MCP adapter decision.
user-invocable: false
---

# `pi-mcp-adapter` v2 reference

## Verified baseline

- Evidence date: **2026-07-16**.
- npm latest: **2.11.0**, MIT, published 2026-07-03.
- Upstream `main`, tag `v2.11.0`, and npm `gitHead` all resolve to
  `82724dccc13a49310530898f922bafff12b7f3fe`.
- Detailed evidence: [`docs/research/pi-mcp-adapter-config-source.md`](../../../docs/research/pi-mcp-adapter-config-source.md).

## Package shape

`package.json` declares:

```json
{
  "type": "module",
  "bin": { "pi-mcp-adapter": "cli.js" },
  "pi": { "extensions": ["./index.ts"] }
}
```

Important constraints:

- No `exports`, `main`, `module`, or `engines` field.
- Publishes TypeScript extension modules, not a compiled library API.
- Runtime Pi AI/TUI dependencies are `^0.74.0`; coding-agent `^0.79.1` is a
  dev dependency and is supplied by Pi.
- MCP SDK dependency is `^1.25.1`; Zod peer range is v3.25 or v4.
- Deep imports may resolve because `exports` is absent, but they are unsupported
  internals and must not be used as a production contract.

## Current load order

At extension construction, `index.ts`:

1. reads `--mcp-config` directly from `process.argv`;
2. synchronously loads config files with process cwd;
3. loads the agent-wide metadata cache;
4. derives and registers direct Pi tools;
5. registers the proxy `mcp` tool when needed;
6. registers `session_start` afterward.

At `session_start`, `initializeMcp`:

1. reads the Pi flag and loads files again with `ctx.cwd`;
2. constructs `McpServerManager` and `McpLifecycleManager`;
3. registers merged servers;
4. restores valid cache metadata;
5. connects all servers when no cache exists, otherwise eager/keep-alive
   servers, plus missing-cache direct-tool servers;
6. starts lifecycle health checks.

File precedence is:

1. `~/.config/mcp/mcp.json`
2. Pi-global `mcp.json` or the `--mcp-config` override
3. project `.mcp.json`
4. project `.pi/mcp.json`

The flag replaces only layer 2; it does not disable other files or imports.

## Supported API verdict

2.11.0 does **not** expose a supported programmatic configuration-source API.
It lacks:

- source registration before Pi tool registration;
- stable source identity/provenance as lifecycle authority;
- atomic source replace and exact remove;
- source-qualified, redacted status inspection;
- complete runtime capability reporting;
- caller-provided late launch-value callbacks;
- cancellation for source lifecycle operations.

Existing internal signatures such as these are not a substitute:

```ts
export default function mcpAdapter(pi: ExtensionAPI): void;
export function loadMcpConfig(overridePath?: string, cwd?: string): McpConfig;
export async function initializeMcp(pi: ExtensionAPI, ctx: ExtensionContext): Promise<McpExtensionState>;

// Deep internal module only
class McpServerManager {
  connect(name: string, definition: ServerDefinition, signal?: AbortSignal): Promise<unknown>;
  close(name: string): Promise<void>;
}
```

Connection/tool cancellation exists, but no source-lifecycle cancellation does.
Environment/header/bearer interpolation occurs at connection creation through
`process.env`; that is process-global interpolation, not source-scoped secret
custody.

## Upstream prior art is not consumable

- Issue `nicobailon/pi-mcp-adapter#85` requests programmatic session-scoped
  configuration and remains open.
- PR `#56` proposes `registerMcpServerProvider(pi, provider)` returning
  `{ source, priority?, servers }`, but remains open/unmerged on a stale v2.6-era
  base with dirty merge state.
- PR #56 lacks atomic replace/remove, status, capabilities, late values, and
  cancellation. It also writes provider-backed direct-tool overrides into user
  config. Do not depend on its SHA or reproduce that design as the final port.

## Integration decision

1. **Preferred:** contribute a documented programmatic source lifecycle upstream
   and consume the first release containing it.
2. **Fallback:** if upstream timing is insufficient, publish a narrowly
   maintained MIT fork from the current release with the identical contract.
3. **Reject:** deep imports, monkeypatching, generated/temp/global config files,
   process-global secret injection, or Pi settings mutation.
4. **Reject:** reimplementing MCP on `@modelcontextprotocol/sdk`; transport,
   authentication, discovery, elicitation, sampling, and process lifecycle stay
   in the dedicated runtime.

## Current project decision

On 2026-07-16 the operator authorized option 2 rather than waiting indefinitely:

1. establish `nklisch/pi-mcp-adapter` and publish the planned
   `@nklisch/pi-mcp-adapter` package from verified upstream history;
2. keep the patch limited to the generic source lifecycle and unchanged
   conformance, preserving standalone extension/CLI behavior;
3. integrate only published, pinned, qualifying bytes through the existing host
   wrapper;
4. then rebase the proven generic commits onto current upstream, open a fresh PR
   referencing issue #85 and PR #56, and track return to an upstream release.

This authorization removes the wait-only blocker, not the qualification gate.
Unpublished fork bytes cannot make production MCP availability truthful.
Package-independent Plugin Host ports, schemas, capability mapping, fakes, and
conformance remain package-neutral.

## Minimum contract invariants

Any upstream/fork API must:

- be a documented package export;
- accept complete secret-free sources before Pi tool registration;
- optionally disable all file/import discovery for Plugin Host composition;
- key source/server/cache/process state by scope + plugin + revision/projection,
  never display/server name alone;
- atomically compare-and-replace one complete source, preserving the old source
  on validation/reconciliation failure;
- idempotently remove only the exact source and its processes/metadata;
- inspect local registered inventory separately from remote connection health;
- return complete environment-aware capabilities, including explicit false
  values for unsupported transport/auth/UI behavior;
- resolve env/headers/bearer values only inside an immediate launch/connect
  callback with `AbortSignal`, then dispose them on every outcome;
- keep status/errors JSON-safe and free of expanded config, credentials, callback
  values, and native causes;
- distinguish Streamable HTTP from automatic legacy-SSE fallback;
- preserve existing standalone file behavior for ordinary adapter users.

Do not mark the Plugin Host bridge complete until a real package passes these
semantics, not merely matching TypeScript names.

## Primary sources

- npm metadata: <https://registry.npmjs.org/pi-mcp-adapter/2.11.0>
- release: <https://github.com/nicobailon/pi-mcp-adapter/releases/tag/v2.11.0>
- pinned `index.ts`: <https://github.com/nicobailon/pi-mcp-adapter/blob/82724dccc13a49310530898f922bafff12b7f3fe/index.ts>
- pinned `config.ts`: <https://github.com/nicobailon/pi-mcp-adapter/blob/82724dccc13a49310530898f922bafff12b7f3fe/config.ts>
- pinned `init.ts`: <https://github.com/nicobailon/pi-mcp-adapter/blob/82724dccc13a49310530898f922bafff12b7f3fe/init.ts>
- pinned manager: <https://github.com/nicobailon/pi-mcp-adapter/blob/82724dccc13a49310530898f922bafff12b7f3fe/server-manager.ts>
- issue #85: <https://github.com/nicobailon/pi-mcp-adapter/issues/85>
- PR #56: <https://github.com/nicobailon/pi-mcp-adapter/pull/56>
