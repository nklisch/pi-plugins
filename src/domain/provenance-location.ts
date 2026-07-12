import { z } from "zod";

export const NativeHostSchema = z.enum(["claude", "codex"]);
export type NativeHost = z.infer<typeof NativeHostSchema>;

export const SourceDocumentKindSchema = z.enum([
  "marketplace",
  "manifest",
  "hooks",
  "mcp",
  "skill",
  "convention",
]);
export type SourceDocumentKind = z.infer<typeof SourceDocumentKindSchema>;

export const SourceLocationSchema = z
  .object({
    host: NativeHostSchema,
    documentKind: SourceDocumentKindSchema,
    path: z.string().min(1),
    pointer: z.string().startsWith("/").optional(),
    line: z.number().int().positive().optional(),
    column: z.number().int().positive().optional(),
  })
  .strict()
  .readonly();
export type SourceLocation = z.infer<typeof SourceLocationSchema>;
