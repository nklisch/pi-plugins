---
id: epic-transactional-plugin-lifecycle
kind: epic
stage: review
tags: [security, infra]
parent: null
depends_on: [epic-foreign-plugin-model]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-16
---

# Transactional Plugin Lifecycle

## Brief

This epic delivers the whole-plugin state machine. It owns immutable installed revisions, user and project scopes, portable project declarations, persistent plugin data, trust decisions, sensitive configuration, and the authoritative records from which every runtime projection derives.

Lifecycle operations stage and validate complete bundles before atomically installing, enabling, disabling, updating, or uninstalling them. Cross-process coordination, pending-transition recovery, rollback, revision retention, garbage collection, update discovery, and read-only adoption preserve a working installation across crashes, concurrent Pi sessions, and unavailable networks.

This epic does not implement skill, hook, or MCP behavior and does not define the interactive plugin manager. It supplies stable application services and ports for those consumers, including replaceable outbound projection and reload-verification seams.

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle, Atomic change, Explicit trust
- `docs/SPEC.md` — Scopes, State layout, Install transaction, Updates, Trust and security
- `docs/ARCHITECTURE.md` — Authoritative state, Installation transaction, Revision retention and recovery, Trust
- `docs/COMPATIBILITY.md` — Whole-plugin behavior, Update behavior, Foreign-state adoption

## Decomposition

The epic is split into the eight capability arcs requested by the caller and reinforced by the GLM advisory. Although eight is above the usual epic-design target, collapsing them would combine independently risky contracts: durable schemas, secret handling, concurrency control, immutable storage, lifecycle orchestration, crash recovery, network policy, and foreign-state reading each need a distinct feature-design and review boundary. The graph preserves parallel work after the state foundation, converges at lifecycle operations, and then separates recovery, adoption, and update policy without splitting by technical layer.

### Child features

- `epic-transactional-plugin-lifecycle-state-schemas-stores` — define versioned authoritative user/project state, portable project declarations, and schema-validated state-store contracts — depends on: `[]`
- `epic-transactional-plugin-lifecycle-trust-config-secrets` — manage trust grants, configured values, and operating-system-backed secrets without persisting secret material in plugin-host state — depends on: `[epic-transactional-plugin-lifecycle-state-schemas-stores]`
- `epic-transactional-plugin-lifecycle-generation-locking` — provide scope-aware cross-process locking, per-plugin mutation coordination, and stale-generation compare-and-commit protection — depends on: `[epic-transactional-plugin-lifecycle-state-schemas-stores]`
- `epic-transactional-plugin-lifecycle-immutable-stores-promotion` — own staging allocation, immutable marketplace/plugin revision stores, content re-verification, and atomic promotion — depends on: `[epic-transactional-plugin-lifecycle-state-schemas-stores]`
- `epic-transactional-plugin-lifecycle-operations` — orchestrate whole-plugin install, enable, disable, update, and uninstall transitions through stable projection and reload-verification ports — depends on: `[epic-transactional-plugin-lifecycle-trust-config-secrets, epic-transactional-plugin-lifecycle-generation-locking, epic-transactional-plugin-lifecycle-immutable-stores-promotion]`
- `epic-transactional-plugin-lifecycle-recovery-journal-gc` — journal pending activation, recover or roll back interrupted transitions, retain live revisions, and safely collect abandoned or expired content — depends on: `[epic-transactional-plugin-lifecycle-operations]`
- `epic-transactional-plugin-lifecycle-refresh-update-policy` — implement offline-safe marketplace refresh, revision availability, notification memory, and opt-in automatic-update policy through the lifecycle service — depends on: `[epic-transactional-plugin-lifecycle-operations, epic-transactional-plugin-lifecycle-recovery-journal-gc]`
- `epic-transactional-plugin-lifecycle-read-only-adoption` — read Claude and Codex marketplace declarations without modifying foreign state or importing foreign trust, caches, credentials, or activation — depends on: `[epic-transactional-plugin-lifecycle-operations]`

