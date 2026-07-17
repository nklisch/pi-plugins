---
id: epic-native-plugin-management-clean-environment-core-e2e
kind: feature
stage: review
tags: [compatibility, e2e-test]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-pi-extension-manager]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Clean-Environment Core Package Acceptance

## Brief

Prove the locally implementable package and extension composition in a clean environment with no Claude or Codex installation and no unpublished maintained-fork dependency. Build and install the package as a consumer would, load the Pi extension entry, and exercise the deterministic facade plus representative manager flows against local marketplace/source fixtures and package-neutral conforming runtime participants.

Acceptance covers registration/browse/inspection, configuration and trust, install, enable, disable, update, uninstall, project-sync, diagnostics, restart/recovery, update notifications/settings, and offline startup for plugins whose runtime requirements are available on the local path. Missing MCP or subagent production adapters must be reported honestly as unavailable; this feature cannot use fakes to claim those production paths complete.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Depends on the complete local Pi extension/manager package.
- Owns consumer-shaped package fixtures, clean-home/process harnesses, service-boundary runtime doubles, and core packaged acceptance evidence.
- Does not implement product behavior or vendor the maintained forks.

## Acceptance boundary

- Tests start from empty Pi/Plugin Host homes, install only declared package artifacts and local fixtures, and never read Claude/Codex executables, homes, credentials, or caches.
- Package metadata discovers the extension without source-tree imports; compiled public exports and runtime dependencies are sufficient.
- Deterministic subcommands and the TUI invoke the same facade and produce matching operation identities/outcomes.
- Restart preserves authoritative state and notification deduplication, completes recovery where required, and activates verified local projections without network access.
- Network loss, stale marketplaces, corrupted replaceable cache, cancellation, incompatible plugins, untrusted projects, missing configuration, and unavailable production participants fail or degrade explicitly without hanging startup.
- The suite remains service-level mocked at external package/network boundaries and avoids duplicating unit-level foreign reader or transaction matrices.

## Mockup inheritance

The E2E flow asserts the interaction topology and key information states from the selected manager and install mockups, not pixel output or the Catppuccin reference palette.

## Design decisions

