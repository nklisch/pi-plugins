# Pi Plugins

Native plugin management for [Pi](https://github.com/badlogic/pi-mono), with compatibility for supported Claude Code and Codex marketplaces.

`@nklisch/pi-plugins` provides:

- marketplace discovery, inspection, and read-only foreign-state adoption;
- transactional install, enable, disable, update, recovery, and uninstall;
- Agent Skills and command-hook activation;
- receipt-qualified MCP and subagent lifecycle integration;
- deterministic `/plugin` commands and a Pi-native interactive manager;
- offline-safe startup, update policy, diagnostics, and multiprocess coordination.

## Requirements

- Node.js 24 or newer
- Pi 0.80.8-compatible public extension APIs

## Install

```bash
pi install npm:@nklisch/pi-plugins@0.1.0
```

Then start Pi and run:

```text
/plugin
```

Use `/plugin help` for deterministic command-mode usage. The interactive manager opens only in a TUI session.

## Security

Pi packages execute with full local-system access. Review the source and requested plugin trust before installation. Sensitive plugin configuration currently fails closed when production cannot prove atomic operating-system credential ownership; plaintext is never retained in plugin-host state, projections, diagnostics, logs, or control output.

Marketplace-derived network access is origin-authorized and DNS-pinned. Credential-bearing MCP endpoints require HTTPS; unauthenticated plaintext HTTP is limited to explicitly approved literal loopback endpoints.

## Compatibility

The current production package pins and verifies:

- `@nklisch/pi-mcp-adapter@2.11.0-nklisch.0`
- `@nklisch/pi-subagents@18.0.4-nklisch.0`

Executable dependencies are receipt-checked before import. Package, API, runtime-range, installed-tree, or behavioral drift makes the affected capability unavailable rather than partially activating it.

See [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md) for the complete compatibility contract.

## License

MIT © 2026 Nathan Klisch
