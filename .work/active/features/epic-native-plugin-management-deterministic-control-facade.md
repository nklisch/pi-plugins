---
id: epic-native-plugin-management-deterministic-control-facade
kind: feature
stage: done
tags: [compatibility]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-trusted-installation, epic-native-plugin-management-lifecycle-sync-operations, epic-native-plugin-management-update-policy-offline-startup]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Deterministic Plugin Control Facade

## Brief

Expose every native management capability through one typed, deterministic application facade and one canonical `/plugin` argument grammar. The facade covers installed and marketplace listing, registration and refresh, browse and inspect, diagnostics, install, enable, disable, update, uninstall, project-sync, and automatic-update settings. It is the only application surface consumed by both scripted slash subcommands and the interactive manager.

Requests are scope-explicit, results and progress are schema-derived and stable, and no operation discovers missing input by opening a hidden prompt. Interactive decision providers are explicit dependencies supplied by the Pi manager; non-interactive invocation returns complete usage, missing-input, or unavailable-UI results.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Joins the marketplace, inspection, trusted-install, lifecycle/sync, update-policy, startup, and status capability APIs after each behavior exists.
- Owns command grammar, tokenization/parsing, exact target selection, request normalization, application dispatch, structured progress, safe result projection, cancellation routing, help/completion metadata, and exit classification.
- Does not own persistence, source acquisition, inspection/compatibility rules, trust/configuration validation, lifecycle transactions, update policy, recovery, Pi command registration, terminal rendering, themes, or keybindings.
- The direct API and the future Pi command adapter consume the same `NativePluginControlService`; neither presentation may call the lower-level management services around it.

## Mockups

No new UI surface is owned by this feature. It inherits the parent epic's signed-off data and operation states:

- Manager: `.mockups/screens/epic-native-plugin-management-manager/option-1.html`
- Install flow: `.mockups/flows/plugin-install/index.html`
- Steps: `.mockups/flows/plugin-install/01-choose-inspect.html`, `02-configure-trust.html`, `03-activation-result.html`

The facade must supply the installed/update/browse/marketplace pages, exact detail identifiers, configuration/trust disclosure, progress, activation result, unread counts, and degraded/recovery states shown by those mocks. Rendering remains in `epic-native-plugin-management-pi-extension-manager`.

## Grounding and design decisions

- **Design dispatch**: direct-read only, as required. Grounding covered project/global rules, all foundation documents, the parent epic and signed-off mocks, packaged host/application contracts, marketplace registration/catalog/adoption, native inspection, trusted install, lifecycle/project-sync, update policy/notices/startup/status, current Pi extension command/completion/mode/error behavior, package exports, and current error/redaction contracts. No nested agent or question pass was used.
- **Canonical grammar**: grammar and envelope version 1 are additive-only. One registry owns command paths, aliases, positional arguments, options, safety class, input requirement, response schema, help, and static completion metadata. Parser, dispatcher exhaustiveness, help, completion, and public types derive from it.
- **Canonical inspect spelling**: `show` is canonical for native management; `inspect` remains a non-deprecated stable alias because the foundation specification already documents it. Aliases are metadata, not separate handlers.
- **No shell interpretation**: direct callers pass an argv array. Pi's single argument string uses a small deterministic lexer with quoting only; there is no environment, command, glob, tilde, response-file, or path expansion.
- **Current project only**: `project` always means the exact trusted project bound to the packaged host. The grammar accepts no project path, arbitrary project key, repository selector, or user-to-project fallback. `all-current` means user plus that one current project and is read-only.
- **Exact mutation selection**: human selectors (`plugin@marketplace` plus mutation scope) are resolved through one coherent native inspection snapshot. Exact snapshot/detail/candidate IDs may be supplied to make replay and stale detection explicit. Names, list positions, display versions, notice text, and “latest” never become mutation authority.
- **Install modes**: `install open|apply|recover` exposes the existing staged trusted-install workflow. Canonical `install <plugin>` is a one-invocation convenience that still performs exact inspect → open → explicit input/consent provider → activate. It has no separate fast path.
- **Lifecycle modes**: lifecycle commands support `preview`, `apply`, and one-shot `run`; the short form uses `run`. Destructive or executable changes require an explicit confirmation policy. No TTY or decision provider means `input-required`, not an implicit default.
- **Secret policy**: no configuration value—sensitive or not—is accepted as an argv option because sensitivity is candidate-revision-specific. Values enter only an out-of-band input port. Secret values are wrapped in `SensitiveValue` immediately and never enter command ASTs, progress, sessions, help, completion, envelopes, errors, history, or output.
- **Headless channels**: bounded JSON from standard input or an owner-only no-follow file may carry sensitive values. Environment input is permitted only for non-sensitive values and safe expected identifiers; secret-valued environment variables are rejected. The Pi adapter supplies a UI decision/input port instead of consuming process standard input.
- **Progress and delivery**: each execution has an independent monotonically increasing sequence. The facade awaits one sink write at a time, so backpressure is bounded to one frame. Sink failure stops further delivery and aborts preparation, but the underlying operation is awaited so committed/rolled-back/recovery evidence outranks output failure.
- **Cancellation**: caller abort, timeout, SIGINT, explicit operation cancel, and host quiescence converge on one operation signal. The facade does not reinterpret an honest committed, partial, rollback, or recovery result as cancelled.
- **Polling**: the facade adds no operation database or token wrapper. It recognizes existing trusted-install and lifecycle token prefixes, validates with their schemas, and routes `operation status|cancel` to the owning service. Tokens expire with the existing host-epoch session policy.
- **Readiness**: help, grammar, completion, host status, operation status/cancel, and local diagnostic reads remain available while degraded. New mutations are rejected when local readiness is blocked. Offline stale catalog/update evidence is returned as data plus warnings; only a command that actually requires unavailable acquisition fails unavailable.
- **Output contract**: machine output is a strict JSON-safe envelope; human output is a derived list of control-safe fields, never arbitrary `JSON.stringify`, native error text, callback text, or stack/cause. Existing safe DTOs are revalidated, and source/path-bearing data receives a command-specific disclosure projection.
- **Exit behavior**: semantic classification is authoritative; numeric exit values are stable conveniences for headless adapters. JSON and human formats receive the same classification. Help is success; usage, missing input, stale/conflict, unavailable, rejected, recovery/partial, cancellation, internal failure, and delivery failure remain distinct.
- **Deprecation**: version 1 has no deprecated option. The registry supports `deprecatedSince`, `replacement`, and `removeInMajor`; accepted deprecated syntax emits a stable warning. Unknown syntax never falls through to a similarly named option, and removals happen only at a grammar major.
- **Packaged boundary**: `PackagedPluginHostApplication` exposes `control` as its management surface. Marketplace/inspection/trusted-install/lifecycle/update/status services remain private composition dependencies; their root-library contracts may stay exported for non-packaged consumers.

## Architectural choice

### Option A — Pi command handler as the facade

Parse the command string and join application services directly in `src/pi/`. This is short initially, but it makes direct tests depend on Pi, couples headless behavior to UI availability, duplicates selection and error mapping in the later manager, and violates the application boundary.

### Option B — generic command framework with plugins and middleware

Build a reusable CLI framework with routers, middleware, prompt abstractions, persistence, and arbitrary transports. It would cover the requirements but creates a second framework beside Pi and the existing application workflow sessions. Most generality would be unused and would obscure exact safety behavior.

### Option C — schema-derived application control registry plus thin adapters (chosen)

