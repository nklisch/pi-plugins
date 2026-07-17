import type {
  TrustedInstallActivationResult,
  TrustedInstallSessionView,
} from "../../application/trusted-install-contract.js";
import type { NativeInspectionDetail } from "../../application/native-inspection-contract.js";

export type PluginInstallStep = "choose-inspect" | "configure-trust" | "activation-result";

export type PluginInstallState = Readonly<{
  step: PluginInstallStep;
  candidate: NativeInspectionDetail;
  session?: TrustedInstallSessionView;
  result?: TrustedInstallActivationResult;
  disclosure: ReadonlySet<string>;
  consentId?: string;
}>;

export type PluginInstallEvent =
  | Readonly<{ type: "session-opened"; session: TrustedInstallSessionView }>
  | Readonly<{ type: "activation-result"; result: TrustedInstallActivationResult }>
  | Readonly<{ type: "toggle-disclosure"; key: string }>
  | Readonly<{ type: "consent"; consentId: string }>
  | Readonly<{ type: "back" }>
  | Readonly<{ type: "authority-stale" }>;

export function createPluginInstallState(candidate: NativeInspectionDetail): PluginInstallState {
  return Object.freeze({ step: "choose-inspect", candidate, disclosure: new Set<string>() });
}

export function pluginInstallReducer(state: PluginInstallState, event: PluginInstallEvent): PluginInstallState {
  if (event.type === "session-opened") {
    const { result: _result, consentId: _consentId, ...rest } = state;
    return Object.freeze({ ...rest, step: "configure-trust", session: event.session, disclosure: new Set<string>() });
  }
  if (event.type === "activation-result") {
    const { consentId: _consentId, ...rest } = state;
    return Object.freeze({ ...rest, step: "activation-result", result: event.result });
  }
  if (event.type === "toggle-disclosure") {
    const disclosure = new Set(state.disclosure);
    if (disclosure.has(event.key)) disclosure.delete(event.key); else disclosure.add(event.key);
    return Object.freeze({ ...state, disclosure });
  }
  if (event.type === "consent") return Object.freeze({ ...state, consentId: event.consentId });
  if (event.type === "back") {
    if (state.step === "activation-result") return Object.freeze({ ...state, step: state.session === undefined ? "choose-inspect" : "configure-trust" });
    const { consentId: _consentId, ...rest } = state;
    return Object.freeze({ ...rest, step: "choose-inspect" });
  }
  return Object.freeze({ step: "choose-inspect", candidate: state.candidate, disclosure: new Set<string>() });
}
