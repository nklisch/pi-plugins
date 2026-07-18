---
id: epic-native-plugin-management-pi-extension-manager
kind: feature
stage: done
tags: [compatibility, tui]
parent: epic-native-plugin-management
depends_on: [epic-native-plugin-management-deterministic-control-facade]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Pi Extension Composition and Native Plugin Manager

## Brief

Package the host as a Pi extension and register one `/plugin` command. Arguments dispatch directly to the deterministic control facade; no arguments open the native terminal manager in TUI mode. The manager implements the selected split-inspector installed overview, adjacent marketplace browsing, expandable compatibility/health details, update state/settings, lifecycle actions, and the signed-off three-step install journey.

The presentation layer is thin: it holds navigation, focus, temporary form state, confirmation, and rendering only. It invokes the same facade requests as subcommands and displays their exact progress and results without reproducing lifecycle, compatibility, trust, or update policy.

## Epic context and ownership

- Parent: `epic-native-plugin-management`
- Depends on the complete deterministic facade and packaged host factory.
- Owns the Pi extension entry, `package.json` extension discovery metadata, `pi.registerCommand("plugin", ...)`, argument completions, host session lifetime, native components, keyboard behavior, and Pi-mode adaptation.
- Does not own application decisions, a private UI state database, a custom palette/font, or production MCP/subagent package implementations.

## Pi integration boundaries

- `ctx.mode === "tui"` gates `ctx.ui.custom()` and terminal component creation. RPC may use supported dialogs/notifications only; JSON/print/non-UI invocation never prompts and returns deterministic guidance/results.
- All colors and emphasis use Pi's active semantic `theme`; key hints use injected keybindings. Layout degrades safely for narrow terminals and cancellation always returns control to Pi.
- The manager opens on installed plugins, keeps list context while details change, exposes marketplace as an adjacent view, and does not hide unsupported/incompatible components.
- Installation follows choose/inspect → configure/trust → activation result. Exact executable details remain expandable one level beneath the concise trust summary.
- Newly discovered update revisions use one calm `ctx.ui.notify`; unresolved count remains visible in the manager until resolved.
- Extension reload/shutdown closes owned resources, cancels background work, and does not leave partial prompts, overlays, process handles, or database connections.

## Mockups

- Manager authority: `.mockups/screens/epic-native-plugin-management-manager/option-1.html` (selected split inspector).
- Install-flow authority: `.mockups/flows/plugin-install/index.html` and its three signed-off step pages.
- Design-system reference: `.mockups/design-system/`; production uses Pi semantic theme and terminal typography rather than copying static colors or fonts.

No new mockup is required. The signed-off manager and install flow cover every surface in this feature. Browser-only controls translate to Pi components while preserving information hierarchy, three-step topology, persistent list context, focus continuity, and disclosure depth.

## Grounding and design decisions

- **Dispatch**: direct-read only, as required. No question or nested-agent pass was used.
- **Pi baseline**: implementation targets the package-pinned `@earendil-works/pi-coding-agent@0.80.8` and matching `@earendil-works/pi-tui@0.80.8` types. The installed global documentation was also checked, but newer 0.80.10 behavior is not assumed.
- **Extension construction**: the default factory remains synchronous and construct-only. It creates the notification/presentation adapter, creates one packaged host, registers `/plugin`, then registers presentation lifecycle listeners. Filesystem/runtime/background work still begins only from the host's existing `session_start` delegate.
- **One facade**: all command and manager operations run inside `host.runWithPiOperationContext(ctx, signal, application => application.control...)`. Pi code receives no lower-level marketplace, inspection, trust, lifecycle, update, state, or recovery service.
- **Command string bridge**: Pi 0.80.8 supplies one raw `args: string`; the adapter passes it unchanged to `control.parseText`/`runText`. It does not split on whitespace, invoke a shell, normalize Unicode, interpolate environment variables, or rebuild argv. The facade lexer remains grammar authority.
- **Default behavior**: a parsed `presentation` command opens the manager only when `ctx.mode === "tui"`. The same no-argument command in RPC/JSON/print executes the facade's presentation fallback and emits its `presentation-required` envelope/help without prompting.
- **Subcommands**: every non-empty invocation follows the same facade parse/execute/result path. TUI may supply a Pi input port unless `--non-interactive` was parsed; RPC can collect non-sensitive values and confirmations through supported dialogs but reports `SECRET_PROMPT_UNAVAILABLE` for sensitive fields; JSON and print supply no UI input port.
- **Pi 0.80.8 headless limitation**: `registerCommand` handlers return `Promise<void>` and cannot set Pi's process exit status. The facade envelope's stable exit classification remains authoritative. Print writes bounded facade frames only in print mode; JSON/RPC use Pi-safe custom-message/event channels and never write raw records into Pi's protocol stream.
- **Command collisions**: Pi retains duplicate names and assigns load-order suffixes such as `/plugin:1`. The extension does not override another command or invent an alias. On `session_start`, it identifies its own command by Pi `sourceInfo.path` ending in `/dist/pi/extension.js`; if the invocation is not exactly `/plugin`, it emits one warning naming the actual suffixed command. Duplicate composition of this package still fails through the existing process/session claim.
- **Completions**: `getArgumentCompletions(prefix)` delegates to `control.complete({text: prefix, dynamic})`. Dynamic candidates come only from the manager's last safe cached rows; completion never starts the host, reads services, fetches, prompts, or exposes tokens, consent IDs, paths, URLs, or secrets.
- **UI state**: manager state is ephemeral reducer state only: current view, focus, query, loaded pages, selected exact row, expanded section, scroll offsets, current facade frames, and temporary form values. Authoritative plugin/update/operation state is never mirrored or persisted by the UI.
- **Concurrency**: one foreground mutation is admitted at a time per manager. Reads are latest-intent-wins: each request has a monotonically increasing UI request number and its own abort controller; late results are discarded. Facade/application locks, generations, snapshots, sessions, and tokens remain the only cross-process authority.
- **Staleness**: actions carry the exact snapshot/detail/candidate/preview/token IDs returned by the current facade data. A stale/conflict result is displayed, then the affected page/detail is refreshed; the action is never replayed automatically.
- **Reload successor**: an activation-affecting action creates a process-local, session-bound presentation handoff before calling the facade. If Pi reloads, the successor extension claims the handoff after `session_start` and presents the eventual safe envelope in a fresh manager model. The predecessor never touches stale `pi`, command `ctx`, TUI, manager, or session objects after reload.
- **Secrets**: sensitive fields use a fresh masked overlay component and never `ctx.ui.input`, the core editor, `setEditorText`, Pi messages, custom entries, completion, logs, clipboard helpers, or manager snapshots. Paste is accepted only through the focused masked component and remains masked. Cancel/dispose clears references best-effort. RPC does not claim masked secret entry.
- **Notifications**: the Pi publisher calls one `ctx.ui.notify` for a newly published update revision and returns success only with a bound TUI/RPC context. Existing update-notice state remains publication/unread/unresolved authority. A bounded set reconstructed from TUI-only session custom entries suppresses replay in the same resumed Pi session without becoming update authority.
- **Theme and color**: production consumes only callback `theme.fg`, `theme.bg`, `theme.bold`, and semantic tokens (`text`, `accent`, `muted`, `dim`, `success`, `warning`, `error`, `border`, `borderAccent`, `borderMuted`, `selectedBg`). Text labels/sigils carry all meaning, so reduced/256-color approximation and monochrome terminals remain usable. No palette, font, or theme switching is owned here.
- **Keyboard access**: injected `KeybindingsManager.matches/getKeys` drives `tui.select.*` and `app.interrupt` behavior. Raw mnemonic keys (`/`, `u`, space, `r`, `?`) are accelerators only; every action is reachable by Tab/Shift+Tab focus traversal and Enter. Help renders injected configured keys plus raw accelerator hints.
- **Terminal safety**: all data text passes a presentation terminal-text projector that rejects/escapes ESC, C0/C1, OSC/CSI-capable bytes, bidi controls, tabs/newlines outside owned wrapping, lone surrogates, and overlong fields. Only Pi theme methods may introduce ANSI. Selection authority stays in hidden typed IDs, never rendered labels or row positions.

