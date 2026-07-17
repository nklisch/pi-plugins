import { createPackagedPluginHost } from "../../../src/composition/create-packaged-plugin-host.js";

const [agentDir, projectRoot, repository, mode, registrationId = ""] = process.argv.slice(2);
if (![agentDir, projectRoot, repository, mode].every((value) => typeof value === "string" && value.length > 0)) throw new Error("marketplace child arguments are required");
const context = {
  cwd: projectRoot,
  mode: "interactive",
  sessionManager: { getSessionId: () => `marketplace-child-${process.pid}`, getSessionFile: () => undefined },
  isProjectTrusted: () => true,
};
const pi = { on() {}, sendMessage() {}, setSessionName() {} };
const host = createPackagedPluginHost({ pi, agentDir });
try {
  await host.start({ type: "session_start", reason: "startup" }, context);
  const result = await host.runWithPiOperationContext(context, new AbortController().signal, async (application) => {
    const signal = new AbortController().signal;
    if (mode === "add") {
      return application.marketplace.registration.add({ source: { kind: "local-git", path: repository }, scope: "user", origin: { kind: "native" } }, signal);
    }
    if (mode === "refresh") {
      return application.marketplace.refresh.refresh({ trigger: "explicit", scope: "user", registrationIds: [registrationId] }, signal);
    }
    if (mode === "remove") {
      return application.marketplace.registration.remove({ scope: "user", registrationId }, signal);
    }
    if (mode === "list") return application.marketplace.registration.list({ scope: "user", limit: 50 }, signal);
    throw new Error(`unknown marketplace child mode: ${mode}`);
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await host.dispose("quit");
}
