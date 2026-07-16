import { z } from "zod";
import {
  HookToolAliasDefinitionRegistry,
  HookToolAliasDefinitionSchema,
  matchesHookSelector,
  validateHookToolAliasDefinitions,
  canonicalJson,
  type CompiledHookSelector,
  type HookSelectorSubject,
  type HookToolAliasDefinition,
} from "../../domain/hook-runtime-contract.js";
import { JsonValueSchema, type JsonValue } from "../../domain/schema.js";
import {
  HookSessionEvidenceSchema,
  PreToolUseHookInputSchema,
  PostToolUseHookInputSchema,
  PostToolUseFailureHookInputSchema,
  cloneJson,
  type HookSessionEvidence,
  type ForeignHookInput,
  type HookPiContent,
} from "./event-contract.js";

export const HookToolIdentitySchema = z.object({
  piName: z.string().min(1).max(256),
  foreignName: z.string().min(1).max(256),
  aliases: z.array(z.string().min(1).max(256)).min(1).readonly(),
}).strict().readonly();
export type HookToolIdentity = z.infer<typeof HookToolIdentitySchema>;

export type HookToolCallEvidence = Readonly<{
  toolName: string;
  toolCallId: string;
  input: JsonValue;
  signal?: AbortSignal;
}>;

export type HookToolResultEvidence = Readonly<{
  toolName: string;
  toolCallId: string;
  input: JsonValue;
  content: readonly HookPiContent[];
  details?: unknown;
  isError: boolean;
  signal?: AbortSignal;
}>;

function dedupe(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function staticOrDynamicRows(additional: readonly HookToolAliasDefinition[]): readonly HookToolAliasDefinition[] {
  return validateHookToolAliasDefinitions(additional);
}

export function createHookToolIdentityResolver(input: Readonly<{ additional: readonly HookToolAliasDefinition[] }> = { additional: [] }): Readonly<{ resolve(piName: string): HookToolIdentity }> {
  const rows = staticOrDynamicRows(input.additional);
  function resolve(piNameInput: string): HookToolIdentity {
    const piName = z.string().min(1).max(256).parse(piNameInput);
    const row = rows.find((candidate) => candidate.piNames.includes(piName));
    if (row === undefined) return HookToolIdentitySchema.parse({ piName, foreignName: piName, aliases: [piName] });
    return HookToolIdentitySchema.parse({ piName, foreignName: row.preferred, aliases: dedupe(row.aliases) });
  }
  return Object.freeze({ resolve });
}

function jsonObject(value: JsonValue): Record<string, JsonValue> {
  if (value === null || Array.isArray(value) || typeof value !== "object") throw new TypeError("tool input must be a JSON object");
  return cloneJson(value) as Record<string, JsonValue>;
}

function jsonDetails(value: unknown): JsonValue | undefined {
  const result = JsonValueSchema.safeParse(value);
  return result.success ? cloneJson(result.data) : undefined;
}

function resultText(content: readonly HookPiContent[]): string | undefined {
  const text = content.filter((item): item is Extract<HookPiContent, { type: "text" }> => item.type === "text").map((item) => item.text).filter((value) => value.length > 0).join("\n");
  return text.length === 0 ? undefined : text;
}

export function buildPreToolUseInput(sessionInput: HookSessionEvidence, evidenceInput: HookToolCallEvidence): Extract<ForeignHookInput, { hook_event_name: "PreToolUse" }> {
  const session = HookSessionEvidenceSchema.parse(sessionInput);
  const evidence = {
    toolName: z.string().min(1).max(256).parse(evidenceInput.toolName),
    toolCallId: z.string().min(1).parse(evidenceInput.toolCallId),
    input: JsonValueSchema.parse(evidenceInput.input),
  };
  return PreToolUseHookInputSchema.parse({
    session_id: session.sessionId,
    ...(session.transcriptPath === undefined ? {} : { transcript_path: session.transcriptPath }),
    cwd: session.cwd,
    hook_event_name: "PreToolUse",
    tool_name: evidence.toolName,
    tool_input: jsonObject(evidence.input),
    tool_use_id: evidence.toolCallId,
  });
}

export function buildPostToolInput(sessionInput: HookSessionEvidence, evidenceInput: HookToolResultEvidence): Extract<ForeignHookInput, { hook_event_name: "PostToolUse" | "PostToolUseFailure" }> {
  const session = HookSessionEvidenceSchema.parse(sessionInput);
  const evidence = {
    toolName: z.string().min(1).max(256).parse(evidenceInput.toolName),
    toolCallId: z.string().min(1).parse(evidenceInput.toolCallId),
    input: JsonValueSchema.parse(evidenceInput.input),
    content: evidenceInput.content,
    details: evidenceInput.details,
    isError: z.boolean().parse(evidenceInput.isError),
    signal: evidenceInput.signal,
  };
  const response = jsonDetails(evidence.details);
  const common = {
    session_id: session.sessionId,
    ...(session.transcriptPath === undefined ? {} : { transcript_path: session.transcriptPath }),
    cwd: session.cwd,
    tool_name: evidence.toolName,
    tool_input: jsonObject(evidence.input),
    ...(response === undefined ? {} : { tool_response: response }),
    tool_use_id: evidence.toolCallId,
  };
  const pi = {
    toolResult: {
      content: evidence.content,
      ...(response === undefined ? {} : { details: response }),
      isError: evidence.isError,
    },
  };
  if (!evidence.isError) return PostToolUseHookInputSchema.parse({ ...common, hook_event_name: "PostToolUse", pi });
  const error = resultText(evidence.content);
  const interrupted = evidence.signal?.aborted === true;
  return PostToolUseFailureHookInputSchema.parse({
    ...common,
    hook_event_name: "PostToolUseFailure",
    ...(error === undefined ? {} : { error }),
    ...(interrupted ? { is_interrupt: true } : {}),
    pi,
  });
}

export function subjectForTool(identity: HookToolIdentity, event: "PreToolUse" | "PostToolUse" | "PostToolUseFailure", input: JsonValue, response?: JsonValue): HookSelectorSubject {
  return {
    event,
    matcherCandidates: identity.aliases,
    toolNameAliases: identity.aliases,
    toolInput: input,
    ...(response === undefined ? {} : { toolResponse: response }),
  };
}

export function evaluateHookConditions(selector: CompiledHookSelector, subject: HookSelectorSubject): boolean {
  return matchesHookSelector(selector, subject);
}

export type { HookToolAliasDefinition };
export { HookToolAliasDefinitionSchema, HookToolAliasDefinitionRegistry, canonicalJson };
