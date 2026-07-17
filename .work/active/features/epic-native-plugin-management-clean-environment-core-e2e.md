---
id: epic-native-plugin-management-clean-environment-core-e2e
kind: feature
stage: drafting
tags: [compatibility, e2e-test]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-pi-extension-manager]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
