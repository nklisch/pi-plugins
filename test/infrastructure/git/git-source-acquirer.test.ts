import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createResolvedMarketplaceSource,
  type Sha256,
} from "../../../src/domain/source.js";
import { createSecureContentWriterFactory } from "../../../src/infrastructure/filesystem/secure-content-writer.js";
import { createTarReader } from "../../../src/infrastructure/archive/tar-reader.js";
import {
  createGitSourceAcquirer,
  type GitSourceAcquirerOptions,
} from "../../../src/infrastructure/git/git-source-acquirer.js";
import {
  createNodeCommandRunner,
  type CommandRequest,
  type CommandResult,
  type CommandRunner,
} from "../../../src/infrastructure/process/command-runner.js";

const execFile = promisify(execFileCallback);
const sha256: Sha256 = (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = (): AbortSignal => new AbortController().signal;
const roots: string[] = [];

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const result = await execFile("git", [...args], { cwd, encoding: "utf8" });
  return result.stdout.trim();
}

async function repository(): Promise<Readonly<{ root: string; first: string; second: string }>> {
  const root = await mkdtemp(join(tmpdir(), "pi-git-fixture-"));
  roots.push(root);
  await git(root, ["init", "--quiet", "-b", "main"]);
  await git(root, ["config", "user.email", "fixture@example.test"]);
  await git(root, ["config", "user.name", "fixture"]);
  await mkdir(join(root, "packages", "demo"), { recursive: true });
  await writeFile(join(root, "README.md"), "first\n", "utf8");
  await writeFile(join(root, "packages", "demo", "plugin.json"), "{\"name\":\"demo\"}\n", "utf8");
  await git(root, ["add", "."]);
  await git(root, ["commit", "--quiet", "-m", "first"]);
  const first = await git(root, ["rev-parse", "HEAD"]);
  await git(root, ["branch", "release"]);
  await git(root, ["tag", "lightweight"]);
  await git(root, ["tag", "--annotate", "annotated", "--message", "annotated"]);
  await writeFile(join(root, "README.md"), "second\n", "utf8");
  await git(root, ["add", "."]);
  await git(root, ["commit", "--quiet", "-m", "second"]);
  const second = await git(root, ["rev-parse", "HEAD"]);
  return { root, first, second };
}

async function sink(root: string) {
  return createSecureContentWriterFactory({ sha256 }).open({ root });
}

function acquirer(overrides: Partial<GitSourceAcquirerOptions> = {}) {
  return createGitSourceAcquirer({
    command: createNodeCommandRunner(),
    archive: createTarReader(),
    sha256,
    ...overrides,
  });
}