- **Dispatch**: direct-read only. The design read the parent epic; all foundation and compatibility documents; completed packaged-host, marketplace, inspection, trusted-install, lifecycle/sync, update, control, and Pi-manager feature records; the packed consumer; existing integration/child-process fixtures; the actual extension/control/manager code; Pi 0.80.8 package, extension, package, RPC, SDK, and TUI contracts; and the signed manager/install HTML. No question, nested agent, peer mechanism, source implementation, or work-view edit was used.
- **Black-box definition**: a core E2E test imports no `src/`, checkout `dist/`, test-only product factory, or deep package path. It interacts with the packed product only through a real Pi 0.80.8 process, Pi's public package/extension/RPC/TUI surfaces, public `/plugin` output, generated files, and on-disk state. Existing fake-`ExtensionAPI` and source-loader tests remain integration tests; they are not promoted by relabeling.
- **Consumer installation**: run `npm run build`, create an `npm pack` tarball, copy the already installed Pi/runtime dependency tree into an isolated consumer with symlinks dereferenced, run `npm install --offline --ignore-scripts <tarball>`, then run the consumer's Pi 0.80.8 `pi install <isolated-package-root>`. Pi therefore discovers `dist/pi/extension.js` from the packed manifest. A recursive realpath audit rejects any dependency or extension path that resolves into the checkout. Manual tar extraction is not the acceptance path.
- **Clean process boundary**: every test owns fresh `HOME`, `PI_CODING_AGENT_DIR`, session directory, project, XDG roots, npm config/cache, Git config, logs, and process group. The executable `PATH` exposes only the test-owned links to Node 24, npm, Git, shell, `script`/`stty`, and explicitly required fixture tools; `claude`, `codex`, their homes, credentials, and caches must be absent before and after the journey.
- **Real Pi command path**: headless commands run by sending `/plugin …` as an extension command to a real `pi --mode rpc --no-session` subprocess. The harness reads Pi's public RPC stream and `get_entries` results, selecting the package's `plugin-host:control-report-v1` custom entry. Print-mode smoke tests assert bounded user-facing text. Stable facade status/exit fields are authoritative because Pi 0.80.8 command handlers themselves return `void` and cannot set the Pi process exit code.
- **Real Pi TUI path**: interactive acceptance launches the same Pi CLI inside a util-linux `script` pseudo-terminal at fixed dimensions. Keys are written to the PTY; assertions inspect new terminal output after each action with Node 24's `stripVTControlCharacters`. The test asserts information states and navigation, not escape bytes, colors, or browser-mock pixels.
- **No production-runtime overclaim**: the default packed extension supplies no MCP or subagent fork. Golden plugins declare skills and ordinary command hooks only. Separate candidates declaring MCP, subagent interception, or sensitive configuration prove honest unavailable paths. No package-neutral fake is injected into the default extension, and this core suite cannot close production acceptance.
- **Network boundary**: local Git repositories cover ordinary local source behavior. Remote Git, refresh loss, and update-notice behavior use one separate HTTPS fixture process backed by the system `git http-backend` and local bare repositories. WireMock cannot implement Git smart-HTTP negotiation faithfully, while a fake Git client would replace the product's real external contract; the purpose-built process is the narrow service-level substitute. It has no product import and exposes only Git endpoints, readiness/fault control, and bounded request-phase files.
- **No in-process mocks**: tests do not spy on calls, inject product ports, replace time in JavaScript, fake SQLite, or instantiate the manager/controller. Real SQLite files are inspected externally with Node's `node:sqlite`; hook fixtures are real child processes; network faults kill/pause the Git fixture; clock regression runs the complete Pi process under `libfaketime`.
- **Clock fault**: CI pins Debian bookworm `libfaketime` 0.9.10-2.1. The harness restarts the whole Pi process with a regressed wall clock while preserving its agent directory. This is process-wide syscall interception, not an application clock stub. The suite records the loaded library path/version in artifacts and fails the clock lane explicitly when the pinned capability is absent.
- **Parallelism and ports**: E2E files run serially. HTTPS Git uses `127.0.0.1:${PI_PLUGIN_HOST_E2E_GIT_PORT:-46180}` and a process lock; an occupied configured port is a setup failure, never an auto-increment race. TLS uses committed test-only localhost CA/certificate material and an isolated `GIT_SSL_CAINFO`.
- **Time bounds**: one registry owns `startup=15s`, `rpc=15s`, `read=20s`, `network=30s`, `lifecycle=60s`, `faultBoundary=15s`, `shutdown=10s`, and per-test `120s`. Harness waits are event/file/RPC-condition based; no arbitrary sleeps. Timeout diagnostics retain sanitized process output, service phase, process tree, SQLite integrity, and file inventory.
- **State assertions**: public command/RPC/TUI outcomes remain primary. Filesystem assertions verify `.pi/plugins.json`, skill/hook effects, selected artifact presence/absence, empty staging after cleanup, and no secret/foreign residue. `PRAGMA integrity_check` is allowed as external durability evidence. Tests do not infer success from an internal table row, mock call, progress frame, or callback.
- **Suite granularity**: E2E covers journeys and seams, not every schema or transaction branch already owned by unit/integration suites. Representative corruptions and crash points are chosen by user-visible recovery outcomes. Existing foreign-format, secure-extraction, lifecycle crash-matrix, scheduler, parser, and TUI line tests remain their detailed authorities.
- **Artifacts and teardown**: pass teardown terminates process groups, closes RPC/PTYS, stops Git, restores writable fixture permissions, removes sandboxes, and verifies no child/listener/port remains. Failure copies redacted logs, RPC records, terminal deltas, service phases, file inventory, and SQLite integrity to `.e2e-artifacts/<test-id>/`; secret canaries are scanned before retention. `PI_PLUGIN_HOST_E2E_KEEP=1` retains the sandbox intentionally.
- **Foundation timing**: code-first. Foundation documents already require packed clean-environment operation, offline startup, public Pi integration, exact lifecycle results, and unavailable production capabilities. This design adds tests, not a new product assertion.

## Mock-boundary plan

