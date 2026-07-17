import { createPackagedPluginHost } from "../../../src/composition/create-packaged-plugin-host.js";

const [agentDir, projectRoot, sessionId] = process.argv.slice(2);
const pi = { on() {}, sendMessage() {}, setSessionName() {} };
const context = {
  cwd: projectRoot,
  mode: "interactive",
  sessionManager: { getSessionId: () => sessionId, getSessionFile: () => undefined },
  isProjectTrusted: () => true,
};
const host = createPackagedPluginHost({ pi, agentDir });
try {
  const started = await host.start({ type: "session_start", reason: "startup" }, context);
  process.stdout.write(`${JSON.stringify({ status: started.startup.status })}\n`);
} finally {
  await host.dispose("quit");
}