## Architectural choice

### Option A — one monolithic custom component that calls services

A single class could render, fetch, prompt, mutate, and reload. It is initially short, but async completion races would live inside input handling, tests would need real Pi/application state, reload would leave stale closures, and the component could bypass the facade. Rejected.

### Option B — compose only Pi's `select`/`confirm`/`input` dialogs

Built-in dialogs are ideal for small choices, but they cannot preserve the signed-off split inspector, adjacent views, stable list/detail focus, expandable diagnostics, or the three-step flow. `input` also cannot provide a masked-secret guarantee. Rejected as the main UI, retained for simple non-sensitive RPC interaction.

### Option C — reducer-driven manager plus a facade-only Pi controller (chosen)

A pure manager model/reducer owns navigation and temporary presentation state. A Pi controller translates intents into exact control commands, explicit input/progress adapters, and reducer events. One custom component renders the model and emits intents; fresh overlay components handle confirmation and masked input. A small reload-handoff and notification adapter bridge Pi lifecycle boundaries. This is the smallest design that keeps the UI testable, handles reload correctly, and enforces the facade boundary.

## Trickiest unit first

The riskiest unit is an activation result crossing Pi reload. Pi 0.80.8 guarantees that `await ctx.reload()` emits predecessor `session_shutdown`, loads a new extension instance, emits successor `session_start`/`resources_discover`, and then resumes the old command call frame. Its documentation explicitly forbids use of captured old `pi`, command `ctx`, or session-bound objects after reload.

Before any potentially activating facade request, the controller opens an ephemeral `PiManagerReloadHandoff` keyed by Pi session ID and cwd. The successor claims that exact pending handoff during `session_start` and attaches to its promise without delaying startup. The predecessor publishes only the final schema-validated `NativeControlEnvelope` and a destination (`installed`, `install-result`, or `operation-result`); no secret, form state, component, context, host, callback, snapshot, or control port crosses. If no successor claims because no reload occurred, the predecessor consumes the result normally. If a successor claims, only it renders/notifies and it first obtains fresh installed/update data. `session_shutdown("reload")` closes overlays and read controllers but does not abort the admitted reload-causing mutation; every other shutdown reason aborts all presentation-owned operations.

If the handoff cannot be claimed, the safe fallback is to retain the envelope in the process-local slot for the next matching `session_start` and make authoritative `operation status`/host recovery visible. The fallback is never to use the stale predecessor context or infer activation from progress.

## Implementation units

### Unit 1: Package entry, command registration, collision detection, and mode bridge

**Story**: `epic-native-plugin-management-pi-extension-manager-command-bridge`

**Files**:
- `package.json`
- `package-lock.json`
- `src/pi/extension.ts`
- `src/pi/plugin-command.ts`
- `src/pi/pi-control-channel.ts`
- `test/pi/plugin-command.test.ts`
- `test/pi/extension.test.ts`
- `test/compiled-pi-package-import.mjs`
- `test/packed-pi-consumer.mjs`

```typescript
export type PluginCommandAdapter = Readonly<{
  register(): void;
  bindSession(context: ExtensionContext): void;
  unbindSession(reason: SessionShutdownEvent["reason"]): void;
  close(): Promise<void>;
}>;

export function createPluginCommandAdapter(input: Readonly<{
  pi: ExtensionAPI;
  host: PackagedPluginHost;
  manager: PluginManagerSession;
  channel: PiControlChannel;
}>): PluginCommandAdapter;

export interface PiControlChannel {
  createSink(context: ExtensionCommandContext, mode: ExtensionMode): NativeControlFrameSink;
  publishReport(context: ExtensionCommandContext, report: NativeControlExecutionReport): Promise<void>;
  publishCollision(context: ExtensionContext, invocationName: string): void;
}
```

The default extension order is: create a session-bindable update publisher; create the packaged host with that publisher; create manager session/controller; call `pi.registerCommand("plugin", ...)`; then register presentation `session_start`/`session_shutdown` listeners. The host already registered its lifecycle delegates first, so startup completes before the presentation binds and shutdown closes background/runtime resources before the publisher unbinds.

`handler(args, ctx)` creates one operation controller, calls `ctx.waitForIdle()` only when opening/replacing interactive UI, and enters the existing packaged operation frame. It passes `args` unchanged to `control.runText`. A presentation result opens the manager only in TUI. TUI subcommands use an operation view; RPC/JSON/print never call `custom()`.