| Boundary | Test substitute | Version / process | Justification and assertion rule |
|---|---|---|---|
| Product | Real npm tarball installed into isolated consumer | package under test, current commit | Only packed `dist`/manifest bytes load. No checkout import or symlink is accepted. |
| Pi host | Real `@earendil-works/pi-coding-agent` and `pi-tui` | exactly 0.80.8 | Commands use public RPC/extension APIs; TUI uses the real CLI and terminal. No fake `ExtensionAPI` in E2E. |
| Git/filesystem | Real local working and bare repositories, real `git` subprocess | version captured at setup; minimum supported version enforced | Exercises real source resolution, immutable commits, files, symlinks, and process cancellation. |
| Remote Git service | Custom separate Node HTTPS process wrapping `git http-backend` | Node 24 + captured system Git | Git smart HTTP has no faithful off-the-shelf mock already in the project. WireMock would only replay bytes and miss protocol negotiation. Tests assert product outcomes, never received-call counts. |
| SQLite | Real Plugin Host databases inspected by `node:sqlite` | Node 24 built-in SQLite | No database mock. External checks are integrity, isolation, and absence of forbidden values. |
| Hook execution | Executable plugin fixture scripts in spawned child processes | Node 24 | They are plugin content, not product mocks. Assertions inspect plugin data files and Pi skill discovery. |
| Network faults | SIGSTOP/SIGCONT/SIGKILL of the Git service; connection close mode for an active request | OS process boundary | Failure is injected outside the product. A proxy/container is unnecessary for the required drop/loss cases. |
| Clock regression | Process-wide `libfaketime` | Debian bookworm 0.9.10-2.1, CI-pinned | No public packed time port exists; changing the host clock is unsafe. Applies to the complete Pi process and SQLite/filesystem work. |
| Secret custody | Real default packaged adapter | deliberately unavailable | No keyring fake. Sensitive candidates must remain blocked and plaintext absent. |
| MCP/subagents | Real absence of unpublished production adapters | none installed | No fake can claim production support. Candidates requiring either remain non-activatable with exact diagnostics. |
| Terminal | Real PTY via util-linux `script` | version captured by capability probe | The manager is exercised by keyboard and rendered output, not direct component calls. |

**Mock count**: 0 in-process mocks; 1 custom service process (Git smart HTTP); 1 off-the-shelf process-level fault tool (`libfaketime`). Everything else is the real local service/runtime.

## Taxonomy plan

- **Golden — 8 journeys**: packed clean startup; marketplace add/browse; exact inspect/diagnose; staged non-secret configuration/trust/install plus sensitive-unavailable path; enable/disable/update/uninstall; project-sync safe available paths; policy/notices/automatic drain; offline restart plus headless and native TUI manager parity.
- **Failure — 10 scenario groups**: corrupt authority/cache/content; stale cursors/detail/session tokens; project replacement and lost trust; blocked recovery; unavailable secret/MCP/subagent capabilities; malformed/incompatible content; broken output; cancellation before/after durable boundaries; reload failure/successor loss; foreign config and source disappearance.
- **Chaos — 5 deterministic scenarios**: kill during source publication; kill during lifecycle pending/reload handoff; two-process mutation contention; network loss during refresh/update; wall-clock regression across restart. Each maps to an existing recovery, fallback, coalescing, or pause contract.
- **Fuzz — 4 bounded campaigns**: `/plugin` text/argv grammar; opaque cursor/token replay and mutation; portable project declaration/state corruption; Claude/Codex foreign configuration. Fixed seed `0x504c5547`, explicit mutation IDs, bounded case/byte counts, and replayable failure artifacts keep the campaign deterministic.

## Test program invariants

1. Every product process loads the isolated packed extension through Pi package discovery.
2. Every test starts with empty product state unless it explicitly restores a prior test-owned snapshot.
3. User and project scopes, projects, sessions, and processes never share accidental homes.
4. Neither Claude nor Codex executable/state/auth is a prerequisite; foreign fixtures are created only inside the test-owned home for adoption/fuzz scenarios and remain byte-identical after reads.
5. A mutation succeeds only when `/plugin` returns the exact terminal outcome and the next independent Pi process observes the matching state/resource result.
6. Progress, custom-entry publication, fixture request logs, and internal SQLite rows are never success authority by themselves.
7. Failure, abort, kill, or stale evidence preserves the last independently observed working revision or produces explicit recovery-required evidence.
8. No secret canary appears in RPC records, terminal output, Pi sessions/custom entries, Plugin Host files, Git fixture logs, process environment dumps, or retained artifacts.
9. Offline startup performs no Git-service request and returns local status/resource commands within the startup deadline.
10. Every SQLite database passes `PRAGMA integrity_check` after normal shutdown and recoverable crash scenarios.
11. PTY assertions target the selected split-inspector hierarchy and three-step install information states, not colors or exact line placement.
12. Tests never become green by weakening the outcome: real product bugs are parked and represented by a linked `skip`/`xfail`; stale fixtures/mocks are repaired in the same implementation stride.

## Implementation units

### Unit 1: Packed clean-environment process infrastructure

**Story**: `epic-native-plugin-management-clean-environment-core-e2e-infrastructure`

