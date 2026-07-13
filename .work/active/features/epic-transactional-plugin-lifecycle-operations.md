---
id: epic-transactional-plugin-lifecycle-operations
kind: feature
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets, epic-transactional-plugin-lifecycle-generation-locking, epic-transactional-plugin-lifecycle-immutable-stores-promotion]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Whole-Plugin Lifecycle Operations

## Brief

Orchestrate install, enable, disable, update, and uninstall as complete-plugin transitions over the finished foreign-model materialization, inspection, and compatibility contracts. Long-running work occurs before a short generation-checked commit; incompatible bundles, missing trust/configuration, stale generations, promotion failure, projection preparation failure, reload failure, or verification mismatch preserve the previous working revision.

This feature defines stable outbound projection, reload, and post-reload verification ports so later skill, hook, and MCP runtime epics can participate without owning transaction policy. It does not implement those runtimes, Pi reload, `/plugin` commands or UI, startup recovery/GC, refresh scheduling, automatic-update policy, or foreign-state readers.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 3 convergence — the sole coordinator for whole-plugin mutation
- Depends on trust/config/secrets, generation locking, and immutable promotion
- Required guarantees: every cross-cutting guarantee and downstream seam in the parent epic

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle; Atomic change
- `docs/SPEC.md` — Lifecycle operations; Install transaction; Enablement
- `docs/ARCHITECTURE.md` — Installation transaction; Runtime projections; Pi integration
- `docs/COMPATIBILITY.md` — Whole-plugin behavior

## Existing contract references

- `src/application/source-materialization.ts` — verified source acquisition handoff
- `src/application/inspection-service.ts` — complete normalized plugin bundle
- `src/application/compatibility-service.ts` — complete compatibility report and runtime requirements
- `src/domain/plugin.ts` and `src/domain/compatibility.ts` — authoritative normalized inputs

## Late-bound feature decisions

Application service grouping, command request/result shapes, retry and idempotency keys, pending-transition preparation point, compensation ordering, projection descriptor schema, reload evidence shape, verification timeout, uninstall content/data policy boundary, and multi-scope precedence remain for feature design. There must be one transaction path shared by manual, automatic-update, sync, and adoption consumers; no caller may bypass compatibility, trust, generation, or activation verification.

## UI alignment

No UI surface. Deterministic commands and interactive management belong to `epic-native-plugin-management`.

## Design decisions

