---
id: epic-native-plugin-management-update-policy-offline-startup
kind: feature
stage: drafting
tags: [compatibility, reliability]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-lifecycle-sync-operations]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Update Policy, Notifications, and Offline Startup

## Brief

Complete the update experience around the existing marketplace refresh and update-policy services. Persist automatic-update settings, schedule refresh independently of startup readiness, emit one calm Pi-facing event for each newly discovered revision, retain unresolved update counts, and invoke the deterministic update operation only when policy, trust, compatibility, and lifecycle safety permit it.

Startup must activate previously installed local projections without network access. Marketplace, remote MCP, Git, npm, and update-service unavailability remain explicit stale/live health after readiness rather than blocking Pi or disabling unrelated plugins.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Builds on deterministic update/lifecycle operations and the packaged host startup boundary.
- Owns update-policy settings custody, scheduler lifecycle, discovery-event deduplication, unresolved notification state, automatic-update authorization, and offline/readiness behavior.
- Reuses marketplace refresh/update scheduler/policy/state services and automatic-update authorization. It does not create another updater or make remote reachability activation evidence.

## Capability boundaries

- A revision produces at most one newly-discovered notification event per scope/plugin/revision; restart and repeated refresh do not spam it, while the manager badge remains until resolution.
- Automatic updates are opt-in/configurable at the documented scope, use the same preflight/trust/configuration/lifecycle path as manual update, and never auto-approve changed executable surfaces or missing secrets.
- Failed automatic updates retain the prior active revision and surface an actionable result; retry policy is bounded and cancellation/shutdown-aware.
- Host readiness and local plugin activation have no network prerequisite. Refresh begins only after startup and cannot hold the extension command or TUI open path hostage.
- Offline and stale status is deterministic and inspectable; no source is marked refreshed and no plugin is marked updated from cached intent alone.
- Settings and notification data remain Plugin Host state, separate from authoritative installed revision state.

## Mockup inheritance

Notification tone and persistent update-count placement inherit the parent decision and `.mockups/screens/epic-native-plugin-management-manager/option-1.html`. The feature emits typed events/state only; the Pi extension owns `ctx.ui.notify` and badge rendering.
