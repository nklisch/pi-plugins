# Registry-derived control planes

Closed semantic vocabularies live in one registry from which IDs, schemas, dispatch metadata, ordering, help, diagnostics, and documentation are derived.

## Rationale

A registry prevents parser, dispatcher, schema, presentation, and documentation switches from developing different definitions of the same control surface.

## Examples

- `src/application/native-control-registry.ts:250-341` owns paths, aliases, safety, input channels, schemas, positionals, and options; `test/documentation/native-control-spec.test.ts:49-62` derives documentation tables from it.
- `src/application/native-diagnostic-registry.ts:8-65` owns public diagnostic semantics; `src/application/native-diagnostic-compiler.ts:45-92` derives compilation and deterministic ordering.
- `src/domain/compatibility-policy.ts:21-149` derives capability IDs and schemas and enforces exact registry completeness.
- `src/application/marketplace-management-contract.ts:22-125` derives public cache and rejection vocabularies from one management registry.
- `src/application/native-control-projection.ts:44-53` selects command-specific owner/projected schemas directly from the command registry.

## When to use

Use when a finite stable vocabulary has multiple consumers: parser, dispatcher, schema, projection, docs, ordering, or policy evaluation.

## When not to use

Do not force user-extensible maps or a one-consumer enum into a registry framework.

## Common violations

- Parallel enums or switches.
- Consumer-local codes absent from the registry.
- Hand-maintained documentation tables.
- Nondeterministic public ordering.
- Mutating registry contents after derived schemas initialize.
