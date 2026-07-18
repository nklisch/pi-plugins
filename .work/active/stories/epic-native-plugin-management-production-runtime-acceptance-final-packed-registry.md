---
id: epic-native-plugin-management-production-runtime-acceptance-final-packed-registry
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-production-runtime-acceptance
depends_on: [epic-native-plugin-management-production-runtime-acceptance-concurrency-presentation-security]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Certify the from-empty packed registry candidate

## Checkpoint

Implement Unit 6 from the parent feature in `test/e2e/production/final-packed-registry.e2e.test.ts`. This is the release-critical final acceptance: create a consumer from empty through npm's lock/SRI path, install one private packed `@nklisch/pi-plugins` candidate through Pi, and repeat a compact all-component lifecycle. Do not publish or release.

## Installation contract

1. Start with an empty root containing only the candidate tarball, exact generated package/lock inputs, and fresh HOME/agent/project/npm/Git/XDG/session directories.
2. Run offline `npm ci --ignore-scripts --no-audit --no-fund` against a test-owned cache populated from public registry HTTPS bytes and exact integrity receipts. Never copy/link `node_modules`.
3. Audit `npm ls --omit=dev --all`, every realpath/symlink, candidate/bundled-subagent manifests, MCP programmatic export, Pi/Pi TUI 0.80.8, adapter license/tree receipts, unset `NODE_PATH`, isolated npm prefix/cache/userconfig, and no checkout/global/foreign-host path.
4. Run one `pi install <candidate package root>`. Pi lists the candidate as the sole top-level source while the bundled receipt wrapper and host extension both operate.
5. Execute compact smoke: capabilities; full-bundle V1 install and skill/ordinary-hook/subagent-start-and-stop/MCP-late-value/alias-omission observation; disable/enable; V2 update; offline restart; uninstall/delete-data; final restart/absence.
6. Verify SQLite/canaries/processes/ports/sources/leases/staging/artifacts, then delete the root.

## Acceptance evidence

- [ ] Missing undeclared runtime dependencies fail installation; no network/checkouts/globals repair them.
- [ ] Every public dependency is lock/SRI-resolved, candidate name is `@nklisch/pi-plugins`, and one top-level Pi install automatically composes exact production MCP/subagent runtimes.
- [ ] The compact journey uses real packed/public bytes and public/user-visible outcomes across every whole-plugin lifecycle state.
- [ ] Final startup is offline and clean of Claude/Codex/global state.
- [ ] CI runs this lane on Node 24/bookworm with exact Pi 0.80.8 and existing native capability pins.
- [ ] Candidate remains `private: true`, `0.0.0`, release-unbound, untagged, and unpublished.

## Ordering and risk

Depends on concurrency/presentation/security, which transitively requires every earlier production checkpoint. Registry snapshot preparation may use public network; the final install and runtime are offline. Any public-byte or dependency-resolution drift is a release blocker, not permission to copy the checkout or weaken integrity.

## Implementation notes

- Added the release-critical from-empty helper and acceptance. It starts without `node_modules`, copies only package/lock/candidate inputs, and runs offline `npm ci --ignore-scripts` against the test-owned cache before any Pi process starts.
- The generated lock records every ordinary public dependency with HTTPS/SRI. Pi 0.80.8's self-contained but undeclared nested dependency tree is honestly marked as owned by the exact Pi tarball SRI, and its public manifest closure is declared in the acceptance consumer so npm's lock validation is replayable.
- Audited `npm ls`, all realpaths/links, exact Pi/Pi TUI 0.80.8, candidate identity, bundled subagent tree receipt, MCP receipt, unset `NODE_PATH`, isolated HOME/XDG/npm/Git state, and absence of checkout/global/Claude/Codex resolution.
- One top-level candidate installation completed V1 skill/hook/subagent/MCP observation, disable/enable, V2 update, offline restart, uninstall/delete-data, and final absence using only packed/public bytes and user-visible outcomes.
- Added focused production/final E2E scripts and made the CI step explicitly name the from-empty registry lane. Verified the final acceptance and the complete 10-test production suite green; no publish, tag, release, or binding occurred.
