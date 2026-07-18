---
id: epic-native-plugin-management-marketplace-discovery-adoption-source-foreign-boundaries
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Harden approved marketplace and foreign-file boundaries

## Checkpoint

Retain the existing Git/GitHub/SSH/SCP/local materializer while preventing hidden host pivots and unsafe foreign-state reads. Verify Git's effective remote URL before contact, disable HTTPS redirects, canonicalize approved absolute user-local roots, and read only fixed Claude/Codex documents through contained no-follow file descriptors with bounded, identity-stable reads.

## Files

- `src/infrastructure/git/git-source-acquirer.ts`
- `src/infrastructure/adoption/node-foreign-state-files.ts`
- `src/composition/create-adoption-service.ts`
- owning Git and foreign-file adapter tests

## Acceptance evidence

- Supported direct source forms still work; raw/unsupported protocols, HTTP redirects, and `url.*.insteadOf` host pivots fail before publication.
- Local source symlink leaves/non-directories/relative paths fail; persisted local identity is canonical and user-only.
- Foreign fixed paths cannot escape a canonical root or change identity while read; leaf symlink, non-file, oversize, invalid UTF-8, and I/O failures are isolated per document.
- Clean environments return three logical `missing` statuses without either CLI.
- Credential, remote-stderr, URL, and home-path canaries do not enter safe errors, diagnostics, or JSON.

## Ordering

Root checkpoint. Normal registration and adoption depend on it.

## Implementation notes

- Git now verifies `remote get-url --all` against the exact approved declaration before contact and forces `http.followRedirects=false` for every remote resolution/fetch. Existing HTTPS, SSH, SCP, GitHub, and local Git acquisition remains the sole network path.
- Added a Node local-source boundary that accepts only absolute real directories, rejects symlink leaves, and returns the canonical realpath for persistence.
- Foreign Claude/Codex reads now use lazily canonicalized fixed roots, logical home-relative result paths, leaf `O_NOFOLLOW`, containment checks, bounded UTF-8 reads, and pre/post descriptor identity. Symlink, escape, replacement, growth, oversize, and I/O conditions remain document-local.
- No credential, remote stderr, canonical home path, or foreign content is projected into safe failure/status results.

## Verification

- Focused Git/foreign/materialization suite: 16 passed, 0 failed.
- Host-pivot-before-contact, redirect-disable, symlink-leaf, parent escape, oversize, UTF-8, and redaction regressions are covered.