**Files**:
- `vitest.e2e.config.ts`
- `package.json`
- `.gitignore`
- `test/e2e/harness/constants.ts`
- `test/e2e/harness/environment.ts`
- `test/e2e/harness/process.ts`
- `test/e2e/harness/pi-rpc.ts`
- `test/e2e/harness/pi-pty.ts`
- `test/e2e/harness/git-service.ts`
- `test/e2e/harness/state-inspector.ts`
- `test/e2e/harness/faults.ts`
- `test/e2e/services/git-smart-http.mjs`
- `test/e2e/fixtures/tls/localhost-ca.pem`
- `test/e2e/fixtures/tls/localhost-cert.pem`
- `test/e2e/fixtures/tls/localhost-key.pem`
- `test/e2e/fixtures/marketplace/.claude-plugin/marketplace.json`
- `test/e2e/fixtures/marketplace/plugins/core-local/**`
- `test/e2e/fixtures/marketplace/plugins/project-local/**`
- `test/e2e/fixtures/marketplace/plugins/secret-required/**`
- `test/e2e/fixtures/marketplace/plugins/mcp-required/**`
- `test/e2e/fixtures/marketplace/plugins/subagent-required/**`
- `test/e2e/fixtures/marketplace/plugins/incompatible/**`
- `test/e2e/infrastructure/packed-pi-smoke.e2e.test.ts`

**Scaffold**:

```ts
const sandbox = await createCleanE2ESandbox(testId);
const artifact = await installPackedProduct(sandbox); // build → pack → npm install → pi install
const pi = await PiRpcProcess.start({ sandbox, artifact, project: sandbox.project });
const commands = await pi.request({ type: "get_commands" });
expect(commands).toContainCommand("plugin", artifact.extensionPath);
const report = await pi.plugin("status");
expect(report.envelope).toMatchObject({ status: "ok" });
await pi.shutdown();
await assertCleanTeardown(sandbox);
```

**Setup**: capability-probe Node/npm/Git/`git http-backend`/`script`/`stty`/`libfaketime`; build and pack once per suite; create a per-test consumer and clean environment; initialize fixture Git working/bare repositories; start the fixed-port HTTPS service only for tests that request it.

**Invariant**: the packed product can be installed and discovered by real Pi 0.80.8 from an otherwise empty agent/project environment without consulting checkout or foreign-host state.

**Assertions**:
- tarball manifest contains `dist/pi/extension.js`, package manifest, runtime dependencies, exact Pi metadata, and no `src`/test/work files;
- `npm install` and `pi install` succeed offline; `pi list` names only the isolated package;
- package/dependency realpaths do not enter the checkout and no dependency symlink remains;
- RPC `get_commands` reports the extension-owned `/plugin`; status is local and capabilities report secrets/MCP/subagents honestly;
- no Git-service request, Claude/Codex path, unexpected network, leaked process, or invalid SQLite database exists.

**Teardown**: graceful RPC EOF/SIGTERM, bounded SIGKILL fallback, stop fixture process group, verify SQLite, scan canaries/logs, release port lock, remove or retain the test-owned root according to the artifact policy.

### Unit 2: Golden user journeys

**Story**: `epic-native-plugin-management-clean-environment-core-e2e-golden-journeys`

**Files**:
- `test/e2e/golden/clean-startup-marketplace.e2e.test.ts`
- `test/e2e/golden/install-lifecycle.e2e.test.ts`
- `test/e2e/golden/project-sync-updates-offline.e2e.test.ts`
- `test/e2e/golden/pi-command-manager.e2e.test.ts`

#### Journey A — clean startup, marketplace, browse, inspect

**Setup**: clean installed package; HTTPS Git fixture at revision V1 with all candidate classes; no foreign homes.

**Invariant**: after a user adds one exact Git marketplace, browse/show/diagnose return its verified candidates and safe provenance through `/plugin` without foreign-host state.

**Assertions**: empty status/list first; add returns one registration/revision; list and browse survive a second read; exact show reports the core candidate's skill/hook inventory, non-sensitive field, available local runtime requirements, and no MCP/subagent claim; hostile/incompatible siblings remain explicit; registration and candidate IDs are stable only while the snapshot is current.

**Teardown**: graceful Pi shutdown and Git stop; registration/cache files remain only in the disposable sandbox.

#### Journey B — three-step non-secret install and unavailable secret path

**Setup**: Journey A state; core candidate has one required non-sensitive value, one skill, and one ordinary `SessionStart` command hook. RPC harness handles Pi's public `input` and `confirm` UI requests.

**Invariant**: choose/inspect → configure/trust → activation-result binds one immutable candidate and activates all locally available components; a sensitive candidate remains blocked because production secret custody is unavailable.

**Assertions**: `install open` returns exact session/consent IDs and no mutation; `install apply` collects the non-secret value and exact consent; terminal result is `succeeded`; a fresh `get_commands` contains the fixture skill; hook data records exact plugin/project roots and configured non-secret behavior without native paths in public output; secret install returns input/custody unavailable, creates no installed record, and leaks no plaintext canary.

