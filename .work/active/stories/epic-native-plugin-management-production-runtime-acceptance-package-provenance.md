---
id: epic-native-plugin-management-production-runtime-acceptance-package-provenance
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-production-runtime-acceptance
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Rename and qualify the production package graph

## Checkpoint

Implement Unit 1 from the parent feature. Rename the still-private candidate to `@nklisch/pi-plugins`, package the published subagent extension as one candidate-owned Pi resource, and put both production adapters behind exact receipt-before-load probes. This is release-critical work, but Late-Binding keeps the story unbound until a release is explicitly cut. Do not publish, tag, release, or change version `0.0.0`.

## Files

- `package.json`, `package-lock.json`, `.dependency-cruiser.cjs`
- `src/runtime/published-package-receipt.ts`
- `src/runtime/mcp/pi-mcp-adapter-package.ts`
- `src/runtime/mcp/pi-mcp-adapter-runtime.ts`
- `src/runtime/subagents/pi-subagents-package.ts`
- `src/runtime/subagents/pi-subagents-lifecycle.ts`
- `src/composition/create-mcp-runtime.ts`
- `src/composition/create-subagent-lifecycle.ts`
- `src/pi/production-subagents-extension.ts`
- `src/pi/extension.ts`
- current package-name symbols/import probes/packed-consumer tests named in the parent unit

## Required behavior

- `package.json#name` and active self-imports/consumer paths/symbol namespaces become `@nklisch/pi-plugins`; historical `.work` prose is not rewritten.
- `private: true` and `version: 0.0.0` remain. Exact adapter versions remain production dependencies.
- `@nklisch/pi-subagents` is bundled. Candidate `pi.extensions` loads a compiled receipt-checking subagent wrapper before the compiled host extension. One top-level `pi install` is sufficient.
- The MCP default/file extension is not loaded. Only the documented `@nklisch/pi-mcp-adapter/programmatic` export is dynamically imported after its receipt passes with file discovery disabled.
- Receipt verification binds exact registry integrity/provenance plus a canonical installed-tree digest, manifest, exports/resources, license, engine, and Pi peer facts before package code runs. Drift returns safe capability absence; it does not crash unrelated startup.
- Package/fork identity remains confined to manifests and package-specific loaders/tests. Domain, application, lifecycle, state, facade, manager, and public barrels stay package-neutral.

## Published receipts

- MCP: `@nklisch/pi-mcp-adapter@2.11.0-nklisch.0`, integrity `sha512-kkMQwrNbggAhSCJCJUxVLKKiMswKjYaEbOLNSZrZlYY2teoxrtKld2+3MQpvsHDJYFypi1PPHuAS2YC/0z+7tg==`, fork commit `1c1cd71fd069bc65cc06bf49399d83ff9e3d008b`, tag object `39c0c367db35ecb125b05ad0b9b639bc6b09b97d`, upstream base `82724dccc13a49310530898f922bafff12b7f3fe`, MIT license SHA-256 `2d20dfacd9742706e564470dc77438608a1e54b0ed46959f080709389209093c`.
- Subagents: `@nklisch/pi-subagents@18.0.4-nklisch.0`, integrity `sha512-33Q8JDffXUuiT1M3XjLXCI4If9p+3AOwsUp/b5f1+B7Y5JI8Z8SVU+Dncq0umAG2IjgVYKnT9FHToFHNoZGWoQ==`, release commit `43efffb459f64e2f5f9aaee50d8ae5afa564f4f3`, annotated tag `ad55fae043abf87d4ec74a5cb0f2f8f17b1fb175`, upstream base `c76a294a777a990950da23fc06cb0caf51da7ac6`, MIT, Node `>=22`, Pi peers `>=0.75.0`, and existing conformance receipt digests.

## Acceptance evidence

- [ ] Fresh registry tarballs pass SRI and produce the committed canonical tree digests; installed/bundled trees match exactly.
- [ ] `npm pack --json` reports `@nklisch/pi-plugins`, both compiled extension entries, bundled subagent bytes, no Plugin Host source/test/substrate/mock files, and no symlinks.
- [ ] One candidate Pi installation reports both runtime capabilities available; no separate maintained-package Pi install occurs.
- [ ] Missing/version/tree/export/API drift makes only the corresponding capability unavailable before dependent activation and never executes a drift sentinel.
- [ ] MCP file/import/cache discovery remains disabled and the standalone MCP extension is absent.
- [ ] Package public export allowlists and package-neutral boundaries remain exact.
- [ ] No publish/tag/release/version promotion/release binding occurs.

## Ordering and risk

No sibling dependency. This must finish before the production harness can name or install the final candidate. Highest risk is receipt-before-execution for a transitive Pi extension; if public Pi package loading cannot preserve that order, remain honestly unavailable rather than use manual global installation or a private deep import.

## Implementation notes

- Renamed the private `0.0.0` candidate to `@nklisch/pi-plugins`, updated active self-imports and process-global namespaces, and retained exact adapter dependencies without publishing, tagging, or release binding.
- Added one canonical package-owned tree verifier and exact MCP/subagent receipts. Both package loaders resolve without evaluation, verify manifest/export/Pi-resource/license/engine/peer/SRI provenance plus installed bytes, then dynamically load only the documented boundary. Drift returns capability absence before package execution.
- Bundled `@nklisch/pi-subagents` and added the candidate-owned receipt wrapper before the host extension. MCP remains isolated through only `./programmatic` with file discovery disabled. Runtime alias status now reports the truthful `RUNTIME_ALIAS_UNAVAILABLE` limitation.
- Verified focused receipt/adapter contracts (16 tests), typecheck, boundaries, compiled exports, packed package RPC/JSON/PTY acceptance, and the one-install packed Pi 0.80.8 infrastructure lane.
