---
id: epic-native-plugin-management-pi-extension-manager-notifications-session-lifecycle
kind: story
stage: done
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-command-bridge]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Integrate update notifications and Pi session disposal

## Design checkpoint

Implement Unit 6 from the parent feature. Supply the session-bindable Pi update publisher, one calm notification per authoritative notice ID, ID-only same-session replay guards, unresolved-count manager badges, collision detection, and explicit startup/reload/new/resume/fork/quit presentation lifecycle.

Application notice state remains publication/unread/unresolved authority. A missing TUI/RPC context must not report successful publication. Factory construction starts no presentation timer, watcher, prompt, terminal component, or background task.

## Acceptance evidence

- One exact notice produces one notify; duplicate same-session publication is suppressed and unresolved count stays owner-derived.
- JSON/print/no-context publication remains pending rather than falsely succeeding.
- Session replacement binds one current context, closes predecessor UI/input/read work, preserves only reload-causing admitted handoffs, and disposes idempotently.
- Multiple Pi processes/sessions share no manager/component state and continue to rely on application state/locks.
- Custom notification entries contain notice IDs only and cannot authorize/acknowledge/resolve anything.

## Implementation notes

Composed the default extension in construct-only order: session-bindable publisher, one packaged host, one process-local handoff, one fresh manager session, exactly one `/plugin` command, then presentation lifecycle handlers. Host lifecycle remains registered first. Manager controllers/components/overlays are per presentation and never shared across Pi sessions; shutdown closes only presentation-owned resources and preserves only a reload-causing admitted handoff.

The publisher notifies once per exact authoritative notice ID in TUI/RPC, records only that ID in a custom entry after success, restores IDs from all current-session entries, and fails publication when no supported UI exists. Unread/unresolved badges remain facade state. Lifecycle tests cover startup/reload/new/resume/fork/quit ordering, fresh-successor result presentation, idempotent close, and exact session cleanup; publisher tests cover replay, mode failure, calm copy, and ID-only retention. Full repository verification passed before this checkpoint advanced directly to done.