**Teardown**: close Pi after independent status/list/resource observations; canary scan all owned files and streams.

#### Journey C — lifecycle update and removal

**Setup**: installed V1 core plugin; commit/publish V2 with a changed immutable revision and observable skill description/hook marker; refresh to produce an update candidate.

**Invariant**: disable removes the complete active local projection, enable restores it, update exposes and activates exactly V2, and uninstall removes all active projection while honoring the explicit data-retention choice.

**Assertions**: disabled skill disappears from Pi `get_commands`; enabled skill and hook return; update notice names V2; update result and subsequent fresh process select V2; old V1 remains active on any failed update subcase; uninstall with `--keep-data` removes skill/installed list but preserves the hook data marker; no active generated projection remains selected.

**Teardown**: restart once after uninstall to prove absence, then remove sandbox.

#### Journey D — project sync safe paths

**Setup**: trusted Git project, project-scoped marketplace/plugin installed; `.pi/plugins.json` absent.

**Invariant**: project sync publishes only portable intent through the capability-supported create-if-absent path and a later apply sees exact convergence without network or user-scope mutation.

**Assertions**: publish preview/apply writes one canonical newline-terminated `.pi/plugins.json`; file contains no absolute path, cache, timestamp, revision, configuration, trust, or secret; project and user lists remain independent; apply-intent returns current-state; restart in the same trusted project preserves activation.

**Teardown**: verify file and project state, then remove project/sandbox.

#### Journey E — update policy, notices, automatic drain, offline restart

**Setup**: installed remote V1; policy starts manual; publish V2/V3 through the Git fixture.

**Invariant**: each newly discovered immutable revision produces one durable notice independent of policy; acknowledgment changes unread only; automatic policy never applies without exact consent and a live Pi command/reload context; offline restart preserves the last active revision and dedupe state.

**Assertions**: cadence/manual policy readback survives restart; one refresh creates one V2 notice and repeated refresh does not duplicate it; acknowledgment leaves unresolved count; manual update resolves V2; exact automatic-policy preview/apply plus V3 refresh records pending when no background reload context exists; `/plugin updates automatic run` applies V3 once; stop Git and restart with `PI_OFFLINE=1`; startup remains within 15s, skill/hook V3 are active, notice counts/dedupe persist, and service request count does not change.

**Teardown**: Git remains down during final assertions; process/database cleanup as infrastructure specifies.

#### Journey F — `/plugin` headless and native manager

**Setup**: one sandbox seeded only through prior real `/plugin` RPC commands; launch print/RPC and then real interactive Pi in a 120×30 PTY.

**Invariant**: headless and TUI presentations consume the same authoritative facade evidence; the manager preserves the selected split-inspector topology and exposes the signed three-step install states through keyboard-only interaction.

**Assertions**: print/RPC status/list identities match; empty `/plugin` opens `PI / PLUGINS` on Installed with persistent list/detail, Updates count, Browse and Marketplaces tabs; arrow/tab/Enter/`/`/`?`/Escape work through configured keys; candidate install visibly reaches `Step 1/3 · Choose and inspect`, `Step 2/3 · Configure and trust`, exact executable disclosure, and `Step 3/3 · Activation result`; narrow 58-column restart retains all state labels and navigation; terminal output contains no fixture control/secret canary.

**Teardown**: Escape closes overlays/manager, graceful Pi shutdown, then process-group and PTY leak check.

### Unit 3: Failure, corruption, stale authority, and cancellation

**Story**: `epic-native-plugin-management-clean-environment-core-e2e-failure-recovery`

**Files**:
- `test/e2e/failure/corruption-staleness.e2e.test.ts`
- `test/e2e/failure/project-capability-failures.e2e.test.ts`
- `test/e2e/failure/output-cancellation-reload.e2e.test.ts`

**Scaffold**:

```ts
await withBaselineSnapshot("installed-v1", async (sandbox) => {
  await mutateOwnedState(sandbox, mutation);
  const pi = await PiRpcProcess.start({ sandbox });
  const report = await pi.plugin("diagnose");
  expect(report).toExpose(mutation.expectedCode);
  await expectWorkingSibling(pi);
  await assertSqliteIntegrity(sandbox.agentDir);
});
```

**Setup**: clone immutable test-owned baseline sandboxes; apply one external corruption or authority change before starting a fresh real Pi process. Cancellation scenarios use slow real Git or a fixture hook boundary and public RPC abort/PTY Escape.

