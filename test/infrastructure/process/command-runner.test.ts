import { execPath } from "node:process";
import { describe, expect, it } from "vitest";
import {
  CommandRunnerError,
  createNodeCommandRunner,
} from "../../../src/infrastructure/process/command-runner.js";
import { redactCommand, redactEnvironment, redactText } from "../../../src/infrastructure/logging/redaction.js";

describe("argument-array command runner", () => {
  it("passes arguments literally without a shell and captures stderr", async () => {
    const result = await createNodeCommandRunner().run({
      executable: execPath,
      args: ["-e", "process.stdout.write(process.argv[1]); process.stderr.write('diagnostic')", "$(not-a-command)"],
      cwd: process.cwd(),
      stdout: "capture",
      maxCapturedBytes: 1024,
    }, new AbortController().signal);

    expect(new TextDecoder().decode(result.stdout as Uint8Array)).toBe("$(not-a-command)");
    expect(new TextDecoder().decode(result.stderr)).toBe("diagnostic");
    expect(result.exitCode).toBe(0);
  });

  it("rejects output over the configured capture limit after draining and killing", async () => {
    await expect(createNodeCommandRunner({ killGraceMs: 0 }).run({
      executable: execPath,
      args: ["-e", "process.stdout.write('too much'); setInterval(() => {}, 1000)"],
      cwd: process.cwd(),
      stdout: "capture",
      maxCapturedBytes: 3,
    }, new AbortController().signal)).rejects.toBeInstanceOf(CommandRunnerError);
  });

  it("terminates a running process and preserves the caller's abort reason", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    const running = createNodeCommandRunner({ killGraceMs: 0 }).run({
      executable: execPath,
      args: ["-e", "setInterval(() => process.stdout.write('x'), 10)"],
      cwd: process.cwd(),
      stdout: "stream",
      maxCapturedBytes: 1024,
    }, controller.signal);
    setTimeout(() => controller.abort(reason), 30).unref();
    await expect(running).rejects.toBe(reason);
  });
});

describe("structured redaction", () => {
  it("removes explicit and structural credential forms", () => {
    const secret = "recognizable-secret";
    expect(redactText(`https://user:${secret}@example.test/x?token=${secret} Bearer ${secret}`, [secret])).not.toContain(secret);
    expect(redactCommand("git", ["fetch", `https://user:${secret}@example.test/repo`], [secret]).args.join(" ")).not.toContain(secret);
    expect(redactEnvironment({ API_TOKEN: secret, HOME: "/tmp" }, [secret]).API_TOKEN).toBe("[REDACTED]");
  });
});
