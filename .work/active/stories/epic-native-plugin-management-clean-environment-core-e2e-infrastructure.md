---
id: epic-native-plugin-management-clean-environment-core-e2e-infrastructure
kind: story
stage: implementing
tags: [e2e-test, testing]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Build packed Pi process E2E infrastructure

## Scope

Implement Unit 1 from the parent feature: a separate serial Vitest E2E lane that builds and packs the product once, installs the tarball into an isolated consumer without checkout dependency links, installs that isolated package through Pi 0.80.8, and drives real Pi RPC and PTY processes in clean homes/projects.

Add the real Git/filesystem/SQLite/process harness, the separate HTTPS `git http-backend` service, process-level fault controls, test-only TLS material, fixture marketplace/plugins, deterministic ports/timeouts, artifact capture, and leak-free teardown. Do not import product `src/` or checkout `dist/` from `test/e2e/`.

## Files

- `vitest.e2e.config.ts`
- `package.json`
- `.gitignore`
- `test/e2e/harness/{constants,environment,process,pi-rpc,pi-pty,git-service,state-inspector,faults}.ts`
- `test/e2e/services/git-smart-http.mjs`
- `test/e2e/fixtures/tls/*`
- `test/e2e/fixtures/marketplace/**`
- `test/e2e/infrastructure/packed-pi-smoke.e2e.test.ts`

## Required behavior

- Pin Pi and Pi TUI to 0.80.8 and verify the loaded CLI/package versions before any journey.
- Build → `npm pack` → isolated offline `npm install --ignore-scripts` → `pi install <isolated package root>` is the only product installation path.
- Dereference copied dependency bytes and reject every realpath/symlink that enters the checkout.
- Give each test fresh HOME, agent/session/XDG/npm/Git/project roots and a minimal executable PATH with no Claude/Codex executable or state.
- Drive `/plugin` through Pi RPC `prompt` plus `get_entries`; correlate only the extension's public control-report custom entry.
- Drive TUI through a real fixed-size pseudo-terminal and output-marker waits using Node's VT stripping; no direct manager/component import.
- Use real Git repositories, Node SQLite, and plugin fixture processes. The only custom service is the separate HTTPS Git smart-HTTP process.
- Use fixed port 46180 by default with an explicit lock and fail on occupation. Centralize every timeout and prohibit arbitrary sleeps.
- Capture sanitized failure evidence and terminate whole process groups; verify SQLite integrity and no child/port/listener residue.

## Acceptance criteria

- [ ] The smoke test starts a completely clean real Pi process, discovers exactly the packed `dist/pi/extension.js`, reports `/plugin`, returns local status, and shuts down without network or foreign-host access.
- [ ] Tarball contents exclude source/tests/work files; package/dependency resolution remains inside the isolated consumer.
- [ ] The fixture service serves a bare repository through real Git smart HTTP and supports external pause/resume/kill/connection-close controls without importing product code.
- [ ] RPC framing uses strict LF records and handles public Pi UI requests; PTY framing handles repaint output without snapshotting colors/ANSI.
- [ ] State inspection can inventory files, run `PRAGMA integrity_check`, scan canaries, and apply only explicit test-owned corruption mutations.
- [ ] Setup failures name the missing tool/version/port; they never skip to checkout imports, public registry/network, fake Pi, or random ports.
- [ ] Teardown is idempotent after success, assertion failure, timeout, SIGKILL, paused process, and partial setup.

## Test integrity

If this infrastructure exposes a real product bug, park it via `/agile-workflow:park`, keep the honest assertion, and use only a backlog-linked narrow skip/xfail. Fix stale fixtures, harness framing, and bad assertions in-session. Never assert mock calls, progress-only success, “some error,” or whatever bytes happen to be emitted. Never delete a flaky process case without identifying product, fixture, harness, or environment root cause.