Define one bounded command registry and `NativePluginControlService` in application code. The service accepts typed argv/text/command inputs, explicit input/progress ports, and existing application services. It projects strict envelopes and human-safe fields. A small Node input/output adapter proves headless behavior; the later Pi extension only tokenizes its argument string, supplies a UI input port when available, and renders returned fields. This keeps business authority in existing services, gives direct tests a stable seam, and removes privileged packaged-service joins.

## Trickiest unit first

The highest-risk unit is commit-aware progress/output cancellation across staged install and lifecycle operations. A naïve stream callback can block an operation forever, build an unbounded queue, throw after state committed, or report `cancelled`/`EPIPE` while the underlying lifecycle is active or recovery-required.

The design uses one `NativeControlExecution` with a dedicated abort controller, one awaited `NativeControlFrameSink`, and a monotonic frame sequencer. The adapter forwards underlying progress synchronously through that sequencer. On sink close/failure it records one delivery outcome, stops writing, aborts the preparation signal, and still awaits the admitted application call. The returned `NativeControlExecutionReport` retains the honest semantic envelope and separately classifies delivery. The headless adapter exits `74` only when the semantic envelope could not be delivered; direct callers still receive the report. No progress frame is activation evidence, no frame queue survives the execution, and host disposal drains admitted possibly-committed work before closing dependencies.

If this proves incompatible with an application callback that cannot tolerate awaited observers, the fallback is a fixed one-frame coalescing slot for replaceable informational progress only; terminal and phase-transition frames remain awaited. An unbounded event bus, detached writer, or result override is not an acceptable fallback.

## Canonical grammar v1

Global options may appear before the first subcommand only: `--grammar-version plugin-control/v1`, `--output json|human`, `--timeout-ms <1..86400000>`, `--non-interactive`, and one of `--input-stdin`, `--input-file <path>`, or `--input-env-prefix <ASCII_PREFIX>`. `--` ends option parsing. Command-local options do not float across subcommand boundaries.

| Canonical path | Stable aliases | Required/important arguments | Dispatch |
|---|---|---|---|
| _(no args)_ | — | none | return manager-presentation intent; headless returns help + `input-required` |
| `help [path...]` | — | optional command path | pure registry help |
| `grammar` | — | optional `--version` | pure version/schema/capability metadata |
| `marketplace add <source>` | — | `--source-kind github\|git\|local-git`, `--scope user\|project`, optional `--ref` | `marketplace.registration.add` |
| `marketplace remove <registration-id>` | — | `--scope user\|project --yes` | `marketplace.registration.remove` |
| `marketplace list` | — | `--scope user\|project\|all-current`, `--limit` | `marketplace.registration.list` |
| `marketplace refresh [registration-id...]` | `marketplace update` | `--scope`, explicit trigger | `marketplace.refresh.refresh` |
| `marketplace adopt preview` | `adopt preview` | `--scope` comparison | `marketplace.adoption.preview` |
| `marketplace adopt import <candidate-id...>` | `adopt import` | mutation `--scope --yes` | `marketplace.adoption.import` |
| `browse [query]` | — | `--scope`, repeatable `--marketplace-id`, `--availability`, opaque `--cursor`, `--limit` | `marketplace.catalog.search` |
| `list` | — | installed only; `--scope`, `--query`, `--condition`, opaque `--cursor`, `--limit` | `inspection.list` |
| `show <plugin-key>` | `inspect` | scope plus optional exact `--snapshot-id --detail-id` pair | `inspection.list/detail` |
| `diagnose [plugin-key]` | — | host when absent; exact target when supplied; optional `--include-adoption` | `inspection.diagnose` |
| `install open <plugin-key>` | — | scope/exact selectors | `trustedInstallation.open` |
| `install apply <install-token>` | — | out-of-band input and exact consent | `trustedInstallation.activate` |
| `install recover <install-token>` | — | out-of-band recovery input | `trustedInstallation.recover` |
| `install <plugin-key>` | `install run` | scope, exact optional selector, explicit input/decision port | inspect + `trustedInstallation.run` |
| `enable <plugin-key>` | — | scope, optional exact selector, `--yes`; `--preview-only` | `operations.preview/apply` |
| `disable <plugin-key>` | — | scope, optional exact selector, `--yes`; `--preview-only` | `operations.preview/apply` |
| `update <plugin-key>` | — | scope, exact optional installed/candidate selectors, out-of-band input/consent; `--preview-only` | `operations.preview/apply` |
| `uninstall <plugin-key>` | — | scope, `--yes`, explicit `--keep-data` or `--delete-data`; `--preview-only` | `operations.preview/apply` |
| `project sync` | `project-sync` | `--mode apply-intent\|publish-intent\|merge`, optional `--preview-only`; resolutions out-of-band | current project + `operations.preview/apply` |
| `updates status` | — | `--scope`, optional `--plugin` | `updates.status` |
| `updates policy preview` | — | one exact application/cadence change | `updates.previewPolicy` |
| `updates policy apply` | — | repeat exact change, `--preview-id`, optional exact `--consent-id` | `updates.applyPolicy` |
| `updates policy set` | — | atomic only for manual/inherit/cadence; automatic returns exact preview requiring apply | preview/apply |
| `updates notices list` | — | `--scope`, `--plugin`, opaque `--after`, `--limit` | `updates.notifications` |
| `updates notices acknowledge <notice-id...>` | `updates notices ack` | at least one exact ID | `updates.acknowledge` |
| `updates automatic run` | — | optional exact notice IDs, `--limit`, admitted reload context | `updates.runAutomatic` |
| `status` | — | no mutation | `HostStatusService.snapshot` plus update counts when requested |
| `operation status <token>` | — | trusted-install or lifecycle token | owning service `status` |
| `operation cancel <token>` | — | trusted-install or lifecycle token | owning service `cancel` |

Source parsing is syntactic only: `github` maps to `{kind:"github", repository, ref?}`, `git` to `{kind:"git", url, ref?}`, and `local-git` to `{kind:"local-git", path, ref?}` before the existing strict `MarketplaceSourceSchema` validates protocol, credentials, revisions, and hostile Unicode. The grammar does not duplicate source policy.

## Implementation units

### Unit 1: Schema-derived command registry, envelopes, exits, and operation handles

**Story**: `epic-native-plugin-management-deterministic-control-facade-contracts-registry`

**Files**:
- `src/application/native-control-registry.ts`
- `src/application/native-control-contract.ts`
- `src/index.ts`
- `test/application/native-control-registry.test.ts`
- `test/application/native-control-contract.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

```typescript
export const NativeControlGrammarVersionSchema = z.literal("plugin-control/v1");
export const NativeControlEnvelopeVersionSchema = z.literal(1);
export const NativeControlExecutionIdSchema = z.string()
  .regex(/^native-control-execution-v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  .brand<"NativeControlExecutionId">();

export const NativeControlExitRegistry = Object.freeze({
  success: { classification: "success", code: 0 },
  usage: { classification: "usage", code: 2 },
  inputRequired: { classification: "input-required", code: 3 },
  notFound: { classification: "not-found", code: 4 },
  conflict: { classification: "conflict-or-stale", code: 5 },
  unavailable: { classification: "unavailable", code: 6 },
  rejected: { classification: "rejected-or-blocked", code: 7 },
  incomplete: { classification: "partial-or-recovery-required", code: 8 },
  cancelled: { classification: "cancelled-or-timeout", code: 9 },
  internal: { classification: "internal", code: 10 },
  delivery: { classification: "output-delivery-failed", code: 74 },
} as const);

export const NativeControlDiagnosticSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/),
  severity: z.enum(["info", "warning", "error"]),
  field: z.string().regex(/^[a-z][a-zA-Z0-9.\[\]-]*$/).optional(),
  action: z.enum(["retry", "reparse", "provide-input", "confirm-exact",
    "refresh", "reinspect", "poll", "run-recovery", "none"]),
  safe: SafeDisplayFieldSchema.optional(),
}).strict().readonly();

