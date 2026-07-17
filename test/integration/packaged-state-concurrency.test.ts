import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fixture = resolve(process.cwd(), "test/fixtures/locking/child-packaged-state.mjs");
const loader = resolve(process.cwd(), "test/fixtures/locking/source-loader.mjs");

function child(agentDir: string, projectRoot: string): Promise<{ kind: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const processHandle = spawn(process.execPath, [
      "--experimental-strip-types",
      "--experimental-transform-types",
      "--loader",
      loader,
      fixture,
      agentDir,
      projectRoot,
    ], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_OPTIONS: "", VITEST: undefined },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    processHandle.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    processHandle.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    processHandle.once("close", (code) => {
      if (code !== 0) rejectPromise(new Error(`state child failed: ${stderr}`));
      else resolvePromise(JSON.parse(stdout.trim()) as { kind: string });
    });
  });
}

describe("packaged state process concurrency", () => {
  it("produces one commit winner and one stale writer", async () => {
    const root = await mkdtemp(join(tmpdir(), "plugin-host-state-process-"));
    try {
      const results = await Promise.all([child(root, root), child(root, root)]);
      expect(results.map((result) => result.kind).sort()).toEqual(["committed", "stale-generation"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
