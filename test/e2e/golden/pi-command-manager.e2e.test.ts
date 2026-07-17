import { afterEach, describe, expect, it } from "vitest";
import { cleanupSandbox, createCleanE2ESandbox, type CleanE2ESandbox } from "../harness/environment.js";
import { seedRemoteMarketplace, startPackedRpc } from "../harness/journey.js";
import { PiPtyProcess } from "../harness/pi-pty.js";
import { diagnosePtyCapability } from "../harness/faults.js";
import { runChecked } from "../harness/process.js";

let sandbox: CleanE2ESandbox | undefined;
afterEach(async () => {
  if (sandbox !== undefined) await cleanupSandbox(sandbox);
  sandbox = undefined;
});

describe("packed headless and native Pi manager parity", () => {
  it("returns presentation-required in RPC and bounded facade text in print mode", async () => {
    sandbox = await createCleanE2ESandbox("golden-headless-parity");
    const rpc = await startPackedRpc(sandbox);
    const presentation = await rpc.plugin("", "presentation");
    expect(presentation.envelope).toMatchObject({ status: "presentation-required", exit: { code: 3 } });
    await rpc.shutdown();

    const printed = await runChecked(sandbox.capabilities.node, [
      sandbox.piCli,
      "--offline", "--approve", "--no-prompt-templates", "--no-themes", "--no-context-files",
      "--mode", "text", "--print", "--no-session", "/plugin status",
    ], { cwd: sandbox.project, env: sandbox.env, timeoutMs: 30_000 });
    const userOutput = `${printed.stdout}${printed.stderr}`;
    expect(userOutput).toContain("Show local host status");
    expect(userOutput).not.toContain("\u001b");
    expect(userOutput.length).toBeLessThan(65_536);
  });

  it("opens the real manager at wide and narrow dimensions with keyboard-only navigation", async () => {
    sandbox = await createCleanE2ESandbox("golden-native-manager");
    const ptyCapability = await diagnosePtyCapability(sandbox);
    if (!ptyCapability.available) {
      expect(ptyCapability.reason).toContain("util-linux PTY capability missing");
      return;
    }
    const journey = await seedRemoteMarketplace(sandbox);
    await journey.rpc.shutdown();

    const wide = await PiPtyProcess.start({ sandbox, columns: 120, rows: 30 });
    const start = wide.mark();
    wide.send("/plugin\r");
    await wide.waitFor("PI / PLUGINS", start, 60_000);
    const browse = wide.mark();
    wide.send("\u001b[C\u001b[C");
    await wide.waitFor("Browse", browse);
    await wide.waitFor("core-local", browse, 60_000);
    wide.send("?\u001b");
    wide.send("\u001b\u0004");
    await wide.shutdown();

    const narrow = await PiPtyProcess.start({ sandbox, columns: 58, rows: 24 });
    const narrowStart = narrow.mark();
    narrow.send("/plugin\r");
    const output = await narrow.waitFor("PI / PLUGINS", narrowStart, 60_000);
    expect(output.slice(narrowStart)).toContain("Installed");
    expect(output.slice(narrowStart)).toContain("Updates");
    expect(output.slice(narrowStart)).toContain("Browse");
    expect(output.slice(narrowStart)).toContain("Marketplaces");
    narrow.send("\u001b\u0004");
    await narrow.shutdown();
  });

  it.fails("renders all signed install steps through the real PTY [idea-fix-packed-candidate-inspection, idea-production-projection-publication]", async () => {
    sandbox = await createCleanE2ESandbox("golden-native-install-xfail");
    const ptyCapability = await diagnosePtyCapability(sandbox);
    if (!ptyCapability.available) throw new Error(ptyCapability.reason);
    const journey = await seedRemoteMarketplace(sandbox);
    await journey.rpc.shutdown();
    const pty = await PiPtyProcess.start({ sandbox, columns: 120, rows: 30 });
    let mark = pty.mark();
    pty.send("/plugin\r");
    await pty.waitFor("PI / PLUGINS", mark, 60_000);
    mark = pty.mark();
    pty.send("\u001b[C\u001b[C");
    await pty.waitFor("core-local", mark, 60_000);
    pty.send("\t\t\r");
    await pty.waitFor("Component inventory", mark, 60_000);
    mark = pty.mark();
    pty.send("\t\t\u001b[B\r");
    await pty.waitFor("Step 1/3 · Choose and inspect", mark, 60_000);
    mark = pty.mark();
    pty.send("\r");
    await pty.waitFor("Step 2/3 · Configure and trust", mark, 60_000);
    pty.send("e2e-value\r");
    mark = pty.mark();
    await pty.waitFor("Step 3/3 · Activation result", mark, 90_000);
    expect(pty.semanticOutput().slice(mark)).toContain("succeeded");
    await pty.shutdown();
  });
});
