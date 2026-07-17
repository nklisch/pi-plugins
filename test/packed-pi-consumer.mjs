import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = await mkdtemp(join(tmpdir(), "pi-plugin-host-consumer-"));
try {
  const packed = spawnSync("npm", ["pack", "--json", "--silent", "--pack-destination", root], { cwd: project, encoding: "utf8" });
  if (packed.status !== 0) throw new Error(packed.stderr || "npm pack failed");
  const [{ filename }] = JSON.parse(packed.stdout);
  const consumer = join(root, "consumer");
  const home = join(root, "empty-home");
  const workspace = join(root, "workspace");
  await Promise.all([mkdir(consumer), mkdir(home), mkdir(workspace)]);
  await writeFile(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  const install = spawnSync("npm", [
    "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--install-links",
    join(root, filename),
    "@earendil-works/pi-coding-agent@0.80.8",
  ], { cwd: consumer, encoding: "utf8", env: { ...process.env, HOME: home } });
  if (install.status !== 0) throw new Error(install.stderr || install.stdout || "isolated packed install failed");

  const packageRoot = join(consumer, "node_modules", "@nklisch", "pi-plugin-host");
  const metadata = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  const dependencies = [
    ...Object.keys(metadata.dependencies ?? {}),
    "@earendil-works/pi-coding-agent",
  ];
  for (const dependency of dependencies) {
    const installedPath = await realpath(join(consumer, "node_modules", ...dependency.split("/")));
    if (installedPath === project || installedPath.startsWith(`${project}/`)) {
      throw new Error(`packed consumer dependency escaped into checkout: ${dependency}`);
    }
  }

  await writeFile(join(consumer, "verify.mjs"), `
    import * as api from "@nklisch/pi-plugin-host/pi";
    import { readFile } from "node:fs/promises";
    import { pathToFileURL } from "node:url";
    const packageRoot = ${JSON.stringify(packageRoot)};
    const metadata = JSON.parse(await readFile(packageRoot + "/package.json", "utf8"));
    if (typeof api.createPackagedPluginHost !== "function") throw new Error("Pi composition factory missing");
    if (JSON.stringify(metadata.pi?.extensions) !== JSON.stringify(["./dist/pi/extension.js"])) throw new Error("Pi extension metadata missing");
    const extension = (await import(pathToFileURL(packageRoot + "/" + metadata.pi.extensions[0]).href)).default;
    const handlers = new Map();
    const pi = {
      on(name, handler) { handlers.set(name, [...(handlers.get(name) ?? []), handler]); },
      sendMessage() {},
      setSessionName() {},
    };
    extension(pi);
    const context = {
      cwd: ${JSON.stringify(workspace)},
      mode: "interactive",
      sessionManager: { getSessionId: () => "packed-consumer-session", getSessionFile: () => undefined },
      isProjectTrusted: () => true,
    };
    for (const handler of handlers.get("session_start") ?? []) await handler({ type: "session_start", reason: "startup" }, context);
    const resources = [];
    for (const handler of handlers.get("resources_discover") ?? []) resources.push(await handler({ type: "resources_discover", cwd: context.cwd, reason: "startup" }, context));
    for (const handler of handlers.get("session_shutdown") ?? []) await handler({ type: "session_shutdown", reason: "quit" }, context);
    if (resources.length !== 1) throw new Error("packed extension startup did not own resource discovery");
  `);
  const run = spawnSync(process.execPath, [join(consumer, "verify.mjs")], {
    cwd: consumer,
    encoding: "utf8",
    env: { ...process.env, HOME: home, NODE_OPTIONS: "" },
  });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout || "packed extension startup failed");
  console.log("isolated packed Pi extension startup passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