`getArgumentCompletions` maps facade candidates to `AutocompleteItem` without interpreting them. The adapter checks `pi.getCommands()` after startup and reports Pi-assigned collision suffixes. `@earendil-works/pi-tui@0.80.8` is added as an exact dev dependency and `*` peer dependency, matching Pi package guidance; compiled production continues to rely on Pi's core package modules.

**Acceptance criteria**:
- [ ] The factory registers exactly one command named `plugin`, one packaged host, and no shortcut/tool/alternate command; package discovery remains `./dist/pi/extension.js`.
- [ ] Empty text in TUI opens the manager; every non-empty text is passed byte-for-byte to facade parsing; no shell/string argv splitter exists in Pi code.
- [ ] RPC/JSON/print never call `custom` or prompt. JSON/RPC use Pi event/custom-message framing; print emits only bounded non-ANSI facade frames. No JSON/RPC protocol is corrupted by raw stdout.
- [ ] Command collisions preserve all Pi commands, disclose the actual suffix, and never silently claim `/plugin`.
- [ ] Static completion works before startup; dynamic completion uses safe cached rows only and exposes no sensitive/exact operation material.

### Unit 2: Pure manager model, controller, snapshots, search, and pagination

**Story**: `epic-native-plugin-management-pi-extension-manager-state-controller`
**Depends on**: `epic-native-plugin-management-pi-extension-manager-command-bridge`

**Files**:
- `src/pi/manager/plugin-manager-model.ts`
- `src/pi/manager/plugin-manager-controller.ts`
- `src/pi/manager/plugin-manager-commands.ts`
- `src/pi/manager/plugin-manager-session.ts`
- `test/pi/manager/plugin-manager-model.test.ts`
- `test/pi/manager/plugin-manager-controller.test.ts`

```typescript
export type PluginManagerView = "installed" | "updates" | "browse" | "marketplaces";
export type PluginManagerPane = "tabs" | "query" | "list" | "detail" | "actions";
export type PluginManagerRowKey = Readonly<{
  subject: "installed" | "candidate" | "marketplace" | "notice";
  key: string;
  snapshotId?: string;
  detailId?: string;
}>;

export type PluginManagerState = Readonly<{
  screen: "manager" | "install-inspect" | "install-configure" | "install-result" | "operation-result";
  view: PluginManagerView;
  focus: Readonly<{ pane: PluginManagerPane; row?: PluginManagerRowKey; action?: string }>;
  query: string;
  page: Readonly<{ rows: readonly PluginManagerRow[]; next?: string; loading: boolean; request: number }>;
  detail: PluginManagerDetailState;
  updateCounts: Readonly<{ unread: number; unresolved: number }>;
  operation: PluginManagerOperationState;
  disclosure: ReadonlySet<string>;
}>;

export type PluginManagerEvent =
  | Readonly<{ type: "intent"; intent: PluginManagerIntent }>
  | Readonly<{ type: "page-loaded"; request: number; page: NativeControlEnvelope; append: boolean }>
  | Readonly<{ type: "detail-loaded"; request: number; detail: NativeControlEnvelope }>
  | Readonly<{ type: "frame"; frame: NativeControlFrame }>
  | Readonly<{ type: "operation-finished"; envelope: NativeControlEnvelope }>
  | Readonly<{ type: "resized"; columns: number; rows: number }>
  | Readonly<{ type: "reset-from-authority" }>;

export interface PluginManagerController {
  state(): PluginManagerState;
  dispatch(intent: PluginManagerIntent): void;
  refresh(scope?: "view" | "detail" | "all"): Promise<void>;
  dynamicCompletions(): readonly NativeControlDynamicCandidate[];
  close(reason: SessionShutdownEvent["reason"]): Promise<void>;
}
```

`plugin-manager-commands.ts` is the only intent-to-control-text mapping. It constructs canonical grammar text/typed commands from hidden exact IDs and delegates parsing back to `control`; it does not construct lower service requests. Initial load runs `list --scope all-current --limit 50`, `updates status --scope all-current`, and the selected detail. Browse uses `browse`; marketplaces uses `marketplace list`; updates use update status/notices plus exact installed detail. Search is submitted/debounced by the controller, resets cursor/request generation, and never filters mutation authority by display text. Pagination appends facade pages, follows only returned opaque cursors, and keeps a bounded five-page in-memory window with stable row-key focus.

The controller serializes reducer application but not unrelated reads. Newer query/detail requests abort older reads and increment request IDs; late completion cannot overwrite current state. External mutations are handled only through stale/conflict envelopes and explicit refresh. Empty/error/offline/degraded/blocked rows remain visible with exact facade diagnostics and actions.

**Acceptance criteria**:
- [ ] The reducer is pure and contains no Pi, Node, control service, timer, terminal, theme, secret, or business policy import.
- [ ] Every view is populated only by canonical facade commands/envelopes; no application DTO is reinterpreted into compatibility, health, trust, update, or lifecycle decisions.
- [ ] Search, next-page, selection, refresh, and late async completions preserve deterministic focus and cannot apply stale data.
- [ ] Same identity across scopes, external state changes, stale snapshot/cursor/token, offline data, blocked readiness, and empty pages remain explicit; no row-index or label becomes authority.
- [ ] Closing aborts reads and clears temporary state; manager state is never appended to Pi sessions or written to disk.

### Unit 3: Responsive split-inspector component and keyboard/focus model

**Story**: `epic-native-plugin-management-pi-extension-manager-split-inspector-tui`
**Depends on**: `epic-native-plugin-management-pi-extension-manager-state-controller`

**Files**:
- `src/pi/manager/plugin-manager-component.ts`
- `src/pi/manager/plugin-manager-render.ts`
- `src/pi/manager/pi-terminal-text.ts`
- `src/pi/manager/plugin-manager-keys.ts`
- `test/pi/manager/plugin-manager-component.test.ts`
- `test/pi/manager/plugin-manager-render.test.ts`
- `test/pi/manager/pi-terminal-text.test.ts`

