# Schema-owned boundary contracts

Public data contracts are strict, readonly runtime schemas; TypeScript types and boundary validation derive from those schemas.

## Rationale

This prevents runtime/type drift, rejects unknown fields, and validates requests and adapter responses rather than trusting compile-time types.

## Examples

- `src/application/adoption-contract.ts:84-94` defines strict adoption request/result schemas and inferred types; `src/application/adoption-service.ts:188,207,214-261` parses ingress and validates egress.
- `src/application/ports/lifecycle-reload.ts:34-51,165-169` owns activation observations and reload requests; `src/application/lifecycle-transition-reconciler.ts:164-167` reparses reload and observation results.
- `src/application/ports/mcp-runtime.ts:409-458,531` owns the MCP capability contract; `src/composition/runtime-participant-qualification.ts:106` validates capabilities before admission.
- `src/application/native-control-registry.ts:208,318` owns command schemas and derives the command union; `src/application/native-control-projection.ts:44-53` validates owner, projected, and JSON-round-tripped DTOs.

## When to use

Use for public APIs, persistence documents, adapter boundaries, cross-process messages, and stable application DTOs.

## When not to use

Do not schema-wrap private lexical state or capability-bearing objects whose behavior, rather than serializable shape, is the contract.

## Common violations

- Hand-written public types parallel to schemas.
- Permissive unknown-key handling.
- Trusting adapter output.
- Projecting public data before validating the owner DTO.
