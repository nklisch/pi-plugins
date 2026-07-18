---
id: fix-bundled-subagent-peer-resolution
kind: story
stage: done
tags: [compatibility, infra]
parent: simplify-plugin-manager-experience
depends_on: []
release_binding: 0.1.2
created: 2026-07-18
updated: 2026-07-18
---

# Fix bundled subagent peer resolution

A top-level `@nklisch/pi-plugins` installation correctly contains the bundled `@nklisch/pi-subagents@18.0.4-nklisch.0` tree and passes its immutable receipt, but the candidate-owned Jiti loader cannot resolve `@earendil-works/pi-coding-agent` from that nested tree. Pi provides coding-agent, AI, and TUI modules through its own extension-loader aliases rather than installing another copy beside each extension package. The wrapper therefore returns no extension, no service is published, and runtime qualification reports subagents unavailable.

Bridge the exact Pi-loaded coding-agent, AI, and TUI module identities into the verified child Jiti loader as virtual modules. Retain one child loader so the package extension and documented root service export share module identity. Do not install another Pi runtime tree, mutate Pi settings, deep-import private Pi loader code, or weaken package receipt verification.

Packed real-Pi acceptance must load both package-declared extension resources and require the subagent capability to qualify as available. One top-level Pi package installation remains sufficient.

## Verification

- `npm test` passed: typecheck, boundaries, 336 files / 1667 tests, build, compiled imports, and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance.
- Packed acceptance now fails unless both declared extension resources load and `capabilities.subagents.status` is `available`.
- A live Pi invocation loading the built wrapper and host extension reported `subagents: available · published subagent lifecycle evidence satisfies complete semantics and Node/Pi ranges`.