```typescript
export class PluginManagerComponent implements Component, Focusable {
  focused: boolean;
  constructor(input: Readonly<{
    tui: TUI;
    theme: Theme;
    keybindings: KeybindingsManager;
    controller: PluginManagerController;
    done(result: PluginManagerCloseResult): void;
  }>);
  render(width: number): string[];
  handleInput(data: string): void;
  invalidate(): void;
  dispose(): void;
}

export function projectTerminalText(input: string, limit: number): SafeTerminalText;
export function renderPluginManager(input: Readonly<{
  state: PluginManagerState;
  width: number;
  height: number;
  theme: Theme;
  keybindings: KeybindingsManager;
}>): readonly string[];
```

At `>=92` columns, render the selected split inspector: tabs/title/counts, list/query on the left, selected detail/actions on the right, and a footer. At `60..91`, render one pane at a time with explicit list/detail back navigation. Below 60, retain the same topology in a compact single column, abbreviate chrome only, wrap values, and never hide conditions/components/diagnostics. Visible rows derive from `tui.terminal.rows`; list/detail scroll independently. Every returned line is checked with `visibleWidth` and finalized with `truncateToWidth`/`wrapTextWithAnsi` so it never exceeds `render(width)`.

Focus order is tabs → query → list → detail disclosures → actions. Tab/Shift+Tab traverses; configured select keys navigate/confirm/page/cancel; Left/Right switch adjacent views when tabs are focused; Enter opens detail or invokes the focused action. `/` focuses query, `u` focuses/reviews update, space opens the enable/disable action, `r` refreshes, `?` toggles help. Mnemonics do not bypass confirmation and are not the only route. Escape exits search/disclosure first, returns detail to list second, and closes manager last. After modal closure, stale result, refresh, or responsive layout change, focus restores by semantic pane/row/action key, falling back to the nearest surviving element.

`invalidate()` discards all themed render caches so Pi theme hot reload applies. Status always uses words/sigils as well as semantic colors. Rendering never imports a theme singleton or emits handcrafted ANSI.

**Acceptance criteria**:
- [ ] Golden line tests cover wide split, medium single-pane, narrow/reduced-color, resize while focused, long/wide Unicode, empty/degraded/blocked states, and every signed-off information group.
- [ ] Every rendered line stays within width and contains no untrusted ESC/C0/C1/bidi sequence; only test-injected Pi theme sequences survive.
- [ ] All actions are keyboard reachable without mnemonic keys; configured cancel/select/page bindings work and help reflects injected keys.
- [ ] Query input propagates `Focusable`/`CURSOR_MARKER` correctly for IME; focus restoration survives selection disappearance and modal return.
- [ ] `dispose()` is idempotent, clears callbacks/caches, and no disposed component is reused.

### Unit 4: Signed three-step install flow, trust disclosure, configuration, and masked secrets

**Story**: `epic-native-plugin-management-pi-extension-manager-install-trust-flow`
**Depends on**: `epic-native-plugin-management-pi-extension-manager-state-controller`, `epic-native-plugin-management-pi-extension-manager-split-inspector-tui`

**Files**:
- `src/pi/manager/plugin-install-flow.ts`
- `src/pi/manager/plugin-install-component.ts`
- `src/pi/manager/pi-control-input.ts`
- `src/pi/manager/masked-input-overlay.ts`
- `src/pi/manager/confirmation-overlay.ts`
- `test/pi/manager/plugin-install-flow.test.ts`
- `test/pi/manager/pi-control-input.test.ts`
- `test/pi/manager/masked-input-overlay.test.ts`

```typescript
export type PluginInstallStep = "choose-inspect" | "configure-trust" | "activation-result";

export interface PiControlInputPort extends NativeControlInputPort {
  cancel(): void;
  dispose(): void;
}

export class MaskedInputOverlay implements Component, Focusable {
  focused: boolean;
  handleInput(data: string): void;
  render(width: number): string[];
  invalidate(): void;
  dispose(): void;
}

export function createPiControlInputPort(input: Readonly<{
  context: ExtensionCommandContext;
  overlays: PluginManagerOverlayHost;
  mode: ExtensionMode;
}>): PiControlInputPort;
```

Step 1 renders the exact candidate identity/source/revision, concise compatibility summary, complete component counts/verdicts, and one-level expandable inventories from the facade's open/detail envelope. Continue calls canonical `install open` with exact IDs. Step 2 renders required fields and the concise executable risk summary first; skills, exact hook commands, MCP process/endpoints/tools, persistent-data access, limitations, and changes expand one level. It collects fields only when the facade input request asks, binds consent to the supplied exact disclosure/consent ID, and calls `install apply`. Step 3 renders the exact final envelope: succeeded/current/cancelled/failed/partial/recovery-required, component activation evidence, reload/recovery action, and return-to-installed.

Non-sensitive values use fresh `Input`/`Editor` children inside the flow and are held only until `collect` resolves. Sensitive values use `MaskedInputOverlay`: grapheme-aware insertion/backspace/delete/navigation, bracketed paste handling, bullets plus length-independent cursor marker, no plaintext render, no value in errors, and no copy/yank/external-editor route. `Ctrl+C`/Escape cancels according to injected bindings; paste is accepted but never reflected. The overlay passes the value directly into `SensitiveValue`-owning facade input collection, then drops its buffer. It never calls Pi clipboard/editor/session APIs.

Confirmation overlays are fresh instances with exact subject/scope/revision/action summaries. Destructive uninstall data retention, update trust, automatic policy breadth, and project-sync conflicts use the input request's exact decision shapes; the adapter never treats generic confirmation as trust.

**Acceptance criteria**:
- [ ] The flow order and hierarchy match all three signed-off pages; Back preserves non-sensitive form values only while evidence remains current, and any stale evidence clears consent before refresh.
- [ ] All configuration/trust/decision requests and supplied results are exact facade input-port values; presentation adds no defaults, validation rules, or trust/update policy.
- [ ] Secret canaries never occur in component output, Pi messages/entries, command text, completion, progress, diagnostics, errors, clipboard helpers, snapshots, or logs.
- [ ] Cancel at each step returns to the prior stable focus with zero hidden mutation; cancellation during admitted activation shows the owner's stronger committed/rollback/recovery result when present.
- [ ] RPC accepts only supported non-sensitive dialogs/confirmations; sensitive RPC, JSON, print, no-TTY, and disposed overlays return deterministic unavailable/input-required evidence.

### Unit 5: Actions, exact progress, cancellation, stale refresh, and reload handoff

**Story**: `epic-native-plugin-management-pi-extension-manager-actions-progress-reload`
**Depends on**: `epic-native-plugin-management-pi-extension-manager-install-trust-flow`