export const NativeControlOperationHandleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("trusted-install"), token: TrustedInstallSessionTokenSchema }).strict().readonly(),
  z.object({ kind: z.literal("lifecycle"), token: NativeLifecycleOperationTokenSchema }).strict().readonly(),
]);

export const NativeControlEnvelopeSchema = z.object({
  schemaVersion: NativeControlEnvelopeVersionSchema,
  grammarVersion: NativeControlGrammarVersionSchema,
  executionId: NativeControlExecutionIdSchema,
  command: z.object({ id: NativeControlCommandIdSchema,
    path: z.array(z.string()).readonly() }).strict().readonly(),
  status: z.enum(["ok", "no-change", "input-required", "not-found", "stale",
    "conflict", "unavailable", "rejected", "partial", "recovery-required",
    "cancelled", "failed", "presentation-required"]),
  exit: NativeControlExitSchema,
  data: JsonValueSchema.optional(),
  operation: NativeControlOperationHandleSchema.optional(),
  page: z.object({ next: z.string().max(4096).optional() }).strict().readonly().optional(),
  diagnostics: z.array(NativeControlDiagnosticSchema).readonly(),
  human: z.array(SafeDisplayFieldSchema).readonly(),
}).strict().readonly().superRefine(validateNativeControlEnvelopeAgainstRegistry);

export const NativeControlCommandRegistry = defineNativeControlCommands({
  "marketplace.add": { path: ["marketplace", "add"], request: MarketplaceAddControlSchema,
    response: MarketplaceAddResultSchema, safety: "mutation", input: "confirmation" },
  "inspection.list": { path: ["list"], request: InstalledListControlSchema,
    response: NativeInspectionPageSchema, safety: "local-read", input: "none" },
  // Every row in Canonical grammar v1 appears exactly once here.
} as const);

export type NativeControlCommandId = keyof typeof NativeControlCommandRegistry;
export type NativeControlCommand = {
  [K in NativeControlCommandId]: Readonly<{ command: K; request:
    z.infer<(typeof NativeControlCommandRegistry)[K]["request"]> }>
}[NativeControlCommandId];
```

`defineNativeControlCommands` validates unique canonical paths/aliases, option ownership, positional arity, response schemas, deprecation windows, and one dispatcher safety/input classification. Command descriptions and safe labels are bounded `SafeDisplayField` constants. `NativeControlCommandSchema`, command ID schema, handler map type, help, and completion metadata derive from the registry rather than maintaining another union.

**Acceptance criteria**:
- [ ] Every grammar row has one unique ID/path, request/response schema, safety class, input class, and exit mapping; an omitted/extra dispatcher key fails typecheck or registry construction.
- [ ] Strict schemas reject unknown fields, impossible status/exit/operation/page combinations, non-JSON data, arbitrary messages, oversized identifiers, and native causes/stacks.
- [ ] Exit codes and classifications are unique, within `0..125`, and tested as a versioned compatibility contract.
- [ ] Existing install/lifecycle tokens are validated by their owner schemas; no control token or durable session authority is added.
- [ ] Root exports expose only schemas, types, registry metadata, and service/factory contracts—not handler dependencies, source roots, secrets, sinks, or mutable registries.

### Unit 2: Deterministic text lexer, argv parser, help, and completion metadata

**Story**: `epic-native-plugin-management-deterministic-control-facade-lexer-parser-metadata`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-contracts-registry`

**Files**:
- `src/application/native-control-lexer.ts`
- `src/application/native-control-parser.ts`
- `src/application/native-control-help.ts`
- `test/application/native-control-lexer.test.ts`
- `test/application/native-control-parser.test.ts`
- `test/application/native-control-help.test.ts`

```typescript
export const NativeControlArgvSchema = z.array(z.string().max(8192))
  .max(512).readonly();
export const NativeControlParseResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("parsed"), command: NativeControlCommandSchema,
    warnings: z.array(NativeControlDiagnosticSchema).readonly() }).strict().readonly(),
  z.object({ kind: z.literal("help"), help: NativeControlHelpSchema }).strict().readonly(),
  z.object({ kind: z.literal("incomplete"), expected: z.array(NativeControlExpectationSchema).readonly(),
    diagnostics: z.array(NativeControlDiagnosticSchema).nonempty().readonly() }).strict().readonly(),
  z.object({ kind: z.literal("invalid"), diagnostics:
    z.array(NativeControlDiagnosticSchema).nonempty().readonly() }).strict().readonly(),
]);

export interface NativeControlParser {
  parseArgv(argv: readonly string[]): NativeControlParseResult;
  parseText(text: string, mode: "execute" | "complete"): NativeControlParseResult;
  help(path?: readonly string[]): NativeControlHelp;
  complete(input: NativeControlCompletionRequest): NativeControlCompletionResult;
}
```

Text lexing treats only ASCII space/tab as separators. Single quotes are literal until the next single quote; double quotes permit only escaped quote and backslash; outside quotes, backslash may escape ASCII space/tab, quote, or backslash. There is no newline, control, environment, command, glob, tilde, Unicode normalization, locale folding, or response-file expansion. Execution rejects unterminated quotes/escapes; completion reports the partial token and expected categories without guessing.

Options use exact long names, support `--name value` and registry-authorized `--name=value`, and never abbreviate. Duplicate singleton options, conflicting channels/scopes/data-retention choices, option-after-positional violations, missing values, extra positionals, and unknown commands/options are errors. Repeatable options retain input order only until request normalization sorts/deduplicates schema-defined sets. `--` is accepted only for commands whose registry explicitly permits remaining positional text.

Completion is pure and offline. It returns static command/option/enum metadata plus caller-supplied safe dynamic candidates; it never reads services, source URLs, paths, environment, input channels, consent IDs, session tokens, or secrets. Help and completion expose canonical names first, alias/deprecation metadata, exact option ownership, defaults, safety/input class, and grammar version.

**Acceptance criteria**:
- [ ] Equivalent argv and quoted text produce byte-equivalent typed commands; token/source permutations that are not semantically equivalent remain distinct.
- [ ] NUL, C0/C1 controls, bidi overrides/isolates, lone surrogates, invalid escapes, newline injection, oversized tokens/argv, unterminated quotes, and hostile Unicode option lookalikes fail with stable offset-free safe diagnostics.
- [ ] Unknown and deprecated syntax follows registry metadata; unknown options never fuzzy-execute, while suggestions are bounded help only.
- [ ] No parser failure calls an application service, input port, clock, identifier, filesystem, environment, output sink, or logger.
- [ ] Help/completion ordering is unsigned UTF-8 over canonical registry order and is identical across locale, object insertion order, TTY presence, and process restart.

### Unit 3: Out-of-band input custody, confirmation policy, and redaction boundary

**Story**: `epic-native-plugin-management-deterministic-control-facade-input-redaction`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-contracts-registry`

**Files**:
- `src/application/ports/native-control-input.ts`
- `src/application/native-control-input.ts`
- `src/application/native-control-redaction.ts`
- `src/infrastructure/control/node-control-input.ts`
- `test/application/native-control-input.test.ts`
- `test/application/native-control-redaction.test.ts`
- `test/infrastructure/control/node-control-input.test.ts`

```typescript
export const NativeControlInputChannelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict().readonly(),
  z.object({ kind: z.literal("provided") }).strict().readonly(),
  z.object({ kind: z.literal("stdin-json") }).strict().readonly(),
  z.object({ kind: z.literal("file-json"), locator: z.string().min(1).max(4096) }).strict().readonly(),
  z.object({ kind: z.literal("environment"), prefix: z.string()
    .regex(/^[A-Z][A-Z0-9_]{0,63}$/) }).strict().readonly(),
]);

