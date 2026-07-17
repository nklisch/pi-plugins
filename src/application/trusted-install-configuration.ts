import { compareUtf8 } from "../domain/canonical-json.js";
import { verifyPluginConfigurationDocument, type PluginConfigurationDocument } from "../domain/configured-values.js";
import type { PluginConfiguration } from "../domain/configuration.js";
import type { PluginConfigurationStore } from "./ports/plugin-configuration-store.js";
import type { ConfigurationPathContext, ConfigurationPathPort } from "./ports/configuration-path.js";
import type { HostCapabilityStatus } from "./host-observation-contract.js";
import type { SavePluginConfigurationRequest } from "./configuration-service.js";
import { collectConfigurationValidation } from "./configuration-validation.js";
import type { Sha256 } from "../domain/source.js";
import type { PluginKey } from "../domain/identity.js";
import type { ScopeContext } from "../domain/state/scope.js";
import {
  TrustedInstallConfigurationFieldSchema,
  TrustedInstallInputIssueSchema,
  type TrustedInstallConfigurationField,
  type TrustedInstallInputIssue,
  type TrustedInstallSubmission,
} from "./trusted-install-contract.js";
import type { PluginConfigurationRef } from "../domain/state/references.js";

export type TrustedInstallConfigurationDependencies = Readonly<{
  configurationRef: PluginConfigurationRef;
  plugin: PluginKey;
  scope: ScopeContext;
  descriptors: PluginConfiguration;
  pathContext: ConfigurationPathContext;
  paths: ConfigurationPathPort;
  secretCustody: HostCapabilityStatus;
}>;

export type TrustedInstallConfigurationValidationResult =
  | Readonly<{ kind: "valid"; request: SavePluginConfigurationRequest }>
  | Readonly<{ kind: "invalid"; issues: readonly TrustedInstallInputIssue[] }>;

function sortedIssues(input: readonly TrustedInstallInputIssue[]): readonly TrustedInstallInputIssue[] {
  const unique = new Map<string, TrustedInstallInputIssue>();
  for (const raw of input) {
    const issue = TrustedInstallInputIssueSchema.parse(raw);
    unique.set(`${issue.key ?? ""}\0${issue.code}`, issue);
  }
  return Object.freeze([...unique.values()].sort((left, right) => {
    const key = compareUtf8(left.key ?? "", right.key ?? "");
    return key !== 0 ? key : compareUtf8(left.code, right.code);
  }));
}

/** Partition untrusted workflow input before it reaches generic validation/custody. */
export async function validateTrustedInstallSubmission(
  fieldsInput: readonly TrustedInstallConfigurationField[],
  submission: TrustedInstallSubmission,
  dependencies: TrustedInstallConfigurationDependencies,
  signal: AbortSignal,
): Promise<TrustedInstallConfigurationValidationResult> {
  signal.throwIfAborted();
  const fields = fieldsInput.map((field) => TrustedInstallConfigurationFieldSchema.parse(field));
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const issues: TrustedInstallInputIssue[] = [];
  const values: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const entry of [...submission.nonSensitive, ...submission.sensitive]) {
    const field = byKey.get(entry.key);
    if (seen.has(entry.key)) issues.push({ code: "CONFIG_DUPLICATE_INPUT", key: entry.key });
    seen.add(entry.key);
    if (field === undefined) {
      issues.push({ code: "CONFIG_UNKNOWN_KEY", key: entry.key });
      continue;
    }
    const sensitivePartition = submission.sensitive.includes(entry as never);
    if (field.sensitive !== sensitivePartition) {
      issues.push({ code: "CONFIG_SENSITIVITY_MISMATCH", key: entry.key });
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(values, entry.key)) values[entry.key] = entry.value;
  }

  if (dependencies.secretCustody.status !== "available") {
    for (const field of fields) {
      if (field.sensitive && (field.required || submission.sensitive.some((entry) => entry.key === field.key))) {
        issues.push({ code: "SECRET_CUSTODY_UNAVAILABLE", key: field.key });
      }
    }
  }

  const partitionIssues = sortedIssues(issues);
  if (partitionIssues.length > 0) return { kind: "invalid", issues: partitionIssues };
  const request: SavePluginConfigurationRequest = {
    configurationRef: dependencies.configurationRef,
    plugin: dependencies.plugin,
    scope: dependencies.scope,
    descriptors: dependencies.descriptors,
    values,
    pathContext: dependencies.pathContext,
  };
  const validation = await collectConfigurationValidation(request, dependencies.paths, signal);
  if (validation.kind === "invalid") {
    return {
      kind: "invalid",
      issues: sortedIssues(validation.issues.map((issue) => TrustedInstallInputIssueSchema.parse(issue))),
    };
  }
  return { kind: "valid", request };
}

export type TrustedInstallConfigurationAuthorityResult =
  | Readonly<{ kind: "current"; document: PluginConfigurationDocument }>
  | Readonly<{ kind: "missing" | "stale" | "unavailable" }>;

/** Exact read-only authority check used immediately before lifecycle transfer. */
export function createTrustedInstallConfigurationAuthority(dependencies: Readonly<{
  configurations: PluginConfigurationStore;
  sha256: Sha256;
}>): Readonly<{
  readExact(request: Readonly<{ configurationRef: PluginConfigurationRef; descriptors: PluginConfiguration; expectedRevision: string }>, signal: AbortSignal): Promise<TrustedInstallConfigurationAuthorityResult>;
}> {
  return Object.freeze({
    async readExact(request, signal) {
      try {
        const result = await dependencies.configurations.read(request.configurationRef, signal);
        if (result.kind === "missing") return { kind: "missing" as const };
        const document = verifyPluginConfigurationDocument(result.document, request.descriptors, dependencies.sha256);
        return document.revision === request.expectedRevision
          ? { kind: "current" as const, document }
          : { kind: "stale" as const };
      } catch (error) {
        if (signal.aborted) throw signal.reason ?? error;
        return { kind: "unavailable" as const };
      }
    },
  });
}
