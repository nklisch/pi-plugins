---
id: epic-native-plugin-management-production-runtime-acceptance
kind: feature
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-clean-environment-core-e2e, epic-mcp-runtime-integration-config-source-bridge-production-adapter, epic-mcp-runtime-integration-lifecycle-reconciliation, epic-skills-hook-runtime-subagent-interception-production-adapter]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Production Runtime Packaging and Acceptance

## Brief

Close the production-only package boundary after the authorized maintained MCP and subagent adapter features are complete. Pin and compose their published production adapters into the Pi extension, qualify them through the existing package-neutral conformance contracts, and run the full clean-environment acceptance path with no Claude or Codex installation.

This capability proves that plugins containing supported skills, ordinary and subagent hooks, and MCP servers install and move through enable, disable, update, rollback/recovery, and uninstall as one observed bundle. It is intentionally downstream of locally implementable composition and core acceptance so maintained-fork publication cannot block the rest of native management work.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- External gates: the MCP configuration-source production-adapter story, MCP lifecycle reconciliation feature, and subagent interception production-adapter story. Upstream-contribution follow-up is not an acceptance prerequisite once the authorized maintained forks are published and qualified.
- Owns pinned production dependency wiring, package-level adapter selection, final capability qualification, and production clean-environment evidence.
- The sibling runtime features own adapter/fork implementation and upstream contributions. This feature must not copy their code, expand their APIs, or substitute a test fake for production proof.

## Acceptance boundary

- The packed extension installs into an empty environment using only declared production dependencies; no Claude/Codex binary, settings directory, plugin cache, checkout dependency tree, global package, or ambient npm state is consulted.
- Startup capability probes report the pinned adapter facts truthfully and reject unsupported version, installed-byte, or API drift before plugin activation.
- Full-bundle install/update/disable/uninstall proves exact skill/hook/MCP contribution observation and rollback/recovery behavior through the existing lifecycle contract.
- Subagent pre-start context injection and pre-stop continuation run through the production interception boundary; unsupported interception remains incompatible rather than observationally approximated.
- MCP source registration, launch-time value delivery, identity/provenance, alias behavior, offline local registration, failure isolation, and exact source removal pass the existing conformance and redaction expectations.
- Packaging and tests preserve the replaceability of maintained forks: an upstream release may replace a fork only after the same capability probes and conformance suite pass, without changing the domain or management facade.

## Mockup inheritance

No new visual design is introduced. Final acceptance drives the already signed-off manager and install-flow states and verifies production results/diagnostics are rendered through the same thin facade mapping:

- `.mockups/screens/epic-native-plugin-management-manager/option-1.html`
- `.mockups/flows/plugin-install/index.html`
- `.mockups/flows/plugin-install/01-choose-inspect.html`
- `.mockups/flows/plugin-install/02-configure-trust.html`
- `.mockups/flows/plugin-install/03-activation-result.html`

No mockup or production UI change belongs to this feature.

## Grounding and design decisions

- **Dispatch**: direct-read only, per caller instruction. Grounding covered `VISION`, `SPEC`, `ARCHITECTURE`, project rules/conventions, the parent epic, the completed 43-test core packed E2E and its sole-review corrections, packaged-host/trusted-install/lifecycle/manager feature review records, exact MCP/subagent wrapper composition, package manifests and lock receipts, both published-fork provenance records, MCP lifecycle reconciliation, Pi 0.80.8 package/extension/RPC/TUI public contracts, and the signed manager/install mocks. No question, nested agent, peer mechanism, source change, mockup change, review, epic, PR, or release operation ran.
- **Package identity**: the first implementation checkpoint renames the candidate from the internal `@nklisch/pi-plugin-host` name to the agreed `@nklisch/pi-plugins` name. It updates package self-imports, packed-consumer paths, process-global package namespace symbols, and lock metadata consistently. Historical `.work` records are not rewritten. The candidate stays `private: true`, version `0.0.0`, unbound, and unpublished until release deployment explicitly selects it.
- **Subagent extension packaging**: `@nklisch/pi-subagents` is both a runtime dependency and a Pi extension. Following Pi 0.80.8's public package contract, it is bundled into the candidate and loaded through a candidate-owned receipt-checking extension wrapper before the host extension. A consumer installs only `@nklisch/pi-plugins`; it never performs a second top-level `pi install` for the subagent package.
- **MCP packaging**: `@nklisch/pi-mcp-adapter` remains a normal exact runtime dependency used only through its documented `./programmatic` export. Its standalone file/config extension is never listed in the candidate's Pi resources. Plugin Host continues to create the isolated programmatic adapter with `fileDiscovery: "disabled"` before host startup.
- **Receipt truth**: registry SRI alone cannot be recomputed from an unpacked npm tree. The runtime therefore binds two complementary facts: the exact registry `sha512-` integrity/provenance receipt used by npm and capability qualification, plus a deterministic digest of the expected installed package tree verified immediately before loading the package. Final registry-resolved installation proves those installed bytes came through the lock/SRI path. Status exposes only safe capability availability, never package, fork, repository, or maintenance-policy identity.
- **Fail-closed loading**: package receipt or API drift does not crash unrelated Plugin Host startup and does not execute a known-drifted adapter. The package-specific loader returns no candidate; central `qualifyRuntimeParticipants()` marks only the dependent MCP or subagent facts unavailable. A plugin requiring that fact stays installed/incompatible-to-activate while ordinary plugins remain usable.
- **Real-runtime rule**: production E2E may not inject `FakeMcpRuntime`, a fake `SubagentLifecyclePort`, fake `ExtensionAPI`, direct manager/controller instances, product spies, or source imports. Pi, both adapter packages, the packaged extension, Git, hook child processes, MCP process, SQLite, RPC, and PTY are real public/packed bytes. A separate deterministic OpenAI-compatible service is allowed solely as the external LLM service boundary needed to make real Pi and real subagents take predictable turns; it imports no product/adapter code and no assertion treats its request count as success.
- **Black-box outcomes**: success authority is `/plugin` control envelopes, Pi `get_commands`/session messages, semantic PTY output, a fresh Pi process, plugin-owned marker/data files, real MCP tool results, exact adapter status, and process/SQLite cleanup. Runtime call counts, fake traces, progress frames, journal rows, fixture requests, and service logs may trigger deterministic faults or aid diagnostics but never establish success.
- **Subagent proof**: a deterministic parent turn calls the real published `subagent` tool. The installed plugin's `SubagentStart` hook injects a revision marker into the exact child prompt. The first proposed child result triggers a `SubagentStop` continuation; the second result completes in the same child session/run. The user-visible parent result and plugin-owned hook record must prove both markers and one same-session continuation. Observational package events are not accepted as proof.
- **MCP proof**: the real MCP gateway first lists local sources, then calls the fixture server using source/server values returned by that public tool. The server reports its revision and late-resolved plugin root/data/configuration values. No process starts during source registration. Remote/process launch failure is per-server health and does not invalidate an exact locally registered source or another server.
- **Alias honesty**: the pinned MCP adapter truthfully reports `pluginToolAliases: false`. Claude alias templates therefore produce the existing user-visible `RUNTIME_ALIAS_UNAVAILABLE` omission while canonical source-qualified discovery/calls remain usable. Acceptance must prove this exact omission; it must not fabricate a foreign alias or weaken capability qualification to make an alias test green.
- **Whole-bundle identity**: every lifecycle assertion uses one plugin revision containing one skill, ordinary hooks, `SubagentStart`/`SubagentStop` hooks, and MCP source(s). Enable, disable, update, rollback/recovery, and uninstall must transition all components to one revision or none. A mixed V1/V2 contribution is always failure.
- **Offline and restart**: startup and local source registration run with Git and the deterministic model service stopped. No MCP process/connection or launch-value callback runs before an explicit tool call. Fresh-process status and skill discovery must complete inside the existing startup bound.
- **Secret custody**: production secret custody remains honestly unavailable. A separate sensitive candidate receives a canary through the real input boundary, fails before activation, and leaves no plaintext in control/RPC/PTY/session/state/configuration/projection/log/artifact/process data. The golden full bundle uses only non-sensitive configuration while still proving callback-late MCP values.
- **Pi 0.80.8 public contract**: async extension factories are awaited before `session_start` and `resources_discover`; package resources come only from `package.json#pi`; RPC uses strict LF JSONL, `get_entries`, `get_commands`, and extension UI responses; TUI assertions use real `ctx.ui.custom()` behavior through a PTY and semantic terminal output; reload remains terminal for the predecessor command frame and is observed through the existing broker/successor path.
- **Implementation ownership**: one feature owner should normally carry this six-story DAG. Package receipts, fixture revisions, process services, lifecycle evidence, and cleanup share one acceptance boundary; stories are durable checkpoints, not six worker assignments.
- **Foundation timing**: code-first. Current foundation documents already require compiled Pi packaging, declared runtime dependencies, faithful subagent/MCP behavior, whole-plugin lifecycle, offline startup, clean environment operation, and no Claude/Codex runtime. Implementation updates only an assertion made false by the final package name or load shape; omission alone is not drift.
- **Release posture**: no child receives a release binding now. The package-identity checkpoint is release-critical and must be selected when a release is cut, but Late-Binding keeps every `release_binding: null` until `/release-deploy` runs.

