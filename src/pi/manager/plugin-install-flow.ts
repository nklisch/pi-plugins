import type {
  TrustedInstallActivationResult,
  TrustedInstallSessionView,
} from "../../application/trusted-install-contract.js";
import type { NativeInspectionDetail } from "../../application/native-inspection-contract.js";
import type { NativeControlFrame } from "../../application/native-control-progress.js";

export type PluginInstallStep = "choose-inspect" | "configure-trust" | "activation-result";
export type PluginInstallFocus = "back" | "continue" | "disclosure" | Readonly<{ field: string }>;

export type PluginInstallState = Readonly<{
  step: PluginInstallStep;
  candidate: NativeInspectionDetail;
  session?: TrustedInstallSessionView;
  result?: TrustedInstallActivationResult;
  disclosure: ReadonlySet<string>;
  consentId?: string;
  values: Readonly<Record<string, unknown>>;
  focus: PluginInstallFocus;
  scroll: Readonly<{ content: number; disclosure: number }>;
  submission: "apply" | "recover";
  busy: boolean;
  frames: readonly NativeControlFrame[];
}>;

export type PluginInstallEvent =
  | Readonly<{ type: "session-opened"; session: TrustedInstallSessionView; submission?: "apply" | "recover" }>
  | Readonly<{ type: "activation-result"; result: TrustedInstallActivationResult }>
  | Readonly<{ type: "toggle-disclosure"; key: string }>
  | Readonly<{ type: "consent"; consentId: string }>
  | Readonly<{ type: "set-value"; key: string; value: unknown }>
  | Readonly<{ type: "focus"; focus: PluginInstallFocus }>
  | Readonly<{ type: "scroll"; region: "content" | "disclosure"; delta: number }>
  | Readonly<{ type: "busy"; value: boolean }>
  | Readonly<{ type: "frame"; frame: NativeControlFrame }>
  | Readonly<{ type: "back" }>
  | Readonly<{ type: "authority-stale" }>;

export function createPluginInstallState(candidate: NativeInspectionDetail): PluginInstallState {
  return Object.freeze({
    step: "choose-inspect",
    candidate,
    disclosure: new Set<string>(),
    values: Object.freeze({}),
    focus: "continue",
    scroll: Object.freeze({ content: 0, disclosure: 0 }),
    submission: "apply",
    busy: false,
    frames: Object.freeze([]),
  });
}

export function pluginInstallReducer(state: PluginInstallState, event: PluginInstallEvent): PluginInstallState {
  if (event.type === "session-opened") {
    const evidenceCurrent = state.session === undefined || state.session.consent.consentId === event.session.consent.consentId &&
      state.session.binding.contentDigest === event.session.binding.contentDigest;
    const { result: _result, consentId: _consentId, ...rest } = state;
    return Object.freeze({
      ...rest,
      step: "configure-trust",
      session: event.session,
      disclosure: new Set<string>(),
      values: evidenceCurrent ? state.values : Object.freeze({}),
      focus: event.session.fields[0] === undefined ? "disclosure" : Object.freeze({ field: event.session.fields[0].key }),
      scroll: Object.freeze({ content: 0, disclosure: 0 }),
      submission: event.submission ?? state.submission,
      busy: false,
      frames: Object.freeze([]),
    });
  }
  if (event.type === "activation-result") {
    const { consentId: _consentId, ...rest } = state;
    const stale = event.result.kind === "stale" || event.result.kind === "conflict";
    if (stale) {
      const { session: _session, ...withoutStaleAuthority } = rest;
      return Object.freeze({
        ...withoutStaleAuthority,
        step: "activation-result",
        result: event.result,
        values: Object.freeze({}),
        focus: "continue",
        scroll: Object.freeze({ content: 0, disclosure: 0 }),
        busy: false,
      });
    }
    return Object.freeze({ ...rest, step: "activation-result", result: event.result, focus: "continue", scroll: Object.freeze({ content: 0, disclosure: 0 }), busy: false });
  }
  if (event.type === "toggle-disclosure") {
    const disclosure = new Set(state.disclosure);
    if (disclosure.has(event.key)) disclosure.delete(event.key); else disclosure.add(event.key);
    const { consentId: _consentId, ...rest } = state;
    return Object.freeze({ ...rest, disclosure, scroll: Object.freeze({ ...state.scroll, disclosure: 0 }) });
  }
  if (event.type === "consent") return Object.freeze({ ...state, consentId: event.consentId });
  if (event.type === "set-value") return Object.freeze({ ...state, values: Object.freeze({ ...state.values, [event.key]: event.value }) });
  if (event.type === "focus") return Object.freeze({ ...state, focus: event.focus });
  if (event.type === "scroll") return Object.freeze({ ...state, scroll: Object.freeze({ ...state.scroll, [event.region]: Math.max(0, state.scroll[event.region] + event.delta) }) });
  if (event.type === "busy") return Object.freeze({ ...state, busy: event.value, ...(event.value ? { frames: Object.freeze([]) } : {}) });
  if (event.type === "frame") return Object.freeze({ ...state, frames: Object.freeze([...state.frames.slice(-199), event.frame]) });
  if (event.type === "back") {
    if (state.step === "activation-result") return Object.freeze({ ...state, step: state.session === undefined ? "choose-inspect" : "configure-trust", focus: "continue", scroll: Object.freeze({ content: 0, disclosure: 0 }) });
    if (state.step === "configure-trust") {
      const { consentId: _consentId, ...rest } = state;
      return Object.freeze({ ...rest, step: "choose-inspect", focus: "continue", disclosure: new Set<string>(), scroll: Object.freeze({ content: 0, disclosure: 0 }), busy: false });
    }
    return state;
  }
  if (event.type === "authority-stale") {
    return Object.freeze({ ...createPluginInstallState(state.candidate), values: Object.freeze({}) });
  }
  return state;
}
