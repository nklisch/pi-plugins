import { cp, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
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
  const agentDir = join(root, "agent");
  await Promise.all([mkdir(consumer), mkdir(home), mkdir(workspace), mkdir(agentDir)]);
  await writeFile(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  // Copy installed dependency bytes, then extract only the npm tarball for the
  // package under test. This keeps the consumer offline and checkout-isolated
  // without depending on which registry metadata happens to be in npm's cache.
  await cp(join(project, "node_modules"), join(consumer, "node_modules"), { recursive: true, dereference: true });
  const packageRoot = join(consumer, "node_modules", "@nklisch", "pi-plugin-host");
  await mkdir(packageRoot, { recursive: true });
  const extract = spawnSync("tar", ["-xzf", join(root, filename), "--strip-components=1", "-C", packageRoot], { encoding: "utf8" });
  if (extract.status !== 0) throw new Error(extract.stderr || "isolated packed extraction failed");

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

  const headlessChild = join(consumer, "headless-child.mjs");
  await writeFile(headlessChild, `
    import { createNativeControlService, createNodeControlTimeoutPort, runNodeNativeControlHeadless } from "@nklisch/pi-plugin-host";
    const ready = {
      status: "ready",
      local: { recovery: "settled", runtime: "reconciled" },
      update: { state: "standby", unreadCount: 0, unresolvedCount: 0, scopes: [] },
      blocked: [],
      capabilities: {
        mcp: { status: "unavailable", explanation: "not configured" },
        subagents: { status: "unavailable", explanation: "not configured" },
        piReload: { status: "available", explanation: "available" },
        secrets: { status: "unavailable", explanation: "not configured" },
      },
    };
    const unavailable = async () => { throw new Error("unused adapter"); };
    const waitForAbort = (signal) => new Promise((resolve, reject) => {
      const activeOwnerHandle = setInterval(() => {}, 1000);
      const abort = () => {
        clearInterval(activeOwnerHandle);
        reject(signal.reason ?? new DOMException("aborted", "AbortError"));
      };
      if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
    });
    const service = createNativeControlService({
      applications: {
        marketplace: {
          registration: { add: unavailable, remove: unavailable, list: unavailable },
          refresh: { refresh: unavailable },
          catalog: { search: unavailable, detail: unavailable },
          adoption: { preview: unavailable, import: unavailable },
        },
        inspection: {
          list: (_request, signal) => waitForAbort(signal),
          detail: unavailable,
          diagnose: unavailable,
        },
        trustedInstallation: { open: unavailable, activate: unavailable, recover: unavailable, run: unavailable, status: unavailable, cancel: unavailable },
        operations: { preview: unavailable, apply: unavailable, run: unavailable, status: unavailable, cancel: unavailable },
        updates: { previewPolicy: unavailable, applyPolicy: unavailable, status: unavailable, notifications: unavailable, acknowledge: unavailable, runAutomatic: unavailable },
        status: { snapshot: () => ready },
        currentProject: { current: async () => ({ kind: "unavailable" }) },
      },
      ids: { issue: async () => "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" },
      timeouts: createNodeControlTimeoutPort(),
    });
    if (process.env.SELF_SIGINT === "1") setTimeout(() => process.kill(process.pid, "SIGINT"), 25);
    const code = await runNodeNativeControlHeadless({ control: service, argv: process.argv.slice(2) });
    await service.close();
    process.exitCode = code;
  `);

  const usageProcess = spawnSync(process.execPath, [headlessChild, "unknown-command"], { cwd: consumer, encoding: "utf8", env: { ...process.env, HOME: home, NODE_OPTIONS: "" } });
  if (usageProcess.status !== 2 || Buffer.byteLength(usageProcess.stdout) === 0) throw new Error("headless usage did not emit bytes with exit 2");
  const timeoutProcess = spawnSync(process.execPath, [headlessChild, "--output", "json", "--timeout-ms", "25", "list"], { cwd: consumer, encoding: "utf8", env: { ...process.env, HOME: home, NODE_OPTIONS: "" } });
  if (timeoutProcess.status !== 9 || !timeoutProcess.stdout.includes('"status":"cancelled"')) throw new Error(`headless timeout failed: status=${timeoutProcess.status} stdout=${JSON.stringify(timeoutProcess.stdout)} stderr=${JSON.stringify(timeoutProcess.stderr)}`);
  const sigintProcess = spawnSync(process.execPath, [headlessChild, "--output", "json", "list"], { cwd: consumer, encoding: "utf8", env: { ...process.env, HOME: home, NODE_OPTIONS: "", SELF_SIGINT: "1" } });
  if (sigintProcess.status !== 9 || !sigintProcess.stdout.includes('"status":"cancelled"')) throw new Error(`headless SIGINT failed: status=${sigintProcess.status} stdout=${JSON.stringify(sigintProcess.stdout)} stderr=${JSON.stringify(sigintProcess.stderr)}`);

  const epipeProcess = spawn(process.execPath, [headlessChild, "--output", "json", "list"], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, HOME: home, NODE_OPTIONS: "" } });
  epipeProcess.stdout.destroy();
  const [epipeCode] = await once(epipeProcess, "exit");
  if (epipeCode !== 74) throw new Error(`headless EPIPE exited ${epipeCode} instead of 74`);

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
    const context = {
      cwd: ${JSON.stringify(workspace)},
      mode: "interactive",
      sessionManager: { getSessionId: () => "packed-consumer-session", getSessionFile: () => undefined },
      isProjectTrusted: () => true,
    };
    const directPi = {
      on() {},
      sendMessage() {},
      setSessionName() {},
    };
    const directHost = api.createPackagedPluginHost({ pi: directPi, agentDir: ${JSON.stringify(agentDir)} });
    const started = await directHost.start({ type: "session_start", reason: "startup" }, context);
    if (JSON.stringify(Object.keys(started.application)) !== JSON.stringify(["control"])) throw new Error("packed control capability missing");
    if (typeof started.application.control?.runArgv !== "function") throw new Error("packed control service missing");
    if (started.startup.capabilities.secrets.status !== "unavailable") throw new Error("packed secret custody did not fail closed");
    const registrations = await directHost.runWithPiOperationContext(context, new AbortController().signal, (application) =>
      application.control.runArgv(["marketplace", "list", "--scope", "all-current"], { mode: "headless", output: "json" }, new AbortController().signal));
    if (registrations.envelope.data.registrations.length !== 0) throw new Error("packed marketplace did not start from clean state");
    const status = await directHost.runWithPiOperationContext(context, new AbortController().signal, (application) =>
      application.control.runArgv(["status"], { mode: "headless", output: "json" }, new AbortController().signal));
    if (status.envelope.status !== "ok") throw new Error("packed local status failed");
    const mutation = await directHost.runWithPiOperationContext(context, new AbortController().signal, (application) =>
      application.control.runArgv(["updates", "policy", "set", "--kind", "cadence", "--target", "global", "--cadence", "conservative"], { mode: "headless", output: "json" }, new AbortController().signal));
    if (mutation.envelope.status !== "ok") throw new Error("packed policy mutation did not use control surface");
    const readback = await directHost.runWithPiOperationContext(context, new AbortController().signal, (application) =>
      application.control.runArgv(["updates", "status"], { mode: "headless", output: "json" }, new AbortController().signal));
    if (readback.envelope.data.policy.global.cadence !== "conservative") throw new Error("packed policy mutation was not readable");
    await directHost.dispose("quit");

    const restartedHost = api.createPackagedPluginHost({ pi: directPi, agentDir: ${JSON.stringify(agentDir)} });
    await restartedHost.start({ type: "session_start", reason: "startup" }, context);
    const persisted = await restartedHost.runWithPiOperationContext(context, new AbortController().signal, (application) =>
      application.control.runArgv(["updates", "status"], { mode: "headless", output: "json" }, new AbortController().signal));
    if (persisted.envelope.data.policy.global.cadence !== "conservative") throw new Error("packed policy mutation did not survive restart");
    await restartedHost.dispose("quit");

    extension(pi);
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