**Invariant**: one bad authority, cache, token, project, capability, output channel, or operation does not become success, damage a previously active revision, silently choose current evidence, leak sensitive/native data, or hang Pi.

**Assertion matrix**:
- corrupt `current_pointer`/state blob yields blocked/corrupt diagnosis while readable sibling scope/plugin remains available and SQLite stays structurally valid;
- missing replaceable projection is rebuilt; missing marketplace cache is unavailable without network fallback; immutable descriptor/content tamper blocks only that plugin and never guesses from catalog/path;
- cursor/detail/install/operation tokens replayed after refresh, restart, or target change return stale/expired/missing and perform zero new mutation;
- replaced Git project identity and a restarted `--no-approve` project reject project operations while user plugins remain usable;
- a real killed transition followed by damaged rollback/candidate evidence remains recovery-required and blocks stacking, while an unrelated plugin starts;
- sensitive, MCP-required, and subagent-required candidates state exact unavailable requirements; incompatible content remains incompatible rather than partially installed;
- malformed marketplace/plugin output and disappearing source retain the last selected cache/revision;
- closed RPC/print/PTY output does not hang, rewrite a committed result as cancellation, or leave a child process; restart reports the durable truth;
- cancellation during Git preparation leaves no registration/install and cleans staging; cancellation after possible commit returns changed/rollback/recovery evidence, never a generic cancelled success;
- reload successor loss or forced shutdown exposes recovery/operation status on restart and does not use stale Pi context.

**Teardown**: every variant verifies process exit, empty/collectible staging, no lock owner, SQLite integrity, canary absence, and unchanged foreign fixture bytes before deleting its clone.

### Unit 4: Deterministic chaos and multiprocess recovery

**Story**: `epic-native-plugin-management-clean-environment-core-e2e-chaos-concurrency`

**Files**:
- `test/e2e/chaos/lifecycle-crash-recovery.e2e.test.ts`
- `test/e2e/chaos/multiprocess-network-clock.e2e.test.ts`

**Setup**: real packed Pi processes share only the deliberately same agent/project directories; fault triggers wait for externally visible service/filesystem/journal phases and then signal the process group. Every scenario has a fixed seed/boundary and one retry/restart.

**Invariant**: supported recovery/fallback contracts converge to one exact working or recovery-required state after crash, contention, network loss, or clock regression; no scenario accepts ambiguous partial activation.

**Scenarios and assertions**:
1. **Publication kill** — pause Git after pack completion, wait for private staging/hidden immutable payload, SIGKILL Pi before selected publication; restart retains prior registration, ignores/collects orphan content, and can retry once to one selected revision.
2. **Lifecycle/reload kill** — install/update V2, wait until the transition journal and state indicate a pending candidate but before successor result publication, SIGKILL; restart runs recovery before resource publication and independently exposes either exact V2 active or exact V1 restored according to observed evidence, never both/partial.
3. **Multiprocess contention** — two Pi RPC processes issue the same install/update/uninstall and a different-plugin mutation against one scope; same target has exactly one mutation winner and a current/conflict peer, different targets make progress without database corruption, and all final resource lists agree.
4. **Network loss** — SIGKILL Git during refresh/update acquisition; command terminates within network deadline, old catalog/active revision remains usable, backoff/stale health is visible, and restart offline performs no request.
5. **Clock regression** — create due/backoff/notice state, stop Pi, restart under the pinned process-wide wall-clock regression; scheduler/status reports `clock-regressed`, does not spin or refresh, explicit local reads remain responsive, and normal-time restart resumes from durable state without duplicate notice/application.

**Teardown**: SIGCONT any paused process before group termination, wait for OS lock release, assert no listener/port/process survives, run SQLite integrity and projection/resource agreement checks, and retain fault phase logs only on failure.

### Unit 5: Bounded grammar/state/config fuzz campaigns

**Story**: `epic-native-plugin-management-clean-environment-core-e2e-fuzz-boundaries`

**Files**:
- `test/e2e/harness/mutation-corpus.ts`
- `test/e2e/fuzz/control-argv-fuzz.e2e.test.ts`
- `test/e2e/fuzz/state-config-fuzz.e2e.test.ts`

**Scaffold**:

```ts
for (const vector of mutationCorpus({ seed: 0x504c5547, cases: 128, maxBytes: 8192 })) {
  const before = await publicStateDigest(pi);
  const result = await pi.pluginText(vector.text);
  expect(result).toBeSchemaBoundedAndSafe();
  if (!vector.validMutation) expect(await publicStateDigest(pi)).toBe(before);
}
```

**Setup**: one packed process per campaign and disposable baseline clones for state mutations. The corpus uses fixed grammar seeds and named mutation operators; failure artifacts include seed, case ID, exact bounded bytes, and replay command.