## Architectural choice

### Option A — promote existing fake/conformance coverage to production acceptance

Keep the current package-neutral fakes and unit/package tests, add a few labels, and treat their green results as release evidence. This is cheap but cannot prove Pi package discovery, bundled extension order, installed registry bytes, exact hook timing, MCP processes, lifecycle reload, or clean-environment isolation. Rejected because it would repeat the overclaim the feature exists to close.

### Option B — build a second standalone production test product

Create a bespoke launcher and independent lifecycle script around both adapters, bypassing the native manager/facade and existing E2E harness. This can exercise package APIs but duplicates Pi/package/lifecycle orchestration and can pass while the shipped `/plugin` bundle is broken. Rejected because it introduces a second acceptance authority.

### Option C — production overlay on the existing packed Pi harness, plus one from-empty registry replay (chosen)

Strengthen package selection and receipt probes at the existing outer composition boundary, add one complete foreign-plugin fixture and deterministic external model service, then drive the real packed candidate through the existing RPC/PTY/Git/process/state harness. Golden, failure, and concurrency tests reuse one fixture vocabulary. A final test creates the consumer from empty using a test-owned npm cache populated from public registry bytes and a generated exact lock, then repeats a compact all-component journey.

This reuses the clean E2E's proven process/teardown machinery without relabeling its package-neutral paths as production. It also keeps the final supply-chain proof separate from ordinary journey iteration so routine tests can clone an immutable registry-installed template while one release-critical test reruns installation from empty.

## Tricky unit first

The hardest proof is real pre-start injection followed by real pre-stop continuation. It spans the bundled subagent extension, public service publication, host receipt qualification, parent-session association, normalized plugin hooks, command execution, the exact child prompt boundary, proposed-result pause, same-session continuation, and final parent-visible result. A method-presence check, emitted event, fake trace, or direct coordinator call would miss the load order and finalization semantics.

The harness therefore scripts a real Pi/model exchange. The parent model calls `subagent`; the child service returns a first result only when the start marker was present; the Stop hook requests one continuation; the same child returns a second final marker; and the parent renders that result. Plugin-owned hook data records the same `agent_id`, child session/run evidence, and continuation rounds 0 then 1. Any missing bundled extension, unavailable receipt, late start hook, post-finalization Stop hook, new-session continuation, or mixed plugin revision changes the user-visible result and fails the journey.

Fallback: if deterministic provider scripting cannot drive Pi 0.80.8 reliably, retain the real published `SubagentsService.spawn()` path behind a sandbox-copied test-driver extension loaded through Pi's public extension mechanism. The driver may report only public `SubagentRecord` state; it still may not import Plugin Host source, a manager/session internal, or a fake lifecycle port.

## Production acceptance invariants

