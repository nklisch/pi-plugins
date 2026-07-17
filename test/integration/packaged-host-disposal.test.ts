import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createPackagedPluginHost, PackagedPluginHostErrorCode } from "../../src/pi/index.js";

function pi() {
  return {
    on() {},
    sendMessage() {},
    setSessionName() {},
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
    const api = pi();
    const first = createPackagedPluginHost({ pi: api as never, agentDir });
    expect(() => createPackagedPluginHost({ pi: api as never, agentDir })).toThrowError(expect.objectContaining({ code: PackagedPluginHostErrorCode.duplicateComposition }));
    await first.dispose("quit");
    await first.dispose("quit");
    const replacement = createPackagedPluginHost({ pi: api as never, agentDir });
    await replacement.dispose("quit");
    await rm(root, { recursive: true, force: true });
  });

  it("reverse-cleans a partial startup and permits a fresh composition claim", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-host-partial-"));
    const agentDir = join(root, "agent");
    const project = join(root, "project");
    await Promise.all([mkdir(agentDir), mkdir(project)]);
    await writeFile(join(agentDir, "plugin-host"), "not-a-directory");
    const api = pi();
    const failed = createPackagedPluginHost({ pi: api as never, agentDir });
    await expect(failed.start({ type: "session_start", reason: "startup" } as never, context(project) as never)).rejects.toMatchObject({ code: PackagedPluginHostErrorCode.startupFailed });
    await failed.dispose("quit");
    const replacement = createPackagedPluginHost({ pi: api as never, agentDir });
    await replacement.dispose("quit");
    await rm(root, { recursive: true, force: true });
  });
});