- **Discovery posture**: Direct-read only, as requested. Grounding covered all foundation documents, the parent epic, the completed foreign-model contracts, and the finished Wave 2 trust/configuration, generation-coordination, immutable-promotion, state, and projection-root code and tests. No agent or peer mechanism was used.
- **Service boundary**: One `PluginLifecycleService` owns all five operations. Install and update share candidate acquisition; every activation-changing operation then uses one guarded transition engine. Manual commands, automatic-update policy, sync, and adoption call these methods rather than receiving a lower-level commit escape hatch.
- **Exact scope**: Every request names one `ScopeContext` and one `PluginKey`. User and project records and projections remain independent. This feature does not invent user/project overlay precedence; later runtime composition consumes scope-qualified descriptors.
- **No caller idempotency protocol**: Do not add request keys, replay tables, or retry middleware. Stable behavior derives from authoritative state: installing/updating the selected revision, enabling an enabled plugin, disabling a disabled plugin, or uninstalling a missing plugin returns `unchanged`. A pending transition blocks another mutation of the same scope/plugin until recovery settles it.
- **Preparation before coordination**: Install/update allocate staging, materialize, inspect, assess compatibility, derive installed/trust evidence, verify pre-existing exact trust and configuration readiness, and prepare the runtime projection before calling the generation coordinator. Enable reloads and verifies the installed revision through an `InstalledPluginLoader` port, then runs the same trust/configuration/projection checks. Disable and uninstall prepare a deactivation projection. Network, parsing, credential, and projection work never occurs under the scope lock.
- **Trust/configuration interaction**: Lifecycle does not prompt or mint trust. Exact trust records and any candidate configuration must already have been collected through the completed trust/configuration services. Preparation reads user-held trust evidence outside the target scope lock (including for project plugins), then separately enforces Pi project trust. A source or executable-surface change that no longer matches those records returns `rejected` and discards staging. Management may inspect, collect consent/configuration, and retry; the second attempt re-resolves the source so approval cannot silently cover drift.
- **Installed revision loading**: `InstalledPluginLoader` is the only new inward seam needed for enable/rebuild. It reconstructs a complete normalized plugin, compatibility report, marketplace source, and verified content manifest from an installed record and immutable stores. The lifecycle service verifies the handoff against the selected record. This is not foreign-host state adoption and does not make cached projections authoritative.
- **Projection descriptor**: A schema-derived `PluginRuntimeProjectionV1` contains exact scope, plugin, installed revision, logical content/data/configuration references, and normalized skill/hook/MCP components. It contains no absolute path, expanded configuration, secret value, reload observation, or host-specific runtime object. Its digest derives from one canonical schema. Deactivation is a canonical scope/plugin tombstone. Runtime adapters resolve logical references after reload.
- **Projection port**: `RuntimeProjectionPort.prepare` publishes or verifies a replaceable immutable projection cache and returns schema-validated expectation evidence. It cannot mutate authoritative state or trigger reload. Later skill, hook, and MCP integrations compose behind this one complete-plugin port rather than adding component-specific lifecycle paths.
- **Pending record ownership**: Before the first state commit, lifecycle writes one durable `LifecycleTransitionRecord` through `LifecycleTransitionStore`. It records operation id/kind, origin, scope/plugin, previous/candidate/final plugin states without their pending field, starting generation, projection expectation, and uninstall retention intent. `PendingTransitionRef` derives from operation id + scope/plugin + starting generation before the record is built, avoiding a self-referential hash. Authoritative plugin state attaches only that opaque reference. An orphan pre-commit record is inert and later GC may remove it.
- **Short guarded commit**: The coordinator callback only asserts ownership, promotes an install/update candidate through the finished `ContentStorePort`, and returns a verified state mutation that selects the candidate with its pending reference. Promotion is idempotent and remains inside the short scope window. Projection preparation, trust, inspection, and configuration stay outside.
- **Scope-generation rebasing**: A stale generation caused solely by an unrelated plugin mutation may retry against a fresh snapshot while the target plugin state and pending precondition remain exactly unchanged. A changed target or unexpected pending reference returns `stale`/`recovery-required`; prepared work is never applied over it. Retry uses the caller's `AbortSignal`, not a second timeout or unbounded hidden backoff system.
- **Reload and verification**: After committed state, lifecycle calls `LifecycleReloadPort.reload`, then independently calls `observe`. It compares exact scope, plugin, active/inactive state, selected revision, and projection digest. Calling reload is never proof of activation. The caller-provided abort/deadline signal is the verification timeout contract; this feature adds no clock or hard-coded duration.
- **Success finalization**: A verified activation/deactivation performs a second short guarded state commit that clears the exact pending reference. Uninstall uses the verified deactivation as its candidate state and removes the plugin record only in this final commit. The transition store is marked `completed` only after final state evidence exists.
- **Compensation ordering**: Reload rejection, adapter error, or observation mismatch first commits the previous plugin state while retaining the pending reference, then reloads and verifies the previous projection, then clears pending and marks the transition `rolled-back`. This extra reload is required because a failed candidate reload may have partially changed runtime state. If any commit or rollback observation is ambiguous, lifecycle leaves durable pending evidence and returns `recovery-required`; it does not claim the old revision is working.
- **Outcome honesty**: Public results distinguish `changed`, `unchanged`, `rejected`, `stale`, `rolled-back`, and `recovery-required`. `rolled-back` is returned only after previous state and runtime projection are both verified. `recovery-required` includes only safe operation/pending references and committed generation evidence, never paths, secrets, native errors, or an instruction to blindly retry.
- **Uninstall retention**: Uninstall always deactivates before removing the installed record. Immutable revisions are retired for the later retention/GC feature, never synchronously deleted here. `retainedData: "keep" | "delete-confirmed"` controls whether stable plugin data plus configuration/secrets are retained for reinstall or recorded for confirmed cleanup. Cleanup remains deferred to recovery/GC; disable has no cleanup intent. A cleanup delay cannot reactivate the plugin or turn a successful uninstall into data loss.
- **Cancellation**: Before the first commit, cancellation cleans owned staging and leaves state unchanged. After a possible commit, cancellation is treated like any ambiguous activation outcome: finish the non-cancellable evidence/compensation step where possible or return `recovery-required`. Immutable promoted/projection roots are safe orphans and are not destructively guessed away.
- **Advisory review**: The design is cross-cutting and would normally merit an independent pass, but the caller explicitly prohibited agents. Design-time advisory is therefore skipped non-blockingly; feature review remains required later under `review_weight: standard`.
- **Foundation timing**: Code-first. Current foundation assertions already describe this intended transaction. Implementation updates them only if landed names or the exact two-commit activation/rollback contract make an existing assertion false or misleading.