**Files**:
- `src/pi/manager/plugin-manager-actions.ts`
- `src/pi/manager/plugin-operation-view.ts`
- `src/pi/manager/pi-manager-frame-sink.ts`
- `src/pi/pi-manager-reload-handoff.ts`
- `test/pi/manager/plugin-manager-actions.test.ts`
- `test/pi/manager/plugin-operation-view.test.ts`
- `test/pi/pi-manager-reload-handoff.test.ts`

```typescript
export interface PluginManagerActionRunner {
  run(intent: PluginManagerActionIntent): Promise<NativeControlEnvelope>;
  cancel(): void;
}

export interface PiManagerReloadHandoff {
  open(input: Readonly<{ sessionId: string; cwd: string; destination: PluginManagerDestination }>): PiManagerHandoffTicket;
  claimSuccessor(input: Readonly<{ sessionId: string; cwd: string }>): PiManagerHandoffClaim | undefined;
  publish(ticket: PiManagerHandoffTicket, envelope: NativeControlEnvelope): void;
  fail(ticket: PiManagerHandoffTicket, error: unknown): void;
  closeSession(sessionId: string, reason: SessionShutdownEvent["reason"]): void;
}
```

Enable, disable, update, uninstall, sync, update-policy, notices, marketplace mutations, adoption, recovery, and install actions each compile to one canonical facade command. Preview/confirmation/input and apply remain owner workflow results; the runner never skips preview or retries stale evidence. One active mutation owns the operation view and frame sink. Accepted/progress/result frames display exact sequence, phase, state, code, and safe fields; no progress frame becomes completion evidence. Escape aborts the operation controller once and changes the view to `cancelling`; it does not close until the facade returns an honest envelope. Long progress/result output scrolls and wraps, with detail disclosure rather than raw JSON.

Potentially activating actions open a reload handoff first. Successor `session_start` claims by exact session/cwd, attaches without blocking startup, creates a fresh controller, refreshes authority, and opens `install-result` or `operation-result`. Predecessor code after a claimed reload publishes plain validated data only. Handoffs reject duplicates, wrong sessions/cwd, double claim/publish, and non-JSON-safe data; cleanup is idempotent. No manager component or context crosses reload.

On stale/conflict, preserve the envelope in the result panel, restore focus to the semantic action, refresh affected list/detail/counts, and require a new explicit action. On partial/recovery-required, keep the operation handle/action visible. On broken terminal/render failure, close custom UI, preserve semantic report through the non-TUI Pi-safe channel where possible, and return control to Pi.

**Acceptance criteria**:
- [ ] Every action calls `application.control` inside exactly one admitted Pi operation context and no lower service; command and manager spies observe equivalent commands/progress/envelopes.
- [ ] Concurrent external changes, stale snapshot/candidate/preview/token, no-change, offline, blocked, partial, rollback, recovery-required, and cancellation all render exact facade outcomes with no automatic mutation replay.
- [ ] Progress order/backpressure and cancel semantics match facade frames; long output remains bounded/scrollable and terminal-safe.
- [ ] Reload predecessor never touches stale Pi/session/TUI objects; successor receives only exact safe envelope/destination and starts from fresh authority.
- [ ] Reload failure, no successor, duplicate session, new/resume/fork/quit, and broken terminal leave no unresolved overlay/controller/handoff/process handle.

### Unit 6: Update notification publisher and Pi session/disposal integration

**Story**: `epic-native-plugin-management-pi-extension-manager-notifications-session-lifecycle`
**Depends on**: `epic-native-plugin-management-pi-extension-manager-command-bridge`

**Files**:
- `src/pi/pi-update-notification-publisher.ts`
- `src/pi/plugin-manager-lifecycle.ts`
- `src/pi/extension.ts`
- `test/pi/pi-update-notification-publisher.test.ts`
- `test/pi/plugin-manager-lifecycle.test.ts`

```typescript
export interface PiUpdateNotificationPublisher extends UpdateNotificationPublisherPort {
  bind(context: ExtensionContext): void;
  unbind(reason: SessionShutdownEvent["reason"]): void;
  restore(context: ExtensionContext): void;
  close(): Promise<void>;
}
```

The publisher formats one calm line from typed event fields: plugin, installed → available, and whether manual action is required or automatic application occurred. TUI and RPC call `ctx.ui.notify(..., "info")`; JSON/print throw a stable UI-unavailable adapter error so application publication remains pending. On success, append only `{noticeId}` as a TUI-only custom entry (`plugin-host:update-notified-v1`) after notification; restore scans all current-session entries, not only the active branch, and suppresses exact-ID replay. No version/source/secret/diagnostic content is persisted by the presentation adapter. Authoritative notice publication/unread/unresolved fields still decide whether the publisher is called and what badges show.

Lifecycle handling is explicit:

| Pi event | Presentation action |
|---|---|
| `session_start startup` | bind publisher, restore dedup IDs, detect command collision; manager remains closed |
| `session_start reload` | bind publisher, claim reload handoff, reopen only a claimed result destination |
| `session_start new/resume/fork` | fresh ephemeral manager/controller; restore only that session's notification IDs |
| `resources_discover` | no presentation mutation; existing host remains resource authority |
| `session_shutdown reload` | close UI/overlays/readers, preserve admitted handoff mutation |
| `session_shutdown new/resume/fork/quit` | abort presentation work, clear handoffs for old session, unbind/close publisher |

Theme change is handled by Pi calling component `invalidate`; resize is observed through subsequent `render(width)` and `tui.terminal.rows`. There is no presentation timer/watcher from the extension factory.

**Acceptance criteria**:
- [ ] One newly published revision produces one calm notify and the unresolved manager badge remains until owner state resolves it; replay of the same notice ID in a resumed session is suppressed.
- [ ] No UI context means no false publication success; startup remains offline/non-blocking because background publisher failures are detached owner evidence.
- [ ] startup/reload/new/resume/fork/quit ordering binds exactly one live context and closes all predecessor presentation resources without closing host-owned resources twice.
- [ ] Multiple Pi processes/sessions rely on application state/locks and do not share component/model state; duplicate same-session composition remains rejected.
- [ ] Notification entries contain IDs only and never become update, read, acknowledgment, or mutation authority.

### Unit 7: Integrated Pi 0.80.8, headless, terminal, reload, and packed acceptance

