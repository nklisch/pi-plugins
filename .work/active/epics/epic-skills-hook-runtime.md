---
id: epic-skills-hook-runtime
kind: epic
stage: done
tags: [compatibility, infra]
parent: null
depends_on: [epic-transactional-plugin-lifecycle]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-17
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

## Decomposition

Split into five capability arcs around the existing lifecycle boundary: one complete-projection and reload-evidence foundation, two parallel consumers for skill discovery and ordinary hook semantics, one guarded command runtime, and one conditional subagent interception adapter. This shape keeps deterministic resource discovery independent of hook execution, separates foreign event semantics from the security-critical process boundary, and leaves the optional subagent seam isolated without splitting by source layer or creating test-only work. Each feature is sized for roughly 5–12 future implementation checkpoints; combining the event and command arcs would exceed the intended feature boundary, while separating aliases, inputs, outputs, limits, or tests would create layer/phase slices.

### Child features

- `epic-skills-hook-runtime-projection-reload-evidence` — prepare and consume complete projections while emitting exact skill/hook reload evidence without claiming MCP activation — depends on: `[]`
- `epic-skills-hook-runtime-skill-discovery` — contribute deterministic, scope- and trust-correct installed skill roots through Pi `resources_discover` — depends on: `[epic-skills-hook-runtime-projection-reload-evidence]`
- `epic-skills-hook-runtime-hook-event-adaptation` — map supported Pi lifecycle boundaries, matchers, aliases, conditions, and compatible inputs into executable hook plans — depends on: `[epic-skills-hook-runtime-projection-reload-evidence]`
- `epic-skills-hook-runtime-guarded-command-hooks` — securely execute and aggregate command hooks with bounded resources and faithful output decisions — depends on: `[epic-skills-hook-runtime-hook-event-adaptation]`
- `epic-skills-hook-runtime-subagent-interception` — integrate faithful pre-start/pre-stop interception or report the requirement unavailable — depends on: `[epic-skills-hook-runtime-guarded-command-hooks]`

### Simplification arcs

- `epic-skills-hook-runtime-projection-reload-evidence` — retain one complete lifecycle projection and one digest/evidence vocabulary; do not add component state, projection pointers, or a second reload protocol.
- `epic-skills-hook-runtime-skill-discovery` — discover immutable roots in place instead of copying skills or writing generated Pi settings.
- `epic-skills-hook-runtime-hook-event-adaptation` — derive event, alias, matcher, condition, and input behavior from one registry rather than parallel host-specific switches.
- `epic-skills-hook-runtime-guarded-command-hooks` — reuse the bounded process-tree and configuration-resolution seams rather than duplicate cancellation, output capture, or secret expansion.
- `epic-skills-hook-runtime-subagent-interception` — consume or narrowly extend the installed subagent service instead of building another subagent runtime.

## Existing surface map

- **Foreign inventory**: `src/formats/agent-skills/skill-reader.ts`, `src/formats/hook-reader-support.ts`, and the Claude/Codex hook readers already produce provenance-rich `SkillComponent` and `HookComponent` values without execution. `src/domain/compatibility-policy.ts` is the current registry for supported hook events and the `pi.hooks.command`, shell, skill-tool-restriction, and subagent-interception requirements.
- **Lifecycle handoff**: `src/application/ports/runtime-projection.ts` already hashes one complete skill/hook/MCP projection, and `src/application/ports/lifecycle-reload.ts` requires independent exact observation after reload. Lifecycle operations, recovery, immutable content/data/projection roots, trust, project trust, and callback-scoped configuration resolution are implemented behind existing ports and remain authoritative.
- **Reusable adapters**: `src/infrastructure/process/command-runner.ts` already provides bounded capture, process-tree cancellation, and safe command redaction for source acquisition; the guarded-hook design may reuse or narrowly generalize that behavior without coupling application policy to Node. No `src/runtime/` or `src/pi/` implementation exists yet.
- **Current Pi lifecycle**: public extension events provide `resources_discover`, `session_start`/`session_shutdown`, `input`, `tool_call`, `tool_result`, `session_before_compact`, `session_compact`, and `agent_settled`. Post-compaction `SessionStart.source=compact` must be synthesized from the compaction boundary; `Stop` uses settled-agent semantics plus a continuation guard. Pi itself has no native subagent lifecycle, and its process-based example is observational rather than an interception contract.
- **Existing evidence**: format, compatibility-table, lifecycle projection, process-runner, and whole-bundle integration tests cover normalized fixtures, complete projection hashing, capability degradation, scope isolation, and low-level process behavior. Runtime discovery, event mapping, decision aggregation, reload contribution evidence, and subagent interception tests are absent because those adapters do not yet exist.

## Design decisions