### Dependency waves

1. **Wave 1 — authoritative state**: `state-schemas-stores` establishes the durable vocabulary and scope model.
2. **Wave 2 — independent safeguards and storage**: `trust-config-secrets`, `generation-locking`, and `immutable-stores-promotion` proceed in parallel against the state contracts.
3. **Wave 3 — whole-plugin mutations**: `operations` composes the three Wave 2 capabilities around the completed foreign-model materialization, inspection, and compatibility contracts.
4. **Wave 4 — interruption and import boundaries**: `recovery-journal-gc` and `read-only-adoption` proceed in parallel once lifecycle command semantics are stable.
5. **Wave 5 — network-driven policy**: `refresh-update-policy` consumes stable lifecycle and recovery behavior so notification or automatic-update work cannot invent a second transaction path.

## Cross-cutting guarantees

These guarantees constrain every child feature. Feature design may choose concrete schemas, interfaces, algorithms, and file placement, but may not weaken them.

- **Crash guarantee**: authoritative state never names a candidate as active until its immutable content, prepared projections, and pending transition are durably recorded. An interruption before activation leaves the previous revision usable; an interruption after reload is resolved by journal evidence and verification, never by assumption. Durability limitations of the host filesystem are surfaced rather than overstated.
- **Concurrency guarantee**: network, Git, npm, inspection, and compatibility work occurs outside the state lock. A short compare-and-commit window uses a scope lock plus an expected generation; stale work fails or restarts rather than overwriting a newer decision. In-process coordination serializes mutations per plugin key while unrelated acquisition may proceed concurrently.
- **Scope guarantee**: user and project installed state, activation, data, and generated projections remain independently addressable. `.pi/plugins.json` is portable intent only and contains no absolute paths, machine cache identities, timestamps, credentials, secrets, or trust decisions. Project activation remains inside Pi's project-trust boundary.
- **Data guarantee**: promoted revisions are immutable and runtime roots are read-only. Persistent plugin data lives outside revision directories and survives disable/update. Uninstall removes activation before content; persistent data and secret deletion require the explicit policy/confirmation required by the foundation contract. Secret values exist only behind the secret-store port and never enter state, projections, journals, diagnostics, or logs.
- **Network guarantee**: startup and installed-plugin discovery use local state only. Refresh and update acquisition are cancellable, rate-limited, non-blocking with respect to startup, and never hold state locks. Network, validation, trust, compatibility, or activation failure preserves the active revision.
- **Ports guarantee**: domain and application policy depend on schema-derived contracts and ports, not filesystem, Node, Pi, credential-store, clock, network, reload, Git, or npm APIs. Adapters own those effects; composition roots wire them. Unknown persisted or external values fail fast at versioned schema boundaries.

## Stable downstream seams

- **Projection seam**: committed authoritative state deterministically produces complete immutable projection descriptors for an exact plugin key, scope, revision, root/data references, normalized component inventory, and projection hash. Projections contain secret references rather than values, are replaceable caches rather than a second source of truth, and can be rebuilt after deletion.
- **Reload seam**: lifecycle submits a prepared projection set to an outbound activation/reload collaborator only after compare-and-commit preparation. The collaborator returns success or typed failure plus independently inspectable activation evidence; lifecycle does not assume that invoking reload means activation succeeded.
- **Verification seam**: finalization compares the expected scope generation, plugin revision, and projection hashes with post-reload observations. A mismatch leaves or restores a recoverable pending transition and preserves the prior active revision. Skills, hooks, and MCP epics implement their runtime sides later without changing lifecycle transaction semantics.
- **Boundary limit**: this epic defines and tests lifecycle-facing contracts and fakes only. It does not implement Pi resource reload, skill discovery, command-hook execution, MCP activation, `/plugin` UI, or terminal interaction.

## Design decisions