**Story**: `epic-native-plugin-management-pi-extension-manager-integrated-acceptance`
**Depends on**: `epic-native-plugin-management-pi-extension-manager-state-controller`, `epic-native-plugin-management-pi-extension-manager-split-inspector-tui`, `epic-native-plugin-management-pi-extension-manager-actions-progress-reload`, `epic-native-plugin-management-pi-extension-manager-notifications-session-lifecycle`

**Files**:
- `test/integration/pi-plugin-manager-command.test.ts`
- `test/integration/pi-plugin-manager-tui.test.ts`
- `test/integration/pi-plugin-manager-install.test.ts`
- `test/integration/pi-plugin-manager-reload.test.ts`
- `test/integration/pi-plugin-manager-headless.test.ts`
- `test/integration/pi-plugin-manager-security.test.ts`
- `test/fixtures/pi-manager/`
- `test/packed-pi-consumer.mjs`
- `test/compiled-pi-package-import.mjs`
- `test/public-api.test.ts`

Use a typed fake of Pi 0.80.8 `ExtensionAPI`, `ExtensionCommandContext`, `ExtensionUIContext`, TUI terminal, theme, and `KeybindingsManager`, plus compiled-package process tests. Facade/service fixtures remain schema-valid and reuse the signed mock content. Do not duplicate compatibility, lifecycle transaction, update scheduler, or control parser suites.

**Acceptance criteria**:
- [ ] Packaged discovery loads the compiled default extension under Pi 0.80.8, registers `/plugin`, starts local host offline, opens TUI manager on empty arguments, and runs representative canonical/alias subcommands through `application.control` only.
- [ ] Integrated keyboard tests cover focus order, configured bindings, mnemonics, search, pagination, detail expansion, actions, modals, progress cancel, resize, theme invalidation, narrow/reduced-color rendering, and focus restoration.
- [ ] The signed install fixture completes all three steps with exact trust/config input, activation evidence, and reload-successor result; failure/recovery variants preserve owner truth.
- [ ] RPC/JSON/print/no-TTY tests prove no custom TUI or hidden prompt, stable envelope fallback, no raw JSON/RPC corruption, and the documented Pi process-exit limitation.
- [ ] Collision, multiple sessions/processes, external state races, stale IDs/tokens, broken/slow terminal output, long data, offline/degraded/blocked state, reload failure, shutdown, and repeated disposal are deterministic and leak-free.
- [ ] ANSI/OSC/C0/C1/bidi/wide-Unicode, source/path/command strings, secret canaries, clipboard/paste/history, custom-message/session entries, and renderer width undergo adversarial checks.
- [ ] Full `npm test` passes typecheck, dependency boundaries, unit/integration/process tests, build, exact source/compiled export allowlists, and isolated packed consumer without source-tree imports.

## Component and event map

| Component | Pi/API surface | Facade relationship |
|---|---|---|
| Default extension | `default (pi: ExtensionAPI) => void` | constructs host/adapters only |
| `/plugin` adapter | `pi.registerCommand`, `getArgumentCompletions` | passes raw text to parse/run/complete |
| Manager session/controller | `ctx.ui.custom`, `TUI.requestRender`, operation context | invokes canonical control commands only |
| Split-inspector component | `Component`, `Focusable`, injected theme/keybindings | renders reducer state only |
| Input/confirmation overlays | `ctx.ui.custom(..., {overlay:true})`, `OverlayHandle` | implements explicit input port only |
| Frame sink/operation view | `NativeControlFrameSink` | displays accepted/progress/result unchanged |
| Update publisher | `ctx.ui.notify`, `pi.appendEntry` | presentation of authoritative notice only |
| Reload handoff | Pi `session_shutdown`/`session_start` boundary | transfers safe final envelope only |
| Headless channel | print stdout or Pi custom-message events by mode | emits facade frames/envelope; no prompting |

Pi events used are exactly `session_start`, `session_shutdown`, and the host's existing `resources_discover`/runtime delegates. The feature adds no agent/tool/input interception and no global keyboard shortcut. Command handlers alone receive `ExtensionCommandContext` and therefore alone call `runWithPiOperationContext`/reload-capable operations.

## Implementation order and child-story DAG

1. `epic-native-plugin-management-pi-extension-manager-command-bridge`
2. In parallel after the bridge:
   - `epic-native-plugin-management-pi-extension-manager-state-controller`
   - `epic-native-plugin-management-pi-extension-manager-notifications-session-lifecycle`
3. `epic-native-plugin-management-pi-extension-manager-split-inspector-tui` after state/controller
4. `epic-native-plugin-management-pi-extension-manager-install-trust-flow` after state/controller + split inspector
5. `epic-native-plugin-management-pi-extension-manager-actions-progress-reload` after install/trust flow
6. `epic-native-plugin-management-pi-extension-manager-integrated-acceptance` after state/controller + split inspector + actions/reload + notification/lifecycle

One feature owner should normally carry this graph. Stories are durable design/verification checkpoints, not separate UI/application ownership seams.

## Invariants

1. Pi presentation imports the packaged host/control contracts and Pi/TUI types only; it never imports lower management services or domain policy evaluators.
2. `application.control` grammar, schemas, progress, diagnostics, envelopes, exact IDs, cursors, tokens, and exit classifications remain the sole management contract.
3. Raw Pi command argument text reaches the facade lexer unchanged. No shell parsing or secondary command grammar exists.
4. Empty arguments open custom UI only in `ctx.mode === "tui"`; no non-TUI path prompts or constructs a terminal component.
5. Manager state is ephemeral presentation state. It is not plugin/update/operation authority and is not persisted.
6. Every mutation uses exact facade evidence from one current snapshot/preview/session and is never selected by row number or rendered text.
7. A stale/conflict result refreshes and requires renewed intent; presentation never retries mutation automatically.
8. Accepted/progress/completed display is observer state only. Final envelope/activation observation is success authority.
9. Escape/cancel sends one abort and waits for the owner result; committed/partial/rollback/recovery evidence outranks cancellation.
10. Only one foreground mutation runs in a manager; unrelated reads may overlap with latest-intent-wins request IDs.
11. Every custom component/overlay instance is fresh, disposable, and never reused after `done`/close.
12. Theme comes only from Pi callbacks and caches rebuild on `invalidate`; no palette/font/theme setting is owned.
13. Every action is reachable with focus traversal + Enter, meaning is never color-only, and injected configured selection/cancel/page keys are honored.
14. Every render line is width-safe. Untrusted text cannot emit raw ANSI/OSC/C0/C1/bidi controls or alter terminal structure.
15. Sensitive values never enter Pi editor/history/messages/entries, command text, manager state snapshots, completion, progress, diagnostics, logs, or clipboard APIs.
16. RPC secret collection fails closed; JSON/print/no-TTY have no hidden input fallback.
17. Pi duplicate command behavior is reported, not overridden. Duplicate package composition/session ownership still fails closed.
18. Reload is terminal for predecessor UI objects. Successor receives plain safe data only and refreshes authority before rendering.
19. New/resume/fork create fresh presentation state; shutdown closes/aborts owned presentation resources exactly once.
20. No direct stdout write occurs in TUI/RPC/JSON. Print output is bounded, non-ANSI, and facade-derived.

