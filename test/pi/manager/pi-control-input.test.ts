import { describe, expect, it, vi } from "vitest";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { withSensitiveValue } from "../../../src/application/sensitive-value.js";
import type { NativeControlInputRequest } from "../../../src/application/ports/native-control-input.js";
import { createPiControlInputPort } from "../../../src/pi/manager/pi-control-input.js";

const executionId = "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" as never;
const canary = "SECRET-CANARY-123";
const safe = (text: string) => ({ text, escaped: false, truncated: false });
const field = (sensitive: boolean) => ({
  key: sensitive ? "TOKEN" : "DIRECTORY",
  label: safe(sensitive ? "API token" : "Audit directory"),
  kind: "string" as const,
  required: true,
  sensitive,
  defaultPresent: false,
  constraints: {},
  state: "missing" as const,
});
const consentId = `trusted-install-consent-v1:sha256:${"a".repeat(64)}`;

function request(fields: readonly ReturnType<typeof field>[]): NativeControlInputRequest {
  return {
    executionId,
    purpose: "trusted-install",
    channel: { kind: "none" },
    fields,
    consent: { consentId, statement: safe("Trust exact revision") } as never,
    expected: { consentId },
  };
}

function context(mode: "tui" | "rpc" | "json" | "print") {
  const input = vi.fn(async () => "/audit");
  const custom = vi.fn(async (factory: any) => await new Promise((resolve) => {
    const component = factory(
      { terminal: { rows: 20 }, requestRender() {} },
      { fg: (_token: string, text: string) => text, bold: (text: string) => text },
      { matches: (data: string, id: string) => id.includes("confirm") ? data === "\r" : id.includes("cancel") || id === "app.interrupt" ? data === "\u001b" : false },
      resolve,
    );
    component.focused = true;
    if (component.constructor.name === "MaskedInputOverlay") component.handleInput(canary);
    component.handleInput("\r");
  }));
  const ctx = {
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    ui: {
      input,
      custom,
      confirm: vi.fn(async () => true),
      select: vi.fn(async () => "keep"),
      setEditorText: vi.fn(),
      pasteToEditor: vi.fn(),
    },
  } as unknown as ExtensionCommandContext;
  return { ctx, input, custom };
}

describe("Pi control input adapter", () => {
  it("collects non-sensitive and masked sensitive values with exact consent", async () => {
    const h = context("tui");
    const port = createPiControlInputPort({ context: h.ctx, mode: "tui" });
    const result = await port.collect(request([field(false), field(true)]), new AbortController().signal);
    expect(result).toMatchObject({ kind: "supplied", nonSensitive: [{ key: "DIRECTORY", value: "/audit" }], decision: { kind: "grant", consentId } });
    if (result.kind !== "supplied") throw new Error("expected supplied");
    expect(withSensitiveValue(result.sensitive[0]!.value, (plaintext) => plaintext)).toBe(canary);
    expect(JSON.stringify(result)).not.toContain(canary);
    expect((h.ctx.ui as any).setEditorText).not.toHaveBeenCalled();
    expect((h.ctx.ui as any).pasteToEditor).not.toHaveBeenCalled();
    port.dispose();
  });

  it("fails closed for RPC secrets before opening any dialog", async () => {
    const h = context("rpc");
    const port = createPiControlInputPort({ context: h.ctx, mode: "rpc" });
    await expect(port.collect(request([field(true)]), new AbortController().signal)).resolves.toEqual({ kind: "unavailable", code: "SECRET_PROMPT_UNAVAILABLE" });
    expect(h.input).not.toHaveBeenCalled();
    expect(h.custom).not.toHaveBeenCalled();
  });

  it("does not reinterpret explicit file/stdin/environment input channels", async () => {
    const h = context("tui");
    const port = createPiControlInputPort({ context: h.ctx, mode: "tui" });
    const explicit = { ...request([field(false)]), channel: { kind: "file-json" as const, locator: "/tmp/input.json" } };
    await expect(port.collect(explicit, new AbortController().signal)).resolves.toEqual({ kind: "unavailable", code: "CHANNEL_UNSUPPORTED" });
    expect(h.input).not.toHaveBeenCalled();
  });

  it.each(["json", "print"] as const)("never prompts in %s mode", async (mode) => {
    const h = context(mode);
    const port = createPiControlInputPort({ context: h.ctx, mode });
    await expect(port.collect(request([field(false)]), new AbortController().signal)).resolves.toEqual({ kind: "unavailable", code: "NO_TTY" });
    expect(h.input).not.toHaveBeenCalled();
    expect(h.custom).not.toHaveBeenCalled();
  });

  it("cancellation/disposal wins without partial input", async () => {
    const h = context("tui");
    const port = createPiControlInputPort({ context: h.ctx, mode: "tui" });
    port.cancel();
    await expect(port.collect(request([field(false)]), new AbortController().signal)).resolves.toEqual({ kind: "cancelled" });
    port.dispose();
    port.dispose();
  });
});