**Invariants and assertions**:
- arbitrary bounded quoting, option order, Unicode lookalikes, controls, NUL, overlong values, aliases, duplicate/conflicting flags, and token mutations either produce the documented envelope or exact valid command result; never crash, call an LLM, prompt unexpectedly, leak input, or mutate on invalid syntax;
- mutated cursor/detail/install/operation/notice IDs never retarget current authority;
- schema-aware project-intent mutations (unknown fields, machine paths, timestamps, duplicate identities, malformed UTF-8/JSON, traversal spellings) fail closed without changing project state/file;
- cloned SQLite state mutations (pointer/blob digest/kind/generation/document) yield bounded blocked/corrupt status, never automatic rewrite/default replacement or sibling loss;
- Claude JSON and Codex TOML mutation corpus preserves all foreign bytes, imports no trust/cache/credentials, and allows valid sibling declarations to survive;
- every response/output/artifact stays under configured byte limits and excludes native causes, absolute custody paths, ANSI/control injection, and secret canaries.

**Teardown**: compare foreign/config files byte-for-byte, verify no invalid-case state change, run SQLite integrity where structural mutation permits it, close process, and remove baseline clones.

## Implementation order

1. `epic-native-plugin-management-clean-environment-core-e2e-infrastructure`
2. In parallel after infrastructure:
   - `epic-native-plugin-management-clean-environment-core-e2e-golden-journeys`
   - `epic-native-plugin-management-clean-environment-core-e2e-failure-recovery`
   - `epic-native-plugin-management-clean-environment-core-e2e-fuzz-boundaries`
3. `epic-native-plugin-management-clean-environment-core-e2e-chaos-concurrency` after golden and failure establish the recoverable baselines.

One implementation owner should normally carry the feature because the packed sandbox, Pi RPC/PTY lifecycle, Git service, fixtures, and state assertions are shared. Stories are durable taxonomy checkpoints, not a mandate for one worker per story.

## Test-integrity contract

- If a specified E2E test exposes a real production bug, park it through `/agile-workflow:park`, keep the honest assertion, and use only a narrowly linked `skip`/`xfail` with backlog ID and one-line reason until the product item closes.
- Fix stale fixtures, drifted RPC/TUI parsers, service scripts, and bad assertions in the implementation stride.
- Never assert “some error,” mock invocation, progress completion, fixture request count, or whatever output happens to exist. Each test names and verifies its user-visible invariant.
- Do not delete or quarantine a flaky case without identifying whether the fault is product, fixture, harness, or environment capability.
- After the suite is green, route any small parked product bug through the normal substrate flow rather than silently changing production inside this test feature.

## Risks

- **Current production TUI flow appears disconnected**: `PluginInstallComponent`/`pluginInstallReducer` have no production caller outside their own tests, while `PluginManagerSession` maps candidate Install directly to one-shot `install.run`. The E2E requirement intentionally asserts all three signed states. If the assertion fails, park the production wiring bug and link an honest xfail; do not weaken the test to “an install command ran.”
- **Real Pi RPC custom results are session entries**: `/plugin` reports are published through `appendEntry`, not the prompt response body. The harness must correlate public RPC response plus `get_entries` by exact command/session and reject duplicate/missing reports.
- **Pi headless exit code is host-owned**: print/RPC command handlers cannot set process exit status in 0.80.8. Assertions use the facade envelope and documented process behavior rather than inventing an exit guarantee.
- **PTY output is asynchronous and repaint-heavy**: offset-based marker waits, fixed dimensions, no sleeps, and failure artifacts mitigate this. Raw ANSI snapshots are not the oracle.
- **Git smart-HTTP fixture can drift from production servers**: it uses Git's own backend and protocol, not a hand-written response model. GitHub shorthand itself remains parser/contract coverage because production hardcodes github.com and core E2E must not contact public network.
- **Fixed-port serialization can collide with other worktrees**: explicit lock and fail-fast diagnostics are safer than nondeterministic port hunting. CI assigns the override when parallel jobs intentionally coexist.
- **Crash boundary observation can race**: external visible phase files/journal checks are bounded and repeated by case ID. If a boundary cannot be observed reliably, move the trigger earlier to a service pause; never add a production test hook.
- **Clock tooling is Linux-specific**: the clock lane is a declared Linux CI capability with a pinned libfaketime package. Other platforms run the non-clock core suite and report the omitted capability explicitly; they do not silently pass it.
- **Isolated dependency install must stay network-free**: copied dependency bytes are dereferenced and audited, then npm installs the product tarball offline. A missing dependency is a setup failure, not a fallback to registry or checkout.
- **External state inspection can become implementation-coupled**: limit it to SQLite integrity, bounded targeted corruptions, forbidden-value scans, and user-visible recovery outcomes. Avoid asserting table layouts for ordinary success.
- **Suite cost**: real Pi/package/Git/process journeys are slower than integration tests. Build/pack once, share no mutable sandbox, choose representative seams, and keep fuzz bounded instead of duplicating owner matrices.