1. Candidate package identity is exactly `@nklisch/pi-plugins`; the old name is absent from current source/package/test consumers except historical `.work` prose.
2. `npm pack` contains compiled Plugin Host bytes and the exact bundled subagent extension tree, but no Plugin Host `src/`, tests, substrate, mocks, checkout symlink, or development dependency.
3. One `pi install <candidate-package-root>` loads the receipt wrapper(s) and host extension; the test never installs a maintained fork as a separate top-level Pi package.
4. Only package-specific wrapper/loader modules and `package.json` know maintained-fork identities. Domain, application, lifecycle, facade, manager, state, and public barrels remain package-neutral.
5. Runtime qualification binds Pi `0.80.8`, Node 24, exact package version, registry integrity, installed-tree digest, required documented export/resource, engines/peers/license, and unchanged conformance receipt.
6. Missing or drifted MCP/subagent bytes make only their facts unavailable before any dependent foreign plugin activates; no false fallback, file discovery, settings write, global environment injection, deep import, event approximation, or second runtime appears.
7. A successful foreign-plugin operation is complete only when skill, ordinary hook catalog, subagent interceptor, and MCP registration all match the selected revision in a fresh observation.
8. MCP registration is local/offline. Launch values and runtime leases are requested only for an explicit process/connection, disposed/released on every outcome, and absent from all serialized evidence.
9. MCP alias capability remains truthful: canonical source-qualified access works and unsupported Claude aliases are explicitly omitted, never silently advertised.
10. Every update failure, process kill, receipt drift, cancellation, stale writer, cleanup ambiguity, or restart leaves one exact working revision or explicit recovery-required evidence; no test accepts partial V1/V2 components.
11. Two Pi processes sharing one intended scope may contend, but one operation owns each mutation and fresh restarts converge to the same whole-bundle revision without database corruption.
12. Disable and uninstall remove exact source-owned MCP tools/processes/providers/leases plus all skill/hook/subagent contributions; uninstall data retention/deletion follows the requested option.
13. Claude/Codex binaries, homes, settings, caches, credentials, environment, and executable lookup are absent before and after every production journey.
14. Secret canaries never appear in package receipts, model traffic, hook/MCP output, Pi entries, manager output, state/configuration/projections, files, process environment diagnostics, or retained artifacts.
15. Pass teardown leaves no child process, process group, listener, fixed port, open PTY/RPC stream, SQLite integrity failure, staging directory, active source, or retained artifact directory.

## Implementation units

### Unit 1: Rename the candidate and make published-runtime provenance executable

**Story**: `epic-native-plugin-management-production-runtime-acceptance-package-provenance`

**Files**:

- `package.json`
- `package-lock.json`
- `.dependency-cruiser.cjs`
- `src/runtime/published-package-receipt.ts`
- `src/runtime/mcp/pi-mcp-adapter-package.ts`
- `src/runtime/mcp/pi-mcp-adapter-runtime.ts`
- `src/runtime/subagents/pi-subagents-package.ts`
- `src/runtime/subagents/pi-subagents-lifecycle.ts`
- `src/composition/create-mcp-runtime.ts`
- `src/composition/create-subagent-lifecycle.ts`
- `src/pi/production-subagents-extension.ts`
- `src/pi/extension.ts`
- `src/pi/plugin-host-bootstrap.ts`
- `src/pi/pi-reload-broker.ts`
- `src/pi/pi-manager-reload-handoff.ts`
- `test/runtime/published-package-receipt.test.ts`
- `test/integration/pi-mcp-adapter-runtime.test.ts`
- `test/runtime/subagents/pi-subagents-package-receipt.test.ts`
- `test/runtime/subagents/pi-subagents-lifecycle.test.ts`
- `test/composition/runtime-participant-qualification.test.ts`
- `test/compiled-package-import.mjs`
- `test/compiled-pi-package-import.mjs`
- `test/packed-pi-consumer.mjs`
- `test/e2e/harness/environment.ts`
- `test/e2e/infrastructure/packed-pi-smoke.e2e.test.ts`

**Internal contract**:

```typescript
export type PublishedPackageReceipt = Readonly<{
  packageName: string;
  version: string;
  registryIntegrity: `sha512-${string}`;
  installedTreeDigest: `sha256:${string}`;
  license: "MIT";
  licenseSha256: string;
  releaseTag: string;
  releaseCommit: string;
  upstreamBaseCommit: string;
  nodeEngine: string;
  piPeerRange: string;
  requiredExports: readonly string[];
  piExtensions: readonly string[];
}>;

export type PublishedPackageProbeResult =
  | Readonly<{ kind: "verified"; packageRoot: string; entry: string }>
  | Readonly<{ kind: "unavailable"; code: "PACKAGE_MISSING" | "PACKAGE_DRIFT" }>;

export async function probePublishedPackage(input: Readonly<{
  entrySpecifier: string;
  receipt: PublishedPackageReceipt;
  signal: AbortSignal;
}>): Promise<PublishedPackageProbeResult>;

export async function createProductionMcpRuntimeCandidate(): Promise<
  PiMcpRuntimeAdapter | undefined
>;

export async function loadVerifiedPiSubagentsExtension(): Promise<
  ((pi: ExtensionAPI) => void | Promise<void>) | undefined
>;
```

**Implementation notes**:

- Rename package self-reference/import probes and active process-global symbol namespaces to `@nklisch/pi-plugins`. Do not rewrite historical item bodies.
- Keep `private: true`, `version: 0.0.0`, and exact adapter dependency versions. Do not run `npm publish`, create a tag, or bind a release.
- Add `@nklisch/pi-subagents` to `bundledDependencies`. Set `pi.extensions` to the compiled receipt-checking subagent wrapper first and the compiled host extension second. The maintained package's own `src/index.ts` is loaded only after its exact declared Pi resource and tree receipt pass.
- Keep MCP package loading dynamic and receipt-gated. The package-specific loader imports only `@nklisch/pi-mcp-adapter/programmatic`; manager/deep paths remain rejected. The default host extension may become async, which Pi 0.80.8 explicitly awaits before startup.
- The generic receipt helper canonicalizes relative paths, rejects symlinks/escape/collisions/special files, hashes path/type/executable mode/content, checks manifest/license/export/resource facts, and returns static unavailable codes. It performs local bounded I/O only and serializes no package identity or native cause into host status.
- MCP expected receipt: `@nklisch/pi-mcp-adapter@2.11.0-nklisch.0`, integrity `sha512-kkMQwrNbggAhSCJCJUxVLKKiMswKjYaEbOLNSZrZlYY2teoxrtKld2+3MQpvsHDJYFypi1PPHuAS2YC/0z+7tg==`, release commit `1c1cd71fd069bc65cc06bf49399d83ff9e3d008b`, tag object `39c0c367db35ecb125b05ad0b9b639bc6b09b97d`, upstream base `82724dccc13a49310530898f922bafff12b7f3fe`, MIT license SHA-256 `2d20dfacd9742706e564470dc77438608a1e54b0ed46959f080709389209093c`.
- Subagent expected receipt: `@nklisch/pi-subagents@18.0.4-nklisch.0`, integrity `sha512-33Q8JDffXUuiT1M3XjLXCI4If9p+3AOwsUp/b5f1+B7Y5JI8Z8SVU+Dncq0umAG2IjgVYKnT9FHToFHNoZGWoQ==`, release commit `43efffb459f64e2f5f9aaee50d8ae5afa564f4f3`, annotated tag `ad55fae043abf87d4ec74a5cb0f2f8f17b1fb175`, upstream base `c76a294a777a990950da23fc06cb0caf51da7ac6`, MIT, Node `>=22`, Pi peers `>=0.75.0`, and the existing conformance/qualification digests.
- Tree digests are captured from freshly downloaded registry tarballs after SRI verification and checked against the installed/bundled trees. Tests must prove the relationship rather than accepting hand-written constants.
- Add a boundary assertion that maintained package names appear only in `package*.json`, package-specific wrapper/loaders, and package-focused tests. Fork maintenance policy, upstream PR state, and repository choice never enter application/domain/facade/UI contracts.

