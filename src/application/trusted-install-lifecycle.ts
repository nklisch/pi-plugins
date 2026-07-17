import type { TrustedInstallCandidate } from "./trusted-install-candidate.js";
import type { ConfigurationPathContext } from "./ports/configuration-path.js";
import type { LifecycleStateStore } from "./ports/lifecycle-state-store.js";
import type {
  PluginLifecycleResult,
  PluginLifecycleService,
  PreparedInstallLifecycleAuthority,
} from "./plugin-lifecycle-service.js";

export type TrustedInstallLifecycleResult =
  | Readonly<{ kind: "lifecycle"; result: PluginLifecycleResult; enabledExisting: boolean }>
  | Readonly<{ kind: "current-state"; activation: "enabled"; revision: TrustedInstallCandidate["revision"]["revision"] }>
  | Readonly<{ kind: "conflict"; reason: "already-installed-different-revision" | "pending-transition" }>
  | Readonly<{ kind: "recovery-required" }>;

export type TrustedInstallLifecycleDependencies = Readonly<{
  state: LifecycleStateStore;
  prepared: PreparedInstallLifecycleAuthority;
  publicLifecycle: Pick<PluginLifecycleService, "enable">;
}>;

function sourceContext(candidate: TrustedInstallCandidate): import("./source-materialization.js").SourceContext {
  return candidate.resolved.entry.source.value.kind === "marketplace-path"
    ? {
        kind: "marketplace",
        root: candidate.resolved.marketplace.root,
        source: candidate.resolved.marketplace.source,
        contentRootDigest: candidate.resolved.marketplace.content.rootDigest,
        content: candidate.resolved.marketplace.content,
        binding: candidate.resolved.marketplace.binding,
      }
    : { kind: "external" };
}

/** Select install/enable/current/conflict, leaving all mutation semantics to lifecycle. */
export async function executeTrustedInstallLifecycle(
  candidate: TrustedInstallCandidate,
  configurationPathContext: ConfigurationPathContext,
  dependencies: TrustedInstallLifecycleDependencies,
  signal: AbortSignal,
): Promise<TrustedInstallLifecycleResult> {
  signal.throwIfAborted();
  const loaded = await dependencies.state.read(candidate.resolved.scope, signal).catch((error) => {
    if (signal.aborted) throw signal.reason ?? error;
    return undefined;
  });
  if (loaded === undefined || !loaded.ok) {
    await candidate.lease.release();
    return { kind: "recovery-required" };
  }
  const records = "installed" in loaded.snapshot ? loaded.snapshot.installed.plugins : loaded.snapshot.project.plugins;
  const current = records.find((record) => record.plugin === candidate.binding.plugin);
  if (current?.pendingTransition !== undefined) {
    await candidate.lease.release();
    return { kind: "conflict", reason: "pending-transition" };
  }
  if (current !== undefined && current.selectedRevision !== candidate.binding.immutableRevision) {
    await candidate.lease.release();
    return { kind: "conflict", reason: "already-installed-different-revision" };
  }
  if (current?.activation === "enabled") {
    await candidate.lease.release();
    return { kind: "current-state", activation: "enabled", revision: candidate.binding.immutableRevision };
  }
  if (current?.activation === "disabled") {
    await candidate.lease.release();
    return {
      kind: "lifecycle",
      enabledExisting: true,
      result: await dependencies.publicLifecycle.enable({
        scope: candidate.resolved.scope,
        plugin: candidate.binding.plugin,
        configurationPathContext,
      }, signal),
    };
  }
  return {
    kind: "lifecycle",
    enabledExisting: false,
    result: await dependencies.prepared.installPrepared({
      scope: candidate.resolved.scope,
      plugin: candidate.binding.plugin,
      entry: candidate.resolved.entry,
      marketplaceSource: candidate.resolved.marketplace.source,
      sourceContext: sourceContext(candidate),
      lease: candidate.lease,
      expected: candidate.binding,
      configurationPathContext,
    }, signal),
  };
}
