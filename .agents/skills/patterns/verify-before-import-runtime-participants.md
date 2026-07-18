# Verify-before-import runtime participants

Executable external packages remain inert until exact installed bytes, package metadata, exports, and behavioral capabilities pass qualification.

## Rationale

A lockfile version does not prove which installed tree or export will execute. Byte-level receipts plus behavioral qualification make drift or partial capability evidence produce omission, never partial admission.

## Examples

- `src/runtime/published-package-receipt.ts:36-185` rejects unsafe paths, links, collisions, special files, and manifest/export/extension/license drift before import, then hashes canonical package-owned bytes.
- `src/runtime/mcp/pi-mcp-adapter-package.ts:11-45` probes the exact MCP receipt before dynamically importing its programmatic export.
- `src/runtime/subagents/pi-subagents-package.ts:11-73` gates both the package-declared Pi extension and service root on the verified package tree.
- `src/composition/runtime-participant-qualification.ts:86-135` requires strict capability schemas, complete semantic vectors, and compatible Node/Pi ranges after byte qualification.
- `test/runtime/published-package-provenance.test.ts:14-36` and `test/runtime/published-package-receipt.test.ts:57-99` bind receipts to lockfile SRI and exercise drift attacks.

## When to use

Use for maintained forks or third-party packages that execute inside the host, register extensions, or receive lifecycle authority.

## When not to use

Do not impose this on passive data dependencies or code already contained in the host's trusted build artifact.

## Common violations

- Importing before probing.
- Checking only name/version.
- Accepting alternate exports.
- Treating drift as a warning.
- Admitting incomplete behavioral vectors.