**Acceptance criteria**:

- [ ] `npm pack --json` names `@nklisch/pi-plugins`, contains both compiled extension wrappers and the bundled exact subagent extension tree, and contains no Plugin Host source/test/work/mock files or symlinks.
- [ ] One top-level Pi package installation reports MCP and subagent capabilities available without separately installing a dependency path.
- [ ] Exact public registry tarballs match the pinned SRI, manifest, license, release receipt, and installed-tree digest; malformed/missing/extra bytes fail the probe.
- [ ] Version, export/resource, engine/peer, API, qualification-digest, or tree drift produces safe capability unavailability before dependent activation while an ordinary-only plugin remains usable.
- [ ] MCP native file/import/cache discovery stays disabled; no maintained package default MCP extension is loaded.
- [ ] Package public barrels remain unchanged apart from the self-name; helper/loaders and fork identities are package-private.
- [ ] The old active package name is absent from current source/package/test code and generated lock root metadata; no release/publish/tag operation occurs.

### Unit 2: Add the production full-bundle fixture and black-box harness

**Story**: `epic-native-plugin-management-production-runtime-acceptance-full-bundle-harness`

**Files**:

- `vitest.e2e.config.ts`
- `package.json`
- `test/e2e/harness/constants.ts`
- `test/e2e/harness/environment.ts`
- `test/e2e/harness/process.ts`
- `test/e2e/harness/pi-rpc.ts`
- `test/e2e/harness/pi-pty.ts`
- `test/e2e/harness/git-service.ts`
- `test/e2e/harness/state-inspector.ts`
- `test/e2e/harness/production-environment.ts`
- `test/e2e/harness/production-model-service.ts`
- `test/e2e/harness/production-bundle.ts`
- `test/e2e/services/deterministic-openai.mjs`
- `test/e2e/fixtures/marketplace/.claude-plugin/marketplace.json`
- `test/e2e/fixtures/marketplace/plugins/production-bundle/.claude-plugin/plugin.json`
- `test/e2e/fixtures/marketplace/plugins/production-bundle/skills/production-bundle/SKILL.md`
- `test/e2e/fixtures/marketplace/plugins/production-bundle/hooks/hooks.json`
- `test/e2e/fixtures/marketplace/plugins/production-bundle/hooks/lifecycle.mjs`
- `test/e2e/fixtures/marketplace/plugins/production-bundle/mcp/server.mjs`
- `test/e2e/fixtures/model/models.json`
- `test/e2e/production/harness-smoke.e2e.test.ts`

**Harness contract**:

```typescript
export type ProductionSuiteArtifact = Readonly<{
  candidateName: "@nklisch/pi-plugins";
  candidateTarball: string;
  candidateIntegrity: `sha512-${string}`;
  publicLockfile: string;
  npmCache: string;
  consumerTemplate: string;
  packageReceipts: readonly Readonly<{
    name: string;
    version: string;
    resolved: string;
    integrity: string;
  }>[];
}>;

export async function prepareProductionSuiteArtifact(): Promise<ProductionSuiteArtifact>;
export async function createProductionE2ESandbox(id: string): Promise<CleanE2ESandbox>;
export async function installProductionPackedProduct(
  sandbox: CleanE2ESandbox,
): Promise<void>;

export type ProductionModelService = Readonly<{
  baseUrl: string;
  selectScenario(id: "mcp" | "subagent-v1" | "subagent-v2"): Promise<void>;
  stop(): Promise<void>;
}>;

export async function startProductionModelService(
  sandbox: CleanE2ESandbox,
): Promise<ProductionModelService>;

export async function installProductionBundle(input: Readonly<{
  sandbox: CleanE2ESandbox;
  rpc: PiRpcProcess;
  version: "v1" | "v2";
}>): Promise<Readonly<{ plugin: "production-bundle@native-e2e-market"; revision: string }>>;
```

**Fixture contract**:

- One Claude-native plugin revision declares one skill, ordinary `SessionStart`/tool hooks, `SubagentStart`, `SubagentStop`, a real standard-I/O MCP server, and one required non-sensitive `CHANNEL` value.
- Start hook adds `START_CONTEXT_<revision>` and records safe identity/boundary fields to plugin data. Stop round 0 requests continuation with `STOP_CONTINUE_<revision>`; round 1 accepts. Hook output uses only currently supported fields.
- The MCP server speaks the supported JSON-RPC protocol, exposes `identity`, and returns revision plus late plugin root/data/channel values. It starts only on an explicit tool call and records no environment dump or secret.
- V2 changes every observable component marker. The fixture publisher commits/pushes a complete V2 tree so mixed evidence is detectable.
- The deterministic model service implements only the exact public protocol needed by Pi 0.80.8, runs in a separate process, uses scenario-controlled finite responses, imports no repository module, and binds a fixed test-owned port/lock. Parent MCP flow performs list → call → user-facing answer; parent subagent flow performs real tool call → child first result → same-session continuation → final parent answer.

**Setup**:

1. Build and pack once.
2. Resolve candidate plus exact Pi/Pi TUI 0.80.8 and production dependencies through npm into a test-owned lock/cache; all public rows require HTTPS registry URLs and integrity.
3. Install with scripts disabled into an immutable template, audit every realpath, and clone that template per test.
4. Give each test fresh HOME, `PI_CODING_AGENT_DIR`, sessions, XDG/npm/Git config, project, logs, process group, ports, model scenario, and Git marketplace.
5. Install only the candidate package root through Pi and assert both candidate-owned extension entries load.

