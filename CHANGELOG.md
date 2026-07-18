# Changelog

## v0.1.0

### Features

- Install and manage compatible Claude Code and Codex marketplaces without either foreign host, with read-only adoption of foreign marketplace declarations.
- Activate Agent Skills, command hooks, and MCP servers as one revision-bound plugin across install, enable, disable, update, and uninstall.
- Manage plugins through the Pi-native interface or deterministic `plugin-control/v1` commands, including inspection, diagnosis, update policy, notices, and operation control.
- Ship receipt-qualified maintained MCP and subagent integrations with plugin-scoped lifecycle and faithful subagent hook interception.

### Fixes

- Make lifecycle mutations transactional across processes, with exact conflict handling, crash recovery, rollback, offline restart, and persistent-data retention choices.
- Keep update discovery non-blocking and separate from automatic application while preserving the active revision on acquisition, validation, compatibility, or activation failure.

### Security

- Enforce source and redirect authority, DNS-pinned egress, hardened Git/npm/archive acquisition, canonical YAML/JSON boundaries, and redacted control output.
- Verify exact package SRI, installed trees, manifests, APIs, licenses, and runtime ranges before maintained adapter code executes; capability drift and unavailable secret custody fail closed.
- Keep MCP launch values callback-scoped and sensitive plaintext absent from durable state, projections, diagnostics, logs, and terminal/control output.

### Documentation

- Align architecture, specification, compatibility, and auto-loading integration references with the shipped runtime contracts and known MCP alias limitation.
- Verify the release from an empty dependency tree through packed lock/SRI replay, complete V1-to-V2 runtime lifecycle, contention and recovery, offline restart, and post-uninstall absence.