## Failure and presentation matrix

| Condition | Presentation behavior |
|---|---|
| Empty `/plugin`, TUI | open Installed split inspector |
| Empty `/plugin`, RPC/JSON/print | facade `presentation-required` + help; no prompt/custom TUI |
| Parse/usage error | exact safe diagnostics/help; zero manager/service interpretation |
| Missing non-sensitive TUI/RPC input | explicit dialog/flow; cancel returns input-required/cancelled |
| Sensitive input outside TUI | `SECRET_PROMPT_UNAVAILABLE`; no fallback/default |
| Offline/stale reads | retain rows and stale warning; refresh remains explicit |
| Blocked/degraded host/plugin | keep item visible with diagnostics and available safe actions |
| Stale snapshot/cursor/preview/token | show stale result, refresh affected authority, require new intent |
| Concurrent external mutation | exact conflict/no-change/stale result; no retry |
| Long progress/result/detail | bounded scrolling/wrapping and one-level disclosure |
| User cancel before effect | cancelled result and restored focus |
| Cancel after possible effect | owner committed/partial/rollback/recovery result wins |
| Pi reload succeeds | successor opens fresh result destination from exact handoff |
| Pi reload/startup fails | handoff retained for matching restart; host status/recovery remains authoritative |
| Terminal resize/theme change | responsive re-render/invalidation; semantic focus retained |
| Broken terminal/custom renderer | close UI, abort non-committed presentation work, preserve safe report channel where possible |
| Command collision | calm warning with actual `/plugin:N`; no override |
| Session new/resume/fork/quit | dispose old UI/input/read work; no state transfer except authoritative host/session behavior |

## Simplification

- Keep the existing package entry and packaged host; extend them rather than creating a second Pi runtime/composition root.
- Reuse `NativePluginControlService`, its parser/completion registry, input/progress ports, safe fields, exact selectors, envelopes, and operation handles. Add no Pi-specific command grammar or result DTO.
- Use one reducer/controller/component family for installed, updates, browse, and marketplaces; view definitions are data, not four separate screens.
- Use one overlay host and one operation view for install/update/enable/disable/uninstall/sync/policy actions.
- Persist no manager settings, pages, snapshots, form values, or focus. Only notification IDs may use Pi custom entries as a same-session duplicate-publication guard.
- Add no UI database, state watcher, generic TUI framework, custom palette, global shortcuts, business retry, lifecycle wrapper, or terminal escape library.
- Existing source-level `src/pi/extension.ts` construct-only smoke tests should be replaced with command/lifecycle assertions rather than retained as duplicate low-value tests.

## Testing

- **Command boundary**: registration, collisions, raw text, completion, modes, custom-message/print output. Protects Pi/facade parity.
- **Reducer/controller**: intent/event transitions, request races, exact selectors, cursor continuity, stale refresh. Protects ephemeral UI correctness without terminal coupling.
- **Rendering/keyboard**: golden terminal lines and event traces across dimensions, themes, remapped keys, Unicode/control input, focus restoration. Protects usability and terminal integrity.
- **Input/trust**: one integrated happy path plus cancellation, stale consent, sensitive/non-sensitive mode matrix, and secret canaries. Protects the high-risk custody seam.
- **Actions/progress/reload**: exact command parity, ordered frames, cancellation precedence, stale external state, predecessor/successor lifecycle. Protects truthful mutations.
- **Notifications/session**: one notice per ID, unresolved count, mode availability, session replacement/disposal. Protects calm update visibility.
- **Packed acceptance**: compiled Pi 0.80.8 discovery and clean offline startup. Protects distribution, peer dependency, and no-source-import assumptions.
- Do not duplicate facade lexer/property tests, compatibility inventories, lifecycle transaction/recovery, state locking/CAS, update scheduler/idempotence, or secret-store internals.

## Risks

- **Riskiest assumption — safe activation-result continuity across reload**: mitigated by an exact process-local promise handoff and fresh successor controller. If Pi lifecycle timing differs, retain the envelope for the next matching session start and expose authoritative operation/recovery status; never use predecessor objects.
- **Pi command headless output is constrained**: Pi 0.80.8 commands return `void` and cannot set exit status. The design preserves the facade exit in every envelope, uses mode-safe output, and documents process status as Pi-owned. A future Pi API can add an adapter without changing control contracts.
- **Custom TUI complexity can drift toward business logic**: command construction is isolated and every response remains an envelope. Dependency tests forbid lower-service imports; controller tests use facade spies.
- **Secret editing is easy to leak**: masked input is isolated, never uses core editor/session/clipboard paths, and gets structural canary tests. If robust masked entry cannot be guaranteed on a terminal, return `SECRET_PROMPT_UNAVAILABLE` rather than fall back to visible input.
- **Notification exactly-once spans UI and authoritative state**: application publication state is primary; same-session entries close the practical replay window. A crash between notify and publication commit may replay only when no durable Pi-session evidence is available. Do not add a presentation database; keep the notice calm and idempotent by exact ID.
- **Narrow terminals cannot preserve a literal split**: the chosen responsive single-pane translation preserves topology, content, focus, and back navigation rather than squeezing unreadable columns. This is an intentional translation of the signed mock, not a new surface.
- **Dynamic external state can invalidate visible actions**: exact snapshots/previews and no automatic replay turn this into a stale-refresh interaction rather than a wrong mutation.

