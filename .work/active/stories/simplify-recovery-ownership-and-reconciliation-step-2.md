---
id: simplify-recovery-ownership-and-reconciliation-step-2
kind: story
stage: implementing
tags: [refactor, infra]
parent: simplify-recovery-ownership-and-reconciliation
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Centralize Linux Process Identity Without Collapsing Owner States

## Value

**Priority:** Medium
**Risk:** Medium
**Source lens:** missing abstraction / pattern drift

Move four duplicate Linux process-start parsers and two duplicate liveness classifiers into one neutral infrastructure module. Decouple artifact scanning from SQLite journal internals while retaining every fail-closed distinction.

## Files

- `src/infrastructure/process/process-identity.ts` (new)
- `src/infrastructure/filesystem/staging-allocator.ts`
- `src/infrastructure/recovery/sqlite-transition-journal.ts`
- `src/infrastructure/recovery/process-revision-leases.ts`
- `src/infrastructure/recovery/recovery-artifact-scanner.ts`
- `src/infrastructure/state/sqlite-scope-lock.ts`
- `test/infrastructure/process/process-identity.test.ts` (new)

## Current State

```ts
// staging allocator, transition journal, revision leases, and scope lock
const text = readFileSync(`/proc/${pid}/stat`, "utf8");
const close = text.lastIndexOf(")");
const token = text.slice(close + 2).trim().split(/\s+/)[19];

// journal and leases duplicate classification
try { process.kill(pid, 0); }
catch (error) { return error.code === "ESRCH" ? "dead" : "unknown"; }
const current = readStartToken(pid);
return current === undefined ? "unknown" : current === recorded ? "live" : "dead";

// Scanner reaches into a journal adapter for process policy.
import { classifyOwner } from "./sqlite-transition-journal.js";
```

## Target State

```ts
// src/infrastructure/process/process-identity.ts
export type ProcessIdentity = Readonly<{ pid: number; startToken: string }>;
export type ProcessIdentityStatus = "live" | "dead" | "unknown";

export function readLinuxProcessStartToken(pid: number): string | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    if (close === -1) return undefined;
    const token = stat.slice(close + 2).trim().split(/\s+/)[19];
    return token !== undefined && /^\d+$/.test(token) ? token : undefined;
  } catch {
    return undefined;
  }
}

export function classifyProcessIdentity(identity: ProcessIdentity): ProcessIdentityStatus {
  try { process.kill(identity.pid, 0); }
  catch (error) { return (error as NodeJS.ErrnoException).code === "ESRCH" ? "dead" : "unknown"; }
  const current = readLinuxProcessStartToken(identity.pid);
  if (current === undefined) return "unknown";
  return current === identity.startToken ? "live" : "dead";
}
```

Production callers import those two functions directly. The module stays internal and is not re-exported from `src/index.ts`.

## State-preservation Matrix

| Evidence | Existing result | Required result after extraction |
|---|---|---|
| Current process token unavailable during allocation/prepare/acquire/init | Caller-specific error | Same caller-specific error text/path |
| Journal row missing or not `prepared` | `released` | `released`, decided before shared classification |
| Journal owner columns malformed/missing | `unknown` | `unknown` |
| `process.kill(pid, 0)` returns ESRCH | `dead` | `dead` |
| Signal check fails for any non-ESRCH reason | `unknown` | `unknown` |
| Process token cannot be read | `unknown` | `unknown` |
| Token matches | `live` | `live` |
| Token differs (PID reuse) | `dead` | `dead` |
| Scanner sidecar malformed/missing | No deletable candidate | No deletable candidate |
| Scanner owner is `live` or `unknown` | Removal rejected | Removal rejected |

## Implementation Notes

- Use the shared token reader for staging sidecars, journal owners, revision leases, and scope-lock initialization. Preserve existing caller-specific errors when identity is missing.
- Use shared classification for journal prepared rows, lease listing, scanner scan/revalidation, and scope-lock initialization-owner checks.
- Keep SQLite's `OwnerStatus = "live" | "dead" | "unknown" | "released"`; only the first three come from the neutral utility.
- Keep scanner parse validation, opaque capability, path identity, second pre-delete liveness check, and `candidate.owner === "dead"` gate unchanged.
- Preserve scope-lock marker protocol and `startTime` field; adapt it to the neutral `{ pid, startToken }` input without changing persisted JSON.
- Remove adapter-local token/classifier functions and the scanner-to-journal import. Do not touch fixture-only process probes.
- Add a focused internal test for live, token mismatch/PID reuse, ESRCH, non-ESRCH signal failure, and missing token. Existing adapter and process integration tests remain the behavioral contract.

## Acceptance Criteria

- [ ] Production source contains one `/proc/${pid}/stat` parser, in `src/infrastructure/process/process-identity.ts`.
- [ ] Process-owner `process.kill(pid, 0)` classification is centralized there; command termination remains unrelated.
- [ ] `released` remains journal-owned and `unknown` never grants recovery or deletion authority.
- [ ] No domain or application module imports the utility, and `src/index.ts` is unchanged.
- [ ] New utility tests and existing journal, lease, scanner, scope-lock, generation-locking, recovery, and collection tests pass.
- [ ] Typecheck, boundaries, build, and the unchanged 407-export package check pass.

## Risk and Rollback

This is atomic across the new module and all callers because a partial move does not build. The main risk is accidentally collapsing `released`/`unknown`/`dead`; the matrix and focused tests are the gate. Revert the whole story commit to restore adapter-local implementations. No journal, sidecar, lease, or lock-marker shape changes.