**Teardown**:

- Close RPC/PTTY, model and Git services, hook/MCP/subagent processes, then verify process groups/listeners/ports are gone.
- Restore writable fixture permissions, inspect SQLite integrity, scan canaries, ensure no active runtime source/staging residue, and remove the sandbox.
- Retain only bounded path-redacted/canary-scanned diagnostics on failure. `PI_PLUGIN_HOST_E2E_KEEP=1` remains the sole intentional retention switch.

**Acceptance criteria**:

- [ ] Harness smoke starts exact Pi 0.80.8 from the registry-installed consumer, discovers `/plugin`, `subagent`, and MCP tools, and reports both production capabilities available.
- [ ] Neither product nor test process resolves into the checkout/global package roots; all public dependencies match the generated lock/SRI receipts.
- [ ] The fixture normalizes as one compatible bundle with exact skill/hook/MCP inventory and safe alias omission evidence.
- [ ] Model service absence never blocks offline startup; service interaction is required only for explicit model/subagent/MCP user journeys.
- [ ] No fake product port, source import, manager/controller direct call, arbitrary sleep, random port search, unbounded output, or request-count success oracle is introduced.
- [ ] Teardown detects and fails on every process, port, SQLite, source, staging, canary, or artifact leak.

### Unit 3: Prove the golden whole-plugin lifecycle on real runtimes

**Story**: `epic-native-plugin-management-production-runtime-acceptance-golden-lifecycle`

**Files**:

- `test/e2e/production/golden-full-bundle.e2e.test.ts`
- `test/e2e/harness/production-bundle.ts`
- `test/e2e/harness/pi-rpc.ts`
- `test/e2e/fixtures/marketplace/plugins/production-bundle/**`

**Journey contract**:

```typescript
export type ProductionBundleObservation = Readonly<{
  revision: "v1" | "v2";
  skill: "present" | "absent";
  ordinaryHooks: "active" | "inactive";
  subagent: "injected-and-continued" | "inactive";
  mcp: "registered" | "absent";
  alias: "runtime-unavailable-omission";
}>;

export async function observeProductionBundle(
  rpc: PiRpcProcess,
  expected: ProductionBundleObservation,
): Promise<void>;
```

**Golden journeys**:

1. **Install V1**: add the real Git marketplace, browse/show, open the signed three-stage install session, supply `CHANNEL`, confirm exact executable disclosure, apply, and wait for a succeeded complete-bundle observation.
2. **Observe V1**: a fresh Pi process discovers the skill; ordinary hook data names V1; a real subagent user turn proves start injection and one same-session Stop continuation; a real MCP list/call reports V1 and late values; show/diagnose reports exact source/provenance and `RUNTIME_ALIAS_UNAVAILABLE` without package identity.
3. **Disable/enable**: disable removes the skill, ordinary/subagent hook catalog, and exact MCP source/process. A model turn cannot obtain V1 context or MCP identity. Enable restores all four components at V1 after fresh observation.
4. **Update V1 → V2**: publish/refresh V2, inspect exact change disclosure, update once, and prove every component reports V2. V1 hook markers/source/process/skill text are no longer active; prior immutable content may remain only under lifecycle retention.
5. **Uninstall**: uninstall with `--delete-data --yes`, then restart. Installed list, skill, hook behavior/data, MCP source/tool/process/provider/lease, generated active projection, and subagent behavior are absent. Marketplace registration remains because uninstall owns the plugin, not the marketplace.

**Acceptance criteria**:

- [ ] Install/enable/update success is accepted only after a fresh exact complete-bundle observation; callback/progress/reload acceptance is insufficient.
- [ ] The real child prompt contains the start marker before its first model call, Stop round 0 continues the same session, and only round 1 finalizes the user-visible result.
- [ ] MCP source listing and tool call use values returned by the real gateway; late values match the selected immutable revision/data/configuration and are absent before launch and after disposal.
- [ ] Alias omission is explicit and canonical source-qualified access remains functional.
- [ ] Disable, update, and uninstall affect skill, ordinary hooks, subagent hooks, and MCP together; no mixed V1/V2 or partial active state passes.
- [ ] No Claude/Codex state appears and no fork/package/provenance-maintenance identity leaks through user-visible output.

### Unit 4: Prove failure, rollback, recovery, and adapter drift

**Story**: `epic-native-plugin-management-production-runtime-acceptance-failure-recovery-drift`

**Files**:

- `test/e2e/production/failure-recovery-drift.e2e.test.ts`
- `test/e2e/harness/production-bundle.ts`
- `test/e2e/harness/faults.ts`
- `test/e2e/harness/state-inspector.ts`

**Failure matrix**:

| Fault | Required public outcome | Whole-bundle invariant |
|---|---|---|
| V2 source/compatibility rejection before commit | update rejected/failed with exact safe code | V1 skill/hooks/subagent/MCP remain active |
| Kill after pending update, before successor proof | restart settles or reports recovery-required | observed revision is wholly V1 or wholly V2, never mixed |
| Kill after candidate selection, then corrupt candidate projection/content | startup recovery rolls back deterministically | complete V1 returns; V2 has no active contribution |
| MCP good server plus failing launch server | failing server has redacted health error | source and good server stay registered/usable |
| Cancel MCP call/launch | public cancellation/failure, no hang | values disposed, runtime lease released, source remains |
| Disable/uninstall source cleanup interrupted | failed/ambiguous/recovery-required | no false inactive/uninstalled success until exact cleanup |
| MCP package version/tree/API drift before startup | MCP capability unavailable | MCP-bearing bundle does not activate; ordinary sibling starts |
| Subagent package version/tree/API drift before startup | subagent capability unavailable | subagent-bearing bundle does not activate; ordinary sibling starts |
| Both packages drift | degraded safe startup | no adapter executes and no dependent projection activates |
| Drift repaired by restoring exact consumer snapshot | next startup qualifies exact receipts | no state migration or fork-specific recovery path required |

**Implementation notes**:

