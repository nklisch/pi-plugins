import { z } from "zod";

export const NativeControlArgvSchema = z.array(z.string().max(8192)).max(512).readonly();
export type NativeControlArgv = z.infer<typeof NativeControlArgvSchema>;

export const NativeControlLexTokenSchema = z.object({
  value: z.string().max(8192),
  complete: z.boolean(),
}).strict().readonly();
export type NativeControlLexToken = z.infer<typeof NativeControlLexTokenSchema>;

export const NativeControlLexResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tokens"), tokens: z.array(NativeControlLexTokenSchema).max(512).readonly() }).strict().readonly(),
  z.object({ kind: z.literal("invalid"), code: z.enum(["CONTROL_TEXT_INVALID", "CONTROL_TEXT_TOO_LARGE", "CONTROL_TOKEN_TOO_LARGE", "CONTROL_TOO_MANY_ARGUMENTS", "CONTROL_QUOTE_UNTERMINATED", "CONTROL_ESCAPE_INVALID"]), partial: z.array(NativeControlLexTokenSchema).max(512).readonly() }).strict().readonly(),
]);
export type NativeControlLexResult = z.infer<typeof NativeControlLexResultSchema>;

function invalidScalar(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if ((code >= 0 && code <= 0x1f && code !== 0x09) || (code >= 0x7f && code <= 0x9f) ||
        (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) return true;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

export function validateNativeControlScalar(value: string): boolean {
  return value.length <= 8192 && !invalidScalar(value);
}

/**
 * Tokenize Pi's single argument string without shell interpretation. Only
 * ASCII space/tab separate tokens; quotes and the deliberately tiny escape set
 * have no expansion semantics.
 */
export function lexNativeControlText(text: string, mode: "execute" | "complete" = "execute"): NativeControlLexResult {
  if (text.length > 1_048_576) return { kind: "invalid", code: "CONTROL_TEXT_TOO_LARGE", partial: [] };
  if (invalidScalar(text)) return { kind: "invalid", code: "CONTROL_TEXT_INVALID", partial: [] };

  const tokens: NativeControlLexToken[] = [];
  let value = "";
  let tokenStarted = false;
  let quote: "single" | "double" | undefined;
  let escaping = false;

  const push = (complete = true): NativeControlLexResult | undefined => {
    if (!tokenStarted) return undefined;
    if (value.length > 8192) return { kind: "invalid", code: "CONTROL_TOKEN_TOO_LARGE", partial: Object.freeze([...tokens]) };
    tokens.push(Object.freeze({ value, complete }));
    if (tokens.length > 512) return { kind: "invalid", code: "CONTROL_TOO_MANY_ARGUMENTS", partial: Object.freeze(tokens.slice(0, 512)) };
    value = "";
    tokenStarted = false;
    return undefined;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (escaping) {
      const allowed = quote === "double"
        ? character === '"' || character === "\\"
        : character === " " || character === "\t" || character === "'" || character === '"' || character === "\\";
      if (!allowed) return { kind: "invalid", code: "CONTROL_ESCAPE_INVALID", partial: Object.freeze(tokens) };
      value += character;
      tokenStarted = true;
      escaping = false;
      continue;
    }
    if (quote === "single") {
      if (character === "'") quote = undefined;
      else value += character;
      tokenStarted = true;
      continue;
    }
    if (quote === "double") {
      if (character === '"') quote = undefined;
      else if (character === "\\") escaping = true;
      else value += character;
      tokenStarted = true;
      continue;
    }
    if (character === " " || character === "\t") {
      const failure = push();
      if (failure !== undefined) return failure;
      continue;
    }
    if (character === "'") {
      quote = "single";
      tokenStarted = true;
      continue;
    }
    if (character === '"') {
      quote = "double";
      tokenStarted = true;
      continue;
    }
    if (character === "\\") {
      escaping = true;
      tokenStarted = true;
      continue;
    }
    value += character;
    tokenStarted = true;
    if (value.length > 8192) return { kind: "invalid", code: "CONTROL_TOKEN_TOO_LARGE", partial: Object.freeze(tokens) };
  }

  if (quote !== undefined || escaping) {
    if (mode === "complete") {
      const failure = push(false);
      if (failure !== undefined) return failure;
      return { kind: "tokens", tokens: Object.freeze(tokens) };
    }
    return { kind: "invalid", code: quote === undefined ? "CONTROL_ESCAPE_INVALID" : "CONTROL_QUOTE_UNTERMINATED", partial: Object.freeze(tokens) };
  }
  const failure = push();
  if (failure !== undefined) return failure;
  return { kind: "tokens", tokens: Object.freeze(tokens) };
}