## Pre-mortem

The suite fails its purpose if it imports checkout code, drives a fake Pi, installs through a symlink, contacts public networks, treats a runtime fake as production support, asserts service calls instead of outcomes, infers activation from progress, hides a production bug behind a loose assertion, depends on Claude/Codex state, or becomes flaky through sleeps/free ports/unbounded subprocesses.

The design counters those failures with isolated npm/Pi installation, real Pi RPC/PTY processes, a real Git backend, zero in-process mocks, explicit unavailable production capabilities, independent restart/resource/file assertions, integrity rules, fixed ports/time bounds, and process-group teardown.

## Implementation notes

- Execution capability: GPT-5.6 Sol xhigh, explicitly requested by the caller. One feature owner carried the five-story DAG because package/process/Git/state fixtures share one lifecycle; no nested agent or peer mechanism ran.
- Review weight: standard from `.work/CONVENTIONS.md`. The caller reserved the independent feature review for the orchestrator, so this owner advances only to `stage: review` after green integrated verification.
- Architecture: a serial Vitest lane builds and packs once, creates an offline npm-installed regular-file consumer template, reflinks it into a fresh HOME/agent/session/XDG/npm/Git/project sandbox per test, then installs only that consumer path through real Pi 0.80.8. Strict-LF RPC correlates public control entries; util-linux `script` owns PTY when diagnosed; a separate HTTPS process wraps real `git http-backend`; external Node SQLite inspection, process-group signals, pipe closure, and pinned libfaketime capability receipts own state/fault evidence.
- Files changed: E2E/package/test config; `test/e2e/harness/**`; `test/e2e/services/git-smart-http.mjs`; committed TLS and marketplace/plugin fixtures; and 12 E2E files across infrastructure, golden, failure, fuzz, and chaos. No production source, fork, acceptance feature, or `.work/bin/work-view` file changed.
- Tests added: 43 tests total. The green result is 22 ordinary passes plus 21 executable expected failures, each linked to a reproducible parked production bug. The bounded control campaign executes 128 fixed-seed cases up to 8 KiB and records per-case replay commands.
- User-visible evidence: clean package discovery/status; exact Pi metadata; real smart-Git registration/browse/cache/offline restart; project-sync files; process/RPC/print manager surfaces; stale/rejected capabilities; malformed catalog fallback; foreign-byte preservation; output/process recovery; SQLite integrity; network loss; bounded grammar/project/foreign/state fuzz; and explicit PTY/libfaketime diagnosis. No test treats service calls, progress, or internal rows as success.
- Simplification: one timeout/port/seed registry, one process owner, one clean sandbox, one remote journey helper, and one deterministic corpus replace per-file shell fixtures. Public-state digests remove only live scheduler clocks/snapshot IDs while retaining installed/registration/policy/notice authority.
- Discrepancies from design: this host has no util-linux `script` or pinned libfaketime, so those tests emit explicit receipts and required-CI flags fail closed rather than silently skipping. Candidate detail, production projection, corruption startup, refresh cancellation, dead refresh claims, and distinct-target contention expose genuine current production failures; exact assertions remain xfailed and linked instead of being loosened. Successful production MCP/subagent paths remain unavailable by design and are never faked.
- Adjacent issues parked: `idea-fix-packed-candidate-inspection`, `idea-production-projection-publication`, `idea-packed-corruption-startup-diagnosis`, `idea-packed-refresh-cancellation-state-stale`, `idea-recover-crashed-refresh-claim`, `idea-distinct-marketplace-add-contention`.
- Verification: `npm run test:e2e` passed 12 files / 43 tests (22 passed, 21 expected fail) with zero E2E type errors in 259.72s. `npm test` passed production typecheck, 414-module/2,962-dependency boundaries, 325 files / 1,589 Vitest tests, build, 847 root exports, 3 Pi exports, and the isolated packed real-Pi RPC/JSON/PTY consumer.
- Final hygiene: every test sandbox/service/process/listener/port is cleaned; `.e2e-artifacts` is ignored and absent after green runs. The temporary worktree `node_modules` tooling symlink and generated `dist` are removed after lifecycle commit.