function localizingCommand(real: CommandRunner, localRoot: string, calls: CommandRequest[] = []): CommandRunner {
  return {
    async run(request, abortSignal): Promise<CommandResult> {
      calls.push(request);
      const args = request.args[0] === "remote" && request.args[1] === "add"
        ? [...request.args.slice(0, -1), localRoot]
        : request.args;
      return real.run({ ...request, args }, abortSignal);
    },
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Git source acquisition", () => {
  it("resolves HEAD, branches, lightweight/annotated tags, and archives objects without .git", async () => {
    const fixture = await repository();
    for (const ref of [undefined, "main", "lightweight", "annotated"]) {
      const destination = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
      roots.push(destination);
      const content = await sink(destination);
      const result = await acquirer().materializeMarketplace({ kind: "local-git", path: fixture.root, ...(ref === undefined ? {} : { ref }) }, content, signal());
      expect(result.revision).toMatch(/^[0-9a-f]{40}$/);
      expect(await readFile(join((await content.finalize(signal())).root, "README.md"), "utf8")).toMatch(/first|second/);
      expect(await readdir(join(destination, "content"))).not.toContain(".git");
      await content.abort();
    }
  });

  it("rejects branch/tag ambiguity and honors an authoritative SHA without querying ref", async () => {
    const fixture = await repository();
    await git(fixture.root, ["tag", "release"]);
    const ambiguousRoot = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(ambiguousRoot);
    const ambiguousSink = await sink(ambiguousRoot);
    await expect(acquirer().materializeMarketplace({ kind: "local-git", path: fixture.root, ref: "release" }, ambiguousSink, signal())).rejects.toMatchObject({
      code: "SOURCE_RESOLUTION_FAILED",
      classification: "permanent",
    });
    await ambiguousSink.abort();

    const calls: CommandRequest[] = [];
    const shaRoot = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(shaRoot);
    const shaSink = await sink(shaRoot);
    const real = createNodeCommandRunner();
    const source = { kind: "git", url: "ssh://git@example.test/plugin.git", sha: fixture.first, ref: "does-not-exist" } as const;
    const result = await createGitSourceAcquirer({ command: localizingCommand(real, fixture.root, calls), archive: createTarReader(), sha256 }).materializePlugin(source, shaSink, signal());
    expect(result.revision).toBe(fixture.first);
    expect(calls.some((call) => call.args[0] === "ls-remote")).toBe(false);
    await shaSink.abort();
  });

  it("rejects missing and non-commit revisions", async () => {
    const fixture = await repository();
    const missingRoot = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(missingRoot);
    const missing = await sink(missingRoot);
    await expect(acquirer().materializeMarketplace({ kind: "local-git", path: fixture.root, ref: "does-not-exist" }, missing, signal())).rejects.toMatchObject({
      code: "SOURCE_RESOLUTION_FAILED",
      classification: "permanent",
    });
    await missing.abort();

    const tree = await git(fixture.root, ["rev-parse", "HEAD^{tree}"]);
    const treeRoot = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(treeRoot);
    const treeSink = await sink(treeRoot);
    await expect(acquirer().materializeMarketplace({ kind: "local-git", path: fixture.root, ref: tree }, treeSink, signal())).rejects.toMatchObject({
      code: "SOURCE_RESOLUTION_FAILED",
      classification: "permanent",
    });
    await treeSink.abort();
  });

  it("fails closed if a selected moving ref changes between lookup and fetch", async () => {
    const fixture = await repository();
    await git(fixture.root, ["branch", "moving", fixture.first]);
    const real = createNodeCommandRunner();
    let moved = false;
    const command: CommandRunner = {
      async run(request, abortSignal) {
        const args = request.args[0] === "remote" && request.args[1] === "add"
          ? [...request.args.slice(0, -1), fixture.root]
          : request.args;
        const result = await real.run({ ...request, args }, abortSignal);
        if (!moved && request.args[0] === "ls-remote") {
          moved = true;
          await git(fixture.root, ["update-ref", "refs/heads/moving", fixture.second]);
        }
        return result;
      },
    };
    const destination = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(destination);
    const content = await sink(destination);
    await expect(createGitSourceAcquirer({ command, archive: createTarReader(), sha256 }).materializeMarketplace(
      { kind: "local-git", path: fixture.root, ref: "moving" }, content, signal(),
    )).rejects.toMatchObject({ code: "SOURCE_RESOLUTION_FAILED", classification: "permanent" });
    await content.abort();
  });

  it("keeps remote diagnostics free of credential-bearing stderr", async () => {
    const secret = "credential-marker-secret";
    const empty = new Uint8Array();
    const command: CommandRunner = {
      async run(request) {
        if (request.args[0] === "ls-remote") {
          return { exitCode: 1, stdout: empty, stderr: new TextEncoder().encode(`fatal: ${secret}`) };
        }
        return { exitCode: 0, stdout: empty, stderr: empty };
      },
    };
    const destination = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(destination);
    const content = await sink(destination);
    const error = await acquirer({ command }).materializeMarketplace(
      { kind: "git", url: "https://example.test/repository.git" }, content, signal(),
    ).catch((value: unknown) => value);
    expect(error).toMatchObject({ code: "SOURCE_RESOLUTION_FAILED" });
    expect(String(error)).not.toContain(secret);
    expect(JSON.stringify(error)).not.toContain(secret);
    await content.abort();
  });

  it("materializes a plugin subdirectory exactly and rejects missing or empty directories", async () => {
    const fixture = await repository();
    const destination = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(destination);
    const content = await sink(destination);
    const result = await createGitSourceAcquirer({
      command: localizingCommand(createNodeCommandRunner(), fixture.root),
      archive: createTarReader(),
      sha256,
    }).materializePlugin({ kind: "git-subdir", url: "ssh://git@example.test/plugin.git", path: "packages/demo", ref: "main" }, content, signal());
    const finalized = await content.finalize(signal());
    expect(result.kind).toBe("git-subdir");
    expect(await readFile(join(finalized.root, "plugin.json"), "utf8")).toContain("demo");
    expect(finalized.content.entries.map((entry) => entry.path)).not.toContain("packages/demo/plugin.json");

    const missingRoot = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(missingRoot);
    const missing = await sink(missingRoot);
    await expect(createGitSourceAcquirer({ command: localizingCommand(createNodeCommandRunner(), fixture.root), archive: createTarReader(), sha256 }).materializePlugin(
      { kind: "git-subdir", url: "ssh://git@example.test/plugin.git", path: "missing", ref: "main" }, missing, signal(),
    )).rejects.toMatchObject({ code: "SOURCE_RESOLUTION_FAILED" });
    await missing.abort();
  });

  it("rejects submodule metadata before archive materialization", async () => {
    const fixture = await repository();
    await writeFile(join(fixture.root, ".gitmodules"), "[submodule \"bad\"]\n\tpath = bad\n\turl = https://example.test/bad.git\n", "utf8");
    await git(fixture.root, ["add", ".gitmodules"]);
    await git(fixture.root, ["commit", "--quiet", "-m", "submodule"]);
    const destination = await mkdtemp(join(tmpdir(), "pi-git-slot-"));
    roots.push(destination);
    const content = await sink(destination);
    await expect(acquirer().materializeMarketplace({ kind: "local-git", path: fixture.root }, content, signal())).rejects.toMatchObject({
      code: "SOURCE_RESOLUTION_FAILED",
      classification: "permanent",
    });
    await content.abort();
  });
});