export type NativeControlInputRequest = Readonly<{
  executionId: NativeControlExecutionId;
  purpose: "trusted-install" | "trusted-install-recovery" | "update" |
    "uninstall" | "project-sync-resolution" | "policy-consent";
  channel: NativeControlInputChannel;
  fields: readonly TrustedInstallConfigurationField[];
  consent?: TrustedInstallConsentDisclosure;
  expected: Readonly<{ plugin?: PluginKey; scope?: ScopeReference;
    immutableRevision?: ContentDigest; executableSurfaceDigest?: ContentDigest }>;
}>;

export type NativeControlInputResult =
  | Readonly<{ kind: "supplied"; nonSensitive: readonly Readonly<{ key: ConfigurationKey; value: unknown }>[];
      sensitive: readonly Readonly<{ key: ConfigurationKey; value: SensitiveValue }>[];
      decision: NativeControlExactDecision }>
  | Readonly<{ kind: "cancelled" }>
  | Readonly<{ kind: "unavailable"; code: "NO_INPUT_CHANNEL" | "NO_TTY" |
      "SECRET_PROMPT_UNAVAILABLE" | "CHANNEL_UNSUPPORTED" }>
  | Readonly<{ kind: "invalid"; issues: readonly NativeControlInputIssue[] }>;

export interface NativeControlInputPort {
  collect(request: NativeControlInputRequest, signal: AbortSignal): Promise<NativeControlInputResult>;
}
```

The Node adapter accepts one bounded strict UTF-8 JSON document. Sensitive values are allowed only from standard input or an owner-only (`0600`, current uid where available), regular, no-follow file; environment channels reject any field marked sensitive. The envelope must pin plugin and scope and, for automatic trust/updates, the disclosed immutable revision and executable-surface digest or exact consent ID. Raw bytes and parsed sensitive strings are kept callback-local, wrapped in `SensitiveValue`, and cleared on a best-effort basis; they are never attached to errors. Standard input is single-consumer and cannot also be an output stream. File path and environment prefix are invocation-local and omitted from envelopes/help/completion.

`--yes` is accepted only for the exact same-invocation enable/disable, marketplace remove/adopt, and uninstall retention decision. It cannot grant plugin trust, authorize automatic update breadth, select merge conflict resolutions, or delete persistent data without the separate `--delete-data` choice. Install/update/policy automatic consent must echo exact disclosed evidence through the input port or two-step apply request.

**Acceptance criteria**:
- [ ] Parser ASTs and every JSON-safe schema structurally reject `SensitiveValue`, configured values, input documents, secret locators, environment values, and callback/provider messages.
- [ ] No TTY/provider/channel, unavailable secret custody, absent exact confirmation, partial input, sensitivity mismatch, duplicate/unknown key, and stale consent return complete deterministic input issues before the next effect.
- [ ] stdin/file/env adapters enforce the declared policy, bounds, UTF-8, ownership/no-follow behavior, one-consumer semantics, abort, and no stdout/history/log echo.
- [ ] Control/bidi text, secret canaries, path canaries, bearer/header/query values, native causes, and attempted values survive no envelope/progress/human/error serialization path.
- [ ] The input port remains an adapter: existing trusted-install/lifecycle validation and `SensitiveValue` custody remain the only business/configuration authority.

### Unit 4: Exact selector resolution and read-only command dispatch

**Story**: `epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-contracts-registry`, `epic-native-plugin-management-deterministic-control-facade-lexer-parser-metadata`

**Files**:
- `src/application/native-control-selection.ts`
- `src/application/native-control-read-dispatch.ts`
- `src/application/native-control-projection.ts`
- `test/application/native-control-selection.test.ts`
- `test/application/native-control-read-dispatch.test.ts`
- `test/application/native-control-projection.test.ts`

```typescript
export const NativeControlScopeSchema = z.enum(["user", "project", "all-current"]);
export const NativeControlPluginSelectorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("identity"), plugin: PluginKeySchema,
    scope: z.enum(["user", "project"]) }).strict().readonly(),
  z.object({ kind: z.literal("exact"), plugin: PluginKeySchema,
    snapshotId: InspectionSnapshotIdSchema, detailId: InspectionDetailIdSchema }).strict().readonly(),
]);

export interface NativeControlSelectionService {
  installed(selector: NativeControlPluginSelector, signal: AbortSignal):
    Promise<NativeControlInstalledSelectionResult>;
  candidate(selector: NativeControlCandidateSelector, signal: AbortSignal):
    Promise<NativeControlCandidateSelectionResult>;
  update(selector: NativeControlUpdateSelector, signal: AbortSignal):
    Promise<NativeControlUpdateSelectionResult>;
  currentProject(signal: AbortSignal): Promise<NativeControlCurrentProjectResult>;
}
```

Identity selection performs one native inspection list, matches exact plugin/scope/subject, and then calls detail with the returned snapshot/detail IDs. Zero, duplicate, stale, unavailable, or wrong-subject matches are explicit. Exact selection validates the supplied IDs and plugin equality. Update selects one installed subject and one candidate in one coherent inspection snapshot; changed available evidence returns stale rather than falling back to another candidate. The service does not inspect manifests, resolve sources, assess compatibility/trust, or mutate.

Read dispatch covers grammar/help, marketplace list/browse/detail, installed list/show, diagnose, update status/notices, host status, and operation status. It passes opaque cursors/tokens unchanged after schema validation, preserves owner-service stale/invalid distinctions, and projects each public DTO through a command-specific response schema. Registration local paths and source URLs use explicit machine/human disclosure rules rather than generic object serialization.

**Acceptance criteria**:
- [ ] Same plugin in user/project, duplicate registration/candidate, wrong subject, changed snapshot, forged cursor/detail ID, stale notice cursor, and missing current project produce exact not-found/stale/ambiguous outcomes with no fallback.
- [ ] List/search/diagnostic ordering and page cursors remain owner-service authority; the facade neither resorts page members nor fabricates cursors.
- [ ] Offline stale observations return successful data with warnings; corrupt/unavailable enclosing authority maps distinctly and unrelated registrations/plugins remain visible.
- [ ] Read commands perform no lifecycle, trust/configuration write, refresh unless explicitly requested, scheduler start, notification acknowledgment, source acquisition, hidden retry, or prompt.
- [ ] Every projected response reparses through its registry response schema and passes safe-human/machine redaction canaries.

### Unit 5: Commit-aware progress, timeout/cancellation, operation polling, and admission

**Story**: `epic-native-plugin-management-deterministic-control-facade-operation-progress-admission`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-contracts-registry`, `epic-native-plugin-management-deterministic-control-facade-input-redaction`

**Files**:
- `src/application/ports/native-control-execution.ts`
- `src/application/native-control-progress.ts`
- `src/application/native-control-operation.ts`
- `src/application/native-control-execution.ts`
- `test/application/native-control-progress.test.ts`
- `test/application/native-control-operation.test.ts`
- `test/application/native-control-execution.test.ts`