## Architectural choice

### Option A — separate install, activation, update, and removal services

Each operation could own its own sequencing and adapters. Individual files would be smaller, but compatibility/trust checks, projection preparation, generation rebasing, reload verification, and rollback would drift. Automatic update and sync could accidentally bypass manual-install guarantees. Rejected.

### Option B — persist desired state and let startup reconciliation do all activation

Commands could write intent and return before runtime activation. This makes operations short, but violates the required command result: a caller cannot know whether activation worked, and every ordinary failure becomes startup recovery work. Rejected.

### Option C — one lifecycle facade over one prepared transition engine (chosen)

Public operation methods do only operation-specific preparation and desired-state construction. One internal engine writes pending evidence, performs the guarded promotion/state commit, reloads, observes, finalizes, or runs the same compensation path. Ports isolate source, content, state, projection, reload, and transition persistence. The design has one additional installed-revision loader seam but no policy framework, workflow DSL, or generic saga abstraction.

**Choice**: Option C. It centralizes the guarantees that must not drift while keeping long-running adapters outside the lock and runtime implementations outside application policy.

## Trickiest unit first

The hardest unit is the post-commit activation window. State must select the candidate before reload can discover it, but reload may fail, partially apply, return an error after applying, or be followed by an unrelated scope generation. The design makes that uncertainty visible: a durable pending reference survives the first commit; exact plugin preconditions allow safe generation rebasing; success requires an independent observation; compensation restores previous state with the same pending reference, reloads again, verifies the previous expectation, and only then clears pending. Any unproved step remains `recovery-required` for the next feature instead of being mislabeled as rollback or success.

## Implementation units

### Unit 1: Lifecycle, transition, projection, and reload contracts plus candidate preparation

**Story**: `epic-transactional-plugin-lifecycle-operations-contracts-preparation`

**Files**:
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-candidate-preparation.ts`
- `src/application/ports/installed-plugin-loader.ts`
- `src/application/ports/runtime-projection.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/application/ports/lifecycle-transition-store.ts`
- `src/application/ports/lifecycle-operation-id.ts`
- `test/application/plugin-lifecycle-contract.test.ts`
- `test/application/plugin-candidate-preparation.test.ts`

```typescript
export const LifecycleOperationRegistry = {
  install: { changesActivation: true },
  enable: { changesActivation: true },
  disable: { changesActivation: true },
  update: { changesActivation: true },
  uninstall: { changesActivation: true },
} as const;
export type LifecycleOperation = keyof typeof LifecycleOperationRegistry;

export const RuntimePluginComponentsSchema = z.object({
  skills: z.array(SkillComponentSchema).readonly(),
  hooks: z.array(HookComponentSchema).readonly(),
  mcpServers: z.array(McpServerComponentSchema).readonly(),
}).strict().readonly();

export const PluginRuntimeProjectionSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  revision: ContentDigestSchema,
  contentRef: PluginContentRefSchema,
  dataRef: PluginDataRefSchema,
  configurationRef: PluginConfigurationRefSchema.optional(),
  components: RuntimePluginComponentsSchema,
  digest: ContentDigestSchema,
}).strict().readonly();
export type PluginRuntimeProjection = z.infer<typeof PluginRuntimeProjectionSchemaV1>;

export type ProjectionExpectation =
  | Readonly<{ kind: "active"; projection: PluginRuntimeProjection; projectionRef: ProjectionRootRef }>
  | Readonly<{ kind: "inactive"; scope: ScopeReference; plugin: PluginKey; digest: ContentDigest }>;

