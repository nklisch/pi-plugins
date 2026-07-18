---
id: epic-native-plugin-management-clean-environment-core-e2e-golden-journeys
kind: story
stage: done
tags: [e2e-test, testing]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [epic-native-plugin-management-clean-environment-core-e2e-infrastructure]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Prove packed golden journeys through Pi

## Scope

Implement Unit 2 from the parent feature using only the packed-process infrastructure. Cover the full locally available user journey: clean startup; marketplace add/list/browse; exact inspect/diagnose; staged non-secret configuration/trust/install and unavailable secret path; enable/disable/update/uninstall; safe project-sync publication/convergence; update policy/notices/automatic drain; offline restart; `/plugin` RPC/print and the native TUI manager.

Core golden fixtures may declare skills and ordinary command hooks. Do not inject or install production MCP/subagent forks. Candidates that require those capabilities belong to the unavailable-path assertion, not the success fixture.

## Files

- `test/e2e/golden/clean-startup-marketplace.e2e.test.ts`
- `test/e2e/golden/install-lifecycle.e2e.test.ts`
- `test/e2e/golden/project-sync-updates-offline.e2e.test.ts`
- `test/e2e/golden/pi-command-manager.e2e.test.ts`

## Journey invariants and evidence

1. **Clean package/startup** — a fresh Pi agent/project starts local-only, lists no plugins/marketplaces, and exposes honest secret/MCP/subagent capability status.
2. **Marketplace and inspection** — adding the HTTPS Git fixture selects one immutable snapshot; list/browse/show/diagnose return stable exact identities, safe provenance, complete core skill/hook inventory, and explicit incompatible/unavailable siblings.
3. **Three-step install** — `install open` performs no mutation and returns one exact session/consent binding; public Pi input/confirmation supplies one non-secret value and consent; apply succeeds only after exact activation observation. A sensitive candidate remains uninstalled and leaks no canary because the real packaged secret adapter is unavailable.
4. **Runtime proof** — after install/reload, a fresh Pi `get_commands` contains the fixture skill and the real fixture hook writes its expected data marker. Neither progress nor the first result alone satisfies the assertion.
5. **Lifecycle** — disable removes skill/hook contribution, enable restores it, V2 update changes independently visible skill/hook evidence, and uninstall removes active/installed evidence while preserving data only when explicitly requested.
6. **Project sync** — trusted project publish creates canonical portable `.pi/plugins.json`; apply sees convergence; user/project scope remains independent; the file contains no machine path/revision/config/trust/cache/time/secret.
7. **Policy/notices** — one notice per exact revision survives restart; acknowledgment changes unread but not unresolved; manual update resolves; automatic policy requires exact consent and `/plugin updates automatic run` provides the live reload context.
8. **Offline restart** — with Git stopped and `PI_OFFLINE=1`, startup finishes inside 15 seconds, active local resources remain available, stale/update health is truthful, and no service request occurs.
9. **Headless/TUI parity** — RPC and print expose the same facade identities. A real 120×30 then 58×24 PTY shows the selected Installed/Updates/Browse/Marketplaces hierarchy, keyboard navigation, exact detail/diagnostic states, and signed `Step 1/3`, `Step 2/3`, `Step 3/3` install topology without asserting colors or browser pixels.

## Acceptance criteria

- [ ] All eight parent taxonomy journeys run against real Pi 0.80.8 and the installed tarball; no test imports source, fake host/application, or manager classes.
- [ ] Every mutation is re-observed through a separate command or fresh process and through the promised file/resource outcome.
- [ ] Non-secret configuration reaches the hook behavior while public output remains redacted; sensitive plaintext appears nowhere.
- [ ] Missing production MCP/subagent support is explicitly unavailable and never counted as a successful component.
- [ ] V1/V2/V3 lifecycle and update-notice identities remain exact across refresh, acknowledgment, policy, reload, restart, and uninstall.
- [ ] Project intent uses only capability-supported create/converged paths; unsupported replacement is not mislabeled success.
- [ ] TUI actions are keyboard-only and assert semantic text/information states at fixed dimensions; Escape closes each layer and leaves no PTY/process.
- [ ] Offline assertions verify both latency and zero Git-service request delta.

## Test integrity

Park genuine product failures with `/agile-workflow:park`; retain the failing invariant and a backlog-linked narrow skip/xfail. In particular, do not weaken the signed three-step TUI assertion to one-shot install if production wiring is missing. Fix fixture, PTY/RPC, and drifted assertion defects immediately. Never infer success from progress, service traffic, a callback, an internal row, or an arbitrary nonempty output.

## Implementation notes

- Execution capability: GPT-5.6 Sol xhigh, caller-selected; one feature owner reused the packed harness directly with no nested agents.
- Review weight: standard from `.work/CONVENTIONS.md`; child-story checkpoint does not receive review.
- Files changed: `test/e2e/harness/journey.ts`, PTY/capability diagnostics, and all four `test/e2e/golden/*.e2e.test.ts` files.
- Tests added: clean capability/status; HTTPS marketplace registration and stable browse identities; exact inspection/unavailable paths; open/configure/consent/install; skill/hook observation; lifecycle V1/V2 removal; portable project sync; V2/V3 notices/policy; offline restart; RPC/print parity; wide/narrow PTY and signed three-step topology.
- Simplification: shared packed/remote setup is one journey helper; ordinary local/cache/project/offline paths remain passing tests while only the exact blocked production paths are xfailed.
- Discrepancies from design: this host lacks util-linux `script`, so the PTY test writes and asserts an explicit capability receipt; `PI_PLUGIN_HOST_E2E_REQUIRE_PTY=1` keeps the required Linux CI path fail-closed. Exact candidate inspection currently returns `CONTROL_INTERNAL`, and production projection publication cannot activate skills/hooks, so affected assertions are linked expected failures rather than weakened checks.
- Adjacent issues parked: `idea-fix-packed-candidate-inspection`, `idea-production-projection-publication`.
- Verification: all golden files passed (12 tests including the linked executable expected failures); offline restart and zero-request assertions passed.