```typescript
export const NativeControlFrameSchema = z.discriminatedUnion("type", [
  z.object({ schemaVersion: z.literal(1), type: z.literal("accepted"),
    executionId: NativeControlExecutionIdSchema, sequence: z.literal(0),
    command: NativeControlCommandIdSchema }).strict().readonly(),
  z.object({ schemaVersion: z.literal(1), type: z.literal("progress"),
    executionId: NativeControlExecutionIdSchema, sequence: z.number().int().positive(),
    phase: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
    state: z.enum(["started", "completed", "skipped", "retained", "failed"]),
    code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/).optional(),
    operationSequence: z.number().int().nonnegative().optional(),
    safe: z.array(SafeDisplayFieldSchema).readonly() }).strict().readonly(),
  z.object({ schemaVersion: z.literal(1), type: z.literal("result"),
    executionId: NativeControlExecutionIdSchema, sequence: z.number().int().positive(),
    result: NativeControlEnvelopeSchema }).strict().readonly(),
]);

export interface NativeControlFrameSink {
  write(frame: NativeControlFrame, signal: AbortSignal): Promise<void>;
  close(): Promise<void>;
}
export interface NativeControlExecutionIdPort { issue(signal: AbortSignal): Promise<NativeControlExecutionId>; }
export interface NativeControlTimeoutPort {
  arm(timeoutMs: number, parent: AbortSignal): Readonly<{ signal: AbortSignal; dispose(): void }>;
}
export type NativeControlExecutionReport = Readonly<{
  envelope: NativeControlEnvelope;
  delivery: "complete" | "closed" | "failed";
  deliveredThrough: number;
}>;
```

The execution wrapper issues one ID, writes `accepted`, and serializes all later writes through a promise chain with no unbounded queue. Underlying install/lifecycle progress sequence/phase is validated before mapping; service progress is not reordered or synthesized into success. Read commands may emit only accepted/result. Timeout uses an injected port, is bounded by the parser, and is disposed on every path.

`operation status|cancel` parses token prefixes only to select the owner, then owner schemas validate the complete token. Status returns safe retained owner state/result and polling guidance; cancel delegates once. SIGINT belongs to a future adapter and aborts the invocation controller. A second SIGINT may terminate the process, but it cannot alter the already returned semantic envelope.

**Acceptance criteria**:
- [ ] Per-execution frame sequences start at zero and strictly increase; concurrent commands may interleave across sinks but never share IDs, counters, controllers, or result frames.
- [ ] Slow sinks apply bounded backpressure; sink throw/EPIPE/close creates no unhandled rejection, duplicate frame, progress buffer, or semantic result rewrite.
- [ ] Caller abort, timeout, SIGINT-shaped abort, operation cancel, callback failure, and host quiescence propagate one signal and preserve owner precedence after possible commit.
- [ ] Poll/cancel handles stale/expired/disposed/forged/wrong-owner tokens without a local registry, source lookup, or latest-session fallback.
- [ ] Quiesce rejects new executions, allows admitted possibly-committed work to settle, and close is idempotent and drains sinks/controllers before dependencies close.

### Unit 6: Mutation workflow dispatch without duplicated business logic

**Story**: `epic-native-plugin-management-deterministic-control-facade-mutation-workflow-dispatch`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-input-redaction`, `epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch`, `epic-native-plugin-management-deterministic-control-facade-operation-progress-admission`

**Files**:
- `src/application/ports/native-control-applications.ts`
- `src/application/native-control-mutation-dispatch.ts`
- `src/application/native-control-install.ts`
- `src/application/native-control-lifecycle.ts`
- `src/application/native-control-update-policy.ts`
- `test/application/native-control-mutation-dispatch.test.ts`
- `test/application/native-control-install.test.ts`
- `test/application/native-control-lifecycle.test.ts`
- `test/application/native-control-update-policy.test.ts`

```typescript
export interface NativeControlMarketplacePort {
  readonly registration: Pick<MarketplaceRegistrationService, "add" | "remove" | "list">;
  readonly refresh: Pick<MarketplaceRefreshService, "refresh">;
  readonly catalog: Pick<MarketplaceCatalogService, "search" | "detail">;
  readonly adoption: Pick<AdoptionService, "preview" | "import">;
}

export type NativeControlApplicationDependencies = Readonly<{
  marketplace: NativeControlMarketplacePort;
  inspection: NativeInspectionService;
  trustedInstallation: TrustedInstallationService;
  operations: NativeLifecycleOperationService;
  updates: NativeUpdateManagementService;
  status: HostStatusService;
  currentProject: NativeControlCurrentProjectPort;
}>;

export type NativeControlDispatchContext = Readonly<{
  executionId: NativeControlExecutionId;
  input: NativeControlInputPort;
  progress: NativeControlProgressSink;
  confirmation: NativeControlConfirmationPolicy;
  readiness: HostStatusSnapshot;
}>;

export interface NativeControlDispatcher {
  dispatch(command: NativeControlCommand, context: NativeControlDispatchContext,
    signal: AbortSignal): Promise<NativeControlDispatchResult>;
}
```

The exhaustive handler map performs only request assembly and result projection:

- marketplace add/remove/refresh/adoption call existing registration/refresh/adoption services once;
- install short form resolves exact candidate inspection evidence, invokes `trustedInstallation.run`, and supplies one explicit input decision provider;
- install staged forms forward open/activate/recover/status/cancel exactly;
- lifecycle short forms resolve exact installed/update evidence, call `operations.preview`, return previews when requested or input is unavailable, construct the exact owner confirmation, then call `operations.apply` once;
- project sync obtains only the exact current project key, forwards preview/resolutions, and never adds install/refresh/trust/configuration behavior;
- policy set always previews; manual/inherit/cadence may apply atomically against that exact preview, while automatic returns its exact preview unless an exact consent is supplied;
- notices/automatic dispatch only through `application.updates`.

The facade never calls `run()` when doing so would hide a preview or missing input. It never catches an owner result and retries against fresh evidence. Existing service schemas, candidate leases, trust/configuration custody, lifecycle/recovery, update policy, and project sync remain authoritative.

**Acceptance criteria**:
- [ ] Every grammar mutation dispatches to the intended existing service path exactly once; spies prove no direct state/store/materializer/trust/configuration/recovery/runtime access.
- [ ] Parse/selection/readiness/input/confirmation failures perform zero mutation; blocked readiness still permits status/diagnose/cancel and reports the exact blocker.
- [ ] Staged and one-shot install produce equivalent owner requests/results/progress for equivalent evidence and never materialize twice.
- [ ] Enable/disable/update/uninstall/project-sync preserve exact preview/version/consent/authority/resolution/retention evidence and owner current/stale/conflict/rollback/recovery/partial effects.
- [ ] Concurrent commands rely on existing sessions, keyed scheduler, scope lock, state/file CAS, and reload admission; the facade adds no global lock, retry, transaction, or success inference.

### Unit 7: Stable result projection, human fields, JSON lines, and exit classification

**Story**: `epic-native-plugin-management-deterministic-control-facade-result-output-exit`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-contracts-registry`, `epic-native-plugin-management-deterministic-control-facade-operation-progress-admission`, `epic-native-plugin-management-deterministic-control-facade-mutation-workflow-dispatch`

**Files**:
- `src/application/native-control-result.ts`
- `src/application/native-control-human.ts`
- `src/application/native-control-error.ts`
- `src/infrastructure/control/node-json-lines-sink.ts`
- `test/application/native-control-result.test.ts`
- `test/application/native-control-human.test.ts`
- `test/application/native-control-error.test.ts`
- `test/infrastructure/control/node-json-lines-sink.test.ts`

```typescript
export interface NativeControlResultProjector {
  project<K extends NativeControlCommandId>(
    command: Extract<NativeControlCommand, { command: K }>,
    result: z.infer<(typeof NativeControlCommandRegistry)[K]["response"]>,
    executionId: NativeControlExecutionId,
  ): NativeControlEnvelope;
  classifyError(command: NativeControlCommand | undefined, error: unknown,
    executionId: NativeControlExecutionId): NativeControlEnvelope;
}

export interface NativeControlHumanProjector {
  render(envelope: NativeControlEnvelope): readonly SafeDisplayField[];
}
```