- Drift is injected only into a disposable installed consumer before Pi starts. Mutate manifest version, one receipt-covered file, and one documented exported method in separate cases. The probe must fail before importing a known-drifted subagent extension or attaching an MCP extension.
- Use journal/state/filesystem observations only to place SIGKILL or corruption at deterministic external boundaries. Final assertions use fresh public status, list/show/diagnose, skills, hooks, subagent result, MCP source/call, process cleanup, and SQLite integrity.
- Deterministic rollback case kills a pending update after candidate authority exists, removes/tampers only candidate projection evidence, and restarts with intact V1. Existing recovery authority must select/restore V1; the test does not edit authoritative state to manufacture a result.
- A per-server MCP launch failure remains health, not source-registration failure. Conversely source replacement/removal ambiguity cannot be downgraded to health.
- All adapter/native errors are redacted. Receipt failure output says capability unavailable/package drift through stable host diagnostics and never prints package roots, tarball URLs, fork names, commits, or native causes.

**Acceptance criteria**:

- [ ] Every failure preserves one exact prior working bundle or explicit recovery-required evidence; no generic cancelled/failed result hides a possible durable effect.
- [ ] Deterministic candidate corruption produces verified V1 rollback with all components and no V2 active residue.
- [ ] Real process launch/cancellation/failure disposes late values and runtime leases and leaves unrelated MCP servers/plugins/scopes usable.
- [ ] Version, byte, and API drift each fail closed before dependent activation and isolate only the affected capability.
- [ ] Restoring exact published bytes restores qualification without domain/state/facade changes, proving wrapper replaceability.
- [ ] Canaries/native causes/package policy are absent from output, state, logs, and artifacts; teardown finds no orphan process/source/lease.

### Unit 5: Prove multiprocess/restart, manager/headless parity, and secret non-retention

**Story**: `epic-native-plugin-management-production-runtime-acceptance-concurrency-presentation-security`

**Files**:

- `test/e2e/production/concurrency-presentation-security.e2e.test.ts`
- `test/e2e/harness/production-bundle.ts`
- `test/e2e/harness/pi-rpc.ts`
- `test/e2e/harness/pi-pty.ts`
- `test/e2e/harness/state-inspector.ts`

**Scenarios**:

1. **Multiprocess mutation contention**: two real Pi RPC processes share one intended user scope. Same-target update/disable has one owner and one truthful current/no-change/stale result. A different-plugin operation progresses under existing scope guarantees. After both stop, two fresh processes agree on one exact whole-bundle revision and SQLite integrity.
2. **Offline restart**: install/activate V2, stop Git and model services, record request counts only as secondary evidence, and restart with `PI_OFFLINE=1`. Startup/status/skill/MCP local source observation complete within 15 seconds; no MCP launch value or process is requested until a later explicit call after the model service returns.
3. **Headless presentation**: RPC and print `/plugin status/list/show/diagnose` report the same plugin/revision/component counts, runtime availability, MCP health/alias omission, and safe recovery state. No TUI prompt or hidden default changes intent.
4. **Signed manager/install rendering**: a real 120×30 and 58-column PTY shows `PI / PLUGINS`, Installed/Updates/Browse/Marketplaces topology, exact complete-bundle runtime counts, choose/inspect, configure/trust, activation result, update/disable/uninstall outcomes, disclosure, and recovery status using current facade evidence. Assertions target semantic text/navigation, not ANSI, color, coordinates, or mock pixels.
5. **Sensitive candidate**: through real RPC input, submit `PI-PLUGIN-HOST-E2E-SECRET-CANARY` for a sensitive MCP/configuration candidate. Production unavailable custody rejects activation. The value is absent from all Pi/session/control/terminal/model/hook/MCP/state/configuration/projection/Git/log/artifact/process evidence.
6. **Restarted cleanup**: uninstall the full bundle, stop/restart all processes, and prove no skill/hook/subagent/MCP contribution or process returns. `--keep-data` and `--delete-data` are covered in separate disposable roots.

**Acceptance criteria**:

- [ ] Multiprocess contention has one mutation owner, truthful peers, one final complete bundle, and no database/source/process corruption.
- [ ] Offline restart is network/model independent and locally observes the exact MCP source without eager launch/connection.
- [ ] Headless and TUI render the same facade authority and signed interaction topology; no production UI or mockup changes are required.
- [ ] Manager counts and activation result describe the complete skill/hook/MCP bundle, not per-component installation controls.
- [ ] Sensitive input is rejected without plaintext retention anywhere; failure diagnostics remain actionable and redacted.
- [ ] Restart and teardown leave no adapter/plugin process, listener, source, lease, lock owner, staging tree, or artifact residue.

### Unit 6: Run the final from-empty registry-resolved packed acceptance

**Story**: `epic-native-plugin-management-production-runtime-acceptance-final-packed-registry`

**Files**:

- `package.json`
- `.github/workflows/ci.yml`
- `test/e2e/harness/production-environment.ts`
- `test/e2e/production/final-packed-registry.e2e.test.ts`

**Final acceptance algorithm**:

```typescript
export async function installFromEmptyRegistrySnapshot(input: Readonly<{
  candidateTarball: string;
  publicLockfile: string;
  npmCache: string;
  destination: string;
  env: NodeJS.ProcessEnv;
}>): Promise<Readonly<{
  packageRoot: string;
  piCli: string;
  installedReceipts: readonly Readonly<{
    name: string;
    version: string;
    integrity: string;
    realpath: string;
  }>[];
}>>;
```

1. Create a new root containing only package/lock inputs and a fresh HOME/agent/project/npm/Git/XDG/session layout.
2. Run `npm ci --offline --ignore-scripts --no-audit --no-fund` against the test-owned cache previously populated from public registry HTTPS bytes and exact integrity rows. Do not copy or link `node_modules`.
3. Audit every installed realpath/symlink, `npm ls --omit=dev --all`, candidate manifest, bundled subagent tree, MCP programmatic export, Pi/Pi TUI 0.80.8, license/tree receipts, and absence of undeclared/global/checkout resolution.
4. Run one `pi install <@nklisch/pi-plugins root>` and assert Pi lists only that top-level candidate source while both candidate extension entries are active.
5. With no Claude/Codex/global state, execute compact production smoke: status capabilities; install the V1 full bundle; observe skill, ordinary hook, real subagent injection/continuation, real MCP list/call/late values/alias omission; disable/enable; update V2; restart offline; uninstall/delete data; restart and prove complete absence.
6. Scan all owned bytes and process evidence, verify SQLite, and destroy the root. No tag, npm publish, GitHub release, release binding, or package-version promotion occurs.

