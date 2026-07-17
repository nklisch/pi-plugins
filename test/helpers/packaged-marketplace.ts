import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";
import type {
  PackagedPluginHost,
  PackagedPluginHostApplication,
} from "../../src/composition/packaged-plugin-host-contract.js";

const execFile = promisify(execFileCallback);

export function fakePi() {
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

export function extensionContext(cwd: string, trusted = true, sessionId = "marketplace-session") {
  return {
    cwd,
    mode: "interactive",
    sessionManager: { getSessionId: () => sessionId, getSessionFile: () => undefined },
    isProjectTrusted: () => trusted,
  };
}

export function runMarketplaceOperation<T>(
  host: Pick<PackagedPluginHost, "runWithPiOperationContext">,
  context: ReturnType<typeof extensionContext>,
  use: (marketplace: PackagedPluginHostApplication["marketplace"], signal: AbortSignal) => Promise<T>,
  signal = new AbortController().signal,
): Promise<T> {
  return host.runWithPiOperationContext(
    context as never,
    signal,
    (application) => use(application.marketplace, signal),
  );
}

export async function createLocalMarketplace(root: string, name = "community"): Promise<string> {
  const repository = join(root, `${name}-marketplace`);
  await mkdir(join(repository, ".claude-plugin"), { recursive: true });
  await mkdir(join(repository, "plugins", "demo"), { recursive: true });
  await writeFile(join(repository, ".claude-plugin", "marketplace.json"), JSON.stringify({
    name,
    plugins: [{ name: "demo", source: "./plugins/demo", description: "Offline demo", strict: false }],
  }), "utf8");
  await writeFile(join(repository, "plugins", "demo", "index.js"), "export const demo = true;\n", "utf8");
  await execFile("git", ["init", "--quiet", "-b", "main"], { cwd: repository });
  await execFile("git", ["config", "user.email", "fixture@example.test"], { cwd: repository });
  await execFile("git", ["config", "user.name", "fixture"], { cwd: repository });
  await execFile("git", ["add", "."], { cwd: repository });
  await execFile("git", ["commit", "--quiet", "-m", "fixture"], { cwd: repository });
  return repository;
}
