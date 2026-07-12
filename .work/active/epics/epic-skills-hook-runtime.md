---
id: epic-skills-hook-runtime
kind: epic
stage: drafting
tags: [compatibility, infra]
parent: null
depends_on: [epic-transactional-plugin-lifecycle]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Skills and Command-Hook Runtime

## Brief

This epic activates installed Agent Skills and compatible command lifecycle hooks inside Pi. Enabled plugin skill roots participate in Pi resource discovery, while a host-owned hook runtime translates Pi lifecycle events into the documented Claude and Codex command-hook contracts.

The runtime covers command execution, matcher and tool-name aliases, `if` rules, compatible input and output shapes, path and configuration substitution, timeouts, cancellation, context injection, blocking, input and output rewriting, deterministic handler aggregation, and guarded continuation. It also establishes the typed interception boundary required for faithful subagent start and stop hooks.

This epic does not manage marketplace acquisition or plugin state and does not host MCP transports. Unsupported hook events and outputs remain explicit incompatibilities rather than approximations.

## Foundation references

- `docs/VISION.md` — Product promise, Honest compatibility
- `docs/SPEC.md` — Skills, Hooks, Hook execution
- `docs/ARCHITECTURE.md` — Skills adapter, Hook adapter, Subagent adapter, Runtime projections
- `docs/COMPATIBILITY.md` — Skills, Hook handlers, Hook events, matcher/input/output mappings

## Anticipated child features

- skill projection and `resources_discover` integration
- normalized command-hook schema and executable forms
- lifecycle event and session-source translation
- matcher aliases and tool-event `if` evaluation
- compatible hook input construction and environment substitution
- hook output decisions, context, rewriting, errors, and continuation guards
- concurrent execution, cancellation, timeout, and deduplication
- research-backed subagent interception contract and adapter integration

<!-- The design pass on each child feature will fill in real specifics. -->
