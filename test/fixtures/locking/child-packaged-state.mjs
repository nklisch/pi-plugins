import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createPluginHostPathPlan } from "../../../src/composition/plugin-host-paths.js";
import { createScopeContext, deriveProjectKey } from "../../../src/domain/state/scope.js";
import { parseStateMutation } from "../../../src/application/state-contract.js";
import { createNodeLifecycleStateAdapters } from "../../../src/infrastructure/state/sqlite-lifecycle-state-store.js";

const [agentDir, projectRoot] = process.argv.slice(2);
const sha256 = (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest());
const identity = {
  kind: "path-only",
  canonicalRoot: pathToFileURL(projectRoot).href,
  limitation: "identity-changes-with-canonical-root",
};
const currentProject = createScopeContext({
  kind: "project",
  identity,
  projectKey: deriveProjectKey(identity, sha256),
}, sha256);
const adapters = await createNodeLifecycleStateAdapters({
  paths: createPluginHostPathPlan(agentDir),
  currentProject,
  sha256,
  verifyLocalFilesystem: async () => {},
});
try {
  const mutation = parseStateMutation({
    scope: { kind: "user" },
    expectedGeneration: 0,
    replace: { config: { schemaVersion: 2, generation: 0, records: [] } },
  }, sha256);
  const result = await adapters.state.commit(mutation, new AbortController().signal);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await adapters.close();
}
