---
id: epic-native-plugin-management-packaged-host-composition-host-contract-session-layout
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Establish the Construct-Only Host and Exact Session Layout

## Checkpoint

Define the public construct/start/dispose state machine, pure host path plan, exact Pi session binding, inert bootstrap delegates, duplicate-composition registry, and reload-successor overlap rule. Construction must remain effect-free except for registering the bootstrap event delegates needed to receive explicit Pi startup and shutdown.

## Planned files

- `src/composition/packaged-plugin-host-contract.ts`
- `src/composition/plugin-host-paths.ts`
- `src/pi/pi-session-binding.ts`
- `src/pi/plugin-host-bootstrap.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/pi/pi-session-binding.test.ts`

## Required behavior

- `createPackagedPluginHost` validates only pure options and reserves one versioned global composition claim.
- `start` binds only `sessionManager.getSessionId()`, session file, `ctx.cwd`, mode, and initial Pi project trust from the real `session_start` context.
- The binding port checks `isProjectTrusted()` on the still-bound current Pi context for each assessment rather than caching the initial boolean as authority.
- Every later Pi context must match the exact session id and cwd before application work.
- Default paths derive from `<getAgentDir()>/plugin-host`; new lifecycle-state names decode only verified project-key digest bytes, while existing versioned lock/recovery codecs receive only schema-verified keys and are not renamed.
- User and project scope locations cannot alias, and no plugin/source/project spelling enters a machine path.
- One active composition is allowed per session. Only an exactly ticketed reload successor may overlap one draining predecessor.
- Startup failure performs reverse cleanup and leaves the host terminal; close is idempotent.

## Acceptance evidence

- [ ] Filesystem, network, spawn, timer, credential, runtime, recovery, command/tool, and hook-execution spies observe no construction effect.
- [ ] Forged/stale session context, cwd drift, duplicate root, illegal overlap, relative agent dir, and path alias fail before state/runtime effects.
- [ ] The fixed state/lock/configuration/content/recovery/lease layout is collision-free and preserves existing recovery/content/lock paths.
- [ ] New/resume/fork/reload/quit lifecycle fixtures prove exact claim transfer and cleanup.
- [ ] Inert delegates receive no application event before a successful explicit start.

## Ordering constraint

Root checkpoint. All concrete adapters and application composition depend on these lifetime and path authorities.