- **Capability shape**: Keep all eight advisory arcs. They are capability boundaries, not layer slices, and each carries a distinct failure or security model that merits its own later design pass.
- **Graph rationale**: State contracts are the sole root. Trust, locking, and immutable storage can be designed in parallel. Lifecycle operations are the only mutation coordinator. Recovery and adoption consume that coordinator, while network update policy comes last to prevent a duplicate update transaction path.
- **Foreign-model handoff**: Reuse the completed `MaterializedMarketplace`, `MaterializedPlugin`, deterministic content manifest/source binding, `NormalizedPlugin`, and `CompatibilityReport` contracts. Lifecycle re-verifies materialized content before promotion and never reinterprets foreign manifests or compatibility policy.
- **Outbound stability**: Projection generation and reload verification are explicit ports with hashable evidence. Runtime epics remain consumers/adapters; generated activation files never become authoritative state.
- **Late-bound decisions**: Exact state versions and migrations, lock backend and lease behavior, journal record grammar, fsync strategy by platform, retention intervals, project-key derivation details, update-check cadence/backoff, notification deduplication representation, foreign-state file discovery, and concrete port signatures remain feature-level decisions. Each must preserve the cross-cutting guarantees above.
- **UI alignment**: No UI surface. The native manager belongs to `epic-native-plugin-management`; no lifecycle mockup is applicable.
- **Discovery posture**: Direct-read only, as required. Grounding covered all foundation and compatibility documents, project rules, the completed foreign-model epic and feature contracts, and representative materialization/inspection/public seams. No nested agent or peer mechanism was used.
- **Advisory incorporation**: The caller-supplied GLM decomposition and five-wave graph were treated as the independent completeness advisory. No additional advisory call was made.

## Decomposition risks

- **Lifecycle operations are the convergence hotspot**: it must compose trust, generation checks, promotion, compatibility, projections, and reload without absorbing their storage or runtime implementations. Its feature design should keep a narrow transaction coordinator and explicit compensation semantics.
- **Recovery can accidentally become a second transaction engine**: recovery must replay or compensate journaled lifecycle intents using the same invariants, not invent parallel state mutations.
- **Durability claims vary by platform**: atomic rename, directory fsync, lock behavior, credential stores, and process crashes do not have identical guarantees. Feature designs must state the proven guarantee and fail explicitly when a required primitive is unavailable.
- **Scope aliasing is security-sensitive**: project identity changes, moved checkouts, and simultaneous user/project enablement can accidentally transfer trust or mix projections. Canonical scope identity and precedence require adversarial feature-level design.
- **Projection/reload ambiguity could strand a candidate**: operation success must depend on inspected evidence for the exact revision and hash, with startup recovery resolving indeterminate outcomes.
- **Update automation expands trust authority**: update policy must remain source-identity-bound, preserve explicit approval for identity changes, and route every automatic application through the same lifecycle operation and recovery journal as manual updates.

## Integrated implementation summary (2026-07-16)

All eight child capability arcs are `done`: versioned state/stores, trust/config/secrets, cross-process generation locking, immutable promotion, lifecycle operations, recovery/journal/GC, read-only foreign adoption, and refresh/update policy. Each feature completed its own review boundary; material review blockers were fixed and verified before closure.

The integrated package now provides the authoritative user/project state model; source-bound trust and secret references; short compare-and-commit mutation authority; immutable content promotion; one install/enable/disable/update/uninstall transaction path with projection/reload evidence; durable recovery/retention/collection; read-only Claude/Codex declaration adoption; and explicit offline-safe refresh/scheduling/policy services. No runtime skill/hook/MCP adapters or native manager UI were introduced.

Latest integrated verification passes `npm test`: typecheck, dependency boundaries, 121 files / 648 tests, build/package import, and 437 intentional exports. Real process-crash, concurrent-lock, recovery-retention, adoption, automatic-authority, scheduler, notification, and v1/v2 compatibility evidence are included. The pre-existing dirty `.work/bin/work-view` remains untouched.
