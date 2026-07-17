import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createPackagedPluginHost, PackagedPluginHostErrorCode } from "../../src/pi/index.js";

function pi() {
  const handlers = new Map<string, Array<(event: unknown, context: unknown) => unknown>>();
  return {
    api: {
      on(name: string, handler: (event: unknown, context: unknown) => unknown) {
        handlers.set(name, [...(handlers.get(name) ?? []), handler]);
      },
      sendMessage() {},
      setSessionName() {},
    },
    handlers,
  };
}
function context(cwd: string, id = "session") {
  return { cwd, mode: "interactive", sessionManager: { getSessionId: () => id, getSessionFile: () => undefined }, isProjectTrusted: () => true };
}

describe("packaged host disposal matrix", () => {
  it("rejects duplicate roots and releases the process-local claim on repeated disposal", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-host-duplicate-"));
    const agentDir = join(root, "agent");
    await mkdir(agentDir);
    const fake = pi();
    const first = createPackagedPluginHost({ pi: fake.api as never, agentDir });
    expect(() => createPackagedPluginHost({ pi: fake.api as never, agentDir })).toThrowError(expect.objectContaining({ code: PackagedPluginHostErrorCode.duplicateComposition }));
    await first.dispose("quit");
    await first.dispose("quit");
    const replacement = createPackagedPluginHost({ pi: fake.api as never, agentDir });
    await replacement.dispose("quit");
    await rm(root, { recursive: true, force: true });
  });

  it("reverse-cleans a partial startup and permits a fresh composition claim", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-host-partial-"));
    const agentDir = join(root, "agent");
    const project = join(root, "project");
    await Promise.all([mkdir(agentDir), mkdir(project)]);
    await writeFile(join(agentDir, "plugin-host"), "not-a-directory");
    const fake = pi();
    const failed = createPackagedPluginHost({ pi: fake.api as never, agentDir });
    await expect(failed.start({ type: "session_start", reason: "startup" } as never, context(project) as never)).rejects.toMatchObject({ code: PackagedPluginHostErrorCode.startupFailed });
    await failed.dispose("quit");
    const replacement = createPackagedPluginHost({ pi: fake.api as never, agentDir });
    await replacement.dispose("quit");
    await rm(root, { recursive: true, force: true });
  });

  it("quiesces shutdown admission but keeps pinned application adapters live until an admitted operation settles", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-host-operation-lease-"));
    const agentDir = join(root, "agent");
    const project = join(root, "project");
    await Promise.all([mkdir(agentDir), mkdir(project)]);
    const fake = pi();
    const bound = context(project);
    const host = createPackagedPluginHost({ pi: fake.api as never, agentDir });
    const started = await host.start({ type: "session_start", reason: "startup" } as never, bound as never);
    let continueOperation!: () => void;
    const operationGate = new Promise<void>((resolve) => { continueOperation = resolve; });
    const operation = host.runWithPiOperationContext(bound as never, new AbortController().signal, async (application) => {
      await operationGate;
      return await application.marketplace.registration.list({ scope: "user", limit: 50 }, new AbortController().signal);
    });

    const shutdown = fake.handlers.get("session_shutdown")?.[0];
    await shutdown?.({ type: "session_shutdown", reason: "reload" }, bound);
    await expect(host.runWithPiOperationContext(bound as never, new AbortController().signal, async () => undefined))
      .rejects.toMatchObject({ code: PackagedPluginHostErrorCode.terminal });
    continueOperation();
    await expect(operation).resolves.toEqual({ registrations: [] });
    await host.dispose("reload");
    await expect(started.application.recovery.recover({ requiredScopes: [{ kind: "user" }] }, new AbortController().signal)).rejects.toBeDefined();
    await rm(root, { recursive: true, force: true });
  }, 30_000);
});
