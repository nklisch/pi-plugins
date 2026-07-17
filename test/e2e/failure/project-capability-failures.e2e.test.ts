import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { E2E_SECRET_CANARY } from "../harness/constants.js";
import { cleanupSandbox, createCleanE2ESandbox, installPackedProduct, type CleanE2ESandbox } from "../harness/environment.js";
import { seedRemoteMarketplace, startPackedRpc } from "../harness/journey.js";
import { PiRpcProcess } from "../harness/pi-rpc.js";
import { runChecked } from "../harness/process.js";
import { scanForbiddenValues } from "../harness/state-inspector.js";

let sandbox: CleanE2ESandbox | undefined;
afterEach(async () => {
  if (sandbox !== undefined) await cleanupSandbox(sandbox);
  sandbox = undefined;
});

async function commitProject(sandbox: CleanE2ESandbox, marker: string): Promise<void> {
  await writeFile(join(sandbox.project, "identity.txt"), `${marker}\n`);
  await runChecked(sandbox.capabilities.git, ["init", "--quiet", "-b", "main"], { cwd: sandbox.project, env: sandbox.env });
  await runChecked(sandbox.capabilities.git, ["add", "."], { cwd: sandbox.project, env: sandbox.env });
  await runChecked(sandbox.capabilities.git, ["commit", "--quiet", "-m", marker], { cwd: sandbox.project, env: sandbox.env });
}

describe("packed project trust, foreign state, and unavailable capabilities", () => {
  it("blocks project mutation after repository replacement/no-approve while user reads stay usable", async () => {
    sandbox = await createCleanE2ESandbox("failure-project-replacement");
    await commitProject(sandbox, "first identity");
    const trusted = await startPackedRpc(sandbox);
    expect((await trusted.plugin("--non-interactive status", "status")).envelope.status).toBe("ok");
    await trusted.shutdown();

    await rm(join(sandbox.project, ".git"), { recursive: true });
    await commitProject(sandbox, "replacement identity");
    const untrusted = await PiRpcProcess.start({ sandbox, approve: false });
    const blocked = await untrusted.plugin("--non-interactive project sync --mode publish-intent", "project.sync");
    expect(blocked.envelope.status).toMatch(/blocked|failed|unavailable|rejected/u);
    expect(JSON.stringify(blocked.envelope)).toMatch(/PROJECT|TRUST/u);
    const user = await untrusted.plugin("--non-interactive list --scope user", "inspection.list");
    expect(user.envelope.status).toBe("ok");
    expect(user.envelope.data.items).toEqual([]);
    await untrusted.shutdown();
  });

  it("reads Claude/Codex adoption state without mutating bytes or importing credentials/trust", async () => {
    sandbox = await createCleanE2ESandbox("failure-foreign-readonly");
    await installPackedProduct(sandbox);
    const claude = join(sandbox.home, ".claude", "plugins", "known_marketplaces.json");
    const codex = join(sandbox.home, ".codex", "config.toml");
    await Promise.all([mkdir(join(claude, ".."), { recursive: true }), mkdir(join(codex, ".."), { recursive: true })]);
    const claudeBytes = Buffer.from(`{"fixture":{"source":{"source":"github","repo":"owner/repo"}},"credential":"${E2E_SECRET_CANARY}"}\n`);
    const codexBytes = Buffer.from(`[plugins.fixture]\nsource = "https://example.invalid/repo.git"\ncredential = "${E2E_SECRET_CANARY}"\n`);
    await Promise.all([writeFile(claude, claudeBytes), writeFile(codex, codexBytes)]);
    const rpc = await PiRpcProcess.start({ sandbox });
    const preview = await rpc.plugin("--non-interactive marketplace adopt preview --scope all-current", "marketplace.adopt.preview");
    expect(preview.envelope.status).toMatch(/ok|no-change/u);
    expect(await readFile(claude)).toEqual(claudeBytes);
    expect(await readFile(codex)).toEqual(codexBytes);
    expect(JSON.stringify(preview)).not.toContain(E2E_SECRET_CANARY);
    const marketplaces = await rpc.plugin("--non-interactive marketplace list --scope user", "marketplace.list");
    expect(marketplaces.envelope.data.registrations).toEqual([]);
    await rpc.shutdown();
  });

  it.fails("reports exact secret/MCP/subagent/incompatible candidate diagnostics [idea-fix-packed-candidate-inspection]", async () => {
    sandbox = await createCleanE2ESandbox("failure-capability-diagnostics-xfail");
    const journey = await seedRemoteMarketplace(sandbox);
    const expected = new Map([
      ["secret-required", "SECRET_CUSTODY_UNAVAILABLE"],
      ["mcp-required", "MCP"],
      ["subagent-required", "SUBAGENT"],
      ["incompatible", "INCOMPATIBLE"],
    ]);
    for (const [name, code] of expected) {
      const detail = await journey.rpc.plugin(`--non-interactive show ${name}@native-e2e-market --scope user`, "inspection.show");
      expect(detail.envelope.status).toBe("ok");
      expect(JSON.stringify(detail.envelope.data)).toContain(code);
    }
    const installed = await journey.rpc.plugin("--non-interactive list --scope user", "inspection.list");
    expect(installed.envelope.data.items).toEqual([]);
    await scanForbiddenValues(sandbox.agentDir, [E2E_SECRET_CANARY]);
    await journey.rpc.shutdown();
  });
});