**Acceptance criteria**:

- [ ] The final consumer is created from empty by npm's lock/SRI path and candidate tarball only; no preexisting/copied `node_modules`, npm/global prefix, checkout, `NODE_PATH`, Claude/Codex, or ambient HOME state contributes.
- [ ] Every production dependency is declared or a lock-resolved transitive dependency; missing declarations fail installation rather than falling back to the checkout/network/global state.
- [ ] The one installed candidate is named `@nklisch/pi-plugins`, remains unpublished/private `0.0.0`, and automatically composes exact production MCP/subagent runtimes.
- [ ] The compact final journey proves one whole plugin across all lifecycle states and a clean offline restart using only real packed/public bytes and user-visible outcomes.
- [ ] CI runs this lane on Node 24/bookworm with exact Pi 0.80.8 and existing PTY/libfaketime capabilities; public-registry snapshot setup is explicit and final install/startup are offline.
- [ ] No source, package, mockup, review, epic, PR, tag, release, or published artifact is altered outside the implementing feature's code/tests and child records.

## Implementation order and child-story DAG

1. `epic-native-plugin-management-production-runtime-acceptance-package-provenance`
2. `epic-native-plugin-management-production-runtime-acceptance-full-bundle-harness` — depends on package/provenance.
3. In parallel after the harness:
   - `epic-native-plugin-management-production-runtime-acceptance-golden-lifecycle`
   - `epic-native-plugin-management-production-runtime-acceptance-failure-recovery-drift`
4. `epic-native-plugin-management-production-runtime-acceptance-concurrency-presentation-security` — depends on both golden and failure checkpoints.
5. `epic-native-plugin-management-production-runtime-acceptance-final-packed-registry` — depends on concurrency/presentation/security.

```text
package-provenance
        |
full-bundle-harness
      /   \
golden   failure-recovery-drift
      \   /
concurrency-presentation-security
        |
final-packed-registry
```

One owner normally implements this as one feature bundle. Golden and failure stories expose a dependency layer, not an instruction to write concurrently into the shared fixture/harness.

## Testing and evidence economy

- **Keep** the existing package-neutral conformance suites as detailed adapter semantics. Production acceptance invokes them unchanged through exact wrappers but does not copy their matrix into E2E.
- **Add** package receipt/tree/manifest tests because startup drift and candidate packaging are new stable boundaries.
- **Add** one complete fixture rather than combining separate skill-only, hook-only, subagent-only, and MCP-only fixtures and accidentally permitting partial lifecycle success.
- **Add** representative golden, failure/recovery, concurrency/presentation/security, and final supply-chain journeys. Do not repeat reader schema, archive traversal, state CAS, parser fuzz, every crash point, or every TUI line already owned elsewhere.
- **Primary evidence** is public Pi/Plugin Host behavior and fresh-process observation. SQLite/journal/filesystem internals are limited to integrity checks, forbidden-value scans, and deterministic fault placement.
- **No expected failures**: production bugs remain honest failing assertions and are parked/scope-routed under the project test-integrity rule. Do not loosen an assertion to “some error,” overclaim capability from a fake, or skip adapter drift because the package test passed.
- **No raw snapshots** of ANSI, prompts, results, process environments, absolute roots, package internals, secrets, or native errors. Semantic markers and strict safe schemas are enough.

## Simplification

- Replace the manual second `pi install` of the subagent dependency with one candidate-owned bundled resource wrapper.
- Replace scattered hard-coded package receipt checks with one generic installed-tree verifier and package-specific receipt homes.
- Reuse central runtime qualification, existing wrappers, full-bundle projections, lifecycle/recovery, facade, manager, E2E process harness, Git service, SQLite inspection, and cleanup.
- Keep one deterministic model service for both MCP and subagent turns instead of test-only product ports or separate fake hosts.
- Keep one complete foreign plugin fixture and revision publisher instead of independent fixtures whose states could drift.
- Keep maintained-fork selection in package metadata and package-specific loaders only. No domain type, state field, compatibility rule, diagnostic, facade result, or UI branch knows fork policy.
- Remove old active package-name self-import/path/symbol compatibility. The candidate has not been published under that name, so no alias package or dual-name support is warranted.
- No runtime guarantee, validation, lifecycle safety, or user-visible behavior is reduced.

## Threat and concurrency pre-mortem

- **Supply-chain substitution**: a package can keep the expected version while changing bytes. Countermeasure: npm SRI + exact public lock + installed-tree digest + export/license/manifest probe before load. Residual same-user mutation after the probe is outside the practical review bar; tests still close the ordinary startup window by verifying immediately before import.
- **Bundled subagent extension loads too late**: host sees no service and marks interception unavailable. Countermeasure: exact candidate `pi.extensions` order, async factory await, service/capability smoke, and single-top-level-install assertion.
- **A receipt check executes drifted code first**: static imports would defeat fail-closed probing. Countermeasure: package-specific dynamic loaders after tree/manifest verification and an E2E mutated-byte sentinel that must never execute.
- **Tree digest becomes platform-sensitive**: npm extraction or executable modes may differ. Countermeasure: versioned canonical path/type/normalized-executable/content grammar over package-owned tar entries only; verify Linux release lane and reject unsupported package tree shapes rather than silently weakening.
- **Deterministic model service accidentally becomes runtime proof**: scripted responses could hide broken Pi tool behavior. Countermeasure: it supplies only model protocol responses; all tools, subagents, hooks, MCP processes, lifecycle, state, and presentation are real. User-visible results depend on hook/MCP markers the service cannot fabricate without receiving real tool results.
- **Subagent Stop runs after finalization**: an event observer could still make logs look plausible. Countermeasure: first child result is deliberately unacceptable; only a same-session second turn can produce the final public marker. Completion-event counts are not accepted.
- **MCP remote/process failure is mistaken for activation failure**: network health should not roll back an exact local source. Countermeasure: assert exact source remains registered and good server works while failed server health is visible. Source mutation/cleanup ambiguity remains lifecycle failure.
- **Alias test pressures the suite into overclaiming support**: current package reports aliases unavailable. Countermeasure: assert exact omission and canonical access; never change capability facts for test convenience.
- **Two Pi processes show different live runtime revisions**: process-local runtime projections do not auto-reload another live process. Countermeasure: mutation outcomes are authoritative; both processes are restarted before final convergence assertion. No test invents a cross-process live reload guarantee.
- **Kill boundary races**: a process may die before/after the intended durable point. Countermeasure: wait on bounded external journal/file/state conditions, accept only documented exact alternatives in the generic recovery case, and use candidate projection corruption after a confirmed pending state for deterministic rollback.
- **Cleanup result lies while an MCP process/lease survives**: countermeasure: keep an execution open across update/removal, assert replacement/removal waits for exact cleanup, inspect process group/lease/source afterward, and restart before accepting inactive/uninstalled.
- **Secret enters model or failure artifacts**: countermeasure: sensitive canary never goes to the deterministic model; all owned files/streams/artifacts are scanned before retention, and cleanup failure prevents a green test.
- **Registry setup leaks ambient cache/global modules**: countermeasure: test-owned npm userconfig/cache/prefix/HOME, empty destination, offline `npm ci`, unset `NODE_PATH`, no copied `node_modules`, recursive realpath/symlink audit, and exact `npm ls` closure.
- **Suite cost/flakiness**: real Pi, Git, model, subagent, MCP, PTY, and npm processes are expensive. Countermeasure: build/cache public bytes once, clone immutable templates for scenario tests, rerun from empty only once, serialize production files, use condition-driven waits, fixed owned ports, bounded 120-second tests, and process-group teardown.
- **Wrapper replacement leaks fork policy**: package-specific loaders can tempt application branching. Countermeasure: dependency-cruiser/content boundary checks and a test that an alternate conforming package candidate changes only package metadata/loader receipt while host ports/facade projections remain byte-identical.

