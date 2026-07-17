---
id: epic-native-plugin-management-pi-extension-manager-notifications-session-lifecycle
kind: story
stage: implementing
tags: [compatibility, tui]
parent: epic-native-plugin-management-pi-extension-manager
depends_on: [epic-native-plugin-management-pi-extension-manager-command-bridge]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
