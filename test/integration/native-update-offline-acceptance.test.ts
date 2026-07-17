import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createPackagedPluginHost } from "../../src/composition/create-packaged-plugin-host.js";

function pi() {
  return {
    on() {},
    sendMessage() {},
    setSessionName() {},
  };
}

function context(cwd: string, sessionId: string) {
  return {
    cwd,
    mode: "interactive",
    sessionManager: { getSessionId: () => sessionId, getSessionFile: () => undefined },
    isProjectTrusted: () => true,
  };
}

describe("native update offline packaged acceptance", () => {
  it("starts without network, applies policy through the facade, persists it across restart, and shuts down cleanly", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-native-update-offline-"));
    const agentDir = join(root, "agent");
    const project = join(root, "project");
    await Promise.all([mkdir(agentDir), mkdir(project)]);
    const firstContext = context(project, "offline-acceptance-1");
    const first = createPackagedPluginHost({ pi: pi() as never, agentDir });
    const started = await first.start({ type: "session_start", reason: "startup" } as never, firstContext as never);
    expect(started.startup).toMatchObject({ status: "ready", capabilities: { mcp: { status: "unavailable" }, subagents: { status: "unavailable" } } });

    await first.runWithPiOperationContext(firstContext as never, new AbortController().signal, async (application) => {
      const change = { kind: "application" as const, target: { kind: "global" as const }, mode: "automatic" as const };
      const preview = await application.updates.previewPolicy(change, new AbortController().signal);
      expect(preview.kind).toBe("previewed");
      if (preview.kind !== "previewed") return;
      await expect(application.updates.applyPolicy({
        change,
        expectedPreviewId: preview.preview.previewId,
        consent: { kind: "grant", consentId: preview.preview.consent.consentId! },
      }, new AbortController().signal)).resolves.toMatchObject({ kind: "changed" });
      await expect(application.updates.status({ scope: "all-current" }, new AbortController().signal)).resolves.toMatchObject({
        policy: { global: { application: "automatic" } },
        unreadCount: 0,
        unresolvedCount: 0,
      });
      await expect(application.updates.runAutomatic({ limit: 10 }, new AbortController().signal)).resolves.toEqual({ outcomes: [] });
    });
    await first.dispose("reload");

    const secondContext = context(project, "offline-acceptance-2");
    const second = createPackagedPluginHost({ pi: pi() as never, agentDir });
    const restarted = await second.start({ type: "session_start", reason: "startup" } as never, secondContext as never);
    expect(restarted.startup.status).toBe("ready");
    await second.runWithPiOperationContext(secondContext as never, new AbortController().signal, async (application) => {
      await expect(application.updates.status({ scope: "all-current" }, new AbortController().signal)).resolves.toMatchObject({
        policy: { global: { application: "automatic" } },
        unreadCount: 0,
        unresolvedCount: 0,
      });
    });
    await second.dispose("quit");
    await rm(root, { recursive: true, force: true });
  }, 30_000);
});