export interface RuntimeProjectionPort {
  prepare(expectation: ProjectionExpectation, signal: AbortSignal): Promise<ProjectionExpectation>;
}

export type ActivationObservation =
  | Readonly<{ kind: "active"; scope: ScopeReference; plugin: PluginKey; revision: ContentDigest; projectionDigest: ContentDigest }>
  | Readonly<{ kind: "inactive"; scope: ScopeReference; plugin: PluginKey }>;

export interface LifecycleReloadPort {
  reload(request: Readonly<{ scope: ScopeReference; transition: PendingTransitionRef }>, signal: AbortSignal): Promise<
    | Readonly<{ kind: "accepted" }>
    | Readonly<{ kind: "failed"; code: string }>
  >;
  observe(request: Readonly<{ scope: ScopeReference; plugin: PluginKey }>, signal: AbortSignal): Promise<ActivationObservation>;
}
```

`createPluginRuntimeProjection` verifies the installed revision against the normalized plugin/report, excludes foreign/incompatible declarations, canonicalizes schema JSON, derives digest/reference through the existing hash functions, and rejects caller-supplied mismatches. `createInactiveProjectionExpectation` hashes one canonical tombstone shape. Port outputs are parsed and compared to the request; ordinary contract violations fail safely without adding adversarial adapter machinery.

```typescript
export const LifecycleOperationSchema = z.enum(
  Object.keys(LifecycleOperationRegistry) as [LifecycleOperation, ...LifecycleOperation[]],
);
export const LifecyclePluginStateSchema = InstalledPluginRecordSchema.omit({
  pendingTransition: true,
});

export const LifecycleTransitionRecordSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  reference: PendingTransitionRefSchema,
  operationId: z.string().uuid(),
  operation: LifecycleOperationSchema,
  origin: z.enum(["manual", "automatic-update", "sync", "adoption"]),
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  startingGeneration: GenerationSchema,
  previous: LifecyclePluginStateSchema.nullable(),
  candidate: LifecyclePluginStateSchema.nullable(),
  final: LifecyclePluginStateSchema.nullable(),
  projection: ProjectionExpectationSchema,
  retainedData: z.enum(["keep", "delete-confirmed"]),
}).strict().readonly();

export interface LifecycleTransitionStore {
  prepare(record: LifecycleTransitionRecord, signal: AbortSignal): Promise<"stored" | "already-present">;
  settle(request: Readonly<{
    reference: PendingTransitionRef;
    outcome: "completed" | "rolled-back" | "recovery-required";
    generation?: Generation;
  }>, signal: AbortSignal): Promise<void>;
}

