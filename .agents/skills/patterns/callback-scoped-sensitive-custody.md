# Callback-scoped sensitive custody

Sensitive values are exposed through redacting, revocable facades whose usable lifetime is bounded by an owner-controlled callback.

## Rationale

This keeps plaintext out of durable DTOs, generic returns, diagnostics, and long-lived object graphs while permitting narrowly scoped execution.

## Examples

- `src/application/sensitive-value.ts:2-53` has no plaintext getter, redacts coercion/JSON/inspection, and allows access only through `withSensitiveValue`.
- `src/application/configuration-resolver.ts:204,236-341` and `src/application/resolved-configuration.ts:28-73` assemble callback-only resolved configuration and clear backing values in `finally`.
- `src/application/ports/mcp-launch-environment.ts:9-16` and `src/infrastructure/environment/node-mcp-launch-environment.ts:26-69` expose only requested ambient values and revoke the map after callback completion.
- `src/runtime/mcp/launch-value-provider.ts:342-365,422-483` nests authority/config/environment custody and issues one explicitly disposable launch lease.
- `src/application/hook-execution-context.ts:141-166` and `src/application/mcp-launch-context.ts:259-287` constrain resolved configuration to owner-controlled execution callbacks.

## When to use

Use for credentials, sensitive configuration, ambient environment values, authorization headers, and data with explicit lifetime requirements.

## When not to use

Do not add custody machinery to ordinary identifiers or non-sensitive immutable configuration.

## Common violations

- Raw getters.
- Returning plaintext-bearing callback results.
- Retaining facades beyond the callback.
- Serializing custody objects.
- Missing `finally` disposal.