## Pre-mortem

The feature fails if Pi loads two hosts, `/plugin` silently collides, command text is re-tokenized differently, non-TUI mode opens a prompt, a manager row bypasses the facade, stale list text selects current authority, async reads overwrite newer queries, a secret reaches editor history or terminal output, a color-only state disappears on a reduced terminal, long/untrusted text breaks width or injects controls, Escape hides a committed transition, an overlay steals focus permanently, a reload successor cannot show the true result, a predecessor uses stale context, update notifications repeat noisily, or session shutdown leaves a controller/overlay/background resource alive.

The design counters those failures with existing composition claims, collision disclosure, byte-preserving facade parsing, strict mode gates, dependency boundaries, exact hidden IDs, request generations, isolated masked input, semantic text plus Pi theme tokens, width/control projection, owner-result cancellation precedence, focus restoration, exact reload handoff, successor refresh, authoritative notice state, and idempotent lifecycle disposal.

## Implementation summary

Delivered all seven child checkpoints as one cohesive xhigh feature-owner bundle with direct local grounding and no nested agents. The extension remains a thin outer adapter: default composition creates the existing packaged host, one `/plugin` registration, one facade-only manager family, one update publisher, and one process-local reload handoff. The manager reducer owns only ephemeral presentation state; the controller and action runner call canonical `application.control` requests, retain exact facade evidence, and never import lower management services.

The signed split inspector and three-step install hierarchy were translated without new mocks or palette/font ownership. Wide, medium, and narrow layouts share one semantic-theme renderer and focus model. Configuration and exact executable trust use facade-requested values and expandable disclosure; secrets use a fresh masked TUI component and fail closed everywhere else. Progress/result/cancellation, stale refresh without replay, update notices/badges, command collisions, session replacement, broken render fallback, and reload succession retain facade/host truth.

### Implementation discovery

Pi 0.80.8 gives `session_start` only `ExtensionContext`, while the packaged host deliberately admits control execution only with `ExtensionCommandContext`. The reload successor therefore opens the transferred schema-validated result immediately but does not lie to the type system or reuse the predecessor command context to run an eager facade refresh. It displays no cached authoritative list in that result view; the next `/plugin` manager command creates a fresh controller and refreshes installed/update authority before rendering the manager. This preserves the stricter public-API and no-stale-context invariants instead of using a cast, deep import, or private command dispatch.

## Verification

- `npm test`: passed.
- TypeScript: zero errors.
- Dependency boundaries: 414 modules / 2,962 dependencies, zero violations.
- Vitest: 325 files / 1,589 tests passed.
- Package acceptance: build, 847-source-export allowlist, 3-export Pi subpath allowlist, exact Pi/Pi TUI 0.80.8 metadata, and isolated packed Pi RPC/JSON/PTY acceptance all passed.
- Packed production acceptance proves real command registration, collision identity, manager navigation, install progress/cancellation, reload handoff, and graceful shutdown. Node 24 does not expose an atomic no-replace directory rename, so real production projection honestly returns `PROJECTION_FAILED`; successful projection and reload handoff remain covered at the injected public capability boundary.
- No push or release was performed.

## Implementation run notes

- Ownership: one feature owner for the full seven-story DAG; shared Pi/facade/TUI context made a split less safe and more expensive.
- Capability: GPT-5.6 Sol, xhigh, explicitly requested by the caller.
- Review weight: `standard` from `.work/CONVENTIONS.md`.
- All seven child stories remain `done` after green verification.
- The feature advanced `implementing → review → done` after one independent review pass, receiver adjudication, blocker fixes, and full verification.

## Review blocker remediation

The sole independent `standard` review produced eight receiver-accepted blockers. All were fixed and verified without a repeat review, as required by the caller and the standard single-pass closure policy.

1. **Reason-aware reload handoff and one-shot cancellation**: cancellation now aborts exactly once, waits for owner truth, and preserves completed/committed results; reload succession transfers only safe final data and distinguishes reload from ordinary manager closure.
2. **Fresh destructive confirmations**: every destructive action receives a new confirmation component and current exact evidence, so stale overlays and reused decisions cannot authorize a later mutation.
3. **Production-reachable three-step install journey**: the manager now closes before Pi-owned overlays, runs choose/inspect → configure/trust → activation result through public custom surfaces, reopens from authoritative state, and does not nest unsupported `ctx.ui.custom()` ownership.
4. **Small-terminal scrolling**: manager, install, confirmation, and operation views now retain focused content and expose bounded scrolling instead of clipping actions or results on narrow/short terminals.
5. **Live progress and cancellation**: progress delivery is serialized, rendered while the owner runs, and cancelled through one authoritative signal without converting concurrent valid callbacks or output timing into false failure.
6. **Real packed Pi acceptance**: the isolated consumer now drives packed Pi 0.80.8 through RPC/JSON and PTY surfaces, waits for exact public completion evidence, validates manager/install/collision/reload behavior, and shuts down cleanly without source-tree imports.
7. **Exact status mapping**: the Pi adapter maps every canonical result and exit classification through one exhaustive status boundary instead of inferring success from presentation text.
8. **Exact collision identity**: command collision detection keys the extension by exact `import.meta.url`, reports the actual suffixed command identity, and neither suppresses nor overrides another registration.

Review-fix commits: `58beafd` (install authority, source normalization, expiry validity, and progress serialization), `943f4e2` (manager lifecycle, confirmations, install journey, scrolling, progress, status, collision, and reload behavior), and `12c00f9` (packed Pi 0.80.8 acceptance).

## Review (2026-07-17)

**Verdict**: Approve

**Blockers**: 8 accepted, 8 fixed — reload/cancellation truth; fresh destructive confirmation; production install journey; small-terminal scrolling; live progress/cancellation; genuine packed Pi acceptance; exact status mapping; exact extension collision identity.

**Important**: none.

**Nits**: none.

**Rejected**: none.

**Notes**: Substrate feature review; effective weight `standard` from `.work/CONVENTIONS.md`; one sole independent pass followed by receiver adjudication and fixes. Focused and full verification passed, including 325 files / 1,589 tests, zero type errors, zero dependency violations, package import checks, and packed Pi 0.80.8 RPC/JSON/PTY acceptance. No repeat review, nested agent, push, or release ran. All child stories remain `done`; unresolved material blockers: zero.
