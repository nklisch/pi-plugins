import { HostStatusSnapshotSchema } from "../application/host-observation-contract.js";
import { NativeControlHelpSchema } from "../application/native-control-help.js";
import { NativeInspectionPageSchema } from "../application/native-inspection-contract.js";
import { NativeControlCommandRegistry } from "../application/native-control-registry.js";
import {
  NativeControlMarketplaceCatalogResponseSchema,
  NativeControlMarketplaceListResponseSchema,
} from "../application/native-control-safe-projection.js";
import { NativeUpdateNotificationPageSchema } from "../application/native-update-contract.js";
import type { NativeControlEnvelope } from "../application/native-control-contract.js";
import { projectTerminalText } from "./manager/pi-terminal-text.js";

const MAX_LINES = 512;
const MAX_SCALARS = 65_536;

function safeLines(value: unknown): readonly string[] {
  if (value === undefined || value === null) return Object.freeze([]);
  let serialized: string;
  try {
    serialized = JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    serialized = String(value);
  }
  let scalars = 0;
  let truncated = false;
  const rawLines = serialized.split("\n");
  const lines: string[] = [];
  for (const raw of rawLines) {
    if (lines.length >= MAX_LINES || scalars >= MAX_SCALARS) break;
    const projection = projectTerminalText(raw, Math.min(2_048, MAX_SCALARS - scalars));
    const line = projection.text;
    truncated ||= projection.truncated;
    lines.push(line);
    scalars += Array.from(line).length;
  }
  if (truncated || rawLines.length > lines.length || scalars >= MAX_SCALARS) lines.push("… result truncated");
  return Object.freeze(lines);
}

/**
 * Produce useful human output from the already-safe public control envelope.
 * Command summaries are labels, not results, so they are omitted whenever
 * structured owner data or diagnostics can tell the user what actually happened.
 */
export function nativeControlHumanLines(envelope: NativeControlEnvelope): readonly string[] {
  const help = NativeControlHelpSchema.safeParse(envelope.command.id === "help" ? envelope.data : undefined);
  if (help.success) {
    return Object.freeze(help.data.commands.map((command) => {
      const path = command.path.join(" ");
      const positionals = command.positionals.map((entry) => entry.required ? `<${entry.name}>${entry.repeatable ? "..." : ""}` : `[${entry.name}${entry.repeatable ? "..." : ""}]`);
      return `${[path, ...positionals].filter(Boolean).join(" ")} — ${command.summary.text}`;
    }));
  }
  const installed = NativeInspectionPageSchema.safeParse(envelope.command.id === "inspection.list" ? envelope.data : undefined);
  if (installed.success) return Object.freeze(installed.data.items.length === 0
    ? ["No plugins added."]
    : installed.data.items.map((item) => `${item.plugin} · ${item.scope.kind} · ${item.condition} · ${item.revision.installed?.text ?? "not installed"}`));
  const sources = NativeControlMarketplaceListResponseSchema.safeParse(envelope.command.id === "marketplace.list" ? envelope.data : undefined);
  if (sources.success) return Object.freeze(sources.data.registrations.length === 0
    ? ["No plugin sources configured."]
    : sources.data.registrations.map((source) => `${source.marketplace} · ${source.source.kind} · ${source.cache.kind}`));
  const catalog = NativeControlMarketplaceCatalogResponseSchema.safeParse(envelope.command.id === "browse" ? envelope.data : undefined);
  if (catalog.success) return Object.freeze(catalog.data.candidates.length === 0
    ? ["No plugins available from configured sources."]
    : catalog.data.candidates.map((candidate) => `${candidate.plugin} · ${candidate.scope.kind} · ${candidate.availability}`));
  const notices = NativeUpdateNotificationPageSchema.safeParse(envelope.command.id === "updates.notices.list" ? envelope.data : undefined);
  if (notices.success) return Object.freeze(notices.data.notices.length === 0
    ? ["No pending plugin updates."]
    : notices.data.notices.map((notice) => `${notice.plugin} · ${notice.installed} → ${notice.available} · ${notice.disposition}`));
  const status = HostStatusSnapshotSchema.safeParse(envelope.command.id === "status" ? envelope.data : undefined);
  if (status.success) {
    const value = status.data;
    return Object.freeze([
      `Host ${value.status} · recovery ${value.local.recovery} · runtime ${value.local.runtime}`,
      `Updates ${value.update.state} · ${value.update.unreadCount} unread · ${value.update.unresolvedCount} unresolved`,
      ...Object.entries(value.capabilities).map(([name, capability]) => `${name}: ${capability.status} · ${capability.explanation}`),
      ...(value.blocked.length === 0 ? [] : value.blocked.map((blocked) => `blocked ${blocked.plugin}: ${blocked.code}`)),
      ...envelope.diagnostics.map((entry) => `${entry.severity.toUpperCase()} ${entry.code} · ${entry.action}`),
    ]);
  }
  const summary = NativeControlCommandRegistry[envelope.command.id].summary.text;
  const projected = safeLines(envelope.data);
  const human = envelope.human
    .map((field) => field.text)
    .filter((line) => line !== summary || projected.length === 0);
  const diagnostics = envelope.diagnostics.map((entry) => `${entry.severity.toUpperCase()} ${entry.code} · ${entry.action}`);
  const lines = [...human, ...projected, ...diagnostics];
  return Object.freeze(lines.length > 0
    ? lines
    : [`${envelope.command.path.join(" ") || "plugin"}: ${envelope.status}`]);
}