- **Capability shape**: Use the five-feature graph above. Projection/reload evidence is the sole foundation; skill discovery and ordinary event adaptation can proceed in parallel; command execution consumes event plans; subagent interception reuses the completed ordinary hook runtime.
- **Complete-bundle projection**: Preserve `PluginRuntimeProjection` unchanged, including MCP inventory and its complete digest. This epic owns skill/hook preparation and contribution evidence only. It never drops or interprets MCP entries and never reports whole-bundle activation from a partial slice; native composition can satisfy `LifecycleReloadPort` only after the sibling MCP contribution agrees.
- **Lifecycle and state ownership**: Consume the existing projection, content/data resolution, trust, project-trust, configuration-resolution, and reload-observation ports. Do not add authoritative state reads, generation commits, trust grants, credential stores, recovery logic, or a second lifecycle path. Concrete state/credential adapter composition remains in `epic-native-plugin-management`.
- **Trust and scope**: Runtime projections are already compatibility-checked and exactly trusted by lifecycle, but current Pi project trust and canonical project identity remain runtime gates for project-scoped skills and hooks. User/project resources stay independently keyed; no path or plugin-name precedence may alias them.
- **Hook normalization boundary**: Installation-time normalized components and retained compatibility metadata are the only hook definitions the runtime accepts. Raw manifests are never re-read during execution. A single registry should own Pi-event mapping, foreign tool aliases, matcher/`if` semantics, compatible input fields, and deterministic ordering.
- **Execution safety**: Every hook invocation receives explicit working directory, environment, stdin, timeout, abort signal, and output ceilings. Concurrent handlers may finish in any order, but deduplication and decision aggregation follow normalized declaration identity/order. Unsupported output is an error, not a no-op; secret values and native causes never enter diagnostics.
- **Subagent degradation**: Faithful pre-start context injection and pre-stop continuation are mandatory. Feature design must ground the current upstream API before choosing upstream contribution versus a narrow maintained fork. If interception is absent, the existing runtime requirement is unavailable and affected plugins do not activate; observational approximation is rejected.
- **Ownership exclusions**: This epic does not absorb foreign ingestion, marketplace/lifecycle state, native `/plugin` management, MCP runtime behavior, secret/credential adapter composition, foreign model/provider behavior, or a standalone subagent service.
- **UI alignment**: Mockups skipped. This is backend/runtime integration with no presentation screen or flow; `/plugin` UX and diagnostics presentation remain native management work in `epic-native-plugin-management`. No mock files were generated.
- **Discovery posture**: Direct-read only, as required. Grounding covered global/project rules and conventions; `VISION`, `SPEC`, `ARCHITECTURE`, and `COMPATIBILITY`; all sibling epics; the completed lifecycle seams and representative child feature contracts; foreign skill/hook readers and compatibility fixtures; process and projection tests; and current Pi extension, skill, package, SDK, session, compaction, reload, and subagent-example documentation. No nested agent or peer mechanism was used.
- **Least irreversible choices**: Keep extension interfaces and the upstream/fork decision late-bound to feature design, use registries and injected ports rather than new authorities, and represent unavailable interception honestly. These choices preserve replacement and upstream-contribution options.

## UI alignment

Mockups skipped: the epic has no new screen, page, flow, or component. `/plugin` interaction belongs to `epic-native-plugin-management` and uses Pi's native management experience.

## Decomposition risks

- **Reload evidence can become falsely partial**: skill and hook adapters may be healthy while MCP activation failed. Contribution evidence must remain bound to the complete projection digest, and only native composition may aggregate it into whole-bundle observation.
- **Pi and foreign lifecycle boundaries are similar but not identical**: compaction can imply both `PostCompact` and `SessionStart(source=compact)`, tool failures share `tool_result`, and `Stop` continuation can recurse. One ordered mapping registry and explicit continuation budget must prevent double firing or loops.
- **Process execution is the highest-risk feature**: shell semantics, inherited environment, output decoding, timeout versus caller abort, child cleanup, and concurrent decisions can leak data or hang Pi. The feature must remain bounded and independently reviewable.
- **Project scope can drift during session replacement or reload**: resources and hooks must be rebuilt for the effective cwd and current trust decision, not retained from a stale extension instance or matched by path spelling alone.
- **Skill collision behavior is host-owned**: deterministic path ordering must preserve Pi's first-skill collision contract without silently imposing plugin precedence or dropping a conflicting skill.
- **Subagent interception may require upstream work**: current Pi documentation exposes no native boundary and the process-based example cannot inject before start/stop. The feature may need a narrow maintained fork, but capability unavailability remains a valid non-activation outcome rather than pressure to approximate.

## Aggregate review readiness — 2026-07-18

All five child features are `stage: done`, including the published production subagent lifecycle adapter and upstream PR #614. The epic advances to `review` for its independent aggregate pass.

## Standard aggregate review — 2026-07-18

**Verdict: APPROVE.** One independent cross-model, fresh-context aggregate pass reviewed all five features and their complete lifecycle/native/MCP coordination. No material blockers were found.

Verification included **332 files / 1,613 tests**, clean typecheck, **426 modules / 3,002 dependency edges**, **847 compiled exports**, and packed real Pi 0.80.8 acceptance. The pass independently checked skill scope/order/reload, strict foreign hook adaptation, guarded process execution and continuation bounds, exact subagent interception, complete projection evidence, trust/project/session/reload races, plugin-scoped degradation, package qualification, secret non-retention, complete-bundle coordination, rollback, and documentation truth.

Three lower-risk findings were parked without implementation:

- `idea-reconcile-subagent-release-evidence`
- `idea-bind-subagent-qualification-digest-to-suite`
- `idea-stop-hook-workers-after-cancellation`

The epic advances from `review` to `done` without a second review pass.