Classification is an exhaustive registry-owned mapping of owner result kinds/codes. `succeeded`, unchanged/current-state, and successful reads are exit 0; help is 0; input/consent/needs-action is 3; missing is 4; stale/conflict is 5; offline/unavailable is 6; rejected/blocked is 7; partial/ambiguous/recovery-required/rolled-back is 8; caller cancellation/timeout before stronger evidence is 9; unexpected contract/adapter failure is 10. Delivery failure is recorded separately as 74 by the headless adapter only when it cannot deliver the semantic envelope.

Known `DomainContractError`, `BoundaryError`, `NativeInspectionError`, `MarketplaceCatalogError`, `PackagedPluginHostError`, Zod boundary failures, abort errors, and owner result unions map to stable codes without native messages. Unknown errors become `CONTROL_INTERNAL` with no cause/message/stack. Human fields use safe labels/identities/counts/actions from the command registry and projected DTO; arbitrary source strings, paths, commands, URLs, error messages, or JSON dumps are never rendered.

The JSON-lines sink writes one canonical JSON frame plus newline, handles partial writes, respects backpressure/drain, and treats `EPIPE`/closed stdout as delivery closed. It never closes process stdout itself and never writes diagnostics to stderr automatically.

**Acceptance criteria**:
- [ ] Every owner result and known error class has one stable envelope/exit mapping; compile-time and runtime exhaustiveness fail when an upstream variant grows.
- [ ] Human and JSON modes differ only in projection, not dispatch, status, exit, ordering, pagination, or cancellation behavior.
- [ ] Canonical JSON is byte-identical across map/object insertion order and contains no `undefined`, bigint, non-finite number, class instance, cause, stack, or unbounded field.
- [ ] Broken/slow/partial stdout, EPIPE before accepted, EPIPE during progress, EPIPE after commit, and sink close during result preserve direct report truth and leave no hanging drain listener.
- [ ] Hostile display/control/bidi/ANSI/OSC text is escaped/truncated exactly once; machine identities remain exact schema values and human fields cannot become selection authority.

### Unit 8: Unified service, packaged composition, public boundary, and disposal

**Story**: `epic-native-plugin-management-deterministic-control-facade-packaged-composition`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch`, `epic-native-plugin-management-deterministic-control-facade-mutation-workflow-dispatch`, `epic-native-plugin-management-deterministic-control-facade-result-output-exit`

**Files**:
- `src/application/native-control-service.ts`
- `src/composition/create-native-control-service.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/infrastructure/node/node-identifiers.ts`
- `src/index.ts`
- `src/pi/index.ts`
- `test/application/native-control-service.test.ts`
- `test/composition/create-native-control-service.test.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/integration/packaged-host-disposal.test.ts`
- `test/tooling/boundaries.test.ts`

```typescript
export interface NativePluginControlService {
  readonly grammarVersion: "plugin-control/v1";
  parseArgv(argv: readonly string[]): NativeControlParseResult;
  parseText(text: string, mode?: "execute" | "complete"): NativeControlParseResult;
  help(path?: readonly string[]): NativeControlHelp;
  complete(request: NativeControlCompletionRequest): NativeControlCompletionResult;
  execute(command: NativeControlCommand, options: NativeControlExecutionOptions,
    signal: AbortSignal): Promise<NativeControlExecutionReport>;
  runArgv(argv: readonly string[], options: NativeControlExecutionOptions,
    signal: AbortSignal): Promise<NativeControlExecutionReport>;
  runText(text: string, options: NativeControlExecutionOptions,
    signal: AbortSignal): Promise<NativeControlExecutionReport>;
  poll(handle: NativeControlOperationHandle, signal: AbortSignal):
    Promise<NativeControlEnvelope>;
  cancel(handle: NativeControlOperationHandle, signal: AbortSignal):
    Promise<NativeControlEnvelope>;
}

export type NativeControlExecutionOptions = Readonly<{
  mode: "tui" | "rpc" | "json" | "print" | "headless" | "direct";
  output: "json" | "human";
  input?: NativeControlInputPort;
  sink?: NativeControlFrameSink;
  timeoutMs?: number;
}>;

export type PackagedPluginHostApplication = Readonly<{
  control: NativePluginControlService;
}>;
```

`createNativeControlService` receives the private application dependency graph, current-project safe port, ID/timeout ports, and projectors. Construction performs no I/O, session creation, status read, timer, source acquisition, or background start. `runArgv/runText` parse before issuing an execution ID or touching a service. `execute` reparses the strict command schema so direct typed callers cannot bypass validation.

The packaged host privately retains lower-level services for startup/runtime/background coordination, but removes them from `PackagedPluginHostApplication`. `runWithPiOperationContext(context, signal, application => application.control...)` remains the only packaged command admission. Future Pi command/TUI code receives no raw marketplace, inspection, operation, trusted-install, update, status, configuration, recovery, collection, or lifecycle bypass. Root-library exports remain available where already public; the `./pi` subpath exposes the host plus the control service type only.

Shutdown order is background stop/drain → reject new packaged command admission → control quiesce → admitted operation/reload settlement → control sink/input/session cleanup → runtime/services/stores reverse close. Reload successor receives a fresh facade; old operation handles remain owner-host tokens and become disposed/expired rather than cross-host aliases.

**Acceptance criteria**:
- [ ] Direct typed, argv, and text calls converge on the same parsed command/dispatcher/result path; Pi mode is only an execution option and never changes business behavior.
- [ ] Packaged application consumers cannot reach lower-level management services; dependency tests keep application independent of Node/Pi and Pi as a thin future adapter.
- [ ] Factory/startup remain network/input/output/timer/operation inert; first explicit control execution owns effects.
- [ ] Concurrent executions, reload predecessor/successor, repeated close, failed partial startup, host mismatch, stale token, and admitted cancellation obey existing host admission/disposal guarantees.
- [ ] Source and packed export allowlists include the intended control contracts/factory and exclude parser internals, handler maps, mutable registry, raw services, sink handles, input bytes, session binding, roots, and native causes.

### Unit 9: Integrated direct/headless/packed acceptance and adversarial contract matrix

**Story**: `epic-native-plugin-management-deterministic-control-facade-integrated-acceptance`
**Depends on**: `epic-native-plugin-management-deterministic-control-facade-packaged-composition`

**Files**:
- `test/integration/native-control-direct-api.test.ts`
- `test/integration/native-control-headless.test.ts`
- `test/integration/native-control-workflows.test.ts`
- `test/integration/native-control-concurrency.test.ts`
- `test/integration/native-control-security.test.ts`
- `test/integration/native-control-packed-consumer.test.ts`
- `test/fixtures/native-control/`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/packed-pi-consumer.mjs`

Use schema-valid data fixtures from the signed manager/install flow and existing packaged capability fixtures. Exercise real application services where facade seams matter; do not duplicate foreign parser, materializer hardening, lifecycle crash, or update scheduler conformance matrices.