## Risks

- **Highest implementation risk**: making the subagent extension a true transitive resource of one Pi package while preserving public package loading and receipt-before-execution. If Pi 0.80.8 cannot load the bundled resource through the compiled wrapper, stop with production subagent unavailable; do not return to manual global installation or deep/private imports.
- **Registry replay determinism**: npm can resolve range-based non-adapter transitives differently while creating the test lock. The suite records the generated lock and every integrity receipt, then final install is offline. Release deployment should consume a reviewed release lock rather than relying on “latest” metadata.
- **Current secret backend is unavailable**: successful sensitive MCP launch cannot be claimed. This feature proves honest rejection/non-retention and non-sensitive late values; it does not invent secret custody.
- **Current MCP alias capability is unavailable**: acceptance proves explicit omission, not foreign alias invocation. Returning to alias support requires a future adapter capability and the existing unchanged projection/alias contract.
- **Production package remains private/internal version**: this is intentional until release. Final acceptance proves a candidate artifact, not npm discoverability or public installation by package name.
- **Package tree probe startup cost**: hashing roughly the two selected adapter trees adds bounded local I/O. Cache the verified result for one extension process; do not persist it as authority or skip re-verification on restart.
- **Model protocol fixture drift**: Pi 0.80.8 is exact and the service fixture is version-scoped. A Pi upgrade must update the receipt and public protocol fixture rather than loosening parsing.
- **Where confidence is lowest**: deterministic crash timing around reload successor publication with active MCP/subagent resources. The recovery tests use existing durable boundaries and accept only exact whole-bundle outcomes; uncertainty remains recovery-required rather than a guessed pass.

## Pre-mortem

This feature fails if the candidate still uses the internal name, requires a second package install, imports checkout code, executes a drifted adapter before probing, reports hard-coded integrity without installed-byte evidence, starts with global/Claude/Codex state, uses a fake runtime, proves subagent hooks from events, treats MCP health as registration, fabricates aliases, observes mixed revisions, infers success from progress/journal rows, loses secret or process cleanup ownership, or passes only because the public registry/network/global cache was available.

The design counters those failures with a release-critical rename checkpoint, one bundled package resource graph, receipt-gated dynamic loaders, public-lock/tree evidence, a complete plugin fixture, real Pi/published runtimes/processes, exact start/Stop behavior, source-versus-health separation, truthful alias omission, complete-bundle observations after restart, existing recovery authority, canary/process/SQLite teardown, and one final from-empty offline registry replay.

## Implementation result

All six child stories are implemented and `stage: done` in dependency order.

- The private candidate is `@nklisch/pi-plugins@0.0.0`. One Pi package contains the compiled host and a receipt-gated bundled subagent resource; MCP uses only its exact receipt-gated programmatic export.
- The shared verifier rejects package identity, manifest, export/resource, engine/peer, license, registry SRI, installed-tree, API, and conformance drift before adapter execution. Qualification isolates failure to the dependent capability.
- The production harness uses exact packed/public bytes, isolated state, real Pi/Git/SQLite/hooks/subagents/MCP/RPC/PTY, one protocol-only model service, deterministic cleanup, and a complete revision-bound bundle fixture.
- Golden lifecycle, failure/recovery/drift, contention/offline/presentation/security, and from-empty offline registry journeys are green. Canonical MCP access works while the honest alias limitation remains `RUNTIME_ALIAS_UNAVAILABLE`; sensitive custody remains unavailable and plaintext-free.
- Verification at handoff: 16 focused receipt/adapter tests; 332 unit files / 1,613 tests; 17 infrastructure E2E files / 54 tests; 5 production E2E files / 10 tests; typecheck; 426-module dependency boundary scan; 847 compiled exports; 3 Pi exports; and isolated packed Pi 0.80.8 RPC/JSON/PTY acceptance. All passed.
- No package was published, no tag/release/PR was created, and every item remains unbound. The independent standard feature review is intentionally left to the orchestrator.

## Standard feature review — 2026-07-18

**Verdict: APPROVE.** One independent cross-model, fresh-context pass reviewed all six stories and the complete packed production path. No material blockers were found.

The review verified package rename/private metadata, receipt-before-import ordering, one top-level Pi install with a receipt-gated bundled subagent resource, exact SRI/tree/manifest/API/license/engine/peer/conformance checks, real packed bytes and registry-resolved installation, same-session subagent continuation, MCP late-value custody and honest alias unavailability, full-bundle lifecycle/recovery/drift/concurrency/offline/presentation/security coverage, secret and checkout-path non-retention, deterministic cleanup, and from-empty offline lock/SRI replay.

Three lower-risk findings were parked without implementation:

- `idea-update-stale-subagent-boundary-package-name`
- `idea-assert-subagent-pi-extension-receipt`
- `idea-document-subagent-package-probe-cache-lifetime`

The feature advances from `review` to `done` without a second review pass.