export interface InstalledPluginLoader {
  load(request: Readonly<{
    scope: ScopeContext;
    revision: InstalledRevisionRecord;
  }>, signal: AbortSignal): Promise<LoadedInstalledPlugin>;
}
```

Candidate preparation for install/update composes existing `ContentStorePort.allocateStaging`, `PluginMaterializer`, `PluginInspectionService`, `CompatibilityService`, installed-record constructors, `authorizeTrustCandidate`, and configuration resolution. Enable uses `InstalledPluginLoader` then the identical evidence/readiness/projection builder. Preparation returns an internal frozen value, not a public bypass token. Every rejected or cancelled pre-commit path explicitly discards its staging allocation.

**Acceptance criteria**:
- [ ] Operation, projection, transition, observation, origin, and outcome variants derive from schema/registry contracts rather than hand-copied unions across files.
- [ ] Active projection digest changes with scope, revision/ref, normalized skill/hook/MCP behavior, or configuration reference; it contains no physical path or secret/expanded value.
- [ ] Inactive expectations are deterministic and cannot be confused with active projection evidence.
- [ ] Install/update preparation runs materialization, inspection, compatibility, exact trust, configuration readiness, and projection preparation before coordination; enable proves the installed loader handoff matches selected state.
- [ ] Incompatible, untrusted, unconfigured, malformed, aborted, or projection-failed preparation leaves authoritative state untouched and discards owned staging.
- [ ] Ports expose no Pi context, filesystem path, Node API, timer, prompt, lock, state-commit callback, secret value, or component-specific transaction method.

### Unit 2: Guarded whole-plugin transition engine and five-operation facade

**Story**: `epic-transactional-plugin-lifecycle-operations-guarded-transitions`
**Depends on**: `epic-transactional-plugin-lifecycle-operations-contracts-preparation`

**Files**:
- `src/application/plugin-lifecycle-service.ts`
- `test/application/plugin-lifecycle-service.test.ts`

```typescript
export interface PluginLifecycleService {
  install(request: InstallPluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  enable(request: EnablePluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  disable(request: DisablePluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  update(request: UpdatePluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  uninstall(request: UninstallPluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
}

export type PluginLifecycleResult =
  | Readonly<{ kind: "changed"; operation: LifecycleOperation; snapshot: GenerationSnapshot; observation: ActivationObservation; cleanup?: LifecycleCleanupIntent }>
  | Readonly<{ kind: "unchanged"; operation: LifecycleOperation; snapshot: GenerationSnapshot }>
  | Readonly<{ kind: "rejected"; operation: LifecycleOperation; code: LifecycleRejectionCode }>
  | Readonly<{ kind: "stale"; operation: LifecycleOperation; expected: Generation; actual: Generation }>
  | Readonly<{ kind: "rolled-back"; operation: LifecycleOperation; failure: LifecycleActivationFailure; snapshot: GenerationSnapshot; observation: ActivationObservation }>
  | Readonly<{ kind: "recovery-required"; operation: LifecycleOperation; transition: PendingTransitionRef; committed?: Generation }>;

export function createPluginLifecycleService(dependencies: Readonly<{
  state: LifecycleStateStore;
  mutations: GenerationMutationCoordinator;
  content: ContentStorePort;
  materializer: PluginMaterializer;
  inspector: PluginInspectionService;
  compatibility: CompatibilityService;
  installed: InstalledPluginLoader;
  projections: RuntimeProjectionPort;
  reload: LifecycleReloadPort;
  transitions: LifecycleTransitionStore;
  operationIds: LifecycleOperationIdPort;
  projectTrust: ProjectTrustPort;
  configurations: PluginConfigurationStore;
  secrets: SecretStore;
  paths: ConfigurationPathPort;
  sha256: Sha256;
}>): PluginLifecycleService;
```

The service validates requests at entry and exposes no public `commit`, `promote`, `activateComponent`, or `skipVerification` method. Internal helpers are ordinary functions, not a workflow engine:

1. read exact scope state and classify operation-specific no-op/rejection;
2. prepare candidate or deactivation expectation outside coordination;
3. create/store transition evidence;
4. re-read/rebase only while target plugin precondition is unchanged;
5. in `runPreparedMutation`, assert ownership, promote only for install/update, and return `parseStateMutation(...)` selecting the pending candidate;
6. reload, observe, and compare exact expectation;
7. finalize by clearing pending (or removing the record for uninstall);
8. on failure, commit previous state with pending, reload/observe previous expectation, clear pending, then return `rolled-back`;
9. on any unproved post-commit state, settle `recovery-required` best-effort and return its safe reference.

Install rejects an existing different installation; update rejects missing state and returns unchanged for the same selected revision. Enable/disable are idempotent. Uninstall of an enabled plugin uses deactivation before final record removal; uninstall of an already-disabled plugin may skip reload only after the inactive observation/precondition is already authoritative. A pending transition always stops a new mutation. Content/projection roots published before a failed or stale commit remain inert candidates for later GC.

**Acceptance criteria**:
- [ ] Install and update activate all normalized supported components together and never commit a non-activatable, untrusted, or unconfigured candidate.
- [ ] Enable, disable, update, and uninstall change one complete plugin record; no component selection or caller bypass exists.
- [ ] Promotion occurs only inside the coordinator callback; long preparation and reload never hold the scope lock.
- [ ] A changed target state or pending reference prevents rebasing; unrelated scope generation changes can retry without repeating materialization.
- [ ] Success is returned only after exact post-reload observation and pending-clear commit.
- [ ] Reload failure or observation mismatch returns `rolled-back` only after previous state/projection are independently restored and verified.
- [ ] Ambiguous commit, finalization, or rollback evidence returns `recovery-required` with durable pending evidence and never recommends blind replay.
- [ ] Uninstall removes activation before state and records, but does not itself delete, persistent data/configuration/secrets only under `delete-confirmed`, and disable never schedules deletion.
- [ ] Cancellation before commit preserves the old state and cleans staging; cancellation after possible commit produces proven rollback/success or `recovery-required`.

### Unit 3: Lifecycle integration, public boundary, and rolling documentation

**Story**: `epic-transactional-plugin-lifecycle-operations-integration-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-operations-guarded-transitions`

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/plugin-lifecycle.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only if landed contracts change current assertions

Use schema-valid in-memory adapters around the real inspection, compatibility, trust, installed-state, promotion-plan, and generation-coordinator contracts. One integration fixture contains a skill, hook, and MCP server so each operation proves whole-bundle behavior without duplicating runtime-specific tests. The fake projection/reload boundary records expectations and can return accepted, rejected, partial/mismatched, and lost-response observations.

Public exports include lifecycle request/result schemas and types, service factory, projection/transition/reload/loader ports, and safe evidence constructors. They exclude transition-store payload mutation helpers, workflow internals, component-specific activation methods, physical paths, Pi APIs, clocks, retry controls, secret values, and fake adapters.

**Acceptance criteria**:
- [ ] One end-to-end fake-port suite proves install → disable → enable → update → uninstall over a complete skill/hook/MCP bundle and exact user/project isolation.
- [ ] Focused failure tests prove pre-commit incompatibility/trust/config/projection/promotion/stale failures preserve prior state; reload mismatch proves verified rollback; rollback/finalization ambiguity proves `recovery-required`.
- [ ] Existing real generation-locking and immutable-promotion suites remain the sole detailed tests of cross-process exclusion and filesystem publication; this feature does not clone them.
- [ ] Public source/compiled allowlists expose one lifecycle facade and narrow ports without a lower-level mutation or partial-component escape hatch.
- [ ] Dependency rules keep application lifecycle code free of Node, filesystem, Pi, runtime, formats, and infrastructure imports.
- [ ] Full `npm test` passes production/test typechecking, boundaries, focused integration tests, build, and exact compiled import.
- [ ] Foundation documents remain rolling-current and do not imply that this feature implements Pi reload, runtime components, recovery/GC, update policy, UI, or foreign-state reading.

## Implementation order

1. `epic-transactional-plugin-lifecycle-operations-contracts-preparation`
2. `epic-transactional-plugin-lifecycle-operations-guarded-transitions`
3. `epic-transactional-plugin-lifecycle-operations-integration-hardening`

The chain is intentional. Contracts/preparation establish the only downstream seams and prove candidates before mutation. The transition story then owns all state/reload/compensation policy. The final story converges the real completed contracts and package boundary without turning every port into its own tracking item.

## Simplification

- Keep one lifecycle service and one transition function; do not create separate install/update/activation coordinators or a generic saga/workflow framework.
- Reuse `GenerationMutationCoordinator`, `ContentStorePort`, installed-record constructors, trust/configuration services, and state schemas. Do not add a second lock, state store, trust evaluator, projection pointer in authoritative state, or component inventory.
- Do not add external idempotency keys, lock expiry, retry databases, per-component selection, operation timers, or same-user adversarial adapter defenses.
- The only new preparation abstraction is `InstalledPluginLoader`, required because enable/rebuild must recover complete normalized evidence from lossy installed state and immutable content.
- Keep detailed concurrency, promotion, secret-custody, and source-security tests in their owning features. Lifecycle tests protect orchestration seams and outcomes only.

## Testing

- **Projection contract**: one canonical active vector plus one inactive vector; mutate scope/revision/component/configuration evidence and reject forged digests/refs. Protects the downstream runtime seam.
- **Operation table**: one parameterized service test covers normal/no-op/rejected semantics for all five operations and pending-transition blocking. Protects the stable public facade.
- **Commit/activation matrix**: targeted cases for stale before promotion, promotion failure, reload rejection, observation mismatch, successful rollback, ambiguous finalization, and failed rollback verification. Protects the highest-consequence transaction boundary without enumerating every branch.
- **Whole-bundle integration**: one fixture with skill + hook + MCP proves install/update/disable/enable/uninstall use one projection and one reload path. Protects the whole-plugin promise.
- **Scope and cleanup**: one user/project same-key case and uninstall `keep`/`delete-confirmed` cases. Protects scope isolation and explicit data policy.
- **No duplicate low-value tests**: do not repeat reader, compatibility rule, secret leak, SQLite race, or filesystem atomicity matrices already covered by completed features. Remove any lifecycle test that only asserts a fake was called without proving state, projection, or outcome.

## Risks

- **Riskiest assumption — post-reload code can inspect the new runtime instance reliably**: `ctx.reload()` integration does not exist yet. Mitigation: the port requires an independent exact observation, not a success boolean. Fallback: the Pi adapter can persist/read activation evidence through the transition store; until it can, lifecycle returns `recovery-required` rather than success.
- **Scope-wide generations may churn during reload**: unrelated plugins can advance the same scope. Mitigation: rebase only when the target plugin and exact pending reference are unchanged. Fallback: caller cancellation ends contention with visible pending evidence; no stale prepared state overwrites the target.
- **A reload failure may partially activate the candidate**: treating the error as “nothing happened” would be unsafe. Mitigation: restore previous authoritative state, reload again, and verify the previous expectation before reporting rollback.
- **Transition persistence and authoritative state are separate stores**: they cannot share one transaction. Mitigation: prepare transition first (orphan is inert), then commit its opaque ref; settle only after state evidence. Fallback: startup recovery reconciles referenced versus orphan records in the next feature.
- **Installed-state evidence is intentionally lossy**: enable cannot rebuild exact projections from summaries alone. Mitigation: the loader resolves immutable content and reruns normalized inspection/compatibility. Fallback: missing/corrupt source evidence rejects enable while leaving the plugin installed and disabled.
- **Uninstall cleanup is deferred**: content or explicitly confirmed data may remain after activation/state removal. Mitigation: return and persist cleanup intent; later recovery/GC performs reference-aware deletion. This is preferable to deleting data before deactivation is proven.
- **Least certainty — configuration across update revisions**: configuration refs are revision-bound, so an update may need fresh validated values. Mitigation: preparation requires the exact candidate configuration to resolve before commit and never silently reuses incompatible values. Later management UI may offer explicit carry-forward using the existing validation service.

## Pre-mortem

The design fails if a caller bypasses compatibility/trust, promotion occurs for stale state, reload success is assumed rather than observed, rollback reports success while the candidate remains live, uninstall deletes data before deactivation, or a scope-generation retry overwrites a changed target. One facade, opaque prepared evidence, the existing guarded coordinator, durable pending references, exact observation, verified compensating reload, deferred confirmed cleanup, and target-state preconditions directly address those failures.

The fallback is deliberately visible: if state or runtime cannot prove success or restoration, leave the transition recoverable and return `recovery-required`. Do not add lock leases, broad retries, or destructive cleanup guesses to manufacture a cleaner result.

## Implementation summary
- Execution capability: direct host implementation; the caller explicitly prohibited agents and the three stories were serialized by dependency order.
- Review weight: standard, caller did not override the project default.
- Children advanced to `review`: contracts/preparation, guarded transitions, and integration hardening.
- Delivered one registry-backed lifecycle contract set, logical active/inactive projections, durable pending-transition evidence, installed-revision loading, candidate preparation with exact trust/configuration readiness, one guarded five-operation facade, independent reload observation, verified rollback, recovery-required outcomes, and public/dependency boundaries.
- Verification: `npm test` passed production/test typechecking, dependency-cruiser, 93 unit files / 561 tests, build, and exact compiled package import (360 exports).
- Commits: `09a7692` contracts/preparation, `139a312` guarded transitions, `bc142da` integration hardening. Parent stage transition is committed separately.

## Review findings

Phase-1 complementary review found one realistic normal-use blocker: lifecycle dependencies omitted `ProjectRootAuthorityPort`, so project-scope install, enable, and update always rejected as unconfigured. It also found the promised service-level project-scope skill/hook/MCP lifecycle integration was absent. `epic-transactional-plugin-lifecycle-operations-project-scope-wiring` owns the bounded wiring and coverage fix; the feature remains at `stage: implementing` while that story completes. Adversarial review is deferred until complementary review clears.

The wiring story also records the recovery boundary: if the previous revision becomes corrupt or cannot be reconstructed after a candidate commit, verified rollback is unavailable and the lifecycle result must remain `recovery-required`; startup recovery owns that case and is not implemented by this feature.