**Acceptance criteria**:
- [ ] One direct API suite runs every canonical command, alias, help path, completion request, preview/apply workflow, operation poll/cancel, pagination continuation, and exit category.
- [ ] Headless tests prove no TTY, missing provider, secret prompt unavailable, stdin/file/env policy, exact confirmation, timeout, SIGINT, slow sink, broken stdout, and semantic-result precedence.
- [ ] Packaged clean consumer imports compiled bytes only, starts offline without Claude/Codex or unpublished MCP/subagent adapters, lists/status/diagnoses local state, and exercises a mutation through the admitted control surface.
- [ ] Concurrent same/different plugin commands, stale inspection/candidate/consent/session/cursor/notice tokens, pending transition, project trust/root change, commit ambiguity, rollback, recovery, shutdown, and reload return exact deterministic envelopes.
- [ ] Property/adversarial cases cover argv permutations, duplicate/unknown/deprecated options, partial quotes/input, NUL/control/bidi/Unicode lookalikes, giant values, ANSI/OSC, source credentials, paths, secrets, native causes, malformed JSON, and cursor/token forgery.
- [ ] Full `npm test` passes typecheck, dependency boundaries, focused/unit/integration/process tests, build, exact source/compiled export allowlists, and isolated packed Pi discovery with no source-tree import.

## Implementation order and child-story DAG

1. `epic-native-plugin-management-deterministic-control-facade-contracts-registry`
2. In parallel after contracts:
   - `epic-native-plugin-management-deterministic-control-facade-lexer-parser-metadata`
   - `epic-native-plugin-management-deterministic-control-facade-input-redaction`
3. `epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch` after contracts + parser
4. `epic-native-plugin-management-deterministic-control-facade-operation-progress-admission` after contracts + input boundary
5. `epic-native-plugin-management-deterministic-control-facade-mutation-workflow-dispatch` after input + selection/read + execution/progress
6. `epic-native-plugin-management-deterministic-control-facade-result-output-exit` after contracts + execution/progress + mutation dispatch
7. `epic-native-plugin-management-deterministic-control-facade-packaged-composition` after read dispatch + mutation dispatch + output/results
8. `epic-native-plugin-management-deterministic-control-facade-integrated-acceptance` after packaged composition

One feature owner should normally carry the graph because grammar, result classification, and packaged boundary must remain one contract. Stories are durable checkpoints and dependency evidence, not one worker per file or story.

## Control invariants

1. Grammar v1 has one registry. Types, parser routes, handler exhaustiveness, help, completion, deprecation, safety classes, and response schemas derive from it.
2. Parsing and validation complete before any ID, timer, input, output, service call, filesystem/environment read, or mutation.
3. Exact ASCII command/option names are never normalized or abbreviated. Identity/source values remain under their existing canonical schemas.
4. `project` is the bound current project; no path/key selector or fallback can cross project/user authority.
5. Human selectors are resolved once through a coherent inspection snapshot; exact IDs remain owner-verified. Display text and list order are never authority.
6. All business decisions remain with existing services. The facade assembles typed requests, supplies explicit inputs, and projects results only.
7. No hidden prompt exists. Missing input/UI/TTY/provider returns complete input-required evidence with zero later effect.
8. Secret/configuration values never enter argv, history, ASTs, sessions, progress, help, completion, envelopes, human fields, errors, or logs.
9. Every mutation confirmation binds the exact same-invocation preview or exact owner consent/authority. Generic `--yes` cannot grant trust or automatic breadth.
10. One-shot install/lifecycle/policy paths are composition of owner preview/open/apply methods, not alternate mutation implementations.
11. Progress is bounded, monotonic, awaited, observer-independent, and never success evidence.
12. Cancellation after a possible effect cannot erase owner committed/current/partial/rollback/recovery evidence.
13. Operation status/cancel routes existing tokens; the facade stores no durable or host-epoch operation session.
14. Pagination cursors are opaque owner capabilities. Filter/scope/version changes produce stale/invalid, never silent restart.
15. Offline startup/read behavior returns local state and stale health honestly. No implicit refresh or network work occurs.
16. Concurrent commands share no control mutable state beyond injected admission/ID ports; underlying schedulers, locks, CAS, journals, and sessions remain authority.
17. Machine output is strict JSON-safe schema data. Human output is a safe derived projection and cannot be parsed back as mutation authority.
18. Output delivery failure is orthogonal to semantic operation result. Direct callers can recover the report even when stdout is broken.
19. Packaged management consumers receive only `control`; lower-level service joins remain private to composition.
20. Quiesce rejects new work and drains admitted possibly-committed operations before dependent disposal.

## Failure, status, and exit matrix

| Condition | Envelope status | Exit | Effect/output rule |
|---|---|---:|---|
| Help/grammar/completion or successful read | `ok` | 0 | pure; no readiness/network requirement |
| Mutation owner reports current/unchanged | `no-change` | 0 | no success fabrication; exact owner evidence retained |
| No-arg in TUI | `presentation-required` | 0 | future Pi adapter opens manager; facade renders nothing |
| No-arg headless/no UI | `presentation-required` + help | 3 | complete usage; no prompt |
| Unknown command/option, duplicate singleton, malformed argv | `failed` | 2 | parse diagnostics only; zero service calls |
| Missing configuration/consent/confirmation/conflict resolution | `input-required` | 3 | complete issues/preview; zero later effect |
| Missing exact identity/token/candidate/notice | `not-found` | 4 | no latest/name fallback |
| Stale cursor/snapshot/preview/session/file/project/capability | `stale` | 5 | reparse/reinspect/repreview action |
| Concurrent/pending/target/file conflict | `conflict` | 5 | owner result; no automatic retry |
| Offline acquisition, adapter/capability/UI unavailable | `unavailable` | 6 | prior active/local data preserved |
| Project untrusted, incompatible, source guarded, policy rejected | `rejected` | 7 | stable code/action; no native message |
| Sync partial effect, commit ambiguous, rollback, recovery required | `partial` or `recovery-required` | 8 | exact effects/recovery action outrank cancellation |
| Abort/timeout before stronger owner evidence | `cancelled` | 9 | one signal; bounded cleanup |
| Unexpected contract/adapter error | `failed` | 10 | `CONTROL_INTERNAL`; cause/message omitted |
| Output sink closes/fails | semantic status retained | 74 for headless delivery | direct report retains semantic envelope; no rewrite |
| Offline stale catalog/update data remains readable | `ok` + warning | 0 | no implicit refresh; stale/observation fields retained |
| Host local readiness blocked | read/status/diagnose allowed; mutation `rejected` | 7 | blocked plugin/status evidence remains visible |
| Token expired/disposed | `not-found` or owner terminal status | 4 | no reconstructed session |

## Simplification

- Replace privileged packaged marketplace/inspection/install/operation/update/status exposure with one `application.control` surface; retain lower-level services only as private composition dependencies.
- Derive parser/help/completion/dispatch typing from one command registry instead of separate switch statements, documentation tables, and completion lists.
- Reuse native inspection IDs/cursors/safe display, trusted-install sessions/consent/progress, lifecycle previews/sessions/effects, update policy previews/notices, host status, and existing error contracts.
- Add no command database, session journal, status mirror, retry queue, event bus, generic CLI framework, shell parser, prompt abstraction, transaction, lock, recovery path, or business-policy copy.
- Keep human rendering as safe fields only; later TUI owns layout/theme/keybindings and does not need a second read model.
- No existing low-value test is identified for removal at design time. Replace packaged tests that assert direct lower-level management exposure with control-surface tests rather than preserving compatibility-only bypasses.

## Testing

