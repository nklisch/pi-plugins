# Owner-registered aggregate teardown

Composite owners register teardown immediately, dispose in dependency-reverse order, attempt every cleanup, and report all failures together.

## Rationale

Stopping at the first cleanup failure leaks later resources. Immediate registration and ordered aggregate disposal make startup failure, cancellation, and normal shutdown follow the same reliable path.

## Examples

- `src/composition/sequential-cleanup.ts:1-6` runs every disposer sequentially and throws one ordered `AggregateError`.
- `src/composition/create-packaged-plugin-host.ts:161-195,229-256,554-678` registers each acquired resource through `own`, then closes the stack in reverse order.
- `src/composition/create-mcp-runtime.ts:126-150` reverses MCP source state, reconciles inactive, drains leases with fresh cleanup signals, and aggregates failures.
- `src/composition/create-skill-hook-runtime.ts:157-169` aborts new work, clears delegates, disposes subagent/coordinator state, and releases the session lease while continuing through failures.
- `test/e2e/harness/environment.ts:592-620` runs reverse cleanups, checks SQLite integrity, captures bounded/redacted evidence, and aggregates teardown failures.
- `test/e2e/harness/pi-rpc.ts:120`, `pi-pty.ts:57`, `git-service.ts:134`, and `production-model-service.ts:57` register process shutdown immediately.
- `test/e2e/harness/process.ts:62,126-137` owns process groups, escalates termination, and verifies disappearance.

## When to use

Use for composite services, process harnesses, locks, runtime participants, and startup sequences with dependency-ordered resources.

## When not to use

Do not build a cleanup stack for one trivial resource already covered by local `try/finally`.

## Common violations

- Registering cleanup after a later failure point.
- FIFO teardown where dependencies require LIFO.
- Stopping after the first failure.
- Using a cancelled operation signal for mandatory cleanup.
- Killing only the direct PID.
- Deleting diagnostics before capture.