- **Registry/contracts**: exhaustive command/response/exit/schema derivation and public exports. Protects the external versioned surface.
- **Lexer/parser**: argv/text equivalence, hostile/partial input, exact options, deprecations, and no-side-effect parse failures. Protects deterministic invocation.
- **Input/redaction**: channel policy, all-errors input collection, exact consent, `SensitiveValue` custody, and structural canary scans. Protects secret/trust boundaries.
- **Selection/read seams**: exact installed/candidate resolution, stale snapshots/cursors, pagination, offline observations, and safe projections. Protects identity authority without retesting inspection internals.
- **Progress/execution**: ordering, backpressure, timeout, abort, sink failure, poll/cancel, concurrent executions, and drain. Protects truthful long-running behavior.
- **Mutation dispatch**: one seam case per marketplace/install/lifecycle/sync/policy/notice/status owner variant and zero-call spies for forbidden business paths. Protects no duplication/bypass.
- **Result/error/output**: exhaustive owner-kind exit mapping, known/unknown errors, canonical JSON, human safety, EPIPE/partial writes. Protects scripting stability.
- **Packaged integration**: one control surface, operation-context admission, reload/disposal, offline startup, compiled exports, and clean packed consumer. Protects production composition.
- Do not duplicate foreign source/path hardening, compatibility evaluation, state migration, trust/configuration custody, lifecycle crash recovery, project file CAS, scheduler lease, or notification idempotence suites. Existing owners remain authority.

## Risks

- **Riskiest assumption — one facade can stay useful to both TUI and headless callers without becoming a presentation framework**: mitigated by typed commands/envelopes/safe fields and explicit input/progress ports; no terminal components or UI state enter application code. Fallback: add adapter-specific projectors outside the facade, not new service calls.
- **Registry type derivation can become overly clever**: a deeply generic router could harm maintainability. Mitigation: one small `defineNativeControlCommands` helper, explicit per-command Zod schemas, and an exhaustive typed handler object. Fallback: generate static types from the registry at build time; do not hand-copy route sets.
- **Identity short forms may be ambiguous**: the same plugin can appear across scopes/registrations. Mitigation: mutation scope is mandatory, exact selectors are supported, and zero/multiple matches fail. Fallback: require exact IDs for that case rather than choosing by order.
- **Awaited progress can delay application work**: bounded backpressure is intentional, but a stalled sink can hold preparation. Mitigation: adapter deadlines and delivery abort; owner operation truth still wins after possible commit. Fallback: one coalescing informational slot, never an unbounded queue.
- **Broken stdout can hide a recovery-required result from the process supervisor**: no process can guarantee delivery after EPIPE. Mitigation: return the semantic report to direct callers, classify delivery separately, stop writing, and rely on durable owner recovery/status on the next invocation. Never print secrets/errors to stderr as fallback.
- **Headless exact consent is operationally awkward**: immutable revision/executable digest is not known before inspection. Mitigation: staged open/apply is canonical for high-assurance automation; atomic mode accepts a provider envelope pinned to the disclosed evidence. Fallback: return preview/input-required.
- **Environment input is convenient but leak-prone**: mitigation is non-sensitive-only environment policy. Sensitive input requires stdin, owner-only file, or Pi provider. No weakening fallback is planned.
- **Removing packaged raw services can expose stale internal tests/consumers**: this is intentional to enforce one facade. Root-library APIs remain, and packaged call sites migrate in one story. Do not retain a bypass solely for test convenience.
- **Upstream result unions may grow**: exhaustive registry/projector tests deliberately fail until new variants receive classification. This is safer than a generic `unknown → failed` path for known owner results.

## Pre-mortem

The design fails if text parsing performs shell expansion, a typo executes another option, a control character spoofs help, a plugin in the wrong scope is selected, an old cursor/consent/token silently targets current evidence, a no-TTY command opens a hidden prompt, a secret reaches history/output, `--yes` grants broad trust, a one-shot path bypasses owner preview/apply, progress reorders or buffers without bound, SIGINT/EPIPE masks a committed transition, offline status triggers network, two commands share mutable control state, the TUI calls raw services, or host shutdown closes stores under an admitted reload.

The chosen boundaries address those failures with an exact lexer/parser, one schema registry, coherent inspection selection, owner-verified IDs, explicit input/consent ports, strict channel/redaction policy, composition-only short forms, awaited monotonic progress, semantic-result precedence, local readiness gates, stateless concurrent dispatch, packaged raw-service removal, and operation-drain-aware disposal. When exact evidence is unavailable, the correct result is usage, input-required, not-found, stale, conflict, unavailable, rejected, partial, or recovery-required—never a guessed success.

## Implementation summary

- **Ownership/dispatch**: one GPT-5.6 Sol feature owner at xhigh carried all nine dependency-ordered checkpoints as one cohesive contract. No nested agents were used, per the explicit owner boundary. This avoided parser/registry/result/composition handoff drift.
- **Delivered boundary**: 32-command `plugin-control/v1` registry; strict argv/text parser; schema-derived help/completion; explicit input/redaction ports and Node channels; exact inspection selection; thin read/mutation dispatch; ordered commit-aware progress/admission; stable envelopes/exits/human fields/JSON lines; one packaged `application.control` surface.
- **Business authority**: marketplace, inspection, trusted install, lifecycle/project sync, update policy/notices/automatic updates, host readiness, owner tokens/cursors/sessions, and packaged Pi admission remain authoritative. The facade has no state store, transaction, lock, materializer, trust evaluator, configuration validator, retry, or alternate recovery path.
- **Packaged simplification**: removed public packaged joins for marketplace, inspection, trusted install, lifecycle, updates, status, configuration, recovery, collection, capabilities, and resources. Runtime/startup composition retains them privately; management consumers receive only `control`.
- **Verification**: full `npm test` passed 307 test files and 1,479 tests with no type errors; dependency boundaries passed across 392 modules and 2,838 dependencies; build and exact compiled allowlists passed (847 root runtime exports, 3 Pi runtime exports); isolated packed Pi startup, process headless, persisted mutation/readback, and restart acceptance passed.
- **Pre-review hardening**: explicit caller input ports now bind the `provided` channel automatically, partial quoted completion returns structured incomplete metadata instead of an executable parse, unknown help paths fail explicitly, and `show`/target diagnosis cover exact marketplace candidates as well as installed plugins.
- **Review fixes**: added the thin Node process runner; made JSON-lines callback/backpressure/EPIPE settlement truthful; made the registry and exhaustive handler map authoritative; added strict command-specific safe projections with final reparsing; made idle stdin abort reusable; made current-project binding and refresh folds exhaustive; replaced parser-only acceptance with real stream/process/packed persistence evidence; and rolled `docs/SPEC.md` to the exact grammar-v1 contract. The earlier update-status alignment, scalar-safety helper, and sole `application.control` boundary remain intact.
- **Review handoff**: all nine child stories remain `done`. The project-default `standard` review used one sole fresh-context pass at `cc11a99`; all accepted material findings were fixed and verified without a repeat review, as required by the standard closure policy and explicit caller instruction.

## Review (2026-07-17)

**Verdict**: Approve

**Blockers**: none unresolved. Nine accepted high findings were fixed inline: Node headless delivery, callback-authoritative JSON-lines settlement, registry-owned exhaustive dispatch/contracts, command-safe reparsed projection, abortable reusable stdin, exact current-project classification, exhaustive refresh folding, non-self-confirming process/packed acceptance, and grammar-v1 specification alignment.

**Important**: parked as `idea-complete-native-control-completion-metadata`, `idea-preserve-native-control-deprecation-warnings`, `idea-page-complete-native-control-uniqueness`, `idea-harden-native-control-json-file-input`, and `idea-narrow-native-control-public-exports`.

**Nits**: none.

**Rejected**: none.

**Notes**: Substrate feature review; effective weight `standard` from `.work/CONVENTIONS.md`; one sole fresh-context pass, then receiver adjudication, blocker fixes, focused verification, packed-process verification, and full-suite verification. No repeat review or nested agent ran. Focused control/update/host/security/process coverage passed 221 tests; full verification passed 307 files and 1,479 tests plus package/packed acceptance. Closure preserves the sole packaged `application.control` facade, update-status fixes, scalar helper, source redaction, and the absence of Pi command/TUI production code.
